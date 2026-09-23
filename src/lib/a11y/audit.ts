/**
 * The audit itself: a snapshot of the artboard in, a list of failing pairs
 * out. No DOM is touched here - snapshot.ts does that once - so every rule
 * below can be exercised from a test, including the two kinds of text every
 * previous attempt missed.
 *
 * What it walks, and why each one is here:
 *   text nodes      the obvious case
 *   ::marker        a bullet is a pseudo-element, not a text node. A DOM walk
 *                   over text nodes passed all 68 designs while a checker
 *                   faulted nine markers a page.
 *   [data-deco]     a running section numeral, a stat figure, a meter value.
 *                   The exporter draws these as OUTLINES, so the file carries
 *                   no text span and no file-side checker can ever see them -
 *                   and a reader still has to read them.
 *   ::before/::after with words or figures in them. A glyph that carries
 *                   neither - a pipe, a middle dot, a dash between two facts -
 *                   is decoration: the exporter draws it as such, the file
 *                   carries no text span for it, and the guideline exempts it.
 */
import { over, parseColor, quantise, ratio as ratioOf, toHex, type Rgba } from './color'
import { drawnPt, fails, isLargeText, ptFromPx, requiredRatio, type Box } from './geometry'
import { compositeGrounds, layerColors, paperOf, type GroundCandidate, type PaintLayer } from './ground'
import { isColourSetting, nameGround, nameInk, roleOf, sectionKeyOf, type ChainStep, type InkNaming, type InkRole, regionOf, type InkRegion } from './settings'
import { isTransformed, solveAmount } from './transform'
import { capReason, solveValue, worstOn, type InkTarget, type TargetGround } from './solve'
import type {
  ArtboardSnapshot,
  ContrastFinding,
  ContrastReport,
  NodeSnapshot,
  ProbeKind,
  StyleSnapshot,
  Unmeasured,
} from './types'

export interface AuditOptions {
  /** Stop after this many findings; the walk still counts what it checked. */
  limit?: number
}

export interface Probe {
  kind: ProbeKind
  style: StyleSnapshot
  box: Box
  text: string
  chain: ChainStep[]
  /** The layers behind these words, farthest first. */
  layers: PaintLayer[]
  /** The element's own layer, when the background paints the GLYPHS. */
  clipText: boolean
  ownLayer: PaintLayer | null
}

export function auditContrast(snap: ArtboardSnapshot, opts: AuditOptions = {}): ContrastReport {
  const paper = paperOf(snap.root.style.backgroundColor)
  const findings: ContrastFinding[] = []
  const unmeasured: Unmeasured[] = []
  let checked = 0
  const limit = opts.limit ?? 400

  const passes: PassRecord[] = []
  for (const probe of probes(snap.root)) {
    const out = assess(probe, snap.vars, paper, (p) => passes.push(p))
    if (!out) continue
    checked++
    if (out.unmeasured) {
      unmeasured.push(out.unmeasured)
      continue
    }
    if (out.finding && findings.length < limit) findings.push(out.finding)
  }
  findings.sort((a, b) => a.measured - b.measured)
  resolveSuggestions(findings, keepersFor(findings, passes, snap.vars, paper))
  return { paper: toHex(paper), checked, findings, unmeasured, template: snap.template }
}

/* ------------------------------------------------------------------ */
/* the walk                                                            */
/* ------------------------------------------------------------------ */

const VISIBLE_TEXT = /\S/
/** A letter or a digit: what makes pseudo-content words rather than a separator. */
const WORDS = /[\p{L}\p{N}]/u

export function* probes(root: NodeSnapshot): Generator<Probe> {
  yield* visit(root, [], [], 1)

  function* visit(
    node: NodeSnapshot,
    chain: ChainStep[],
    layers: PaintLayer[],
    opacityAbove: number
  ): Generator<Probe> {
    const st = node.style
    if (st.display === 'none' || st.visibility === 'hidden' || st.visibility === 'collapse') return
    const opacity = opacityAbove * (Number.isFinite(st.opacity) ? st.opacity : 1)
    if (opacity < 0.02) return
    const here: ChainStep[] = [...chain, { tag: node.tag, classes: node.classes }]
    const clipText = st.backgroundClip === 'text'
    const own = ownLayer(node, opacity)
    // A background that paints the GLYPHS is not a ground; it is the ink.
    const withOwn = own && !clipText ? [...layers, own] : layers
    // The art band and its wash are absolutely positioned first children at
    // z-index -1: above their parent's own ground, below every word in it
    // (artboard.css .rm-art-band). Nothing else on the page paints behind a
    // sibling, so this one rule covers the whole class.
    const behind = node.children
      .filter((c) => isBackdrop(c))
      .map((c) => ownLayer(c, opacity * (Number.isFinite(c.style.opacity) ? c.style.opacity : 1)))
      .filter((l): l is PaintLayer => !!l)
    const stack = behind.length ? [...withOwn, ...behind] : withOwn

    if (VISIBLE_TEXT.test(node.text))
      yield {
        kind: node.deco ? 'decorative' : node.ariaHidden ? 'decorative' : 'text',
        style: faded(st, opacity),
        box: node.box,
        text: node.text,
        chain: here,
        layers: stack,
        clipText,
        ownLayer: own,
      }

    if (node.marker && VISIBLE_TEXT.test(node.marker.content ?? '•'))
      yield {
        kind: 'marker',
        style: faded(node.marker, opacity),
        // A marker hangs in the indent at the left edge of its item; the
        // list's ground runs under it, which is the item's own ground.
        box: node.box,
        text: (node.marker.content ?? '•').trim() || '•',
        chain: here,
        layers: stack,
        clipText: false,
        ownLayer: own,
      }

    for (const pseudo of [node.before, node.after]) {
      if (!pseudo || !WORDS.test(pseudo.content ?? '')) continue
      yield {
        kind: 'pseudo',
        style: faded(pseudo, opacity * (Number.isFinite(pseudo.opacity) ? pseudo.opacity : 1)),
        box: node.box,
        text: (pseudo.content ?? '').trim(),
        chain: here,
        layers: stack,
        clipText: false,
        ownLayer: own,
      }
    }

    for (const child of node.children) {
      if (isBackdrop(child)) continue
      yield* visit(child, here, stack, opacity)
    }
  }
}

/**
 * The ink as the page paints it through an `opacity`: the element's own, an
 * ancestor's, or a pseudo-element's. A contact separator at `opacity: .5` is
 * painted at half its colour; measured at full strength it passed at 7.5:1
 * where the page draws 2.3:1, and a colour solved for it was solved for a
 * paint the page does not use. Folded into the ink's alpha, the opacity is
 * one more transform between the setting and the page, and the solve paints
 * every candidate through it.
 *
 * Exact when the faded element has no ground of its own, which is every
 * case the designs use it for (separators, a footer sub-line). Where it has
 * one, that ground is faded by the same opacity (`ownLayer`) and the ink
 * over it is within a rounding of what the browser composites.
 */
function faded(st: StyleSnapshot, opacity: number): StyleSnapshot {
  if (!(opacity < 0.999)) return st
  const c = parseColor(st.color)
  if (!c) return st
  return { ...st, color: `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.round(c[3] * opacity * 1000) / 1000})` }
}

/** A child that paints BEHIND its parent's words rather than in front. */
function isBackdrop(node: NodeSnapshot): boolean {
  const pos = node.style.position
  if (pos !== 'absolute' && pos !== 'fixed') return false
  const z = Number(node.style.zIndex)
  return Number.isFinite(z) ? z < 0 : false
}

function ownLayer(node: NodeSnapshot, opacity: number): PaintLayer | null {
  const st = node.style
  const bg = parseColor(st.backgroundColor)
  const hasColor = !!bg && bg[3] > 0.002
  const hasImage = !!st.backgroundImage && st.backgroundImage !== 'none'
  const picture = node.tag === 'img'
  if (!hasColor && !hasImage && !picture) return null
  return {
    box: node.box,
    color: st.backgroundColor,
    image: st.backgroundImage,
    picture,
    pictureGrounds: node.image?.grounds,
    pictureCells: node.image?.cells,
    pictureFit: node.image?.fit,
    picturePosition: node.image?.position,
    opacity,
    source: describe(node),
  }
}

/** Two colours the same, channel for channel, within the rounding a browser
 *  does on the way to a computed value. */
const sameChannels = (a: Rgba, b: Rgba): boolean =>
  Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && Math.abs(a[2] - b[2]) <= 1

/** The colours a wash of an ink is laid over: the paper and the three grounds
 *  a design can give a region of the page. */
const GROUND_VALUES = ['--rm-bg', '--rm-sidebar-bg', '--rm-footer-bg']

/**
 * Is this ground a WASH OF THE SETTING, and how much of it?
 *
 * Two shapes, one answer. A card is `var(--rm-text)` at 4% over whatever is
 * behind it, which arrives as a layer with an alpha; a dark design's chip is
 * `color-mix(in srgb, var(--rm-text) 6%, var(--rm-bg))`, which arrives
 * OPAQUE and gives the compositor nothing to notice. Both move when the
 * setting moves, and a suggestion that does not know it is a suggestion that
 * lands a hundredth short: twenty-three findings survived their own fix on a
 * dark design that way, at 4.41:1 against a ground that had shifted under
 * them.
 */
function tintOf(
  g: GroundCandidate,
  value: Rgba | undefined,
  paper: Rgba,
  vars: Record<string, string>
): { amount: number; partner: Rgba } | undefined {
  if (!value) return undefined
  if (g.tint && sameChannels(g.tint.ink, value)) return { amount: g.tint.amount, partner: g.tint.partner }
  // An opaque wash: the ground itself is this setting mixed with a page
  // colour. Only a WASH is accepted - a ground that is mostly the ink is a
  // band, not a tint of one - and only the page's own grounds are offered as
  // the other half, so a colour is not "explained" by arithmetic alone.
  const partners = [paper, ...GROUND_VALUES.map((v) => parseColor(vars[v] ?? '')).filter((c): c is Rgba => !!c)]
  for (const partner of partners) {
    const amount = solveAmount(g.color, value, partner)
    if (amount !== null && amount <= 0.35) return { amount, partner }
  }
  return undefined
}

const describe = (node: NodeSnapshot) =>
  node.tag + (node.classes.length ? '.' + node.classes.filter((c) => c.startsWith('rm-')).join('.') : '')

/* ------------------------------------------------------------------ */
/* one measurement                                                     */
/* ------------------------------------------------------------------ */

export interface Assessment {
  finding?: ContrastFinding
  unmeasured?: Unmeasured
}

/** A run of words that READS, kept so that a colour offered for the same
 *  setting elsewhere is not allowed to break it. */
export interface PassRecord {
  color: string
  role: InkRole
  /** The paper the words are on - which setting paints them depends on it. */
  region: InkRegion
  grounds: GroundCandidate[]
  required: number
}

export function assess(
  probe: Probe,
  vars: Record<string, string>,
  paper: Rgba,
  onPass?: (pass: PassRecord) => void
): Assessment | null {
  const st = probe.style
  if (probe.box.w < 1 || probe.box.h < 1) return null
  const inkRaw = parseColor(st.color)
  if (!inkRaw) return null

  const grounds = compositeGrounds(probe.layers, probe.box, paper)
  if (!grounds.length) return null
  const where = probe.chain.map((s) => s.tag + (s.classes.length ? '.' + s.classes.join('.') : '')).join(' > ')
  const sample = probe.text.replace(/\s+/g, ' ').trim().slice(0, 48)
  if (grounds.some((g) => g.kind === 'unknown'))
    return {
      unmeasured: {
        where,
        sample,
        reason: 'a picture is painted behind these words and its own pixels could not be read',
      },
    }

  // The ink itself: normally the element's colour, but a background clipped
  // to the text paints the GLYPHS, so the fade is the ink and the element's
  // own background is not a ground at all.
  const inks: Rgba[] =
    probe.clipText && probe.ownLayer
      ? layerColors({ ...probe.ownLayer, color: null }, probe.box).map((c) => c.color)
      : [inkRaw]
  if (!inks.length) inks.push(inkRaw)

  const pt = drawnPt(ptFromPx(st.fontSizePx), probe.text, st.smallCapsScale)
  const weight = Number.isFinite(st.fontWeight) ? st.fontWeight : 400
  const required = requiredRatio(pt, weight)

  let worst: { r: number; ground: GroundCandidate; painted: Rgba } | null = null
  for (const g of grounds)
    for (const ink of inks) {
      const painted = quantise(over([ink[0], ink[1], ink[2], ink[3]], g.color))
      const r = ratioOf(painted, g.color)
      if (!worst || r < worst.r) worst = { r, ground: g, painted }
    }
  if (!worst) return null

  const measured = Math.round(worst.r * 100) / 100
  if (!fails(worst.r, required)) {
    // A glyph-clipped fade is painted by a background, not by a colour
    // setting, so it holds nothing a suggestion could break.
    if (onPass && !probe.clipText)
      onPass({ color: st.color, role: roleOf(probe.chain, probe.kind), region: regionOf(probe.chain), grounds, required })
    return {}
  }

  const role = roleOf(probe.chain, probe.kind)
  const naming = nameInk(st.color, role, vars, regionOf(probe.chain))
  const ground = nameGround(probe.chain, vars, toHex(worst.ground.color))
  const section = sectionKeyOf(probe.chain)
  const inkHex = toHex(worst.painted)
  const groundHex = toHex(worst.ground.color)

  const finding: ContrastFinding = {
    id: `${naming.setting.cssVar ?? naming.setting.path ?? naming.setting.label}|${inkHex}|${groundHex}|${probe.kind}`,
    kind: probe.kind,
    sample,
    where,
    foreground: inkHex,
    background: groundHex,
    groundKind: worst.ground.kind,
    alpha: Math.round(inkRaw[3] * 1000) / 1000,
    pt: Math.round(pt * 100) / 100,
    weight,
    large: isLargeText(pt, weight),
    required,
    measured,
    origin: naming.origin,
    setting: section && !naming.setting.section ? { ...naming.setting, section } : naming.setting,
    ground,
    alsoMatches: naming.alsoMatches,
    uncertain: naming.uncertain,
    paint: {
      value: naming.paint.value ? toHex(naming.paint.value) : undefined,
      amount: naming.paint.amount,
      alpha: naming.paint.alpha,
      partner: naming.paint.partner ? toHex(naming.paint.partner) : undefined,
      // A ground that is a wash of THIS setting is carried as what it is made
      // of: it moves when the setting moves, and a colour solved against it
      // as it stands falls short the moment the page repaints.
      grounds: grounds.map((g) => {
        const tint = tintOf(g, naming.paint.value, paper, vars)
        return { color: toHex(g.color), tint: tint ? { amount: tint.amount, partner: toHex(tint.partner) } : undefined }
      }),
    },
  }

  if (naming.origin === 'derived') {
    finding.bug = derivedBug(naming, worst.ground.color, measured)
  } else if (naming.uncertain && !naming.setting.cssVar && isColourSetting(finding.setting.path)) {
    // Nothing on the artboard resolves to this ink, so the control named is
    // the role's guess. A colour written into a control that did not paint
    // the words moves nothing - offering one is the loop this checker exists
    // to stop - so the report says what it does not know instead.
    const raw = toHex([inkRaw[0], inkRaw[1], inkRaw[2], 1])
    finding.noFix = {
      reason:
        `Nothing on the artboard resolves to ${raw}, so this report cannot tell which control painted these words. ` +
        `${finding.setting.label} is where words like these usually take their colour, but that is a guess, and a colour written there may move nothing: ` +
        `the design's own stylesheet may be colouring them.`,
      best: measured,
    }
  } else if (!isColourSetting(finding.setting.path)) {
    // A mark whose ink no control on this page holds: a bullet or a running
    // numeral the design's own stylesheet colours. The setting named is where
    // the mark itself lives, so a person can find it - but there is no colour
    // to write there, and offering one is an instruction nobody can carry out.
    finding.noFix = {
      reason:
        `This mark's colour is set by the design itself, not by a control here: nothing on the artboard resolves to ${inkHex}. ` +
        `Changing ${finding.setting.label} will not move it.`,
      best: measured,
    }
  } else {
    // What one run of words needs on its own. Where the same setting paints
    // elsewhere too, `resolveSuggestions` solves the whole set at once and
    // replaces this - but a caller holding a single assessment still gets an
    // answer that is true for the pair in front of it.
    answerFor([finding])
  }
  return { finding }
}

/**
 * What has gone wrong with a DERIVED ink, in words.
 *
 * Two defects look the same from the page. The derivation can have come out
 * too pale, and then the derivation is what is wrong. Or the derivation is
 * sound and the design paints it weaker - a separator at 45% of the card's
 * muted ink - and then the derivation is the one part that works, and
 * sending somebody to it sends them to the wrong place.
 */
function derivedBug(naming: InkNaming, ground: Rgba, measured: number): string {
  const value = naming.paint.value
  if (value && isTransformed(naming.paint)) {
    const full = Math.round(ratioOf(quantise([value[0], value[1], value[2], 1]), ground) * 100) / 100
    const strength = Math.round(naming.paint.amount * naming.paint.alpha * 100)
    if (full > measured)
      return (
        `This ink is derived by the product (${naming.derivation}); at full strength it measures ${full}:1 here. ` +
        `The design paints it at ${strength}% of its strength, which is ${measured}:1, so the ${strength}% in the design's own rule is what caps it` +
        (fails(full, 4.5) ? ', and the derivation is short as well.' : ' - not the derivation, and not a setting.')
      )
  }
  return (
    `This ink is not the author's: the product derives it (${naming.derivation}) so that it reads. ` +
    `At ${measured}:1 the derivation has failed, and the fix belongs in the derivation, not in a setting.`
  )
}

/* ------------------------------------------------------------------ */
/* the colour to offer                                                 */
/* ------------------------------------------------------------------ */

/** A finding the suggestion pass solves for: a TRACED author colour. A guess
 *  is not solved for, and neither is a finding already answered. */
const solvable = (f: ContrastFinding): boolean =>
  f.origin === 'author' && isColourSetting(f.setting.path) && !!f.setting.cssVar && !f.noFix

const settingKey = (s: { path?: string; cssVar?: string; label: string }): string => s.path ?? s.cssVar ?? s.label

/**
 * The words each failing setting paints that READ today.
 *
 * A colour solved only against the failing pairs can break the pairs that
 * pass: the muted ink that fails on the page and reads on a dark row is
 * fixed on the page by darkening it, and the row then fails. Those words are
 * as much "everywhere the setting paints" as the failing ones, so they are
 * held to their own threshold in the same solve.
 *
 * Only settings with a failing finding are traced, and each distinct colour
 * is named once, so a page with nothing failing pays nothing for this.
 */
function keepersFor(
  findings: ContrastFinding[],
  passes: PassRecord[],
  vars: Record<string, string>,
  paper: Rgba
): Map<string, InkTarget[]> {
  const out = new Map<string, InkTarget[]>()
  const wanted = new Set(findings.filter(solvable).map((f) => settingKey(f.setting)))
  if (!wanted.size) return out
  const names = new Map<string, InkNaming>()
  for (const p of passes) {
    const k = `${p.color}|${p.role}|${p.region}`
    let naming = names.get(k)
    if (!naming) {
      naming = nameInk(p.color, p.role, vars, p.region)
      names.set(k, naming)
    }
    const value = naming.paint.value
    if (naming.origin !== 'author' || !naming.setting.cssVar || !value) continue
    const key = settingKey(naming.setting)
    if (!wanted.has(key)) continue
    const grounds: TargetGround[] = p.grounds.map((g) => {
      const tint = tintOf(g, value, paper, vars)
      return tint ? { color: g.color, tint } : { color: g.color }
    })
    const target: InkTarget = { path: naming.paint, grounds, required: p.required }
    const list = out.get(key)
    if (list) list.push(target)
    else out.set(key, [target])
  }
  return out
}

/** A finding read back as something to solve: how the setting is painted
 *  here, everything it stands on here, and what it has to reach. */
function targetOf(f: ContrastFinding): InkTarget {
  const grounds: TargetGround[] = []
  for (const g of f.paint.grounds) {
    const color = parseColor(g.color)
    if (!color) continue
    const partner = g.tint ? parseColor(g.tint.partner) : null
    grounds.push(partner && g.tint ? { color, tint: { amount: g.tint.amount, partner } } : { color })
  }
  return {
    path: {
      value: parseColor(f.paint.value ?? '') ?? undefined,
      amount: f.paint.amount,
      alpha: f.paint.alpha,
      partner: parseColor(f.paint.partner ?? '') ?? undefined,
    },
    grounds: grounds.length ? grounds : [{ color: parseColor(f.background) as Rgba }],
    required: f.required,
  }
}

/** Two runs of words that ask the setting the same question: the same
 *  transform onto the same grounds at the same threshold. */
const signature = (t: InkTarget): string =>
  `${t.required}|${t.path.amount}|${t.path.alpha}|${t.path.partner?.join()}|` +
  t.grounds.map((g) => `${g.color.join()}${g.tint ? `:${g.tint.amount}:${g.tint.partner.join()}` : ''}`).join(';')

const startOf = (f: ContrastFinding): Rgba =>
  parseColor(f.paint.value ?? '') ?? (parseColor(f.foreground) as Rgba) ?? [0, 0, 0, 1]

/**
 * One colour for a set of findings that share a setting - solved through
 * each one's own transform, against every ground each one stands on.
 *
 * A finding no value of the setting can reach is not allowed to sink the
 * rest: it is named as unfixable-from-here, with the reason, and the others
 * are solved without it. That is the difference between "your muted colour
 * cannot be fixed" and the truth, which is "it can, everywhere except the
 * separator the design paints at 45%".
 */
function answerFor(members: ContrastFinding[], keepers: InkTarget[] = []): void {
  if (!members.length) return
  const start = startOf(members[0])
  const label = members[0].setting.label
  const rows = members.map((f) => ({ f, target: targetOf(f), key: signature(targetOf(f)) }))
  // Forty dates in the same colour on the same ground are one question, not
  // forty: the walk runs once for each DISTINCT pair of transform, grounds
  // and threshold, which is what keeps this cheap enough for a keystroke.
  const distinct = new Map<string, InkTarget>()
  for (const r of rows) if (!distinct.has(r.key)) distinct.set(r.key, r.target)
  const alone = new Map<string, ReturnType<typeof solveValue>>()
  for (const [key, target] of distinct) alone.set(key, solveValue(start, [target]))
  const reachable = rows.filter((r) => !!alone.get(r.key)?.color)
  const stuck = rows.filter((r) => !alone.get(r.key)?.color)
  for (const r of stuck) {
    const best = alone.get(r.key)?.best ?? 0
    r.f.suggestion = undefined
    r.f.noFix = { reason: capReason([r.target], best, label), best }
  }
  if (!reachable.length) return
  const need = [...distinct].filter(([key]) => alone.get(key)?.color).map(([, target]) => target)
  // The words this setting paints that read today, once each: forty dates
  // that already read on the same ground are one constraint, not forty.
  const keep = new Map<string, InkTarget>()
  for (const t of keepers) {
    const key = signature(t)
    if (!distinct.has(key) && !keep.has(key)) keep.set(key, t)
  }
  const solved = solveValue(start, [...need, ...keep.values()])
  if (!solved.color) {
    // Each reachable on its own, and not all together - or not without
    // breaking words that read now. Either way the truth is that no one
    // value reads everywhere this setting paints, and the reason says which.
    const loose = keep.size ? solveValue(start, need) : null
    const reason = loose?.color
      ? keptReason(label, loose.color, [...keep.values()])
      : capReason(need, solved.best, label)
    for (const r of reachable) {
      r.f.suggestion = undefined
      r.f.noFix = { reason, best: solved.best }
    }
    return
  }
  const colour = parseColor(solved.color) as Rgba
  for (const r of reachable) {
    r.f.noFix = undefined
    r.f.suggestion = {
      color: solved.color,
      measured: Math.round(worstOn(r.target, colour) * 100) / 100,
      fixes: reachable.length,
    }
  }
}

/** Why the nearest fix for the failing words cannot be offered: it would
 *  break words the same setting paints that read today. */
function keptReason(label: string, colour: string, keep: InkTarget[]): string {
  const value = parseColor(colour) as Rgba
  const broken = keep.filter((t) => fails(worstOn(t, value), t.required))
  const grounds = [...new Set(broken.flatMap((t) => t.grounds.map((g) => toHex(g.color))))]
  return (
    `${label} also paints words that read today on ${grounds.slice(0, 3).join(', ')}, and the nearest value that makes these read (${colour}) ` +
    `would make those fail. No one value of ${label} reads everywhere it is painted: one of those grounds is what would have to change.`
  )
}

/**
 * The second pass: one suggestion per setting, good for every ground that
 * setting paints on anywhere in the document.
 *
 * The first pass answers each run of words on its own, and that was the
 * third defect: the same setting paints on the page, on a lifted card and on
 * a row tint, each one a separate finding with a colour solved for its own
 * ground. Applying the worst row's colour left the cards still failing. So
 * the whole document's findings are gathered by setting and solved once.
 *
 * Findings whose setting could not be resolved at all are grouped by their
 * INK as well: two colours the artboard cannot account for are not one
 * control just because the role guessed the same name for both.
 */
function resolveSuggestions(findings: ContrastFinding[], keepers: Map<string, InkTarget[]> = new Map()): void {
  const groups = new Map<string, ContrastFinding[]>()
  for (const f of findings) {
    if (!solvable(f)) continue
    const key = settingKey(f.setting)
    const list = groups.get(key)
    if (list) list.push(f)
    else groups.set(key, [f])
  }
  for (const [key, members] of groups) answerFor(members, keepers.get(key))
}

/**
 * The findings gathered by the setting that produced them - which is how a
 * person reads them: one line per control, not one line per word.
 *
 * Keyed on the SETTING, and nothing else. It used to carry the ground in the
 * key, which split one control into a row per ground and handed each row a
 * colour solved for that ground alone: a panel showing the worst row first
 * offered a colour that left the other rows failing. The rows are one row
 * now, and the colour on it is the one solved against every ground the
 * setting paints on (`resolveSuggestions`), so the row can say what it
 * fixes.
 */
export function groupBySetting(findings: ContrastFinding[]): {
  setting: ContrastFinding['setting']
  origin: ContrastFinding['origin']
  worst: number
  required: number
  count: number
  /** Every ground this setting's ink lands on, across the whole group. */
  grounds: string[]
  suggestion?: ContrastFinding['suggestion']
  /** How many of the group's findings no value of the setting can fix, and
   *  why the first of them cannot. */
  unfixable?: { count: number; reason: string }
  samples: string[]
}[] {
  const groups = new Map<string, ReturnType<typeof groupBySetting>[number]>()
  const seenGrounds = new Map<string, Set<string>>()
  for (const f of findings) {
    const key = `${f.setting.path ?? f.setting.cssVar ?? f.setting.label}|${f.origin}`
    let g = groups.get(key)
    if (!g) {
      g = {
        setting: f.setting,
        origin: f.origin,
        worst: f.measured,
        required: f.required,
        count: 0,
        grounds: [],
        samples: [],
      }
      groups.set(key, g)
      seenGrounds.set(key, new Set())
    }
    const grounds = seenGrounds.get(key) as Set<string>
    for (const g of f.paint.grounds.length ? f.paint.grounds.map((x) => x.color) : [f.background]) grounds.add(g)
    g.count++
    // Worst by how far a pair falls short of ITS OWN bar: a large name at
    // 2.6 against 3:1 is nearer to reading than body text at 2.9 against 4.5,
    // and the row should lead with the pair that has furthest to go.
    if (f.measured / f.required < g.worst / g.required) {
      g.worst = f.measured
      g.required = f.required
    }
    // The colour that clears the MOST of the group leads. Every suggestion
    // in a group is solved against the whole of it, so they agree - except
    // where the setting could not be resolved and two unrelated inks guessed
    // at the same control, and then the one that fixes more is the better
    // answer to put in front of somebody.
    if (f.suggestion && (!g.suggestion || f.suggestion.fixes > g.suggestion.fixes)) g.suggestion = f.suggestion
    if (f.noFix) {
      g.unfixable = { count: (g.unfixable?.count ?? 0) + 1, reason: g.unfixable?.reason ?? f.noFix.reason }
    }
    if (g.samples.length < 3) g.samples.push(f.sample)
  }
  for (const [key, g] of groups) g.grounds = [...(seenGrounds.get(key) as Set<string>)]
  return [...groups.values()].sort((a, b) => a.worst / a.required - b.worst / b.required)
}
