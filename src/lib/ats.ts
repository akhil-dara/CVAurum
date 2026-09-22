/**
 * Deterministic ATS analysis. No LLM — instant, private, explainable. Two parts:
 *   1. Structural checks (we GENERATE the document, so these are reliable).
 *   2. Job-description keyword overlap (paste a JD → matched/missing keywords).
 * A transparent, on-device approach in the spirit of open ATS checkers.
 */
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { htmlToText } from '@/lib/utils'
import { getTemplate } from '@/templates/registry'
import { sectionHasContent } from '@/lib/sections'
import { visibleDocument } from '@/lib/atsScope'
import { LEGIBLE_BODY_PT } from '@/lib/fitReadout'

export type CheckStatus = 'pass' | 'warn' | 'fail'

/**
 * Which question a check answers, so the report can be read in three passes
 * instead of as one flat list of twenty-five rows: is the right material on the
 * page, is it written well, and is it set so a parser can read it.
 *
 * Still three after the writing rules landed, and the reason is measured. A
 * category earns its own score only if that score MOVES on its own; across the
 * 108 examples this ships with, each of these does — content ranges 80–100,
 * writing 93–100, format 91–100, and no two of them move together. A fourth
 * would have to be carved out of `content`, which is the widest at twelve rows
 * per document; but those twelve all answer the one question ("is the material
 * there"), and splitting them would leave a ring sitting over two rows, which
 * is a decoration rather than a signal. Three questions, three scores.
 */
export type AtsCategory = 'content' | 'writing' | 'format'

export const ATS_CATEGORY_LABELS: Record<AtsCategory, string> = {
  content: 'What is on the page',
  writing: 'How it is written',
  format: 'How it is set',
}

export interface AtsCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  weight: number
  category: AtsCategory
  /**
   * The thing a failing check is about, so a panel can offer to jump there:
   * the section key the canvas draws under `data-section`, the index of the
   * entry inside it, and — when the fault is in one bullet rather than the
   * entry as a whole — which bullet. "Three bullets use first-person" is a
   * note; "this bullet, here" is a fix.
   */
  where?: { section: string; entry?: number; bullet?: number }
}

/**
 * What the app measured about the rendered document, when it has.
 *
 * Two of the rules worth checking are about the PAGE rather than the text, and
 * the page is something this product renders itself: the paginator knows how
 * many there are, and Magic fit knows the size the body text actually came out
 * at, which is not the size the author set. Without these the analysis falls
 * back to estimating from the word count, which is what it used to do — and
 * which called a one-page résumé two pages often enough to be worth fixing.
 */
export interface AtsMeasurement {
  /** Real page count, from the preview's own pagination. */
  pages?: number
  /** The body size the reader actually gets after the fit, in points. */
  bodyPt?: number
}
export interface JdKeyword {
  term: string
  inResume: boolean
  importance: number
}
export interface JdAnalysis {
  matched: string[]
  missing: string[]
  matchRate: number
  keywords: JdKeyword[]
}
export interface AtsReport {
  score: number
  checks: AtsCheck[]
  /**
   * The same weighted score, per category. One number for the whole document
   * says "82" and leaves the reader hunting; three say which of the three
   * jobs — the material, the writing, the setting — is the one going wrong.
   */
  categoryScores: Record<AtsCategory, number>
  wordCount: number
  bulletCount: number
  quantifiedCount: number
  pages: number
  jd?: JdAnalysis
}

const STOPWORDS = new Set(
  `a an and the or but if then else for to of in on at by with from as is are was were be been being this that these those you your we our they their he she it its will would can could should may might must shall do does did has have had not no nor so than too very just into over under out up down off about across after again against all also am any because before below between both during each few more most other some such only own same own who whom which what when where why how into onto per via etc using use used work works working team teams role roles responsible responsibilities experience years year ability strong excellent good great new`.split(
    /\s+/
  )
)

// Common hard-skill / tooling tokens that should always count as keywords.
const TECH = new Set(
  `javascript typescript python java go golang rust ruby php swift kotlin scala c c++ c# .net node nodejs react reactjs vue vuejs angular svelte next nextjs nuxt redux graphql rest api apis html css sass tailwind webpack vite express django flask fastapi spring rails laravel sql postgresql postgres mysql mongodb redis kafka rabbitmq elasticsearch aws azure gcp docker kubernetes k8s terraform ansible jenkins git github gitlab cicd ci/cd linux bash agile scrum jira figma sketch ml ai llm pytorch tensorflow pandas numpy spark hadoop tableau powerbi excel saas b2b b2c seo crm erp salesforce sap`.split(
    /\s+/
  )
)

const ACTION_VERBS = new Set(
  `led built created designed developed launched shipped architected drove delivered improved increased reduced cut grew scaled managed mentored owned spearheaded implemented optimized automated streamlined established founded launched negotiated analyzed achieved generated boosted accelerated transformed redesigned migrated coordinated directed orchestrated pioneered initiated`.split(
    /\s+/
  )
)

const WEAK_STARTS = new Set(
  `responsible worked helped assisted participated involved tasked duties handled various dealt`.split(/\s+/)
)

/**
 * Plain text of the resume THE PAGE DRAWS, for keyword matching & counts.
 *
 * Narrowed through `visibleDocument` first: a section the author hid is not on
 * the page, not in the PDF, and so has no business raising a word count or
 * satisfying a job description's keyword. This used to walk `doc.content`
 * whole, which is why a removed skill group kept matching a JD term.
 */
export function extractResumeText(input: ResumeDocument): string {
  const doc = visibleDocument(input)
  const c = doc.content
  const parts: string[] = []
  const b = c.basics
  parts.push(b.name, b.label, htmlToText(b.summary))
  c.work.forEach((w) => parts.push(w.position, w.name, htmlToText(w.summary), ...w.highlights.map(htmlToText)))
  c.projects.forEach((p) => parts.push(p.name, p.description, ...p.highlights.map(htmlToText), ...(p.keywords ?? [])))
  c.education.forEach((e) => parts.push(e.area, e.studyType, e.institution, ...(e.courses ?? [])))
  c.skills.forEach((s) => parts.push(s.name, ...(s.keywords ?? [])))
  c.volunteer.forEach((v) => parts.push(v.position, v.organization, htmlToText(v.summary), ...v.highlights.map(htmlToText)))
  c.awards.forEach((a) => parts.push(a.title, htmlToText(a.summary)))
  c.certificates.forEach((x) => parts.push(x.name, x.issuer))
  c.publications.forEach((p) => parts.push(p.name, htmlToText(p.summary)))
  c.languages.forEach((l) => parts.push(l.language))
  c.interests.forEach((i) => parts.push(i.name, ...(i.keywords ?? [])))
  c.custom.forEach((sec) => sec.items.forEach((it) => parts.push(it.name, it.subtitle, htmlToText(it.summary), ...(it.highlights ?? []).map(htmlToText))))
  return parts.filter(Boolean).join(' \n ')
}

/**
 * One bullet, and where it lives.
 *
 * The section key is the one the canvas draws under `data-section`, and the
 * entry index is the position inside that section's array — the two halves of
 * `AtsCheck.where`. The bullet index is the position in the ORIGINAL
 * `highlights` array, not in the filtered list: an empty bullet still occupies
 * a row on the canvas, so counting past it would point the reader at the wrong
 * line.
 */
interface BulletRef {
  text: string
  section: string
  entry: number
  bullet: number
}

function allBullets(c: ResumeContent): BulletRef[] {
  const out: BulletRef[] = []
  const take = (section: string, entry: number, highlights?: string[]) =>
    (highlights ?? []).forEach((h, bullet) => out.push({ text: htmlToText(h), section, entry, bullet }))
  c.work.forEach((w, i) => take('work', i, w.highlights))
  c.projects.forEach((p, i) => take('projects', i, p.highlights))
  c.volunteer.forEach((v, i) => take('volunteer', i, v.highlights))
  c.custom.forEach((s) => s.items.forEach((it, i) => take(`custom-${s.id}`, i, it.highlights)))
  return out.filter((b) => b.text.trim().length > 0)
}

const at = (b?: BulletRef): AtsCheck['where'] =>
  b ? { section: b.section, entry: b.entry, bullet: b.bullet } : undefined

/** The first few words of a bullet, for a message that names the offender. */
const snippet = (text: string, n = 46) => {
  const t = text.trim()
  return t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, '')}…`
}

/** Matches any of `terms` as whole words; returns the matched text. */
function firstTerm(text: string, terms: readonly string[]): string | undefined {
  for (const term of terms) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const m = text.match(re)
    if (m) return m[0]
  }
  return undefined
}

/**
 * First-person pronouns, which no résumé convention wants: the page is already
 * about the person whose name is at the top, so "I" is a word spent saying
 * nothing.
 *
 * Case is load-bearing and the `i` flag is deliberately absent. "US" is a
 * country, "WE" and "OUR" turn up inside initialisms and all-caps headings,
 * and matching them case-insensitively made this rule fire on résumés that
 * contained no pronoun at all. Only the lower-case forms and the
 * sentence-initial capitals count.
 */
const PRONOUN_RE = /\b(I['’](?:m|ve|d|ll)|[Mm]y|[Mm]ine|[Mm]e|[Ww]e['’](?:re|ve|ll)|[Ww]e|[Uu]s|[Oo]urs|[Oo]ur)\b/

/**
 * A bare capital "I" counts only at the start of a sentence and only when a
 * lower-case word follows it: "I led the team".
 *
 * Both halves were earned. A plain \bI\b fired on "Title I school" and
 * "Classes I to XII" in the examples this ships with; requiring a lower-case
 * word after it still matched both ("I school", "I to"). Requiring the start
 * of a sentence as well takes the false positives to zero across all 108
 * (measured), because a Roman numeral is always preceded by the noun it
 * numbers.
 */
const BARE_I_RE = /(^|[.;:]\s+)I\s+[a-z]/

/**
 * Claims a reader cannot check. Every one of these is a sentence that would
 * say more with the evidence in its place — "team player" costs a line and
 * proves nothing, where the project you unblocked proves it by itself.
 *
 * Short on purpose. A long list of "words to avoid" fires on every résumé and
 * so teaches nobody anything; these are the ones that are ALWAYS a substitute
 * for the example underneath them.
 */
const BUZZWORDS = [
  'team player',
  'hard worker',
  'hard-working',
  'hardworking',
  'detail-oriented',
  'detail oriented',
  'results-driven',
  'results driven',
  'self-starter',
  'go-getter',
  'think outside the box',
  'outside the box',
  'proven track record',
  'thought leader',
  'best-in-class',
  'synergy',
  'synergies',
  'rockstar',
  'ninja',
  'guru',
] as const

/**
 * Words that take up a line and leave the reader knowing no more than before.
 *
 * Two kinds only: the ones that stand where a NUMBER belongs ("several
 * dashboards" — how many?), and the intensifiers that add emphasis instead of
 * fact ("very", "successfully" — if the result is in the sentence, neither is
 * needed). Nothing is here merely for being informal.
 */
const FILLER = [
  'various',
  'numerous',
  'several',
  'a number of',
  'a variety of',
  'in order to',
  'successfully',
  'basically',
  'really',
  'as needed',
] as const

/**
 * Passive voice, and an honest account of what this can and cannot see.
 *
 * The shape: a past form of "to be" — was, were, been, being — followed by a
 * past participle. "is/are + -ed" is left out on purpose, because on a résumé
 * that shape is nearly always an adjective ("is dedicated", "are aligned").
 *
 * It sees only the OPENING clause, and that restriction is the whole rule.
 * Run across every bullet in the 108 examples this ships with, the bare regex
 * matched 25 bullets; 24 of them were passive clauses about somebody else —
 * "Trained six supervisors, four of whom were promoted", "Introduced Gage R&R
 * across 40 instruments; nine … were replaced". Those are correct English and
 * good writing: the promoted supervisor is the subject, not the author. Only
 * the first clause of a bullet has the author as its subject, so only the
 * first clause can hide them, and cutting at the first comma, semicolon or
 * subordinator took the 25 matches down to one — "The redrawn set was
 * released as a free display typeface" — which is the real thing.
 *
 * What it therefore cannot see: a passive main clause phrased with an
 * unrecognised participle, and any passive after the first clause that IS
 * about the author. Both are deliberate. A rule that misses a passive sentence
 * costs nothing; one that invents twenty-four costs an afternoon of edits that
 * made the page worse.
 */
const PASSIVE_RE =
  /\b(?:was|were|been|being)\s+(?:\w+ly\s+)?(?:\w{4,}ed|\w*built|\w*made|\w*written|\w*driven|\w*taken|\w*given|\w*shown|\w*grown|\w*done|led|kept|held|sent|found|met|set|put|chosen|drawn|brought|bought|sold|paid|won|run)\b/i

/** Everything before the first clause break — where a bullet's own subject is. */
const openingClause = (t: string) =>
  t.split(/[,;:—–]|\.\s|\s(?:that|which|who|whom|whose|after|before|when|while|until|since|where|because|although|though|so)\s/i)[0]

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[-./]+|[-./]+$/g, ''))
    .filter(Boolean)

function isMeaningful(tok: string): boolean {
  if (tok.length < 2) return false
  if (STOPWORDS.has(tok)) return false
  if (/^\d+$/.test(tok)) return false
  return true
}

/** Extract ranked keywords from arbitrary text (used on the job description). */
export function extractKeywords(text: string, max = 24): string[] {
  const tokens = tokenize(text)
  const score = new Map<string, number>()
  const bump = (term: string, by: number) => score.set(term, (score.get(term) ?? 0) + by)

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (isMeaningful(t)) {
      bump(t, TECH.has(t) ? 3 : 1)
    }
    // bigrams (skip if either side is a stopword)
    if (i < tokens.length - 1) {
      const a = tokens[i]
      const b = tokens[i + 1]
      if (isMeaningful(a) && isMeaningful(b) && !STOPWORDS.has(a) && !STOPWORDS.has(b) && a.length > 2 && b.length > 2) {
        bump(`${a} ${b}`, 2.2)
      }
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    // prefer specific bigrams: drop a unigram if it's wholly inside a higher-ranked bigram
    .filter((term, _i, arr) => {
      if (term.includes(' ')) return true
      return !arr.some((o) => o.includes(' ') && o.split(' ').includes(term) && arr.indexOf(o) < arr.indexOf(term))
    })
    .slice(0, max)
}

export function analyzeResume(input: ResumeDocument, measured: AtsMeasurement = {}): AtsReport {
  // Every rule below reads the document the PAGE shows, not the one the store
  // holds. Hidden sections are dropped once, here, so no individual check has
  // to remember to ask - and so the score, the checks, the counts and the JD
  // match are all claims about the same résumé the export produces.
  const doc = visibleDocument(input)
  const c = doc.content
  const text = extractResumeText(doc)
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const bullets = allBullets(c)
  const unquantified = bullets.filter((b) => !/\d|%|\$|€|£/.test(b.text))
  const quantified = bullets.length - unquantified.length
  const tpl = getTemplate(doc.metadata.template)

  const checks: AtsCheck[] = []
  const push = (
    id: string,
    label: string,
    status: CheckStatus,
    detail: string,
    weight = 1,
    category: AtsCategory = 'content',
    where?: AtsCheck['where']
  ) => checks.push({ id, label, status, detail, weight, category, ...(where ? { where } : {}) })

  // contact
  const hasEmail = !!c.basics.email
  const hasPhone = !!c.basics.phone
  push(
    'contact',
    'Contact details',
    hasEmail && hasPhone ? 'pass' : hasEmail || hasPhone ? 'warn' : 'fail',
    hasEmail && hasPhone ? 'Email and phone are present.' : 'Add both an email and a phone number so recruiters can reach you.',
    2,
    'content'
  )

  push('summary', 'Professional summary', sectionHasContent('summary', c) ? 'pass' : 'warn', sectionHasContent('summary', c) ? 'A summary helps recruiters and ATS keyword-match instantly.' : 'Add a 2–3 line summary with your title and top skills.', 1, 'content')

  push('work', 'Work experience', c.work.length ? 'pass' : 'fail', c.work.length ? `${c.work.length} role(s) listed.` : 'Add at least one work experience entry.', 2, 'content')
  push('education', 'Education', c.education.length ? 'pass' : 'warn', c.education.length ? 'Education is present.' : 'Most ATS expect an education section.', 1, 'content')
  push('skills', 'Skills section', c.skills.length ? 'pass' : 'warn', c.skills.length ? 'Skills present — great for keyword matching.' : 'Add a skills section; ATS keyword-match heavily on it.', 1.5, 'content')

  // quantified achievements
  const quantRate = bullets.length ? quantified / bullets.length : 0
  push(
    'quantified',
    'Quantified impact',
    bullets.length === 0 ? 'warn' : quantRate >= 0.4 ? 'pass' : quantRate >= 0.2 ? 'warn' : 'fail',
    bullets.length === 0 ? 'Add bullet points describing your achievements.' : `${quantified} of ${bullets.length} bullets include a number or metric. Aim for ~50%.`,
    1.5,
    'writing',
    at(unquantified[0])
  )

  // action verbs
  const weak = bullets.filter((b) => WEAK_STARTS.has(b.text.trim().split(/\s+/)[0]?.toLowerCase() ?? ''))
  const strongStarts = bullets.filter((b) => ACTION_VERBS.has(b.text.trim().split(/\s+/)[0]?.toLowerCase() ?? '')).length
  if (bullets.length) {
    push(
      'verbs',
      'Strong action verbs',
      weak.length === 0 ? 'pass' : weak.length <= 2 ? 'warn' : 'fail',
      weak.length === 0 ? `${strongStarts} bullets start with strong verbs.` : `${weak.length} bullet(s) start with weak phrases like "responsible for". Lead with action verbs.`,
      1,
      'writing',
      at(weak[0])
    )
  }

  // length
  const idealLen = wordCount >= 350 && wordCount <= 850
  push(
    'length',
    'Length',
    idealLen ? 'pass' : wordCount < 200 ? 'fail' : 'warn',
    `${wordCount} words. Aim for ~400–800 for a focused 1–2 page resume.`,
    1,
    'content'
  )

  // ATS-safe template
  push(
    'template',
    'ATS-safe layout',
    tpl.atsSafe ? 'pass' : 'warn',
    tpl.atsSafe ? `“${tpl.name}” parses cleanly in ATS.` : `“${tpl.name}” is visually rich; some strict ATS may misread it. Prefer an ATS-safe template if applying to large companies.`,
    1.5,
    'format'
  )

  // photo warning (some ATS choke on images / headshots)
  if (doc.metadata.layout.showPhoto && c.basics.image) {
    push('photo', 'Photo', 'warn', 'A photo can confuse some ATS and invite bias screening in the US/UK. Consider hiding it for ATS-heavy applications.', 0.5, 'format')
  }

  // custom (non-standard) section names
  const renamed = Object.keys(doc.metadata.layout.headings ?? {}).length
  if (renamed) {
    push('headings', 'Standard headings', 'warn', 'You renamed some section headings. Keep standard names (Experience, Education, Skills) so ATS recognises them.', 0.5, 'format')
  }

  /* ---------------------------------------------------------------- format
   * Two rules about the PAGE rather than the words. This product renders the
   * document itself, so both can be answered exactly instead of estimated:
   * the paginator counts the pages, and Magic fit knows the size the body
   * text actually came out at. `measured` carries them when the preview has
   * run; the fallbacks below are what this used to do on its own.
   */
  const estimatedPages = Math.max(1, Math.round(wordCount / 520) || 1)
  const pages = measured.pages ?? estimatedPages
  // Two pages are right for a long career and wrong for a short one. The
  // signal is the history, not the word count: three roles and a decade is a
  // two-page résumé; one role over two pages is padding.
  const longCareer = c.work.length >= 4 || wordCount > 750
  push(
    'pages',
    'Page count',
    pages === 1 ? 'pass' : pages === 2 ? (longCareer ? 'pass' : 'warn') : 'fail',
    pages === 1
      ? 'One page — what most recruiters prefer, and what every parser handles.'
      : pages === 2
        ? longCareer
          ? 'Two pages, which a history this long earns.'
          : 'Two pages for a shorter history. Magic fit (Design → Page) can bring this back to one.'
        : `${pages} pages. Almost no recruiter reads past the second — cut, or let Magic fit tighten it.`,
    1.5,
    'format'
  )

  const bodyPt = measured.bodyPt ?? doc.metadata.typography.fontSize
  const bodyRounded = Math.round(bodyPt * 10) / 10
  push(
    'bodySize',
    'Body text size',
    bodyPt >= 9.5 && bodyPt <= 12 ? 'pass' : bodyPt >= LEGIBLE_BODY_PT ? 'warn' : 'fail',
    bodyPt >= 9.5 && bodyPt <= 12
      ? `${bodyRounded}pt — comfortable in print and on screen.`
      : bodyPt < LEGIBLE_BODY_PT
        ? `${bodyRounded}pt is below what a printed résumé should use. Cut a little content instead of shrinking further.`
        : `${bodyRounded}pt is on the edge of readable. 10–11pt is the range to aim for.`,
    1,
    'format'
  )

  /* --------------------------------------------------------------- content */

  // Bullets per role: too few says nothing about the job, too many stop being
  // read. Only roles that carry bullets at all are judged - a career break on
  // the page to explain a gap is not a role with nothing to say about it.
  const BREAK = /\b(break|leave|carer|caregiving|sabbatical)\b/i
  const roleBulletProblems = c.work
    .map((w, i) => ({ i, w, n: w.highlights.filter((h) => htmlToText(h).trim()).length }))
    .filter(({ w }) => !BREAK.test(w.position ?? ''))
    .filter(({ n }) => n < 2 || n > 6)
  if (c.work.length) {
    const worst = roleBulletProblems[0]
    push(
      'bulletsPerRole',
      'Bullets per role',
      roleBulletProblems.length === 0 ? 'pass' : roleBulletProblems.length <= 1 ? 'warn' : 'fail',
      roleBulletProblems.length === 0
        ? 'Every role carries between two and six bullets.'
        : worst && worst.n < 2
          ? `“${worst.w.position || 'A role'}” has ${worst.n === 0 ? 'no bullets' : 'one bullet'}. Two to four say what the job actually was.`
          : `“${worst?.w.position || 'A role'}” has ${worst?.n} bullets. Past six they stop being read — keep the ones with numbers in them.`,
      1,
      'content',
      worst ? { section: 'work', entry: worst.i } : undefined
    )
  }

  // A dateless entry is the one thing every parser trips on, and the one thing
  // a reader assumes the worst about.
  const undated = [
    ...c.work.map((w, i) => ({ section: 'work', i, ok: !!w.startDate })),
    ...c.education.map((e, i) => ({ section: 'education', i, ok: !!e.startDate || !!e.endDate })),
  ].filter((x) => !x.ok)
  if (c.work.length || c.education.length) {
    push(
      'dates',
      'Dates on every entry',
      undated.length === 0 ? 'pass' : 'fail',
      undated.length === 0
        ? 'Every role and course is dated.'
        : `${undated.length} entr${undated.length === 1 ? 'y has' : 'ies have'} no date. A parser reads an undated role as no role at all.`,
      1.5,
      'content',
      undated[0] ? { section: undated[0].section, entry: undated[0].i } : undefined
    )
  }

  // Where the job was. Recruiters filter on it, and a remote role that does not
  // say "Remote" reads as a gap in the geography.
  const located = c.work.filter((w) => (w.location ?? '').trim()).length
  if (c.work.length) {
    push(
      'entryLocation',
      'Location on each role',
      located === c.work.length ? 'pass' : located >= c.work.length / 2 ? 'warn' : 'fail',
      located === c.work.length
        ? 'Every role says where it was.'
        : `${c.work.length - located} of ${c.work.length} roles have no location. Add the city, or “Remote”.`,
      0.75,
      'content',
      located === c.work.length ? undefined : { section: 'work', entry: c.work.findIndex((w) => !(w.location ?? '').trim()) }
    )
  }

  // A summary that is one line says nothing; one that runs six is an essay
  // nobody reads. Two to three lines is about 25-60 words.
  const summaryWords = htmlToText(c.basics.summary ?? '').split(/\s+/).filter(Boolean).length
  if (summaryWords) {
    push(
      'summaryLength',
      'Summary length',
      summaryWords >= 25 && summaryWords <= 65 ? 'pass' : summaryWords < 15 || summaryWords > 95 ? 'fail' : 'warn',
      summaryWords >= 25 && summaryWords <= 65
        ? `${summaryWords} words — two or three lines, which is what gets read.`
        : summaryWords < 25
          ? `${summaryWords} words is too short to say what you do and what you are best at. Aim for 25–60.`
          : `${summaryWords} words. A summary past about 60 is skipped — the detail belongs in the bullets.`,
      0.75,
      'content',
      { section: 'summary' }
    )
  }

  // Thirty skills in one list is a list nobody reads; three named groups is a
  // reader finding the one they came for.
  const namedGroups = c.skills.filter((g) => (g.name ?? '').trim()).length
  const biggestGroup = c.skills.reduce((m, g) => Math.max(m, g.keywords?.length ?? 0), 0)
  if (c.skills.length) {
    const grouped = namedGroups === c.skills.length && biggestGroup <= 12
    push(
      'skillGroups',
      'Skills grouped',
      grouped ? 'pass' : 'warn',
      grouped
        ? `${c.skills.length} named group${c.skills.length === 1 ? '' : 's'}.`
        : namedGroups < c.skills.length
          ? 'Some skill groups have no name. A parser reads the name as the category.'
          : `One group holds ${biggestGroup} skills. Split it — a reader scans for a category, not a paragraph.`,
      0.75,
      'content',
      grouped
        ? undefined
        : {
            section: 'skills',
            entry: Math.max(
              0,
              namedGroups < c.skills.length
                ? c.skills.findIndex((g) => !(g.name ?? '').trim())
                : c.skills.findIndex((g) => (g.keywords?.length ?? 0) === biggestGroup)
            ),
          }
    )
  }

  // The profile link recruiters actually click, in the short form that fits on
  // one line and survives being printed.
  const linkedin = c.basics.profiles?.find((pr) => /linkedin/i.test(`${pr.network} ${pr.url}`))
  const linkedinUrl = linkedin?.url ?? ''
  const shortForm = /linkedin\.com\/in\/[^/?#]+\/?$/i.test(linkedinUrl)
  push(
    'linkedin',
    'LinkedIn profile',
    !linkedin ? 'warn' : shortForm ? 'pass' : 'warn',
    !linkedin
      ? 'No LinkedIn profile. It is the first thing most recruiters look for after the résumé itself.'
      : shortForm
        ? 'Linked in the short form recruiters expect.'
        : 'Trim the address to linkedin.com/in/your-name — the tracking tail after it is noise on a printed page.',
    0.5,
    'content'
  )

  /* --------------------------------------------------------------- writing */

  // A bullet of five words is a label, not an achievement; the reader learns
  // nothing from "Improved performance."
  const stubs = bullets.filter((b) => b.text.trim().length < 40)
  if (bullets.length) {
    push(
      'bulletDepth',
      'Bullets that say something',
      stubs.length === 0 ? 'pass' : stubs.length <= 2 ? 'warn' : 'fail',
      stubs.length === 0
        ? 'No bullet is too short to carry a result.'
        : `${stubs.length} bullet${stubs.length === 1 ? ' is' : 's are'} a fragment — e.g. “${snippet(stubs[0].text, 48)}”. Say what changed, and by how much.`,
      0.75,
      'writing',
      at(stubs[0])
    )
  }

  // Either every bullet ends with a full stop or none does. Half and half is
  // the thing a reader notices without knowing why.
  const ends = (b: BulletRef) => /[.!?]$/.test(b.text.trim())
  const ended = bullets.filter(ends).length
  if (bullets.length >= 3) {
    const consistent = ended === 0 || ended === bullets.length
    // Point at the minority: whichever way the author leans, the odd ones out
    // are the ones to change.
    const odd = bullets.filter((b) => (ended * 2 > bullets.length ? !ends(b) : ends(b)))
    push(
      'punctuation',
      'Consistent punctuation',
      consistent ? 'pass' : ended > bullets.length * 0.8 || ended < bullets.length * 0.2 ? 'warn' : 'fail',
      consistent
        ? ended === 0
          ? 'No bullet ends in a full stop — consistent.'
          : 'Every bullet ends in a full stop — consistent.'
        : `${ended} of ${bullets.length} bullets end in a full stop. Pick one and use it throughout.`,
      0.5,
      'writing',
      consistent ? undefined : at(odd[0])
    )
  }

  // Pronouns. The summary counts too — it is the one place on a résumé where
  // "I" gets written by habit, and it is the first thing read.
  const summaryText = htmlToText(c.basics.summary ?? '')
  // Whichever comes FIRST in the line, so the quoted word is the one the
  // reader's eye lands on rather than whichever regex happened to run first.
  const pronounHit = (t: string) => {
    const a = t.match(PRONOUN_RE)
    const b = t.match(BARE_I_RE)
    if (a && b) return (a.index ?? 0) <= (b.index ?? 0) ? a[0].trim() : 'I'
    if (a) return a[0].trim()
    return b ? 'I' : undefined
  }
  const pronounBullets = bullets.filter((b) => !!pronounHit(b.text))
  const pronounInSummary = !!pronounHit(summaryText)
  const pronouns = pronounBullets.length + (pronounInSummary ? 1 : 0)
  if (bullets.length || summaryText) {
    const first = pronounBullets[0]
    const shown = first ? pronounHit(first.text) : pronounHit(summaryText)
    push(
      'pronouns',
      'No first-person pronouns',
      pronouns === 0 ? 'pass' : pronouns <= 2 ? 'warn' : 'fail',
      pronouns === 0
        ? 'Written without “I” or “we”, the way a résumé is read.'
        : `${pronouns} line${pronouns === 1 ? '' : 's'} use${pronouns === 1 ? 's' : ''} a first-person pronoun${shown ? ` (“${shown}”)` : ''}${pronounInSummary && !first ? ', in the summary' : ''}. Cut it — the page is already about you.`,
      0.75,
      'writing',
      at(first) ?? (pronounInSummary ? { section: 'summary' } : undefined)
    )
  }

  // Buzzwords: the claims that stand in for the evidence.
  const buzzy = bullets
    .map((b) => ({ b, hit: firstTerm(b.text, BUZZWORDS) }))
    .filter((x): x is { b: BulletRef; hit: string } => !!x.hit)
  const buzzInSummary = firstTerm(summaryText, BUZZWORDS)
  const buzzCount = buzzy.length + (buzzInSummary ? 1 : 0)
  if (bullets.length || summaryText) {
    const hit = buzzy[0]?.hit ?? buzzInSummary
    push(
      'buzzwords',
      'Claims backed by evidence',
      buzzCount === 0 ? 'pass' : buzzCount <= 2 ? 'warn' : 'fail',
      buzzCount === 0
        ? 'Nothing on the page asks to be believed without proof.'
        : `“${hit}” is a claim a reader cannot check${buzzCount > 1 ? `, and ${buzzCount - 1} more like it` : ''}. Replace it with the thing that proves it.`,
      0.5,
      'writing',
      at(buzzy[0]?.b) ?? (buzzInSummary ? { section: 'summary' } : undefined)
    )
  }

  // Passive voice, in the narrow form the regex above can actually see.
  const passive = bullets.filter((b) => PASSIVE_RE.test(openingClause(b.text)))
  if (bullets.length) {
    push(
      'passiveVoice',
      'Active voice',
      passive.length === 0 ? 'pass' : passive.length <= 2 ? 'warn' : 'fail',
      passive.length === 0
        ? 'Every bullet says who did the thing.'
        : `${passive.length === 1 ? 'A bullet opens' : `${passive.length} bullets open`} in the passive — “…${openingClause(passive[0].text).match(PASSIVE_RE)?.[0]}…”. You did it; say so.`,
      0.5,
      'writing',
      at(passive[0])
    )
  }

  // Filler.
  const filled = bullets
    .map((b) => ({ b, hit: firstTerm(b.text, FILLER) }))
    .filter((x): x is { b: BulletRef; hit: string } => !!x.hit)
  if (bullets.length) {
    push(
      'filler',
      'Words that carry weight',
      filled.length === 0 ? 'pass' : filled.length <= 2 ? 'warn' : 'fail',
      filled.length === 0
        ? 'No bullet leans on a filler word.'
        : `${filled.length === 1 ? 'A bullet leans' : `${filled.length} bullets lean`} on a vague word — “${filled[0].hit}” in “${snippet(filled[0].b.text)}”. A number says it better.`,
      0.5,
      'writing',
      at(filled[0]?.b)
    )
  }

  /* ------------------------------------------------------------------ score
   * One weighted number for the document, and the same arithmetic per
   * category so a reader can see WHICH of the three is dragging.
   */
  const weighted = (rows: AtsCheck[]) => {
    const total = rows.reduce((s, r) => s + r.weight, 0)
    const earned = rows.reduce((s, r) => s + r.weight * (r.status === 'pass' ? 1 : r.status === 'warn' ? 0.55 : 0), 0)
    return Math.round((earned / Math.max(1, total)) * 100)
  }
  const score = weighted(checks)
  const categoryScores = Object.fromEntries(
    (Object.keys(ATS_CATEGORY_LABELS) as AtsCategory[]).map((k) => [k, weighted(checks.filter((x) => x.category === k))])
  ) as Record<AtsCategory, number>

  // Worst first, and within a severity the heaviest first: the top row of the
  // list is the one worth the reader's next five minutes. Sorted here rather
  // than in the panel so every reader of a report gets the same order.
  const rank: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 }
  checks.sort((a, b) => rank[a.status] - rank[b.status] || b.weight - a.weight)

  // JD analysis
  let jd: JdAnalysis | undefined
  const jdText = doc.jobDescription?.trim()
  if (jdText) {
    const keywords = extractKeywords(jdText, 24)
    const resumeLower = text.toLowerCase()
    const kw: JdKeyword[] = keywords.map((term, i) => ({
      term,
      inResume: resumeLower.includes(term.toLowerCase()),
      importance: keywords.length - i,
    }))
    const matched = kw.filter((k) => k.inResume).map((k) => k.term)
    const missing = kw.filter((k) => !k.inResume).map((k) => k.term)
    jd = {
      keywords: kw,
      matched,
      missing,
      matchRate: kw.length ? Math.round((matched.length / kw.length) * 100) : 0,
    }
  }

  return { score, categoryScores, checks, wordCount, bulletCount: bullets.length, quantifiedCount: quantified, pages, jd }
}
