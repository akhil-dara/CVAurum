import type { ResumeDocument } from '@/types/document'
import { currentYearMonth, htmlToText } from '@/lib/utils'

export interface Stat { value: string; label: string }

/** A count followed by one of the nouns a reader recognises as a headline
 *  figure. One word may sit between them, so "3.2k project stars" and
 *  "12k monthly downloads" both read as the number and the noun. */
const HEADLINE = /(\d[\d.,]*\s*[kKmM]?\+?)\s*(?:\w+\s+)?(stars|users|downloads|customers)/i

function months(ym: string): number | null {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(ym || '')
  return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null
}

/** Up to four numbers a reader takes in at a glance, derived from the
 *  content so they are never typed twice: years of experience, distinct
 *  employers, skills, and one headline number found in a project. Each is
 *  skipped when absent, so a thin resume shows a shorter band or none. */
export function deriveStats(content: ResumeDocument['content'], today: string = currentYearMonth()): Stat[] {
  const out: Stat[] = []
  const starts = content.work.map((w) => months(w.startDate)).filter((n): n is number => n !== null)
  if (starts.length) {
    const ends = content.work.map((w) => months(w.endDate) ?? months(today) ?? 0)
    const span = Math.max(...ends) - Math.min(...starts)
    const years = Math.floor(span / 12)
    if (years >= 1) out.push({ value: `${years}+`, label: 'years' })
  }
  const companies = new Set(content.work.map((w) => (w.name || '').trim().toLowerCase()).filter(Boolean)).size
  if (companies) out.push({ value: String(companies), label: 'companies' })
  const skills = content.skills.reduce((n, s) => n + (s.keywords?.length || 0), 0)
  if (skills) out.push({ value: String(skills), label: 'skills' })
  for (const p of content.projects) {
    const hit = [p.description, ...(p.highlights || [])].map((t) => HEADLINE.exec(htmlToText(t))).find(Boolean)
    if (hit) { out.push({ value: hit[1].replace(/\s+/g, ''), label: hit[2].toLowerCase() }); break }
  }
  return out
}
