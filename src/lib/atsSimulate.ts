/**
 * Per-ATS parse simulation — a deterministic, on-device emulation of how the
 * major applicant-tracking systems (Workday, Greenhouse, Lever, Taleo, iCIMS)
 * actually read a resume. No incumbent ships this *inside* the editor, and it
 * runs with zero network — same resume always yields the same report.
 *
 * The rules encode documented, real-world parser behaviour, e.g.:
 *  - Taleo (legacy) does strict literal keyword matching and is notorious for
 *    scrambling multi-column layouts and choking on graphics/photos.
 *  - Workday maps text to structured fields and leans on standard section
 *    headings ("Experience", "Education", "Skills") to route content.
 *  - Greenhouse parses cleanly and does NOT auto-score — layout matters less.
 *  - Lever is keyword-driven and reads the document's linear order.
 *  - iCIMS uses ML/semantic matching and is the most layout-tolerant.
 *
 * These are honest approximations for guidance, not a claim about any specific
 * vendor's current internals — framed that way in the UI, too.
 */
import type { ResumeDocument } from '@/types/document'
import { resolveOrder, sectionLabel, DEFAULT_LABELS } from '@/lib/sections'
import { visibleDocument } from '@/lib/atsScope'
import { htmlToText } from '@/lib/utils'
import { cleanEmail } from '@/templates/_shared/atoms'
import { translate, type Locale, type MsgKey } from '@/i18n/core'

/** A dictionary lookup, bound to one language: what every finding below uses. */
type Tx = (key: MsgKey, vars?: Record<string, string | number>) => string

export type Severity = 'ok' | 'minor' | 'risk'

export interface Finding {
  severity: Severity
  title: string
  detail: string
}

export interface Extracted {
  name: boolean
  title: boolean
  email: boolean
  phone: boolean
  location: boolean
  roles: number
  /** true when this parser is likely to read the roles in the wrong order */
  rolesScrambled: boolean
  skills: number
  /** skills present only as a rating with no text — unreadable by any parser */
  skillsLost: number
}

export interface AtsProfileReport {
  id: string
  name: string
  blurb: string
  score: number
  verdict: 'clean' | 'minor' | 'risk'
  findings: Finding[]
  extracted: Extracted
}

/** Structural signals derived once from the document. */
interface Signals {
  twoColumn: boolean
  sidebarKeys: string[]
  sidebarLabels: string
  hasPhoto: boolean
  customHeadingKeys: string[]
  renamedStandard: string[]
  email: boolean
  phone: boolean
  location: boolean
  name: boolean
  title: boolean
  emptySkillMeters: number
  skillKeywordCount: number
  maxSkillGroup: number
  workCount: number
  datedWork: number
  standardPresent: string[]
  fancyBullets: boolean
  sectionCount: number
}

const STANDARD = new Set(['work', 'education', 'skills', 'projects', 'summary', 'languages', 'certificates', 'awards', 'publications', 'volunteer', 'interests', 'references', 'profiles'])

function collectSignals(input: ResumeDocument): Signals {
  // The structural signals below already read `resolveOrder`, so they always
  // described the visible page. The CONTENT signals did not: a hidden skills
  // group still raised `skillKeywordCount`, so the "what this parser extracts"
  // readout credited the applicant with skills no parser would ever see
  // (measured: 15 skill keywords reported from a section the page had
  // dropped). Narrowing the document once here makes both halves agree.
  const doc = visibleDocument(input)
  const c = doc.content
  const layout = doc.metadata.layout
  const { main, aside, footer } = resolveOrder(doc)
  const twoColumn = layout.columns === 2 && aside.length > 0
  const sidebarLabels = aside.map((k) => sectionLabel(k, doc)).join(', ')

  // The footer strip is read last, but it is read: its headings count too.
  const allKeys = [...main, ...aside, ...footer]
  const customHeadingKeys = allKeys.filter((k) => k.startsWith('custom-'))
  // Standard sections the user renamed to a non-standard label (a field-mapping
  // parser keys off the heading text, so a rename can hide the section).
  const renamedStandard = allKeys.filter((k) => {
    if (!STANDARD.has(k)) return false
    const custom = layout.headings?.[k]
    const def = DEFAULT_LABELS[k]
    return !!custom && !!def && custom.trim().toLowerCase() !== def.toLowerCase()
  })

  let emptySkillMeters = 0
  let skillKeywordCount = 0
  let maxSkillGroup = 0
  for (const g of c.skills) {
    const kw = (g.keywords ?? []).filter(Boolean)
    skillKeywordCount += kw.length
    maxSkillGroup = Math.max(maxSkillGroup, kw.length)
    if (kw.length === 0 && typeof g.rating === 'number') emptySkillMeters++
  }

  const datedWork = c.work.filter((w) => /\d{4}/.test(w.startDate || '')).length

  const bulletStyles = Object.values(layout.sectionSettings ?? {}).map((s) => s?.bulletStyle)
  const globalBullet = doc.metadata.typography.bulletStyle
  const fancy = ['arrow', 'diamond', 'check', 'chevron'].includes(globalBullet) || bulletStyles.some((b) => b && ['arrow', 'diamond', 'check', 'chevron'].includes(b))

  return {
    twoColumn,
    sidebarKeys: aside,
    sidebarLabels,
    hasPhoto: !!(layout.showPhoto && c.basics.image),
    customHeadingKeys,
    renamedStandard,
    email: !!cleanEmail(c.basics.email),
    phone: !!(c.basics.phone && c.basics.phone.trim()),
    location: !!(c.basics.location?.city || c.basics.location?.region),
    name: !!(c.basics.name && c.basics.name.trim()),
    title: !!(c.basics.label && c.basics.label.trim()),
    emptySkillMeters,
    skillKeywordCount,
    maxSkillGroup,
    workCount: c.work.filter((w) => w.position || w.name || (w.highlights ?? []).some((h) => htmlToText(h))).length,
    datedWork,
    standardPresent: ['work', 'education', 'skills'].filter((k) => allKeys.includes(k)),
    fancyBullets: fancy,
    sectionCount: allKeys.length,
  }
}

/** Shared findings every parser cares about, weighted per parser via `w`. */
function baseFindings(sig: Signals, w: { twoCol: number; photo: number; heading: number; special?: number }, tx: Tx): { findings: Finding[]; penalty: number } {
  const findings: Finding[] = []
  let penalty = 0

  // contact completeness — universal, heavily weighted
  if (!sig.email) {
    findings.push({
      severity: 'risk',
      title: tx('ats.sim.noEmail.title'),
      detail: tx('ats.sim.noEmail.detail'),
    })
    penalty += 22
  }
  if (!sig.phone) {
    findings.push({
      severity: 'minor',
      title: tx('ats.sim.noPhone.title'),
      detail: tx('ats.sim.noPhone.detail'),
    })
    penalty += 6
  }

  // unreadable skill meters — universal (there is literally no text to read)
  if (sig.emptySkillMeters > 0) {
    findings.push({
      severity: 'risk',
      title: tx(sig.emptySkillMeters > 1 ? 'ats.sim.emptySkills.many' : 'ats.sim.emptySkills.one', {
        n: sig.emptySkillMeters,
      }),
      detail: tx('ats.sim.emptySkills.detail'),
    })
    penalty += 10 * Math.min(sig.emptySkillMeters, 3)
  }

  // keyword stuffing — a wall of skills. Parsers ingest them, but recruiters
  // skim past it and some systems weight an over-stuffed skills block down.
  if (sig.skillKeywordCount > 60 || sig.maxSkillGroup > 30) {
    findings.push({
      severity: sig.skillKeywordCount > 100 ? 'risk' : 'minor',
      title: tx('ats.sim.stuffing.title', { n: sig.skillKeywordCount }),
      detail: tx('ats.sim.stuffing.detail'),
    })
    penalty += sig.skillKeywordCount > 100 ? 10 : 5
  }

  // two-column reading order
  //
  // What the export actually does matters here, and it is not what this
  // finding used to claim. Our PDF emits the main column ahead of the sidebar
  // on every page, so anything reading in content order gets the name and
  // experience first (asserted by the two-column ATS gate). Two real risks
  // remain, and they are different from each other: a parser that rebuilds
  // the page from glyph POSITIONS reads left to right and so hits a left
  // sidebar first, and a resume longer than one page interleaves for
  // everyone, because each page carries its own main-then-sidebar pair.
  if (sig.twoColumn && w.twoCol > 0) {
    const sidebar = sig.sidebarLabels || tx('ats.sim.sidebar')
    findings.push({
      severity: w.twoCol >= 12 ? 'risk' : 'minor',
      title: tx('ats.sim.twoCol.title'),
      detail: tx(w.twoCol >= 12 ? 'ats.sim.twoCol.risk' : 'ats.sim.twoCol.ok', { sidebar }),
    })
    penalty += w.twoCol
  }

  // photo / graphics
  if (sig.hasPhoto && w.photo > 0) {
    findings.push({
      severity: w.photo >= 10 ? 'risk' : 'minor',
      title: tx('ats.sim.photo.title'),
      detail: tx(w.photo >= 10 ? 'ats.sim.photo.risk' : 'ats.sim.photo.ok'),
    })
    penalty += w.photo
  }

  // non-standard / renamed headings
  const headingIssues = sig.customHeadingKeys.length + sig.renamedStandard.length
  if (headingIssues > 0 && w.heading > 0) {
    findings.push({
      severity: w.heading >= 8 ? 'risk' : 'minor',
      title: tx('ats.sim.heading.title'),
      detail: tx(w.heading >= 8 ? 'ats.sim.heading.risk' : 'ats.sim.heading.ok'),
    })
    penalty += w.heading
  }

  // fancy bullet glyphs (mostly cosmetic since our text layer is clean)
  if (sig.fancyBullets && (w.special ?? 0) > 0) {
    findings.push({
      severity: 'minor',
      title: tx('ats.sim.bullets.title'),
      detail: tx('ats.sim.bullets.detail'),
    })
    penalty += w.special ?? 0
  }

  return { findings, penalty }
}

function extractedFor(sig: Signals, scrambled: boolean): Extracted {
  return {
    name: sig.name,
    title: sig.title,
    email: sig.email,
    phone: sig.phone,
    location: sig.location,
    roles: sig.workCount,
    rolesScrambled: scrambled,
    skills: sig.skillKeywordCount,
    skillsLost: sig.emptySkillMeters,
  }
}

function verdictFor(score: number): 'clean' | 'minor' | 'risk' {
  if (score >= 85) return 'clean'
  if (score >= 65) return 'minor'
  return 'risk'
}

export function simulateAts(doc: ResumeDocument, locale: Locale = 'en'): AtsProfileReport[] {
  const sig = collectSignals(doc)
  const reports: AtsProfileReport[] = []
  const tx: Tx = (key, vars) => translate(locale, key, vars)

  const build = (id: string, name: string, blurbKey: MsgKey, w: { twoCol: number; photo: number; heading: number; special?: number }, extra?: Finding[]) => {
    const { findings, penalty } = baseFindings(sig, w, tx)
    const blurb = tx(blurbKey)
    const all = [...findings, ...(extra ?? [])]
    const score = Math.max(0, Math.min(100, 100 - penalty))
    // roles are "scrambled" only when two-column AND this parser is order-sensitive
    const scrambled = sig.twoColumn && w.twoCol >= 12
    if (all.length === 0)
      all.push({
        severity: 'ok',
        title: tx('ats.sim.clean.title'),
        detail: tx('ats.sim.clean.detail'),
      })
    reports.push({ id, name, blurb, score, verdict: verdictFor(score), findings: all, extracted: extractedFor(sig, scrambled) })
  }

  // Workday — field-mapping; heading-sensitive, tolerant of columns, ignores photos.
  build('workday', 'Workday', 'ats.sim.workday', { twoCol: 6, photo: 0, heading: 9 })

  // Greenhouse — clean parser, no auto-score; the most forgiving on layout.
  build('greenhouse', 'Greenhouse', 'ats.sim.greenhouse', { twoCol: 3, photo: 0, heading: 3 }, [
    {
      severity: 'ok',
      title: tx('ats.sim.greenhouse.title'),
      detail: tx('ats.sim.greenhouse.detail'),
    },
  ])

  // Lever — keyword-driven; reads linear order; skills text matters.
  build('lever', 'Lever', 'ats.sim.lever', { twoCol: 8, photo: 0, heading: 5 })

  // Taleo — legacy, strict; the harshest on columns, graphics and glyphs.
  build('taleo', 'Taleo', 'ats.sim.taleo', { twoCol: 16, photo: 12, heading: 8, special: 5 })

  // iCIMS — ML/semantic; the most layout-tolerant.
  build('icims', 'iCIMS', 'ats.sim.icims', { twoCol: 4, photo: 0, heading: 3 }, [
    {
      severity: 'ok',
      title: tx('ats.sim.icims.title'),
      detail: tx('ats.sim.icims.detail'),
    },
  ])

  return reports
}

/** One headline number: the weakest parser is the one that gates you. */
export function worstAtsScore(reports: AtsProfileReport[]): number {
  return reports.reduce((m, r) => Math.min(m, r.score), 100)
}
