import { describe, expect, it } from 'vitest'
import { fromJsonResume, richToPlain, toJsonResume } from './io'
import { createDocument, markSeeded, withoutSeeded } from '@/data/defaults'
import { SAMPLE_CONTENT } from '@/data/sample'
import type { JsonResumeExport, ResumeDocument } from '@/types/document'

const sampleDoc = () => createDocument({ sample: true, content: structuredClone(SAMPLE_CONTENT), title: 'T' })

/** Every string in a document's content, with the path that holds it. */
function strings(value: unknown, path = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === 'string') {
    if (value.trim()) out.push([path, value])
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => strings(v, `${path}[${i}]`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) strings(v, path ? `${path}.${k}` : k, out)
  }
  return out
}

/* ------------------------------------------------------------- plain text */

describe('richToPlain — the text a reader would copy', () => {
  it('drops tags and keeps the words', () => {
    expect(richToPlain('<p>Senior engineer with <strong>8+ years</strong> of practice.</p>')).toBe(
      'Senior engineer with 8+ years of practice.'
    )
  })

  it('makes a line break of <br> and of the end of a block', () => {
    expect(richToPlain('<p>One</p><p>Two</p>')).toBe('One\nTwo')
    expect(richToPlain('First<br>Second')).toBe('First\nSecond')
  })

  it('folds those same breaks to spaces in a single-line field', () => {
    expect(richToPlain('<p>One</p><p>Two</p>', 'line')).toBe('One Two')
  })

  it('separates list items instead of running them together', () => {
    expect(richToPlain('<ul><li>Alpha</li><li>Beta</li></ul>')).toBe('Alpha\nBeta')
  })

  it('decodes entities, including an escaped one', () => {
    expect(richToPlain('<p>R&amp;D &mdash; 5&nbsp;years &#8212; &lt;b&gt;bold&lt;/b&gt;</p>')).toBe(
      'R&D — 5 years — <b>bold</b>'
    )
  })

  it('leaves plain text exactly as it is', () => {
    expect(richToPlain('Already plain.')).toBe('Already plain.')
    expect(richToPlain('')).toBe('')
    expect(richToPlain(undefined)).toBe('')
  })
})

describe('the JSON boundary carries no markup', () => {
  it('no exported field contains a tag', () => {
    const out = toJsonResume(sampleDoc()) as unknown as Record<string, unknown>
    const { meta: _meta, ...content } = out
    const tagged = strings(content).filter(([, v]) => /<[a-z/][^>]*>/i.test(v))
    expect(tagged).toEqual([])
  })

  it('the summary and a bolded bullet arrive as words', () => {
    const out = toJsonResume(sampleDoc())
    expect(out.basics.summary?.startsWith('Senior software engineer with 8+ years')).toBe(true)
    expect(out.work[0].highlights?.[0]).toContain('serving 2.4M customers')
    expect(JSON.stringify(out.work)).not.toContain('<strong>')
  })

  it('flattens every rich field there is, not just the famous two', () => {
    const doc = sampleDoc()
    const c = doc.content
    c.basics.summary = '<p>Summary</p>'
    c.work[0].summary = '<p>Work summary</p>'
    c.work[0].highlights = ['<em>Work bullet</em>']
    c.education[0].summary = '<p>Education summary</p>'
    c.volunteer = [
      {
        id: 'v1',
        organization: 'Org',
        position: 'Role',
        url: '',
        startDate: '',
        endDate: '',
        summary: '<p>Volunteer summary</p>',
        highlights: ['<b>V</b>'],
      },
    ]
    c.projects[0].description = '<p>Project description</p>'
    c.projects[0].highlights = ['<strong>Project bullet</strong>']
    c.awards[0].summary = '<p>Award summary</p>'
    c.publications = [
      { id: 'p1', name: 'Paper', publisher: '', releaseDate: '', url: '', summary: '<p>Publication summary</p>' },
    ]
    c.custom = [
      {
        id: 'cs1',
        name: 'Extras',
        items: [
          {
            id: 'ci1',
            name: 'Thing',
            subtitle: '',
            date: '',
            location: '',
            url: '',
            summary: '<p>Custom summary</p>',
            highlights: ['<i>Custom bullet</i>'],
          },
        ],
      },
    ]
    const out = toJsonResume(doc) as unknown as Record<string, unknown>
    const { meta: _meta, ...content } = out
    expect(strings(content).filter(([, v]) => v.includes('<'))).toEqual([])
    const flat = JSON.stringify(content)
    for (const word of [
      'Summary',
      'Work summary',
      'Work bullet',
      'Education summary',
      'Volunteer summary',
      'Project description',
      'Project bullet',
      'Award summary',
      'Publication summary',
      'Custom summary',
      'Custom bullet',
    ]) {
      expect(flat).toContain(word)
    }
  })
})

describe('the round trip stays exact', () => {
  it('importing what we export gives back the same visible resume', () => {
    const doc = sampleDoc()
    const back = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(doc))))
    // Field for field identical to the author's own document — which is the
    // document minus the values an example seeded into fields it never shows.
    expect(back.content).toEqual(withoutSeeded(doc).content)
    expect(back.content.basics.summary).toContain('<strong>8+ years</strong>')
    expect(back.content.work[0].highlights[0]).toContain('<strong>2.4M</strong>')
  })

  it('survives a second lap unchanged', () => {
    const doc = sampleDoc()
    const once = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(doc))))
    const twice = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(once))))
    expect(twice.content).toEqual(once.content)
  })

  it('a plain JSON Resume from elsewhere keeps its plain text', () => {
    const back = fromJsonResume({
      basics: { name: 'Sam Reed', summary: 'Plain summary, no markup.' },
      work: [{ name: 'Acme', position: 'Engineer', highlights: ['Shipped a thing.'] }],
    })
    expect(back.content.basics.summary).toBe('Plain summary, no markup.')
    expect(back.content.work[0].highlights[0]).toBe('Shipped a thing.')
  })

  it('a consumer who rewrote the plain text keeps their words, not our markup', () => {
    const doc = sampleDoc()
    const file = JSON.parse(JSON.stringify(toJsonResume(doc))) as JsonResumeExport
    file.basics.summary = 'A consumer rewrote this line entirely.'
    const back = fromJsonResume(file)
    expect(back.content.basics.summary).toBe('A consumer rewrote this line entirely.')
  })

  it('reordering the entries cannot move one entry’s formatting onto another', () => {
    const doc = sampleDoc()
    doc.content.work[0].summary = '<p>The <strong>first</strong> role.</p>'
    doc.content.work[1].summary = '<p>The second role.</p>'
    const file = JSON.parse(JSON.stringify(toJsonResume(doc))) as JsonResumeExport
    file.work = [file.work[1], file.work[0]]
    const back = fromJsonResume(file)
    // Each entry keeps its OWN markup at its new position: the map keys on the
    // entry's id, so index 0 gets the second role's line, bold and all.
    expect(back.content.work[0].summary).toBe('<p>The second role.</p>')
    expect(back.content.work[1].summary).toBe('<p>The <strong>first</strong> role.</p>')
  })

  it('an entry whose words were rewritten loses its stale markup, not its words', () => {
    const doc = sampleDoc()
    doc.content.work[0].summary = '<p>The <strong>first</strong> role.</p>'
    const file = JSON.parse(JSON.stringify(toJsonResume(doc))) as JsonResumeExport
    file.work[0].summary = 'Rewritten by a consumer.'
    expect(fromJsonResume(file).content.work[0].summary).toBe('Rewritten by a consumer.')
  })
})

/* ------------------------------------------------------ seeded provenance */

describe('values an example seeded never leave as the author’s own', () => {
  it('a new resume from an example marks the quiet fields, and only those', () => {
    const doc = sampleDoc()
    expect(doc.seeded).toBeDefined()
    expect(Object.keys(doc.seeded!).length).toBeGreaterThan(0)
    for (const path of Object.keys(doc.seeded!)) expect(path.endsWith('.url')).toBe(true)
    // nothing the page prints is marked
    expect(Object.keys(doc.seeded!).some((p) => p.startsWith('basics'))).toBe(false)
  })

  it('a blank resume is marked with nothing', () => {
    expect(createDocument({}).seeded).toBeUndefined()
  })

  it('the example’s company link never reaches the JSON', () => {
    const doc = sampleDoc()
    expect(doc.content.work[0].url).toBeTruthy()
    const out = toJsonResume(doc)
    expect(out.work[0].url).toBe('')
    expect(JSON.stringify(out)).not.toContain(doc.content.work[0].url)
  })

  it('a link the AUTHOR typed is exported, because the mark stopped applying', () => {
    const doc = sampleDoc()
    doc.content.work[0].url = 'https://my-own-employer.example'
    expect(toJsonResume(doc).work[0].url).toBe('https://my-own-employer.example')
  })

  it('no seeded value survives any exporter once the author clears the visible fields', () => {
    const doc = sampleDoc()
    // The author starts from an example and empties everything they can SEE:
    // every field the page prints. What is left is exactly what they never saw.
    const c = doc.content
    c.basics = { ...c.basics, name: 'Sam Reed', label: '', email: '', phone: '', url: '', summary: '', profiles: [] }
    const blankEntry = (o: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(o)) {
        if (k === 'id' || k === 'url') continue
        if (typeof v === 'string') o[k] = ''
        else if (Array.isArray(v)) o[k] = []
      }
    }
    for (const key of ['work', 'education', 'volunteer', 'awards', 'certificates', 'publications', 'projects'] as const) {
      for (const it of c[key] as Array<Record<string, unknown>>) blankEntry(it)
    }
    c.skills = []
    c.languages = []
    c.interests = []
    c.references = []
    c.custom = []

    const exported = JSON.stringify(toJsonResume(doc))
    const stripped = withoutSeeded(doc)
    for (const seed of Object.values(doc.seeded!)) {
      expect(seed).toBeTruthy()
      expect(exported).not.toContain(seed)
      // and the shared strip every other exporter goes through agrees
      expect(JSON.stringify(stripped.content)).not.toContain(seed)
    }
  })

  it('the provenance map itself is never exported', () => {
    const out = JSON.stringify(toJsonResume(sampleDoc()))
    expect(out).not.toContain('seeded')
    expect(withoutSeeded(sampleDoc()).seeded).toBeUndefined()
  })

  it('a mark survives a save and reload, because it is part of the document', () => {
    const doc = sampleDoc()
    const reloaded = JSON.parse(JSON.stringify(doc)) as ResumeDocument
    expect(reloaded.seeded).toEqual(doc.seeded)
    expect(toJsonResume(reloaded).work[0].url).toBe('')
  })

  it('marks key on the entry’s own id, so reordering cannot strip the wrong link', () => {
    const doc = sampleDoc()
    doc.content.work[0].url = 'https://typed-by-the-author.example'
    doc.content.work = [doc.content.work[1], doc.content.work[0]]
    const out = toJsonResume(doc)
    expect(out.work[1].url).toBe('https://typed-by-the-author.example')
  })

  it('markSeeded reads the quiet fields of any content', () => {
    const marks = markSeeded({
      ...structuredClone(SAMPLE_CONTENT),
      work: [
        {
          id: 'w9',
          name: 'X',
          position: 'Y',
          location: '',
          url: 'https://x.example',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: [],
        },
      ],
    })
    expect(marks['work.w9.url']).toBe('https://x.example')
  })
})
