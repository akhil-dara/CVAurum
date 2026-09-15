import { describe, expect, it } from 'vitest'
import {
  LEFT_MIN,
  MIN_WORD_LENGTH,
  RIGHT_MIN,
  SOFT_HYPHEN,
  hyphenationPoints,
  isHyphenatable,
  softHyphenateProse,
  softHyphenateText,
  softHyphenateWord,
  stripSoftHyphens,
} from './hyphenate'
import { EN_EXCEPTIONS, EN_PATTERNS } from './hyphenPatterns'
import { LIBRARY } from '@/data/library'

/** "hy-phen-ation" from `[2, 6]`, so a failure reads as words, not offsets. */
const spell = (word: string): string => {
  const points = hyphenationPoints(word)
  let out = ''
  let prev = 0
  for (const p of points) {
    out += word.slice(prev, p) + '-'
    prev = p
  }
  return out + word.slice(prev)
}

describe('the pattern data', () => {
  it('carries the published set, all ASCII, with its exceptions', () => {
    const patterns = EN_PATTERNS.split(' ')
    expect(patterns.length).toBe(4938)
    expect(patterns.every((p) => /^[.a-z0-9]+$/.test(p))).toBe(true)
    expect(EN_EXCEPTIONS.split(' ').length).toBe(14)
  })
})

describe('hyphenationPoints', () => {
  it('breaks words where the published patterns say', () => {
    expect(spell('hyphenation')).toBe('hy-phen-ation')
    expect(spell('typesetting')).toBe('type-set-ting')
    expect(spell('algorithm')).toBe('al-go-rithm')
    expect(spell('implementation')).toBe('im-ple-men-ta-tion')
    expect(spell('stakeholders')).toBe('stake-hold-ers')
  })

  it('obeys the exception list over the patterns', () => {
    // The patterns alone would offer "pro-ject"; the list forbids every break
    // because the noun and the verb hyphenate differently.
    expect(hyphenationPoints('project')).toEqual([])
    expect(hyphenationPoints('present')).toEqual([])
    expect(spell('associate')).toBe('as-so-ciate')
    // Case is not content: the list is consulted lowercased.
    expect(hyphenationPoints('Project')).toEqual([])
  })

  it('leaves two letters before a break and three after', () => {
    for (const word of ['delivered', 'university', 'engineering', 'optimization', 'responsible', 'customers']) {
      for (const p of hyphenationPoints(word)) {
        expect(p).toBeGreaterThanOrEqual(LEFT_MIN)
        expect(word.length - p).toBeGreaterThanOrEqual(RIGHT_MIN)
      }
    }
  })

  it('refuses everything that is not a plain English word', () => {
    // A name, a date, a URL, an email, a version, a skill keyword, an
    // already-hyphenated compound, an accented word the ASCII patterns have
    // no opinion about - and anything under five letters.
    for (const token of [
      'https://example.com/careers',
      'name@example.com',
      'PL-300',
      'CI/CD',
      '2018',
      'v2.1.0',
      'SLA-compliant',
      'résumé',
      'data',
      'team',
      'API',
    ]) {
      expect(isHyphenatable(token)).toBe(false)
      expect(hyphenationPoints(token)).toEqual([])
      expect(softHyphenateWord(token)).toBe(token)
    }
    expect(MIN_WORD_LENGTH).toBe(5)
  })

  it('is deterministic - the same word answers the same way every time', () => {
    const once = hyphenationPoints('infrastructure')
    for (let i = 0; i < 50; i++) expect(hyphenationPoints('infrastructure')).toEqual(once)
  })
})

describe('softHyphenateText', () => {
  it('inserts breaks and nothing else', () => {
    const out = softHyphenateText('Delivered platform migrations')
    expect(stripSoftHyphens(out)).toBe('Delivered platform migrations')
    expect(out).toContain(SOFT_HYPHEN)
  })

  it('keeps punctuation travelling with its word', () => {
    const out = softHyphenateText('(delivered), migrations;')
    expect(stripSoftHyphens(out)).toBe('(delivered), migrations;')
    expect(out.startsWith('(')).toBe(true)
    expect(out.endsWith(';')).toBe(true)
  })

  it('never breaks inside a word that already carries a hyphen', () => {
    // pdf/hyphens.ts holds these whole on one line on purpose; a break we
    // added inside one would tear the keyword it protects.
    for (const token of ['SLA-compliant', 'cross-functional', '(PL-300)', 'high-scale']) {
      expect(softHyphenateText(token)).toBe(token)
    }
  })

  it('leaves URLs, emails, dates and keywords alone inside a sentence', () => {
    const src = 'See https://example.com/careers or mail me@example.com about (PL-300), 2018-2021.'
    expect(softHyphenateText(src)).toBe(src)
  })

  it('can be told to leave a paragraph its last word', () => {
    const src = 'Rebuilt the analytics platform'
    const free = softHyphenateText(src, false)
    const held = softHyphenateText(src, true)
    expect(free.split(SOFT_HYPHEN).length).toBeGreaterThan(held.split(SOFT_HYPHEN).length)
    expect(held.endsWith('platform')).toBe(true)
  })

  it('is idempotent - running it twice changes nothing', () => {
    const src = 'Delivered infrastructure optimization for enterprise customers'
    const once = softHyphenateText(src)
    expect(softHyphenateText(once)).toBe(once)
    expect(stripSoftHyphens(once)).toBe(src)
  })

  it('reproduces whitespace exactly', () => {
    const src = '  Delivered\n  platform   migrations  '
    expect(stripSoftHyphens(softHyphenateText(src))).toBe(src)
  })
})

/** Enough of a DOM for the prose pass: the pass reads parentElement, closest,
 *  the computed text-align and a tree walker, and writes only `Text.data`. */
function fakeTree(paragraphs: Array<{ align: string; main: boolean; text: string; tag?: string }>) {
  const texts: Array<{ data: string; parentElement: unknown }> = []
  const nodes: unknown[] = []
  for (const p of paragraphs) {
    const el = {
      tagName: (p.tag ?? 'DIV').toUpperCase(),
      isContentEditable: false,
      closest(sel: string) {
        if (sel === '.rm-col-main') return p.main ? el : null
        if (sel.includes('contenteditable')) return null
        return null
      },
      __align: p.align,
    }
    const t = { data: p.text, parentElement: el }
    texts.push(t)
    nodes.push(t)
  }
  const doc = {
    createTreeWalker: () => {
      let i = 0
      return { nextNode: () => (i < nodes.length ? nodes[i++] : null) }
    },
  }
  const root = { ownerDocument: doc }
  return { root, texts }
}

describe('softHyphenateProse', () => {
  const withStyle = <T>(fn: () => T): T => {
    const prior = (globalThis as { getComputedStyle?: unknown }).getComputedStyle
    ;(globalThis as { getComputedStyle?: unknown }).getComputedStyle = (el: { __align?: string }) => ({
      textAlign: el.__align ?? 'left',
      display: 'block',
    })
    ;(globalThis as { NodeFilter?: unknown }).NodeFilter = { SHOW_TEXT: 4 }
    try {
      return fn()
    } finally {
      ;(globalThis as { getComputedStyle?: unknown }).getComputedStyle = prior
    }
  }

  it('hyphenates justified main-column prose', () => {
    withStyle(() => {
      const { root, texts } = fakeTree([{ align: 'justify', main: true, text: 'Delivered platform migrations' }])
      softHyphenateProse(root as unknown as Element)
      expect(texts[0].data).toContain(SOFT_HYPHEN)
      expect(stripSoftHyphens(texts[0].data)).toBe('Delivered platform migrations')
    })
  })

  it('leaves ragged text, and anything outside the main column, alone', () => {
    withStyle(() => {
      const { root, texts } = fakeTree([
        { align: 'left', main: true, text: 'Delivered platform migrations' },
        { align: 'justify', main: false, text: 'Delivered platform migrations' },
      ])
      softHyphenateProse(root as unknown as Element)
      expect(texts[0].data).not.toContain(SOFT_HYPHEN)
      expect(texts[1].data).not.toContain(SOFT_HYPHEN)
    })
  })

  it('does nothing without a document, so a stubbed environment cannot throw', () => {
    expect(() => softHyphenateProse(null)).not.toThrow()
    expect(() => softHyphenateProse(undefined)).not.toThrow()
  })
})

describe('cost', () => {
  /** The whole sample corpus, flattened to the prose the pass would see. */
  const prose = (): string[] => {
    const out: string[] = []
    const visit = (v: unknown): void => {
      if (typeof v === 'string') {
        if (/[A-Za-z]{5}/.test(v)) out.push(v)
      } else if (Array.isArray(v)) v.forEach(visit)
      else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(visit)
    }
    visit(LIBRARY.map((s) => s.content))
    return out
  }

  it('hyphenates the longest example far inside one frame', () => {
    const all = prose()
    expect(all.length).toBeGreaterThan(100)
    // Longest single example by prose bytes - the worst case a fit loop pays
    // per measurement.
    const perSample = LIBRARY.map((s) => JSON.stringify(s.content).length)
    const longest = Math.max(...perSample)
    const longestIdx = perSample.indexOf(longest)
    const longestStrings: string[] = []
    const visit = (v: unknown): void => {
      if (typeof v === 'string') {
        if (/[A-Za-z]{5}/.test(v)) longestStrings.push(v)
      } else if (Array.isArray(v)) v.forEach(visit)
      else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(visit)
    }
    visit(LIBRARY[longestIdx].content)

    softHyphenateText('warm the pattern tables')
    const t0 = performance.now()
    for (const s of longestStrings) softHyphenateText(s)
    const ms = performance.now() - t0
    // Generous bound: the real measurement is reported in the task notes
    // (~1.1ms for the longest example, ~2.5us per word), and a CI machine an
    // order of magnitude slower still passes.
    expect(ms).toBeLessThan(50)
    expect(longestStrings.length).toBeGreaterThan(20)
  })
})
