/**
 * Deterministic, GenAI-free field extraction over the layout graph → CVAurum's
 * ResumeContent. v1 targets clean single/standard-column resumes: header
 * (name + international contacts + links), Summary, Experience, Education,
 * Skills, Projects. Every field is regex/lexicon/geometry-derived — no network,
 * no model. v2 adds OCR + multi-column reading order on the same graph.
 */
import { uid } from '@/lib/utils'
import type { ResumeContent } from '@/types/document'
import type { Line, LayoutGraph } from './layoutGraph'

/* ----------------------------------------------------------- section ontology */

// Section heading phrases, anchored to the START of a line so a heading is
// recognised even when trailing text follows (e.g. a template's
// "WORK EXPERIENCE (your most impressive roles)" or "SKILLS: ...").
// NB: inter-word gaps use \s* (not \s+) because some PDFs drop the space between
// words on extraction ("WORK EXPERIENCE" → "WORKEXPERIENCE", "TECHNICAL SKILLS"
// → "TECHNICALSKILLS"); headings must still be recognised.
const HEAD_PHRASES: { key: string; re: RegExp }[] = [
  {
    key: 'work',
    re: /^(work\s*experience|professional\s*experience|employment(\s*history)?|work\s*history|experience|career(\s*history)?)\b/i,
  },
  { key: 'education', re: /^(education|academic\b.*|qualifications?)\b/i },
  {
    key: 'skills',
    re: /^(technical\s*skills|core\s*(skills|competenc\w*)|key\s*skills|skills(\s*[,&].*)?|technolog\w*|tech(nical)?\s*stack|expertise|areas\s*of\s*expertise|competenc\w*|proficienc\w*)\b/i,
  },
  { key: 'projects', re: /^(projects?|personal\s*projects|key\s*projects|selected\s*projects)\b/i },
  { key: 'certificates', re: /^(certifications?(\s*[,&].*)?|licen[sc]es?|certificates?)\b/i },
  { key: 'awards', re: /^(awards?(\s*[,&].*)?|honou?rs|achievements|accomplishments)\b/i },
  { key: 'publications', re: /^(publications?|research)\b/i },
  { key: 'volunteer', re: /^(volunteer\w*|community\s*service)\b/i },
  { key: 'languages', re: /^languages?\b/i },
  { key: 'interests', re: /^(interests|hobbies)\b/i },
  { key: 'references', re: /^(references?|referees?)\b/i },
  { key: 'summary', re: /^(summary|professional\s*summary|profile|objective|career\s*objective|about(\s*me)?)\b/i },
]

interface Section {
  key: string // canonical key, or 'header' for the top block
  title: string
  lines: Line[]
}

// Contained-keyword fallback for short heading-like lines whose keyword isn't at
// the very start ("Relevant Experience", "Core Competencies", "Areas of Expertise").
const CONTAIN_KEYWORDS: { key: string; re: RegExp }[] = [
  { key: 'work', re: /\b(experience|employment|work history)\b/i },
  { key: 'education', re: /\beducation\b/i },
  { key: 'skills', re: /\b(skills|competenc\w*|expertise|technolog\w*|proficienc\w*)\b/i },
  { key: 'projects', re: /\bprojects?\b/i },
  { key: 'certificates', re: /\b(certificat\w*|licen[sc]e)\b/i },
  { key: 'awards', re: /\b(awards?|honou?rs|accomplishments)\b/i },
  { key: 'publications', re: /\bpublications?\b/i },
  { key: 'languages', re: /\blanguages?\b/i },
  { key: 'interests', re: /\b(interests|hobbies)\b/i },
  { key: 'references', re: /\b(references?|referees?)\b/i },
  { key: 'summary', re: /\b(summary|objective)\b/i },
]

// Words that qualify a heading without changing its subject.
const HEAD_FILLER =
  /^(and|or|the|of|my|core|key|other|additional|areas?|technical|professional|relevant|selected|main|primary|general)$/i

/** Is everything past the matched heading phrase still the SAME heading?
 *  A verbose label ("Technical Skills & Core Competencies", "Skills & Areas
 *  of Expertise") names one section; every leftover word is either a
 *  connector or that same section's own vocabulary. Judging such a label by
 *  its leftover LENGTH alone rejected it, and the section then never opened:
 *  eight templates whose headings are sized rather than bolded or capitalised
 *  imported skills 0/70, with the orphaned content corrupting the section
 *  above it. */
function sameTopicRemainder(leftover: string, key: string): boolean {
  const words = leftover.split(/[^A-Za-z]+/).filter(Boolean)
  if (!words.length) return true
  const own = CONTAIN_KEYWORDS.find((k) => k.key === key)?.re
  if (!own) return false
  return words.every((w) => HEAD_FILLER.test(w) || own.test(w))
}

/** Does the line BEGIN with several capital letters? (e.g. "WORK EXPERIENCE") */
const startsAllCaps = (t: string): boolean => /^[A-Z][A-Z][A-Z &/,'’-]+/.test(t)

/**
 * A line is a section heading when it starts with a known section keyword AND is
 * set off as a heading — either a short, styled line (caps / bold / larger), OR
 * a line whose leading words are ALL-CAPS (which catches headings that carry
 * trailing text and headings on PDFs where pdf.js loses the bold flag).
 * Names, job titles and company names (no leading keyword) stay as content.
 */
function headingKey(line: Line, g: LayoutGraph, styledHeadingSeen = false, plainHeadingHeight = 0): string | null {
  const t = line.text.replace(/[:•·]\s*$/, '').trim()
  if (/@|https?:|\.com\b/.test(t)) return null // contact lines aren't headings
  const words = t.split(/\s+/)
  const styled = line.upper || line.bold || line.height >= g.bodySize * 1.14
  // Tier 0 — the line is essentially JUST a section name (a plain heading), so
  // accept it even when pdf.js gives no bold flag and it isn't all-caps —
  // UNLESS this document has already established its heading style
  // (2026-08-16): with STYLED headings seen, a plain-case phrase line is
  // body content (aurum's plain "Languages" skill-GROUP label split the
  // skills section); with only PLAIN headings seen, the candidate must at
  // least match their height (technical's headings are lowercase and just
  // 0.6px taller than body — its 9.3px group label must not outrank its
  // 9.9px headings).
  const tier0Allowed =
    styled || (!styledHeadingSeen && (plainHeadingHeight === 0 || line.height >= plainHeadingHeight - 0.35))
  // The word cap is what keeps prose out of Tier 0, so it stays tight; 6 is
  // the longest real heading label measured across the 52 templates
  // ("Technical Skills & Core Competencies" is 5). A sentence that merely
  // opens with a section word ("Experience with modern data platforms and
  // tooling") runs past it, and the remainder test rejects the rest.
  if (words.length <= 6 && !/\d/.test(t) && tier0Allowed) {
    for (const { key, re } of HEAD_PHRASES) {
      if (!re.test(t)) continue
      const leftover = t.replace(re, '')
      if (leftover.replace(/[^a-z]/gi, '').length <= 6) return key
      if (sameTopicRemainder(leftover, key)) return key
    }
  }
  const shortStyled =
    words.length <= 5 && t.length <= 46 && (line.upper || line.bold || line.height >= g.bodySize * 1.14)
  const caps = startsAllCaps(t)
  if (!shortStyled && !caps) return null
  // 1) keyword at the start (handles trailing text + all-caps headings)
  for (const { key, re } of HEAD_PHRASES) if (re.test(t)) return key
  // 2) short heading-like line with the keyword elsewhere ("Relevant Experience")
  if (shortStyled || (caps && words.length <= 6)) {
    for (const { key, re } of CONTAIN_KEYWORDS) if (re.test(t)) return key
  }
  return null
}

/** The leading run of ALL-CAPS words, which on a side-label template is the
 *  section's own label sitting left of the body on the same baseline.
 *  Two letters minimum, so a single-letter logo glyph ("T Data Analyst")
 *  is not mistaken for part of the label. */
function leadingCapsRun(text: string): string {
  const toks = text.trim().split(/\s+/)
  const run: string[] = []
  for (const tok of toks) {
    if (!/^[A-Z]{2,}[A-Z.'’&-]*$/.test(tok)) break
    run.push(tok)
    if (run.length >= 3) break
  }
  return run.join(' ')
}

/** Splits a merged line at a character offset, keeping item geometry aligned
 *  so run-based consumers (chip rows) still work on the remainder. */
function lineAfter(line: Line, prefixLen: number): Line {
  let cum = 0
  let idx = 0
  for (; idx < line.items.length && cum < prefixLen; idx++) cum += line.items[idx].str.length + 1
  const items = line.items.slice(idx)
  const text = line.text.trim().slice(prefixLen).replace(/^[\s:•·—–-]+/, '')
  return { ...line, text, items, x: items[0]?.x ?? line.x }
}

/** A section label that WRAPS onto two lines. On a side-label template each
 *  half merges into a different content line ("PROFESSIONAL  T Data Analyst
 *  ..." / "EXPERIENCE  Tata Consultancy Services ..."), so only the second
 *  half matched a heading and the section opened one line late, stranding
 *  the first entry's title and dates in the section above. Where the label
 *  stands alone the opposite happened: sapphire's "TECHNICAL SKILLS &" /
 *  "CORE COMPETENCIES" both matched, opening the same section twice.
 *
 *  Rewrites such a pair into one heading line followed by whatever content
 *  was merged into either half. */
function unwrapWrappedLabels(lines: Line[], g: LayoutGraph): Line[] {
  const out: Line[] = []
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i]
    const b = lines[i + 1]
    const runA = b ? leadingCapsRun(a.text) : ''
    if (!runA || !b || b.page !== a.page || b.top - a.top > a.height * 3) {
      out.push(a)
      continue
    }
    const runB = leadingCapsRun(b.text)
    if (!runB) {
      out.push(a)
      continue
    }
    const combined = `${runA} ${runB}`
    const keyCombined = HEAD_PHRASES.find((ph) => ph.re.test(combined))
    if (!keyCombined) {
      out.push(a)
      continue
    }
    // Only when the first half cannot stand as the heading on its own, or
    // it trails a connector that plainly continues ("TECHNICAL SKILLS &").
    const aloneMatches = HEAD_PHRASES.some((ph) => ph.re.test(runA))
    if (aloneMatches && !/[&–—]$|(and|of|the)$/i.test(a.text.trim())) {
      out.push(a)
      continue
    }
    // The combined label must be essentially the whole phrase, not a phrase
    // plus unrelated capitals.
    const m = keyCombined.re.exec(combined)
    const leftover = m ? combined.slice(m[0].length) : ''
    const tidy = m && (leftover.replace(/[^a-z]/gi, '').length <= 6 || sameTopicRemainder(leftover, keyCombined.key))
    if (!m || m.index !== 0 || !tidy) {
      out.push(a)
      continue
    }
    out.push({ ...a, text: combined, items: a.items.slice(0, 1), upper: true })
    for (const [line, run] of [
      [a, runA],
      [b, runB],
    ] as [Line, string][]) {
      const rest = lineAfter(line, run.length)
      if (rest.text.length > 3 && /[a-z0-9]/.test(rest.text)) out.push(rest)
    }
    i++ // both halves consumed
  }
  return out
}

export function splitSections(g: LayoutGraph): Section[] {
  const sections: Section[] = [{ key: 'header', title: '', lines: [] }]
  let styledHeadingSeen = false
  let plainHeadingHeight = 0
  for (const line of unwrapWrappedLabels(g.lines, g)) {
    const key = headingKey(line, g, styledHeadingSeen, plainHeadingHeight)
    if (key) {
      // Side-label layouts (atelier) render the section label LEFT of the
      // body on the SAME baseline, so extraction merges them into one line
      // and the heading used to swallow the section's first content line
      // (2026-08-16: work lost its first entry, the cert name vanished).
      // When the heading phrase is a PREFIX of a longer line whose
      // remainder reads as content (has lowercase/digits — all-caps
      // residue like "& EMPLOYMENT HISTORY" is part of the heading), the
      // remainder re-enters the new section as its first line, items split
      // at the phrase boundary so run-geometry consumers (chip rows) keep
      // working.
      let contentRest: Line | null = null
      const t = line.text.trim()
      const phrase = HEAD_PHRASES.find((p) => p.key === key)
      const m = phrase ? phrase.re.exec(t) : null
      if (m && m.index === 0 && m[0].length < t.length) {
        const rest = t.slice(m[0].length).replace(/^[\s:•·—–-]+/, '')
        if (rest.length > 3 && /[a-z0-9]/.test(rest)) {
          let cum = 0
          let idx = 0
          for (; idx < line.items.length && cum < m[0].length; idx++) cum += line.items[idx].str.length + 1
          const items = line.items.slice(idx)
          contentRest = { ...line, text: rest, items, x: items[0]?.x ?? line.x }
        }
      }
      sections.push({
        key,
        title: (contentRest && m ? m[0] : t).replace(/[:\s]+$/, ''),
        lines: contentRest ? [contentRest] : [],
      })
      if (line.upper || line.bold || line.height >= g.bodySize * 1.14) styledHeadingSeen = true
      else plainHeadingHeight = Math.max(plainHeadingHeight, line.height)
    } else {
      sections[sections.length - 1].lines.push(line)
    }
  }
  return sections
}

/* ------------------------------------------------------------------- patterns */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+\/?/i
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.(?:dev|io|com|net|org|me|co|ai|app|tech|in|uk|page|site|xyz)(?:\/[^\s|,]*)?/i
const LOCATION_RE = /([A-Z][A-Za-z.'-]+(?:[ ][A-Z][A-Za-z.'-]+)*,\s*(?:[A-Z]{2}\b|[A-Z][A-Za-z]+))/
const GPA_RE = /\b([0-4]\.\d{1,2})\s*(?:\/\s*(?:4|5|10)(?:\.0+)?)?\s*(?:GPA|CGPA)?\b/i

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*'
const YEAR = '(?:19|20)\\d{2}'
const DATE_TOK = `(?:${MONTH}\\.?\\s*'?)?(?:\\d{1,2}[/.\\-]\\s*)?${YEAR}`
const PRESENT = '(?:present(?:ly)?|currently|current|now|ongoing|to date|till date|today)\\b'
const RANGE_RE = new RegExp(`(${DATE_TOK})\\s*(?:[\\u2012-\\u2015~-]|to|\\bto\\b)\\s*(${DATE_TOK}|${PRESENT})`, 'i')
const SINGLE_DATE_RE = new RegExp(DATE_TOK, 'i')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "Jan 2020" / "01/2020" / "2020" → "YYYY-MM" or "YYYY"; "Present" → "". */
function normDate(tok: string): string {
  const s = (tok || '').trim()
  if (!s || new RegExp(`^${PRESENT}$`, 'i').test(s)) return ''
  const year = s.match(/(?:19|20)\d{2}/)?.[0]
  if (!year) return ''
  const mName = s.toLowerCase().match(MONTH)?.[0]
  let mm = mName ? MONTHS.indexOf(mName.slice(0, 3)) + 1 : 0
  if (!mm) {
    const numeric = s.match(/\b(\d{1,2})[/.\-]/)
    if (numeric) mm = parseInt(numeric[1], 10)
  }
  return mm >= 1 && mm <= 12 ? `${year}-${String(mm).padStart(2, '0')}` : year
}

/** Extract a date range from a string; returns the residual text too. */
function pullDates(text: string): { start: string; end: string; present: boolean; rest: string } {
  const m = text.match(RANGE_RE)
  if (m) {
    const present = new RegExp(PRESENT, 'i').test(m[2])
    return { start: normDate(m[1]), end: present ? '' : normDate(m[2]), present, rest: text.replace(m[0], '').trim() }
  }
  const s = text.match(SINGLE_DATE_RE)
  if (s) return { start: normDate(s[0]), end: '', present: false, rest: text.replace(s[0], '').trim() }
  return { start: '', end: '', present: false, rest: text }
}

const cleanEdge = (s: string) => s.replace(/^[\s|·•,–—-]+|[\s|·•,–—-]+$/g, '').trim()
const isBullet = (s: string) => /^[•‣▪●■·⁃∙*\-–—►▸]\s+/.test(s) || /^[•‣▪●■·⁃∙►▸]/.test(s)
const stripBullet = (s: string) => s.replace(/^[•‣▪●■·⁃∙*►▸]+\s*|^[-–—]\s+/, '').trim()
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Multi-word city prefixes so "San Francisco" / "New York" stay whole.
const CITY_PREFIX = /^(san|los|las|new|santa|fort|st\.?|saint|north|south|east|west|el|la|mount|lake|cape|port)$/i

/**
 * Pull just the trailing "City, ST" (or "City, Country") off a line, returning
 * the remainder — so "Vertex Labs San Francisco, CA" → loc "San Francisco, CA",
 * rest "Vertex Labs". The greedy header LOCATION_RE would otherwise swallow the
 * company too. Two-letter region codes are always accepted; a spelled-out region
 * needs a multi-word city to avoid eating phrases like "Manager, Engineering".
 */
function pullLocation(text: string): { location: string; rest: string } {
  const m = text.match(/,\s*([A-Z]{2}|[A-Z][a-z]{2,})\b\.?\s*$/)
  if (!m || m.index == null) return { location: '', rest: text }
  const region = m[1]
  const isCode = /^[A-Z]{2}$/.test(region)
  const before = text.slice(0, m.index).replace(/\s+$/, '')
  const words = before.split(/\s+/).filter(Boolean)
  if (!words.length || !/^[A-Z]/.test(words[words.length - 1])) return { location: '', rest: text }
  const cityWords = [words[words.length - 1]]
  if (words.length >= 2 && CITY_PREFIX.test(words[words.length - 2])) cityWords.unshift(words[words.length - 2])
  if (!isCode && cityWords.length < 2) return { location: '', rest: text } // guard against non-locations
  const city = cityWords.join(' ')
  const rest = words.slice(0, words.length - cityWords.length).join(' ')
  return { location: `${city}, ${region}`, rest: cleanEdge(rest) }
}

/* -------------------------------------------------------------- header fields */

// Section labels and monograms masquerade as names in some templates' headers.
const NOT_A_NAME =
  /^(contact(\s*(info|information|details))?|profile|summary|objective|about(\s*me)?|skills?|experience|education|resume|cv|curriculum\s*vitae|projects?|certifications?|references?)\.?$/i

/**
 * Trim a name line that over-captured trailing non-name tokens (a website,
 * handle, or role that shared the visual row), e.g. "Alex Morgan alexmorgan.dev"
 * → "Alex Morgan". Keeps the leading run of plain name tokens.
 */
function cleanName(t: string): string {
  const toks = cleanEdge(t).split(/\s+/)
  const out: string[] = []
  for (let tok of toks) {
    tok = tok.replace(/[,|]+$/, '')
    if (/@|https?:|\.[a-z]{2,}$|\d/i.test(tok)) break
    if (!/^[A-Za-z][A-Za-z.'\u2019-]*$/.test(tok)) break
    out.push(tok)
    if (out.length >= 4) break
  }
  const s = out.join(' ').trim()
  return s.length >= 2 ? s : cleanEdge(t)
}

/** Two to four capitalised words, then a separator, then more text — the
 *  shape of a header that packs the name and the headline onto ONE line.
 *  A plain hyphen is deliberately absent: it appears inside real names. */
const MERGED_NAME = /^[A-Z][A-Za-z.'’-]*(?:\s+[A-Z][A-Za-z.'’-]*){1,3}\s*[—–|·•]\s*\S/

function scoreName(line: Line): number {
  const t = line.text.trim()
  if (NOT_A_NAME.test(t)) return -10
  // A single short all-letters token is a logo monogram ("DS"), not a name.
  const wordArr = t.split(/\s+/)
  if (wordArr.length === 1 && t.replace(/[^A-Za-z]/g, '').length <= 2) return -5
  let s = 0
  if (/^[A-Za-z][A-Za-z .'-]+$/.test(t)) s += 3
  if (line.bold) s += 1
  if (/@/.test(t)) s -= 6
  if (/\d/.test(t)) s -= 4
  if (/https?:|\.com|linkedin|github/i.test(t)) s -= 6
  if (/,/.test(t)) s -= 2
  if (wordArr.length >= 2 && wordArr.length <= 4) s += 2
  if (t.length > 38) s -= 3
  return s
}

/**
 * Recover a name merged onto one line with a trailing title, by taking the
 * leading run of ALL-CAPS tokens before the first mixed-case word — e.g.
 * "AKSHAY R Incident Response Consultant" → "AKSHAY R". Returns '' if the line is
 * wholly caps (no title to split off) or doesn't start with a caps name.
 */
function leadingCapsName(t: string): string {
  const toks = t.trim().split(/\s+/)
  const name: string[] = []
  for (const tok of toks) {
    if (/^[A-Z][A-Z.'’-]*$/.test(tok) || /^[A-Z]\.?$/.test(tok)) name.push(tok)
    else break
  }
  if (name.length >= 2 && name.length <= 4 && name.length < toks.length) {
    const s = name.join(' ')
    if (s.length <= 32) return s
  }
  return ''
}

function parseHeader(header: Line[], content: ResumeContent) {
  const b = content.basics
  const blob = header.map((l) => l.text).join('  ·  ')

  b.email =
    header
      .map((l) => l.text)
      .join(' ')
      .match(EMAIL_RE)?.[0] ?? ''
  // phone: international — longest digit-run (9–15 digits) that isn't a year/ZIP
  const phoneCands = (blob.match(/\+?\(?\d[\d().\-\s]{7,}\d/g) || [])
    .map((p) => p.trim())
    .filter((p) => {
      const digits = p.replace(/\D/g, '')
      return digits.length >= 9 && digits.length <= 15
    })
  b.phone = phoneCands.sort((a, b2) => b2.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0] ?? ''

  const linkedin = blob.match(LINKEDIN_RE)?.[0]
  const github = blob.match(GITHUB_RE)?.[0]
  const profiles: { id: string; network: string; username: string; url: string }[] = []
  const httpify = (u: string) => (/^https?:\/\//.test(u) ? u : 'https://' + u.replace(/^\/+/, ''))
  if (linkedin) profiles.push({ id: uid(), network: 'LinkedIn', username: '', url: httpify(linkedin) })
  if (github) profiles.push({ id: uid(), network: 'GitHub', username: '', url: httpify(github) })
  if (profiles.length) b.profiles = profiles
  // personal site = a URL that isn't an email/linkedin/github
  const urls = (blob.match(new RegExp(URL_RE, 'gi')) || []).filter(
    (u) => !/linkedin|github/i.test(u) && !blob.includes('@' + u.replace(/^https?:\/\//, ''))
  )
  if (urls[0]) b.url = httpify(urls[0])

  const locM = blob.match(LOCATION_RE)
  if (locM) {
    const [city, region] = locM[1].split(',').map((s) => s.trim())
    b.location = { city, region }
  }

  // name = highest-scoring header line (ties broken by font size, then order)
  const named = [...header]
    // The merged-name bonus applies to the FIRST header line only. Scored
    // anywhere, a headline of its own ("Data Analyst | Business Analyst |
    // ...") has exactly the same shape and outranked the real name line
    // immediately above it.
    .map((l, i) => ({ l, i, s: scoreName(l) + (i === 0 && MERGED_NAME.test(l.text.trim()) ? 4 : 0) }))
    .filter((x) => x.s > 0)
    .sort((a, c) => c.s - a.s || c.l.height - a.l.height || a.i - c.i)[0]
  if (named) {
    b.name = cleanName(named.l.text)
    // When the name shares its line with the headline, the remainder past
    // the separator IS the headline — the next line is usually contact
    // details, which the search below rightly skips, leaving no label at all.
    const remainder = named.l.text.trim().slice(b.name.length)
    const sep = remainder.match(/^\s*[—–|·•]\s*(\S.*)$/)
    if (sep) b.label = cleanEdge(sep[1])
    // headline = the nearest following non-contact, letter-ish header line
    const after = header.slice(named.i + 1).find((l) => {
      const t = l.text
      return (
        /[A-Za-z]/.test(t) &&
        !EMAIL_RE.test(t) &&
        !/\d{3}/.test(t) &&
        !/https?:|\.com|,\s*[A-Z]{2}\b/.test(t) &&
        t.length <= 60
      )
    })
    if (after && !b.label) b.label = cleanEdge(after.text)
  }

  // Recover a name merged with a trailing role on one line (e.g. ALL-CAPS
  // "AKSHAY R Incident Response Consultant") when no clean name line was found
  // or the chosen one still carries title text.
  if (!b.name || b.name.length > 32 || /[,|]/.test(b.name)) {
    for (let i = 0; i < Math.min(header.length, 3); i++) {
      const ln = leadingCapsName(header[i].text)
      if (!ln) continue
      b.name = ln
      if (!b.label) {
        const rest = cleanEdge(header[i].text.slice(ln.length))
        const next = header[i + 1]
        if (rest && rest.length <= 50) b.label = rest
        else if (
          next &&
          /[A-Za-z]/.test(next.text) &&
          !EMAIL_RE.test(next.text) &&
          !/\d{3}/.test(next.text) &&
          next.text.length <= 80
        )
          b.label = cleanEdge(next.text)
      }
      break
    }
  }
}

/**
 * Recover any basics the header pass missed — the name/contact block often sits
 * outside the "header" section on two-column résumés (a sidebar heading can come
 * first in reading order), so fall back to scanning the whole document. Only
 * fills fields that are still empty, so a header hit always wins.
 */
function recoverMissingBasics(content: ResumeContent, allLines: Line[], g: LayoutGraph) {
  const b = content.basics
  const blob = allLines.map((l) => l.text).join('  \u00b7  ')
  if (!b.email) b.email = blob.match(EMAIL_RE)?.[0] ?? ''
  if (!b.phone) {
    const cands = (blob.match(/\+?\(?\d[\d().\-\s]{7,}\d/g) || [])
      .map((x) => x.trim())
      .filter((x) => {
        const d = x.replace(/\D/g, '')
        return d.length >= 9 && d.length <= 15
      })
    b.phone = cands.sort((a, c) => c.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0] ?? ''
  }
  const httpify = (u: string) => (/^https?:\/\//.test(u) ? u : 'https://' + u.replace(/^\/+/, ''))
  if (!b.profiles || !b.profiles.length) {
    const linkedin = blob.match(LINKEDIN_RE)?.[0]
    const github = blob.match(GITHUB_RE)?.[0]
    const profiles: { id: string; network: string; username: string; url: string }[] = []
    if (linkedin) profiles.push({ id: uid(), network: 'LinkedIn', username: '', url: httpify(linkedin) })
    if (github) profiles.push({ id: uid(), network: 'GitHub', username: '', url: httpify(github) })
    if (profiles.length) b.profiles = profiles
  }
  if (!b.location || (!b.location.city && !b.location.region)) {
    const locM = blob.match(LOCATION_RE)
    if (locM) {
      const [city, region] = locM[1].split(',').map((x) => x.trim())
      b.location = { city, region }
    }
  }
  if (!b.name) {
    // The name is almost always the LARGEST text near the top. Require a clean
    // 2–4 token name shape (no colon/comma/digits) so a skills line like
    // "Languages: TypeScript" or a heading can never be mistaken for it.
    const NAME_SHAPE = /^[A-Za-z][A-Za-z.'’-]+(?: [A-Za-z][A-Za-z.'’-]+){1,3}$/
    // Scan the whole first page (not just reading-order-early lines): on a
    // two-column résumé the name sits in the main column, after the sidebar in
    // reading order, but it is the LARGEST text on the page. Pick biggest font,
    // tie-break topmost.
    const firstPage = allLines[0]?.page ?? 0
    const cands = allLines
      .filter((l) => (l.page ?? 0) === firstPage)
      .map((l) => ({ l, clean: cleanName(l.text) }))
      .filter((x) => NAME_SHAPE.test(x.clean) && !headingKey(x.l, g) && !NOT_A_NAME.test(x.clean))
      .sort((a, c) => c.l.height - a.l.height || a.l.top - c.l.top)
    if (cands[0]) b.name = cands[0].clean
  }
}

/* ------------------------------------------------------------- entry grouping */

const sectionLeftX = (lines: Line[]): number => (lines.length ? Math.min(...lines.map((l) => l.x)) : 0)

/**
 * A line is a highlight (bullet) if it carries a bullet glyph OR is indented past
 * the section's left margin. Many résumés — including CVAurum's own export —
 * render bullets via a hanging indent with no glyph in the text layer, so
 * indentation is the only reliable signal.
 */
/** Is this line essentially just an entry's DATE RANGE (with, at most, the
 *  location that sits beside it)? Designed resumes put the range on its own
 *  line under the title and often indent it FURTHER than the bullets, and
 *  indent is the only signal the highlight test has - so the date line became
 *  bullet #0, the entry lost its dates, and the bullet list gained junk like
 *  "07/2024 - Present Hyderabad,India". Found by importing 43 real
 *  third-party resumes: 12 of them lost EVERY date this way.
 *
 *  A bullet that merely MENTIONS a range ("Led the 2019 - 2020 migration...")
 *  keeps real words once the range and location are removed, so it stays a
 *  bullet. */
function isDateLine(text: string): boolean {
  if (isBullet(text)) return false
  const s = stripBullet(text).trim()
  if (!s) return false
  const m = RANGE_RE.exec(s)
  if (!m) return false
  const rest = s
    .replace(m[0], ' ')
    .replace(LOCATION_RE, ' ')
    .replace(/[|,·•–—()-]/g, ' ')
    .trim()
  return rest.split(/\s+/).filter(Boolean).length <= 1
}

/** A SHORT line carrying a full date range is an entry header, not a bullet.
 *  Resumes put the job title and its dates on one line and indent it, and the
 *  section's left margin can be set by something further left - a
 *  keyword-stuffed paragraph, in the case this was measured on - which made
 *  the header count as indented. The entry then lost its title AND its dates,
 *  and imported the keyword pile as its position.
 *
 *  Bounded by what is LEFT once the range and location are removed: a real
 *  bullet that mentions a range ("Led the 2019 - 2020 migration of the billing
 *  platform to a new provider") still has a sentence there and stays a
 *  bullet. */
function isDatedHeaderLine(text: string): boolean {
  if (isBullet(text)) return false
  const t = stripBullet(text).trim()
  const m = RANGE_RE.exec(t)
  if (!m) return false
  const rest = t
    .replace(m[0], ' ')
    .replace(LOCATION_RE, ' ')
    .replace(/[|,·•–—()-]/g, ' ')
    .trim()
  return rest.split(/\s+/).filter(Boolean).length <= 5
}

function makeIsHighlight(lines: Line[], g: LayoutGraph): (l: Line) => boolean {
  const leftX = sectionLeftX(lines)
  const indent = Math.max(4, g.bodySize * 0.5)
  return (l: Line) =>
    !isDateLine(l.text) && !isDatedHeaderLine(l.text) && (isBullet(l.text) || l.x > leftX + indent)
}

/**
 * Rejoin wrapped bullet lines into whole bullets. A PDF wraps one bullet across
 * several lines, each surfacing as its own Line — so "…dashboards in Power BI to"
 * + "monitor SLA compliance…" is really one bullet. A continuation is a highlight
 * with no bullet glyph that follows a bullet which didn't end at a sentence
 * boundary (or, when the résumé uses glyph bullets, any glyph-less highlight).
 */
function mergeHighlights(lines: Line[]): string[] {
  const raw = lines.map((l) => ({ glyph: isBullet(l.text), text: stripBullet(l.text) }))
  const anyGlyph = raw.some((r) => r.glyph)
  const endsSentence = (s: string) => /[.!?:;][)"'”’]?$/.test(s.trim())
  const anyTerminal = raw.some((r) => endsSentence(r.text))
  const out: string[] = []
  for (const r of raw) {
    const prev = out[out.length - 1]
    const continuation = prev !== undefined && !r.glyph && (anyGlyph || (anyTerminal && !endsSentence(prev)))
    if (continuation) out[out.length - 1] = `${prev} ${r.text}`.replace(/\s+/g, ' ').trim()
    else if (r.text) out.push(r.text)
  }
  return out.map(esc)
}

/**
 * Split a section's lines into entries (one per job / degree).
 *
 * When the section has ≥2 dated headers (the usual case), segment by DATE: each
 * job has one date range, so a new entry starts at a dated header line once the
 * current entry already owns one — and the 1–2 plain header lines immediately
 * before that date (the company/title that sits above it) are carried into the
 * new entry. This is far more robust on dense / multi-column / multi-page resumes
 * than vertical-gap heuristics, which shatter one job into many fragments.
 *
 * With no reliable dates, fall back to conservative gap/heading splitting (no raw
 * column/page-break splits, which over-segment).
 */
function toEntries(lines: Line[], g: LayoutGraph): Line[][] {
  const isHL = makeIsHighlight(lines, g)
  const isDatedHeader = (l: Line) => !isHL(l) && RANGE_RE.test(l.text)
  const datedHeaders = lines.filter(isDatedHeader).length

  if (datedHeaders >= 2) {
    const entries: Line[][] = []
    let cur: Line[] = []
    let curDated = false
    for (const line of lines) {
      if (isDatedHeader(line) && curDated && cur.length) {
        // Carry up to 2 trailing plain header lines (company/title above the date)
        // into the new entry instead of leaving them on the previous one.
        const carry: Line[] = []
        while (
          cur.length &&
          carry.length < 2 &&
          !isHL(cur[cur.length - 1]) &&
          !RANGE_RE.test(cur[cur.length - 1].text)
        ) {
          carry.unshift(cur.pop()!)
        }
        entries.push(cur)
        cur = carry
        curDated = false
      }
      cur.push(line)
      if (isDatedHeader(line)) curDated = true
    }
    if (cur.length) entries.push(cur)
    return entries
  }

  // Fallback: split on a clear vertical gap or a bold header after bullets only.
  const entries: Line[][] = []
  let cur: Line[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prev = lines[i - 1]
    const sameStream = prev && line.page === prev.page && line.col === prev.col
    const bigGap = sameStream && line.top - prev.top > g.lineGap * 1.8
    const boldHeader = prev && cur.length && !isHL(line) && line.bold && isHL(prev)
    if (cur.length && (bigGap || boldHeader)) {
      entries.push(cur)
      cur = []
    }
    cur.push(line)
  }
  if (cur.length) entries.push(cur)
  return entries
}

const ROLE_LABEL = /^(role|title|designation|position|job\s*title)$/i
const COMPANY_LABEL = /^(client|clients|company|employer|organi[sz]ation|firm|account)$/i
// Strong signals that an unlabelled header line is the employer, not the job title.
const COMPANY_HINT =
  /\b(inc|ltd|llc|llp|pvt|corp|gmbh|consultanc\w*|services|technolog\w*|solutions|systems|enterprises|university|college|institute|infotech)\b/i
const DATE_FRAGMENT = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{0,4}$/i

/**
 * Decide which header line is the job title vs the employer. Honours explicit
 * "Role:" / "Client:" / "Company:" labels (stripping them), and otherwise takes
 * the first two unlabelled lines — swapping them when the first is clearly a
 * company name and the second isn't (so "Tata Consultancy Services" + "Data
 * Analyst" reads role-first). Leftover labelled lines (Environment:, Project:…)
 * become the entry summary; stray date fragments are dropped.
 */
function assignRoleCompany(headerLines: string[]): { position: string; name: string; summary: string } {
  let position = '',
    name = ''
  let posLabelled = false,
    nameLabelled = false
  const rest: string[] = []
  const unlabelled: string[] = []
  for (const hl of headerLines) {
    const m = hl.match(/^([A-Za-z][A-Za-z /&]{1,22}?)\s*:\s*(.+)$/)
    const label = m ? m[1].trim() : ''
    if (m && ROLE_LABEL.test(label)) {
      if (!position) {
        position = m[2].trim()
        posLabelled = true
      }
    } else if (m && COMPANY_LABEL.test(label)) {
      if (!name) {
        name = m[2].trim()
        nameLabelled = true
      }
    } else if (m) {
      rest.push(hl) // other labelled line (Environment:, Project:…) → summary
    } else {
      unlabelled.push(hl)
    }
  }
  for (const u of unlabelled) {
    if (!position) position = u
    else if (!name) name = u
    else rest.push(u)
  }
  // Both came from unlabelled lines (position-first assumed) — swap if the title
  // slot actually holds the company name.
  if (!posLabelled && !nameLabelled && position && name && COMPANY_HINT.test(position) && !COMPANY_HINT.test(name)) {
    ;[position, name] = [name, position]
  }
  const summary = rest.filter((s) => !DATE_FRAGMENT.test(s.trim()) && s.trim().length > 2).join(' ')
  return { position, name, summary }
}

function parseWork(lines: Line[], g: LayoutGraph): ResumeContent['work'] {
  const isHL = makeIsHighlight(lines, g)
  return toEntries(lines, g)
    .map((entry) => {
      const hlLines: Line[] = []
      const headerLines: string[] = []
      let start = '',
        end = '',
        location = ''
      for (const line of entry) {
        if (isHL(line)) {
          hlLines.push(line)
          continue
        }
        const d = pullDates(line.text)
        if (d.start && !start) {
          start = d.start
          end = d.end
        }
        let rest = d.rest
        const pl = pullLocation(rest)
        if (pl.location && !location) {
          location = pl.location
          rest = pl.rest
        }
        rest = cleanEdge(rest)
        if (rest) headerLines.push(rest)
      }
      const highlights = mergeHighlights(hlLines)
      const { position, name, summary } = assignRoleCompany(headerLines)
      return {
        id: uid(),
        name,
        position,
        location,
        url: '',
        startDate: start,
        endDate: end,
        summary: summary ? esc(summary) : '',
        highlights,
      }
    })
    .filter((w) => w.position || w.name || w.highlights.length)
}

/** Volunteer entries share the work shape (org, role, dates, bullets) —
 *  parse with the work machinery and remap fields (2026-08-16: the
 *  volunteer section was detected by the splitter but had no parser case,
 *  so the whole section silently vanished on import). */
function parseVolunteer(lines: Line[], g: LayoutGraph): ResumeContent['volunteer'] {
  return parseWork(lines, g).map((w) => ({
    id: uid(),
    organization: w.name,
    position: w.position,
    location: w.location,
    url: '',
    startDate: w.startDate,
    endDate: w.endDate,
    summary: w.summary,
    highlights: w.highlights,
  }))
}

function parseEducation(lines: Line[], g: LayoutGraph): ResumeContent['education'] {
  return toEntries(lines, g)
    .map((entry) => {
      const text = entry.map((l) => l.text).join(' · ')
      const d = pullDates(text)
      const gpa = text.match(GPA_RE)?.[1] ?? ''
      const headerLines = entry
        .filter((l) => !isBullet(l.text))
        .map((l) => cleanEdge(pullDates(l.text).rest))
        .filter(Boolean)
      const degreeLine = headerLines.find((l) =>
        /\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d|bachelor|master|associate|diploma|mba|b\.?tech|m\.?tech|b\.?e\.?\b)/i.test(
          l
        )
      )
      const instLine = headerLines.find((l) => l !== degreeLine) || headerLines[0] || ''
      // Strip GPA, then peel the trailing "City, ST" so it doesn't pollute the name.
      const instNoGpa = instLine.replace(GPA_RE, '').trim()
      const plInst = pullLocation(instNoGpa)
      const loc = plInst.location || text.match(LOCATION_RE)?.[1] || ''
      return {
        id: uid(),
        institution: (plInst.location ? plInst.rest : instNoGpa).trim() || '',
        area: degreeLine ? degreeLine.replace(GPA_RE, '').trim() : '',
        studyType: '',
        location: loc,
        startDate: d.start,
        endDate: d.end,
        score: gpa ? `${gpa} GPA` : '',
        url: '',
        summary: '',
        courses: [],
      }
    })
    .filter((e) => e.institution || e.area)
}

export function parseSkills(lines: Line[]): ResumeContent['skills'] {
  // Dedupe (case-insensitive), drop junk/sentence-length entries, and cap per
  // group — some ATS-stuffed résumés list hundreds of comma-separated keywords.
  const clean = (arr: string[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of arr) {
      const s = raw.trim()
      // 64, not 40: real keywords run long ("System Integration (ServiceNow
      // to SQL Server)" is 45), and a chip rejoined from two wrapped lines
      // longer still. Prose is excluded by the callers' own tests, not here.
      if (!s || s.length > 64 || !/[A-Za-z0-9]/.test(s)) continue
      const k = s.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(s)
      if (out.length >= 80) break
    }
    return out
  }
  // A leftover line only becomes skills if it reads like a keyword list — never
  // prose. Trailing content that merged in from an unrecognised heading
  // (a declaration, "references available on request", personal details) must
  // NOT be shredded into random "skills".
  const NONSKILL =
    /\b(available\s+(up)?on\s+request|references?|declaration|hereby|i\s+declare|date\s+of\s+birth|d\.?o\.?b\.?|marital|nationality|passport|gender|father'?s?\s+name|mother'?s?\s+name|permanent\s+address|current\s+address|languages?\s+known)\b/i
  const looksLikeSkillList = (t: string): boolean => {
    const s = t.trim()
    if (!s || NONSKILL.test(s)) return false
    const words = s.split(/\s+/)
    if (/[.!?]$/.test(s) && words.length > 8) return false // a sentence, not a skill line
    if (/[,;|•·]/.test(s)) return true // a delimited keyword list (incl. stuffed)
    return words.length <= 4 // a lone short term is plausibly one skill
  }
  // Chip rows (2026-08-16 — aurum/obsidian imported skills: [] while every
  // chip sat intact in the layout graph): designed templates render a group
  // name over a row of chips, which extracts as ONE space-separated line
  // the keyword-list test above rightly rejects (no delimiters, >4 words).
  // The chips are still recoverable EXACTLY, because each chip is its own
  // text RUN: >=2 items with every inter-run gap >= 3pt (chip padding,
  // measured ~13pt; style-split prose runs abut at ~0). Keywords come from
  // the runs — multi-word chips survive whole. A 1-3-word plain line
  // directly above a chip row is that group's NAME (held one line; if no
  // chip row follows it falls through to the loose pile as before).
  const isChipRow = (l: Line): boolean => {
    if (!l.items || l.items.length < 2) return false
    for (let i = 1; i < l.items.length; i++) {
      const gapPt = l.items[i].x - (l.items[i - 1].x + l.items[i - 1].width)
      if (gapPt < 3) return false
    }
    return true
  }
  const groupNameish = (t: string): boolean =>
    !!t && t.length <= 30 && !/[,;|•·:]/.test(t) && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 3
  // A NARROW column (sidebar) wraps one logical chip row over several
  // physical lines, and the old one-group-per-row rule turned the author's
  // 7 groups into 12 stubs of ~2 keywords, after which the 12-group cap
  // silently dropped 45 of 70 keywords. Measured on a sapphire export (pt):
  // group names sit at x=54 h=8.2, chips at x=58.8 h=7.3 (chip padding
  // indents them and they render smaller), a following chip ROW is 16.9
  // below, and a chip whose own text WRAPPED is only 10.2 below. So the left
  // edge and height say "still chips", and the vertical pitch says "next
  // chip" vs "rest of the previous chip".
  const sameChipLine = (l: Line, sig: { x: number; h: number; page: number }): boolean =>
    l.page === sig.page && Math.abs(l.x - sig.x) <= 1 && Math.abs(l.height - sig.h) <= 0.6
  // Structural naming: whatever sits directly above a chip run IS its name,
  // so real names the lexical test rejected survive ("Databases & Data
  // Management" is 4 words; "BI, Reporting & Visualisation" has a comma).
  const chipGroupName = (t: string): boolean =>
    !!t && t.length <= 40 && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 6
  const chipBlocks = new Map<number, { name: string; keywords: string[] }>()
  const consumed = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i) || !isChipRow(lines[i])) continue
    const sig = { x: lines[i].x, h: lines[i].height, page: lines[i].page }
    // A chip ROW needs two runs, but a group's first chip often sits alone
    // on its line, so the run begins ABOVE the row that identified it. Walk
    // back over every line still matching the chip signature: otherwise that
    // lone chip is left over, reads as a group name, and displaces the real
    // one (measured on `aside`: "Microsoft SQL Server" named the group that
    // "Databases & Data Management" should have).
    let start = i
    while (start > 0 && !consumed.has(start - 1) && sameChipLine(lines[start - 1], sig)) start--
    const keywords = lines[start].items.map((it) => it.str)
    consumed.add(start)
    let prev = lines[start]
    for (let j = start + 1; j < lines.length && sameChipLine(lines[j], sig); j++) {
      const l = lines[j]
      // Font metrics, not a learned pitch: a wrapped line sits ~1.4x its own
      // height below its first line, while a new chip row adds the chip's
      // vertical padding on top of that (~2.3x measured). Learning the pitch
      // from the first row-to-row gap looked tempting but misreads the whole
      // block whenever that first gap is atypical.
      if (keywords.length && l.top - prev.top < l.height * 1.8) {
        keywords[keywords.length - 1] += ' ' + stripBullet(l.text).trim()
      } else {
        keywords.push(...l.items.map((it) => it.str))
      }
      consumed.add(j)
      prev = l
    }
    const above = start > 0 ? lines[start - 1] : null
    let name = ''
    let nameIdx = start - 1
    if (above && !consumed.has(nameIdx) && !sameChipLine(above, sig) && chipGroupName(stripBullet(above.text).trim())) {
      name = stripBullet(above.text).trim()
      consumed.add(nameIdx)
      // The name itself wraps in a narrow column ("Databases & Data" /
      // "Management"). Its own continuation sits at the name's left edge and
      // height, one text line up rather than a full row.
      const prior = nameIdx > 0 ? lines[nameIdx - 1] : null
      if (
        prior &&
        !consumed.has(nameIdx - 1) &&
        sameChipLine(prior, { x: above.x, h: above.height, page: above.page }) &&
        above.top - prior.top < above.height * 1.8 &&
        chipGroupName(`${stripBullet(prior.text).trim()} ${name}`)
      ) {
        name = `${stripBullet(prior.text).trim()} ${name}`
        consumed.add(nameIdx - 1)
      }
    }
    chipBlocks.set(start, { name, keywords: clean(keywords) })
  }
  const groups: ResumeContent['skills'] = []
  const loose: string[] = []
  let pendingName: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const block = chipBlocks.get(i)
    if (block) {
      if (block.keywords.length) {
        groups.push({ id: uid(), name: block.name || pendingName || '', level: '', keywords: block.keywords })
        pendingName = null
      }
      continue
    }
    if (consumed.has(i)) continue
    const t = stripBullet(line.text)
    const m = t.match(/^([A-Za-z][A-Za-z /&+#.-]{1,28}):\s*(.+)$/)
    if (m) {
      if (pendingName) loose.push(pendingName)
      pendingName = null
      const keywords = clean(m[2].split(/[,;|•·]/))
      if (keywords.length) groups.push({ id: uid(), name: m[1].trim(), level: '', keywords })
    } else if (groupNameish(t)) {
      if (pendingName) loose.push(pendingName)
      pendingName = t
    } else {
      if (pendingName) loose.push(pendingName)
      pendingName = null
      if (looksLikeSkillList(t)) loose.push(...t.split(/[,;|•·]/))
    }
  }
  if (pendingName) loose.push(pendingName)
  const looseClean = clean(loose)
  if (looseClean.length)
    groups.push({ id: uid(), name: groups.length ? 'Additional' : 'Skills', level: '', keywords: looseClean })
  // The cap keeps the editor sane on a garbage parse, but dropping the tail
  // outright loses real keywords; fold the overflow into the last group.
  if (groups.length > 12) {
    const overflow = groups.splice(12)
    groups[11].keywords = clean([...groups[11].keywords, ...overflow.flatMap((g) => g.keywords)])
  }
  return groups
}

function parseProjects(lines: Line[], g: LayoutGraph): ResumeContent['projects'] {
  const isHL = makeIsHighlight(lines, g)
  return toEntries(lines, g)
    .map((entry) => {
      const hlLines: Line[] = []
      const headerLines: string[] = []
      let start = '',
        end = '',
        url = ''
      for (const line of entry) {
        if (isHL(line)) {
          hlLines.push(line)
          continue
        }
        const d = pullDates(line.text)
        if (d.start && !start) {
          start = d.start
          end = d.end
        }
        let rest = d.rest
        const u = rest.match(URL_RE)
        if (u && !url) {
          url = u[0]
          rest = rest.replace(u[0], '')
        }
        rest = cleanEdge(rest)
        if (rest) headerLines.push(rest)
      }
      const highlights = mergeHighlights(hlLines)
      const [name = '', description = ''] = headerLines
      return {
        id: uid(),
        name,
        description: description ? esc(description) : '',
        url: url ? (/^https?:/.test(url) ? url : 'https://' + url) : '',
        startDate: start,
        endDate: end,
        highlights,
        keywords: [],
      }
    })
    .filter((p) => p.name)
}

/** A line reads as visibly LESS prominent than the line that started its
 *  entry when it lost the bold or lost >0.5px of height — dual signal
 *  because print/real PDFs bake weight into embedded font names (bold flag
 *  works) while native exports normalize names (bold flag is blind) but
 *  render secondary lines smaller. */
const lessProminentThan = (l: Line, start: Line) => !l.bold && (start.bold || l.height < start.height - 0.5)

/** Pulls a trailing bare year ("Engineering Excellence Award 2023") off an
 *  entry title — designed layouts right-align the date, which extraction
 *  merges into the title line's text. */
const pullTrailingYear = (t: string): { text: string; year: string } => {
  const m = t.match(/^(.*?)\s+((?:19|20)\d{2})$/)
  return m ? { text: m[1].trim(), year: m[2] } : { text: t, year: '' }
}

/** Groups section lines into per-entry clusters by vertical gap: the
 *  itemGap between entries is far larger than the line spacing inside one
 *  (same `lineGap * 1.8` rule the work parser's fallback trusts); a page or
 *  column change starts a new cluster since the gap can't be measured
 *  across. */
function clusterByGap(src: Line[], lineGap: number): Line[][] {
  const clusters: Line[][] = []
  let cur: Line[] = []
  for (let i = 0; i < src.length; i++) {
    const l = src[i]
    const prev = src[i - 1]
    const sameStream = prev && l.page === prev.page && l.col === prev.col
    const bigGap = sameStream && l.top - prev.top > lineGap * 1.8
    if (cur.length && (bigGap || !sameStream)) {
      clusters.push(cur)
      cur = []
    }
    cur.push(l)
  }
  if (cur.length) clusters.push(cur)
  return clusters
}

export function parseSimpleList(
  lines: Line[],
  key: 'languages' | 'certificates' | 'awards' | 'interests' | 'publications',
  lineGap = 12
) {
  const text = lines.map((l) => stripBullet(l.text)).filter(Boolean)
  if (key === 'languages') {
    // Right-aligned fluency (2026-08-16): our templates render the language
    // left and fluency right — ONE extracted line, TWO text runs with a
    // huge gap. "English Native" used to import with empty fluency.
    const out: { id: string; language: string; fluency: string }[] = []
    const rest: string[] = []
    for (const l of lines) {
      const t = stripBullet(l.text)
      if (!t) continue
      if (l.items && l.items.length === 2 && l.items[1].x - (l.items[0].x + l.items[0].width) >= 24) {
        out.push({ id: uid(), language: l.items[0].str.trim(), fluency: l.items[1].str.trim() })
      } else {
        rest.push(t)
      }
    }
    out.push(
      ...rest
        .flatMap((t) => t.split(/[,;|]/))
        .map((s) => s.trim())
        .filter(Boolean)
        .map((language) => ({
          id: uid(),
          language: language.replace(/\s*\(.*\)$/, '').trim(),
          fluency: (language.match(/\(([^)]+)\)/)?.[1] || '').trim(),
        }))
    )
    return out
  }
  if (key === 'interests') {
    const kws = text
      .flatMap((t) => t.split(/[,;|•·]/))
      .map((s) => s.trim())
      .filter(Boolean)
    return kws.length ? [{ id: uid(), name: 'Interests', keywords: kws }] : []
  }
  if (key === 'certificates') {
    // Name/issuer pairing (2026-08-16, found by the multi-page round-trip
    // probe): designed resumes — ours included — render a cert as a
    // prominent name line followed by a muted issuer line, which used to
    // import as TWO certificates. A line is PRIMARY (starts a cert) when
    // it is bold or within half a px of the section's tallest line; a
    // secondary line attaches as issuer to a cert that has none yet. Two
    // signals on purpose: print/real PDFs bake weight into font names
    // (bold flag works), while native exports normalize font names (bold
    // flag is blind) but render the issuer visibly smaller — measured
    // 9.6 vs 8.8 on classic. A flat unstyled list (all same height, no
    // bold) stays one cert per line, jitter under 0.5px ignored.
    const src = lines.filter((l) => stripBullet(l.text))
    // Cluster by vertical gap first (2026-08-16, import gate): narrow aside
    // columns WRAP a cert's name across lines, which used to import one
    // cert as two or three on double/portrait/deedy. Within a structured
    // cluster, leading same-prominence lines JOIN into the name, the first
    // less prominent line (lessProminentThan vs the cluster's first line)
    // becomes the issuer, and any further line starts a new cert. A cluster
    // with no prominence structure (flat unstyled list) stays one cert per
    // line, so gap-separated plain lists never merge.
    const out: { id: string; name: string; issuer: string; date: string; url: string }[] = []
    // Year pull happens per FRAGMENT before joining: a right-aligned date
    // merges into the END of whichever wrapped line it sits beside, so the
    // joined name would otherwise carry the year mid-string.
    const pushCert = (parts: string[]) => {
      let date = ''
      const nameParts = parts.map((p) => {
        const { text, year } = pullTrailingYear(p)
        if (year && !date) date = year
        return text
      })
      out.push({ id: uid(), name: nameParts.join(' ').trim(), issuer: '', date, url: '' })
    }
    for (const cl of clusterByGap(src, lineGap)) {
      const first = cl[0]
      const structured = cl.some((l) => lessProminentThan(l, first))
      if (!structured) {
        // Equal-prominence cluster (atelier styles name and issuer
        // identically): the YEAR anchors the entry — but only in the
        // unambiguous shape where the FIRST line is dated and every
        // follower is yearless. Any other mix (all dated, middle dated,
        // none dated) is read as a flat list, one cert per line.
        const dated = cl.map((l) => pullTrailingYear(stripBullet(l.text)))
        if (cl.length > 1 && dated[0].year && dated.slice(1).every((d) => !d.year)) {
          pushCert([stripBullet(first.text)])
          for (let i = 1; i < cl.length; i++) {
            const cur = out[out.length - 1]
            if (cur && !cur.issuer) cur.issuer = dated[i].text
            else pushCert([dated[i].text])
          }
          continue
        }
        for (const l of cl) pushCert([stripBullet(l.text)])
        continue
      }
      let nameParts: string[] = []
      for (const l of cl) {
        const t = stripBullet(l.text)
        if (!lessProminentThan(l, first)) {
          nameParts.push(t)
        } else if (nameParts.length) {
          pushCert(nameParts)
          nameParts = []
          out[out.length - 1].issuer = t
        } else if (out.length && !out[out.length - 1].issuer) {
          out[out.length - 1].issuer = t
        } else {
          // a second secondary line with the issuer already taken — keep
          // the pre-cluster behavior: it becomes its own cert
          pushCert([t])
        }
      }
      if (nameParts.length) pushCert(nameParts)
    }
    return out
  }
  // awards + publications (2026-08-16): one award used to import as THREE —
  // its title, awarder, and summary lines each became an award (and
  // publications had NO parser case at all — the detected section silently
  // vanished). Prominence alone cannot fix it (live-measured on classic:
  // title h9.6, awarder h8.83, summary h9.6 — summary matches the title),
  // so both group by VERTICAL GAP first (the itemGap between entries is far
  // larger than the line spacing inside one; same `lineGap * 1.8` rule the
  // work parser's fallback uses, new cluster on page/column change since
  // gap can't be measured across), then assign roles inside each cluster:
  // first line = title (trailing year -> date), a less prominent line of
  // issuer-ish length = awarder/publisher, everything else joins the
  // summary. A cluster with NO prominence structure (flat unstyled list)
  // stays one entry per line.
  const src = lines.filter((l) => stripBullet(l.text))
  const clusters = clusterByGap(src, lineGap)
  const entries: { title: string; sub: string; date: string; summary: string }[] = []
  for (const cl of clusters) {
    const [first, ...rest] = cl
    const structured = rest.some((l) => lessProminentThan(l, first))
    if (!structured && rest.length) {
      // Same year-anchor rule as certificates (atelier's award summary is
      // even LARGER than its title, so prominence is useless there): first
      // line dated + all followers yearless = ONE entry; short plain
      // follower = awarder/publisher, sentence-like followers join the
      // summary. Any other dating mix stays one entry per line.
      const dated = cl.map((l) => pullTrailingYear(stripBullet(l.text)))
      if (dated[0].year && dated.slice(1).every((d) => !d.year)) {
        const entry = { title: dated[0].text, sub: '', date: dated[0].year, summary: '' }
        for (let i = 1; i < cl.length; i++) {
          const t = dated[i].text
          if (!entry.sub && t.length <= 60 && !/[.!?]$/.test(t)) entry.sub = t
          else entry.summary = entry.summary ? `${entry.summary} ${t}` : t
        }
        entries.push(entry)
        continue
      }
      for (const l of cl) {
        const { text: title, year } = pullTrailingYear(stripBullet(l.text))
        entries.push({ title, sub: '', date: year, summary: '' })
      }
      continue
    }
    // Title = the LEADING run of same-prominence lines (narrow columns wrap
    // titles), year pulled per fragment (a right-aligned date merges into
    // the end of whichever wrapped line it sits beside).
    let date = ''
    const titleParts: string[] = []
    let i = 0
    for (; i < cl.length && !lessProminentThan(cl[i], first); i++) {
      const { text, year } = pullTrailingYear(stripBullet(cl[i].text))
      titleParts.push(text)
      if (year && !date) date = year
    }
    const entry = { title: titleParts.join(' ').trim(), sub: '', date, summary: '' }
    for (; i < cl.length; i++) {
      const t = stripBullet(cl[i].text)
      if (!entry.sub && lessProminentThan(cl[i], first) && t.length <= 60) entry.sub = t
      else entry.summary = entry.summary ? `${entry.summary} ${t}` : t
    }
    entries.push(entry)
  }
  if (key === 'publications') {
    return entries.map((e) => ({
      id: uid(),
      name: e.title,
      publisher: e.sub,
      releaseDate: e.date,
      url: '',
      summary: e.summary,
    }))
  }
  return entries.map((e) => ({ id: uid(), title: e.title, awarder: e.sub, date: e.date, summary: e.summary }))
}

/* ------------------------------------------------------------------ assemble */

export interface ImportResult {
  content: ResumeContent
  meta: {
    pages: number
    chars: number
    sections: string[]
    lowText: boolean
    ocrPages: number[]
    ocrEngineFailed: boolean
  }
}

const BLANK = (): ResumeContent => ({
  basics: { name: '', label: '', image: '', email: '', phone: '', url: '', summary: '', location: {}, profiles: [] },
  work: [],
  volunteer: [],
  education: [],
  awards: [],
  certificates: [],
  publications: [],
  skills: [],
  languages: [],
  interests: [],
  references: [],
  projects: [],
  custom: [],
})

export function parseLayout(g: LayoutGraph): ImportResult {
  const content = BLANK()
  const sections = splitSections(g)
  const header = sections.find((s) => s.key === 'header')
  if (header) parseHeader(header.lines, content)
  recoverMissingBasics(content, g.lines, g)

  // Monogram furniture (2026-08-16): initials/pinnacle-class templates
  // repeat the person's INITIALS as real text at the top of continuation
  // pages ("AM"), which landed inside whatever section straddled the page
  // and imported as junk (volunteer position "AM"). A standalone line
  // exactly equal to the detected name's initials is page furniture.
  const initials = (content.basics.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('')
  for (const sec of sections) {
    const lines = sec.lines.filter((l) => l.text.trim() && !(initials.length >= 2 && l.text.trim() === initials))
    if (!lines.length) continue
    switch (sec.key) {
      case 'summary':
        content.basics.summary = `<p>${esc(lines.map((l) => l.text).join(' '))}</p>`
        break
      case 'work':
        content.work.push(...parseWork(lines, g))
        break
      case 'education':
        content.education.push(...parseEducation(lines, g))
        break
      case 'skills':
        content.skills.push(...parseSkills(lines))
        break
      case 'projects':
        content.projects.push(...parseProjects(lines, g))
        break
      case 'languages':
        content.languages.push(...(parseSimpleList(lines, 'languages') as ResumeContent['languages']))
        break
      case 'certificates':
        content.certificates.push(...(parseSimpleList(lines, 'certificates') as ResumeContent['certificates']))
        break
      case 'awards':
        content.awards.push(...(parseSimpleList(lines, 'awards', g.lineGap) as ResumeContent['awards']))
        break
      case 'publications':
        content.publications.push(
          ...(parseSimpleList(lines, 'publications', g.lineGap) as ResumeContent['publications'])
        )
        break
      case 'volunteer':
        content.volunteer.push(...parseVolunteer(lines, g))
        break
      case 'interests':
        content.interests.push(...(parseSimpleList(lines, 'interests') as ResumeContent['interests']))
        break
      case 'references': {
        const rtxt = lines.map((l) => stripBullet(l.text)).filter(Boolean)
        for (const t of rtxt) {
          if (/available\s+(up)?on\s+request/i.test(t)) continue // placeholder, not a referee
          content.references.push({ id: uid(), name: t.slice(0, 80), reference: '' })
        }
        break
      }
      default:
        if (sec.key.startsWith('custom:')) {
          const bullets = lines.filter((l) => isBullet(l.text)).map((l) => esc(stripBullet(l.text)))
          content.custom.push({
            id: uid(),
            name: sec.title || 'Section',
            items: [
              {
                id: uid(),
                name: '',
                subtitle: '',
                date: '',
                location: '',
                url: '',
                summary: bullets.length ? '' : esc(lines.map((l) => l.text).join(' ')),
                highlights: bullets,
              },
            ],
          })
        }
    }
  }

  return {
    content,
    meta: {
      pages: g.pageCount,
      chars: g.charCount,
      sections: sections.map((s) => s.key).filter((k) => k !== 'header'),
      // After OCR has had its turn, still-thin text means a genuinely unreadable PDF.
      lowText: g.charCount < 80 * g.pageCount,
      ocrPages: g.ocrPages,
      ocrEngineFailed: g.ocrEngineFailed,
    },
  }
}
