/**
 * Deterministic ATS analysis. No LLM — instant, private, explainable. Two parts:
 *   1. Structural checks (we GENERATE the document, so these are reliable).
 *   2. Job-description keyword overlap (paste a JD → matched/missing keywords).
 * A transparent, on-device approach in the spirit of open ATS checkers.
 */
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { htmlToText, monthIndex } from '@/lib/utils'
import type { FileFacts } from '@/lib/fileFacts'
import { getTemplate } from '@/templates/registry'
import { sectionHasContent } from '@/lib/sections'
import { visibleDocument } from '@/lib/atsScope'
import { LEGIBLE_BODY_PT } from '@/lib/fitReadout'
import { usesArabicScript } from '@/data/fonts'
import { translate, type Locale, type MsgKey } from '@/i18n/core'

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
 *
 * A fourth, `file`, exists only for a PDF brought in from elsewhere: whether a
 * parser can read the FILE at all - a real text layer, characters that decode,
 * words that are not letter-spaced apart, one reading order. A document made
 * here is exported by this product, so those questions have one answer and
 * asking them would be decoration; a dropped PDF is where they decide
 * everything, and where no score from the words means much until they pass.
 */
export type AtsCategory = 'file' | 'content' | 'writing' | 'format'

export const ATS_CATEGORY_LABELS: Record<AtsCategory, string> = {
  file: 'Can a parser read the file',
  content: 'What is on the page',
  writing: 'How it is written',
  format: 'How it is set',
}

/** The same four questions as dictionary keys, for a panel that draws them. */
export const ATS_CATEGORY_KEYS: Record<AtsCategory, MsgKey> = {
  file: 'ats.cat.file',
  content: 'ats.cat.content',
  writing: 'ats.cat.writing',
  format: 'ats.cat.format',
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
 * which called a one-page resume two pages often enough to be worth fixing.
 */
export interface AtsMeasurement {
  /** Real page count, from the preview's own pagination. */
  pages?: number
  /** The body size the reader actually gets after the fit, in points. */
  bodyPt?: number
  /** A PDF brought from elsewhere, measured as a file. Its presence turns on
   *  the file rules and turns off the ones about this product's own designs. */
  file?: FileFacts
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
 * First-person pronouns, which no resume convention wants: the page is already
 * about the person whose name is at the top, so "I" is a word spent saying
 * nothing.
 *
 * Case is load-bearing and the `i` flag is deliberately absent. "US" is a
 * country, "WE" and "OUR" turn up inside initialisms and all-caps headings,
 * and matching them case-insensitively made this rule fire on resumes that
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
 * Short on purpose. A long list of "words to avoid" fires on every resume and
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
 * past participle. "is/are + -ed" is left out on purpose, because on a resume
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
    // One form for one letter: 'é' typed precomposed (U+00E9) and as e +
    // U+0301 are the same word, so both become the composed form here and in
    // the resume text the keywords are looked for in (analyzeResume).
    .normalize('NFC')
    .toLowerCase()
    // A zero-width non-joiner is a half-space INSIDE a Persian word
    // ("نرم‌افزار" is one word, not two): dropping it keeps the compound whole
    // and makes the word match a job description that writes it either way.
    .replace(/[\u200c\u200d]/g, '')
    // Letters, their combining marks and digits of ANY script: Persian, Arabic
    // and Urdu words are words. Dropping them (the old `[^a-z0-9]`) left a
    // Persian job description with no keywords at all and a silent 0% match.
    // The marks (\p{M}) belong to the letter before them: without them a
    // Devanagari, Thai or vowelled Arabic word, or a Latin word whose accent
    // was typed as a combining mark (U+0308), splits in two at every mark.
    .replace(/[^\p{L}\p{M}\p{N}+#./\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[-./]+|[-./]+$/g, ''))
    .filter(Boolean)

/**
 * Words that carry no keyword in Persian. The English list above does the same
 * job for English; without this one every "و", "در" and "که" of a Persian job
 * description would rank as a keyword and dilute the match rate.
 */
const FA_STOPWORDS = new Set(
  `و در به از که این آن را با برای تا هم یا بر است بود شد شده می‌شود می‌کند کنند کردن دارد داشت داشتن خود ما شما او وی ایشان آنها اینها یک های ها ترین تر نیز بعد قبل بین روی زیر درباره اما اگر چون چه کدام همه هیچ بسیار برخی دیگر باید توان نیست نیستم نیستی نیستیم نیستید نیستند خواهد خواهند شدند گردید گردیده می‌باشد می‌باشند لازم جهت طور مورد طریق باب حسب ضمن وفق علاوه همچنین چنان چطور کجا وقتی هر چند بی`.split(
    /\s+/
  )
)

function isMeaningful(tok: string): boolean {
  if (tok.length < 2) return false
  if (STOPWORDS.has(tok) || FA_STOPWORDS.has(tok)) return false
  if (/^\p{Nd}+$/u.test(tok)) return false
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

/**
 * Present-tense openings, for the rule that a finished job is told in the
 * past. Built from the verbs resume bullets actually open with, in the three
 * shapes a present-tense bullet takes ("Lead", "Leads", "Leading"). Words that
 * open a bullet as a NOUN as often as a verb ("Process", "Report", "Test",
 * "Plan", "Work") are left out: a rule that calls "Process redesign cut…"
 * the wrong tense teaches the author to distrust the rest.
 */
const PRESENT_BASES = `lead manage build develop design create drive own deliver maintain support oversee coordinate implement run mentor handle ensure write analyze analyse prepare conduct collaborate partner define review optimize optimise automate monitor negotiate sell launch ship improve increase reduce grow scale establish direct organize organise teach serve assist`.split(/\s+/)
const DOUBLED: Record<string, string> = { run: 'running', ship: 'shipping' }
const PRESENT_FORMS = new Set(
  PRESENT_BASES.flatMap((v) => [
    v,
    /(s|sh|ch|x|z)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`,
    DOUBLED[v] ?? (v.endsWith('e') && !v.endsWith('ee') ? `${v.slice(0, -1)}ing` : `${v}ing`),
  ])
)

/**
 * Emoji and ornamental symbols typed into the text. Drawn icons are not text
 * and never reach this; these are characters, so a parser meets them - and
 * drops them, or reads a code point in their place. The trademark and
 * copyright signs are exempt: they belong to product names.
 */
const SYMBOL_RE = /[\p{Extended_Pictographic}\u2600-\u27BF\u25A0-\u25FF\u2B00-\u2BFF]/gu
const SYMBOL_OK = new Set(['©', '®', '™'])

/**
 * Personal details that invite bias and that no shortlist needs. Matched as
 * the LABELS they are written under ("Date of Birth:", "Marital Status"), not
 * as bare words, so "married" in a sentence about a merger is not one.
 */
const PERSONAL: readonly [RegExp, string][] = [
  [/\b(date of birth|birth ?date|d\.o\.b\.?|dob\b|born on)/i, 'date of birth'],
  [/\bage\s*[:\-–]\s*\d{2}\b|\b\d{2}\s*(?:years|yrs)\s*old\b/i, 'age'],
  [/\bmarital status\b/i, 'marital status'],
  [/\b(gender|sex)\s*[:\-–]/i, 'gender'],
  [/\breligion\b/i, 'religion'],
  [/\bcaste\b/i, 'caste'],
  [/\bnationality\b/i, 'nationality'],
  [/\b(father|mother|husband|spouse)['’]?s?\s+name\b/i, "a parent's or spouse's name"],
  [/\bpassport\s*(?:no|number|#)/i, 'passport number'],
]

/** Headings every parser files. A section under any other name may be filed nowhere. */
const KNOWN_HEADING =
  /experience|employment|work|career|project|education|academic|qualification|skill|competenc|certif|licen[cs]e|award|honou?r|achievement|accomplishment|publication|volunteer|language|interest|hobb|reference|course|training|summary|profile|objective|about|activit|leadership|research|internship|personal|declaration|strength|extra|patent|speaking|talk|membership|affiliation|portfolio|contact/i

/** Absolute month of a date, reading a bare year as its first (or last) month. */
const monthOf = (d: string | undefined, end: boolean): number | null => {
  const m = monthIndex(d)
  if (m != null) return m
  const y = (d ?? '').trim().match(/^(\d{4})$/)
  return y ? parseInt(y[1], 10) * 12 + (end ? 11 : 0) : null
}
const isOpen = (d?: string) => !(d ?? '').trim() || /present|current|now|ongoing|till date|to date/i.test(d ?? '')

const PAPER = [
  { name: 'A4', w: 595.3, h: 841.9 },
  { name: 'US Letter', w: 612, h: 792 },
]

export function analyzeResume(
  input: ResumeDocument,
  measured: AtsMeasurement = {},
  locale: Locale = 'en'
): AtsReport {
  // Every sentence below is a key in the interface's dictionary, filled with
  // the figures the rule measured. A sentence assembled here in English could
  // not be translated later: the numbers sit inside it, and Persian puts them
  // in a different order.
  const tx = (key: MsgKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
  // Every rule below reads the document the PAGE shows, not the one the store
  // holds. Hidden sections are dropped once, here, so no individual check has
  // to remember to ask - and so the score, the checks, the counts and the JD
  // match are all claims about the same resume the export produces.
  const doc = visibleDocument(input)
  const c = doc.content
  const text = extractResumeText(doc)
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const bullets = allBullets(c)
  // A line in Arabic script cannot be judged by the English word lists below
  // (verbs, pronouns, filler, passive, buzzwords, tense): they would pass it
  // by accident, or fail it for not starting with an English verb. So those
  // rules stand aside for that line alone - each bullet, and the summary, is
  // the unit they already read - and every English line beside it is still
  // judged. A Persian name on an English resume therefore changes nothing.
  const wordListBullets = bullets.filter((b) => !usesArabicScript(b.text))
  // A number is a number in any script: Persian digits (۱۲) and the Persian
  // percent sign (٪) are figures on the page, and were not counted before.
  const unquantified = bullets.filter((b) => !/\p{Nd}|[%٪$€£]/u.test(b.text))
  const quantified = bullets.length - unquantified.length
  const tpl = getTemplate(doc.metadata.template)
  // A PDF from elsewhere: its file is judged, and the rules about this
  // product's own designs (which one it is set in) stand aside.
  const file = measured.file

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
    tx('ats.r.contact.label'),
    hasEmail && hasPhone ? 'pass' : hasEmail || hasPhone ? 'warn' : 'fail',
    hasEmail && hasPhone ? tx('ats.r.contact.ok') : tx('ats.r.contact.missing'),
    2,
    'content'
  )

  push(
    'summary',
    tx('ats.r.summary.label'),
    sectionHasContent('summary', c) ? 'pass' : 'warn',
    sectionHasContent('summary', c) ? tx('ats.r.summary.ok') : tx('ats.r.summary.missing'),
    1,
    'content'
  )

  push(
    'work',
    tx('ats.r.work.label'),
    c.work.length ? 'pass' : 'fail',
    c.work.length ? tx('ats.r.work.ok', { n: c.work.length }) : tx('ats.r.work.missing'),
    2,
    'content'
  )
  push(
    'education',
    tx('ats.r.education.label'),
    c.education.length ? 'pass' : 'warn',
    c.education.length ? tx('ats.r.education.ok') : tx('ats.r.education.missing'),
    1,
    'content'
  )
  push(
    'skills',
    tx('ats.r.skills.label'),
    c.skills.length ? 'pass' : 'warn',
    c.skills.length ? tx('ats.r.skills.ok') : tx('ats.r.skills.missing'),
    1.5,
    'content'
  )

  // quantified achievements
  const quantRate = bullets.length ? quantified / bullets.length : 0
  push(
    'quantified',
    tx('ats.r.quantified.label'),
    bullets.length === 0 ? 'warn' : quantRate >= 0.4 ? 'pass' : quantRate >= 0.2 ? 'warn' : 'fail',
    bullets.length === 0
      ? tx('ats.r.quantified.empty')
      : tx('ats.r.quantified.some', { done: quantified, total: bullets.length }),
    1.5,
    'writing',
    at(unquantified[0])
  )

  // The English word lists stand aside for a line in Arabic script, and one
  // row says why: a silently passing rule is worse than an absent one.
  const summaryText = htmlToText(c.basics.summary ?? '')
  // The summary is one unit to the word lists, like a bullet.
  const wordListSummary = usesArabicScript(summaryText) ? '' : summaryText
  if (wordListBullets.length < bullets.length || wordListSummary !== summaryText) {
    push(
      'language',
      tx('ats.r.language.label'),
      'warn',
      tx('ats.r.language.detail'),
      0,
      'writing'
    )
  }

  // action verbs
  const weak = wordListBullets.filter((b) => WEAK_STARTS.has(b.text.trim().split(/\s+/)[0]?.toLowerCase() ?? ''))
  const strongStarts = wordListBullets.filter((b) => ACTION_VERBS.has(b.text.trim().split(/\s+/)[0]?.toLowerCase() ?? '')).length
  if (wordListBullets.length) {
    push(
      'verbs',
      tx('ats.r.verbs.label'),
      weak.length === 0 ? 'pass' : weak.length <= 2 ? 'warn' : 'fail',
      weak.length === 0
        ? tx('ats.r.verbs.ok', { n: strongStarts })
        : tx('ats.r.verbs.weak', { n: weak.length }),
      1,
      'writing',
      at(weak[0])
    )
  }

  // length
  const idealLen = wordCount >= 350 && wordCount <= 850
  push(
    'length',
    tx('ats.r.length.label'),
    idealLen ? 'pass' : wordCount < 200 ? 'fail' : 'warn',
    tx('ats.r.length.detail', { n: wordCount }),
    1,
    'content'
  )

  // ATS-safe template
  if (!file) push(
    'template',
    tx('ats.r.template.label'),
    tpl.atsSafe ? 'pass' : 'warn',
    tpl.atsSafe
      ? tx('ats.r.template.ok', { name: tpl.name })
      : tx('ats.r.template.weak', { name: tpl.name }),
    1.5,
    'format'
  )

  // photo warning (some ATS choke on images / headshots)
  if (file ? file.photo : doc.metadata.layout.showPhoto && c.basics.image) {
    push('photo', tx('ats.r.photo.label'), 'warn', tx('ats.r.photo.detail'), 0.5, 'format')
  }

  // custom (non-standard) section names
  const renamed = Object.keys(doc.metadata.layout.headings ?? {}).length
  if (renamed) {
    push('headings', tx('ats.r.renamed.label'), 'warn', tx('ats.r.renamed.detail'), 0.5, 'format')
  }

  /* ---------------------------------------------------------------- format
   * Two rules about the PAGE rather than the words. This product renders the
   * document itself, so both can be answered exactly instead of estimated:
   * the paginator counts the pages, and Magic fit knows the size the body
   * text actually came out at. `measured` carries them when the preview has
   * run; the fallbacks below are what this used to do on its own.
   */
  const estimatedPages = Math.max(1, Math.round(wordCount / 520) || 1)
  const pages = measured.pages ?? file?.pageCount ?? estimatedPages
  // Two pages are right for a long career and wrong for a short one. The
  // signal is the history, not the word count: three roles and a decade is a
  // two-page resume; one role over two pages is padding.
  const longCareer = c.work.length >= 4 || wordCount > 750
  push(
    'pages',
    tx('ats.r.pages.label'),
    pages === 1 ? 'pass' : pages === 2 ? (longCareer ? 'pass' : 'warn') : 'fail',
    pages === 1
      ? tx('ats.r.pages.one')
      : pages === 2
        ? longCareer
          ? tx('ats.r.pages.twoEarned')
          : tx('ats.r.pages.twoShort')
        : tx('ats.r.pages.many', { n: pages }),
    1.5,
    'format'
  )

  const bodyPt = measured.bodyPt ?? file?.bodyPt ?? doc.metadata.typography.fontSize
  const bodyRounded = Math.round(bodyPt * 10) / 10
  push(
    'bodySize',
    tx('ats.r.bodySize.label'),
    bodyPt >= 9.5 && bodyPt <= 12 ? 'pass' : bodyPt >= LEGIBLE_BODY_PT ? 'warn' : 'fail',
    bodyPt >= 9.5 && bodyPt <= 12
      ? tx('ats.r.bodySize.ok', { pt: bodyRounded })
      : bodyPt < LEGIBLE_BODY_PT
        ? tx('ats.r.bodySize.small', { pt: bodyRounded })
        : tx('ats.r.bodySize.edge', { pt: bodyRounded }),
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
    const roleName = worst?.w.position || tx('ats.r.bulletsPerRole.role')
    push(
      'bulletsPerRole',
      tx('ats.r.bulletsPerRole.label'),
      roleBulletProblems.length === 0 ? 'pass' : roleBulletProblems.length <= 1 ? 'warn' : 'fail',
      roleBulletProblems.length === 0
        ? tx('ats.r.bulletsPerRole.ok')
        : worst && worst.n < 2
          ? tx(worst.n === 0 ? 'ats.r.bulletsPerRole.none' : 'ats.r.bulletsPerRole.one', { role: roleName })
          : tx('ats.r.bulletsPerRole.many', { role: roleName, n: worst?.n ?? 0 }),
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
      tx('ats.r.dates.label'),
      undated.length === 0 ? 'pass' : 'fail',
      undated.length === 0 ? tx('ats.r.dates.ok') : tx('ats.r.dates.some', { n: undated.length }),
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
      tx('ats.r.entryLocation.label'),
      located === c.work.length ? 'pass' : located >= c.work.length / 2 ? 'warn' : 'fail',
      located === c.work.length
        ? tx('ats.r.entryLocation.ok')
        : tx('ats.r.entryLocation.some', { missing: c.work.length - located, total: c.work.length }),
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
      tx('ats.r.summaryLength.label'),
      summaryWords >= 25 && summaryWords <= 65 ? 'pass' : summaryWords < 15 || summaryWords > 95 ? 'fail' : 'warn',
      summaryWords >= 25 && summaryWords <= 65
        ? tx('ats.r.summaryLength.ok', { n: summaryWords })
        : summaryWords < 25
          ? tx('ats.r.summaryLength.short', { n: summaryWords })
          : tx('ats.r.summaryLength.long', { n: summaryWords }),
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
      tx('ats.r.skillGroups.label'),
      grouped ? 'pass' : 'warn',
      grouped
        ? tx('ats.r.skillGroups.ok', { n: c.skills.length })
        : namedGroups < c.skills.length
          ? tx('ats.r.skillGroups.unnamed')
          : tx('ats.r.skillGroups.big', { n: biggestGroup }),
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
  const linkedin = c.basics.profiles?.find((pr) => /linkedin/i.test(`${pr.network} ${pr.url} ${pr.username}`))
  const linkedinUrl = linkedin?.url ?? ''
  const shortForm = /linkedin\.com\/in\/[^/?#]+\/?$/i.test(linkedinUrl)
  push(
    'linkedin',
    tx('ats.r.linkedin.label'),
    !linkedin ? 'warn' : shortForm ? 'pass' : 'warn',
    !linkedin
      ? tx('ats.r.linkedin.none')
      : !linkedinUrl.trim()
        ? tx('ats.r.linkedin.notLink')
        : shortForm
          ? tx('ats.r.linkedin.short')
          : tx('ats.r.linkedin.trim'),
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
      tx('ats.r.bulletDepth.label'),
      stubs.length === 0 ? 'pass' : stubs.length <= 2 ? 'warn' : 'fail',
      stubs.length === 0
        ? tx('ats.r.bulletDepth.ok')
        : tx('ats.r.bulletDepth.short', { n: stubs.length, text: snippet(stubs[0].text, 48) }),
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
      tx('ats.r.punctuation.label'),
      consistent ? 'pass' : ended > bullets.length * 0.8 || ended < bullets.length * 0.2 ? 'warn' : 'fail',
      consistent
        ? ended === 0
          ? tx('ats.r.punctuation.okNone')
          : tx('ats.r.punctuation.okAll')
        : tx('ats.r.punctuation.mixed', { ended, total: bullets.length }),
      0.5,
      'writing',
      consistent ? undefined : at(odd[0])
    )
  }

  // Pronouns. The summary counts too — it is the one place on a resume where
  // "I" gets written by habit, and it is the first thing read.
  // Whichever comes FIRST in the line, so the quoted word is the one the
  // reader's eye lands on rather than whichever regex happened to run first.
  const pronounHit = (t: string) => {
    const a = t.match(PRONOUN_RE)
    const b = t.match(BARE_I_RE)
    if (a && b) return (a.index ?? 0) <= (b.index ?? 0) ? a[0].trim() : 'I'
    if (a) return a[0].trim()
    return b ? 'I' : undefined
  }
  const pronounBullets = wordListBullets.filter((b) => !!pronounHit(b.text))
  const pronounInSummary = !!pronounHit(wordListSummary)
  const pronouns = pronounBullets.length + (pronounInSummary ? 1 : 0)
  if (wordListBullets.length || wordListSummary) {
    const first = pronounBullets[0]
    const shown = first ? pronounHit(first.text) : pronounHit(wordListSummary)
    push(
      'pronouns',
      tx('ats.r.pronouns.label'),
      pronouns === 0 ? 'pass' : pronouns <= 2 ? 'warn' : 'fail',
      pronouns === 0
        ? tx('ats.r.pronouns.ok')
        : tx(pronouns === 1 ? 'ats.r.pronouns.one' : 'ats.r.pronouns.some', {
            n: pronouns,
            word: shown ? tx('ats.r.pronouns.word', { word: shown }) : '',
            note: pronounInSummary && !first ? tx('ats.r.pronouns.note') : '',
          }),
      0.75,
      'writing',
      at(first) ?? (pronounInSummary ? { section: 'summary' } : undefined)
    )
  }

  // Buzzwords: the claims that stand in for the evidence.
  const buzzy = wordListBullets
    .map((b) => ({ b, hit: firstTerm(b.text, BUZZWORDS) }))
    .filter((x): x is { b: BulletRef; hit: string } => !!x.hit)
  const buzzInSummary = firstTerm(wordListSummary, BUZZWORDS)
  const buzzCount = buzzy.length + (buzzInSummary ? 1 : 0)
  if (wordListBullets.length || wordListSummary) {
    const hit = buzzy[0]?.hit ?? buzzInSummary
    push(
      'buzzwords',
      tx('ats.r.buzzwords.label'),
      buzzCount === 0 ? 'pass' : buzzCount <= 2 ? 'warn' : 'fail',
      buzzCount === 0
        ? tx('ats.r.buzzwords.ok')
        : tx('ats.r.buzzwords.some', {
            word: hit,
            more: buzzCount > 1 ? tx('ats.r.buzzwords.more', { n: buzzCount - 1 }) : '',
          }),
      0.5,
      'writing',
      at(buzzy[0]?.b) ?? (buzzInSummary ? { section: 'summary' } : undefined)
    )
  }

  // Passive voice, in the narrow form the regex above can actually see.
  const passive = wordListBullets.filter((b) => PASSIVE_RE.test(openingClause(b.text)))
  if (wordListBullets.length) {
    push(
      'passiveVoice',
      tx('ats.r.passive.label'),
      passive.length === 0 ? 'pass' : passive.length <= 2 ? 'warn' : 'fail',
      passive.length === 0
        ? tx('ats.r.passive.ok')
        : tx(passive.length === 1 ? 'ats.r.passive.one' : 'ats.r.passive.some', {
            n: passive.length,
            text: openingClause(passive[0].text).match(PASSIVE_RE)?.[0] ?? '',
          }),
      0.5,
      'writing',
      at(passive[0])
    )
  }

  // Filler.
  const filled = wordListBullets
    .map((b) => ({ b, hit: firstTerm(b.text, FILLER) }))
    .filter((x): x is { b: BulletRef; hit: string } => !!x.hit)
  if (wordListBullets.length) {
    push(
      'filler',
      tx('ats.r.filler.label'),
      filled.length === 0 ? 'pass' : filled.length <= 2 ? 'warn' : 'fail',
      filled.length === 0
        ? tx('ats.r.filler.ok')
        : tx(filled.length === 1 ? 'ats.r.filler.one' : 'ats.r.filler.some', {
            n: filled.length,
            word: filled[0].hit,
            text: snippet(filled[0].b.text),
          }),
      0.5,
      'writing',
      at(filled[0]?.b)
    )
  }

  /* ---------------------------------------------------------- more content */

  // Gaps between roles. Six months is the line: shorter is a job search,
  // longer is a question a reader will ask. Study, volunteering or a
  // career-break entry that covers the gap answers it, so it is not raised.
  const roles = c.work
    .map((w, i) => ({ i, w, a: monthOf(w.startDate, false), b: isOpen(w.endDate) ? Infinity : monthOf(w.endDate, true) }))
    .filter((r): r is typeof r & { a: number; b: number } => r.a != null && r.b != null)
    .sort((x, y) => x.a - y.a)
  const covers = [...c.education, ...c.volunteer].map((e) => ({
    a: monthOf(e.startDate, false),
    b: isOpen(e.endDate) ? Infinity : monthOf(e.endDate, true),
  }))
  const gaps: { months: number; before: string; after: string; entry: number }[] = []
  let reach = roles[0]?.b ?? 0
  let reachTitle = roles[0]?.w.position || roles[0]?.w.name || ''
  // The longest run of months in (from, to) that nothing covers. Study that
  // starts two months after a job ends still explains the three years after.
  const bare = (from: number, to: number) => {
    let run = 0
    let best = 0
    for (let m = from; m <= to; m++) {
      const covered = covers.some((k) => k.a != null && k.b != null && k.a <= m && k.b >= m)
      run = covered ? 0 : run + 1
      best = Math.max(best, run)
    }
    return best
  }
  for (const r of roles.slice(1)) {
    const months = r.a - reach - 1
    const uncovered = months > 6 && months < 600 ? bare(reach + 1, r.a - 1) : 0
    if (uncovered > 6) gaps.push({ months: uncovered, before: reachTitle, after: r.w.position || r.w.name || 'the next role', entry: r.i })
    if (r.b > reach) {
      reach = r.b
      reachTitle = r.w.position || r.w.name || ''
    }
  }
  if (roles.length >= 2) {
    const g = gaps[0]
    push(
      'gaps',
      tx('ats.r.gaps.label'),
      gaps.length === 0 ? 'pass' : 'warn',
      !g
        ? tx('ats.r.gaps.ok')
        : tx('ats.r.gaps.some', {
            months: g.months,
            before: g.before,
            after: g.after,
            more: gaps.length > 1 ? tx('ats.r.gaps.more', { n: gaps.length - 1 }) : '',
          }),
      0.75,
      'content',
      g ? { section: 'work', entry: g.entry } : undefined
    )
  }

  // Personal details that invite bias. A warning, never a failure: some
  // employers (in India and the Gulf among them) still ask for them.
  const personalSources: { text: string; where?: AtsCheck['where'] }[] = [
    { text: `${c.basics.label ?? ''} ${summaryText}`, where: { section: 'summary' } },
    ...c.custom.map((sec) => ({
      text: [sec.name, ...sec.items.flatMap((it) => [it.name, it.subtitle, htmlToText(it.summary), ...(it.highlights ?? []).map(htmlToText)])].join(' \n '),
      where: { section: `custom-${sec.id}` },
    })),
  ]
  const personal = new Set<string>()
  let personalWhere: AtsCheck['where']
  for (const src of personalSources) {
    for (const [re, name] of PERSONAL) {
      if (re.test(src.text)) {
        personal.add(name)
        personalWhere ??= src.where
      }
    }
  }
  push(
    'personal',
    tx('ats.r.personal.label'),
    personal.size ? 'warn' : 'pass',
    personal.size
      ? tx('ats.r.personal.some', { list: [...personal].join(', ') })
      : tx('ats.r.personal.ok'),
    0.75,
    'content',
    personal.size ? personalWhere : undefined
  )

  // The declaration that closes many resumes in India ("I hereby declare…").
  const declaration = c.custom.find((sec) =>
    /\bdeclaration\b|hereby declare/i.test([sec.name, ...sec.items.map((it) => `${it.name} ${htmlToText(it.summary)}`)].join(' '))
  )
  if (declaration) {
    push(
      'declaration',
      tx('ats.r.declaration.label'),
      'warn',
      tx('ats.r.declaration.detail'),
      0.5,
      'content',
      { section: `custom-${declaration.id}` }
    )
  }

  /* ----------------------------------------------------------- more writing */

  // A finished job is told in the past tense.
  const pastRoles = new Set(c.work.map((w, i) => (!isOpen(w.endDate) ? i : -1)).filter((i) => i >= 0))
  const pastBullets = wordListBullets.filter((b) => b.section === 'work' && pastRoles.has(b.entry))
  const firstWord = (t: string) => (t.trim().split(/\s+/)[0] ?? '').replace(/[^A-Za-z]/g, '').toLowerCase()
  const presentTense = pastBullets.filter((b) => PRESENT_FORMS.has(firstWord(b.text)))
  if (pastBullets.length) {
    const b = presentTense[0]
    push(
      'tense',
      tx('ats.r.tense.label'),
      presentTense.length === 0 ? 'pass' : presentTense.length <= 2 ? 'warn' : 'fail',
      !b
        ? tx('ats.r.tense.ok')
        : tx(presentTense.length === 1 ? 'ats.r.tense.one' : 'ats.r.tense.some', {
            n: presentTense.length,
            text: snippet(b.text, 40),
          }),
      0.75,
      'writing',
      at(b)
    )
  }

  // Past two lines a bullet stops being skimmed. Two lines of body text on a
  // one-column page hold about 190 characters; 200 leaves room for a narrow face.
  const long = bullets.filter((b) => b.text.trim().length > 200)
  if (bullets.length) {
    push(
      'bulletLength',
      tx('ats.r.bulletLength.label'),
      long.length === 0 ? 'pass' : long.length <= 2 ? 'warn' : 'fail',
      long.length === 0
        ? tx('ats.r.bulletLength.ok')
        : tx(long.length === 1 ? 'ats.r.bulletLength.one' : 'ats.r.bulletLength.some', {
            n: long.length,
            text: snippet(long[0].text),
          }),
      0.75,
      'writing',
      at(long[0])
    )
  }

  // Emoji and ornaments typed as text.
  const symbolText = `${c.basics.name} ${c.basics.label ?? ''} ${c.basics.phone ?? ''} ${c.basics.email ?? ''} ${text}`
  const symbols = [...new Set((symbolText.match(SYMBOL_RE) ?? []).filter((ch) => !SYMBOL_OK.has(ch)))]
  push(
    'symbols',
    tx('ats.r.symbols.label'),
    symbols.length === 0 ? 'pass' : symbols.length <= 2 ? 'warn' : 'fail',
    symbols.length === 0
      ? tx('ats.r.symbols.ok')
      : tx('ats.r.symbols.some', {
          list: symbols.slice(0, 4).join(' '),
          more: symbols.length > 4 ? tx('ats.r.symbols.more') : '',
        }),
    0.5,
    'format'
  )

  /* ------------------------------------------------------------------ file
   * Only for a PDF brought from elsewhere. Heavier than any rule about the
   * words, because a file a parser cannot read hands it no words at all.
   */
  if (file) {
    const scanned = file.scannedPages
    const allScanned = scanned.length > 0 && scanned.length >= file.pageCount
    push(
      'textLayer',
      tx('ats.r.textLayer.label'),
      scanned.length === 0 ? 'pass' : 'fail',
      scanned.length === 0
        ? tx('ats.r.textLayer.ok')
        : allScanned
          ? tx('ats.r.textLayer.all')
          : tx('ats.r.textLayer.some', { pages: scanned.join('، ') }),
      3,
      'file'
    )

    if (!allScanned && file.textChars > 0) {
      const share = file.unmappedChars / file.textChars
      push(
        'characters',
        tx('ats.r.characters.label'),
        file.unmappedChars === 0 ? 'pass' : share >= 0.05 ? 'fail' : 'warn',
        file.unmappedChars === 0
          ? tx('ats.r.characters.ok')
          : share >= 0.05
            ? tx('ats.r.characters.many', { bad: file.unmappedChars, total: file.textChars })
            : tx('ats.r.characters.few', { n: file.unmappedChars }),
        2,
        'file'
      )
    }

    const tr = file.tracked[0]
    push(
      'spacing',
      tx('ats.r.spacing.label'),
      file.tracked.length === 0 ? 'pass' : file.tracked.length <= 2 ? 'warn' : 'fail',
      !tr
        ? tx('ats.r.spacing.ok')
        : tx('ats.r.spacing.some', {
            raw: tr.raw,
            text: tr.text,
            more: file.tracked.length > 1 ? tx('ats.r.spacing.more', { n: file.tracked.length }) : '',
          }),
      1.25,
      'file'
    )

    const ex = file.acrossExample
    push(
      'readingOrder',
      tx('ats.r.readingOrder.label'),
      file.twoColumn ? 'warn' : 'pass',
      !file.twoColumn
        ? tx('ats.r.readingOrder.ok')
        : tx('ats.r.readingOrder.two', {
            example: ex ? tx('ats.r.readingOrder.example', { left: ex.left, right: ex.right }) : '',
          }),
      1.5,
      'file'
    )

    if (file.contact !== 'missing') {
      push(
        'contactPlace',
        tx('ats.r.contactPlace.label'),
        file.contact === 'top' ? 'pass' : 'warn',
        file.contact === 'top'
          ? tx('ats.r.contactPlace.top')
          : file.contact === 'sidebar'
            ? tx('ats.r.contactPlace.sidebar')
            : tx('ats.r.contactPlace.low'),
        1,
        'file'
      )
    }

    const odd = file.pageSizes.find((ps) => !PAPER.some((pp) => Math.abs(pp.w - ps.w) < 4 && Math.abs(pp.h - ps.h) < 4))
    const paper = PAPER.find((pp) => file.pageSizes[0] && Math.abs(pp.w - file.pageSizes[0].w) < 4 && Math.abs(pp.h - file.pageSizes[0].h) < 4)
    if (file.pageSizes.length) {
      const mm = (pt: number) => Math.round((pt / 72) * 25.4)
      push(
        'pageSize',
        tx('ats.r.pageSize.label'),
        odd ? 'warn' : 'pass',
        odd
          ? tx('ats.r.pageSize.odd', { w: mm(odd.w), h: mm(odd.h) })
          : tx('ats.r.pageSize.ok', { paper: paper?.name ?? tx('ats.r.pageSize.standard') }),
        0.75,
        'file'
      )
    }

    const base = file.fileName.replace(/\.pdf$/i, '').trim()
    if (base) {
      const nameTokens = (c.basics.name ?? '').toLowerCase().split(/\s+/).filter((t) => t.length >= 3)
      const named = nameTokens.some((t) => base.toLowerCase().includes(t))
      const generic = /^(document|untitled|scan|img|image|file|download|resume|cv|my ?resume|new|final|doc)?[\s_\-.\d()]*$/i.test(base) || /\b(final|draft|copy|v\d+|new)\b|\(\d+\)/i.test(base)
      push(
        'fileName',
        tx('ats.r.fileName.label'),
        named && !generic ? 'pass' : 'warn',
        named && !generic
          ? tx('ats.r.fileName.ok', { name: file.fileName })
          : tx(named ? 'ats.r.fileName.working' : 'ats.r.fileName.anonymous', { name: file.fileName }),
        0.5,
        'file'
      )
    }

    const unknown = c.custom.filter((sec) => sec.items.length && !KNOWN_HEADING.test(sec.name))
    if (unknown.length) {
      push(
        'headings',
        tx('ats.r.unknownHeadings.label'),
        'warn',
        tx('ats.r.unknownHeadings.some', {
          name: unknown[0].name,
          more: unknown.length > 1 ? tx('ats.r.unknownHeadings.more', { n: unknown.length - 1 }) : '',
        }),
        0.75,
        'format',
        { section: `custom-${unknown[0].id}` }
      )
    }
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
    // Both sides in the composed form (tokenize does the same to the job
    // description): a decomposed accent must not hide a matching word.
    const resumeLower = text.normalize('NFC').toLowerCase()
    const kw: JdKeyword[] = keywords.map((term, i) => ({
      term,
      inResume: resumeLower.includes(term.normalize('NFC').toLowerCase()),
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
