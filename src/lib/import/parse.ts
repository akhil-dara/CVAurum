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
const HEAD_PHRASES: { key: string; re: RegExp }[] = [
  { key: 'work', re: /^(work\s+experience|professional\s+experience|employment(\s+history)?|work\s+history|experience|career(\s+history)?)\b/i },
  { key: 'education', re: /^(education|academic\b.*|qualifications?)\b/i },
  { key: 'skills', re: /^(technical\s+skills|core\s+(skills|competenc\w*)|key\s+skills|skills(\s*[,&].*)?|technolog\w*|tech(nical)?\s+stack|expertise|areas\s+of\s+expertise|competenc\w*|proficienc\w*)\b/i },
  { key: 'projects', re: /^(projects?|personal\s+projects|key\s+projects|selected\s+projects)\b/i },
  { key: 'certificates', re: /^(certifications?(\s*[,&].*)?|licen[sc]es?|certificates?)\b/i },
  { key: 'awards', re: /^(awards?(\s*[,&].*)?|honou?rs|achievements|accomplishments)\b/i },
  { key: 'publications', re: /^(publications?|research)\b/i },
  { key: 'volunteer', re: /^(volunteer\w*|community\s+service)\b/i },
  { key: 'languages', re: /^languages?\b/i },
  { key: 'interests', re: /^(interests|hobbies)\b/i },
  { key: 'summary', re: /^(summary|professional\s+summary|profile|objective|career\s+objective|about(\s+me)?)\b/i },
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
  { key: 'summary', re: /\b(summary|objective)\b/i },
]

/** Does the line BEGIN with several capital letters? (e.g. "WORK EXPERIENCE") */
const startsAllCaps = (t: string): boolean => /^[A-Z][A-Z][A-Z &/,'’-]+/.test(t)

/**
 * A line is a section heading when it starts with a known section keyword AND is
 * set off as a heading — either a short, styled line (caps / bold / larger), OR
 * a line whose leading words are ALL-CAPS (which catches headings that carry
 * trailing text and headings on PDFs where pdf.js loses the bold flag).
 * Names, job titles and company names (no leading keyword) stay as content.
 */
function headingKey(line: Line, g: LayoutGraph): string | null {
  const t = line.text.replace(/[:•·]\s*$/, '').trim()
  if (/@|https?:|\.com\b/.test(t)) return null // contact lines aren't headings
  const words = t.split(/\s+/)
  // Tier 0 — the line is essentially JUST a section name (a plain heading), so
  // accept it even when pdf.js gives no bold flag and it isn't all-caps.
  if (words.length <= 3 && !/\d/.test(t)) {
    for (const { key, re } of HEAD_PHRASES) {
      if (re.test(t) && t.replace(re, '').replace(/[^a-z]/gi, '').length <= 6) return key
    }
  }
  const shortStyled = words.length <= 5 && t.length <= 46 && (line.upper || line.bold || line.height >= g.bodySize * 1.14)
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

function splitSections(g: LayoutGraph): Section[] {
  const sections: Section[] = [{ key: 'header', title: '', lines: [] }]
  for (const line of g.lines) {
    const key = headingKey(line, g)
    if (key) sections.push({ key, title: line.text.replace(/[:\s]+$/, ''), lines: [] })
    else sections[sections.length - 1].lines.push(line)
  }
  return sections
}

/* ------------------------------------------------------------------- patterns */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+\/?/i
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i
const URL_RE = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.(?:dev|io|com|net|org|me|co|ai|app|tech|in|uk|page|site|xyz)(?:\/[^\s|,]*)?/i
const LOCATION_RE = /([A-Z][A-Za-z.'-]+(?:[ ][A-Z][A-Za-z.'-]+)*,\s*(?:[A-Z]{2}\b|[A-Z][A-Za-z]+))/
const GPA_RE = /\b([0-4]\.\d{1,2})\s*(?:\/\s*(?:4|5|10)(?:\.0+)?)?\s*(?:GPA|CGPA)?\b/i

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*'
const YEAR = '(?:19|20)\\d{2}'
const DATE_TOK = `(?:${MONTH}\\.?\\s*'?)?(?:\\d{1,2}[/.\\-]\\s*)?${YEAR}`
const PRESENT = '(?:present|current|now|ongoing|to date|till date|today)'
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

/* -------------------------------------------------------------- header fields */

function scoreName(line: Line): number {
  const t = line.text
  let s = 0
  if (/^[A-Za-z][A-Za-z .'-]+$/.test(t)) s += 3
  if (line.bold) s += 1
  if (/@/.test(t)) s -= 6
  if (/\d/.test(t)) s -= 4
  if (/https?:|\.com|linkedin|github/i.test(t)) s -= 6
  if (/,/.test(t)) s -= 2
  const words = t.split(/\s+/).length
  if (words >= 2 && words <= 4) s += 2
  if (t.length > 38) s -= 3
  return s
}

function parseHeader(header: Line[], content: ResumeContent) {
  const b = content.basics
  const blob = header.map((l) => l.text).join('  ·  ')

  b.email = header.map((l) => l.text).join(' ').match(EMAIL_RE)?.[0] ?? ''
  // phone: international — longest digit-run (9–15 digits) that isn't a year/ZIP
  const phoneCands = (blob.match(/\+?\d[\d().\-\s]{7,}\d/g) || [])
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
    (u) => !/linkedin|github/i.test(u) && !blob.includes('@' + u.replace(/^https?:\/\//, '')),
  )
  if (urls[0]) b.url = httpify(urls[0])

  const locM = blob.match(LOCATION_RE)
  if (locM) {
    const [city, region] = locM[1].split(',').map((s) => s.trim())
    b.location = { city, region }
  }

  // name = highest-scoring header line (ties broken by font size, then order)
  const named = [...header]
    .map((l, i) => ({ l, i, s: scoreName(l) }))
    .filter((x) => x.s > 0)
    .sort((a, c) => c.s - a.s || c.l.height - a.l.height || a.i - c.i)[0]
  if (named) {
    b.name = cleanEdge(named.l.text)
    // headline = the nearest following non-contact, letter-ish header line
    const after = header.slice(named.i + 1).find((l) => {
      const t = l.text
      return /[A-Za-z]/.test(t) && !EMAIL_RE.test(t) && !/\d{3}/.test(t) && !/https?:|\.com|,\s*[A-Z]{2}\b/.test(t) && t.length <= 60
    })
    if (after) b.label = cleanEdge(after.text)
  }
}

/* ------------------------------------------------------------- entry grouping */

/** Split a section's lines into entries by large vertical gaps (subsections). */
function toEntries(lines: Line[], g: LayoutGraph): Line[][] {
  const entries: Line[][] = []
  let cur: Line[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prev = lines[i - 1]
    const colJump = prev && (line.col !== prev.col || line.page !== prev.page)
    const bigGap = prev && !colJump && line.top - prev.top > g.lineGap * 1.55
    const newEntryHeader = prev && cur.length && !isBullet(line.text) && (line.bold || RANGE_RE.test(line.text)) && isBullet(prev.text)
    if (cur.length && (bigGap || colJump || newEntryHeader)) {
      entries.push(cur)
      cur = []
    }
    cur.push(line)
  }
  if (cur.length) entries.push(cur)
  return entries
}

function parseWork(lines: Line[], g: LayoutGraph): ResumeContent['work'] {
  return toEntries(lines, g).map((entry) => {
    const highlights: string[] = []
    const headerLines: string[] = []
    let start = '',
      end = '',
      location = ''
    for (const line of entry) {
      if (isBullet(line.text)) {
        highlights.push(esc(stripBullet(line.text)))
        continue
      }
      const d = pullDates(line.text)
      if (d.start && !start) {
        start = d.start
        end = d.end
      }
      let rest = d.rest
      const loc = rest.match(LOCATION_RE)
      if (loc && !location) {
        location = loc[1]
        rest = rest.replace(loc[0], '')
      }
      rest = cleanEdge(rest)
      if (rest) headerLines.push(rest)
      else if (highlights.length) {
        // a wrapped continuation of the last bullet
      }
    }
    // headerLines[0] = position, [1] = company (CVAurum renders position first)
    const [position = '', name = '', ...extra] = headerLines
    return {
      id: uid(),
      name: name || '',
      position: position || '',
      location,
      url: '',
      startDate: start,
      endDate: end,
      summary: extra.length ? esc(extra.join(' ')) : '',
      highlights,
    }
  }).filter((w) => w.position || w.name || w.highlights.length)
}

function parseEducation(lines: Line[], g: LayoutGraph): ResumeContent['education'] {
  return toEntries(lines, g).map((entry) => {
    const text = entry.map((l) => l.text).join(' · ')
    const d = pullDates(text)
    const gpa = text.match(GPA_RE)?.[1] ?? ''
    const loc = text.match(LOCATION_RE)?.[1] ?? ''
    const headerLines = entry.filter((l) => !isBullet(l.text)).map((l) => cleanEdge(pullDates(l.text).rest)).filter(Boolean)
    const degreeLine = headerLines.find((l) => /\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d|bachelor|master|associate|diploma|mba|b\.?tech|m\.?tech|b\.?e\.?\b)/i.test(l))
    const institution = headerLines.find((l) => l !== degreeLine) || headerLines[0] || ''
    return {
      id: uid(),
      institution: institution.replace(LOCATION_RE, '').replace(GPA_RE, '').trim() || '',
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
  }).filter((e) => e.institution || e.area)
}

function parseSkills(lines: Line[]): ResumeContent['skills'] {
  const groups: ResumeContent['skills'] = []
  let loose: string[] = []
  for (const line of lines) {
    const t = stripBullet(line.text)
    const m = t.match(/^([A-Za-z][A-Za-z /&+#.-]{1,28}):\s*(.+)$/)
    if (m) {
      const keywords = m[2].split(/[,;|•·]/).map((s) => s.trim()).filter(Boolean)
      if (keywords.length) groups.push({ id: uid(), name: m[1].trim(), level: '', keywords })
    } else {
      loose.push(...t.split(/[,;|•·]/).map((s) => s.trim()).filter(Boolean))
    }
  }
  loose = loose.filter((s) => s.length <= 40)
  if (loose.length) groups.push({ id: uid(), name: groups.length ? 'Additional' : 'Skills', level: '', keywords: loose })
  return groups
}

function parseProjects(lines: Line[], g: LayoutGraph): ResumeContent['projects'] {
  return toEntries(lines, g).map((entry) => {
    const highlights: string[] = []
    const headerLines: string[] = []
    let start = '', end = '', url = ''
    for (const line of entry) {
      if (isBullet(line.text)) { highlights.push(esc(stripBullet(line.text))); continue }
      const d = pullDates(line.text)
      if (d.start && !start) { start = d.start; end = d.end }
      let rest = d.rest
      const u = rest.match(URL_RE)
      if (u && !url) { url = u[0]; rest = rest.replace(u[0], '') }
      rest = cleanEdge(rest)
      if (rest) headerLines.push(rest)
    }
    const [name = '', description = ''] = headerLines
    return { id: uid(), name, description: description ? esc(description) : '', url: url ? (/^https?:/.test(url) ? url : 'https://' + url) : '', startDate: start, endDate: end, highlights, keywords: [] }
  }).filter((p) => p.name)
}

function parseSimpleList(lines: Line[], key: 'languages' | 'certificates' | 'awards' | 'interests') {
  const text = lines.map((l) => stripBullet(l.text)).filter(Boolean)
  if (key === 'languages') {
    return text.flatMap((t) => t.split(/[,;|]/)).map((s) => s.trim()).filter(Boolean).map((language) => ({ id: uid(), language: language.replace(/\s*\(.*\)$/, '').trim(), fluency: (language.match(/\(([^)]+)\)/)?.[1] || '').trim() }))
  }
  if (key === 'interests') {
    const kws = text.flatMap((t) => t.split(/[,;|•·]/)).map((s) => s.trim()).filter(Boolean)
    return kws.length ? [{ id: uid(), name: 'Interests', keywords: kws }] : []
  }
  if (key === 'certificates') return text.map((name) => ({ id: uid(), name, issuer: '', date: '', url: '' }))
  return text.map((title) => ({ id: uid(), title, awarder: '', date: '', summary: '' })) // awards
}

/* ------------------------------------------------------------------ assemble */

export interface ImportResult {
  content: ResumeContent
  meta: { pages: number; chars: number; sections: string[]; lowText: boolean }
}

const BLANK = (): ResumeContent => ({
  basics: { name: '', label: '', image: '', email: '', phone: '', url: '', summary: '', location: {}, profiles: [] },
  work: [], volunteer: [], education: [], awards: [], certificates: [], publications: [],
  skills: [], languages: [], interests: [], references: [], projects: [], custom: [],
})

export function parseLayout(g: LayoutGraph): ImportResult {
  const content = BLANK()
  const sections = splitSections(g)
  const header = sections.find((s) => s.key === 'header')
  if (header) parseHeader(header.lines, content)

  for (const sec of sections) {
    const lines = sec.lines.filter((l) => l.text.trim())
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
        content.awards.push(...(parseSimpleList(lines, 'awards') as ResumeContent['awards']))
        break
      case 'interests':
        content.interests.push(...(parseSimpleList(lines, 'interests') as ResumeContent['interests']))
        break
      default:
        if (sec.key.startsWith('custom:')) {
          const bullets = lines.filter((l) => isBullet(l.text)).map((l) => esc(stripBullet(l.text)))
          content.custom.push({
            id: uid(),
            name: sec.title || 'Section',
            items: [{ id: uid(), name: '', subtitle: '', date: '', location: '', url: '', summary: bullets.length ? '' : esc(lines.map((l) => l.text).join(' ')), highlights: bullets }],
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
      lowText: g.charCount < 80 * g.pageCount, // signals a scanned/Type3 PDF → v2 OCR path
    },
  }
}
