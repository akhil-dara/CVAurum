import type { ResumeDocument } from '@/types/document'

/** What the rail draws beside an entry: tall numerals and a word. */
export interface RailLabel { year: string; word: string }
/** The parts of an entry the rail reads. Every dated section - work,
 *  education, projects, volunteering and a custom item - carries some of
 *  these, so one shape covers them all. */
export type RailEntry = { startDate?: string; endDate?: string; date?: string; status?: string; rail?: { year?: string; word?: string } }

const yearOf = (v?: string): string => {
  const m = /^(\d{4})/.exec((v || '').trim())
  return m ? m[1] : ''
}
const ym = (v?: string): number | null => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec((v || '').trim())
  return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null
}

/** Whether a course is still ahead of the reader rather than in hand: the
 *  author said so, or the finish is later than today, or there is no
 *  finish at all and the author never marked it done. */
function courseAhead(entry: RailEntry, today: string): boolean {
  if (entry.status === 'pursuing') return true
  const end = ym(entry.endDate)
  if (end !== null) return end > (ym(today) ?? 0)
  return entry.status !== 'completed'
}

/** The rail's year and word for one entry: the author's where set, else
 *  the start year (or the finish year when that is all there is) and a
 *  word by section. Null when there is no year to show, so the rail draws
 *  nothing beside an undated entry. The word is set in capitals by the
 *  stylesheet; it is stored as the author typed it. */
export function railLabel(sectionKey: string, entry: RailEntry, today: string): RailLabel | null {
  const start = entry.startDate || entry.date
  const year = (entry.rail?.year || '').trim() || yearOf(start) || yearOf(entry.endDate)
  if (!year) return null
  if (entry.rail?.word !== undefined) return { year, word: entry.rail.word }
  switch (sectionKey) {
    case 'education':
      return { year, word: courseAhead(entry, today) ? 'Expected' : 'Graduated' }
    case 'work':
    case 'volunteer': {
      const endYear = yearOf(entry.endDate)
      return { year, word: endYear ? `to ${endYear}` : 'to now' }
    }
    case 'projects':
      return { year, word: 'Project' }
    default:
      return { year, word: '' }
  }
}

/** Whether any entry gives the rail a year to draw. The gutter opens on
 *  this rather than on "some entry has a start date", so a course with
 *  only an expected finish still opens it. */
export function hasRailYear(content: ResumeDocument['content'], today: string): boolean {
  const lists: [string, RailEntry[]][] = [
    ['work', content.work ?? []],
    ['education', content.education ?? []],
    ['projects', content.projects ?? []],
    ['volunteer', content.volunteer ?? []],
    ...(content.custom ?? []).map((s) => ['custom', s.items ?? []] as [string, RailEntry[]]),
  ]
  return lists.some(([key, entries]) => entries.some((e) => railLabel(key, e, today) !== null))
}
