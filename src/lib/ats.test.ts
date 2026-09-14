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

/**
 * A document whose ONLY bullets are the ones under test.
 *
 * Every bullet in the document is read, not just the ones in `work`, so the
 * sample's own projects and volunteering would otherwise decide the answer.
 * The summary goes too: three of the rules read it as well as the bullets.
 */
const withBullets = (highlights: string[], summary = '') => {
  const d = doc({
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
  d.content.basics = { ...d.content.basics, summary }
  return d
}

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

  it('points at the group that has no name', () => {
    const skills = [
      { id: 's1', name: 'Languages', level: '', keywords: ['Go'] },
      { id: 's2', name: '', level: '', keywords: ['Kafka'] },
    ]
    expect(find(doc({ skills }), 'skillGroups').where).toEqual({ section: 'skills', entry: 1 })
  })
})

describe('location on a role', () => {
  it('points at the role that does not say where it was', () => {
    const role = (position: string, location: string) => ({
      id: position,
      name: 'Company',
      position,
      location,
      url: '',
      startDate: '2020-01',
      endDate: '',
      summary: '',
      highlights: [bullet('Cut deploys from forty minutes to four by moving the pipeline to GitOps.')],
    })
    const check = find(doc({ work: [role('Engineer', 'Austin, TX'), role('Analyst', '')] }), 'entryLocation')
    expect(check.status).toBe('warn')
    expect(check.where).toEqual({ section: 'work', entry: 1 })
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

describe('first-person pronouns', () => {
  it('flags a bullet that says "I", and points at that bullet', () => {
    const check = find(
      withBullets(['Cut deploys from forty minutes to four.', 'I rebuilt the billing pipeline over one quarter.']),
      'pronouns'
    )
    expect(check.status).toBe('warn')
    expect(check.where).toEqual({ section: 'work', entry: 0, bullet: 1 })
  })

  it('reads a pronoun in the summary as well as in a bullet', () => {
    const check = find(withBullets(['Cut deploys from forty minutes to four.'], 'My work is in payments infrastructure.'), 'pronouns')
    expect(check.status).toBe('warn')
    expect(check.where).toEqual({ section: 'summary' })
  })

  it('leaves a roman numeral alone, because "Title I school" is not a pronoun', () => {
    // Two real examples from the library; the first regex tried fired on both.
    expect(find(withBullets(['Taught third grade at a Title I school of 480 students.']), 'pronouns').status).toBe('pass')
    expect(find(withBullets(['Ran a CBSE school covering Classes I to XII and 1,860 students.']), 'pronouns').status).toBe('pass')
  })

  it('does not read the country "US" as the pronoun "us"', () => {
    expect(find(withBullets(['Led the US and EMEA rollout across 14 offices in one year.']), 'pronouns').status).toBe('pass')
  })

  it('fails a page written in the first person throughout', () => {
    const check = find(
      withBullets(['I led the migration to Kubernetes.', 'My team cut the deploy time.', 'We raised uptime to 99.9%.']),
      'pronouns'
    )
    expect(check.status).toBe('fail')
  })
})

describe('buzzwords', () => {
  it('asks for the evidence instead of "team player"', () => {
    const check = find(withBullets(['A team player who supported the release train every fortnight.']), 'buzzwords')
    expect(check.status).toBe('warn')
    expect(check.detail).toContain('team player')
    expect(check.where).toEqual({ section: 'work', entry: 0, bullet: 0 })
  })

  it('catches one in the summary too', () => {
    expect(find(withBullets(['Cut deploys from forty minutes to four.'], 'A detail-oriented engineer with eight years in payments and a bias for shipping.'), 'buzzwords').status).toBe('warn')
  })

  it('passes a page that claims nothing it cannot show', () => {
    expect(find(withBullets(['Cut deploys from forty minutes to four by moving the pipeline to GitOps.']), 'buzzwords').status).toBe('pass')
  })
})

describe('passive voice', () => {
  it('flags a bullet whose opening clause hides who did the work', () => {
    const check = find(withBullets(['The billing pipeline was rebuilt over a single quarter.']), 'passiveVoice')
    expect(check.status).toBe('warn')
    expect(check.where).toEqual({ section: 'work', entry: 0, bullet: 0 })
  })

  it('leaves a later clause alone, where the subject is somebody else', () => {
    // Measured on the 108 examples: 24 of the 25 raw matches looked like this,
    // and every one of them was correct English about a different subject.
    expect(find(withBullets(['Trained six supervisors, four of whom were promoted to run their own branches.']), 'passiveVoice').status).toBe('pass')
    expect(find(withBullets(['Logged four setting-out errors before concrete was poured.']), 'passiveVoice').status).toBe('pass')
    expect(find(withBullets(['Cleared a suspense balance that had been carried for three years.']), 'passiveVoice').status).toBe('pass')
  })

  it('leaves "is" and "are" alone, because on a résumé they are adjectives', () => {
    expect(find(withBullets(['The team is dedicated to a weekly release cadence and holds to it.']), 'passiveVoice').status).toBe('pass')
  })
})

describe('filler words', () => {
  it('flags "several" where a number belongs', () => {
    const check = find(withBullets(['Built several dashboards for the merchandising team over two quarters.']), 'filler')
    expect(check.status).toBe('warn')
    expect(check.detail).toContain('several')
    expect(check.where).toEqual({ section: 'work', entry: 0, bullet: 0 })
  })

  it('fails a page leaning on filler in most of its bullets', () => {
    const check = find(
      withBullets([
        'Built various dashboards for the merchandising team.',
        'Successfully delivered numerous reports each quarter.',
        'Ran a variety of workshops for the support team.',
      ]),
      'filler'
    )
    expect(check.status).toBe('fail')
  })

  it('passes bullets that give the number instead', () => {
    expect(find(withBullets(['Built nine dashboards that 40 category managers read every Monday.']), 'filler').status).toBe('pass')
  })
})

describe('where a check points', () => {
  it('counts bullets from the original list, so an empty row does not shift the index', () => {
    // An empty bullet still draws a row on the canvas; skipping it in the count
    // would put the reader's cursor one line above the problem.
    const check = find(withBullets(['Cut deploys from forty minutes to four.', '', 'I rebuilt the billing pipeline.']), 'pronouns')
    expect(check.where).toEqual({ section: 'work', entry: 0, bullet: 2 })
  })

  it('finds a bullet in projects and volunteering, not only in work', () => {
    const d = doc({
      work: [],
      custom: [],
      volunteer: [],
      projects: [
        {
          id: 'p0',
          name: 'Ledger',
          description: '',
          url: '',
          startDate: '',
          endDate: '',
          highlights: ['I wrote the parser over one weekend.'],
          keywords: [],
        },
      ],
    })
    expect(find(d, 'pronouns').where).toEqual({ section: 'projects', entry: 0, bullet: 0 })
  })
})

describe('the report as a whole', () => {
  it('puts the check worth fixing first', () => {
    const rank = { fail: 0, warn: 1, pass: 2 }
    const empty = createDocument({})
    const checks = analyzeResume(empty).checks
    for (let i = 1; i < checks.length; i++) {
      expect(rank[checks[i].status]).toBeGreaterThanOrEqual(rank[checks[i - 1].status])
    }
    expect(checks[0].status).not.toBe('pass')
  })

  it('scores each category on its own, so a reader can see which one is going wrong', () => {
    // A page whose writing is poor and whose structure is intact: the writing
    // ring must fall while the others hold.
    const good = withBullets([
      'Cut deploys from forty minutes to four by moving the pipeline to GitOps.',
      'Raised uptime to 99.98% across nine services in one quarter.',
      'Halved on-call pages by rewriting the four noisiest alerts.',
    ])
    const bad = withBullets([
      'I was responsible for various things.',
      'My team successfully delivered several projects.',
      'A team player, I really helped out as needed.',
    ])
    const a = analyzeResume(good, { pages: 1, bodyPt: 10.5 })
    const b = analyzeResume(bad, { pages: 1, bodyPt: 10.5 })
    expect(b.categoryScores.writing).toBeLessThan(a.categoryScores.writing - 30)
    expect(b.categoryScores.format).toBe(a.categoryScores.format)
  })


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
