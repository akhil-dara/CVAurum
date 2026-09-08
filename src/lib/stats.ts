import type { ResumeDocument } from '@/types/document'
import { currentYearMonth, htmlToText } from '@/lib/utils'

/** A count followed by one of the nouns a reader recognises as a headline
 *  figure. One word may sit between them, so "3.2k project stars" and
 *  "12k monthly downloads" both read as the number and the noun. The
 *  thousands suffix must be a word on its own, so the "k" of "key" and the
 *  "m" of "monthly" are never read as part of the figure. */
const HEADLINE = /(\d[\d.,]*(?:\s*[kKmM]\b)?\+?)\s*(?:\w+\s+)?(stars|users|downloads|customers)/i

function months(ym: string): number | null {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(ym || '')
  return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null
}

export type StatKind = 'years' | 'companies' | 'projects' | 'certifications' | 'languages' | 'headline' | 'skills' | 'custom'
export interface Stat { value: string; label: string }
/** One tile of the band as the author configured it: which number, and
 *  the label or value they typed over the derived one. */
export interface StatTile { id: string; kind: StatKind; label?: string; value?: string }

type Content = ResumeDocument['content']
const has = (v?: string) => !!(v || '').trim()

/** What each kind calls itself, so a tile the author typed a number into
 *  still knows its own label when the content derives nothing. The
 *  headline figure names itself from the sentence it was found in, and a
 *  custom tile is named by the author, so neither has a standing word. */
const KIND_LABEL: Record<StatKind, string> = {
  years: 'years',
  companies: 'companies',
  projects: 'projects',
  certifications: 'certifications',
  languages: 'languages',
  skills: 'skills',
  headline: '',
  custom: '',
}

/** The derived value and default label for one kind, or null when the
 *  content has nothing for it. 'custom' has nothing to derive. */
export function deriveStat(kind: StatKind, content: Content, today: string = currentYearMonth()): Stat | null {
  switch (kind) {
    case 'years': {
      const starts = content.work.map((w) => months(w.startDate)).filter((n): n is number => n !== null)
      if (!starts.length) return null
      const ends = content.work.map((w) => months(w.endDate) ?? months(today) ?? 0)
      const years = Math.floor((Math.max(...ends) - Math.min(...starts)) / 12)
      return years >= 1 ? { value: `${years}+`, label: KIND_LABEL.years } : null
    }
    case 'companies': {
      const n = new Set(content.work.map((w) => (w.name || '').trim().toLowerCase()).filter(Boolean)).size
      return n ? { value: String(n), label: KIND_LABEL.companies } : null
    }
    case 'projects': {
      const n = content.projects.filter((p) => has(p.name)).length
      return n ? { value: String(n), label: KIND_LABEL.projects } : null
    }
    case 'certifications': {
      const n = content.certificates.filter((c) => has(c.name)).length
      return n ? { value: String(n), label: KIND_LABEL.certifications } : null
    }
    case 'languages': {
      const n = content.languages.filter((l) => has(l.language)).length
      return n ? { value: String(n), label: KIND_LABEL.languages } : null
    }
    case 'headline': {
      for (const p of content.projects) {
        const hit = [p.description, ...(p.highlights || [])].map((t) => HEADLINE.exec(htmlToText(t))).find(Boolean)
        if (hit) return { value: hit[1].replace(/\s+/g, ''), label: hit[2].toLowerCase() }
      }
      return null
    }
    case 'skills': {
      const n = content.skills.reduce((t, s) => t + (s.keywords?.length || 0), 0)
      return n ? { value: String(n), label: KIND_LABEL.skills } : null
    }
    case 'custom':
      return null
  }
}

/** The order the band draws when the author has not chosen: the years, the
 *  employers, a real figure the work carries, and last the count of listed
 *  keywords, the weakest fact in the band. */
export const DEFAULT_STAT_ORDER: StatKind[] = ['years', 'companies', 'headline', 'skills']

/** What the band draws. No list means the derived default; a list means
 *  exactly these tiles in this order, each with the author's label and
 *  value where typed and the derived ones where not. A tile whose value
 *  resolves to nothing is dropped; a label may be empty. Five at most. */
export function resolveStatTiles(content: Content, tiles: StatTile[] | undefined, today: string = currentYearMonth()): Stat[] {
  const list: StatTile[] = tiles ?? DEFAULT_STAT_ORDER.map((kind) => ({ id: kind, kind }))
  const out: Stat[] = []
  for (const t of list) {
    const derived = deriveStat(t.kind, content, today)
    const value = has(t.value) ? t.value!.trim() : derived?.value
    if (!value) continue
    const label = has(t.label) ? t.label!.trim() : derived?.label ?? KIND_LABEL[t.kind]
    out.push({ value, label })
    if (out.length === 5) break
  }
  return out
}

/** Up to four numbers a reader takes in at a glance, derived from the
 *  content so they are never typed twice (the band with no configuration). */
export function deriveStats(content: Content, today: string = currentYearMonth()): Stat[] {
  return resolveStatTiles(content, undefined, today)
}
