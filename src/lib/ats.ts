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

export type CheckStatus = 'pass' | 'warn' | 'fail'
export interface AtsCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  weight: number
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

/** Plain text of the whole resume, for keyword matching & counts. */
export function extractResumeText(doc: ResumeDocument): string {
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

function allBullets(c: ResumeContent): string[] {
  const out: string[] = []
  c.work.forEach((w) => out.push(...w.highlights.map(htmlToText)))
  c.projects.forEach((p) => out.push(...p.highlights.map(htmlToText)))
  c.volunteer.forEach((v) => out.push(...v.highlights.map(htmlToText)))
  c.custom.forEach((s) => s.items.forEach((i) => out.push(...(i.highlights ?? []).map(htmlToText))))
  return out.filter((b) => b.trim().length > 0)
}

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

export function analyzeResume(doc: ResumeDocument): AtsReport {
  const c = doc.content
  const text = extractResumeText(doc)
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const bullets = allBullets(c)
  const quantified = bullets.filter((b) => /\d|%|\$|€|£/.test(b)).length
  const tpl = getTemplate(doc.metadata.template)

  const checks: AtsCheck[] = []
  const push = (id: string, label: string, status: CheckStatus, detail: string, weight = 1) =>
    checks.push({ id, label, status, detail, weight })

  // contact
  const hasEmail = !!c.basics.email
  const hasPhone = !!c.basics.phone
  push(
    'contact',
    'Contact details',
    hasEmail && hasPhone ? 'pass' : hasEmail || hasPhone ? 'warn' : 'fail',
    hasEmail && hasPhone ? 'Email and phone are present.' : 'Add both an email and a phone number so recruiters can reach you.',
    2
  )

  push('summary', 'Professional summary', sectionHasContent('summary', c) ? 'pass' : 'warn', sectionHasContent('summary', c) ? 'A summary helps recruiters and ATS keyword-match instantly.' : 'Add a 2–3 line summary with your title and top skills.', 1)

  push('work', 'Work experience', c.work.length ? 'pass' : 'fail', c.work.length ? `${c.work.length} role(s) listed.` : 'Add at least one work experience entry.', 2)
  push('education', 'Education', c.education.length ? 'pass' : 'warn', c.education.length ? 'Education is present.' : 'Most ATS expect an education section.', 1)
  push('skills', 'Skills section', c.skills.length ? 'pass' : 'warn', c.skills.length ? 'Skills present — great for keyword matching.' : 'Add a skills section; ATS keyword-match heavily on it.', 1.5)

  // quantified achievements
  const quantRate = bullets.length ? quantified / bullets.length : 0
  push(
    'quantified',
    'Quantified impact',
    bullets.length === 0 ? 'warn' : quantRate >= 0.4 ? 'pass' : quantRate >= 0.2 ? 'warn' : 'fail',
    bullets.length === 0 ? 'Add bullet points describing your achievements.' : `${quantified} of ${bullets.length} bullets include a number or metric. Aim for ~50%.`,
    1.5
  )

  // action verbs
  const weakStarts = bullets.filter((b) => {
    const first = b.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    return WEAK_STARTS.has(first)
  }).length
  const strongStarts = bullets.filter((b) => ACTION_VERBS.has(b.trim().split(/\s+/)[0]?.toLowerCase() ?? '')).length
  if (bullets.length) {
    push(
      'verbs',
      'Strong action verbs',
      weakStarts === 0 ? 'pass' : weakStarts <= 2 ? 'warn' : 'fail',
      weakStarts === 0 ? `${strongStarts} bullets start with strong verbs.` : `${weakStarts} bullet(s) start with weak phrases like "responsible for". Lead with action verbs.`,
      1
    )
  }

  // length
  const idealLen = wordCount >= 350 && wordCount <= 850
  push(
    'length',
    'Length',
    idealLen ? 'pass' : wordCount < 200 ? 'fail' : 'warn',
    `${wordCount} words. Aim for ~400–800 for a focused 1–2 page resume.`,
    1
  )

  // ATS-safe template
  push(
    'template',
    'ATS-safe layout',
    tpl.atsSafe ? 'pass' : 'warn',
    tpl.atsSafe ? `“${tpl.name}” parses cleanly in ATS.` : `“${tpl.name}” is visually rich; some strict ATS may misread it. Prefer an ATS-safe template if applying to large companies.`,
    1.5
  )

  // photo warning (some ATS choke on images / headshots)
  if (doc.metadata.layout.showPhoto && c.basics.image) {
    push('photo', 'Photo', 'warn', 'A photo can confuse some ATS and invite bias screening in the US/UK. Consider hiding it for ATS-heavy applications.', 0.5)
  }

  // custom (non-standard) section names
  const renamed = Object.keys(doc.metadata.layout.headings ?? {}).length
  if (renamed) {
    push('headings', 'Standard headings', 'warn', 'You renamed some section headings. Keep standard names (Experience, Education, Skills) so ATS recognises them.', 0.5)
  }

  // score
  const totalWeight = checks.reduce((s, c2) => s + c2.weight, 0)
  const earned = checks.reduce((s, c2) => s + c2.weight * (c2.status === 'pass' ? 1 : c2.status === 'warn' ? 0.55 : 0), 0)
  const score = Math.round((earned / Math.max(1, totalWeight)) * 100)

  // page estimate (rough): ~520 words/page at default density.
  const pages = Math.max(1, Math.round(wordCount / 520) || 1)

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

  return { score, checks, wordCount, bulletCount: bullets.length, quantifiedCount: quantified, pages, jd }
}
