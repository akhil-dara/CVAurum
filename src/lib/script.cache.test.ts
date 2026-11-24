import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createDocument } from '@/data/defaults'

// Counts every visible-text pass documentScript makes.
const calls = vi.hoisted(() => ({ n: 0 }))
vi.mock('@/lib/atsText', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/atsText')>()
  return {
    ...real,
    resumeToAtsText: (...args: Parameters<typeof real.resumeToAtsText>) => {
      calls.n++
      return real.resumeToAtsText(...args)
    },
  }
})

const { documentScript } = await import('./script')

describe('documentScript is cheap for every keystroke', () => {
  beforeEach(() => {
    calls.n = 0
  })

  it('never builds the visible text of a resume with no Arabic-script character', () => {
    const d = createDocument()
    d.content.basics.name = 'Alex Morgan'
    d.content.basics.summary = '<p>Café owner, naïve façade, Ünïcödé</p>'
    expect(documentScript(d)).toEqual({ arabic: false, persian: false })
    expect(calls.n).toBe(0)
  })

  it('reads one content object once, however many callers ask', () => {
    const d = createDocument()
    d.content.basics.name = 'علیرضا'
    expect(documentScript(d)).toEqual({ arabic: true, persian: false })
    expect(documentScript({ content: d.content, metadata: d.metadata })).toEqual({ arabic: true, persian: false })
    expect(calls.n).toBe(1)
  })

  it('reads again when the content or the metadata is a new object', () => {
    const d = createDocument()
    d.content.basics.name = 'علیرضا'
    documentScript(d)
    const next = structuredClone(d)
    next.metadata.layout.hidden = [...next.metadata.layout.hidden]
    documentScript(next)
    documentScript({ content: d.content, metadata: next.metadata })
    expect(calls.n).toBe(3)
  })

  it('still reads a Persian heading the author wrote in the metadata', () => {
    const d = createDocument()
    d.content.basics.name = 'Alex Morgan'
    const key = d.metadata.layout.main[0]
    d.metadata.layout.headings = { ...d.metadata.layout.headings, [key]: 'تجربه' }
    // Whatever the ATS text makes of it, the fast scan must not answer "no"
    // for a page whose metadata holds Arabic letters: it hands it on.
    documentScript(d)
    expect(calls.n).toBe(1)
  })
})
