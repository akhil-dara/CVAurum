import { describe, expect, it } from 'vitest'
import { auditContrast, groupBySetting } from './audit'
import { parseColor, type Rgba } from './color'
import type { ArtboardSnapshot, NodeSnapshot, StyleSnapshot } from './types'

/* A page, written out. The audit never touches a DOM, so a page can be
 * stated here exactly as a browser would have reported it - which is the
 * only way to hold the two things every earlier attempt missed, a list
 * marker and a decorative numeral, to a test at all: neither is a text node
 * a test could write. */
const style = (o: Partial<StyleSnapshot> = {}): StyleSnapshot => ({
  color: 'rgb(26, 26, 26)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  backgroundClip: 'border-box',
  opacity: 1,
  display: 'block',
  visibility: 'visible',
  fontSizePx: 12.8, // 9.6pt: small text, so 4.5:1
  fontWeight: 400,
  position: 'static',
  zIndex: 'auto',
  ...o,
})

const node = (o: Partial<NodeSnapshot> = {}): NodeSnapshot => ({
  tag: 'div',
  classes: [],
  ariaHidden: false,
  deco: false,
  text: '',
  box: { x: 0, y: 0, w: 400, h: 24 },
  style: style(),
  children: [],
  ...o,
})

const VARS: Record<string, string> = {
  '--rm-text': '#1a1a1a',
  '--rm-muted': '#9aa3ad',
  '--rm-primary': '#2563eb',
  '--rm-bg': '#ffffff',
  '--rm-sidebar-bg': '#0f172a',
  '--rm-sidebar-text': '#e2e8f0',
  // a derivation that came out too pale to read: the defect this checker has
  // to name as a defect rather than as somebody's choice
  '--rm-primary-ink': '#7aa7f0',
  '--rm-heading-color': '#8ab4f8',
}

const page = (children: NodeSnapshot[], rootStyle: Partial<StyleSnapshot> = {}): ArtboardSnapshot => ({
  root: node({
    classes: ['rm-root', 'tpl-folio', 'sec-underline'],
    box: { x: 0, y: 0, w: 794, h: 1123 },
    style: style({ backgroundColor: 'rgb(255, 255, 255)', ...rootStyle }),
    children,
  }),
  vars: VARS,
  template: 'folio',
})

describe('the audit', () => {
  it('faults a muted ink the author chose, and names the control that set it', () => {
    const report = auditContrast(
      page([
        node({ classes: ['rm-item-date'], text: 'Jan 2021 - Present', style: style({ color: 'rgb(154, 163, 173)' }) }),
      ])
    )
    expect(report.findings).toHaveLength(1)
    const f = report.findings[0]
    expect(f.origin).toBe('author')
    expect(f.setting.label).toBe('Muted text')
    expect(f.setting.path).toBe('theme.muted')
    expect(f.foreground).toBe('#9aa3ad')
    expect(f.background).toBe('#ffffff')
    expect(f.required).toBe(4.5)
    expect(f.measured).toBeLessThan(4.5)
    expect(f.kind).toBe('text')
  })

  it('offers the nearest colour that passes, and that colour passes', () => {
    const report = auditContrast(
      page([node({ classes: ['rm-item-date'], text: 'Remote', style: style({ color: 'rgb(154, 163, 173)' }) })])
    )
    const f = report.findings[0]
    expect(f.suggestion).toBeDefined()
    expect(f.suggestion!.measured).toBeGreaterThanOrEqual(f.required)
    expect(f.suggestion!.color).not.toBe(f.foreground)
  })

  it('says nothing about a pair that reads', () => {
    const report = auditContrast(page([node({ text: 'Body copy', style: style({ color: 'rgb(26, 26, 26)' }) })]))
    expect(report.findings).toHaveLength(0)
    expect(report.checked).toBe(1)
  })

  it('finds a list MARKER, which is a pseudo-element and not a text node', () => {
    const li = node({
      tag: 'li',
      classes: ['rm-bullet'],
      text: 'Shipped the thing',
      style: style({ display: 'list-item', color: 'rgb(26, 26, 26)' }),
      marker: style({ color: 'rgb(200, 205, 210)', content: '•' }),
    })
    const report = auditContrast(page([node({ tag: 'ul', classes: ['rm-bullets'], children: [li] })]))
    const marker = report.findings.find((f) => f.kind === 'marker')
    expect(marker, 'the marker must be measured').toBeDefined()
    expect(marker!.sample).toBe('•')
    expect(marker!.measured).toBeLessThan(4.5)
    // ...and the item's own words, which read, are not faulted with it.
    expect(report.findings.filter((f) => f.kind === 'text')).toHaveLength(0)
  })

  it('finds a DECORATIVE numeral, which the exported file carries no text span for', () => {
    const numeral = node({
      tag: 'span',
      classes: ['rm-deco', 'rm-section-number'],
      deco: true,
      ariaHidden: true,
      text: '01',
      style: style({ color: 'rgb(180, 200, 240)', fontSizePx: 14 }),
    })
    const report = auditContrast(page([node({ classes: ['rm-section', 'sec-work'], children: [numeral] })]))
    const deco = report.findings.find((f) => f.kind === 'decorative')
    expect(deco, 'the numeral must be measured even though the file draws it as outlines').toBeDefined()
    expect(deco!.sample).toBe('01')
    expect(deco!.ground.label).toBe('Background')
  })

  it('calls a DERIVED ink a bug in the derivation, not a setting to change', () => {
    // The accent as ink is the product's own correction; one that fails is a
    // defect, and the finding must not tell the author to fix their colour.
    const report = auditContrast(
      page([
        node({
          classes: ['rm-section-title'],
          text: 'Experience',
          style: style({ color: 'rgb(122, 167, 240)' }),
        }),
      ])
    )
    const f = report.findings[0]
    expect(f.origin).toBe('derived')
    expect(f.setting.cssVar).toBe('--rm-primary-ink')
    expect(f.bug).toMatch(/derivation/)
    expect(f.suggestion).toBeUndefined()
  })

  it('composites every layer, so a chip wash is the ground and not the page', () => {
    const chip = node({
      classes: ['rm-chip'],
      box: { x: 0, y: 0, w: 80, h: 18 },
      // a 12% wash of the accent over the page, as the stylesheet mixes it
      style: style({ backgroundColor: 'rgb(226, 233, 253)' }),
      children: [
        node({
          tag: 'span',
          text: 'TypeScript',
          box: { x: 4, y: 2, w: 72, h: 14 },
          style: style({ color: 'rgb(150, 170, 200)' }),
        }),
      ],
    })
    const report = auditContrast(page([node({ classes: ['rm-section', 'sec-skills'], children: [chip] })]))
    expect(report.findings[0].background).toBe('#e2e9fd')
    expect(report.findings[0].ground.label).toMatch(/Skills style/)
    expect(report.findings[0].ground.section).toBe('skills')
  })

  it('resolves a translucent ink against what is behind it', () => {
    const report = auditContrast(
      page([node({ text: 'Quiet line', style: style({ color: 'rgba(26, 26, 26, 0.35)' }) })])
    )
    const f = report.findings[0]
    expect(f.alpha).toBe(0.35)
    // Not #1a1a1a: the painted ink is the grey the browser draws.
    expect(f.foreground).not.toBe('#1a1a1a')
    expect(f.measured).toBeLessThan(4.5)
  })

  it('measures a word against the stretch of a fade it sits on', () => {
    // The banner runs from near-black on the left to white on the right. The
    // name sits at the left end. A checker that took the fade's extremes
    // would fault white-on-white; the file samples the ground under the span
    // and finds near-black.
    const banner = node({
      classes: ['rm-header', 'rm-header-band'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      style: style({ backgroundImage: 'linear-gradient(to right, rgb(10, 10, 20) 0%, rgb(255, 255, 255) 100%)' }),
      children: [
        node({
          classes: ['rm-name'],
          text: 'Alex Dunn',
          box: { x: 10, y: 20, w: 120, h: 30 },
          style: style({ color: 'rgb(255, 255, 255)', fontSizePx: 30, fontWeight: 700 }),
        }),
      ],
    })
    const report = auditContrast(page([banner]))
    expect(report.findings).toHaveLength(0)
  })

  it('faults the same word when it sits on the pale end of that fade', () => {
    const banner = node({
      classes: ['rm-header', 'rm-header-band'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      style: style({ backgroundImage: 'linear-gradient(to right, rgb(10, 10, 20) 0%, rgb(255, 255, 255) 100%)' }),
      children: [
        node({
          classes: ['rm-name'],
          text: 'Alex Dunn',
          box: { x: 650, y: 20, w: 120, h: 30 },
          style: style({ color: 'rgb(255, 255, 255)', fontSizePx: 30, fontWeight: 700 }),
        }),
      ],
    })
    const report = auditContrast(page([banner]))
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0].groundKind).toBe('gradient')
    expect(report.findings[0].required).toBe(3)
  })

  it('reads a picture behind a header as the ground, once its pixels are known', () => {
    const art = node({
      tag: 'img',
      classes: ['rm-art-band'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      style: style({ position: 'absolute', zIndex: '-1' }),
      image: { src: 'art.avif', grounds: ['#01010e', '#f7e8bc'] },
    })
    const header = node({
      classes: ['rm-header', 'rm-header-art'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      children: [
        art,
        node({
          classes: ['rm-contacts'],
          text: 'name@example.com',
          box: { x: 20, y: 80, w: 200, h: 14 },
          style: style({ color: 'rgb(255, 255, 255)' }),
        }),
      ],
    })
    const report = auditContrast(page([header]))
    // White on the pale extreme of the art is the failure the wash exists to
    // prevent; the checker must see the art, not the page under it.
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0].groundKind).toBe('image')
    expect(report.findings[0].background).toBe('#f7e8bc')
    expect(report.findings[0].ground.label).toMatch(/Art band/)
  })

  it('takes the colour the words MOSTLY stand on in a textured picture, as the file does', () => {
    // A navy band with a grain: every cell is mostly flat navy, and a
    // quarter of each is lighter flecks. The words stand on the navy - the
    // file's modal ground - and a ground taken at a percentile of the flecks
    // faulted them at 3.9:1 where the file measured 5.68:1.
    const cellLadder = ['#000023', '#010125', '#1c1f37', '#434558', '#8c8678']
    const cellModes = [
      { key: 0x002, hex: '#000024', n: 150 },
      { key: 0x113, hex: '#1c1f37', n: 40 },
      { key: 0x445, hex: '#434558', n: 30 },
      { key: 0x887, hex: '#8c8678', n: 20 },
    ]
    const band = (modes?: typeof cellModes) =>
      node({
        tag: 'img',
        classes: ['rm-art-band'],
        box: { x: 0, y: 0, w: 800, h: 200 },
        style: style({ position: 'absolute', zIndex: '-1' }),
        image: {
          src: 'band.webp',
          grounds: ['#000023', '#fce4b3'],
          fit: 'cover',
          position: '50% 50%',
          cells: {
            cols: 2,
            rows: 2,
            natural: { w: 800, h: 200 },
            grounds: [cellLadder, cellLadder, cellLadder, cellLadder],
            modes: modes ? [modes, modes, modes, modes] : undefined,
          },
        },
      })
    const doc = (modes?: typeof cellModes) =>
      page([
        node({
          classes: ['rm-header', 'rm-header-art'],
          box: { x: 0, y: 0, w: 800, h: 200 },
          children: [
            band(modes),
            node({
              classes: ['rm-headline'],
              text: 'Regional revenue programme',
              box: { x: 20, y: 40, w: 180, h: 16 },
              style: style({ color: 'rgb(125, 138, 153)' }),
            }),
          ],
        }),
      ])
    expect(auditContrast(doc(cellModes)).findings, 'the flat navy is the ground').toHaveLength(0)
    // Two flat colours splitting the box nearly evenly: which one the file's
    // finer raster calls the mode can go either way, so both are measured.
    const split = [
      { key: 0x002, hex: '#000024', n: 100 },
      { key: 0x887, hex: '#8c8678', n: 90 },
    ]
    expect(auditContrast(doc(split)).findings).toHaveLength(1)
  })

  it('says a ground is unread rather than guessing at it', () => {
    const art = node({
      tag: 'img',
      classes: ['rm-art-band'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      style: style({ position: 'absolute', zIndex: '-1' }),
      image: { src: 'art.avif' },
    })
    const header = node({
      classes: ['rm-header', 'rm-header-art'],
      box: { x: 0, y: 0, w: 794, h: 120 },
      children: [
        art,
        node({
          text: 'name@example.com',
          box: { x: 20, y: 80, w: 200, h: 14 },
          style: style({ color: 'rgb(255, 255, 255)' }),
        }),
      ],
    })
    const report = auditContrast(page([header]))
    expect(report.findings).toHaveLength(0)
    expect(report.unmeasured).toHaveLength(1)
    expect(report.unmeasured[0].reason).toMatch(/picture/)
  })

  it('takes a half-covering layer as BOTH grounds, because the words cross it', () => {
    const rail = node({
      classes: ['rm-meta-cell'],
      box: { x: 0, y: 0, w: 50, h: 24 },
      style: style({ backgroundColor: 'rgb(20, 20, 20)' }),
      children: [],
    })
    const row = node({
      box: { x: 0, y: 0, w: 400, h: 24 },
      children: [
        rail,
        node({
          text: 'across the edge',
          box: { x: 20, y: 4, w: 120, h: 14 },
          style: style({ color: 'rgb(40, 40, 40)' }),
        }),
      ],
    })
    // The rail is not a backdrop (it is in flow), so it is not composited
    // under a sibling: the words are faulted against the PAGE, which is the
    // honest answer for a checker that cannot see behind a sibling in flow.
    const report = auditContrast(page([row]))
    expect(report.findings).toHaveLength(0)
  })

  it('skips what is not painted at all', () => {
    const report = auditContrast(
      page([
        node({ text: 'hidden', style: style({ display: 'none', color: 'rgb(200, 200, 200)' }) }),
        node({ text: 'invisible', style: style({ visibility: 'hidden', color: 'rgb(200, 200, 200)' }) }),
        node({ text: 'ghost', style: style({ opacity: 0, color: 'rgb(200, 200, 200)' }) }),
      ])
    )
    expect(report.checked).toBe(0)
    expect(report.findings).toHaveLength(0)
  })

  it('offers a colour for the SETTING, so writing it there actually fixes the pair', () => {
    // The sidebar's own ink, painted at 85% of itself. A colour solved for
    // the PAINTED ink and written into the setting is repainted at 85% and
    // measures what it measured before: the author changes their colour and
    // the warning stays. So the page is re-stated here with the suggestion
    // in the setting, painted the way the stylesheet paints it, and measured
    // again.
    const sidebar = (ink: string) =>
      page([
        node({
          classes: ['rm-col-aside'],
          box: { x: 0, y: 0, w: 240, h: 600 },
          style: style({ backgroundColor: 'rgb(238, 242, 247)' }),
          children: [node({ classes: ['rm-item-date'], text: 'Jan 2019', style: style({ color: ink }) })],
        }),
      ])
    const first = auditContrast({
      ...sidebar('rgba(185, 196, 209, 0.85)'),
      vars: { ...VARS, '--rm-sidebar-text': '#b9c4d1' },
    })
    const f = first.findings[0]
    expect(f.setting.path).toBe('theme.sidebarText')
    expect(f.paint.alpha).toBeCloseTo(0.85, 2)
    expect(f.paint.value).toBe('#b9c4d1')
    expect(f.suggestion).toBeDefined()

    const chosen = parseColor(f.suggestion!.color) as Rgba
    const repainted = `rgba(${chosen[0]}, ${chosen[1]}, ${chosen[2]}, 0.85)`
    const after = auditContrast({ ...sidebar(repainted), vars: { ...VARS, '--rm-sidebar-text': f.suggestion!.color } })
    expect(after.findings).toHaveLength(0)
  })

  it('offers nothing where the design caps the setting, and says what would have to change', () => {
    // A label painted at 45% of the muted colour. 45% of black over white is
    // #8c8c8c at 3.36:1 - no value of the setting reaches 4.5:1.
    const report = auditContrast(
      page([
        node({
          classes: ['rm-item-sub'],
          text: 'Denver',
          style: style({ color: 'rgb(154, 163, 173)' }),
          after: style({ color: 'rgba(154, 163, 173, 0.45)', content: 'Remote' }),
        }),
      ])
    )
    const pipe = report.findings.find((x) => x.kind === 'pseudo')
    expect(pipe, 'the label must be measured').toBeDefined()
    expect(pipe!.suggestion).toBeUndefined()
    expect(pipe!.noFix?.reason).toMatch(/45%/)
    expect(pipe!.noFix?.best).toBeLessThan(pipe!.required)
  })

  it('never offers a colour that does not itself reach the threshold', () => {
    // Words straddling a near-black band and the page: darkening against the
    // band fails on the page, lightening fails on the band. The old gate
    // asked only whether the colour had CHANGED.
    const band = node({
      classes: ['rm-header-band'],
      box: { x: 0, y: 0, w: 200, h: 40 },
      style: style({ position: 'absolute', zIndex: '-1', backgroundColor: 'rgb(17, 17, 17)' }),
    })
    const report = auditContrast({
      ...page([
        node({
          box: { x: 0, y: 0, w: 400, h: 40 },
          children: [
            band,
            node({
              text: 'across the edge',
              box: { x: 100, y: 10, w: 200, h: 16 },
              style: style({ color: 'rgb(128, 128, 128)' }),
            }),
          ],
        }),
      ]),
      // the body ink IS that grey, so the control is traced and not guessed
      vars: { ...VARS, '--rm-text': '#808080' },
    })
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0].paint.grounds.length).toBeGreaterThan(1)
    expect(report.findings[0].suggestion).toBeUndefined()
    expect(report.findings[0].noFix?.reason).toMatch(/no one ink reads/)
  })

  it('solves one colour for every ground the setting paints on', () => {
    // The muted ink on the page, and the same ink on a tinted row. One
    // control, two grounds: the colour offered has to clear both, or the
    // author applies it and half the findings stay.
    const quiet = (text: string, box: { x: number; y: number; w: number; h: number }) =>
      node({ classes: ['rm-item-date'], text, box, style: style({ color: 'rgb(168, 168, 168)' }) })
    const tintedRow = node({
      classes: ['rm-item'],
      box: { x: 0, y: 40, w: 400, h: 24 },
      style: style({ backgroundColor: 'rgb(207, 216, 230)' }),
      children: [quiet('On the row', { x: 4, y: 44, w: 200, h: 14 })],
    })
    const report = auditContrast({
      ...page([quiet('On the page', { x: 0, y: 0, w: 200, h: 14 }), tintedRow]),
      vars: { ...VARS, '--rm-muted': '#a8a8a8' },
    })
    expect(report.findings).toHaveLength(2)
    const colours = new Set(report.findings.map((f) => f.suggestion?.color))
    expect(colours.size, 'one control, one colour').toBe(1)
    for (const f of report.findings) {
      expect(f.suggestion!.measured).toBeGreaterThanOrEqual(f.required - 0.005)
      expect(f.suggestion!.fixes).toBe(2)
    }
    const groups = groupBySetting(report.findings)
    expect(groups).toHaveLength(1)
    expect(groups[0].grounds.sort()).toEqual(['#cfd8e6', '#ffffff'])
  })

  it('marks a setting it had to guess at as a guess', () => {
    // A colour no custom property on the artboard accounts for. The words
    // still have to be named as something a person can find, but naming it
    // as though it were known is what sent people to a control that moved
    // nothing.
    const report = auditContrast(
      page([node({ classes: ['rm-item-date'], text: 'Denver', style: style({ color: 'rgb(200, 170, 190)' }) })])
    )
    expect(report.findings[0].uncertain).toBe(true)
    expect(report.findings[0].setting.label).toBe('Muted text')
    // ...and a colour written into a control that did not paint the words
    // moves nothing, so none is offered: the report says why instead. The
    // muted ink is always on the artboard, so a colour that is not it is not
    // painted by it.
    expect(report.findings[0].suggestion).toBeUndefined()
    expect(report.findings[0].noFix?.reason).toMatch(/Nothing on the artboard resolves to/)
  })

  it('offers an element colour straight when it is an override nobody has set yet', () => {
    // A design paints its contacts in its own colour, as
    // var(--rm-contact-color, <its own>). Set, the Contacts control paints
    // these words as it stands - so a colour can be solved for it, and the
    // report still says it is not certain.
    const contact = node({ classes: ['rm-contact'], text: 'Denver', style: style({ color: 'rgb(200, 170, 190)' }) })
    const unset = auditContrast(page([contact]))
    const f = unset.findings[0]
    expect(f.uncertain).toBe(true)
    expect(f.setting.cssVar).toBe('--rm-contact-color')
    expect(f.suggestion).toBeDefined()
    expect(f.suggestion!.measured).toBeGreaterThanOrEqual(f.required - 0.005)
    // Set to something else and still not what the page painted: the
    // override is plainly not what paints these words.
    const set = auditContrast({ ...page([contact]), vars: { ...VARS, '--rm-contact-color': '#123456' } })
    expect(set.findings[0].suggestion).toBeUndefined()
    expect(set.findings[0].noFix?.reason).toMatch(/Nothing on the artboard resolves to/)
  })

  it('holds the words a setting paints that read TODAY, so the fix does not break them', () => {
    // The muted ink fails on the page and reads on a near-black row. Every
    // darker muted that reads on the page fails on the row: the only true
    // answer is that no one value reads in both places. The old solve saw
    // only the failing pair and offered a colour that broke the row.
    const quiet = (text: string, box: { x: number; y: number; w: number; h: number }) =>
      node({ classes: ['rm-item-date'], text, box, style: style({ color: 'rgb(154, 163, 173)' }) })
    const darkRow = node({
      classes: ['rm-item'],
      box: { x: 0, y: 40, w: 400, h: 24 },
      style: style({ backgroundColor: 'rgb(17, 17, 17)' }),
      children: [quiet('On the dark row', { x: 4, y: 44, w: 200, h: 14 })],
    })
    const report = auditContrast(page([quiet('On the page', { x: 0, y: 0, w: 200, h: 14 }), darkRow]))
    expect(report.findings).toHaveLength(1)
    const f = report.findings[0]
    expect(f.suggestion).toBeUndefined()
    expect(f.noFix?.reason).toMatch(/read today/)
    expect(f.noFix?.reason).toMatch(/#111111/)
  })

  it('solves against the words that read today when a value exists that keeps them', () => {
    // A large muted line fails on a mid-grey row, and the same ink reads on
    // the page. Lightening is the nearer fix for the row - and it would take
    // the page's line below 3:1. The value offered has to keep the page
    // reading, so it has to go the other way.
    const quiet = (ink: string, text: string, box: { x: number; y: number; w: number; h: number }) =>
      node({ classes: ['rm-item-date'], text, box, style: style({ color: ink, fontSizePx: 32 }) })
    const doc = (ink: string) =>
      page([
        quiet(ink, 'On the page', { x: 0, y: 0, w: 200, h: 30 }),
        node({
          classes: ['rm-item'],
          box: { x: 0, y: 40, w: 400, h: 40 },
          style: style({ backgroundColor: 'rgb(119, 119, 119)' }),
          children: [quiet(ink, 'On the row', { x: 4, y: 44, w: 200, h: 30 })],
        }),
      ])
    const vars = { ...VARS, '--rm-muted': '#8a8a8a' }
    const report = auditContrast({ ...doc('rgb(138, 138, 138)'), vars })
    expect(report.findings).toHaveLength(1)
    const f = report.findings[0]
    expect(f.suggestion, 'a value exists that reads in both places').toBeDefined()
    const c = parseColor(f.suggestion!.color) as Rgba
    expect(c[0], 'darker, because lighter breaks the page').toBeLessThan(138)
    const after = auditContrast({
      ...doc(`rgb(${c[0]}, ${c[1]}, ${c[2]})`),
      vars: { ...vars, '--rm-muted': f.suggestion!.color },
    })
    expect(after.findings, 'the row fixed and the page still reading').toHaveLength(0)
  })

  it('measures words the design paints through an opacity at that opacity', () => {
    // A contact label at 50% of an ink that reads at full strength. The page
    // paints the half, so the half is what is measured - and no value of the
    // setting reaches 4.5:1 through it (black at 50% over white is 3.95).
    const report = auditContrast({
      ...page([
        node({
          classes: ['rm-contact'],
          text: 'Denver',
          style: style({ color: 'rgb(75, 85, 99)' }),
          before: style({ color: 'rgb(75, 85, 99)', content: 'Email', opacity: 0.5 }),
        }),
      ]),
      vars: { ...VARS, '--rm-muted': '#4b5563', '--rm-contact-color': '#4b5563' },
    })
    expect(report.findings).toHaveLength(1)
    const sep = report.findings[0]
    expect(sep.kind).toBe('pseudo')
    expect(sep.paint.alpha).toBeCloseTo(0.5, 2)
    expect(sep.suggestion).toBeUndefined()
    expect(sep.noFix?.reason).toMatch(/50%/)
  })

  it('says a derived ink painted weaker is capped by the design, not by the derivation', () => {
    // The product's muted-on-card ink reads at full strength; the design
    // paints a label at 45% of it. Calling that a failed derivation sends
    // somebody to fix the one part that works.
    const report = auditContrast({
      ...page([
        node({
          classes: ['rm-item-sub'],
          text: 'Remote',
          style: style({ color: 'rgb(26, 26, 26)' }),
          after: style({ color: 'rgba(75, 85, 99, 0.45)', content: 'Present' }),
        }),
      ]),
      vars: { ...VARS, '--rm-muted-on-card': '#4b5563' },
    })
    const f = report.findings.find((x) => x.kind === 'pseudo')!
    expect(f.origin).toBe('derived')
    expect(f.bug).toMatch(/45%/)
    expect(f.bug).not.toMatch(/derivation has failed/)
  })

  it('leaves a separator glyph alone, because it is decoration and not words', () => {
    // A pipe, a middle dot, a dash between two facts. They carry no words, the
    // exported file draws them as decoration rather than text, and the
    // guideline exempts pure decoration - so a pale one is a design choice,
    // not a failure a person should be sent to fix.
    const report = auditContrast(
      page(
        ['|', '·', '•', '–', '//', '/'].map((glyph) =>
          node({
            classes: ['rm-item-sub'],
            text: 'Denver',
            style: style({ color: 'rgb(26, 26, 26)' }),
            before: style({ color: 'rgba(154, 163, 173, 0.45)', content: glyph }),
          })
        )
      )
    )
    expect(report.findings).toHaveLength(0)
  })

  it('still measures pseudo-content that carries words or figures', () => {
    const report = auditContrast(
      page([
        node({
          classes: ['rm-item-sub'],
          text: 'Denver',
          style: style({ color: 'rgb(26, 26, 26)' }),
          before: style({ color: 'rgba(154, 163, 173, 0.45)', content: '01' }),
        }),
      ])
    )
    expect(report.findings.filter((x) => x.kind === 'pseudo')).toHaveLength(1)
  })

  it('offers no colour for a control that holds no colour', () => {
    // A bullet the design's own stylesheet colours. The finding names the
    // bullet control, because that is where a person goes to find the thing -
    // but "write #727577 into the bullet style" is an instruction nobody can
    // carry out, and the checker says so instead.
    const li = node({
      tag: 'li',
      text: 'Shipped the thing',
      style: style({ display: 'list-item', color: 'rgb(26, 26, 26)' }),
      marker: style({ color: 'rgb(216, 220, 225)', content: '•' }),
    })
    const report = auditContrast(page([node({ tag: 'ul', children: [li] })]))
    const marker = report.findings.find((f) => f.kind === 'marker') as (typeof report.findings)[number]
    expect(marker.setting.path).toBe('typography.bulletStyle')
    expect(marker.suggestion).toBeUndefined()
    expect(marker.noFix?.reason).toMatch(/set by the design itself/)
  })

  it('gathers the findings by the control that produced them', () => {
    const quiet = (text: string, y: number) =>
      node({
        classes: ['rm-item-date'],
        text,
        box: { x: 0, y, w: 200, h: 14 },
        style: style({ color: 'rgb(154, 163, 173)' }),
      })
    const report = auditContrast(page([quiet('Jan 2021', 0), quiet('Mar 2019', 20), quiet('Remote', 40)]))
    const groups = groupBySetting(report.findings)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(3)
    expect(groups[0].setting.label).toBe('Muted text')
    expect(groups[0].suggestion).toBeDefined()
  })
})
