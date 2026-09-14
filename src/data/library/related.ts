import { LIBRARY } from './index'
import type { LibrarySample } from './types'

/**
 * The examples nearest this one, best first.
 *
 * Nearness is scored rather than sorted by one field, because the reader who
 * has just read a mid-level data analyst résumé written for India is looking
 * for a neighbour on at least two of those three axes, not for every sample
 * that happens to share a shelf. A shared keyword counts too: it is the one
 * signal that crosses shelves, and "SQL" is exactly how an analyst finds the
 * analytics engineer next door.
 */
export function relatedSamples(slug: string, limit = 6): LibrarySample[] {
  const self = LIBRARY.find((s) => s.slug === slug)
  if (!self) return []
  const own = new Set(self.keywords.map((k) => k.toLowerCase()))
  const scored = LIBRARY.filter((s) => s.slug !== slug).map((s) => {
    let score = 0
    if (s.category === self.category) score += 4
    if (s.seniority === self.seniority) score += 2
    if (s.region === self.region) score += 1
    score += s.keywords.filter((k) => own.has(k.toLowerCase())).length * 2
    return { s, score }
  })
  return scored
    // Ties broken by slug so the row is the same on every render and every
    // build — a related row that reshuffled would change the pre-rendered
    // HTML on every deploy for no reason.
    .sort((a, b) => b.score - a.score || a.s.slug.localeCompare(b.s.slug))
    .slice(0, limit)
    .map((x) => x.s)
}

/** What a sample is made of, counted rather than claimed — the panel on its
 *  page says how the résumé is built, and every figure there is derived from
 *  the document itself so it can never drift from what the preview shows. */
export function sampleShape(s: LibrarySample): {
  roles: number
  bullets: number
  quantified: number
  skillGroups: number
  sections: string[]
  words: number
} {
  const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const c = s.content
  const bullets = [
    ...c.work.flatMap((w) => w.highlights ?? []),
    ...c.projects.flatMap((p) => p.highlights ?? []),
    ...c.volunteer.flatMap((v) => v.highlights ?? []),
  ].map(plain)
  const sections: [string, number][] = [
    ['Summary', c.basics.summary ? 1 : 0],
    ['Experience', c.work.length],
    ['Education', c.education.length],
    ['Projects', c.projects.length],
    ['Skills', c.skills.length],
    ['Certifications', c.certificates.length],
    ['Awards', c.awards.length],
    ['Publications', c.publications.length],
    ['Volunteering', c.volunteer.length],
    ['Languages', c.languages.length],
    ['Interests', c.interests.length],
  ]
  const words = [plain(c.basics.summary ?? ''), ...bullets, ...c.work.map((w) => plain(w.summary ?? ''))]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return {
    roles: c.work.length,
    bullets: bullets.length,
    quantified: bullets.filter((b) => /\d/.test(b)).length,
    skillGroups: c.skills.length,
    sections: sections.filter(([, n]) => n > 0).map(([name]) => name),
    words,
  }
}
