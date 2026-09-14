import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { analyzeResume, type AtsCheck } from './ats'

/**
 * The analysis is the thing a person acts on before sending a résumé out, so
 * a rule that fires on the wrong document costs them an afternoon of edits
 * that made it worse. Each one is held to the case it is actually for.
 */

function doc(over: Partial<ResumeContent> = {}): ResumeDocument {
  const d = createDocument({ sample: true })
  d.content = { ...d.content, ...over }
  return d
}

const find = (d: ResumeDocument, id: string, measured = {}): AtsCheck => {
  const c = analyzeResume(d, measured).checks.find((x) => x.id === id)
  if (!c) throw new Error(`no check called "${id}"`)
  return c
}

const bullet = (text: string) => text

describe('the page count', () => {
  it('uses what the app measured rather than a guess at the word count', () => {
    const d = doc()
    // The same document, told two different truths about its own rendering.
    expect(analyzeResume(d, { pages: 1 }).pages).toBe(1)
    expect(analyzeResume(d, { pages: 3 }).pages).toBe(3)
  })

  it('still answers when nothing has measured it yet', () => {
    // Falls back to the old estimate rather than claiming zero pages.
    expect(analyzeResume(doc()).pages).toBeGreaterThanOrEqual(1)
  })

  it('allows a second page to a long history and questions it on a short one', () => {
    const long = doc({
      work: Array.from({ length: 4 }, (_, i) => ({
        id: `w${i}`,
        name: `Company ${i}`,
        position: 'Engineer',
        location: 'Austin, TX',
        url: '',
        startDate: '2018-01',
        endDate: '2020-01',
        summary: '',
        highlights: [bullet('Cut deploy time from forty minutes to four by moving the pipeline to GitOps.')],
      })),
    })
    const short = doc({
      work: [
        {
          id: 'w0',
          name: 'Company',
          position: 'Engineer',
          location: 'Austin, TX',
          url: '',
          startDate: '2022-01',
          endDate: '',
          summary: '',
          highlights: [bullet('Cut deploy time from forty minutes to four by moving the pipeline to GitOps.')],
        },
      ],
    })
    expect(find(long, 'pages', { pages: 2 }).status).toBe('pass')
    expect(find(short, 'pages', { pages: 2 }).status).toBe('warn')
    expect(find(short, 'pages', { pages: 3 }).status).toBe('fail')
  })
})

describe('the body text size', () => {
  it('judges the size the reader gets, not the size that was set', () => {
    const d = doc()
    d.metadata.typography.fontSize = 11
    // Magic fit shrank it to 8pt: the set size passes, the realised one must not.
    expect(find(d, 'bodySize').status).toBe('pass')
    expect(find(d, 'bodySize', { bodyPt: 8 }).status).toBe('fail')
    expect(find(d, 'bodySize', { bodyPt: 9 }).status).toBe('warn')
  })
})

describe('bullets per role', () => {
  const role = (position: string, n: number) => ({
    id: position,
    name: 'Company',
    position,
    location: 'Austin, TX',
    url: '',
    startDate: '2020-01',
    endDate: '',
    summary: '',
    highlights: Array.from({ length: n }, (_, i) => bullet(`Shipped thing number ${i}, cutting the wait by ${i + 2} days.`)),
  })

  it('passes a role carrying between two and six', () => {
    expect(find(doc({ work: [role('Engineer', 4)] }), 'bulletsPerRole').status).toBe('pass')
  })

  it('flags a role with one bullet, and says which role', () => {
    const check = find(doc({ work: [role('Engineer', 1)] }), 'bulletsPerRole')
    expect(check.status).toBe('warn')
    expect(check.detail).toContain('Engineer')
    expect(check.where).toEqual({ section: 'work', entry: 0 })
  })

  it('flags a role with more than six', () => {
    expect(find(doc({ work: [role('Engineer', 8)] }), 'bulletsPerRole').status).toBe('warn')
  })

  it('leaves a career break alone', () => {
    // On the page to explain a gap, not a job with nothing to say for itself.
    const work = [role('Engineer', 4), { ...role('Career break', 0) }]
    expect(find(doc({ work }), 'bulletsPerRole').status).toBe('pass')
  })
})

describe('dates', () => {
  it('fails an undated role and points at it', () => {
    const work = [
      {
        id: 'w0',
        name: 'Company',
        position: 'Engineer',
        location: 'Austin, TX',
        url: '',
        startDate: '',
        endDate: '',
        summary: '',
        highlights: [bullet('Cut the deploy from forty minutes to four by moving to GitOps.')],
      },
    ]
    const check = find(doc({ work }), 'dates')
    expect(check.status).toBe('fail')
    expect(check.where).toEqual({ section: 'work', entry: 0 })
  })
})

describe('the summary', () => {
  const withSummary = (words: number) => {
    const d = doc()
    d.content.basics = { ...d.content.basics, summary: Array.from({ length: words }, () => 'word').join(' ') }
    return d
  }

  it('passes two or three lines', () => {
    expect(find(withSummary(40), 'summaryLength').status).toBe('pass')
  })

  it('says a one-liner is too short and an essay too long', () => {
    expect(find(withSummary(12), 'summaryLength').status).toBe('fail')
    expect(find(withSummary(20), 'summaryLength').status).toBe('warn')
    expect(find(withSummary(120), 'summaryLength').status).toBe('fail')
  })
})

describe('skills', () => {
  it('passes named groups of a readable size', () => {
    const skills = [
      { id: 's1', name: 'Languages', level: '', keywords: ['Go', 'Python'] },
      { id: 's2', name: 'Systems', level: '', keywords: ['Kubernetes', 'Kafka'] },
    ]
    expect(find(doc({ skills }), 'skillGroups').status).toBe('pass')
  })

  it('warns about one unnamed heap of thirty', () => {
    const skills = [{ id: 's1', name: '', level: '', keywords: Array.from({ length: 30 }, (_, i) => `skill${i}`) }]
    expect(find(doc({ skills }), 'skillGroups').status).toBe('warn')
  })
})

describe('the LinkedIn link', () => {
  const withProfile = (url: string) => {
    const d = doc()
    d.content.basics = { ...d.content.basics, profiles: [{ network: 'LinkedIn', username: 'x', url }] }
    return d
  }

  it('passes the short form', () => {
    expect(find(withProfile('https://linkedin.com/in/marcus-whitfield'), 'linkedin').status).toBe('pass')
  })

  it('asks for the tracking tail to come off', () => {
    expect(find(withProfile('https://www.linkedin.com/in/marcus-whitfield/?originalSubdomain=uk'), 'linkedin').status).toBe(
      'warn'
    )
  })
})

describe('bullet writing', () => {
  // Every bullet in the document, not only the ones in `work`: the punctuation
  // rule reads projects and volunteering too, and the sample's own bullets
  // would otherwise decide the answer.
  const withBullets = (highlights: string[]) =>
    doc({
      projects: [],
      volunteer: [],
      custom: [],
      work: [
        {
          id: 'w0',
          name: 'Company',
          position: 'Engineer',
          location: 'Austin, TX',
          url: '',
          startDate: '2020-01',
          endDate: '',
          summary: '',
          highlights,
        },
      ],
    })

  it('calls out a bullet too short to carry a result', () => {
    const check = find(withBullets(['Improved performance.', 'Cut the deploy from forty minutes to four.']), 'bulletDepth')
    expect(check.status).toBe('warn')
    expect(check.detail).toContain('Improved performance')
  })

  it('accepts bullets that all end the same way, either way', () => {
    const all = ['Cut deploys from forty minutes to four.', 'Raised uptime to 99.98% across nine services.', 'Halved the on-call pages in one quarter.']
    expect(find(withBullets(all), 'punctuation').status).toBe('pass')
    expect(find(withBullets(all.map((b) => b.replace(/\.$/, ''))), 'punctuation').status).toBe('pass')
  })

  it('flags half and half', () => {
    const mixed = [
      'Cut deploys from forty minutes to four.',
      'Raised uptime to 99.98% across nine services',
      'Halved the on-call pages in one quarter.',
      'Moved sixteen services onto a shared contract',
    ]
    expect(find(withBullets(mixed), 'punctuation').status).toBe('fail')
  })
})

describe('the report as a whole', () => {
  it('files every check under a category a reader can act on', () => {
    for (const check of analyzeResume(doc()).checks) {
      expect(['content', 'writing', 'format'], check.id).toContain(check.category)
    }
  })

  it('scores the sample résumé well, since it is what the product recommends', () => {
    // If the document this app ships as its own example cannot score well
    // against its own analysis, one of the two is wrong.
    expect(analyzeResume(doc(), { pages: 1, bodyPt: 10.5 }).score).toBeGreaterThanOrEqual(80)
  })

  it('never returns a score outside 0-100', () => {
    const empty = createDocument({})
    const score = analyzeResume(empty).score
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
