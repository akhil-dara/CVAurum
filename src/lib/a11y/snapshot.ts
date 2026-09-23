/**
 * The one place this checker touches a page.
 *
 * Everything the audit needs is read here in a single pass and handed on as
 * plain data - computed colours, boxes, the marker a list item draws, the
 * pseudo-elements that carry words, the pixels of a picture painted behind a
 * header. After this, the measurement is arithmetic, and arithmetic can be
 * held to a test.
 *
 * What it skips is what the EXPORTER skips (pdf/walk.ts): `.no-print`, and
 * anything laid out with `display: none` or `visibility: hidden`. A checker
 * that measured the editor's own gear buttons would report failures that are
 * not on anybody's resume.
 */
import { smallCapsScaleFor } from '@/lib/pdf/text'
import { TRACKED_VARS } from './settings'
import type { ArtboardSnapshot, NodeSnapshot, PictureMode, StyleSnapshot } from './types'

/** What one picture's own pixels say: its extremes end to end, and the same
 *  read cell by cell so a run of words can be measured against the part of
 *  the picture it actually stands on. */
interface PictureRead {
  extremes: string[]
  natural: { w: number; h: number }
  cols: number
  rows: number
  cells: string[][]
  /** Each cell's commonest colours, for the modal ground (types.ts). */
  modes?: PictureMode[][]
}

/** A picture's pixels, keyed by source, so the art band behind a header is
 *  read once and not once per keystroke. */
const pictureCache = new Map<string, PictureRead | null>()

function styleOf(cs: CSSStyleDeclaration, content?: string): StyleSnapshot {
  return {
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    backgroundClip:
      cs.backgroundClip || (cs as unknown as { webkitBackgroundClip?: string }).webkitBackgroundClip || '',
    opacity: Number(cs.opacity),
    display: cs.display,
    visibility: cs.visibility,
    fontSizePx: parseFloat(cs.fontSize) || 0,
    fontWeight: weightOf(cs.fontWeight),
    position: cs.position,
    zIndex: cs.zIndex,
    content,
    // Asked of the EXPORTER's own measurement, not modelled here: the ratio
    // is a property of the face and the engine, it varies from about 0.667
    // to 0.73 between faces, and a live checker that guessed at it would
    // disagree with the file about which threshold a name is held to.
    smallCapsScale:
      cs.fontVariantCaps === 'small-caps'
        ? smallCapsScaleFor(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`)
        : 0,
  }
}

function weightOf(raw: string): number {
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  return raw === 'bold' || raw === 'bolder' ? 700 : 400
}

/** `content` as the words it draws: a quoted string, unescaped. `none`,
 *  `normal`, a counter or an image draw no words this checker can sample. */
function contentWords(raw: string | undefined): string | undefined {
  if (!raw || raw === 'none' || raw === 'normal') return undefined
  const parts = raw.match(/"((?:[^"\\]|\\.)*)"/g)
  if (!parts) return undefined
  const text = parts.map((p) => p.slice(1, -1).replace(/\\(.)/g, '$1')).join('')
  return text.trim() ? text : undefined
}

/** This element's OWN words: the text nodes directly under it. A parent's
 *  probe must not swallow a child's, because the child may be set in another
 *  colour on another ground. */
function ownText(el: Element): string {
  let out = ''
  for (const node of Array.from(el.childNodes)) if (node.nodeType === 3) out += node.textContent ?? ''
  return out
}

const SKIPPED = (el: Element): boolean => el.classList.contains('no-print')

/** What this checker knows about a picture, as the snapshot carries it. */
function pictureSnapshot(src: string): {
  src: string
  grounds?: string[]
  cells?: NonNullable<NodeSnapshot['image']>['cells']
} {
  const read = pictureCache.get(src)
  if (!read) return { src }
  return {
    src,
    grounds: read.extremes,
    cells: { cols: read.cols, rows: read.rows, natural: read.natural, grounds: read.cells, modes: read.modes },
  }
}

export interface SnapshotOptions {
  /** A window, for a page that is not the document this module loaded in. */
  view?: Window
}

/**
 * The artboard as data. `root` is the `.rm-root` element.
 */
export function snapshotArtboard(root: Element, opts: SnapshotOptions = {}): ArtboardSnapshot {
  const view = opts.view ?? (root.ownerDocument.defaultView as Window)
  const cs = view.getComputedStyle.bind(view)
  const scrollX = view.scrollX || 0
  const scrollY = view.scrollY || 0
  // The editor's focus mode dims every section but the one under the
  // pointer. That is the editor talking, not the resume - the print route
  // and the exported file paint every section at full strength - and now
  // that an opacity is folded into the ink, a hover must not fault a page.
  const editorDims = !!root.closest('.focus-mode')

  const build = (el: Element): NodeSnapshot | null => {
    if (SKIPPED(el)) return null
    const style = cs(el)
    if (style.display === 'none' || style.visibility === 'hidden') return null
    const r = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    const node: NodeSnapshot = {
      tag,
      classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
      ariaHidden: el.getAttribute('aria-hidden') === 'true',
      deco: el.getAttribute('data-deco') === '1',
      text: ownText(el),
      box: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height },
      style: styleOf(style),
      children: [],
    }
    if (editorDims && (node.classes.includes('rm-section') || node.classes.includes('rm-header')))
      node.style.opacity = 1
    if (style.display === 'list-item') {
      const marker = cs(el, '::marker')
      // A marker with no content draws the browser's own disc, which is a
      // mark a reader reads exactly as it reads a glyph.
      node.marker = styleOf(marker, contentWords(marker.content) ?? '•')
    }
    for (const [which, slot] of [
      ['::before', 'before'],
      ['::after', 'after'],
    ] as const) {
      const p = cs(el, which)
      const words = contentWords(p.content)
      if (words) node[slot] = styleOf(p, words)
    }
    if (tag === 'img') {
      const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src
      if (src) node.image = { ...pictureSnapshot(src), fit: style.objectFit, position: style.objectPosition }
    } else {
      const url = style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)
      if (url)
        node.image = {
          ...pictureSnapshot(url[1]),
          fit: style.backgroundSize,
          position: style.backgroundPosition,
        }
    }
    // SVG carries shapes, not words: nothing inside it is a text run this
    // checker measures, and its children have no `className` string.
    if (tag !== 'svg')
      for (const child of Array.from(el.children)) {
        const c = build(child)
        if (c) node.children.push(c)
      }
    return node
  }

  const tree = build(root)
  const rootStyle = cs(root)
  const vars: Record<string, string> = {}
  for (const name of TRACKED_VARS) {
    const v = rootStyle.getPropertyValue(name).trim()
    if (v) vars[name] = v
  }
  const template = (typeof root.className === 'string' ? root.className : '').match(/tpl-([a-z0-9-]+)/)?.[1]
  return {
    root:
      tree ??
      ({
        tag: 'div',
        classes: [],
        ariaHidden: false,
        deco: false,
        text: '',
        box: { x: 0, y: 0, w: 0, h: 0 },
        style: styleOf(rootStyle),
        children: [],
      } as NodeSnapshot),
    vars,
    template,
  }
}

/**
 * Read the pixels of every picture the artboard paints behind words, so the
 * ground under a header's art is the art's OWN colours and not a guess.
 *
 * Asynchronous, and cached by source: a picture is decoded once for the life
 * of the page. A checker that ran on every keystroke could not afford to do
 * this in line, so it is done ahead of the walk, and a picture that has not
 * been read yet is reported as unmeasured rather than assumed.
 */
export async function warmPictures(root: Element): Promise<void> {
  const srcs = new Set<string>()
  for (const el of Array.from(root.querySelectorAll('img'))) {
    const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src
    if (src) srcs.add(src)
  }
  const view = root.ownerDocument.defaultView
  if (view)
    for (const el of Array.from(root.querySelectorAll('*'))) {
      const url = view.getComputedStyle(el).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)
      if (url) srcs.add(url[1])
    }
  await Promise.all([...srcs].filter((s) => !pictureCache.has(s)).map((s) => readPicture(s, root.ownerDocument)))
}

/** How finely a picture is read. 128 across, in an 8 by 8 grid, so each cell
 *  is 256 pixels - enough for a percentile to mean something, and coarse
 *  enough that the whole read is one pass over 16k pixels.
 *
 *  Not 48, which is what this was: a 48-across draw averages a band's darkest
 *  passage away entirely (its dark end came back #ddb591 where the picture's
 *  own pixels reach #a16d43), and an ink judged against the paler answer
 *  passed here while the file faulted it. */
const PICTURE_SIZE = 128
const PICTURE_GRID = 8

/**
 * What each cell carries: its own colours at five points up the luminance
 * range, rather than just its two ends.
 *
 * A ladder, because the ground under a run of words is what those words
 * MOSTLY stand on - the rule the file-side checker applies when it takes the
 * modal colour of a span's box - and a run of words covers several cells. A
 * gold vein two pixels wide crossing one corner of one of them is the
 * lightest thing in that cell, and taking each cell's lightest made that
 * vein the "ground" of a name printed on the dark left of a band: 2.02:1
 * here against 5.68:1 on the file. Pooled over the cells the words actually
 * cover, five rungs each, the vein is a few readings among dozens and the
 * ground comes out as what is really under them (ground.ts regionGrounds).
 */
const CELL_LADDER = [0.1, 0.3, 0.5, 0.7, 0.9]

const linear = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
const lumOf = (r: number, g: number, b: number) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const hexOf = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/** A run of pixels at each rung of the ladder, by luminance. */
function ladderOf(pixels: { hex: string; l: number }[]): string[] {
  if (!pixels.length) return []
  pixels.sort((a, b) => a.l - b.l)
  const at = (p: number) => pixels[Math.min(pixels.length - 1, Math.max(0, Math.round(p * (pixels.length - 1))))].hex
  return CELL_LADDER.map(at)
}

/** How many of a cell's commonest colours are kept. */
const CELL_MODES = 8

/**
 * A cell's commonest colours: its pixels binned sixteen levels to a channel,
 * so the grain of a picture falls into the same bin as the flat colour it
 * roughens, and each bin carried as its mean colour and its count.
 */
function modesOf(pixels: { hex: string; l: number }[]): PictureMode[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (const p of pixels) {
    const r = parseInt(p.hex.slice(1, 3), 16)
    const g = parseInt(p.hex.slice(3, 5), 16)
    const b = parseInt(p.hex.slice(5, 7), 16)
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n++
    bin.r += r
    bin.g += g
    bin.b += b
    bins.set(key, bin)
  }
  return [...bins]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, CELL_MODES)
    .map(([key, bin]) => ({
      key,
      n: bin.n,
      hex: hexOf(Math.round(bin.r / bin.n), Math.round(bin.g / bin.n), Math.round(bin.b / bin.n)),
    }))
}

/**
 * A picture's own colours: its extremes end to end, and the same read cell by
 * cell.
 *
 * The extremes are what a ground is when nothing can say WHERE on the picture
 * the words sit - a repeated background, a fit this checker does not model.
 * The cells are what a ground is when it can, and they are the difference
 * between measuring a name against the pixels under it and measuring it
 * against the far corner of the band.
 */
async function readPicture(src: string, doc: Document): Promise<void> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'sync'
    const loaded = new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('picture did not load'))
    })
    img.src = src
    await loaded
    const size = PICTURE_SIZE
    const canvas = doc.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)
    const all: { hex: string; l: number }[] = []
    const cells: { hex: string; l: number }[][] = Array.from({ length: PICTURE_GRID * PICTURE_GRID }, () => [])
    const step = size / PICTURE_GRID
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        if (data[i + 3] < 8) continue
        const p = { hex: hexOf(data[i], data[i + 1], data[i + 2]), l: lumOf(data[i], data[i + 1], data[i + 2]) }
        all.push(p)
        cells[
          Math.min(PICTURE_GRID - 1, Math.floor(y / step)) * PICTURE_GRID +
            Math.min(PICTURE_GRID - 1, Math.floor(x / step))
        ].push(p)
      }
    if (!all.length) throw new Error('picture has no opaque pixels')
    all.sort((a, b) => a.l - b.l)
    const at = (q: number) => all[Math.min(all.length - 1, Math.max(0, Math.round(q * (all.length - 1))))].hex
    pictureCache.set(src, {
      extremes: [at(0.01), at(0.5), at(0.99)],
      natural: { w: img.naturalWidth || size, h: img.naturalHeight || size },
      cols: PICTURE_GRID,
      rows: PICTURE_GRID,
      cells: cells.map((c) => ladderOf(c.slice())),
      modes: cells.map(modesOf),
    })
  } catch {
    pictureCache.set(src, null)
  }
}

/** For tests and for a harness that knows a picture's colours already. */
export function setPictureGrounds(src: string, grounds: string[] | null): void {
  if (!grounds) {
    pictureCache.set(src, null)
    return
  }
  pictureCache.set(src, {
    extremes: grounds,
    natural: { w: PICTURE_SIZE, h: PICTURE_SIZE },
    cols: 1,
    rows: 1,
    cells: [grounds],
  })
}

/** For a test that wants to state a picture cell by cell. */
export function setPictureCells(src: string, read: PictureRead): void {
  pictureCache.set(src, read)
}
