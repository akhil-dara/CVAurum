import { describe, it, expect, afterEach } from 'vitest'
import {
  parseLinearGradient,
  pseudoContentText,
  svgShapeToPathD,
  pseudoBox,
  elementOpacity,
  cornerRadii,
  BORDER_EDGES,
  buildDrawList,
  extractPageBlocks,
} from './walk'
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
    expect(
      parseLinearGradient('linear-gradient(90deg, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))')
    ).toBeNull()
  })
})

describe('svgShapeToPathD (task 13 — inline lucide icon painting)', () => {
  // attr() closures below mirror reading Element.getAttribute(name): missing
  // attributes return null, exactly like the DOM does — svgIconOps passes
  // `(name) => child.getAttribute(name)` directly.
  const attrs =
    (a: Record<string, string>) =>
    (name: string): string | null =>
      a[name] ?? null

  it("returns a path's own `d` verbatim (no re-parsing/transforming its commands)", () => {
    const d = 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'
    expect(svgShapeToPathD('path', attrs({ d }))).toBe(d)
  })
  it('returns null for a path with no `d` at all', () => {
    expect(svgShapeToPathD('path', attrs({}))).toBeNull()
  })

  it("converts a line to a single M/L segment (AlignLeft's 3 lines)", () => {
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

  it("converts a circle to a two-arc closed path (Award's badge ring)", () => {
    expect(svgShapeToPathD('circle', attrs({ cx: '12', cy: '8', r: '6' }))).toBe(
      'M 6 8 A 6 6 0 1 0 18 8 A 6 6 0 1 0 6 8 Z'
    )
  })
  it('returns null for a non-positive circle radius', () => {
    expect(svgShapeToPathD('circle', attrs({ cx: '12', cy: '8', r: '0' }))).toBeNull()
  })

  it("converts a rect to a plain M/L/Z rectangle, ignoring rx (Briefcase's body)", () => {
    expect(svgShapeToPathD('rect', attrs({ x: '2', y: '6', width: '20', height: '14', rx: '2' }))).toBe(
      'M 2 6 L 22 6 L 22 20 L 2 20 Z'
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
      position: 'static',
      left: 'auto',
      right: 'auto',
      top: 'auto',
      bottom: 'auto',
      width: 'auto',
      height: 'auto',
      fontSize: '12px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }

  it('static (normal-flow) pseudos keep the pre-existing host-origin approximation', () => {
    // No explicit width/height -> falls back to the host's width and the
    // pseudo's own font-size (12px here) for height, same as before task 13.
    expect(pseudoBox(cs({}), host)).toEqual({ xPx: 49, yPx: 127, wPx: 695, hPx: 12 })
  })

  it('applies an absolute left/top offset from the host origin', () => {
    expect(
      pseudoBox(cs({ position: 'absolute', left: '5px', top: '3px', width: '10px', height: '2px' }), host)
    ).toEqual({
      xPx: 54,
      yPx: 130,
      wPx: 10,
      hPx: 2,
    })
  })

  it("derives width from host width minus left+right insets when width is auto (.sec-ov-strike's full-width rule)", () => {
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
    const box = pseudoBox(
      cs({ position: 'absolute', left: '0px', bottom: '0px', width: '17.2969px', height: '2px' }),
      host
    )
    expect(box.xPx).toBe(49)
    expect(box.wPx).toBe(17.2969)
    expect(box.yPx).toBe(host.yPx + host.hPx - 2) // bottom-aligned within the host box, not top-aligned
  })

  it('relative positioning applies the same left/top math as absolute (both share one containing-block model here)', () => {
    expect(pseudoBox(cs({ position: 'relative', left: '4px', top: '1px', width: '5px', height: '5px' }), host)).toEqual(
      {
        xPx: 53,
        yPx: 128,
        wPx: 5,
        hPx: 5,
      }
    )
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
      position: 'static',
      left: 'auto',
      right: 'auto',
      top: 'auto',
      bottom: 'auto',
      width: 'auto',
      height: 'auto',
      fontSize: '12px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }
  const flexHostCs = (over: Record<string, string> = {}): CSSStyleDeclaration =>
    ({
      display: 'flex',
      alignItems: 'center',
      columnGap: '10px',
      flexDirection: 'row',
      ...over,
    }) as unknown as CSSStyleDeclaration

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
    const box = pseudoBox(
      cs({ height: '1.5px' }),
      host,
      '::after',
      flexHostCs({ alignItems: 'flex-start' }),
      textSpanBox
    )
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
    const box = pseudoBox(
      cs({ height: '1.5px' }),
      host,
      '::after',
      flexHostCs({ flexDirection: 'row-reverse' }),
      textSpanBox
    )
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
      host,
      '::before',
      flexHostCs(),
      textSpanBox
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

  it("insets a 2px bottom border upward from the box bottom edge (the brief's worked example)", () => {
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
  const cs = (opacity: string): CSSStyleDeclaration => ({ opacity }) as unknown as CSSStyleDeclaration

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
  const cs = (
    over: Partial<
      Record<
        'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderBottomRightRadius' | 'borderBottomLeftRadius',
        string
      >
    >
  ): CSSStyleDeclaration =>
    ({
      borderTopLeftRadius: '0px',
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px',
      borderBottomLeftRadius: '0px',
      ...over,
    }) as unknown as CSSStyleDeclaration

  it('reads all four corners, not just top-left', () => {
    expect(
      cornerRadii(
        cs({
          borderTopLeftRadius: '1px',
          borderTopRightRadius: '2px',
          borderBottomRightRadius: '3px',
          borderBottomLeftRadius: '4px',
        })
      )
    ).toEqual({
      tl: 1,
      tr: 2,
      br: 3,
      bl: 4,
    })
  })

  it("captures spotlight header banner's exact asymmetric shape (border-radius: 0 0 18px 18px)", () => {
    expect(cornerRadii(cs({ borderBottomRightRadius: '18px', borderBottomLeftRadius: '18px' }))).toEqual({
      tl: 0,
      tr: 0,
      br: 18,
      bl: 18,
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
      position: 'static',
      left: 'auto',
      right: 'auto',
      top: 'auto',
      bottom: 'auto',
      width: 'auto',
      height: 'auto',
      fontSize: '12px',
      marginTop: '0px',
      marginLeft: '0px',
      marginRight: '0px',
    }
    return { ...base, ...over } as unknown as CSSStyleDeclaration
  }
  const columnHostCs = (over: Record<string, string> = {}): CSSStyleDeclaration =>
    ({
      display: 'flex',
      alignItems: 'flex-start',
      columnGap: '20px',
      rowGap: '20px',
      flexDirection: 'column',
      ...over,
    }) as unknown as CSSStyleDeclaration

  it('positions a static ::after column-flex item after the last child + row-gap + its own margin-top (sienna accent rule)', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }),
      host,
      '::after',
      columnHostCs(),
      lastChildBox
    )
    expect(box.yPx).toBeCloseTo(146.438, 2) // lastChildBox bottom(114.438) + rowGap(20) + marginTop(12)
  })

  it("horizontally centers via the pseudo's own resolved auto margins, not align-items", () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }),
      host,
      '::after',
      columnHostCs(),
      lastChildBox
    )
    expect(box.xPx).toBeCloseTo(374.844, 2) // host.xPx(49.125) + marginLeft(325.719) -- centers the 44px rule
    expect(box.xPx + box.wPx / 2).toBeCloseTo(host.xPx + host.wPx / 2, 1) // true center of the 44px rule = host's own center
  })

  it('falls back to align-items on the cross axis when the pseudo has no margin (0 on both sides)', () => {
    const box = pseudoBox(
      cs({ width: '10px', height: '2px' }),
      host,
      '::after',
      columnHostCs({ alignItems: 'center' }),
      lastChildBox
    )
    expect(box.xPx).toBeCloseTo(host.xPx + (host.wPx - 10) / 2, 6)
  })

  it('a ::before column-flex item skips the "after last child" main-axis shift but still gets its own margin-top', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '5px' }),
      host,
      '::before',
      columnHostCs(),
      lastChildBox
    )
    expect(box.yPx).toBe(host.yPx + 5) // NOT shifted past lastChildBox — ::before is first in box order
  })

  it('falls back to the host origin for ::after when there is no last-child box (empty host)', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px' }),
      host,
      '::after',
      columnHostCs(),
      null
    )
    expect(box.yPx).toBe(host.yPx + 12) // host origin + its own margin-top, no lastChildBox to shift past
  })

  it('does not apply column flex-item positioning when the host is not a flex container', () => {
    const box = pseudoBox(
      cs({ width: '44px', height: '1px', marginTop: '12px', marginLeft: '325.719px', marginRight: '325.719px' }),
      host,
      '::after',
      undefined,
      lastChildBox
    )
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

  interface FakeRect {
    left: number
    top: number
    width: number
    height: number
  }
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
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderTopLeftRadius: '0px',
    borderTopWidth: '0px',
    borderTopStyle: 'none',
    borderTopColor: 'rgba(0,0,0,0)',
    borderRightWidth: '0px',
    borderRightStyle: 'none',
    borderRightColor: 'rgba(0,0,0,0)',
    borderBottomWidth: '0px',
    borderBottomStyle: 'none',
    borderBottomColor: 'rgba(0,0,0,0)',
    borderLeftWidth: '0px',
    borderLeftStyle: 'none',
    borderLeftColor: 'rgba(0,0,0,0)',
    opacity: '1',
    display: 'block',
    visibility: 'visible',
    content: 'none',
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

  it("emits a rect op at (0,0) with the ROOT element's own dimensions, before any child ops", () => {
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
    // Task 2 (native multi-page pdf): root's own background is always
    // exactly full-height by construction (boxOf(root, root)), so it always
    // qualifies as page chrome.
    expect(rootOp.pageChrome).toBe(true)

    // The child's own rect op exists and comes strictly AFTER root's.
    const childOpIndex = ops.findIndex((o) => o.kind === 'rect' && o.xPx === 5)
    expect(childOpIndex).toBeGreaterThan(0)
    // The child is a small 50x20 box, nowhere near 96% of root's 1000px
    // height — it must NOT be tagged as page chrome.
    expect((ops[childOpIndex] as Extract<DrawOp, { kind: 'rect' }>).pageChrome).toBeUndefined()
  })

  it('task 2 (native multi-page pdf) — single-page ops stay byte-stable aside from the new pageChrome tag', () => {
    install()
    const child = makeEl({ left: 5, top: 5, width: 50, height: 20 }, { backgroundColor: 'rgb(255, 0, 0)' })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, { backgroundColor: 'rgb(13, 14, 18)' }, [child])

    const ops = buildDrawList(root as unknown as HTMLElement)

    // Exact deep equality (not toMatchObject) over the WHOLE op list: every
    // geometry/color/radii field this walk has always produced is unchanged
    // by task 2 — the only new thing anywhere in this array is `pageChrome:
    // true` on the one op that legitimately qualifies (root's own full-height
    // background). paint.ts (pre-task-3) never reads `pageChrome` at all, so
    // this also demonstrates the actual exported PDF bytes for a single-page
    // doc are untouched by this task.
    expect(ops).toEqual([
      {
        kind: 'rect',
        xPx: 0,
        yPx: 0,
        wPx: 800,
        hPx: 1000,
        fill: { r: 13 / 255, g: 14 / 255, b: 18 / 255, a: 1 },
        radii: { tl: 0, tr: 0, br: 0, bl: 0 },
        pageChrome: true,
      },
      {
        kind: 'rect',
        xPx: 5,
        yPx: 5,
        wPx: 50,
        hPx: 20,
        fill: { r: 1, g: 0, b: 0, a: 1 },
        radii: { tl: 0, tr: 0, br: 0, bl: 0 },
      },
    ])
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

describe('buildDrawList — ::before/::after document-order invariant (fix round: gap in CI coverage)', () => {
  // Regression coverage for what buildDrawList's own `openForAfter`/
  // `closeUpTo` doc comment (and the b772f59 comment on the explicit root
  // step just above) warn about: an element's ::after must be deferred until
  // AFTER every one of its descendants' own ops — not fired right after its
  // own ::before — and must fire as soon as the walk moves on to a node
  // that's no longer its descendant (a later sibling), not only once at the
  // very end of the whole walk. Nothing in walk.test.ts exercised this
  // through buildDrawList itself before now (pseudoBox's own describe blocks
  // only test box GEOMETRY, in isolation from document order).
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

  interface FakeRect {
    left: number
    top: number
    width: number
    height: number
  }
  interface FakeEl {
    nodeType: number
    tagName: string
    classList: { contains: (c: string) => boolean }
    childNodes: FakeEl[]
    getBoundingClientRect: () => FakeRect
    contains: (n: FakeEl) => boolean
    cs: Record<string, string>
    beforeContent: string
    afterContent: string
  }

  // Real color/font fields are needed here (unlike the defect-1 suite above,
  // which never resolves actual pseudo TEXT content) so styledTextRun
  // produces a real run for a non-'none' ::before/::after content string.
  const BASE_CS: Record<string, string> = {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderTopLeftRadius: '0px',
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderBottomLeftRadius: '0px',
    borderTopWidth: '0px',
    borderTopStyle: 'none',
    borderTopColor: 'rgba(0,0,0,0)',
    borderRightWidth: '0px',
    borderRightStyle: 'none',
    borderRightColor: 'rgba(0,0,0,0)',
    borderBottomWidth: '0px',
    borderBottomStyle: 'none',
    borderBottomColor: 'rgba(0,0,0,0)',
    borderLeftWidth: '0px',
    borderLeftStyle: 'none',
    borderLeftColor: 'rgba(0,0,0,0)',
    opacity: '1',
    display: 'block',
    visibility: 'visible',
    content: 'none',
    color: 'rgb(0, 0, 0)',
    fontSize: '10px',
    fontStyle: 'normal',
    fontWeight: '400',
    fontFamily: 'Arial',
    letterSpacing: 'normal',
  }

  function makeCsFrom(fields: Record<string, string>): CSSStyleDeclaration {
    return {
      ...fields,
      getPropertyValue: (name: string) => fields[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] ?? '',
    } as unknown as CSSStyleDeclaration
  }

  function makeEl(
    rect: FakeRect,
    csOverrides: Record<string, string>,
    children: FakeEl[] = [],
    pseudo: { before?: string; after?: string } = {}
  ): FakeEl {
    const el: FakeEl = {
      nodeType: 1,
      tagName: 'DIV',
      classList: { contains: () => false },
      childNodes: children,
      getBoundingClientRect: () => rect,
      contains: (n) => n === el || children.some((c) => c === n || c.contains(n)),
      cs: { ...BASE_CS, ...csOverrides },
      beforeContent: pseudo.before ?? 'none',
      afterContent: pseudo.after ?? 'none',
    }
    return el
  }

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
    const canvasCtx = {
      font: '',
      measureText: () => ({ width: 6, fontBoundingBoxAscent: 9, actualBoundingBoxAscent: 9 }),
    }
    globalThis.document = {
      createTreeWalker: (root: unknown, _whatToShow: number, filter: { acceptNode: (n: unknown) => number }) =>
        fakeCreateTreeWalker(root as FakeEl, filter.acceptNode as (n: FakeEl) => number),
      // styledTextRun's ascentPx (text.ts) falls back to a canvas measurement
      // for a synthesized pseudo run — this is that canvas.
      createElement: () => ({ getContext: () => canvasCtx }),
    } as unknown as Document
    globalThis.getComputedStyle = ((el: unknown, pseudo?: string) => {
      const fake = el as FakeEl
      if (pseudo === '::before') return makeCsFrom({ ...BASE_CS, content: fake.beforeContent })
      if (pseudo === '::after') return makeCsFrom({ ...BASE_CS, content: fake.afterContent })
      return makeCsFrom(fake.cs)
    }) as unknown as typeof getComputedStyle
  }

  it("orders a host's ops as: host box -> host ::before -> child ops -> host ::after, before the next sibling", () => {
    install()

    const child = makeEl({ left: 10, top: 10, width: 30, height: 10 }, { backgroundColor: 'rgb(255, 0, 0)' })
    const host = makeEl(
      { left: 0, top: 0, width: 100, height: 50 },
      { backgroundColor: 'rgb(0, 0, 255)' },
      [child],
      { before: '"«"', after: '"»"' } // « and » — distinct, greppable sentinel glyphs
    )
    const sibling = makeEl({ left: 0, top: 50, width: 100, height: 20 }, { backgroundColor: 'rgb(0, 255, 0)' })
    const root = makeEl({ left: 0, top: 0, width: 100, height: 70 }, { backgroundColor: 'rgba(0, 0, 0, 0)' }, [
      host,
      sibling,
    ])

    const ops = buildDrawList(root as unknown as HTMLElement)

    const hostBoxIdx = ops.findIndex((o) => o.kind === 'rect' && o.fill?.r === 0 && o.fill?.g === 0 && o.fill?.b === 1)
    const hostBeforeIdx = ops.findIndex((o) => o.kind === 'text' && o.run.text === '«')
    const childBoxIdx = ops.findIndex((o) => o.kind === 'rect' && o.xPx === 10)
    const hostAfterIdx = ops.findIndex((o) => o.kind === 'text' && o.run.text === '»')
    const siblingBoxIdx = ops.findIndex((o) => o.kind === 'rect' && o.fill?.g === 1)

    for (const idx of [hostBoxIdx, hostBeforeIdx, childBoxIdx, hostAfterIdx, siblingBoxIdx])
      expect(idx).toBeGreaterThanOrEqual(0)

    // host's own box paints before its ::before.
    expect(hostBoxIdx).toBeLessThan(hostBeforeIdx)
    // ::before paints before any descendant's ops.
    expect(hostBeforeIdx).toBeLessThan(childBoxIdx)
    // ::after paints AFTER every descendant's ops (the defect-3 invariant) —
    // not immediately following ::before.
    expect(childBoxIdx).toBeLessThan(hostAfterIdx)
    // ::after fires as the walk exits host's subtree, strictly BEFORE the
    // next sibling's own ops — not deferred all the way to the end of the
    // whole walk (which closeUpTo(null) would also satisfy, but only
    // coincidentally, since host happens to be the last-but-one root child
    // here; this asserts the real "exiting a subtree" trigger instead).
    expect(hostAfterIdx).toBeLessThan(siblingBoxIdx)
  })
})

describe('boxOps/pseudoOps — radius-aware borders and pseudo borders (task 22)', () => {
  // Same stub-just-the-DOM-entry-points harness the two buildDrawList suites
  // above use, extended with a per-element `beforeCs` so a ::before pseudo
  // can carry its OWN border/radius/position, independent of its host's.
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle
  const originalConsoleWarn = console.warn
  const g = globalThis as unknown as { Node?: unknown; NodeFilter?: unknown; HTMLImageElement?: unknown }
  const originalNode = g.Node
  const originalNodeFilter = g.NodeFilter
  const originalHTMLImageElement = g.HTMLImageElement

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
    console.warn = originalConsoleWarn
    g.Node = originalNode
    g.NodeFilter = originalNodeFilter
    g.HTMLImageElement = originalHTMLImageElement
  })

  interface FakeRect {
    left: number
    top: number
    width: number
    height: number
  }
  interface FakeEl {
    nodeType: number
    tagName: string
    classList: { contains: (c: string) => boolean }
    childNodes: FakeEl[]
    lastElementChild: FakeEl | null
    getBoundingClientRect: () => FakeRect
    contains: (n: FakeEl) => boolean
    cs: Record<string, string>
    beforeCs: Record<string, string> | null
  }

  const NO_BORDER_NO_RADIUS: Record<string, string> = {
    borderTopWidth: '0px',
    borderTopStyle: 'none',
    borderTopColor: 'rgba(0,0,0,0)',
    borderRightWidth: '0px',
    borderRightStyle: 'none',
    borderRightColor: 'rgba(0,0,0,0)',
    borderBottomWidth: '0px',
    borderBottomStyle: 'none',
    borderBottomColor: 'rgba(0,0,0,0)',
    borderLeftWidth: '0px',
    borderLeftStyle: 'none',
    borderLeftColor: 'rgba(0,0,0,0)',
    borderTopLeftRadius: '0px',
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderBottomLeftRadius: '0px',
  }
  const BASE_CS: Record<string, string> = {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    ...NO_BORDER_NO_RADIUS,
    opacity: '1',
    display: 'block',
    visibility: 'visible',
    content: 'none',
    position: 'static',
    left: 'auto',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    width: 'auto',
    height: 'auto',
  }

  function makeCs(overrides: Record<string, string>): CSSStyleDeclaration {
    const merged: Record<string, string> = { ...BASE_CS, ...overrides }
    return {
      ...merged,
      getPropertyValue: (name: string) => merged[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] ?? '',
    } as unknown as CSSStyleDeclaration
  }

  function makeEl(
    rect: FakeRect,
    csOverrides: Record<string, string> = {},
    children: FakeEl[] = [],
    beforeCs: Record<string, string> | null = null
  ): FakeEl {
    const el: FakeEl = {
      nodeType: 1,
      tagName: 'DIV',
      classList: { contains: () => false },
      childNodes: children,
      lastElementChild: children.length ? children[children.length - 1] : null,
      getBoundingClientRect: () => rect,
      contains: (n) => n === el || children.some((c) => c === n || c.contains(n)),
      cs: { ...BASE_CS, ...csOverrides },
      beforeCs,
    }
    return el
  }

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
    globalThis.getComputedStyle = ((el: unknown, pseudo?: string) => {
      const fake = el as FakeEl
      if (pseudo === '::before') return makeCs(fake.beforeCs ?? { content: 'none' })
      if (pseudo === '::after') return makeCs({ content: 'none' })
      return makeCs(fake.cs)
    }) as unknown as typeof getComputedStyle
  }

  // .tpl-obsidian's real entry-card rule: `background: #15171d; border: 1px
  // solid #262a33; border-radius: 12px;` — the brief's concretely-reachable
  // defect 1 worked example.
  const CARD_BORDER: Record<string, string> = {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'rgb(38, 42, 51)',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: 'rgb(38, 42, 51)',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgb(38, 42, 51)',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'rgb(38, 42, 51)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    borderBottomRightRadius: '12px',
    borderBottomLeftRadius: '12px',
  }

  it('a uniform border on a rounded box emits ONE roundedBorder op, inset by width/2 (obsidian entry card)', () => {
    install()
    const card = makeEl({ left: 40, top: 60, width: 300, height: 80 }, CARD_BORDER)
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [card])

    const ops = buildDrawList(root as unknown as HTMLElement)

    const borderOps = ops.filter((o) => o.kind === 'roundedBorder')
    const lineOps = ops.filter((o) => o.kind === 'line')
    expect(borderOps.length).toBe(1) // not four straight lines
    expect(lineOps.length).toBe(0)

    const op = borderOps[0] as Extract<DrawOp, { kind: 'roundedBorder' }>
    // width/2 = 0.5 inset, same CSS-edge convention BORDER_EDGES uses.
    expect(op.xPx).toBeCloseTo(40.5, 6)
    expect(op.yPx).toBeCloseTo(60.5, 6)
    expect(op.wPx).toBeCloseTo(299, 6)
    expect(op.hPx).toBeCloseTo(79, 6)
    expect(op.widthPx).toBe(1)
    expect(op.radii).toEqual({ tl: 11.5, tr: 11.5, br: 11.5, bl: 11.5 }) // 12 - 0.5
    expect(op.color).toEqual({ r: 38 / 255, g: 42 / 255, b: 51 / 255, a: 1 })
    expect(op.dashed).toBeFalsy()
  })

  it('clamps the inset radius to 0 rather than going negative when width/2 exceeds the radius', () => {
    install()
    const card = makeEl(
      { left: 0, top: 0, width: 50, height: 50 },
      {
        ...CARD_BORDER,
        borderTopWidth: '20px',
        borderRightWidth: '20px',
        borderBottomWidth: '20px',
        borderLeftWidth: '20px',
        borderTopLeftRadius: '2px',
        borderTopRightRadius: '2px',
        borderBottomRightRadius: '2px',
        borderBottomLeftRadius: '2px',
      }
    )
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [card])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const op = ops.find((o) => o.kind === 'roundedBorder') as Extract<DrawOp, { kind: 'roundedBorder' }>
    expect(op.radii).toEqual({ tl: 0, tr: 0, br: 0, bl: 0 }) // 2 - 10 clamped to 0, not -8
  })

  it('a zero-radius bordered box keeps the exact old four-line behavior (no roundedBorder op)', () => {
    install()
    const flatCard = makeEl(
      { left: 40, top: 60, width: 300, height: 80 },
      {
        ...CARD_BORDER,
        borderTopLeftRadius: '0px',
        borderTopRightRadius: '0px',
        borderBottomRightRadius: '0px',
        borderBottomLeftRadius: '0px',
      }
    )
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [flatCard])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const lineOps = ops.filter((o) => o.kind === 'line')
    const roundedOps = ops.filter((o) => o.kind === 'roundedBorder')
    expect(roundedOps.length).toBe(0)
    expect(lineOps.length).toBe(4) // exactly the old per-edge BORDER_EDGES behavior

    // Same inset arithmetic BORDER_EDGES' own unit tests assert directly.
    const top = lineOps.find((o) => (o as Extract<DrawOp, { kind: 'line' }>).y1Px === 60.5)
    expect(top).toBeDefined() // top border inset DOWN by width/2 (1/2 = 0.5) from y=60
    const bottom = lineOps.find((o) => (o as Extract<DrawOp, { kind: 'line' }>).y1Px === 139.5)
    expect(bottom).toBeDefined() // bottom border inset UP by width/2 from y=140
  })

  it('mixed per-edge borders on a rounded box fall back to straight lines and dev-warn', () => {
    install()
    const warnSpy: string[] = []
    console.warn = ((...args: unknown[]) => {
      warnSpy.push(String(args[0]))
    }) as typeof console.warn

    const mixed = makeEl(
      { left: 0, top: 0, width: 100, height: 100 },
      {
        ...CARD_BORDER,
        borderTopWidth: '2px', // differs from the other three edges (1px)
      }
    )
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [mixed])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const roundedOps = ops.filter((o) => o.kind === 'roundedBorder')
    const lineOps = ops.filter((o) => o.kind === 'line')
    expect(roundedOps.length).toBe(0) // falls back, does not emit a (wrong) single path
    expect(lineOps.length).toBe(4) // all four edges still drawn, just as straight lines

    // vitest runs in DEV mode (import.meta.env.DEV === true, confirmed
    // separately), so the loud dev-warn this fallback is required to emit
    // actually fires here, not just in a real dev build.
    expect(warnSpy.some((m) => m.includes('mixed per-edge borders'))).toBe(true)
  })

  it('a rounded box with only SOME edges bordered (not all four) falls back to straight lines', () => {
    install()
    const partial = makeEl(
      { left: 0, top: 0, width: 100, height: 100 },
      {
        ...CARD_BORDER,
        borderRightStyle: 'none',
        borderRightWidth: '0px',
      }
    )
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [partial])

    const ops = buildDrawList(root as unknown as HTMLElement)
    expect(ops.filter((o) => o.kind === 'roundedBorder').length).toBe(0)
    expect(ops.filter((o) => o.kind === 'line').length).toBe(3) // top, bottom, left only
  })

  // .tpl-timeline's real circular marker rule: `left: -18px; top: 4px; width:
  // 9px; height: 9px; border-radius: 50%; background: var(--rm-bg); border:
  // 2px solid var(--rm-primary);` on `.rm-item::before` — the brief's
  // concretely-reachable defect 2 worked example. getComputedStyle resolves
  // `50%` to its actual px equivalent for a 9x9 box (4.5px), same as
  // cornerRadii's own doc comment describes.
  it('a pseudo-element with border-radius 50% + a uniform border renders its ring (timeline marker)', () => {
    install()
    const markerBeforeCs: Record<string, string> = {
      content: '""',
      position: 'absolute',
      left: '-18px',
      top: '4px',
      width: '9px',
      height: '9px',
      borderTopLeftRadius: '4.5px',
      borderTopRightRadius: '4.5px',
      borderBottomRightRadius: '4.5px',
      borderBottomLeftRadius: '4.5px',
      borderTopWidth: '2px',
      borderTopStyle: 'solid',
      borderTopColor: 'rgb(90, 110, 240)',
      borderRightWidth: '2px',
      borderRightStyle: 'solid',
      borderRightColor: 'rgb(90, 110, 240)',
      borderBottomWidth: '2px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'rgb(90, 110, 240)',
      borderLeftWidth: '2px',
      borderLeftStyle: 'solid',
      borderLeftColor: 'rgb(90, 110, 240)',
    }
    const item = makeEl({ left: 100, top: 50, width: 20, height: 20 }, {}, [], markerBeforeCs)
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [item])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const ring = ops.find((o) => o.kind === 'roundedBorder') as Extract<DrawOp, { kind: 'roundedBorder' }> | undefined
    expect(ring).toBeDefined()
    // pseudo box: xPx = host.xPx(100) + left(-18) = 82, yPx = host.yPx(50) + top(4) = 54, 9x9.
    // Inset by width/2 = 1: (83, 55), 7x7, radii 4.5 - 1 = 3.5 each corner.
    expect(ring!.xPx).toBeCloseTo(83, 6)
    expect(ring!.yPx).toBeCloseTo(55, 6)
    expect(ring!.wPx).toBeCloseTo(7, 6)
    expect(ring!.hPx).toBeCloseTo(7, 6)
    expect(ring!.radii).toEqual({ tl: 3.5, tr: 3.5, br: 3.5, bl: 3.5 })
    expect(ring!.widthPx).toBe(2)
    expect(ring!.color).toEqual({ r: 90 / 255, g: 110 / 255, b: 240 / 255, a: 1 })
  })

  it('a pseudo-element with no border paints no roundedBorder/line ops (unchanged baseline)', () => {
    install()
    const item = makeEl({ left: 100, top: 50, width: 20, height: 20 }, {}, [], {
      content: '""',
      width: '5px',
      height: '5px',
    })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [item])

    const ops = buildDrawList(root as unknown as HTMLElement)
    expect(ops.filter((o) => o.kind === 'roundedBorder' || o.kind === 'line').length).toBe(0)
  })
})

describe('buildDrawList — page-chrome tagging (task 2, native multi-page pdf plan)', () => {
  // Same stub-just-the-DOM-entry-points harness the earlier buildDrawList
  // suites use — see their own comments for why (this suite runs under
  // vitest's plain 'node' environment, no jsdom/happy-dom).
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

  interface FakeRect {
    left: number
    top: number
    width: number
    height: number
  }
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
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderTopLeftRadius: '0px',
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderBottomLeftRadius: '0px',
    borderTopWidth: '0px',
    borderTopStyle: 'none',
    borderTopColor: 'rgba(0,0,0,0)',
    borderRightWidth: '0px',
    borderRightStyle: 'none',
    borderRightColor: 'rgba(0,0,0,0)',
    borderBottomWidth: '0px',
    borderBottomStyle: 'none',
    borderBottomColor: 'rgba(0,0,0,0)',
    borderLeftWidth: '0px',
    borderLeftStyle: 'none',
    borderLeftColor: 'rgba(0,0,0,0)',
    opacity: '1',
    display: 'block',
    visibility: 'visible',
    content: 'none',
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

  it('tags a synthetic full-height sidebar rect (>= 96% of content height) as pageChrome', () => {
    install()
    // 970 / 1000 = 97% — above the 96% threshold (a two-column template's
    // dark sidebar band, per the plan spec section 2's worked example).
    const sidebar = makeEl({ left: 0, top: 0, width: 220, height: 970 }, { backgroundColor: 'rgb(15, 23, 42)' })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [sidebar])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const sidebarOp = ops.find((o) => o.kind === 'rect' && o.wPx === 220) as Extract<DrawOp, { kind: 'rect' }>
    expect(sidebarOp).toBeDefined()
    expect(sidebarOp.pageChrome).toBe(true)
  })

  it('does NOT tag a background rect below the 96% threshold (an ordinary entry card)', () => {
    install()
    // 500 / 1000 = 50% — well under threshold.
    const card = makeEl({ left: 40, top: 60, width: 300, height: 500 }, { backgroundColor: 'rgb(21, 23, 29)' })
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [card])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const cardOp = ops.find((o) => o.kind === 'rect' && o.wPx === 300) as Extract<DrawOp, { kind: 'rect' }>
    expect(cardOp).toBeDefined()
    expect(cardOp.pageChrome).toBeUndefined()
  })

  it('honors the 96% boundary exactly: >= tags, < does not', () => {
    install()
    const atThreshold = makeEl({ left: 0, top: 0, width: 100, height: 960 }, { backgroundColor: 'rgb(1, 2, 3)' }) // exactly 96%
    const belowThreshold = makeEl({ left: 100, top: 0, width: 100, height: 959.9 }, { backgroundColor: 'rgb(4, 5, 6)' }) // just under
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [atThreshold, belowThreshold])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const atOp = ops.find((o) => o.kind === 'rect' && o.hPx === 960) as Extract<DrawOp, { kind: 'rect' }>
    const belowOp = ops.find((o) => o.kind === 'rect' && o.hPx === 959.9) as Extract<DrawOp, { kind: 'rect' }>
    expect(atOp.pageChrome).toBe(true)
    expect(belowOp.pageChrome).toBeUndefined()
  })

  it('tags a gradient-filled full-height rect too (gradients repeat with the chrome rect they paint on, per spec section 2)', () => {
    install()
    const gradientCs = {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      backgroundImage: 'linear-gradient(120deg, rgb(79, 70, 229), color(srgb 0.85098 0.27451 0.545098))',
    }
    const banner = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, gradientCs)
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [banner])

    const ops = buildDrawList(root as unknown as HTMLElement)
    const gradientOp = ops.find((o) => o.kind === 'rect' && !!o.fillGradient) as Extract<DrawOp, { kind: 'rect' }>
    expect(gradientOp).toBeDefined()
    expect(gradientOp.pageChrome).toBe(true)
  })

  it('never tags a rect with neither fill nor gradient (nothing is even emitted for a bare/transparent box)', () => {
    install()
    // A borderless, backgroundless full-height spacer div — boxOps only ever
    // pushes a rect op when there's a fill or gradient, so there is nothing
    // for the tagging pass to find here either.
    const spacer = makeEl({ left: 0, top: 0, width: 10, height: 1000 }, {})
    const root = makeEl({ left: 0, top: 0, width: 800, height: 1000 }, {}, [spacer])

    const ops = buildDrawList(root as unknown as HTMLElement)
    expect(ops.some((o) => o.kind === 'rect' && o.wPx === 10)).toBe(false)
  })
})

describe('extractPageBlocks (task 2, native multi-page pdf plan)', () => {
  // A dedicated fake-DOM harness (distinct from buildDrawList's own): this
  // function never touches getComputedStyle for pseudo-elements, borders, or
  // treewalker filtering the way buildDrawList does — it needs real Text
  // child nodes (nodeType 3) interleaved with Element child nodes, plus a
  // `document.createRange` stub whose rect comes straight off the fake text
  // node itself (single-line per node — matches every fixture below; a
  // dedicated multi-line-wrap test lives in text.test.ts against
  // `textNodeLineSegments` directly, the shared helper this module reuses).
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle
  const originalConsoleWarn = console.warn
  const g = globalThis as unknown as { Node?: unknown }
  const originalNode = g.Node

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
    console.warn = originalConsoleWarn
    g.Node = originalNode
  })

  interface FakeRect {
    top: number
    bottom: number
    left: number
    right: number
  }
  interface FakeText {
    nodeType: number
    data: string
    rect: FakeRect
  }
  interface FakeEl {
    nodeType: number
    tagName: string
    classList: { contains: (c: string) => boolean }
    childNodes: Array<FakeEl | FakeText>
    getBoundingClientRect: () => FakeRect
    cs: { display: string; visibility: string }
  }

  function elm(
    classes: string[],
    rect: FakeRect,
    children: Array<FakeEl | FakeText> = [],
    opts: { tagName?: string; hidden?: boolean } = {}
  ): FakeEl {
    const classSet = new Set(classes)
    return {
      nodeType: 1,
      tagName: opts.tagName ?? 'DIV',
      classList: { contains: (c: string) => classSet.has(c) },
      childNodes: children,
      getBoundingClientRect: () => rect,
      cs: { display: opts.hidden ? 'none' : 'block', visibility: 'visible' },
    }
  }
  function txt(data: string, rect: FakeRect): FakeText {
    return { nodeType: 3, data, rect }
  }

  function install() {
    g.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 }
    globalThis.document = {
      // Single-line-per-node stub: every offset query for a given text node
      // returns that SAME node's own rect, so the internal wrap-detection
      // loop never sees a top jump — exactly one segment per node, spanning
      // its whole (already-known) rect. Multi-line wrapping itself is
      // covered directly against textNodeLineSegments in text.test.ts.
      createRange: () => {
        let node: FakeText | null = null
        return {
          setStart: (n: unknown) => {
            node = n as FakeText
          },
          setEnd: () => {},
          getBoundingClientRect: () => node!.rect,
        }
      },
    } as unknown as Document
    globalThis.getComputedStyle = ((node: unknown) => (node as FakeEl).cs) as unknown as typeof getComputedStyle
  }

  it('builds section-title / entry-title-row / line / entry-gap / section-gap blocks with the right tiers and keepWithNext', () => {
    install()

    // Section 1: title, entry 1 (a title ROW collapsed to one block + a
    // bullet line inside a <ul><li>), entry 2 (a bare text line).
    const bulletText = txt('Did a thing', { top: 155, bottom: 170, left: 20, right: 150 })
    const bulletLi = elm([], { top: 155, bottom: 170, left: 20, right: 150 }, [bulletText])
    const bulletsUl = elm(['rm-bullets'], { top: 150, bottom: 175, left: 0, right: 300 }, [bulletLi])
    const itemHead1 = elm(['rm-item-head'], { top: 130, bottom: 150, left: 0, right: 300 })
    const entry1 = elm(['rm-item'], { top: 130, bottom: 175, left: 0, right: 300 }, [itemHead1, bulletsUl])

    const entry2Text = txt('Second entry text', { top: 180, bottom: 195, left: 0, right: 250 })
    const entry2 = elm(['rm-item'], { top: 180, bottom: 195, left: 0, right: 250 }, [entry2Text])

    const title1 = elm(['rm-section-title'], { top: 100, bottom: 120, left: 0, right: 200 })
    const body1 = elm(['rm-section-body'], { top: 130, bottom: 195, left: 0, right: 300 }, [entry1, entry2])
    const section1 = elm(['rm-section'], { top: 100, bottom: 195, left: 0, right: 300 }, [title1, body1])

    // Section 2: title, one skill-group entry whose ONLY content is an
    // `.rm-level` (name + rating meter) title row.
    const levelRow = elm(['rm-level'], { top: 280, bottom: 300, left: 0, right: 300 })
    const skillGroup = elm(['rm-skill-group'], { top: 280, bottom: 300, left: 0, right: 300 }, [levelRow])
    const title2 = elm(['rm-section-title'], { top: 250, bottom: 270, left: 0, right: 150 })
    const body2 = elm(['rm-section-body'], { top: 280, bottom: 300, left: 0, right: 300 }, [skillGroup])
    const section2 = elm(['rm-section'], { top: 250, bottom: 300, left: 0, right: 300 }, [title2, body2])

    const main = elm(['rm-col-main'], { top: 0, bottom: 300, left: 0, right: 800 }, [section1, section2])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [main])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 100, bottomPx: 120, keepWithNext: true }, // section 1 title
      { kind: 'entry-gap', topPx: 120, bottomPx: 130 }, // between the title and entry 1
      { kind: 'line', topPx: 130, bottomPx: 150, keepWithNext: true }, // entry 1's item-head row
      { kind: 'line', topPx: 155, bottomPx: 170 }, // entry 1's bullet line
      { kind: 'entry-gap', topPx: 170, bottomPx: 180 }, // between entry 1 and entry 2
      { kind: 'line', topPx: 180, bottomPx: 195 }, // entry 2's own text line
      { kind: 'section-gap', topPx: 195, bottomPx: 250 }, // between section 1 and section 2
      { kind: 'line', topPx: 250, bottomPx: 270, keepWithNext: true }, // section 2 title
      { kind: 'entry-gap', topPx: 270, bottomPx: 280 }, // between the title and its one entry
      // The rm-level row is this entry's ONLY content (a single-line entry,
      // e.g. a skills/languages row) -- no keepWithNext (task 6b fix 3: that
      // flag is now scoped to "a body line follows within the same entry",
      // which isn't the case here).
      { kind: 'line', topPx: 280, bottomPx: 300 },
    ])
  })

  it('emits an atomic block for an image and for a chip row, without decomposing either into lines', () => {
    install()

    const img = elm([], { top: 400, bottom: 440, left: 0, right: 40 }, [], { tagName: 'IMG' })
    // The chip's own text must NOT surface as its own 'line' block — the
    // whole .rm-chips row is one indivisible atomic unit.
    const chipText = txt('React', { top: 450, bottom: 465, left: 0, right: 50 })
    const chips = elm(['rm-chips'], { top: 450, bottom: 470, left: 0, right: 300 }, [chipText])
    const entry = elm(['rm-item'], { top: 400, bottom: 470, left: 0, right: 300 }, [img, chips])
    const title = elm(['rm-section-title'], { top: 370, bottom: 390, left: 0, right: 150 })
    const body = elm(['rm-section-body'], { top: 400, bottom: 470, left: 0, right: 300 }, [entry])
    const section = elm(['rm-section'], { top: 370, bottom: 470, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 370, bottomPx: 390, keepWithNext: true },
      { kind: 'entry-gap', topPx: 390, bottomPx: 400 },
      { kind: 'atomic', topPx: 400, bottomPx: 440 },
      { kind: 'atomic', topPx: 450, bottomPx: 470 },
    ])
  })

  it('fix round: coalesces three same-line sibling text-node blocks (plain + bold + plain, e.g. "with 8+ years building") into ONE line block', () => {
    install()

    // A bullet whose rendered HTML is plain text, then a <strong> run, then
    // more plain text — three SIBLING text nodes on the same visual line.
    // Range.getBoundingClientRect() correctly reports the shared line box's
    // real vertical extent for each of them, so all three come out with
    // (near-)identical y-spans (a 0.3px float-noise wobble on the middle
    // one, well within the 0.5px coalescing epsilon) — before the fix this
    // produced THREE overlapping 'line' blocks; after it, exactly one.
    const before = txt('Engineer with ', { top: 200, bottom: 216, left: 0, right: 90 })
    const bold = txt('8+ years', { top: 200.3, bottom: 216, left: 90, right: 140 })
    const after = txt(' building things.', { top: 200, bottom: 216, left: 140, right: 250 })
    const strong = elm([], { top: 200.3, bottom: 216, left: 90, right: 140 }, [bold])
    const li = elm([], { top: 200, bottom: 216, left: 0, right: 250 }, [before, strong, after])
    const bulletsUl = elm(['rm-bullets'], { top: 200, bottom: 220, left: 0, right: 300 }, [li])
    const entry = elm(['rm-item'], { top: 200, bottom: 220, left: 0, right: 300 }, [bulletsUl])
    const title = elm(['rm-section-title'], { top: 170, bottom: 190, left: 0, right: 150 })
    const body = elm(['rm-section-body'], { top: 200, bottom: 220, left: 0, right: 300 }, [entry])
    const section = elm(['rm-section'], { top: 170, bottom: 220, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const warnings: unknown[][] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args)
    }) as typeof console.warn

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 170, bottomPx: 190, keepWithNext: true },
      { kind: 'entry-gap', topPx: 190, bottomPx: 200 },
      { kind: 'line', topPx: 200, bottomPx: 216 }, // the three same-line siblings coalesced into ONE block
    ])
    // The fix's whole point: no spurious overlap warning for ordinary
    // inline-formatted text.
    expect(warnings.length).toBe(0)
  })

  it('skips no-print and display:none elements entirely — canvas-only edit chrome never contributes a block', () => {
    install()

    // A no-print delete button with a big rect that would dominate the
    // entry's own extent if it leaked through, plus a hidden note — neither
    // should contribute anything, whether this ran against the print DOM
    // (where neither exists) or the live editable canvas (where both do).
    const deleteBtn = elm(['rm-item-del', 'no-print'], { top: 100, bottom: 900, left: 0, right: 20 })
    const hiddenNote = elm([], { top: 100, bottom: 900, left: 0, right: 900 }, [], { hidden: true })
    const realText = txt('Only this counts', { top: 130, bottom: 145, left: 0, right: 150 })
    const entry = elm(['rm-item'], { top: 100, bottom: 145, left: 0, right: 300 }, [deleteBtn, hiddenNote, realText])
    const title = elm(['rm-section-title'], { top: 70, bottom: 90, left: 0, right: 150 })
    const body = elm(['rm-section-body'], { top: 100, bottom: 145, left: 0, right: 300 }, [entry])
    const section = elm(['rm-section'], { top: 70, bottom: 145, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 70, bottomPx: 90, keepWithNext: true },
      { kind: 'entry-gap', topPx: 90, bottomPx: 130 },
      { kind: 'line', topPx: 130, bottomPx: 145 },
    ])
  })

  it('returns an empty array for a root with no .rm-section at all', () => {
    install()
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 })
    expect(extractPageBlocks(root as unknown as HTMLElement)).toEqual([])
  })

  it('dev-warns (does not throw) when extracted ink blocks overlap in y — e.g. a same-row icon beside its title text', () => {
    install()
    const warnings: unknown[][] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args)
    }) as typeof console.warn

    // A decorative icon (atomic) sitting BESIDE a text run on the same
    // visual row rather than stacked above/below it — both measure as ink at
    // roughly the same y. The known title/meta-row cases (item-head,
    // item-sub, level, section-title) are collapsed to one block precisely
    // to avoid this (see extractPageBlocks's own doc comment), but an ad hoc
    // layout can still produce it — the sanity check exists to catch that
    // without taking the whole export down.
    const icon = elm([], { top: 100, bottom: 140, left: 0, right: 20 }, [], { tagName: 'svg' })
    const sideText = txt('beside the icon', { top: 110, bottom: 125, left: 25, right: 150 })
    const entry = elm(['rm-item'], { top: 100, bottom: 140, left: 0, right: 300 }, [icon, sideText])
    const title = elm(['rm-section-title'], { top: 60, bottom: 80, left: 0, right: 150 })
    const body = elm(['rm-section-body'], { top: 100, bottom: 140, left: 0, right: 300 }, [entry])
    const section = elm(['rm-section'], { top: 60, bottom: 140, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    expect(() => extractPageBlocks(root as unknown as HTMLElement)).not.toThrow()
    expect(warnings.some((args) => String(args[0]).includes('overlap'))).toBe(true)
  })

  it('task 6b: a grid-stretched title cell emits blocks from its real text line, not its ballooned box, so entry gaps survive', () => {
    install()

    // The gutter label cell (atelier's `section: 'side'` layout) is CSS
    // grid-stretched to the row's full height -- its OWN bounding box is
    // 800px tall even though its only content is one 20px text line at the
    // very top (probe, task-6b brief: `{kind:'line', top:243, h:1627,
    // keepWithNext:true}` for the real template). Before the fix this
    // collapsed to one giant 'line' block spanning the whole section, so
    // paginate.ts found no legal gap inside it at all.
    const titleText = txt('SECTION TITLE', { top: 100, bottom: 120, left: 0, right: 90 })
    const title = elm(['rm-section-title'], { top: 100, bottom: 900, left: 0, right: 100 }, [titleText])

    // Fix-round-1 (M8): real atelier "side" geometry -- the body CELL is
    // SIDE BY SIDE with the label cell, sharing the grid row's own top edge
    // (topPx: 100), not stacked sequentially below it. The first entry's
    // own content still starts a few px after the label's real text ends
    // (ordinary body-internal spacing), so this remains a genuinely legal,
    // non-overlapping tiling -- the earlier fixture's "label sits above the
    // body" shape (body box starting only after the label's box) understated
    // how tightly the label and body actually share vertical space.
    const entry1Text = txt('Entry one', { top: 125, bottom: 145, left: 110, right: 300 })
    const entry1 = elm(['rm-item'], { top: 125, bottom: 145, left: 110, right: 300 }, [entry1Text])
    const entry2Text = txt('Entry two', { top: 155, bottom: 175, left: 110, right: 300 })
    const entry2 = elm(['rm-item'], { top: 155, bottom: 175, left: 110, right: 300 }, [entry2Text])

    const body = elm(['rm-section-body'], { top: 100, bottom: 900, left: 110, right: 300 }, [entry1, entry2])
    const section = elm(['rm-section'], { top: 100, bottom: 900, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const warnings: unknown[][] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args)
    }) as typeof console.warn

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 100, bottomPx: 120, keepWithNext: true }, // only the real text line, not the 800px box
      { kind: 'entry-gap', topPx: 120, bottomPx: 125 },
      { kind: 'line', topPx: 125, bottomPx: 145 },
      { kind: 'entry-gap', topPx: 145, bottomPx: 155 }, // survives -- not swallowed by the stretched box
      { kind: 'line', topPx: 155, bottomPx: 175 },
    ])
    // The fix's whole point: no spurious overlap/negative-gap warning
    // between the (now-correctly-sized) title block and the entries below
    // it, even with the label and body genuinely sharing the row's top edge.
    expect(warnings.length).toBe(0)
  })

  it('I1 (fix round 1): a decomposed SECTION title keeps keepWithNext on EVERY emitted line, not just the last', () => {
    install()

    // Grid-stretched AND naturally wraps to two real lines (sec-side CSS
    // wraps narrow gutter labels by design) -- box height 800 vs a 40px
    // two-line text union still triggers decomposition (Fix 1). Before I1,
    // only the LAST wrapped line kept keepWithNext, leaving the gap between
    // the heading's own two lines as a legal (and disastrous) cut candidate.
    const line1 = txt('First line of a wrapped', { top: 100, bottom: 118, left: 0, right: 90 })
    const line2 = txt('gutter label heading', { top: 122, bottom: 140, left: 0, right: 90 })
    const title = elm(['rm-section-title'], { top: 100, bottom: 900, left: 0, right: 100 }, [line1, line2])
    const section = elm(['rm-section'], { top: 100, bottom: 900, left: 0, right: 300 }, [title])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 100, bottomPx: 118, keepWithNext: true }, // first wrapped line -- was previously unprotected
      { kind: 'line', topPx: 122, bottomPx: 140, keepWithNext: true }, // last wrapped line -- section titles always keep it
    ])
  })

  it('I1 (fix round 1): a decomposed ENTRY title with no body content strips keepWithNext only from its LAST line', () => {
    install()

    const line1 = txt('Wrapped entry', { top: 130, bottom: 148, left: 0, right: 90 })
    const line2 = txt('title text', { top: 152, bottom: 170, left: 0, right: 90 })
    const itemHead = elm(['rm-item-head'], { top: 130, bottom: 900, left: 0, right: 100 }, [line1, line2])
    const entry = elm(['rm-item'], { top: 130, bottom: 900, left: 0, right: 100 }, [itemHead])
    const title = elm(['rm-section-title'], { top: 100, bottom: 120, left: 0, right: 150 })
    const body = elm(['rm-section-body'], { top: 130, bottom: 900, left: 0, right: 300 }, [entry])
    const section = elm(['rm-section'], { top: 100, bottom: 900, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 100, bottomPx: 120, keepWithNext: true }, // section title
      { kind: 'entry-gap', topPx: 120, bottomPx: 130 },
      { kind: 'line', topPx: 130, bottomPx: 148, keepWithNext: true }, // entry title's FIRST wrapped line -- glued to its own second line
      { kind: 'line', topPx: 152, bottomPx: 170 }, // entry title's LAST wrapped line -- no body follows, fix-3 strips it
    ])
  })

  it('M3 (fix round 1): a decomposed row whose only ink resolves to a zero-height atomic falls back to the box, never vanishing', () => {
    install()

    // A zero-height atomic child (its own getBoundingClientRect collapses to
    // top===bottom) whose subtree still contains real text -- textLineUnion
    // finds that text (triggering the decompose check), but
    // collectChildInk's own atomic-collapse (pushOwnBoxBlock's zero-height
    // guard) drops it entirely, so naively pushing whatever coalesced
    // produced left the section title with ZERO blocks: it vanished from
    // the page-block list, dropping the leading entry-gap along with it.
    const hiddenText = txt('x', { top: 100, bottom: 115, left: 0, right: 10 })
    const atomicChild = elm([], { top: 100, bottom: 100, left: 0, right: 10 }, [hiddenText], { tagName: 'IMG' })
    const title = elm(['rm-section-title'], { top: 100, bottom: 900, left: 0, right: 100 }, [atomicChild])
    const section = elm(['rm-section'], { top: 100, bottom: 900, left: 0, right: 300 }, [title])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    // Falls back to the plain (undecomposed) box block instead of vanishing.
    expect(blocks).toEqual([{ kind: 'line', topPx: 100, bottomPx: 900, keepWithNext: true }])
  })

  it('M4 (fix round 1): a row whose atomic child is TALLER than its text union falls back to the box, no overlap warn', () => {
    install()

    const warnings: unknown[][] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args)
    }) as typeof console.warn

    // atomic 100..160 (h:60) alongside a much shorter text line 100..120
    // (h:20) -- decomposing anyway (pre-M4) produced an atomic block and a
    // line block at ~the same y, tripping the very blocks-overlap dev-warn
    // the row-collapse exists to prevent.
    const icon = elm([], { top: 100, bottom: 160, left: 0, right: 20 }, [], { tagName: 'svg' })
    const labelText = txt('Label', { top: 100, bottom: 120, left: 25, right: 90 })
    const title = elm(['rm-section-title'], { top: 100, bottom: 900, left: 0, right: 100 }, [icon, labelText])
    const section = elm(['rm-section'], { top: 100, bottom: 900, left: 0, right: 300 }, [title])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([{ kind: 'line', topPx: 100, bottomPx: 900, keepWithNext: true }])
    expect(warnings.some((args) => String(args[0]).includes('overlap'))).toBe(false)
  })

  it('task 6b: a title box only slightly taller than its own text (ordinary padding) stays a single box block, no churn', () => {
    install()

    // box height 44 vs text height 20: ratio 2.2 clears 1.6x, but the
    // absolute slack (24) does NOT clear the brief's `> 24px` bound (it's
    // exactly 24) -- ordinary padding must not trigger decomposition.
    const titleText = txt('SECTION TITLE', { top: 100, bottom: 120, left: 0, right: 90 })
    const title = elm(['rm-section-title'], { top: 100, bottom: 144, left: 0, right: 100 }, [titleText])
    const body = elm(['rm-section-body'], { top: 144, bottom: 160, left: 0, right: 300 })
    const section = elm(['rm-section'], { top: 100, bottom: 160, left: 0, right: 300 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    // The whole 44px box, unchanged -- not decomposed to the 20px text line.
    expect(blocks).toEqual([{ kind: 'line', topPx: 100, bottomPx: 144, keepWithNext: true }])
  })

  it('task 6b fix 3: entry title rows keep keepWithNext ONLY when body content follows within the same entry', () => {
    install()

    // Section title -- always keepWithNext, unchanged (genuine widow
    // protection between a heading and its first entry).
    const title = elm(['rm-section-title'], { top: 100, bottom: 120, left: 0, right: 200 })

    // Three single-line entries in a row (certifications/awards/languages/
    // interests shape: a bare title span, no body line at all -- see the
    // module doc comment on TITLE_ROW_CLASSES). Live repro (task-6b fix-3
    // brief): a run of these used to chain into one unbreakable
    // keepWithNext run because each one's ONLY block kept keepWithNext,
    // banning the entry-gap that should separate it from the next entry.
    const mini1Title = elm(['rm-mini-title'], { top: 130, bottom: 145, left: 0, right: 200 })
    const entry1 = elm(['rm-mini'], { top: 130, bottom: 145, left: 0, right: 200 }, [mini1Title])
    const mini2Title = elm(['rm-mini-title'], { top: 155, bottom: 170, left: 0, right: 200 })
    const entry2 = elm(['rm-mini'], { top: 155, bottom: 170, left: 0, right: 200 }, [mini2Title])
    const mini3Title = elm(['rm-mini-title'], { top: 180, bottom: 195, left: 0, right: 200 })
    const entry3 = elm(['rm-mini'], { top: 180, bottom: 195, left: 0, right: 200 }, [mini3Title])

    // A fourth entry that DOES have body content below its title row -- its
    // title must still keep keepWithNext.
    const itemHead = elm(['rm-item-head'], { top: 210, bottom: 225, left: 0, right: 200 })
    const bodyText = txt('Body line', { top: 230, bottom: 245, left: 0, right: 200 })
    const entry4 = elm(['rm-item'], { top: 210, bottom: 245, left: 0, right: 200 }, [itemHead, bodyText])

    const body = elm(['rm-section-body'], { top: 130, bottom: 245, left: 0, right: 200 }, [
      entry1,
      entry2,
      entry3,
      entry4,
    ])
    const section = elm(['rm-section'], { top: 100, bottom: 245, left: 0, right: 200 }, [title, body])
    const root = elm(['rm-root'], { top: 0, bottom: 1000, left: 0, right: 800 }, [section])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(blocks).toEqual([
      { kind: 'line', topPx: 100, bottomPx: 120, keepWithNext: true }, // section title -- unchanged
      { kind: 'entry-gap', topPx: 120, bottomPx: 130 },
      { kind: 'line', topPx: 130, bottomPx: 145 }, // entry1: single-line, NO keepWithNext
      { kind: 'entry-gap', topPx: 145, bottomPx: 155 },
      { kind: 'line', topPx: 155, bottomPx: 170 }, // entry2: single-line, NO keepWithNext
      { kind: 'entry-gap', topPx: 170, bottomPx: 180 },
      { kind: 'line', topPx: 180, bottomPx: 195 }, // entry3: single-line, NO keepWithNext
      { kind: 'entry-gap', topPx: 195, bottomPx: 210 },
      { kind: 'line', topPx: 210, bottomPx: 225, keepWithNext: true }, // entry4 title: body follows, KEEPS it
      { kind: 'line', topPx: 230, bottomPx: 245 }, // entry4 body line
    ])
  })

  it('task 2b: two-column layout combines .rm-col-main and .rm-col-aside via combineColumns, and the task-2 dev-warn no longer fires', () => {
    install()
    const warnings: unknown[][] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args)
    }) as typeof console.warn

    // Aside (sidebar): title + one entry, y range [0,50] — SHORTER than
    // main, and laid out SIDE BY SIDE with it (same y range, different x —
    // x doesn't matter to this module, only that the two subtrees are
    // SIBLINGS in the DOM rather than one nested inside the other).
    const asideLevel = elm(['rm-level'], { top: 30, bottom: 50, left: 0, right: 200 })
    const asideEntry = elm(['rm-skill-group'], { top: 30, bottom: 50, left: 0, right: 200 }, [asideLevel])
    const asideTitle = elm(['rm-section-title'], { top: 0, bottom: 20, left: 0, right: 200 })
    const asideBody = elm(['rm-section-body'], { top: 30, bottom: 50, left: 0, right: 200 }, [asideEntry])
    const asideSection = elm(['rm-section'], { top: 0, bottom: 50, left: 0, right: 200 }, [asideTitle, asideBody])
    const aside = elm(['rm-col-aside'], { top: 0, bottom: 400, left: 0, right: 200 }, [asideSection])

    // Main: title + entry, restarting at y=0 (same as aside) then running
    // on to y=55 — the exact shape that used to defeat the old flat
    // root-wide walk: main's blocks restart at y=0 right after aside's own
    // had already reached y=50 in document order, producing a negative-
    // height "section-gap" (50 -> 0) and tripping the sorted/overlap warns.
    const mainText = txt('Body text', { top: 40, bottom: 55, left: 210, right: 400 })
    const mainEntry = elm(['rm-item'], { top: 40, bottom: 55, left: 210, right: 400 }, [mainText])
    const mainTitle = elm(['rm-section-title'], { top: 0, bottom: 20, left: 210, right: 400 })
    const mainBody = elm(['rm-section-body'], { top: 40, bottom: 55, left: 210, right: 400 }, [mainEntry])
    const mainSection = elm(['rm-section'], { top: 0, bottom: 55, left: 210, right: 400 }, [mainTitle, mainBody])
    const main = elm(['rm-col-main'], { top: 0, bottom: 400, left: 210, right: 400 }, [mainSection])

    const root = elm(['rm-root'], { top: 0, bottom: 400, left: 0, right: 400 }, [aside, main])

    const blocks = extractPageBlocks(root as unknown as HTMLElement)

    expect(warnings.length).toBe(0) // the fix's whole point: no false "unsorted/overlap" warnings

    // Sorted and non-overlapping — the same invariant sanityCheckPageBlocks
    // polices, now genuinely satisfied instead of accidentally dodged.
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].topPx).toBeGreaterThanOrEqual(blocks[i - 1].topPx)
      expect(blocks[i].topPx).toBeGreaterThanOrEqual(blocks[i - 1].bottomPx)
    }
    expect(blocks[0].topPx).toBe(0)
    expect(blocks[blocks.length - 1].bottomPx).toBe(55) // the combined extent, not either column's alone

    // combineColumns's own unit tests (paginate.test.ts) pin the exact
    // interval arithmetic; this integration test only needs to prove the
    // wiring lands on the SAME shape: both titles start together (kwn),
    // aside's own entry-gap[20,30] is bridged by main still being inked
    // there (no combined gap at [20,30]), and a genuine mutual entry-gap
    // survives at [25,30] once aside is ALSO gapped there. The trailing
    // merged ink run [30,55] does NOT carry keepWithNext even though
    // aside's own rm-level row (kwn=true) feeds into it — aside goes out of
    // range at y=50, so main's own plain content [50,55] is the LAST
    // contributor at the run's trailing edge, and last-contributing-span-
    // per-column semantics (fix round, paginate.test.ts) means that plain
    // content, not the earlier heading, decides the flag.
    expect(blocks).toEqual([
      { kind: 'line', topPx: 0, bottomPx: 20, keepWithNext: true },
      { kind: 'entry-gap', topPx: 20, bottomPx: 30 },
      { kind: 'line', topPx: 30, bottomPx: 55 },
    ])
  })
})
