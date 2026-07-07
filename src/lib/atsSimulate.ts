/**
 * Per-ATS parse simulation — a deterministic, on-device emulation of how the
 * major applicant-tracking systems (Workday, Greenhouse, Lever, Taleo, iCIMS)
 * actually read a résumé. No incumbent ships this *inside* the editor, and it
 * runs with zero network — same résumé always yields the same report.
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
import { htmlToText } from '@/lib/utils'
import { cleanEmail } from '@/templates/_shared/atoms'

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

function collectSignals(doc: ResumeDocument): Signals {
  const c = doc.content
  const layout = doc.metadata.layout
  const { main, aside } = resolveOrder(doc)
  const twoColumn = layout.columns === 2 && aside.length > 0
  const sidebarLabels = aside.map((k) => sectionLabel(k, doc)).join(', ')

  const allKeys = [...main, ...aside]
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
  const fancy = ['arrow', 'diamond', 'check'].includes(globalBullet) || bulletStyles.some((b) => b && ['arrow', 'diamond', 'check'].includes(b))

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
function baseFindings(sig: Signals, w: { twoCol: number; photo: number; heading: number; special?: number }): { findings: Finding[]; penalty: number } {
  const findings: Finding[] = []
  let penalty = 0

  // contact completeness — universal, heavily weighted
  if (!sig.email) {
    findings.push({ severity: 'risk', title: 'No email detected', detail: 'A parser maps your email to the primary contact field. Add one so recruiters can reach you.' })
    penalty += 22
  }
  if (!sig.phone) {
    findings.push({ severity: 'minor', title: 'No phone number', detail: 'Most systems expect a phone field. Add one for completeness.' })
    penalty += 6
  }

  // unreadable skill meters — universal (there is literally no text to read)
  if (sig.emptySkillMeters > 0) {
    findings.push({
      severity: 'risk',
      title: `${sig.emptySkillMeters} skill group${sig.emptySkillMeters > 1 ? 's' : ''} have no text`,
      detail: 'A rating bar with no words is invisible to every parser — add the actual skill keywords so they are captured.',
    })
    penalty += 10 * Math.min(sig.emptySkillMeters, 3)
  }

  // keyword stuffing — a wall of skills. Parsers ingest them, but recruiters
  // skim past it and some systems weight an over-stuffed skills block down.
  if (sig.skillKeywordCount > 60 || sig.maxSkillGroup > 30) {
    findings.push({
      severity: sig.skillKeywordCount > 100 ? 'risk' : 'minor',
      title: `Possible keyword stuffing (${sig.skillKeywordCount} skills)`,
      detail: 'A parser will read them, but a wall of keywords reads as padding to recruiters and some systems discount it. Group and prioritise the ~15–25 skills that match your target roles.',
    })
    penalty += sig.skillKeywordCount > 100 ? 10 : 5
  }

  // two-column reading order
  if (sig.twoColumn && w.twoCol > 0) {
    const sidebar = sig.sidebarLabels
    findings.push({
      severity: w.twoCol >= 12 ? 'risk' : 'minor',
      title: 'Two-column layout',
      detail: w.twoCol >= 12
        ? `This parser reads the sidebar (${sidebar || 'side column'}) before the main column, which can scramble the order. A single-column template is the safest choice for it.`
        : `Handled reasonably, but the sidebar is read before the main column. Verify the order in "What an ATS sees".`,
    })
    penalty += w.twoCol
  }

  // photo / graphics
  if (sig.hasPhoto && w.photo > 0) {
    findings.push({
      severity: w.photo >= 10 ? 'risk' : 'minor',
      title: 'Profile photo present',
      detail: w.photo >= 10
        ? 'Legacy parsers can choke on embedded images and drop nearby text. Hiding the photo is safer for this system (and standard for US applications).'
        : 'The image itself is ignored, but keep important text away from it.',
    })
    penalty += w.photo
  }

  // non-standard / renamed headings
  const headingIssues = sig.customHeadingKeys.length + sig.renamedStandard.length
  if (headingIssues > 0 && w.heading > 0) {
    findings.push({
      severity: w.heading >= 8 ? 'risk' : 'minor',
      title: 'Non-standard section headings',
      detail: w.heading >= 8
        ? 'This system routes content by recognising headings like "Experience", "Education" and "Skills". Custom or renamed headings may land in the wrong field — keep at least the core sections named conventionally.'
        : 'Custom headings are mostly fine here, but the core sections read best with conventional names.',
    })
    penalty += w.heading
  }

  // fancy bullet glyphs (mostly cosmetic since our text layer is clean)
  if (sig.fancyBullets && (w.special ?? 0) > 0) {
    findings.push({
      severity: 'minor',
      title: 'Decorative bullet markers',
      detail: 'The exported text stays clean, but strict literal-matching parsers occasionally keep the glyph. A plain disc/dash bullet is the most bulletproof.',
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

export function simulateAts(doc: ResumeDocument): AtsProfileReport[] {
  const sig = collectSignals(doc)
  const reports: AtsProfileReport[] = []

  const build = (id: string, name: string, blurb: string, w: { twoCol: number; photo: number; heading: number; special?: number }, extra?: Finding[]) => {
    const { findings, penalty } = baseFindings(sig, w)
    const all = [...findings, ...(extra ?? [])]
    const score = Math.max(0, Math.min(100, 100 - penalty))
    // roles are "scrambled" only when two-column AND this parser is order-sensitive
    const scrambled = sig.twoColumn && w.twoCol >= 12
    if (all.length === 0) all.push({ severity: 'ok', title: 'Parses cleanly', detail: 'No structural risks detected for this system — your content maps to the expected fields.' })
    reports.push({ id, name, blurb, score, verdict: verdictFor(score), findings: all, extracted: extractedFor(sig, scrambled) })
  }

  // Workday — field-mapping; heading-sensitive, tolerant of columns, ignores photos.
  build('workday', 'Workday', 'Maps text into structured fields; leans on standard section headings.', { twoCol: 6, photo: 0, heading: 9 })

  // Greenhouse — clean parser, no auto-score; the most forgiving on layout.
  build('greenhouse', 'Greenhouse', 'Parses cleanly and does not auto-score — clarity matters more than keywords.', { twoCol: 3, photo: 0, heading: 3 }, [
    { severity: 'ok', title: 'No automated ranking', detail: 'Greenhouse does not auto-score résumés, so keyword-stuffing gains nothing here — a clean, readable structure is what counts.' },
  ])

  // Lever — keyword-driven; reads linear order; skills text matters.
  build('lever', 'Lever', 'Keyword-driven and reads the document in linear order.', { twoCol: 8, photo: 0, heading: 5 })

  // Taleo — legacy, strict; the harshest on columns, graphics and glyphs.
  build('taleo', 'Taleo', 'Legacy, strict literal matching — the least forgiving of layout and graphics.', { twoCol: 16, photo: 12, heading: 8, special: 5 })

  // iCIMS — ML/semantic; the most layout-tolerant.
  build('icims', 'iCIMS', 'ML/semantic matching — layout-tolerant and good with synonyms.', { twoCol: 4, photo: 0, heading: 3 }, [
    { severity: 'ok', title: 'Semantic matching', detail: 'iCIMS understands synonyms, so exact keyword phrasing matters less — but the skills still need to appear as text to be captured.' },
  ])

  return reports
}

/** One headline number: the weakest parser is the one that gates you. */
export function worstAtsScore(reports: AtsProfileReport[]): number {
  return reports.reduce((m, r) => Math.min(m, r.score), 100)
}
