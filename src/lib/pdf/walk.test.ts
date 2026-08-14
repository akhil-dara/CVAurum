import { describe, it, expect, afterEach } from 'vitest'
import { parseLinearGradient, pseudoContentText, svgShapeToPathD, pseudoBox, elementOpacity, cornerRadii, BORDER_EDGES, buildDrawList } from './walk'
import type { DrawOp } from './types'

describe('pseudoContentText', () => {
  it('unwraps a quoted content string', () => {
    expect(pseudoContentText('"|"')).toBe('|')
    expect(pseudoContentText("'-'")).toBe('-')
  })
  it('treats none/normal as empty', () => {
    expect(pseudoContentText('none')).toBe('')
    expect(pseudoContentText('normal')).toBe('')
  })
  it('ignores non-string content like counters and images', () => {
    expect(pseudoContentText('counter(x)')).toBe('')
    expect(pseudoContentText('url("a.png")')).toBe('')
  })
  it('decodes an escaped unicode glyph', () => {
    expect(pseudoContentText('"\\2022"')).toBe('\u2022')
  })
})

describe('parseLinearGradient', () => {
  // Real getComputedStyle().backgroundImage strings, captured from the
  // actual creative/spotlight templates (task-10c report) — not invented.
  it('parses an explicit-angle gradient with rgb() stops (spotlight header banner)', () => {
    const g = parseLinearGradient('linear-gradient(120deg, rgb(79, 70, 229), color(srgb 0.85098 0.27451 0.545098))')
    expect(g).toEqual({
      angleDeg: 120,
      stops: [
        { r: 79 / 255, g: 70 / 255, b: 229 / 255, a: 1 },
        { r: 0.85098, g: 0.27451, b: 0.545098, a: 1 },
      ],
    })
  })

  it('defaults to 180deg when Chromium elides the angle (creative sidebar)', () => {
    // 180deg ("to bottom") is linear-gradient()'s own default direction —
    // Chromium's computed-style serializer omits it entirely when the
    // gradient was authored with an explicit 180deg, confirmed empirically
    // (see the report): this was the actual bug that left the sidebar
    // background unpainted even after the header banner's (non-default
    // angle, never elided) gradient started working.
    const g = parseLinearGradient('linear-gradient(rgb(109, 40, 217), color(srgb 0.299216 0.109804 0.595686))')
    expect(g?.angleDeg).toBe(180)
    expect(g?.stops[0]).toEqual({ r: 109 / 255, g: 40 / 255, b: 217 / 255, a: 1 })
  })

  it('returns null for a plain color / none (the overwhelming common case)', () => {
    expect(parseLinearGradient('none')).toBeNull()
    expect(parseLinearGradient('')).toBeNull()
  })

  it('returns null for gradient shapes it does not claim to support (radial, keyword direction, 3+ stops)', () => {
    expect(parseLinearGradient('radial-gradient(circle, red, blue)')).toBeNull()
    expect(parseLinearGradient('linear-gradient(to right, rgb(0, 0, 0), rgb(255, 255, 255))')).toBeNull()
    expect(parseLinearGradient('linear-gradient(90deg, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))')).toBeNull()
  })
})

describe('svgShapeToPathD (task 13 — inline lucide icon painting)', () => {
  // attr() closures below mirror reading Element.getAttribute(name): missing
  // attributes return null, exactly like the DOM does — svgIconOps passes
  // `(name) => child.getAttribute(name)` directly.
  const attrs = (a: Record<string, string>) => (name: string): string | null => a[name] ?? null

  it('returns a path\'s own `d` verbatim (no re-parsing/transforming its commands)', () => {
    const d = 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'
    expect(svgShapeToPathD('path', attrs({ d }))).toBe(d)
  })
  it('returns null for a path with no `d` at all', () => {
    expect(svgShapeToPathD('path', attrs({}))).toBeNull()
  })

  it('converts a line to a single M/L segment (AlignLeft\'s 3 lines)', () => {
    expect(svgShapeToPathD('line', attrs({ x1: '21', x2: '3', y1: '6', y2: '6' }))).toBe('M 21 6 L 3 6')
  })

  it('converts a polyline to M followed by one L per remaining point, open (no Z)', () => {
    expect(svgShapeToPathD('polyline', attrs({ points: '3,6 21,6 12,18' }))).toBe('M 3 6 L 21 6 L 12 18')
  })
  it('converts a polygon the same way as polyline but closed with Z', () => {
    expect(svgShapeToPathD('polygon', attrs({ points: '3,6 21,6 12,18' }))).toBe('M 3 6 L 21 6 L 12 18 Z')
  })
  it('accepts whitespace-separated polyline points, not just commas', () => {
    expect(svgShapeToPathD('polyline', attrs({ points: '3 6 21 6' }))).toBe('M 3 6 L 21 6')
  })
  it('returns null for a polyline with an odd/missing coordinate', () => {
    expect(svgShapeToPathD('polyline', attrs({ points: '3,6 21' }))).toBeNull()
  })

  it('converts a circle to a two-arc closed path (Award\'s badge ring)', () => {
    expect(svgShapeToPathD('circle', attrs({ cx: '12', cy: '8', r: '6' }))).toBe(
      'M 6 8 A 6 6 0 1 0 18 8 A 6 6 0 1 0 6 8 Z',
    )
  })
  it('returns null for a non-positive circle radius', () => {
    expect(svgShapeToPathD('circle', attrs({ cx: '12', cy: '8', r: '0' }))).toBeNull()
  })

  it('converts a rect to a plain M/L/Z rectangle, ignoring rx (Briefcase\'s body)', () => {
    expect(svgShapeToPathD('rect', attrs({ x: '2', y: '6', width: '20', height: '14', rx: '2' }))).toBe(
      'M 2 6 L 22 6 L 22 20 L 2 20 Z',
    )
  })
  it('returns null for a zero/negative-area rect', () => {
    expect(svgShapeToPathD('rect', attrs({ x: '0', y: '0', width: '0', height: '14' }))).toBeNull()
  })

  it('returns null for an unsupported shape kind (caller dev-warns and skips it)', () => {
    expect(svgShapeToPathD('ellipse', attrs({ cx: '1', cy: '1', rx: '1', ry: '1' }))).toBeNull()
  })
})

describe('pseudoBox (task 13 — positioned pseudo-element offsets)', () => {
  const host = { xPx: 49, yPx: 127, wPx: 695, hPx: 16 }
  const cs = (over: Record<string, string>): CSSStyleDeclaration => {
    const base: Record<string, string> = {
      position: 'static', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', width: 'auto', height: 'auto', fontSize: '12px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }

  it('static (normal-flow) pseudos keep the pre-existing host-origin approximation', () => {
    // No explicit width/height -> falls back to the host's width and the
    // pseudo's own font-size (12px here) for height, same as before task 13.
    expect(pseudoBox(cs({}), host)).toEqual({ xPx: 49, yPx: 127, wPx: 695, hPx: 12 })
  })

  it('applies an absolute left/top offset from the host origin', () => {
    expect(pseudoBox(cs({ position: 'absolute', left: '5px', top: '3px', width: '10px', height: '2px' }), host)).toEqual({
      xPx: 54, yPx: 130, wPx: 10, hPx: 2,
    })
  })

  it('derives width from host width minus left+right insets when width is auto (.sec-ov-strike\'s full-width rule)', () => {
    // Real computed values captured from .sec-ov-strike's ::before (task-13
    // report): left:0, right:0, top resolved from 50%, height explicit.
    const box = pseudoBox(cs({ position: 'absolute', left: '0px', right: '0px', top: '8px', height: '1.2px' }), host)
    expect(box.xPx).toBe(49) // host.xPx + left(0)
    expect(box.wPx).toBe(695) // host.wPx - left(0) - right(0): full width, not left over-narrowed
    expect(box.yPx).toBe(135) // host.yPx + top(8)
    expect(box.hPx).toBe(1.2) // explicit height, untouched by the width-derivation branch
  })

  it('derives height from host height minus top+bottom insets when height is auto', () => {
    const box = pseudoBox(cs({ position: 'absolute', top: '2px', bottom: '3px', left: '0px', width: '10px' }), host)
    expect(box.hPx).toBe(11) // host.hPx(16) - top(2) - bottom(3)
    expect(box.yPx).toBe(129) // host.yPx + top(2)
  })

  it('positions from the right edge when only `right` (not `left`) is set (real width, not auto)', () => {
    // .tpl-aurum's ::after: left:0, bottom:0, EXPLICIT width/height — right
    // is never set here, this covers the mirror case (right set, left auto).
    const box = pseudoBox(cs({ position: 'absolute', right: '10px', width: '20px', top: '0px' }), host)
    expect(box.xPx).toBe(host.xPx + host.wPx - 10 - 20) // host right edge - right - own width
  })

  it('positions from the bottom edge when only `bottom` (not `top`) is set — the aurum ::after case', () => {
    // Real computed values (task-13 report): position:absolute, left:0,
    // bottom:0, width:1.9em (17.2969px), height:2px, top/right:auto. Before
    // this fix the pseudo painted at the host's TOP (box.yPx) instead,
    // landing the accent bar across the heading text instead of below it.
    const box = pseudoBox(cs({ position: 'absolute', left: '0px', bottom: '0px', width: '17.2969px', height: '2px' }), host)
    expect(box.xPx).toBe(49)
    expect(box.wPx).toBe(17.2969)
    expect(box.yPx).toBe(host.yPx + host.hPx - 2) // bottom-aligned within the host box, not top-aligned
  })

  it('relative positioning applies the same left/top math as absolute (both share one containing-block model here)', () => {
    expect(pseudoBox(cs({ position: 'relative', left: '4px', top: '1px', width: '5px', height: '5px' }), host)).toEqual({
      xPx: 53, yPx: 128, wPx: 5, hPx: 5,
    })
  })
})

describe('pseudoBox — flex-row hosts (fix round: dark-template strike mask)', () => {
  // Root cause: onyx-noir's DEFAULT heading style (section:'rule-after',
  // used with no per-section override at all — NOT sec-ov-strike, which was
  // the wrong initial suspicion) sets `.rm-section-title { display:flex;
  // align-items:center; gap:10px }` with a STATIC `::after { flex:1;
  // height:1.5px }` that fills the row's remaining width. A `position:
  // static` pseudo inside a flex row is a genuine FLEX ITEM, not normal
  // block/inline flow — the pre-fix-round host-origin approximation painted
  // it starting at the SAME x as the heading text (crossing straight
  // through it) and pinned to the row's TOP instead of vertically centered.
  // Real computed values captured live (task-13 fix-round report): host
  // title box {x:49.125, y:141.344, w:695.438, h:17}, text-span box
  // {x:49.125, w:65.063}, gap:10px, ::after {width:620.375px, height:1.5px}.
  const host = { xPx: 49.125, yPx: 141.344, wPx: 695.438, hPx: 17 }
  const textSpanBox = { xPx: 49.125, yPx: 141.344, wPx: 65.063, hPx: 14.906 }
  const cs = (over: Record<string, string>): CSSStyleDeclaration => {
    const base: Record<string, string> = {
      position: 'static', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', width: 'auto', height: 'auto', fontSize: '12px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }
  const flexHostCs = (over: Record<string, string> = {}): CSSStyleDeclaration =>
    ({ display: 'flex', alignItems: 'center', columnGap: '10px', flexDirection: 'row', ...over }) as unknown as CSSStyleDeclaration

  it('positions a static ::after flex item right after the last real child + gap, not at the host origin', () => {
    const box = pseudoBox(cs({ height: '1.5px', width: '620.375px' }), host, '::after', flexHostCs(), textSpanBox)
    expect(box.xPx).toBeCloseTo(124.188, 2) // textSpanBox end (49.125+65.063) + gap(10)
    expect(box.wPx).toBe(620.375) // browser-resolved flex width, untouched
  })

  it('vertically centers a flex-item pseudo per align-items:center, not pinned to the row top', () => {
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', flexHostCs(), textSpanBox)
    expect(box.yPx).toBeCloseTo(149.094, 2) // host.yPx(141.344) + (host.hPx(17) - hPx(1.5)) / 2
  })

  it('honors align-items: flex-end by bottom-aligning the flex item within the row', () => {
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', flexHostCs({ alignItems: 'flex-end' }), textSpanBox)
    expect(box.yPx).toBeCloseTo(host.yPx + host.hPx - 1.5, 6)
  })

  it('honors align-items: flex-start by top-aligning the flex item within the row (host-origin y, unchanged)', () => {
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', flexHostCs({ alignItems: 'flex-start' }), textSpanBox)
    expect(box.yPx).toBe(host.yPx)
  })

  it('a ::before flex item keeps the host-origin x (always first in box order) but still gets align-items centering', () => {
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::before', flexHostCs(), textSpanBox)
    expect(box.xPx).toBe(host.xPx) // no lastChildBox shift for ::before
    expect(box.yPx).toBeCloseTo(149.094, 2) // still cross-axis centered
  })

  it('falls back to the host origin for ::after when there is no last-child box (empty host)', () => {
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', flexHostCs(), null)
    expect(box.xPx).toBe(host.xPx)
  })

  it('does not apply flex-item positioning when the host is not a flex container', () => {
    // A plain block host (the overwhelming common case, e.g. a simple
    // `content: "•"` separator) must be completely unaffected.
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', undefined, textSpanBox)
    expect(box.xPx).toBe(host.xPx)
    expect(box.yPx).toBe(host.yPx)
  })

  it('does not apply row/column flex-item positioning for flex-direction: row-reverse (neither is handled)', () => {
    // column IS handled (fix round 2, see the dedicated describe block below)
    // -- row-reverse is the one standard flex-direction value this module
    // still falls back to the plain host-origin approximation for.
    const box = pseudoBox(cs({ height: '1.5px' }), host, '::after', flexHostCs({ flexDirection: 'row-reverse' }), textSpanBox)
    expect(box.xPx).toBe(host.xPx)
    expect(box.yPx).toBe(host.yPx)
  })

  it('an absolutely positioned pseudo on a flex host is unaffected (position branch takes priority, e.g. sec-ov-strike)', () => {
    // sec-ov-strike's ::before is `position:absolute` even though the
    // generic sec-ov-* reset also sets the host to `display:flex` — the
    // absolute/relative branch must win outright, never falling through to
    // (or blending with) the flex-item branch.
    const box = pseudoBox(
      cs({ position: 'absolute', left: '0px', right: '0px', top: '8px', height: '1.2px' }),
      host, '::before', flexHostCs(), textSpanBox,
    )
    expect(box.xPx).toBe(49.125) // host.xPx + left(0), same as the plain absolute case
    expect(box.wPx).toBeCloseTo(695.438, 3) // host.wPx - left(0) - right(0)
  })
})

describe('BORDER_EDGES (task 14 — border lines inset by half their width)', () => {
  // CSS paints a border INSIDE the element box: border-bottom's OUTER edge is
  // the box's own bottom edge, the stroke occupies [bottom - width, bottom].
  // pdf-lib's drawLine strokes CENTERED on the given coordinates, so the line
  // must be drawn width/2 INSIDE the box edge for its centerline to land
  // where CSS's own stroke centerline does.
  const box = { xPx: 10, yPx: 20, wPx: 200, hPx: 50 } // right edge x=210, bottom edge y=70

  it('insets a 2px bottom border upward from the box bottom edge (the brief\'s worked example)', () => {
    const bottom = BORDER_EDGES.find((e) => e.side === 'Bottom')!
    expect(bottom.y1(box, 2)).toBe(69) // 70 - 2/2
    expect(bottom.y2(box, 2)).toBe(69)
    // x runs the full box width, untouched by the vertical inset
    expect(bottom.x1(box, 2)).toBe(10)
    expect(bottom.x2(box, 2)).toBe(210)
  })

  it('insets a top border downward from the box top edge', () => {
    const top = BORDER_EDGES.find((e) => e.side === 'Top')!
    expect(top.y1(box, 4)).toBe(22) // 20 + 4/2
    expect(top.y2(box, 4)).toBe(22)
  })

  it('insets a left border rightward from the box left edge', () => {
    const left = BORDER_EDGES.find((e) => e.side === 'Left')!
    expect(left.x1(box, 3)).toBe(11.5) // 10 + 3/2
    expect(left.x2(box, 3)).toBe(11.5)
  })

  it('insets a right border leftward from the box right edge', () => {
    const right = BORDER_EDGES.find((e) => e.side === 'Right')!
    expect(right.x1(box, 3)).toBe(208.5) // 210 - 3/2
    expect(right.x2(box, 3)).toBe(208.5)
  })

  it('a zero-width border does not move at all (degenerate but harmless)', () => {
    const bottom = BORDER_EDGES.find((e) => e.side === 'Bottom')!
    expect(bottom.y1(box, 0)).toBe(70)
  })
})

describe('elementOpacity (task 13 — opacity multiplication)', () => {
  const cs = (opacity: string): CSSStyleDeclaration => ({ opacity } as unknown as CSSStyleDeclaration)

  it('reads a fractional computed opacity', () => {
    expect(elementOpacity(cs('0.38'))).toBe(0.38) // .sec-ov-strike's heading rule
  })
  it('defaults to 1 when opacity is unset/unparseable', () => {
    expect(elementOpacity(cs(''))).toBe(1)
  })
  it('reads a full 1 unchanged', () => {
    expect(elementOpacity(cs('1'))).toBe(1)
  })
})

describe('cornerRadii (fix round 2, defect B — per-corner border radii)', () => {
  // boxOps used to read only border-top-left-radius and apply that ONE
  // value to all four corners, so an asymmetric box (spotlight's header
  // banner, `border-radius: 0 0 18px 18px` — square top, rounded bottom
  // only) painted as a plain rectangle. cornerRadii reads all four.
  const cs = (over: Partial<Record<'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderBottomRightRadius' | 'borderBottomLeftRadius', string>>): CSSStyleDeclaration =>
    ({
      borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px',
      ...over,
    }) as unknown as CSSStyleDeclaration

  it('reads all four corners, not just top-left', () => {
    expect(cornerRadii(cs({ borderTopLeftRadius: '1px', borderTopRightRadius: '2px', borderBottomRightRadius: '3px', borderBottomLeftRadius: '4px' }))).toEqual({
      tl: 1, tr: 2, br: 3, bl: 4,
    })
  })

  it('captures spotlight header banner\'s exact asymmetric shape (border-radius: 0 0 18px 18px)', () => {
    expect(cornerRadii(cs({ borderBottomRightRadius: '18px', borderBottomLeftRadius: '18px' }))).toEqual({
      tl: 0, tr: 0, br: 18, bl: 18,
    })
  })

  it('returns all zeros for an un-rounded box', () => {
    expect(cornerRadii(cs({}))).toEqual({ tl: 0, tr: 0, br: 0, bl: 0 })
  })

  it('collapses an elliptical (two-value) corner to its first (horizontal) value', () => {
    // getComputedStyle serializes an elliptical corner as "Hpx Vpx" (e.g.
    // `border-top-left-radius: 10px 5px` -> "10px 5px") -- parsePx's
    // parseFloat already stops at the first non-numeric token, so this
    // needs no special-casing in cornerRadii itself.
    expect(cornerRadii(cs({ borderTopLeftRadius: '10px 5px' }))).toEqual({ tl: 10, tr: 0, br: 0, bl: 0 })
  })
})

describe('pseudoBox — flex-column hosts (fix round 2, defect A — sienna accent rule)', () => {
  // Root cause: sienna's (and elegant's) `.rm-header-centered::after` name-
  // underline rule is a STATIC pseudo whose host, `.rm-header`, is
  // `display:flex` with `.rm-header-centered { flex-direction: column }` —
  // a genuine flex item stacked in a COLUMN, not normal block flow. It
  // centers itself horizontally via `margin: 12px auto 0` (auto-margin
  // centering) and, being last in box order, should render AFTER all the
  // header's other content (name/headline/contacts), not at the header's
  // own top-left corner. The pre-fix host-origin approximation painted a
  // 44x1px rule at the host's raw top-left origin — confirmed live (task-13
  // fix-round-2 report) that the DOM has nothing within 16px of that spot;
  // the real rule renders centered, ~97px further down. Real computed
  // values captured live: host {x:49.125, y:49.125, w:695.438, h:98.313},
  // last real child (.rm-header-main) {x:49.125, y:49.125, w:695.438,
  // h:65.313, bottom:114.438}, host rowGap:20px, pseudo {width:44px,
  // marginTop:12px, marginLeft:325.719px, marginRight:325.719px}.
  const host = { xPx: 49.125, yPx: 49.125, wPx: 695.438, hPx: 98.313 }
  const lastChildBox = { xPx: 49.125, yPx: 49.125, wPx: 695.438, hPx: 65.313 }
  const cs = (over: Record<string, string>): CSSStyleDeclaration => {
    const base: Record<string, string> = {
      position: 'static', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', width: 'auto', height: 'auto', fontSize: '12px',
      marginTop: '0px', marginLeft: '0px', marginRight: '0px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }
  const columnHostCs = (over: Record<string, string> = {}): CSSStyleDeclaration =>
    ({ display: 'flex', alignItems: 'flex-start', columnGap: '20px', rowGap: '20px', flexDirection: 'column', ...over }) as unknown as CSSStyleDeclaration

  it('positions a static ::after column-flex item after the last child + row-gap + its own margin-top (sienna accent rule)', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }),
      host, '::after', columnHostCs(), lastChildBox,
    )
    expect(box.yPx).toBeCloseTo(146.438, 2) // lastChildBox bottom(114.438) + rowGap(20) + marginTop(12)
  })

  it('horizontally centers via the pseudo\'s own resolved auto margins, not align-items', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }),
      host, '::after', columnHostCs(), lastChildBox,
    )
    expect(box.xPx).toBeCloseTo(374.844, 2) // host.xPx(49.125) + marginLeft(325.719) -- centers the 44px rule
    expect(box.xPx + box.wPx / 2).toBeCloseTo(host.xPx + host.wPx / 2, 1) // true center of the 44px rule = host's own center
  })

  it('falls back to align-items on the cross axis when the pseudo has no margin (0 on both sides)', () => {
    const box = pseudoBox(cs({ width: '10px', height: '2px' }), host, '::after', columnHostCs({ alignItems: 'center' }), lastChildBox)
    expect(box.xPx).toBeCloseTo(host.xPx + (host.wPx - 10) / 2, 6)
  })

  it('a ::before column-flex item skips the "after last child" main-axis shift but still gets its own margin-top', () => {
    const box = pseudoBox(cs({ width: '44px', height: '1px', marginTop: '5px' }), host, '::before', columnHostCs(), lastChildBox)
    expect(box.yPx).toBe(host.yPx + 5) // NOT shifted past lastChildBox — ::before is first in box order
  })

  it('falls back to the host origin for ::after when there is no last-child box (empty host)', () => {
    const box = pseudoBox(cs({ width: '44px', height: '1px', marginTop: '12px' }), host, '::after', columnHostCs(), null)
    expect(box.yPx).toBe(host.yPx + 12) // host origin + its own margin-top, no lastChildBox to shift past
  })

  it('does not apply column flex-item positioning when the host is not a flex container', () => {
    const box = pseudoBox(cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }), host, '::after', undefined, lastChildBox)
    expect(box.xPx).toBe(host.xPx)
    expect(box.yPx).toBe(host.yPx)
  })
})

describe('buildDrawList — root paints its own box first (task 15, defect 1)', () => {
  // This suite runs under vitest's plain 'node' environment (see
  // vitest.config.ts — no jsdom/happy-dom), so buildDrawList's DOM entry
  // points (document.createTreeWalker, getComputedStyle, Node, NodeFilter,
  // HTMLImageElement) are stubbed with the minimum fakes needed to drive a
  // tiny two-element tree (root + one child), following the same
  // stub-just-the-DOM-entry-points pattern text.test.ts and paint.test.ts use
  // rather than pulling in a real DOM implementation for one test.
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle
  const g = globalThis as unknown as { Node?: unknown; NodeFilter?: unknown; HTMLImageElement?: unknown }
  const originalNode = g.Node
  const originalNodeFilter = g.NodeFilter
  const originalHTMLImageElement = g.HTMLImageElement

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
    g.Node = originalNode
    g.NodeFilter = originalNodeFilter
    g.HTMLImageElement = originalHTMLImageElement
  })

  interface FakeRect { left: number; top: number; width: number; height: number }
  interface FakeEl {
    nodeType: number
    tagName: string
    classList: { contains: (c: string) => boolean }
    childNodes: FakeEl[]
    getBoundingClientRect: () => FakeRect
    contains: (n: FakeEl) => boolean
    cs: Record<string, string>
  }

  const BASE_CS: Record<string, string> = {
    backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', borderTopLeftRadius: '0px',
    borderTopWidth: '0px', borderTopStyle: 'none', borderTopColor: 'rgba(0,0,0,0)',
    borderRightWidth: '0px', borderRightStyle: 'none', borderRightColor: 'rgba(0,0,0,0)',
    borderBottomWidth: '0px', borderBottomStyle: 'none', borderBottomColor: 'rgba(0,0,0,0)',
    borderLeftWidth: '0px', borderLeftStyle: 'none', borderLeftColor: 'rgba(0,0,0,0)',
    opacity: '1', display: 'block', visibility: 'visible', content: 'none',
  }

  function makeCs(overrides: Record<string, string>): CSSStyleDeclaration {
    const merged: Record<string, string> = { ...BASE_CS, ...overrides }
    return {
      ...merged,
      getPropertyValue: (name: string) => merged[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] ?? '',
    } as unknown as CSSStyleDeclaration
  }

  function makeEl(rect: FakeRect, cs: Record<string, string>, children: FakeEl[] = []): FakeEl {
    const el: FakeEl = {
      nodeType: 1,
      tagName: 'DIV',
      classList: { contains: () => false },
      childNodes: children,
      getBoundingClientRect: () => rect,
      contains: (n) => n === el || children.some((c) => c === n || c.contains(n)),
      cs: { ...BASE_CS, ...cs },
    }
    return el
  }

  // Faithful-enough fake of document.createTreeWalker for a filter that only
  // ever returns FILTER_ACCEPT/FILTER_REJECT (never FILTER_SKIP — matches
  // buildDrawList's own acceptNode exactly): a REJECTed node's whole subtree
  // is skipped, exactly like a real TreeWalker does for TreeWalker (as
  // opposed to NodeIterator, where REJECT behaves like SKIP).
  function fakeCreateTreeWalker(root: FakeEl, acceptNode: (n: FakeEl) => number) {
    const ACCEPT = 1
    const seq: FakeEl[] = []
    const visit = (node: FakeEl) => {
      for (const child of node.childNodes) {
        if (acceptNode(child) === ACCEPT) {
          seq.push(child)
          visit(child)
        }
      }
    }
    visit(root)
    let idx = -1
    const walker = {
      currentNode: root as unknown as Node,
      nextNode: () => {
        idx++
        if (idx >= seq.length) return null
        walker.currentNode = seq[idx] as unknown as Node
        return walker.currentNode
      },
    }
    return walker
  }

  function install() {
    g.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }
    g.NodeFilter = { SHOW_ELEMENT: 1, SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }
    g.HTMLImageElement = class {} // no fake element in this suite is ever one
    globalThis.document = {
      createTreeWalker: (root: unknown, _whatToShow: number, filter: { acceptNode: (n: unknown) => number }) =>
        fakeCreateTreeWalker(root as FakeEl, filter.acceptNode as (n: FakeEl) => number),
    } as unknown as Document
    globalThis.getComputedStyle = ((el: unknown, pseudo?: string) =>
      pseudo ? makeCs({ content: 'none' }) : makeCs((el as FakeEl).cs)) as unknown as typeof getComputedStyle
  }

  it('emits a rect op at (0,0) with the ROOT element\'s own dimensions, before any child ops', () => {
    install()
    const child = makeEl({ left: 5, top: 5, width: 50, height: 20 }, { backgroundColor: 'rgb(255, 0, 0)' })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, { backgroundColor: 'rgb(13, 14, 18)' }, [child])

    const ops = buildDrawList(root as unknown as HTMLElement)

    // Root's own background is the FIRST op emitted, at (0,0) with root's
    // own full dimensions — not (say) skipped in favor of starting at root's
    // children (the walker.currentNode quirk this now deliberately avoids
    // relying on — see buildDrawList's own comment).
    expect(ops[0]).toMatchObject({ kind: 'rect', xPx: 0, yPx: 0, wPx: 800, hPx: 1000 })
    const rootOp = ops[0] as Extract<DrawOp, { kind: 'rect' }>
    expect(rootOp.fill).toEqual({ r: 13 / 255, g: 14 / 255, b: 18 / 255, a: 1 })

    // The child's own rect op exists and comes strictly AFTER root's.
    const childOpIndex = ops.findIndex((o) => o.kind === 'rect' && o.xPx === 5)
    expect(childOpIndex).toBeGreaterThan(0)
  })

  it('root with no background paints no rect for itself, but still walks its children', () => {
    install()
    const child = makeEl({ left: 5, top: 5, width: 50, height: 20 }, { backgroundColor: 'rgb(9, 9, 9)' })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, { backgroundColor: 'rgba(0, 0, 0, 0)' }, [child])

    const ops = buildDrawList(root as unknown as HTMLElement)

    expect(ops.length).toBe(1) // just the child's own background rect
    expect(ops[0]).toMatchObject({ kind: 'rect', xPx: 5, yPx: 5 })
  })
})
