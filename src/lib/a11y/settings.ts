/**
 * The SETTING behind a colour.
 *
 * A measurement nobody can act on is a complaint. "3.1 to 1" says nothing
 * until it says WHICH control made it, in the words the control itself uses -
 * "Muted text", "Sidebar text", "Section titles", "Rings" - so a person can
 * open that row and change it, or decide not to.
 *
 * Every colour on the artboard is painted through a custom property on the
 * root (Artboard.tsx useVars), so the trace is: the ink the page computed,
 * matched against those resolved properties, ranked by what the element IS.
 * Where two properties resolve to the same colour - which happens often, a
 * derived ink is the accent itself whenever the accent already reads - the
 * best match leads and the rest are carried as `alsoMatches` rather than
 * guessed between.
 *
 * What the page computed is rarely the property's own value, though, and
 * that was the defect worth fixing here: a separator is painted at 45% of
 * the muted colour, a date in a band at 85% of the band's ink, a sub-line as
 * 72% of the body ink mixed with the muted one. Matched on the colour AND
 * the alpha, every one of those matched nothing and fell through to a guess
 * at what the words ARE - which named "Muted text" for a sidebar's own ink,
 * a control that moved nothing when it was changed. So the ink is resolved
 * THROUGH its transform first (transform.ts), and the transform is carried
 * on to whoever has to offer a colour: a colour solved for the painted ink
 * and written into a setting the page paints at 45% of itself repaints at
 * 45% and measures exactly what it measured before.
 */
import { ELEMENT_COLORS } from '@/lib/elementColors'
import { parseColor, toHex, type Rgba } from './color'
import { matchPaints, straight, type PaintCandidate, type PaintPath } from './transform'
import type { FindingOrigin, ProbeKind, SettingRef } from './types'

/** One element of the chain from the artboard root down to the words. */
export interface ChainStep {
  tag: string
  classes: string[]
}

interface VarSetting extends SettingRef {
  cssVar: string
  origin: FindingOrigin
}

const ELEMENT_LABELS: Record<string, string> = {
  name: 'Name',
  headline: 'Headline',
  headings: 'Section titles',
  contacts: 'Contacts',
  links: 'Links',
}

/**
 * The colours the AUTHOR set, each named as its own control names it.
 *
 * These are the ones worth telling somebody about: they are choices, and the
 * product must not move them.
 */
const AUTHOR_VARS: VarSetting[] = [
  { cssVar: '--rm-text', group: 'Accent color', label: 'Body text', path: 'theme.text', origin: 'author' },
  { cssVar: '--rm-muted', group: 'Accent color', label: 'Muted text', path: 'theme.muted', origin: 'author' },
  { cssVar: '--rm-primary', group: 'Accent color', label: 'Primary', path: 'theme.primary', origin: 'author' },
  { cssVar: '--rm-bg', group: 'Accent color', label: 'Background', path: 'theme.background', origin: 'author' },
  { cssVar: '--rm-sidebar-bg', group: 'Accent color', label: 'Sidebar', path: 'theme.sidebar', origin: 'author' },
  {
    cssVar: '--rm-sidebar-text',
    group: 'Accent color',
    label: 'Sidebar text',
    path: 'theme.sidebarText',
    origin: 'author',
  },
  { cssVar: '--rm-footer-bg', group: 'Accent color', label: 'Footer strip', path: 'theme.footer', origin: 'author' },
  {
    cssVar: '--rm-gradient-to',
    group: 'Header',
    label: 'Header fade end',
    path: 'theme.gradientTo',
    origin: 'author',
  },
  ...ELEMENT_COLORS.map(({ key, cssVar }) => ({
    cssVar,
    group: 'Element colors',
    label: ELEMENT_LABELS[key] ?? key,
    path: `theme.${key}`,
    origin: 'author' as const,
  })),
]

/**
 * The colours the PRODUCT derives, so that they read.
 *
 * An accent is chosen to be a colour, not a word, so an accent set as text is
 * derived into an ink (elementColors.ts darkenToContrast) - once for the
 * page, and again for every other ground a word can land on: a chip, a band,
 * a card, the gutter rail, the strip at the foot. None of these should ever
 * appear in a finding. One that does is a bug in the derivation, and the
 * finding says which derivation.
 */
const DERIVED_VARS: VarSetting[] = [
  ['--rm-primary-ink', 'the accent as ink on the page'],
  ['--rm-primary-ink-on-chip', 'the accent as ink on a chip'],
  ['--rm-primary-ink-on-band', 'the accent as ink on the sidebar band'],
  ['--rm-primary-ink-on-folio', 'the accent as ink on a folio chip'],
  ['--rm-primary-ink-on-band-folio', 'the accent as ink on a folio chip in the band'],
  ['--rm-primary-ink-on-card', 'the accent as ink on a card'],
  ['--rm-primary-ink-on-chip-card', 'the accent as ink on a chip on a card'],
  ['--rm-primary-ink-on-gutter', 'the accent as ink on the gutter rail'],
  ['--rm-primary-ink-on-band-card', 'the accent as ink on a card in the band'],
  ['--rm-primary-ink-on-footer', 'the accent as ink on the footer strip'],
  ['--rm-muted-on-card', 'the muted ink on a card'],
  ['--rm-muted-on-gutter', 'the muted ink on the gutter rail'],
  ['--rm-muted-on-footer', 'the muted ink on the footer strip'],
  ['--rm-heading-ink-on-footer', 'the section-title ink on the footer strip'],
  ['--rm-sidebar-text-on-card', "the band's ink on a card"],
  ['--rm-on-primary', "the header's ink on the accent"],
  ['--rm-on-step-2', "the stepped header's ink on its second tread"],
  ['--rm-on-step-3', "the stepped header's ink on its third tread"],
  ['--rm-on-footer', "the footer strip's own ink"],
  // The inks a coloured header derives for its own ground (Artboard.tsx):
  // the header's ink, and an element colour somebody set, each carried the
  // smallest distance that makes it read there. Untracked, a name on a band
  // matched nothing and was reported as a guess at "Name".
  ['--rm-on-header', "the header's ink on its own ground"],
  ['--rm-name-on-header', 'the name colour carried onto the header'],
  ['--rm-headline-on-header', 'the headline colour carried onto the header'],
  ['--rm-contact-on-header', 'the contacts colour carried onto the header'],
  ['--rm-headline-on-step-2', "the headline colour on the stepped header's second tread"],
  ['--rm-contact-on-step-3', "the contacts colour on the stepped header's third tread"],
  ['--rm-gradient-to-ink', 'the fade end as ink on the page'],
  ['--rm-gradient-to-ink-on-card', 'the fade end as ink on a card'],
  ['--rm-gradient-to-ink-on-band', 'the fade end as ink on the sidebar band'],
  ['--rm-primary-ink-on-band-chip', 'the accent as ink on a chip in the band'],
  ['--rm-muted-soft', 'the quiet line stepped back toward the page'],
  ['--rm-muted-soft-on-card', 'the quiet line stepped back toward a card'],
].map(([cssVar, label]) => ({ cssVar, group: 'Derived', label, origin: 'derived' as const }))

export const ALL_VARS: VarSetting[] = [...AUTHOR_VARS, ...DERIVED_VARS]

/** The custom properties the snapshot reads off the artboard root. A colour
 *  that matches none of them is still measured; it just cannot be traced to
 *  a control, and the finding names the element's role instead. */
export const TRACKED_VARS: string[] = ALL_VARS.map((v) => v.cssVar)

/** The vars that are GROUNDS rather than inks, for naming what a word
 *  stands on. */
const GROUND_VARS = new Set(['--rm-bg', '--rm-sidebar-bg', '--rm-footer-bg', '--rm-primary', '--rm-gradient-to'])

/** What this run of words IS, which decides which settings could have
 *  painted it. Read innermost-first off the class chain. */
export type InkRole =
  | 'name'
  | 'headline'
  | 'headings'
  | 'contacts'
  | 'links'
  | 'muted'
  | 'marker'
  | 'decorative'
  | 'body'

const ROLE_CLASSES: [string, InkRole][] = [
  ['rm-name', 'name'],
  ['rm-headline', 'headline'],
  ['rm-section-title', 'headings'],
  ['rm-contact', 'contacts'],
  ['rm-contacts', 'contacts'],
  ['rm-tag-link', 'links'],
  ['rm-item-link', 'links'],
  ['rm-verify-link', 'links'],
  ['rm-item-date', 'muted'],
  ['rm-item-sub', 'muted'],
  ['rm-mini-sub', 'muted'],
  ['rm-item-loc', 'muted'],
  ['rm-meta-cell', 'muted'],
  ['rm-skill-inline', 'muted'],
]

export function roleOf(chain: ChainStep[], kind: ProbeKind): InkRole {
  if (kind === 'marker') return 'marker'
  if (kind === 'decorative') return 'decorative'
  for (let i = chain.length - 1; i >= 0; i--) {
    const step = chain[i]
    if (step.tag === 'a') return 'links'
    for (const [cls, role] of ROLE_CLASSES) if (step.classes.includes(cls)) return role
  }
  return 'body'
}

/** Which settings a role is most likely to have come from, best first. A
 *  colour that matches none of them still names whatever it does match -
 *  the order only breaks ties. */
const ROLE_PREFERENCE: Record<InkRole, string[]> = {
  name: ['--rm-name-color', '--rm-on-primary', '--rm-text', '--rm-sidebar-text'],
  headline: ['--rm-headline-color', '--rm-on-primary', '--rm-primary-ink', '--rm-muted', '--rm-text'],
  headings: [
    '--rm-heading-color',
    '--rm-heading-ink-on-footer',
    '--rm-primary-ink-on-band',
    '--rm-primary-ink-on-card',
    '--rm-primary-ink',
    '--rm-on-primary',
    '--rm-sidebar-text',
    '--rm-text',
  ],
  contacts: ['--rm-contact-color', '--rm-on-primary', '--rm-muted', '--rm-sidebar-text', '--rm-text'],
  links: ['--rm-link-color', '--rm-primary-ink', '--rm-text', '--rm-sidebar-text', '--rm-muted'],
  muted: ['--rm-muted', '--rm-muted-on-card', '--rm-muted-on-gutter', '--rm-muted-on-footer', '--rm-text'],
  marker: ['--rm-text', '--rm-muted', '--rm-sidebar-text', '--rm-primary-ink', '--rm-on-footer'],
  decorative: ['--rm-primary-ink', '--rm-primary-ink-on-gutter', '--rm-muted', '--rm-text', '--rm-sidebar-text'],
  body: ['--rm-text', '--rm-sidebar-text', '--rm-on-footer', '--rm-muted', '--rm-on-primary'],
}

/** The setting a role falls back to when no custom property matches: the
 *  words still have to be named as something a person can find. */
const ROLE_FALLBACK: Record<InkRole, SettingRef> = {
  name: { group: 'Element colors', label: 'Name', path: 'theme.name' },
  headline: { group: 'Element colors', label: 'Headline', path: 'theme.headline' },
  headings: { group: 'Element colors', label: 'Section titles', path: 'theme.headings' },
  contacts: { group: 'Element colors', label: 'Contacts', path: 'theme.contacts' },
  links: { group: 'Element colors', label: 'Links', path: 'theme.links' },
  muted: { group: 'Accent color', label: 'Muted text', path: 'theme.muted' },
  marker: { group: 'Bullets', label: 'Bullet marker', path: 'typography.bulletStyle' },
  decorative: { group: 'Layout', label: 'Decorative figures', path: 'layout.sectionNumbers' },
  body: { group: 'Accent color', label: 'Body text', path: 'theme.text' },
}

/** The element colour that overrides a role's ink when somebody sets it. */
const ROLE_OVERRIDE: Partial<Record<InkRole, string>> = Object.fromEntries(
  ELEMENT_COLORS.map(({ key, cssVar }) => [key, cssVar])
)

/**
 * True when a setting is a COLOUR a person can change.
 *
 * The fallback for a bullet names the bullet control and the fallback for a
 * running numeral names the numeral control, because that is where a person
 * goes to find the thing - but neither control holds a colour. A colour
 * offered against one of them is an instruction nobody can carry out, so the
 * checker says instead that this mark's ink comes from the design itself.
 */
export const isColourSetting = (path: string | undefined): boolean => !!path && path.startsWith('theme.')

const normalise = (v: string | undefined | null): string | null => {
  const c = parseColor(v ?? '')
  if (!c) return null
  return `${toHex(c)}|${Math.round(c[3] * 100)}`
}

const refOf = (v: VarSetting): SettingRef => ({ group: v.group, label: v.label, path: v.path, cssVar: v.cssVar })

const byVar = (cssVar: string): VarSetting | undefined => ALL_VARS.find((v) => v.cssVar === cssVar)

export interface InkNaming {
  setting: SettingRef
  origin: FindingOrigin
  alsoMatches?: SettingRef[]
  /** Set when the pair is derived: what the derivation was meant to do. */
  derivation?: string
  /**
   * How the page turned that setting's VALUE into this ink - an alpha, a
   * mix, or neither. A caller solving for a colour to offer has to paint
   * every candidate through this, or it offers a colour that changes nothing.
   */
  paint: PaintPath
  /** True when more than one control could have painted this ink and the
   *  page cannot say which: `alsoMatches` carries the others. A report that
   *  asserts one of them is a report that sends somebody to the wrong row. */
  uncertain?: boolean
}

/**
 * Name the setting that painted this ink, given the colour the page computed
 * for it (before any compositing - a var's own value) and the resolved
 * custom properties of the artboard root.
 *
 * The colour is matched on its CHANNELS and not on its alpha, because the
 * page paints half of these inks through something: `color-mix(X 45%,
 * transparent)` and `rgba(X, .85)` are X, painted weaker. Matching on the
 * alpha too is what named a sidebar's own ink "Muted text" - it matched
 * nothing, and the answer fell through to a guess at what the words ARE.
 * That guess is still made when nothing matches, but it is now MARKED as a
 * guess rather than asserted.
 */
/**
 * Which paper a run of words is set on. Two settings that resolve to one
 * colour are only ever a doubt about the SAME words: a design that ships its
 * body ink and its sidebar ink as one colour still paints each column from
 * its own control, and "Sidebar text" is the lever for words in the sidebar
 * however closely it matches "Body text". Ties were broken by the words' role
 * alone, so a sidebar date was named Body text, offered a Body text colour,
 * and changed nothing when the author applied it.
 */
export type InkRegion = 'main' | 'aside' | 'footer'

export function regionOf(chain: ChainStep[]): InkRegion {
  if (chain.some((s) => s.classes.includes('rm-footer'))) return 'footer'
  if (chain.some((s) => s.classes.includes('rm-col-aside'))) return 'aside'
  return 'main'
}

/** The inks each paper paints with, and so the only ones that can be the
 *  lever for words on it. */
const REGION_INKS: Record<Exclude<InkRegion, 'main'>, string[]> = {
  aside: ['--rm-sidebar-text', '--rm-sidebar-text-on-card'],
  footer: ['--rm-on-footer', '--rm-muted-on-footer', '--rm-heading-ink-on-footer', '--rm-primary-ink-on-footer'],
}
const REGIONAL = new Set(Object.values(REGION_INKS).flat())

/** Can this ink paint words on this paper at all? */
function inRegion(cssVar: string, region: InkRegion): boolean {
  if (!REGIONAL.has(cssVar)) return true
  return region !== 'main' && REGION_INKS[region].includes(cssVar)
}

export function nameInk(
  cssColor: string,
  role: InkRole,
  vars: Record<string, string>,
  region: InkRegion = 'main'
): InkNaming {
  const painted = parseColor(cssColor)
  if (!painted) return { setting: ROLE_FALLBACK[role], origin: 'author', paint: straight(), uncertain: true }

  const value = (v: VarSetting): Rgba | null => parseColor(vars[v.cssVar] ?? '')
  const inks: PaintCandidate[] = ALL_VARS.filter((v) => !GROUND_VARS.has(v.cssVar))
    .map((v) => ({ key: v.cssVar, color: value(v) }))
    .filter((c): c is PaintCandidate => !!c.color)

  // The other half of a mix is another INK, never a ground. Every rule on
  // the artboard that mixes a colour into words mixes it with a second ink
  // (the sub-line that is 72% of the body colour and 28% of the muted one);
  // the rules that mix with the page or with `transparent` arrive as an
  // ALPHA and are resolved above. Allowing a ground in here was worse than
  // useless: every grey lies on the line between the body ink and white, so
  // any grey the artboard could not account for was "explained" as a tint of
  // the body ink - and a suggestion solved through a transform that is not
  // there is as wrong as one solved through no transform at all.
  const matches = matchPaints(painted, inks, inks)
  if (!matches.length) {
    // The RAW accent, painted as words. The accent is chosen to be a colour
    // and not a word, which is why the product derives an ink from it; words
    // wearing the accent itself have gone round that derivation, so this is a
    // defect in the page's own wiring rather than a colour to tell the author
    // about - the same class as a derived ink that came out too pale.
    const primary = parseColor(vars['--rm-primary'] ?? '')
    if (primary && Math.max(...[0, 1, 2].map((i) => Math.abs(primary[i] - painted[i]))) <= 1)
      return {
        setting: { group: 'Accent color', label: 'Primary', path: 'theme.primary', cssVar: '--rm-primary' },
        origin: 'derived',
        derivation: 'the accent painted as words without being derived into an ink',
        paint: { value: primary, amount: 1, alpha: painted[3] },
      }
    // Nothing on the artboard resolves to this colour. For the five element
    // colours that is not yet ignorance: each is an OVERRIDE, painted as
    // `var(--rm-name-color, <the design's own colour>)`, and emitted only
    // when somebody sets it. Unset, the design's own colour answers - and
    // the control, once set, is what paints these words, as it stands. So
    // the control is named with its variable and solved straight, still
    // marked uncertain because the design's rule is not visible from here.
    // Set, and still not what the page painted, the override is plainly not
    // what paints these words, and the role is only a guess.
    const override = ROLE_OVERRIDE[role]
    if (override && !vars[override])
      return {
        setting: { ...ROLE_FALLBACK[role], cssVar: override },
        origin: 'author',
        paint: { value: [painted[0], painted[1], painted[2], 1], amount: 1, alpha: painted[3] },
        uncertain: true,
      }
    // The words still have to be named as something a person can find, so
    // the role answers - but as a guess, which is what `uncertain` says.
    return {
      setting: ROLE_FALLBACK[role],
      origin: 'author',
      paint: { value: [painted[0], painted[1], painted[2], 1], amount: 1, alpha: painted[3] },
      uncertain: true,
    }
  }

  const pref = ROLE_PREFERENCE[role]
  const rank = (m: { key: string; path: PaintPath }) => {
    const v = byVar(m.key)
    const i = pref.indexOf(m.key)
    // A mix names two settings and neither of them alone; the one the mix is
    // mostly made of leads, and a straight match always leads a mix.
    const mixed = m.path.amount < 0.999 ? 100 : 0
    // An ink that belongs to another paper cannot have painted these words,
    // however exactly it matches; one that belongs to THIS paper is the
    // lever before any role preference is asked.
    if (!inRegion(m.key, region)) return 1000 + mixed
    if (region !== 'main' && REGION_INKS[region].includes(m.key)) return mixed - 50
    return mixed + (i < 0 ? pref.length + (v?.origin === 'derived' ? 1 : 0) : i)
  }
  const sorted = matches.slice().sort((a, b) => rank(a) - rank(b))
  const best = sorted[0]
  const bestVar = byVar(best.key) as VarSetting
  const others: VarSetting[] = []
  const seen = new Set<string>([best.key])
  for (const m of sorted.slice(1)) {
    if (seen.has(m.key)) continue
    seen.add(m.key)
    const v = byVar(m.key)
    if (v) others.push(v)
  }
  // The other half of a mix is a setting too, and changing IT is the other
  // way to fix the pair - so it is named, never silently dropped.
  if (best.partnerKey && !seen.has(best.partnerKey)) {
    const v = byVar(best.partnerKey)
    if (v) others.push(v)
  }
  // What is genuinely uncertain is which CONTROL a person should open. Two
  // properties that resolve to the same colour because one is derived from
  // the other are not a doubt - changing the author's colour moves both. Two
  // controls the author owns, or the two halves of a mix, are.
  // An ink from another paper is no rival for these words: it matches the
  // colour, but moving it moves nothing here.
  // Nor, when the words sit on a paper with its own ink and that ink is the
  // match, is a page-wide ink: the column is painted from its own control.
  const ownPaper = region !== 'main' && REGION_INKS[region].includes(best.key)
  const rivals = others.some(
    (v) =>
      v.origin === 'author' &&
      v.path !== bestVar.path &&
      inRegion(v.cssVar ?? '', region) &&
      !(ownPaper && !REGIONAL.has(v.cssVar ?? ''))
  )
  return {
    setting: refOf(bestVar),
    origin: bestVar.origin,
    alsoMatches: others.length ? others.map(refOf) : undefined,
    derivation: bestVar.origin === 'derived' ? bestVar.label : undefined,
    paint: best.path,
    uncertain: rivals || best.path.amount < 0.999 || undefined,
  }
}

/* ------------------------------------------------------------------ */
/* the GROUND: which structural choice put the words on that colour    */
/* ------------------------------------------------------------------ */

const HEADING_STYLE_LABELS: Record<string, string> = {
  underline: 'Underline',
  'rule-after': 'Rule',
  strike: 'On-line',
  bar: 'Bar',
  boxed: 'Filled',
  'lead-rule': 'Lead',
  badge: 'Badge',
  plain: 'Plain',
}

const SKILL_STYLE_LABELS: Record<string, string> = {
  chips: 'Pills',
  tags: 'Tags',
  inline: 'Inline',
  stacked: 'Stacked',
  grid: 'Grid',
  mosaic: 'Mosaic',
  rings: 'Rings',
}

const ENTRY_LAYOUT_LABELS: Record<string, string> = {
  timeline: 'Timeline',
  cards: 'Cards',
  grid: 'Grid',
  divided: 'Divided',
  ledger: 'Ledger',
}

const HEADER_LABELS: Record<string, string> = {
  standard: 'Standard',
  centered: 'Centered',
  split: 'Split',
  banner: 'Banner',
  compact: 'Compact',
  display: 'Display',
  block: 'Block',
  cover: 'Cover',
  card: 'Card',
  stepped: 'Stepped',
  band: 'Band',
}

/** The section key this run of words belongs to, from the `sec-<key>` class
 *  the renderer stamps on a section. The ROOT carries a `sec-<style>` class
 *  of the same shape, so only a real section element is read. */
export function sectionKeyOf(chain: ChainStep[]): string | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    const step = chain[i]
    if (!step.classes.includes('rm-section')) continue
    const hit = step.classes.find(
      (c) =>
        c.startsWith('sec-') &&
        !c.startsWith('sec-ov-') &&
        !c.startsWith('sec-align-') &&
        !c.startsWith('sec-date-') &&
        c !== 'sec-emph-sub'
    )
    if (hit) return hit.slice(4)
  }
  return undefined
}

/**
 * What the words are STANDING on, named as the control that put them there.
 * Read innermost-first: a chip inside the sidebar is a chip, and the sidebar
 * is what the chip stands on, so the nearer answer is the useful one.
 */
export function nameGround(chain: ChainStep[], vars: Record<string, string>, groundColor: string): SettingRef {
  const section = sectionKeyOf(chain)
  const rootClasses = chain[0]?.classes ?? []
  const has = (cls: string) => chain.some((s) => s.classes.includes(cls))
  const near = (pred: (s: ChainStep) => boolean) => {
    for (let i = chain.length - 1; i >= 0; i--) if (pred(chain[i])) return chain[i]
    return undefined
  }

  const ov = (prefix: string) => {
    const step = near((s) => s.classes.some((c) => c.startsWith(prefix)))
    const cls = step?.classes.find((c) => c.startsWith(prefix))
    return cls?.slice(prefix.length)
  }

  if (has('rm-chip')) {
    const style = ov('skl-ov-') ?? rootClasses.find((c) => c.startsWith('skl-'))?.slice(4)
    return {
      group: 'Section',
      label: `Skills style: ${SKILL_STYLE_LABELS[style ?? ''] ?? 'Pills'} (chip)`,
      path: section ? `layout.sectionSettings.${section}.skillsStyle` : 'layout.sectionSettings',
      section,
    }
  }
  if (has('rm-ring') || has('rm-ring-value') || has('rm-ring-label'))
    return {
      group: 'Section',
      label: 'Skills style: Rings',
      path: section ? `layout.sectionSettings.${section}.skillsStyle` : 'layout.sectionSettings',
      section,
    }
  if (has('rm-tag-link')) return { group: 'Links', label: 'Link style: Tag', path: 'links.style' }
  if (has('rm-footer'))
    return { group: 'Layout', label: 'Footer strip', path: 'theme.footer', cssVar: '--rm-footer-bg' }
  if (has('rm-art-band') || has('rm-art-veil') || has('rm-header-art'))
    return { group: 'Header', label: 'Art band behind the header', path: 'theme.artBand' }
  if (has('rm-stats')) return { group: 'Layout', label: 'Numbers band', path: 'layout.stats' }
  if (has('rm-meta-cell') && rootClasses.includes('meta-gutter'))
    return { group: 'Layout', label: 'Meta column: Gutter', path: 'layout.metaColumn' }
  {
    const cards = ov('lay-ov-')
    if (cards && cards !== 'timeline')
      return {
        group: 'Section',
        label: `Entry layout: ${ENTRY_LAYOUT_LABELS[cards] ?? cards}`,
        path: section ? `layout.sectionSettings.${section}.entryLayout` : 'layout.sectionSettings',
        section,
      }
  }
  {
    // A filled heading or a badge paints its own ground; every other
    // treatment leaves the words on the paper.
    const style = ov('sec-ov-') ?? rootClasses.find((c) => c.startsWith('sec-'))?.slice(4)
    if (style === 'boxed' || style === 'badge')
      return {
        group: section ? 'Section' : 'Typography',
        label: `Heading style: ${HEADING_STYLE_LABELS[style]}`,
        path: section ? `layout.sectionSettings.${section}.headingStyle` : 'typography.headingStyle',
        section,
      }
  }
  if (has('rm-step') || has('rm-header-band') || has('rm-header-banner') || has('rm-header-block')) {
    const hdr = rootClasses.find((c) => c.startsWith('hdr-'))?.slice(4)
    return {
      group: 'Header',
      label: `Header style: ${HEADER_LABELS[hdr ?? ''] ?? 'Banner'}`,
      path: 'layout.headerStyle',
    }
  }
  if (has('rm-col-aside'))
    return { group: 'Accent color', label: 'Sidebar', path: 'theme.sidebar', cssVar: '--rm-sidebar-bg' }

  // Nothing structural: the ground is a theme colour, named by matching it.
  const want = normalise(groundColor)
  const hit = ALL_VARS.find((v) => GROUND_VARS.has(v.cssVar) && normalise(vars[v.cssVar]) === want)
  if (hit) return { group: hit.group, label: hit.label, path: hit.path, cssVar: hit.cssVar }
  return { group: 'Accent color', label: 'Background', path: 'theme.background', cssVar: '--rm-bg' }
}
