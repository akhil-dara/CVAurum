import type { Metadata } from '@/types/metadata'
import type { LibrarySample } from './types'

/**
 * The style options the sample library shows, one per sample.
 *
 * 98 of the 108 samples printed their design exactly as it ships, so the
 * options the editor offers - contact pills, the labelled strip, headings on
 * a rail, dates in the company line, link tags, numbered sections - appeared
 * on none of them (2026-10-24). Each sample now wears at most one option, on
 * top of its design: picked from the slug, so it never moves when a sample is
 * added; skipped where the design states the same thing its own way; and
 * named on the sample's page so a reader knows it is there to be had.
 *
 * Pure data and pure functions: the build's SEO step compiles the library
 * for Node.
 */
export interface ShowcasePreset {
  id: string
  /** What the sample's page says it is styled with. */
  labels: string[]
  /** False where the design already states this its own way, or cannot
   *  take it (a rail needs a single column). */
  fits: (m: Metadata) => boolean
  apply: (m: Metadata) => void
}

const skills = (m: Metadata) => (m.layout.sectionSettings ??= {}).skills ?? ((m.layout.sectionSettings!.skills = {}), m.layout.sectionSettings!.skills!)

export const SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: 'pills',
    labels: ['Contact pills', 'Skill chips'],
    fits: (m) => m.layout.contactStyle === 'inline' && m.layout.contactPlacement === 'below',
    apply: (m) => {
      m.layout.contactStyle = 'pills'
      skills(m).skillsStyle = 'chips'
    },
  },
  {
    id: 'strip',
    labels: ['Labelled contact strip'],
    fits: (m) => m.layout.contactStyle === 'inline' && m.layout.contactPlacement === 'below',
    apply: (m) => {
      m.layout.contactStyle = 'strip'
    },
  },
  {
    id: 'rail',
    labels: ['Headings on a rail'],
    fits: (m) => m.layout.columns === 1 && m.layout.headingPlacement === 'above',
    apply: (m) => {
      m.layout.headingPlacement = 'side'
      m.layout.sideHeadingStyle = 'rail'
    },
  },
  {
    id: 'inline-dates',
    labels: ['Dates in the company line'],
    fits: (m) => (m.layout.dateAlign ?? 'right') === 'right',
    apply: (m) => {
      m.layout.dateAlign = 'inline'
    },
  },
  {
    id: 'numbered',
    labels: ['Numbered sections'],
    fits: (m) => !m.layout.sectionNumbers,
    apply: (m) => {
      m.layout.sectionNumbers = true
      m.layout.sectionNumberStyle = 'padded'
    },
  },
  {
    id: 'beside',
    labels: ['Contacts beside the name'],
    fits: (m) => m.layout.columns === 1 && m.layout.contactPlacement === 'below' && m.layout.contactStyle === 'inline',
    apply: (m) => {
      m.layout.contactPlacement = 'beside'
      m.layout.contactStyle = 'stacked'
    },
  },
]

/** The rotation: every option once, and the design as it ships twice. */
const ROTATION: (string | null)[] = [...SHOWCASE_PRESETS.map((p) => p.id), null, null]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The option a sample wears, given the metadata its design gives it; null
 *  for the design as it ships. Walks on from the slug's pick to the next
 *  option the design can take, so one that cannot is not simply skipped. */
export function showcaseFor(slug: string, m: Metadata): ShowcasePreset | null {
  const start = hash(slug) % ROTATION.length
  for (let i = 0; i < ROTATION.length; i++) {
    const id = ROTATION[(start + i) % ROTATION.length]
    if (id === null) return null
    const p = SHOWCASE_PRESETS.find((x) => x.id === id)!
    if (p.fits(m)) return p
  }
  return null
}

/** A sample wearing its option: the option before the sample's own polish,
 *  which still has the last word. What it is called is doc.ts sampleStyle. */
export function withShowcase(s: LibrarySample): LibrarySample {
  return {
    ...s,
    tweaks: (m: Metadata) => {
      showcaseFor(s.slug, m)?.apply(m)
      s.tweaks?.(m)
    },
  }
}
