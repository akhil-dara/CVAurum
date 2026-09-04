import { describe, it, expect, beforeAll } from 'vitest'
import { resolveForcedCutsPx } from './pageBreaks'

/**
 * The resolver reads a live document tree through three DOM calls only -
 * querySelector, getBoundingClientRect and previousElementSibling - so a
 * small fake tree stands in for the real one here (the walker's own tests
 * fake their DOM the same way). The two selector shapes it issues are the
 * section anchor and the entry anchor sections.tsx stamps on every wrapper.
 */
interface FakeEl {
  className: string
  attrs: Record<string, string>
  rect: { top: number; bottom: number; height: number }
  children: FakeEl[]
  parent: FakeEl | null
  getBoundingClientRect(): { top: number; bottom: number; height: number }
  querySelector(sel: string): FakeEl | null
  readonly previousElementSibling: FakeEl | null
}

function el(
  className: string,
  attrs: Record<string, string>,
  top: number,
  bottom: number,
  children: FakeEl[] = []
): FakeEl {
  const node: FakeEl = {
    className,
    attrs,
    rect: { top, bottom, height: bottom - top },
    children,
    parent: null,
    getBoundingClientRect() {
      return this.rect
    },
    querySelector(sel: string) {
      const m = /^(?:\.([\w-]+))?\[([\w-]+)="([^"]*)"\]$/.exec(sel)
      if (!m) throw new Error(`unexpected selector ${sel}`)
      const [, cls, attr, val] = m
      const walk = (n: FakeEl): FakeEl | null => {
        for (const c of n.children) {
          if ((!cls || c.className.split(' ').includes(cls)) && c.attrs[attr] === val) return c
          const deep = walk(c)
          if (deep) return deep
        }
        return null
      }
      return walk(this)
    },
    get previousElementSibling() {
      const sibs = this.parent?.children ?? []
      const i = sibs.indexOf(this)
      return i > 0 ? sibs[i - 1] : null
    },
  }
  for (const c of children) c.parent = node
  return node
}

const root = () => el('rm-root', {}, 100, 1100, [
  el('rm-section', { 'data-section': 'work' }, 120, 520, [
    el('rm-heading', {}, 120, 140),
    el('rm-item', { 'data-item-id': 'w1' }, 150, 300),
    el('rm-item', { 'data-item-id': 'w2' }, 320, 520),
  ]),
  el('rm-section', { 'data-section': 'education' }, 560, 700, [
    el('rm-heading', {}, 560, 580),
    el('rm-item', { 'data-item-id': 'e1' }, 590, 700),
  ]),
])

beforeAll(() => {
  const g = globalThis as { CSS?: { escape(s: string): string } }
  if (!g.CSS) g.CSS = { escape: (s: string) => s }
})

describe('resolveForcedCutsPx with an entry pin', () => {
  it('lands in the gap above the pinned entry, midway between the previous entry and it', () => {
    const cuts = resolveForcedCutsPx(root() as unknown as HTMLElement, [{ section: 'work', itemId: 'w2' }])
    // previous sibling bottom 300, entry top 320: midpoint 310, minus root top 100
    expect(cuts).toEqual([210])
  })

  it('a section pin sits between the previous section and the pinned one', () => {
    const cuts = resolveForcedCutsPx(root() as unknown as HTMLElement, [{ section: 'education' }])
    // previous section bottom 520, section top 560: midpoint 540, minus root top 100
    expect(cuts).toEqual([440])
  })

  it('an entry pin and its section pin resolve to two distinct cuts, sorted', () => {
    const cuts = resolveForcedCutsPx(root() as unknown as HTMLElement, [
      { section: 'work', itemId: 'w2' },
      { section: 'education' },
    ])
    expect(cuts).toEqual([210, 440])
  })

  it('a pin whose entry no longer exists resolves to nothing', () => {
    expect(resolveForcedCutsPx(root() as unknown as HTMLElement, [{ section: 'work', itemId: 'gone' }])).toEqual([])
    expect(resolveForcedCutsPx(root() as unknown as HTMLElement, [{ section: 'gone', itemId: 'w2' }])).toEqual([])
  })

  it('the same entry pinned twice yields one cut', () => {
    const cuts = resolveForcedCutsPx(root() as unknown as HTMLElement, [
      { section: 'work', itemId: 'w2' },
      { section: 'work', itemId: 'w2' },
    ])
    expect(cuts).toEqual([210])
  })
})
