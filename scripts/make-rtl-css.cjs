/**
 * Generates src/styles/rtl-canvas.css — the right-to-left mirror of the resume
 * canvas.
 *
 * `dir="rtl"` on `.rm-root` (Design panel → Layout → Right-to-left) already
 * mirrors rows, grid tracks, flex order and any alignment that was left
 * implicit. What a writing direction cannot flip is a PHYSICAL offset: a bullet
 * marker hanging in the left gutter, a date pushed to the right by
 * `margin-left: auto`, a chip pinned with `right: 100%`. artboard.css and
 * templates.css describe those in physical terms (the code the design was
 * drawn in), and they are covered by tests that read those very properties, so
 * they are NOT rewritten to logical properties here.
 *
 * Instead this script reads both files and emits, for every rule that carries a
 * physical side, a copy scoped to `.rm-root[dir='rtl']` with the sides swapped:
 * a paired left/right swaps wholesale, a lone one moves to the other side and
 * resets its original to a neutral, a border moves and clears the side it left.
 * The result is loaded after templates.css, so it wins on specificity and
 * order, and it only ever applies to a resume that asked for RTL — an LTR
 * resume renders from exactly the same CSS as before.
 *
 * Re-run after editing artboard.css or templates.css:  node scripts/make-rtl-css.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCES = ['src/styles/artboard.css', 'src/templates/templates.css']
const OUT = path.join(ROOT, 'src/styles/rtl-canvas.css')
const SCOPE = ".rm-root[dir='rtl']"

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Split a stylesheet into rules and at-rule blocks, nested. */
function parseBlocks(css) {
  const nodes = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) break
    const header = css.slice(i, open).trim()
    let depth = 0
    let close = open
    for (; close < css.length; close++) {
      if (css[close] === '{') depth++
      else if (css[close] === '}') {
        depth--
        if (depth === 0) break
      }
    }
    const body = css.slice(open + 1, close)
    if (header.startsWith('@media') || header.startsWith('@supports')) {
      nodes.push({ at: header, children: parseBlocks(body) })
    } else if (header.startsWith('@')) {
      // @font-face / @keyframes: no selectors to mirror
    } else if (header) {
      nodes.push({ selector: header, body })
    }
    i = close + 1
  }
  return nodes
}

const splitTop = (text, separator) => {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === separator && depth === 0) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const splitSpace = (text) => {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (/\s/.test(ch) && depth === 0) {
      if (cur) {
        out.push(cur)
        cur = ''
      }
    } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

const flip = (side) => (side === 'left' ? 'right' : 'left')

/**
 * A physical side, written as the LOGICAL property that means it in the design
 * (always left-to-right), so that inside `.rm-root[dir='rtl']` it resolves to
 * the other side on its own and — the point — leaves the side it is not
 * talking about untouched.
 *
 * Rewriting `left` to `right` by hand instead wiped that other side out: a rule
 * that reserves the hanging icon's gutter with `padding-left` also emitted
 * `padding-left: 0`, which killed the column's own page padding, so in RTL the
 * body text ran flush into the paper's edge while the chip floated in the
 * opposite margin (2026-11-15 user report: "the icons stick to one side").
 */
const LOGICAL = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
}

/** The corner a `border-*-radius` declaration rounds, and its mirror twin. */
const cornerTwin = (prop) => {
  const m = /^border-(top|bottom)-(left|right)-radius$/.exec(prop)
  if (!m) return null
  return `border-${m[1]}-${flip(m[2])}-radius`
}

/** Rules whose padding/margin rides on the PAPER's own page margin: a column
 *  (or the body wrapper) reserves extra room on the reading side, and the page
 *  margin under it comes from another rule. It is the LAST compound that says
 *  which element receives the padding — `.rm-col-main .rm-item-head` is a row
 *  inside a column, and a row's padding is its own entire edge. */
const PAGE_COLUMN = /\.rm-col-(?:main|aside)\b|\.rm-body\b/

const targetCompound = (selector) => {
  const part = selector.split(',')[0].trim()
  const last = splitSpace(part).pop() || ''
  return last.split(/[>+~]/).pop()
}

/**
 * The declarations that mirror `decls`, or null when nothing in the rule has a
 * physical side. `selector` decides whether a padding is additive (a column
 * reserving room on top of the page margin) or the element's own edge.
 */
function mirrorDecls(decls, selector = '') {
  const map = new Map()
  for (const decl of decls) {
    const at = decl.indexOf(':')
    if (at === -1) continue
    map.set(decl.slice(0, at).trim(), decl.slice(at + 1).trim())
  }
  const out = []
  const push = (prop, value) => out.push(`${prop}: ${value};`)

  for (const [prop, value] of map) {
    // `auto` is not a length, it is "absorb the free space on this side", and
    // that only mirrors if the side it leaves stops absorbing. Left as a
    // logical property, the base rule's own `auto` kept applying on the other
    // side, the two autos split the free space evenly and the date floated to
    // the MIDDLE of the row instead of the end of the line (2026-11-15 user
    // report: "the dates are not at the end of the line, they come inward").
    const auto = /^margin-(left|right)$/.test(prop) && value.trim() === 'auto'
    if (auto) {
      const side = /left$/.test(prop) ? 'left' : 'right'
      const other = flip(side)
      const paired = map.get(`margin-${other}`)
      if (paired !== undefined) {
        if (side === 'left') {
          push('margin-left', paired)
          push('margin-right', value)
        }
      } else {
        push(`margin-${side}`, '0')
        push(`margin-${other}`, 'auto')
      }
      continue
    }

    const sideProp = /^(margin|padding)-(left|right)$/.exec(prop)
    if (sideProp) {
      const [, kind, side] = sideProp
      const other = flip(side)
      if (PAGE_COLUMN.test(targetCompound(selector))) {
        // Additive: the column's page margin lives in another rule, so the
        // extra room is written LOGICALLY — it moves to the reading side and
        // leaves the page margin alone. Swapping it physically zeroed that
        // margin, which is how the body text ended up flush with the paper's
        // edge while the chip floated in the opposite margin.
        push(LOGICAL[prop], value)
      } else {
        // Everywhere else this rule IS the element's whole padding on that
        // axis: swap the sides and hand the vacated side back to the base rule
        // (`0`), or the row ends up indented on both sides at once.
        const paired = map.get(`${kind}-${other}`)
        if (paired !== undefined) {
          if (side === 'left') {
            push(`${kind}-left`, paired)
            push(`${kind}-right`, value)
          }
        } else {
          push(`${kind}-${side}`, '0')
          push(`${kind}-${other}`, value)
        }
      }
      continue
    }

    // Insets, side borders and corner radii are swapped PHYSICALLY, and the
    // side they leave behind is reset. As a logical property the declaration
    // would land on the other side while the base rule's physical one kept
    // applying; with both sides set the browser resolved the over-constrained
    // pair straight back to where it started, and the chip never moved.
    if (prop === 'left' || prop === 'right') {
      const other = flip(prop)
      const paired = map.get(other)
      if (paired !== undefined) {
        if (prop === 'left') {
          push('left', paired)
          push('right', value)
        }
      } else {
        push(prop, 'auto')
        push(other, value)
      }
      continue
    }

    const corner = cornerTwin(prop)
    if (corner) {
      const paired = map.get(corner)
      if (paired !== undefined) {
        if (/:left-radius$/.test(prop)) {
          push(prop, paired)
          push(corner, value)
        }
      } else {
        push(prop, '0')
        push(corner, value)
      }
      continue
    }

    const border = /^border-(left|right)(-(?:width|style|color))?$/.exec(prop)
    if (border) {
      const side = border[1]
      const sub = border[2] || ''
      const other = flip(side)
      const paired = map.get(`border-${other}${sub}`)
      if (paired !== undefined) {
        if (side === 'left') {
          push(`border-left${sub}`, paired)
          push(`border-right${sub}`, value)
        }
      } else if (value === 'none') {
        // a rule that DROPS a side border drops the other one in RTL
        push(`border-${other}${sub}`, 'none')
      } else if (sub === '-style') {
        push(`border-${side}${sub}`, 'none')
        push(`border-${other}${sub}`, value)
      } else {
        push(`border-${side}${sub}`, '0')
        push(`border-${other}${sub}`, value)
      }
      continue
    }

    if (prop === 'text-align' && /\b(left|right)\b/.test(value)) {
      // A side can hide inside a var() fallback — `text-align: var(--rm-align,
      // left)` is how a section's alignment reaches its body text — so flip any
      // bare left/right in the value, not only one that IS the whole value.
      push('text-align', value.replace(/\b(left|right)\b/g, (side) => (side === 'left' ? 'right' : 'left')))
      continue
    }

    if (prop === 'float' && (value === 'left' || value === 'right')) {
      push('float', value === 'left' ? 'right' : 'left')
      continue
    }

    if (prop === 'margin' || prop === 'padding') {
      const important = /\s*!important\s*$/.test(value)
      const bare = important ? value.replace(/\s*!important\s*$/, '') : value
      const parts = splitSpace(bare)
      // 1 and 2 values are symmetric across the inline axis; 3 values put the
      // same value on both inline sides. Only 4 values are lopsided.
      if (parts.length === 4) {
        const [t, r, b, l] = parts
        push(prop, `${t} ${l} ${b} ${r}${important ? ' !important' : ''}`)
      }
      continue
    }
  }

  return out.length ? out : null
}

const rtlSelector = (selector) =>
  splitTop(selector, ',')
    .map((part) => {
      let s = part.replace(/\s+/g, ' ').trim()
      // The mirror is already scoped to .rm-root[dir='rtl'], so a leading
      // `.rm-root` (alone, or as `.rm-root.meta-margin`) would look for a
      // second root and never match.
      s = s.replace(/^\.rm-root(?=[.:\s>+~]|$)/, '').trim()
      if (!s) return SCOPE
      if (/^[>+~]/.test(s)) return `${SCOPE} ${s}`
      // A leading class may sit on the root ITSELF (`.rm-icons`, `.sicon-folio`,
      // `.mode-preview` … the root carries dozens) or on a descendant
      // (`.rm-col-aside`). Written as `SCOPE .rm-icons`, the first case can
      // never match — `.rm-icons` IS `.rm-root`, so it is not a descendant of
      // it — and every mirrored rule in that block silently did nothing
      // (2026-11-15 user report: section chips did not change side in RTL).
      // `:is()` spells both readings in one selector; the second is the old
      // behaviour and matches the descendant case, the first the root one.
      const [first, ...restParts] = splitSpace(s)
      const rest = restParts.length ? ' ' + restParts.join(' ') : ''
      if (/^[.:[]/.test(first)) return `:is(${SCOPE}${first}, ${SCOPE} ${first})${rest}`
      return `${SCOPE} ${first}${rest}`
    })
    .join(', ')

function emit(nodes, indent = '') {
  const chunks = []
  for (const node of nodes) {
    if (node.at) {
      const inner = emit(node.children, indent + '  ')
      if (inner) chunks.push(`${indent}${node.at} {\n${inner}\n${indent}}`)
      continue
    }
    const decls = splitTop(node.body, ';')
    const mirrored = mirrorDecls(decls, node.selector)
    if (!mirrored) continue
    const body = mirrored.map((d) => `${indent}  ${d}`).join('\n')
    chunks.push(`${indent}${rtlSelector(node.selector)} {\n${body}\n${indent}}`)
  }
  return chunks.join('\n\n')
}

const blocks = []
for (const file of SOURCES) {
  const source = stripComments(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  const emitted = emit(parseBlocks(source))
  if (emitted.trim()) {
    blocks.push(`/* ---- from ${file} ---- */\n\n${emitted}`)
  }
}

const header = `/* GENERATED by scripts/make-rtl-css.cjs — do not edit by hand.
   Mirrors every physical offset in artboard.css and templates.css for a resume
   rendered right-to-left (Design panel → Layout → Right-to-left). \`dir="rtl"\`
   alone already flips rows, grid tracks and implicit alignment; this file moves
   the things that are pinned to a physical side — the bullet gutter, the date
   pushed to the far edge, a hanging section chip, the timeline rail.
   Loaded after templates.css. Regenerate with:  node scripts/make-rtl-css.cjs */

`

fs.writeFileSync(OUT, header + blocks.join('\n\n') + '\n')
const rules = (header + blocks.join('\n\n')).split('\n').filter((l) => l.trim().endsWith('{')).length
console.log(`wrote ${path.relative(ROOT, OUT)} — ${rules} mirrored rule(s)`)
