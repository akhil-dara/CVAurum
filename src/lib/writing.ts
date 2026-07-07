/**
 * On-device résumé writing analysis — 100% deterministic, zero network, no LLM.
 * Reads every bullet & summary and flags the things recruiters penalize:
 * weak/vague openers, passive voice, first-person pronouns, missing metrics,
 * filler words, and over-long lines — with a concrete suggestion for each.
 *
 * This is the "AI that never phones home" writing coach: same input always
 * yields the same advice, and nothing about your career ever leaves the tab.
 */
import type { ResumeDocument } from '@/types/document'
import { htmlToText } from '@/lib/utils'

export type WritingSeverity = 'strong' | 'suggestion' | 'warning'

export interface WritingIssue {
  kind: string
  severity: WritingSeverity
  message: string
  /** the offending fragment, when there is one */
  match?: string
  /** a concrete suggested replacement, when we have one */
  suggestion?: string
}

export interface BulletAnalysis {
  /** locator so the UI can label where the bullet lives */
  section: string
  where: string
  text: string
  issues: WritingIssue[]
}

export interface WritingReport {
  score: number
  bulletCount: number
  cleanCount: number
  issues: BulletAnalysis[]
  /** counts by kind for the summary line */
  totals: Record<string, number>
}

/** Vague/weak openers → what to do instead. */
const WEAK_OPENERS: { re: RegExp; label: string }[] = [
  { re: /^(responsible for)\b/i, label: 'Responsible for' },
  { re: /^(worked on)\b/i, label: 'Worked on' },
  { re: /^(helped(?: to)?)\b/i, label: 'Helped' },
  { re: /^(assisted(?: with| in)?)\b/i, label: 'Assisted' },
  { re: /^(involved in)\b/i, label: 'Involved in' },
  { re: /^(participated in)\b/i, label: 'Participated in' },
  { re: /^(tasked with)\b/i, label: 'Tasked with' },
  { re: /^(duties included)\b/i, label: 'Duties included' },
  { re: /^(in charge of)\b/i, label: 'In charge of' },
  { re: /^(handled)\b/i, label: 'Handled' },
]

/** Weak verbs anywhere → stronger options. */
const WEAK_VERBS: Record<string, string[]> = {
  managed: ['Led', 'Directed', 'Orchestrated'],
  made: ['Built', 'Created', 'Produced'],
  did: ['Executed', 'Delivered', 'Performed'],
  used: ['Leveraged', 'Applied', 'Deployed'],
  got: ['Secured', 'Earned', 'Achieved'],
  worked: ['Built', 'Delivered', 'Drove'],
  helped: ['Enabled', 'Accelerated', 'Drove'],
}

/** Strong action verbs to suggest for weak openers, by flavour. */
const STRONG_VERBS = ['Led', 'Built', 'Launched', 'Drove', 'Delivered', 'Designed', 'Owned', 'Scaled', 'Streamlined', 'Spearheaded']

const FILLER = [
  'various',
  'several',
  'a lot of',
  'lots of',
  'many things',
  'stuff',
  'things',
  'etc',
  'and so on',
  'as needed',
  'successfully',
  'basically',
  'really',
]

/** Overused clichés recruiters penalize — say the concrete thing instead. */
const CLICHES = [
  'team player',
  'hard worker',
  'hard-working',
  'hardworking',
  'detail-oriented',
  'detail oriented',
  'results-driven',
  'results driven',
  'go-getter',
  'self-starter',
  'think outside the box',
  'outside the box',
  'synergy',
  'synergies',
  'proactive',
  'fast learner',
  'quick learner',
  'proven track record',
  'best of breed',
  'move the needle',
  'ninja',
  'rockstar',
  'guru',
]

/** How much each issue kind drags the writing score (0–1 per bullet, capped). */
const KIND_WEIGHT: Record<string, number> = {
  'weak-opener': 1,
  cliche: 0.7,
  passive: 0.65,
  'first-person': 0.65,
  'weak-verb': 0.5,
  filler: 0.5,
  'too-long': 0.35,
  'no-metric': 0.25, // advisory — the ATS panel already reports the quantified ratio
}

/** Passive voice: a "to be" form followed by a past participle (regular -ed or
 *  a common irregular). Adverbs between them ("was quickly rebuilt") still match. */
const PASSIVE_RE = /\b(was|were|been|being|is|are|be)\b\s+(?:\w+ly\s+)?(\w+ed|\w*built|\w*made|\w*written|\w*driven|\w*taken|\w*given|\w*shown|\w*grown|done|led|kept|held|sent|found|run|met|set|put|read|split|spent|won|chosen|drawn|thrown)\b/i

/** First-person pronouns don't belong on a résumé. */
const FIRST_PERSON_RE = /\b(I|I['’]m|I['’]ve|my|me|we|our|us)\b/

/** Any quantification signal: %, $, digits, or a spelled multiplier. */
const QUANT_RE = /(\d|%|\$|£|€|\bmillion\b|\bthousand\b|\bhundred\b|\bdozens?\b|\bx\b)/i

const WORD = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

function analyzeText(text: string, opts: { requireMetric: boolean }): WritingIssue[] {
  const t = text.trim()
  const issues: WritingIssue[] = []
  if (!t) return issues

  for (const { re, label } of WEAK_OPENERS) {
    if (re.test(t)) {
      issues.push({
        kind: 'weak-opener',
        severity: 'warning',
        message: `Starts with "${label}" — open with a strong action verb instead.`,
        match: label,
        suggestion: STRONG_VERBS.slice(0, 4).join(', '),
      })
      break
    }
  }

  const firstWord = t.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
  if (firstWord && WEAK_VERBS[firstWord]) {
    issues.push({
      kind: 'weak-verb',
      severity: 'suggestion',
      message: `"${firstWord[0].toUpperCase() + firstWord.slice(1)}" is a soft verb — a punchier one lands harder.`,
      match: firstWord,
      suggestion: WEAK_VERBS[firstWord].join(', '),
    })
  }

  const passive = t.match(PASSIVE_RE)
  if (passive) {
    issues.push({
      kind: 'passive',
      severity: 'suggestion',
      message: 'Passive voice — say what you did, not what was done.',
      match: passive[0],
    })
  }

  const fp = t.match(FIRST_PERSON_RE)
  if (fp) {
    issues.push({
      kind: 'first-person',
      severity: 'suggestion',
      message: `Drop the first-person "${fp[0]}" — résumé bullets omit pronouns.`,
      match: fp[0],
    })
  }

  for (const f of FILLER) {
    const re = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const m = t.match(re)
    if (m) {
      issues.push({
        kind: 'filler',
        severity: 'suggestion',
        message: `Vague word "${m[0]}" — a specific detail is stronger.`,
        match: m[0],
      })
      break
    }
  }

  for (const cl of CLICHES) {
    const re = new RegExp(`\\b${cl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const m = t.match(re)
    if (m) {
      issues.push({
        kind: 'cliche',
        severity: 'suggestion',
        message: `Cliché "${m[0]}" — recruiters skim past it. Show it with a concrete result instead.`,
        match: m[0],
      })
      break
    }
  }

  if (opts.requireMetric && !QUANT_RE.test(t)) {
    issues.push({
      kind: 'no-metric',
      severity: 'suggestion',
      message: 'No number here — a metric (%, $, count, time saved) makes impact concrete.',
    })
  }

  const words = WORD(t)
  if (words > 34) {
    issues.push({
      kind: 'too-long',
      severity: 'suggestion',
      message: `Long line (${words} words) — tighten to one crisp idea (~14–24 words).`,
    })
  }

  return issues
}

export function analyzeWriting(doc: ResumeDocument): WritingReport {
  const bullets: BulletAnalysis[] = []
  const push = (section: string, where: string, html: string, requireMetric: boolean) => {
    const text = htmlToText(html)
    if (!text.trim()) return
    const issues = analyzeText(text, { requireMetric })
    bullets.push({ section, where, text, issues })
  }

  for (const w of doc.content.work) {
    const where = w.position || w.name || 'Experience'
    if (w.summary) push('Experience', where, w.summary, false)
    for (const h of w.highlights ?? []) push('Experience', where, h, true)
  }
  for (const p of doc.content.projects) {
    const where = p.name || 'Project'
    for (const h of p.highlights ?? []) push('Projects', where, h, true)
  }
  for (const v of doc.content.volunteer) {
    const where = v.position || v.organization || 'Volunteering'
    for (const h of v.highlights ?? []) push('Volunteering', where, h, true)
  }
  if (doc.content.basics.summary) push('Summary', 'Professional summary', doc.content.basics.summary, false)

  const withIssues = bullets.filter((b) => b.issues.length > 0)
  const totals: Record<string, number> = {}
  for (const b of withIssues) for (const i of b.issues) totals[i.kind] = (totals[i.kind] ?? 0) + 1

  const bulletCount = bullets.length
  const cleanCount = bulletCount - withIssues.length
  // Score off the AVERAGE per-bullet "badness" so it spreads across a usable
  // range instead of clustering near 100. Each bullet's badness is the sum of
  // its issue weights, capped at 1 (one bad bullet can't sink the whole score),
  // then averaged and scaled — a résumé where every bullet has a real problem
  // lands in the 20s, a clean one at 100. Advisory kinds (no-metric) barely move it.
  let badnessSum = 0
  for (const b of withIssues) {
    let w = 0
    for (const i of b.issues) w += KIND_WEIGHT[i.kind] ?? 0.5
    badnessSum += Math.min(1, w)
  }
  const avgBad = bulletCount === 0 ? 0 : badnessSum / bulletCount
  const score = Math.max(0, Math.min(100, Math.round(100 - avgBad * 78)))

  // Sort worst-first for the UI.
  withIssues.sort((a, b) => b.issues.length - a.issues.length)

  return { score, bulletCount, cleanCount, issues: withIssues, totals }
}
