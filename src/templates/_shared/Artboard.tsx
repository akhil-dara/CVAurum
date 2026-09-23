/**
 * The shared rendering engine. Turns (document + template config) into the
 * resume DOM. All visual parameters become CSS variables on .rm-root so the
 * exact same tree renders on screen and in the printed PDF.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ResumeDocument } from '@/types/document'
import { contactLabel, contactLines, contactsInSidebar, type ContactLine } from './contacts'
import type { RenderMode, TemplateConfig } from '@/types/template'
import { fontStack, ensureFont } from '@/data/fonts'
import { MM_TO_PX, PAGE_DIMENSIONS } from '@/types/metadata'
import { metaColumnOn, resolveOrder, sectionLabel } from '@/lib/sections'
import { safeHref } from '@/lib/utils'
import { headingCaseClasses, headingVars, typeScaleVars } from '@/lib/typeStyle'
import {
  darkenToContrast,
  darkenToContrastAll,
  elementColorVars,
  lighten,
  mix,
  contrastOn,
  contrastRatio,
  gradientGrounds,
  readableOn,
  readableOnAll,
  veilAlpha,
  withAlpha,
} from '@/lib/elementColors'
import { resolveStatTiles } from '@/lib/stats'
import type { FitVector } from '@/lib/fitOnePage'
import { fitLineHeight } from '@/lib/fitOnePage'

const FIT_AS_SET: FitVector = { type: 1, space: 1 }
import { applyKeywordFit, fitHeadingWords, refitWhenFontsReady } from '@/lib/pdf/keywordFit'
import { SectionBody } from './sections'
import { CONTACT_ICON_CHOICES, ContactIcons, contactIcon, prettyUrl, cleanEmail, Deco } from './atoms'
import { Ed, type EditFn, type MetaEditFn } from './Editable'
import { LinkButton } from './LinkButton'
import { SectionGear } from './SectionGear'
import { HeaderGear } from './HeaderGear'
import { ART_BAND_GROUNDS, ART_STRIP_TEMPLATES, HEADER_GROUNDS, STEP_GROUNDS, artBandSrc } from './headerStyles'
import { keepEntriesOn, sectionOverrideClasses } from './sectionClasses'
import { sectionNumeral } from './sectionNumeral'
import { useEditorStore } from '@/store/useEditorStore'
import { usePhotoPicker } from '@/components/editor/usePhotoPicker'
import { iconForKind } from '@/components/icons/sectionIcons'
import { FolioIcon, type FolioIconKind } from './folioIcons'
import { sectionIconKind } from './sectionIconChoice'

/** Traditional templates render headings without icon chips. */
const NO_SECTION_ICONS = new Set(['classic', 'ivy', 'academic', 'elegant', 'minimal', 'executive', 'sienna'])

function SectionIcon({ kind, style }: { kind: FolioIconKind; style: string }) {
  if (style === 'folio') {
    // The folio chip: a solid glyph (sibling svgs, one fill each - the PDF
    // painter reads one fill per <svg> root) and two fold triangles, a light
    // outer wedge with a darker inner one, which read as a folded page
    // corner. Each fold is its own svg for the same one-fill reason. Custom
    // and unknown sections take the set's fallback glyph.
    return (
      <span className="rm-section-icon" aria-hidden>
        <FolioIcon kind={kind} />
        <svg className="rm-folio-fold rm-folio-fold-lt" viewBox="0 0 8 8" aria-hidden focusable="false">
          <polygon points="0,0 8,0 8,8" />
        </svg>
        <svg className="rm-folio-fold rm-folio-fold-dk" viewBox="0 0 8 8" aria-hidden focusable="false">
          <polygon points="8,0 8,8 3.2,8" />
        </svg>
      </span>
    )
  }
  const Icon = iconForKind(kind)
  return (
    <span className="rm-section-icon" aria-hidden>
      <Icon />
    </span>
  )
}

/** Root classes shared by the artboard and the section-gallery preview, so a
 *  preview shows the badge style, badge size and link style the page has. */
function iconAndLinkClasses(doc: ResumeDocument): string[] {
  const { layout, links } = doc.metadata
  const size = layout.sectionIconSize ?? 'm'
  return [
    `sicon-${layout.sectionIconStyle ?? 'folio'}`,
    size === 's' ? 'sicon-size-s' : size === 'l' ? 'sicon-size-l' : '',
    // Underlining links is off by default - a resume full of underlines reads
    // badly - but a reader cannot otherwise SEE which text is clickable.
    links?.underline ? 'links-underline' : '',
    // Named links (a project's Portfolio, a credential's Verify) as small tags.
    (links?.style ?? 'tag') === 'tag' ? 'links-tag' : '',
  ]
}

const PT_TO_PX = 96 / 72
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** CSS `list-style-type` values per bullet style (string markers need quoting). */
/**
 * Every bullet style is a STRING marker — a real character the browser draws
 * from a real font.
 *
 * disc/circle/square used to be the UA keywords, which Chromium draws as
 * generated SHAPES with no glyph and no text behind them. That cost the export
 * twice over: the painter had to reproduce each shape as a vector, and then
 * hide an invisible "•" underneath it so a copied list still had item
 * boundaries — which is exactly the "text drawn invisibly" an ATS scanner
 * flags. As characters, the same marks are drawn once, from the same outlines,
 * on the canvas and in the file, and an extractor reads what the reader sees.
 *
 * • – › are in every bundled family (measured: 158/158 PDF instances), so
 * those three come from the résumé's own face. ◦ ▪ ✓ ◆ are in none of them and
 * come from the bundled marks family at the end of every stack
 * (src/data/fonts.ts, scripts/make-marks-font.py) — before that, ✓ and ◆ were
 * drawn from whatever font the reader's machine happened to have.
 *
 * The two trailing spaces are the gap between the mark and the text, and are
 * part of the marker string on every style so they all indent alike.
 */
const BULLET_TYPE: Record<string, string> = {
  disc: '"•  "',
  circle: '"◦  "',
  square: '"▪  "',
  dash: '"–  "',
  arrow: '"›  "',
  check: '"✓  "',
  diamond: '"◆  "',
  none: 'none',
}

/* The two tinted grounds the accent is set on as TEXT, restated here from
 * artboard.css so the ink is derived against the ground the page actually
 * paints: a chip's 12% wash of the accent (.rm-chip) and the gold-tinted
 * paper a folio chip and a link tag stand on (--rm-folio-paper). Change one
 * of these and change the other. */
const CHIP_TINT = 0.12
const FOLIO_GOLD = '#c8941f'
const FOLIO_TINT = 0.08
/* Three more grounds, restated from the stylesheets for the same reason.
 * A card is the page's own ink at 4% over the page (templates.css
 * .lay-ov-cards), and inside a sidebar it is white at 9% over the band
 * (.rm-col-aside .lay-ov-cards). The link tag inside a sidebar stands on the
 * band's paper, the band tinted a sixth of the way toward its own ink
 * (artboard.css .links-tag .rm-col-aside .rm-tag-link --rm-folio-paper). */
const CARD_TINT = 0.04
/* The rail the gutter meta-column draws: a 7% wash of the accent over the
 * page (artboard.css .meta-gutter .rm-meta-cell). */
const GUTTER_TINT = 0.07
const CARD_TINT_BAND = 0.09
/* A chip a design draws inside its band in the ACCENT - 10% of the accent
 * over the band, with the accent's own words on it (templates.css
 * .tpl-verdant .rm-col-aside .rm-chip). Restated here so those words are
 * derived against that ground: they were the raw accent, and the tint was
 * chosen so the design's own green reads on it unmoved (4.55:1), which says
 * nothing about an accent chosen in the Design panel - a gold measured 2.08:1
 * there, a sky blue 1.89:1. */
const BAND_ACCENT_CHIP_TINT = 0.1
const BAND_FOLIO_TINT = 0.16
/* A chip inside the band is drawn in two strengths of the band's own ink: a
 * 15% fill and a 30% hairline (artboard.css .rm-col-aside .rm-chip). The fill
 * was measured and chosen; the hairline was not, and a hairline is not a
 * hairline to a contrast measurement - at 200 dpi a glyph's box takes in the
 * line beside it, so a chip whose FILL reads 4.94:1 measured 4.19:1 on the
 * file the moment the widest page margin took the type to 6.7pt.
 *
 * The ink cannot move here: a band's own ink is what every other line in the
 * column is set in, and on a mid-tone band no colour reads on the fill AND on
 * a 30% edge - the best either extreme can do is 3.89:1. So the EDGE moves:
 * the strongest hairline this band can carry, never more than the 30% it
 * always drew and never less than the fill it stands on. Most bands keep the
 * full 30%; the few that cannot lose the rim rather than the words. */
const CHIP_FILL_BAND = 0.15
const CHIP_LINE_BAND_MAX = 0.3
/* The stepped header's three treads: the accent, and the accent lightened by
 * these two (see --rm-step-2 / --rm-step-3 below). Named once so the ink each
 * tread carries is derived against the tread it actually stands on. */
const STEP_2_LIGHTEN = 0.14
const STEP_3_LIGHTEN = 0.28
/* The strength the accent wash over an art band never drops below - the
 * strength it always had, before it was derived. */
const ART_VEIL_ACCENT_FLOOR = 0.55
/* How far a band header's second stop is lightened out of the accent when the
 * author named no colour of their own: the fade the band always had. It is a
 * CEILING now rather than a constant - see --rm-gradient-to. */
const GRADIENT_LIGHTEN = 0.18
/* How far a quiet line may step back toward the paper under it: a design sets
 * its date behind the numeral on its rail this way (templates.css
 * .tpl-chronicle .rm-item-date). A CEILING, like the fade above - the step
 * was chosen at 8% against the plain page, and a card lowers the paper under
 * the same words, where the same 8% measured 4.45:1. See --rm-muted-soft. */
const MUTED_SOFT = 0.08
/* The ink is derived a twentieth of a point above the 4.5:1 the words are
 * held to. Two of the three grounds are the STYLESHEET's mixes recomputed
 * here in whole channels, and the browser's own rounding of the same mix can
 * land a channel away - which is the difference between 4.50 and 4.49 on a
 * chip. The headroom costs nothing anyone can see and never leaves a word one
 * rounding short. */
const INK_RATIO = 4.55
/** Large type (18pt, or 14pt bold) is held to 3:1; the same hair of headroom. */
const LARGE_INK_RATIO = 3.05

/** `headerStyle`: the Design panel's choice when there is one, else the
 *  design's own - the same resolution the header itself makes below. The ink
 *  the header's words take is derived against the ground THAT composition
 *  paints, so the answer has to be the same one. */
function useVars(doc: ResumeDocument, fit: FitVector, headerStyle?: string): CSSProperties {
  const { theme, typography: t, layout, page } = doc.metadata
  const lock = page.fit?.lock ?? {}
  return useMemo(() => {
    /* The grounds a word can land on that are not the page: the strip at the
     * foot, a card, a sidebar card, the two lighter treads of a stepped
     * header, and the paper a link tag takes inside a sidebar. Each is named
     * once here, and every ink below is derived against the one the words
     * actually stand on - which is the whole of what "every template, every
     * section style, every customisation" turned on. */
    const pageBg = theme.background || '#ffffff'
    const bandBg = theme.sidebar || pageBg
    const footerBg = theme.footer || theme.text
    const cardBg = mix(theme.text, pageBg, CARD_TINT)
    const gutterBg = mix(theme.primary, pageBg, GUTTER_TINT)
    const bandCardBg = mix('#ffffff', bandBg, CARD_TINT_BAND)
    /* The stepped header's two lighter treads: the accent graded down, or the
     * two shades a design prints instead (headerStyles.tsx STEP_GROUNDS). Both
     * the shade the renderer writes and the ink derived against it come from
     * the same place, so a printed tread can no longer carry an ink derived
     * against a tread nobody draws. */
    const ownSteps = STEP_GROUNDS[doc.metadata.template ?? '']
    const step2Bg = ownSteps?.step2 ?? lighten(theme.primary, STEP_2_LIGHTEN)
    const step3Bg = ownSteps?.step3 ?? lighten(theme.primary, STEP_3_LIGHTEN)
    const bandFolioBg = mix(theme.sidebarText || theme.text, bandBg, BAND_FOLIO_TINT)
    /* The strongest hairline a sidebar chip can wear and still be a chip with
     * readable words in it - see CHIP_LINE_BAND_MAX. */
    const chipLineBand = (() => {
      const ink = theme.sidebarText || theme.text
      for (let pct = Math.round(CHIP_LINE_BAND_MAX * 100); pct > Math.round(CHIP_FILL_BAND * 100); pct--)
        if (contrastRatio(ink, mix(ink, bandBg, pct / 100)) >= INK_RATIO) return pct / 100
      return CHIP_FILL_BAND
    })()
    /* The band header's second stop, and the one ground on the page that
     * nothing can correct afterwards: the words CROSS it, so unlike every
     * other ground here it cannot be answered with an ink - the ink would
     * have to be two colours at once. What moves instead is the stop.
     *
     * A fade the words can stand on is one where some single colour reads on
     * every step of it. Lightened a flat 18% out of the accent, two designs'
     * bands ended pale enough that white measured 4.13:1 and 4.37:1 at the
     * far end. And a stop the AUTHOR named can be worse still, because the
     * two ends can sit either side of the middle of the range: a bright red
     * accent fading to a design's dark teal runs through mud where the best
     * any ink can do is 3.62:1 - three of 144 accents offered in the Design
     * panel did exactly that on the design that ships a named stop.
     *
     * So the stop is brought back toward the ACCENT - the lightening reduced,
     * or the author's colour mixed back - by the smallest amount that leaves
     * the band carrying an ink. A shorter fade of the same colour is a fade;
     * an ink that cannot read is not a word. A stop that already works is
     * returned untouched, which is all but three of the 144. */
    const bandCarriesInk = (to: string) => {
      const stops = gradientGrounds(theme.primary, to)
      return contrastOn(readableOnAll(stops, theme.text, INK_RATIO), stops) >= INK_RATIO
    }
    const gradientTo = (() => {
      if (theme.gradientTo) {
        if (bandCarriesInk(theme.gradientTo)) return theme.gradientTo
        // Toward the accent a hundredth at a time, from the far end, so as
        // much of the named colour survives as the band can carry.
        for (let pct = 99; pct > 0; pct--) {
          const to = mix(theme.gradientTo, theme.primary, pct / 100)
          if (bandCarriesInk(to)) return to
        }
        return theme.primary
      }
      const lighter = lighten(theme.primary, GRADIENT_LIGHTEN)
      if (bandCarriesInk(lighter)) return lighter
      /* The fade can also run the other way. Where the lightened end is too
       * pale for the band's ink, that ink is white - a dark ink only reads
       * better as the ground pales - and white reads better still as the
       * ground DARKENS. So the same-strength fade toward black keeps the band
       * a band: shortening the pale fade until white read left the defaults'
       * blue banded by 5%, a flat slab to the eye. */
      const darker = mix(theme.primary, '#000000', 1 - GRADIENT_LIGHTEN)
      if (bandCarriesInk(darker)) return darker
      for (let pct = Math.round(GRADIENT_LIGHTEN * 100); pct > 0; pct--) {
        const to = lighten(theme.primary, pct / 100)
        if (bandCarriesInk(to)) return to
      }
      return theme.primary
    })()
    const artGrounds = ART_BAND_GROUNDS[theme.artBand ?? 'none'] ?? []
    /* A composition with a ground of its own hands that ground to the art and
     * washes it in the accent instead (artboard.css .rm-header-art), so under
     * a band of art the header's ground is the WASH and nothing else - not the
     * accent's gradient, not a design's own stops, not the stepped header's
     * three shades. */
    const hs = layout.headerStyle ?? headerStyle
    const onArt = artGrounds.length > 0 && ['block', 'band', 'banner', 'stepped'].includes(hs ?? '')
    /* Every colour the header's own ground can be, so the ink that stands on
     * it is derived against all of it and not against the accent alone:
     *  - a BAND fades from the accent to its second stop (artboard.css
     *    .rm-header-band), and both ends carry the same words;
     *  - two designs paint their BANNER from stops of their own, darkened
     *    from the accent until white reads (headerStyles.tsx HEADER_GROUNDS);
     *  - with an art band under any of them the composition's own ground goes
     *    (artboard.css .rm-header-art) and the ground is the accent WASH, so
     *    the accent alone is right again - and the wash below is what carries
     *    the ink over the picture. */
    const headerGrounds = (): string[] => {
      if (onArt) return ART_STRIP_TEMPLATES.has(doc.metadata.template ?? '') ? [pageBg] : [theme.primary]
      if (hs === 'band') return gradientGrounds(theme.primary, gradientTo)
      const own = hs === 'banner' ? HEADER_GROUNDS[doc.metadata.template ?? ''] : undefined
      if (own) {
        const stops = own.map((g) => mix(theme.primary, g.with, g.amount))
        return stops.length > 1 ? gradientGrounds(stops[0], stops[stops.length - 1]) : stops
      }
      return [theme.primary]
    }
    /* The quiet half of a quiet line: --rm-muted as the ground can carry it,
     * stepped back toward that ground by the most of MUTED_SOFT that still
     * reads on it. The step is DERIVED rather than flat for the same reason
     * the wash over an art band and the hairline on a sidebar chip are: it
     * was measured once, on the plain page, and the ground moves. Most
     * grounds keep the whole 8%. */
    const mutedSoft = (ground: string) => {
      const ink = darkenToContrast(theme.muted, ground, INK_RATIO)
      for (let pct = Math.round(MUTED_SOFT * 100); pct > 0; pct--)
        if (contrastRatio(mix(ink, ground, 1 - pct / 100), ground) >= INK_RATIO)
          return mix(ink, ground, 1 - pct / 100)
      return ink
    }
    const hdrGrounds = headerGrounds()
    /* TWO grounds, and they were one variable.
     *
     * --rm-on-primary is read by everything that stands on the ACCENT ITSELF -
     * a monogram, a boxed section title, a badge - and it was also being read
     * by the four header compositions, whose ground is the accent only when
     * the design does not paint one of its own. On the design that fades its
     * banner from a darkened accent the two answers differ, and the boxed
     * heading took the banner's: white on the raw purple, 4.2:1, on every
     * heading of the page. One name for two grounds is one of them wrong. */
    const onHeader = readableOnAll(hdrGrounds, theme.text, INK_RATIO)
    const onPrimary = readableOn(theme.primary, theme.text, INK_RATIO)
    /* Each tread's own ink - EXCEPT under the art, where the treads have no
     * shade of their own to be derived against: all three stand on the one
     * wash, so all three take the wash's ink. Derived against the lightened
     * treads while the art covered them, the contact line measured 3.77:1 on
     * the accent it was actually standing on. */
    const onStep2 = onArt ? onHeader : readableOn(step2Bg, theme.text, INK_RATIO)
    const onStep3 = onArt ? onHeader : readableOn(step3Bg, theme.text, INK_RATIO)
    /* An element colour, re-derived against the header's own ground.
     *
     * PRECEDENCE, written down because it was the thing nobody had decided: a
     * colour chosen for the PAGE is not a colour chosen for a BAND. The
     * stylesheet used to let theme.name - a design's own, or one picked in
     * the Design panel - through to a coloured header unexamined, and it beat
     * the derived ink outright: a blue that is exactly right on white
     * measured 2.47:1 on a band header, 1.08:1 under an art band, while the
     * headline and the contacts beside it correctly turned white. The choice
     * is not overruled and it is not obeyed blindly; it is carried the
     * smallest distance that makes it read on the ground it has landed on,
     * which is the same contract every other ink in this file keeps.
     *
     * And NOTHING AT ALL for a colour nobody set - the discipline
     * elementColorVars keeps, and for a sharper reason here: these variables
     * are written INLINE on the root, which no stylesheet rule can outrank, so
     * one emitted for an unset colour would beat a template's own override of
     * the tread ink beneath it. Unset, the stylesheet's own chain answers and
     * the words take exactly the ink they always took. */
    const elOn = (v: string | undefined, grounds: string[]) =>
      v ? darkenToContrastAll(v, grounds, INK_RATIO) : undefined
    /* The strength of the accent wash the art carries, derived for the ink the
     * header's own words take - the strength it has always been derived at. */
    const artVeilAccent = veilAlpha(theme.primary, onHeader, artGrounds, ART_VEIL_ACCENT_FLOOR)
    /* And under the art the ground an element colour lands on is that WASH,
     * not the accent: the accent at that strength over each extreme the
     * picture puts under a word. Derived against the accent instead, a name
     * came out a shade the wash could not carry, and deriving the WASH for it
     * instead asked for a fully opaque one - which reads perfectly and leaves
     * nothing of the picture to see. The words move; the art stays. */
    const elGrounds =
      onArt && artGrounds.length ? artGrounds.map((g) => mix(theme.primary, g, artVeilAccent)) : hdrGrounds
    const nameOnHeader = elOn(theme.name, elGrounds)
    const headlineOnHeader = elOn(theme.headline, elGrounds)
    const contactOnHeader = elOn(theme.contacts, elGrounds)
    /* The two lighter treads carry the headline and the contact line, so an
     * element colour set there is derived against the tread and not against
     * the accent above it - and under the art all three treads are the one
     * wash again. */
    const headlineOnStep2 = onArt ? headlineOnHeader : elOn(theme.headline, [step2Bg])
    const contactOnStep3 = onArt ? contactOnHeader : elOn(theme.contacts, [step3Bg])
    // Magic fit: the body follows the TYPE scale, the gaps the SPACING scale;
    // a locked size derives from the body as set, so it stays exactly what
    // the sliders say however far the fit moves (fitOnePage.ts fitToPages).
    const fsBase = t.fontSize * PT_TO_PX
    const fs = fsBase * fit.type
    // An exact scale when the design states one, else the old derivation.
    const nameMul = t.nameScale ?? 1.55 + clamp(t.headingScale, 1, 2.6) * 0.62
    const nameSize = (lock.name ? fsBase : fs) * nameMul
    return {
      '--rm-fs': `${fs.toFixed(2)}px`,
      // Leading rides the SPACING scale, bounded (fitOnePage.ts): the
      // fit's cheapest lever, and the one it used to have to buy by
      // shrinking the type.
      '--rm-lh': String(fitLineHeight(t.lineHeight, fit.space, lock.leading)),
      '--rm-ls': `${t.letterSpacing}em`,
      '--rm-name-size': `${nameSize.toFixed(2)}px`,
      '--rm-section-title-size': `${(fs * t.sectionTitleScale).toFixed(2)}px`,
      '--rm-section-gap': `${(layout.sectionGap * PT_TO_PX * (lock.sectionGap ? 1 : fit.space)).toFixed(2)}px`,
      '--rm-item-gap': `${(layout.itemGap * PT_TO_PX * fit.space).toFixed(2)}px`,
      /* One slider, two rhythms. The item gap is sized so two multi-line
       * ENTRY blocks read as separate; between two ONE-LINE minis (a
       * language, an interest, a credential line) the same gap reads as a
       * hole - the built-in example's languages sat 21pt apart for 10pt of
       * text. Minis take a derived fraction, so tightening or loosening the
       * one slider keeps both rhythms in proportion. */
      '--rm-item-gap-mini': `${Math.max(2, layout.itemGap * 0.55 * PT_TO_PX * fit.space).toFixed(2)}px`,
      '--rm-pad': `${(page.margin * MM_TO_PX).toFixed(2)}px`,
      '--rm-text': theme.text,
      '--rm-muted': theme.muted,
      '--rm-primary': theme.primary,
      // The accent as INK, three grounds deep (elementColors.ts
      // darkenToContrast). An accent is chosen to be a COLOUR - a rule, a
      // band, a chip's ground - and 23 of the designs set that same colour
      // as small text at under 4.5:1. The accent itself never moves; these
      // do, by the smallest hundredth that reads, and only the rules where
      // the accent is TEXT read them. Derived here rather than written into
      // the designs so an accent chosen in the Design panel is corrected
      // exactly as a design's own is.
      '--rm-primary-ink': darkenToContrast(theme.primary, pageBg, INK_RATIO),
      // On a chip the accent is drawn on 12% of itself (artboard.css
      // .rm-chip), which costs about half a point of ratio - so the chip's
      // words are derived against the ground they actually sit on.
      '--rm-primary-ink-on-chip': darkenToContrast(theme.primary, mix(theme.primary, pageBg, CHIP_TINT), INK_RATIO),
      // A sidebar is a second paper, and the page's ink says nothing about
      // it: on a pale band the page ink is a shade too light, and on a dark
      // one it is darkened in exactly the wrong direction. artboard.css
      // hands this to every rule inside .rm-col-aside.
      '--rm-primary-ink-on-band': darkenToContrast(theme.primary, bandBg, INK_RATIO),
      // The folio tag a named link wears stands on the gold-tinted paper
      // (artboard.css --rm-folio-paper), darker than the page by a little
      // and enough to matter at these sizes.
      '--rm-primary-ink-on-folio': darkenToContrast(
        theme.primary,
        mix(FOLIO_GOLD, pageBg, FOLIO_TINT),
        INK_RATIO
      ),
      // The same tag INSIDE a sidebar stands on the band's own paper
      // instead, and took the raw accent there - the one folio ground with
      // no ink of its own. On a mid-tone band it measured 1.01:1.
      '--rm-primary-ink-on-band-folio': darkenToContrast(theme.primary, bandFolioBg, INK_RATIO),
      // An entry drawn as a CARD lays a 4% wash of the page's ink under its
      // words (templates.css .lay-ov-cards), and inside a sidebar a 9% wash
      // of white over the band. Neither ground was known to the inks derived
      // against the plain page, so designs sitting at 4.2-4.5:1 fell through
      // the moment a section was set to cards. The quiet lines move with
      // them: --rm-muted was chosen for paper too.
      '--rm-primary-ink-on-card': darkenToContrast(theme.primary, cardBg, INK_RATIO),
      '--rm-primary-ink-on-chip-card': darkenToContrast(
        theme.primary,
        mix(theme.primary, cardBg, CHIP_TINT),
        INK_RATIO
      ),
      '--rm-muted-on-card': darkenToContrast(theme.muted, cardBg, INK_RATIO),
      // The quiet line's own step back, derived against each ground it can
      // land on rather than measured once against the page.
      '--rm-muted-soft': mutedSoft(pageBg),
      '--rm-muted-soft-on-card': mutedSoft(cardBg),
      // The gutter's rail is a third wash of the accent, and the year standing
      // on it took the raw accent while the label under it took the muted
      // colour chosen for the page.
      '--rm-primary-ink-on-gutter': darkenToContrast(theme.primary, gutterBg, INK_RATIO),
      // The rail's year is display type - at least 3.1 times the body size,
      // so 21pt at the smallest body the fit reaches - and large type is held
      // to 3:1. Derived against 4.5 it walked a design's own orange that
      // already read at 3.71:1 to a darker one for no reader's sake.
      '--rm-primary-ink-on-gutter-large': darkenToContrast(theme.primary, gutterBg, LARGE_INK_RATIO),
      '--rm-muted-on-gutter': darkenToContrast(theme.muted, gutterBg, INK_RATIO),
      '--rm-primary-ink-on-band-card': darkenToContrast(theme.primary, bandCardBg, INK_RATIO),
      '--rm-primary-ink-on-band-chip': darkenToContrast(
        theme.primary,
        mix(theme.primary, bandBg, BAND_ACCENT_CHIP_TINT),
        INK_RATIO
      ),
      '--rm-sidebar-text-on-card': darkenToContrast(theme.sidebarText || theme.text, bandCardBg, INK_RATIO),
      '--rm-chip-line-band': `${Math.round(chipLineBand * 100)}%`,
      // The band header's second gradient stop, and the colour a block or
      // band header sets its text in: the author's own when chosen, else
      // derived from the accent alone (elementColors.ts).
      '--rm-gradient-to': gradientTo,
      // The second stop as INK. It is a GROUND - the far end of a band, the
      // hairline down a heading, the arc of a ring - and one design sets it
      // as small text as well, where it was the one accent-like colour on
      // the page that nothing derived: a teal chosen to close a navy fade
      // measured 3.61:1 as a date. Derived exactly as --rm-primary-ink is,
      // against the page and against a card, so a page or an accent moved in
      // the Design panel carries it.
      '--rm-gradient-to-ink': darkenToContrast(gradientTo, pageBg, INK_RATIO),
      '--rm-gradient-to-ink-on-card': darkenToContrast(gradientTo, cardBg, INK_RATIO),
      '--rm-gradient-to-ink-on-band': darkenToContrast(gradientTo, bandBg, INK_RATIO),
      '--rm-on-primary': onPrimary,
      // The four compositions that paint a ground of their own read this one
      // instead: the accent when that is what they paint, and the design's
      // own stops or the band's fade when it is not.
      '--rm-on-header': onHeader,
      // The stepped header's second and third bands: the accent lightened
      // 14% and 28%, so the three steps grade from the accent down. A
      // template can name its own two shades instead, on the header element
      // itself (templates.css): written here they are inline on the root,
      // which no stylesheet rule can outrank.
      '--rm-step-2': step2Bg,
      '--rm-step-3': step3Bg,
      // A tread is LIGHTER than the accent, and the ink every step carried
      // was derived against the accent itself: on twenty-eight designs the
      // third tread's contact line measured under 4.5:1 - obsidian at 1.51.
      // Each tread now carries the ink derived against its own shade.
      '--rm-on-step-2': onStep2,
      '--rm-on-step-3': onStep3,
      // An element colour on the header's own ground, and only for the
      // colours somebody set. The stylesheet reads THESE inside a coloured
      // header and never --rm-name-color itself, so a colour chosen for the
      // page cannot walk onto a band unexamined.
      ...(nameOnHeader ? { '--rm-name-on-header': nameOnHeader } : {}),
      ...(headlineOnHeader ? { '--rm-headline-on-header': headlineOnHeader } : {}),
      ...(contactOnHeader ? { '--rm-contact-on-header': contactOnHeader } : {}),
      ...(headlineOnStep2 ? { '--rm-headline-on-step-2': headlineOnStep2 } : {}),
      ...(contactOnStep3 ? { '--rm-contact-on-step-3': contactOnStep3 } : {}),
      // The wash a header lays over its art band (theme.artBand): the page's
      // own colour, at the smallest strength that still leaves the text
      // readable over the darkest and lightest ground THIS band puts under a
      // word (elementColors.ts veilAlpha, headerStyles.tsx ART_BAND_GROUNDS).
      // A gradient fade would say it better, but the painter drops any
      // gradient with a translucent stop (paint.ts registerAxialShading),
      // and a wash that the PDF cannot draw is a page the export does not
      // match. A flat translucent fill it draws exactly, at any strength. A
      // composition that has a ground of its own (block, band, banner,
      // stepped) hands that ground to the art and washes it in the accent
      // instead, so its white words still read (artboard.css .rm-header-art).
      '--rm-art-veil': withAlpha(theme.background, veilAlpha(theme.background, theme.text, artGrounds)),
      // The accent wash was a CONSTANT 0.55 while its sibling above was
      // derived, so the one composite ground nothing checked was the one a
      // coloured header hands to the art: obsidian's banner over the navy
      // band measured 1.38:1 and the contact line simply was not there.
      // Same derivation, same floor as the strength it always had, and it
      // holds every ink the header's words actually take - the header's own
      // and each element colour derived against the same accent.
      '--rm-art-veil-accent': withAlpha(theme.primary, artVeilAccent),
      // The footer strip: its ground is the theme's footer colour when one
      // is set (the stylesheet falls back to the text colour), and its text
      // whichever of white and the text colour reads on that ground.
      ...(theme.footer ? { '--rm-footer-bg': theme.footer } : {}),
      '--rm-on-footer': readableOn(footerBg, theme.text, INK_RATIO),
      // The strip is a THIRD paper, and nothing but its own words followed
      // it there: its quiet lines kept --rm-muted and its titles the raw
      // accent, both chosen for the page. On a dark design the strip's
      // ground is a LIGHT colour - it is the page's ink - so the muted line
      // measured 2.24:1 and, on the eight designs whose accent IS their text
      // colour, the title measured 1:1 and the word was simply not there.
      // Both are derived against the strip's own ground, and artboard.css
      // hands them to every rule inside .rm-footer the way .rm-col-aside
      // hands the band's ink to the sidebar.
      '--rm-muted-on-footer': darkenToContrast(theme.muted, footerBg, INK_RATIO),
      '--rm-primary-ink-on-footer': darkenToContrast(theme.primary, footerBg, INK_RATIO),
      // And the heading colour a design names for its PAGE, re-derived
      // against the strip: folio-noir's gold measured 1.75:1 there.
      '--rm-heading-ink-on-footer': darkenToContrast(theme.headings || theme.primary, footerBg, INK_RATIO),
      // The sheet's own height, so a one-page document can seat the strip
      // at its foot (artboard.css .rm-has-footer).
      '--rm-page-h': `${PAGE_DIMENSIONS[page.format === 'Letter' ? 'Letter' : 'A4'].h.toFixed(2)}px`,
      '--rm-bg': theme.background,
      '--rm-sidebar-bg': theme.sidebar,
      '--rm-sidebar-text': theme.sidebarText,
      '--rm-font-body': fontStack(t.fontFamily),
      '--rm-font-heading': fontStack(t.headingFamily || t.fontFamily),
      '--rm-font-name': fontStack(t.nameFamily || t.headingFamily || t.fontFamily),
      '--rm-aside-w': `${(layout.sidebarWidth * 100).toFixed(1)}%`,
      '--rm-photo-size': layout.photoSize === 's' ? '6em' : layout.photoSize === 'l' ? '9.6em' : '7.6em',
      // The glyph itself, as a CSS `content` string. Written as real
      // characters rather than escapes: this value is handed to CSS verbatim.
      '--rm-contact-sep': (
        { none: '""', dot: '"·"', pipe: '"|"', slash: '"/"', dash: '"–"', node: '"•"' } as Record<string, string>
      )[layout.contactSeparator ?? 'none'],
      '--rm-photo-align':
        layout.photoAlign === 'left' ? 'flex-start' : layout.photoAlign === 'right' ? 'flex-end' : 'center',
      '--rm-photo-margin':
        layout.photoAlign === 'left' ? '0 auto 0 0' : layout.photoAlign === 'right' ? '0 0 0 auto' : '0 auto',
      // How the running text is set (typography.align). One variable for the
      // whole document; artboard.css decides which elements are allowed to
      // read it, and none of them is a heading or a sidebar line.
      '--rm-align': t.align === 'justify' ? 'justify' : 'left',
      // Balancing the last line re-optimises where EVERY line of a paragraph
      // breaks, so it moves the height the one-page fitter measures. It rides
      // the same choice as the alignment: a document that never asked to be
      // justified wraps exactly where it always wrapped.
      '--rm-wrap': t.align === 'justify' ? 'pretty' : 'wrap',
      '--rm-bullet-type': BULLET_TYPE[t.bulletStyle] ?? 'disc',
      // Both in em so they ride the base size and the one-page fit with it.
      '--rm-bullet-indent': `${t.bulletIndent}em`,
      '--rm-bullet-gap': `${t.bulletGap}em`,
      // On the MARKER's own font-size, not a painter constant: that is the
      // one number the browser's disc and our painter's disc both read, so
      // the page and the export cannot disagree about it.
      '--rm-bullet-size': `${t.bulletSize}em`,
      // The headline and contact scales, the two weights, and the multiplier
      // a template's own section-title ratio rides on (typeStyle.ts).
      ...typeScaleVars(t),
      // A locked headline or contact line: their sizes are body x multiplier
      // (typeStyle.ts); dividing the multiplier by the type scale undoes the
      // fit for those two lines only, so they stay exactly as set.
      ...(lock.headline && fit.type !== 1 ? { '--rm-headline-mul': String(Number(typeScaleVars(t)['--rm-headline-mul']) / fit.type) } : {}),
      ...(lock.contacts && fit.type !== 1 ? { '--rm-contact-mul': String(Number(typeScaleVars(t)['--rm-contact-mul']) / fit.type) } : {}),
      // The air under a section title and, when chosen, the width of its rule.
      ...headingVars(t),
      // The five element colours, each present only when set, so the
      // stylesheet's fallback chains decide the rest (elementColors.ts).
      ...elementColorVars(theme),
    } as CSSProperties
  }, [
    theme,
    t,
    layout,
    page,
    // Two designs paint their banner from stops of their own, so which design
    // this is decides the ground the header's ink is derived against
    // (headerStyles.tsx HEADER_GROUNDS).
    doc.metadata.template,
    headerStyle,
    fit.type,
    fit.space,
    lock.name,
    lock.headline,
    lock.contacts,
    lock.sectionGap,
  ])
}

interface ContactEntry {
  icon: ReactNode
  text: string
  href?: string
  kind: ContactLine['kind']
  label: string
}

/** The shared list, wearing icons. Which rows there are, in which order and
 *  what words they carry is contacts.ts's answer - the ATS text reads the same
 *  list, and the two drifted for as long as each built its own. */
function buildContacts(doc: ResumeDocument): ContactEntry[] {
  const { Mail, Phone, Globe, MapPin } = ContactIcons
  return contactLines(doc).map((c) => {
    const Icon =
      c.kind === 'email'
        ? Mail
        : c.kind === 'phone'
          ? Phone
          : c.kind === 'location'
            ? MapPin
            : c.kind === 'url'
              ? c.icon
                ? contactIcon(undefined, c.icon)
                : Globe
              : contactIcon(c.network, c.icon)
    // aria-hidden: the icon REPEATS the words beside it - the envelope sits
    // immediately before the address it marks - so a reader that speaks the
    // page would say each row twice, and a PDF/UA checker asks every graphic
    // to be either described or marked decorative. The portrait is the one
    // graphic on the artboard that carries meaning, and it keeps its alt.
    return { icon: <Icon aria-hidden="true" />, text: c.text, href: c.href, kind: c.kind, label: contactLabel(c) }
  })
}

/**
 * Which icon a contact wears.
 *
 * The icon used to be guessed from the network NAME and nothing else, so a
 * network the map had not heard of got a generic chain link that could not be
 * changed. This offers the choice where the link itself is edited.
 */
function IconPicker({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  return (
    <div className="mb-1.5">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Icon</span>
      <div className="grid grid-cols-8 gap-1">
        {CONTACT_ICON_CHOICES.map((o) => {
          const on = (value ?? '') === o.v
          return (
            <button
              key={o.v || 'auto'}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              title={o.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(o.v)}
              className={`flex h-7 items-center justify-center rounded-md border transition ${
                on
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <o.Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The classes that carry the author's contact-line choices. */
function contactsClass(doc: ResumeDocument, inSidebar = false): string {
  const { contactStyle, contactSeparator, contactLinks } = doc.metadata.layout
  // In the sidebar the details are always one per row: a strip or a run of
  // pills has no width to stand in there.
  const style = inSidebar ? 'stacked' : (contactStyle ?? 'inline')
  const full = doc.metadata.links?.display === 'full'
  const lined = style === 'inline'
  // How many cells a strip row holds. Three where the header has the page's
  // width; two where it shares the page with a sidebar (three cells there
  // are narrower than an email address), or where whole links asked for two.
  const stripCols = (full && contactLinks === 'columns') || doc.metadata.layout.columns === 2 ? 2 : 3
  return [
    'rm-contacts',
    style === 'stacked' ? 'rm-contacts-stacked' : '',
    style === 'strip' ? `rm-contacts-strip rm-strip-${stripCols}${full ? ` rm-links-${contactLinks ?? 'ledger'}` : ''}` : '',
    style === 'pills' ? 'rm-contacts-pills' : '',
    lined && contactSeparator && contactSeparator !== 'none' ? 'rm-contacts-sep' : '',
    lined && contactSeparator === 'node' ? 'rm-contacts-node' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Does the contact line wear labels over its details? */
const isStrip = (cls: string) => cls.includes('rm-contacts-strip')

/**
 * A whole address, as the reader sees it: the protocol stepped back so the
 * part that differs carries the weight, and - where the strip wraps a long
 * address - each segment a box of its own so a line breaks at a slash and
 * never inside a word. The characters, and so the text layer, are exactly
 * the address.
 */
function AddressText({ text, wrap }: { text: string; wrap: boolean }) {
  const m = /^(https?:\/\/(?:www\.)?)(.+)$/i.exec(text)
  if (!m) return <>{text}</>
  const rest = wrap
    ? m[2].split(/(?<=\/)/).map((seg, i) => (
        <span className="rm-contact-seg" key={i}>
          {seg}
        </span>
      ))
    : m[2]
  return (
    <>
      <span className="rm-contact-proto">{m[1]}</span>
      {rest}
    </>
  )
}

function Contacts({ entries, icons, cls }: { entries: ContactEntry[]; icons: boolean; cls: string }) {
  if (!entries.length) return null
  const strip = isStrip(cls)
  const wrap = cls.includes('rm-links-wrap')
  // How many there are, for a header that lays them out by count (the band
  // stands a few in one column and splits more into columns).
  return (
    <div className={cls} data-contacts={entries.length}>
      {entries.map((e, i) => {
        const link = e.kind === 'url' || e.kind === 'profile'
        const value = link ? <AddressText text={e.text} wrap={wrap} /> : e.text
        return (
          <span className={`rm-contact${link ? ' rm-contact-link' : ''}`} key={i}>
            {strip ? <Deco className="rm-contact-label">{e.label}</Deco> : icons ? e.icon : null}
            {e.href ? <a href={e.href}>{value}</a> : <span>{value}</span>}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Edit-mode contacts: email / phone / location / website are editable right on
 * the canvas (empty ones show placeholders so they're discoverable). Profiles
 * (LinkedIn, GitHub…) stay as links — they're URL-backed, managed in the panel.
 */
function EditableContacts({
  doc,
  edit,
  icons,
  inSidebar = false,
}: {
  doc: ResumeDocument
  edit: EditFn
  icons: boolean
  inSidebar?: boolean
}) {
  const cls = contactsClass(doc, inSidebar)
  const strip = isStrip(cls)
  const b = doc.content.basics
  const { Mail, Phone, Globe, MapPin } = ContactIcons
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  // `after` is where the link popup goes: the row's text is what the reader
  // sees, and the chain button beside it owns the address.
  // 'auto' marks rows whose link nobody AUTHORED - email and phone become
  // mailto:/tel: on their own. They join the underline parity (print
  // underlines them when underlining is on) but not the dotted link X-ray,
  // which marks the words an author attached an address to.
  const field = (
    icon: ReactNode,
    el: ReactNode,
    key: string,
    after?: ReactNode,
    linked?: boolean | 'auto',
    label?: string,
    link?: boolean
  ) => (
    <span
      className={`rm-contact${link ? ' rm-contact-link' : ''}${linked ? ' rm-contact-linked' : ''}${linked === 'auto' ? ' rm-contact-auto' : ''}`}
      key={key}
    >
      {strip ? <Deco className="rm-contact-label">{label ?? ''}</Deco> : icons ? icon : null}
      {el}
      {after}
    </span>
  )
  return (
    <div className={cls} data-contacts={4 + (b.profiles?.length ?? 0)}>
      {field(
        <Mail aria-hidden="true" />,
        <Ed
          edit={edit}
          value={cleanEmail(b.email)}
          apply={(c, v) => {
            c.basics.email = v.trim()
          }}
          placeholder="email@example.com"
        />,
        'em',
        undefined,
        // These flags mirror buildContacts exactly: the rows that print as
        // anchors are the rows the underline switch must reach on the canvas.
        cleanEmail(b.email) ? 'auto' : undefined,
        'Email'
      )}
      {field(
        <Phone aria-hidden="true" />,
        <Ed
          edit={edit}
          value={b.phone}
          apply={(c, v) => {
            c.basics.phone = v.trim()
          }}
          placeholder="+1 555 000 0000"
        />,
        'ph',
        undefined,
        b.phone ? 'auto' : undefined,
        'Phone'
      )}
      {field(
        <MapPin aria-hidden="true" />,
        <Ed
          edit={edit}
          value={loc}
          apply={(c, v) => {
            const [city, ...rest] = v.split(',')
            c.basics.location = { ...c.basics.location, city: (city || '').trim(), region: rest.join(',').trim() }
          }}
          placeholder="City, Region"
        />,
        'loc',
        undefined,
        undefined,
        'Location'
      )}
      {/* Typing here sets the LABEL, not the address. It used to write
          straight to basics.url, so giving a link custom text destroyed the
          link - the display and the destination were the same field. */}
      {field(
        b.urlIcon ? (
          (() => {
            const I = contactIcon(undefined, b.urlIcon)
            return <I aria-hidden="true" />
          })()
        ) : (
          <Globe aria-hidden="true" />
        ),
        <Ed
          edit={edit}
          value={b.urlLabel?.trim() || prettyUrl(b.url)}
          apply={(c, v) => {
            const next = v.trim()
            // Still typing an address? Treat it as the address, which is what
            // an empty document expects. Anything else is a label.
            if (!c.basics.url || next === prettyUrl(c.basics.url)) c.basics.url = next
            else c.basics.urlLabel = next
          }}
          placeholder="yoursite.com"
        />,
        'url',
        <LinkButton
          href={b.url}
          label="your website"
          text={b.urlLabel ?? ''}
          clickable={doc.metadata.links?.clickable !== false}
          extra={
            <IconPicker
              value={b.urlIcon}
              onPick={(v) =>
                edit((c) => {
                  c.basics.urlIcon = v
                })
              }
            />
          }
          onRemove={() =>
            edit((c) => {
              c.basics.url = ''
              c.basics.urlLabel = ''
            })
          }
          onText={(v) =>
            edit((c) => {
              c.basics.urlLabel = v
            })
          }
          onChange={(v) =>
            edit((c) => {
              c.basics.url = v.trim()
            })
          }
        />,
        !!b.url,
        'Website',
        true
      )}
      {(b.profiles ?? []).map((p, i) => {
        const Icon = contactIcon(p.network, p.icon)
        const handle = (p.username || '').replace(/^@+/, '')
        const text =
          p.label?.trim() ||
          prettyUrl(p.url) ||
          (p.network ? (handle ? `${p.network} · ${handle}` : p.network) : handle)
        // Editable on the canvas at last - a profile link used to be a plain
        // span, so its text could only be changed by editing the URL in the
        // side panel, which is not the same thing at all.
        // A profile carrying nothing at all is not a contact - it is an empty
        // row of the side panel's list. Rendering one regardless put a blank
        // "Label" slot behind a link icon on the canvas, which read as a third
        // mystery field sitting beside the two real ones.
        // A contact row exists to point somewhere. With no address and no
        // handle it points nowhere, whatever it is NAMED - and naming it was
        // enough to keep it alive: a profile carrying only network:'Portfolio'
        // printed the word "Portfolio" on every render and survived every
        // refresh, with nothing on the page able to remove it (real document,
        // 2026-08-26). The network and the label describe a link; they are not
        // one on their own.
        const blank = !p.url?.trim() && !handle
        return !blank && (text || edit)
          ? field(
              <Icon />,
              <Ed
                edit={edit}
                value={text}
                apply={(c, v) => {
                  ;(c.basics.profiles ??= [])[i].label = v.trim()
                }}
                placeholder="Label"
              />,
              `p${i}`,
              <LinkButton
                href={p.url}
                label={p.network || 'this profile'}
                text={p.label ?? ''}
                clickable={doc.metadata.links?.clickable !== false}
                extra={
                  <IconPicker
                    value={p.icon}
                    onPick={(v) =>
                      edit((c) => {
                        ;(c.basics.profiles ??= [])[i].icon = v
                      })
                    }
                  />
                }
                onRemove={() =>
                  edit((c) => {
                    c.basics.profiles = (c.basics.profiles ?? []).filter((_, j) => j !== i)
                  })
                }
                onText={(v) =>
                  edit((c) => {
                    ;(c.basics.profiles ??= [])[i].label = v
                  })
                }
                onChange={(v) =>
                  edit((c) => {
                    ;(c.basics.profiles ??= [])[i].url = v.trim()
                  })
                }
              />,
              !!p.url?.trim(),
              contactLabel({ kind: 'profile', network: p.network }),
              true
            )
          : null
      })}
    </div>
  )
}

/**
 * The edit-only cluster that hangs off the header's identity mark.
 *
 * The picture itself is the button — a click on it opens the same
 * file → crop → save flow the panel uses — and the labelled chip beside the
 * hide cross is what SAYS so, because a clickable picture with no affordance
 * is a feature nobody finds (reported: "here on the canvas, no option to
 * change the thing or pic"). The chip is also the keyboard route: an <img>
 * with a click handler is reachable by no key, a <button> with a label is.
 *
 * Both controls are `no-print` and absolutely positioned, so the edit tree
 * still measures exactly like the export tree.
 */
function EditableVisual({
  kind,
  children,
  onHide,
}: {
  kind: 'photo' | 'monogram'
  /** The mark itself, given the opener so the picture can carry the click. */
  children: (openPicker: () => void) => ReactNode
  onHide: () => void
}) {
  const picker = usePhotoPicker()
  const add = kind === 'monogram'
  return (
    <span className="rm-visual-wrap">
      {children(picker.open)}
      <button
        type="button"
        className="rm-visual-swap no-print"
        contentEditable={false}
        title={add ? 'Add a photo in place of the monogram' : 'Change this photo'}
        aria-label={add ? 'Add photo' : 'Change photo'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={picker.open}
      >
        {add ? 'Add photo' : 'Change'}
      </button>
      <button
        type="button"
        className="rm-visual-hide no-print"
        contentEditable={false}
        title={
          add
            ? 'Hide monogram (turn back on via the header’s Style button)'
            : 'Hide photo (turn back on via the header’s Style button)'
        }
        aria-label={add ? 'Hide monogram' : 'Hide photo'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onHide}
      >
        ×
      </button>
      {picker.ui}
    </span>
  )
}

function Photo({ doc, editMeta }: { doc: ResumeDocument; editMeta?: MetaEditFn }) {
  const { showPhoto, photoShape } = doc.metadata.layout
  const img = doc.content.basics.image
  if (!showPhoto || !img) return null
  // Only ever render locally-encoded images. A remote http(s) src (e.g. from a
  // crafted import) would fire an external request on render — breaking the
  // zero-external-requests promise — so it's dropped here too.
  if (!/^(data:image\/|blob:)/i.test(img)) return null
  const photo = <img className={`rm-photo ${photoShape}`} src={img} alt={doc.content.basics.name} />
  if (!editMeta) return photo
  return (
    <EditableVisual
      kind="photo"
      onHide={() =>
        editMeta((m) => {
          m.layout.showPhoto = false
        })
      }
    >
      {(open) => (
        <img
          className={`rm-photo ${photoShape}`}
          src={img}
          alt={doc.content.basics.name}
          title="Click to change this photo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={open}
        />
      )}
    </EditableVisual>
  )
}

/** Initials badge (in a colored circle / square / diamond) — the "monogram" look. */
function Monogram({ doc, editMeta }: { doc: ResumeDocument; editMeta?: MetaEditFn }) {
  const { monogram, photoShape } = doc.metadata.layout
  if (!monogram) return null
  const initials =
    (doc.content.basics.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'A'
  const mark = (
    <div className={`rm-monogram ${photoShape}`} aria-hidden>
      <span>{initials}</span>
    </div>
  )
  if (!editMeta) return mark
  return (
    <EditableVisual
      kind="monogram"
      onHide={() =>
        editMeta((m) => {
          m.layout.monogram = false
        })
      }
    >
      {(open) => (
        <div
          className={`rm-monogram ${photoShape}`}
          aria-hidden
          title="Click to add a photo instead"
          onMouseDown={(e) => e.preventDefault()}
          onClick={open}
        >
          <span>{initials}</span>
        </div>
      )}
    </EditableVisual>
  )
}

/** Header visual: the user's PHOTO always wins; the monogram is the fallback
 *  identity mark when no photo is shown (so the two can never conflict). */
function HeaderVisual({ doc, editMeta }: { doc: ResumeDocument; editMeta?: MetaEditFn }) {
  const hasPhoto = doc.metadata.layout.showPhoto && !!doc.content.basics.image
  if (hasPhoto) return <Photo doc={doc} editMeta={editMeta} />
  return doc.metadata.layout.monogram ? <Monogram doc={doc} editMeta={editMeta} /> : null
}

/** The stats band: up to four figures derived from the content (stats.ts),
 *  each decorative text - ink for a reader, nothing for a parser. The band
 *  header has a slot for it under the gradient; any other header carries it
 *  at its foot. */
function StatsBand({ doc, edit }: { doc: ResumeDocument; edit?: boolean }) {
  const stats = resolveStatTiles(doc.content, doc.metadata.layout.statTiles)
  if (!stats.length) return null
  return (
    // The tiles are aria-hidden decoration, so they are not editable in
    // place; a click asks the header's Style popover for the Numbers group.
    <div
      className="rm-stats"
      onClick={edit ? () => window.dispatchEvent(new Event('cvaurum:open-header-numbers')) : undefined}
      title={edit ? 'Numbers band — click to edit' : undefined}
    >
      {stats.map((s, i) => (
        // The author names these, so two tiles may share a label or carry
        // none at all; the position in the band is what tells them apart.
        <div className="rm-stat" key={i}>
          <Deco className="rm-stat-value">{s.value}</Deco>
          <Deco className="rm-stat-label">{s.label}</Deco>
        </div>
      ))}
    </div>
  )
}

function Header({
  doc,
  config,
  edit,
  editMeta,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  edit?: EditFn
  editMeta?: MetaEditFn
}) {
  const b = doc.content.basics
  const icons = doc.metadata.layout.icons
  const entries = buildContacts(doc)
  const name = b.name || 'Your Name'
  // The user's header-composition choice (Design panel) wins over the template's.
  const variant = doc.metadata.layout.headerStyle ?? config.header
  // In two-column layouts the sidebar owns the photo/monogram, so the header omits it.
  const twoCol = doc.metadata.layout.columns === 2
  const HeaderPhoto = twoCol ? null : <HeaderVisual doc={doc} editMeta={editMeta} />
  // On-canvas gear to recompose the header (edit mode only).
  const Gear = editMeta ? <HeaderGear doc={doc} editMeta={editMeta} /> : null
  // Contacts placed in the sidebar are drawn there (Artboard's AsideCol),
  // and the header leaves them out.
  const ContactsEl = contactsInSidebar(doc) ? null : edit ? (
    <EditableContacts doc={doc} edit={edit} icons={icons} />
  ) : (
    <Contacts entries={entries} icons={icons} cls={contactsClass(doc)} />
  )

  const nameEl = edit ? (
    <Ed
      edit={edit}
      as="h1"
      className="rm-name"
      value={b.name}
      apply={(c, v) => {
        c.basics.name = v
      }}
      placeholder="Your Name"
    />
  ) : (
    <h1 className="rm-name">{name}</h1>
  )
  const headlineEl = edit ? (
    <Ed
      edit={edit}
      as="div"
      className="rm-headline"
      value={b.label ?? ''}
      apply={(c, v) => {
        c.basics.label = v
      }}
      placeholder="Headline — e.g. Senior Software Engineer"
    />
  ) : b.label ? (
    <div className="rm-headline">{b.label}</div>
  ) : null

  const NameBlock = (
    <div className="rm-header-main">
      {nameEl}
      {headlineEl}
    </div>
  )

  // Art behind the header (theme.artBand): the band itself and the wash that
  // settles it into the page, both hidden from every reader and parser and
  // both the header's FIRST children - the painter has no z-index and paints
  // in document order, so being first is what puts them UNDER the words in
  // the PDF; on the page the stylesheet stacks them the same way.
  const artBand = doc.metadata.theme.artBand ?? 'none'
  const art =
    artBand === 'none' ? null : (
      <>
        <img className="rm-art-band" src={artBandSrc(artBand)} alt="" aria-hidden="true" />
        <div className="rm-art-veil" aria-hidden="true" />
      </>
    )
  /** The header's classes, plus the one that says it carries art. */
  const hcls = (variantClass: string) => `rm-header ${variantClass}${art ? ' rm-header-art' : ''}`

  // The stats band, where the author asked for it: in the band's own slot
  // under the gradient, at the foot of any other header.
  const stats = doc.metadata.layout.stats ? <StatsBand doc={doc} edit={!!editMeta} /> : null
  const withStats = (head: ReactNode) =>
    stats ? (
      <>
        {head}
        {stats}
      </>
    ) : (
      head
    )

  if (variant === 'display') {
    return (
      <header className={hcls('rm-header-display')}>
        {art}
        {Gear}
        {HeaderPhoto}
        <div className="rm-header-main">
          {nameEl}
          {headlineEl}
        </div>
        <div className="rm-dateline">{ContactsEl}</div>
        {stats}
      </header>
    )
  }

  if (variant === 'block') {
    return (
      <header className={hcls('rm-header-block')}>
        {art}
        {Gear}
        <div className="rm-header-main">{nameEl}</div>
        <div className="rm-header-side">
          {headlineEl}
          {ContactsEl}
        </div>
        {HeaderPhoto}
        {stats}
      </header>
    )
  }

  if (variant === 'band') {
    return (
      <>
        <header className={hcls('rm-header-band')}>
          {art}
          {Gear}
          <div className="rm-header-main">
            {nameEl}
            {headlineEl}
          </div>
          {ContactsEl}
          {HeaderPhoto}
        </header>
        {stats}
      </>
    )
  }

  // stepped: three full-width bands in graded shades of the accent, the name
  // in the first, the role in the second, the details in the third. Each is
  // its own line of the page - nothing decorative shares a line with content,
  // so the export reads back exactly as it was written.
  if (variant === 'stepped') {
    return withStats(
      <header className={hcls('rm-header-stepped')}>
        {art}
        {Gear}
        <div className="rm-step rm-step-name">
          {HeaderPhoto}
          {nameEl}
        </div>
        {headlineEl ? <div className="rm-step rm-step-role">{headlineEl}</div> : null}
        <div className="rm-step rm-step-contacts">{ContactsEl}</div>
      </header>
    )
  }

  if (variant === 'centered') {
    return withStats(
      <header className={hcls('rm-header-centered')}>
        {art}
        {Gear}
        <div className="rm-header-main">
          {HeaderPhoto}
          {nameEl}
          {headlineEl}
          {ContactsEl}
        </div>
      </header>
    )
  }

  if (variant === 'banner') {
    return withStats(
      <header className={hcls('rm-header-banner')}>
        {art}
        {Gear}
        <div className="rm-header-main">
          {nameEl}
          {headlineEl}
          {ContactsEl}
        </div>
        {HeaderPhoto}
      </header>
    )
  }

  if (variant === 'split') {
    return withStats(
      <header className={hcls('rm-header-split')}>
        {art}
        {Gear}
        <div className="rm-header-lead">
          {HeaderPhoto}
          {NameBlock}
        </div>
        <div className="rm-header-aside">{ContactsEl}</div>
      </header>
    )
  }

  if (variant === 'compact') {
    return withStats(
      <header className={hcls('rm-header-compact')}>
        {art}
        {Gear}
        {HeaderPhoto}
        <div className="rm-header-main">
          <h1 className="rm-name">
            {edit ? (
              <Ed
                edit={edit}
                value={b.name}
                apply={(c, v) => {
                  c.basics.name = v
                }}
                placeholder="Your Name"
              />
            ) : (
              name
            )}
            {b.label ? <span className="rm-headline-inline"> — {b.label}</span> : null}
          </h1>
          {ContactsEl}
        </div>
      </header>
    )
  }

  // standard
  return withStats(
    <header className={hcls('rm-header-standard')}>
      {art}
      {Gear}
      <div className="rm-header-main">
        {nameEl}
        {headlineEl}
        {ContactsEl}
      </div>
      {HeaderPhoto}
    </header>
  )
}

/**
 * Opens the Design panel at the row that turns the running section numbers
 * on and off (DesignPanel listens for the event). Same shape as the Magic
 * fit chip's opener: the tab and the panel first, the event a beat later, so
 * the panel is mounted and listening by the time it lands.
 */
function openSectionNumbers() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-section-numbers')), 80)
}

function Section({
  sectionKey,
  doc,
  config,
  edit,
  editMeta,
  compact,
  noMeta,
  index,
}: {
  sectionKey: string
  doc: ResumeDocument
  config: TemplateConfig
  edit?: EditFn
  editMeta?: MetaEditFn
  /** The footer strip's row form (sections.tsx SectionBody). */
  compact?: boolean
  /** Outside the body's single flow - the sidebar, a gallery card - so no
   *  meta column opens beside this section. */
  noMeta?: boolean
  /** The section's place among the body's sections, for a running number;
   *  the strip, the sidebar and the gallery card pass none. */
  index?: number
}) {
  // 'none' drops the badge here rather than hiding it in CSS, so it leaves
  // the accessibility tree and the tagged PDF too, not just the page.
  const iconStyle = doc.metadata.layout.sectionIconStyle ?? 'folio'
  const showIcon = iconStyle !== 'none' && (config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id))
  // Per-section style overrides (user picks in the section gear) — scoped classes
  // that beat the template's root-level sec-*/skl-* defaults.
  const ss = doc.metadata.layout.sectionSettings?.[sectionKey]
  // The badge's glyph: the section's own pick, else what its title suggests
  // (custom sections), else the glyph it always had.
  const iconKind = showIcon ? sectionIconKind(sectionKey, sectionLabel(sectionKey, doc), ss?.icon) : 'none'
  // A section whose entries must not be torn across a page break says so on
  // the element itself: the paginator reads the policy off the rendered page
  // (walk.ts), so the export and the preview overlay can never disagree about
  // it, and the browser's own print path avoids the same splits.
  // A section in the footer strip holds its rows whole whatever the document
  // says: the strip is one block of the page.
  const keepEntries = compact || keepEntriesOn(doc.metadata.page, ss)
  const cls = [
    'rm-section',
    // The document's own heading style rides in here as the section's
    // default: sectionOverrideClasses resolves section-over-document, so one
    // choice in Design restyles every heading and a section that decided for
    // itself still wins.
    ...sectionOverrideClasses(ss, doc.metadata.typography, doc.metadata.layout.dateAlign),
    ...(keepEntries ? ['rm-keep-entries'] : []),
    ...(compact ? ['rm-section-compact'] : []),
  ].join(' ')
  // Per-section vars (bullet marker, logo/badge size) cascade from the section
  // element, so overrides scope themselves without any extra CSS.
  const BADGE_SIZE: Record<string, string> = { s: '1.3em', m: '1.65em', l: '2.3em' }
  const BADGE_RADIUS: Record<string, string> = { rounded: '0.28em', circle: '9999px', square: '0px' }
  const secStyle =
    ss?.bulletStyle || ss?.badgeSize || ss?.badgeShape
      ? ({
          ...(ss?.bulletStyle ? { '--rm-bullet-type': BULLET_TYPE[ss.bulletStyle] } : {}),
          ...(ss?.badgeSize ? { '--rm-badge-size': BADGE_SIZE[ss.badgeSize] } : {}),
          ...(ss?.badgeShape ? { '--rm-badge-radius': BADGE_RADIUS[ss.badgeShape] } : {}),
        } as CSSProperties)
      : undefined
  // A running number opens the heading of every section in the body, counted
  // in page order. It is decorative text (the Deco atom): the painter draws
  // it as outlines with no text layer, and Word and the ATS text never see
  // it, so a parser reads the heading's own words alone.
  // What SHAPE it takes - 01, 1, 1. or I - is the document's own choice, and
  // it is asked of the shared formatter rather than spelled here, so the
  // preview tree and the export tree cannot disagree about one document.
  const number =
    doc.metadata.layout.sectionNumbers && index !== undefined
      ? sectionNumeral(index, doc.metadata.layout.sectionNumberStyle)
      : null
  return (
    <section className={cls} style={secStyle} data-section={sectionKey}>
      {editMeta ? <SectionGear sectionKey={sectionKey} doc={doc} editMeta={editMeta} /> : null}
      <h2
        className="rm-section-title"
        // A running numeral is decoration - an aria-hidden outline, not
        // editable text - so a click on one cannot edit it in place. It asks
        // the Design panel for the switch that draws it, the way a stat tile
        // asks the header for its Numbers group. People who dislike the
        // numerals had nothing to click, and on every design but the two
        // that ship them, no switch to find at all (measured: 2 of 58).
        // Delegated from the heading rather than wrapped around the
        // numeral: the edit tree and the export tree have to hold the same
        // elements, and a wrapper would exist in only one of them.
        onClick={
          edit && number
            ? (e) => {
                if ((e.target as HTMLElement).closest('.rm-section-number')) openSectionNumbers()
              }
            : undefined
        }
      >
        {iconKind !== 'none' ? <SectionIcon kind={iconKind} style={iconStyle} /> : null}
        {number ? <Deco className="rm-section-number">{number}</Deco> : null}
        {/* A linked heading points where the author says, and the exporter
            turns any anchor into a clickable region, so it is live in the PDF
            exactly like a linked entry title. */}
        {safeHref(ss?.url) ? (
          <a
            className="rm-title-link"
            href={safeHref(ss?.url)}
            onClick={edit ? (e) => e.preventDefault() : undefined}
          >
            <span className="rm-section-title-text">{sectionLabel(sectionKey, doc)}</span>
          </a>
        ) : (
          <span className="rm-section-title-text">{sectionLabel(sectionKey, doc)}</span>
        )}
        {editMeta ? (
          <LinkButton
            href={ss?.url}
            label={sectionLabel(sectionKey, doc)}
            text={sectionLabel(sectionKey, doc)}
            hint='"Shown as" renames the heading. Leave the address empty to remove the link.'
            clickable={doc.metadata.links?.clickable !== false}
            // The card used to say the heading's words could be edited on the
            // page itself - true for entry titles, false here, where the
            // heading is a plain span. Shown as now renames it for real,
            // through the same record the panel's Rename writes, so the words
            // are edited in the card that talks about them.
            onText={(v) =>
              editMeta((m) => {
                const next = v.trim()
                if (next) (m.layout.headings ??= {})[sectionKey] = next
                else if (m.layout.headings) delete m.layout.headings[sectionKey]
              })
            }
            onChange={(v) =>
              editMeta((m) => {
                const bag = ((m.layout.sectionSettings ??= {})[sectionKey] ??= {}) as Record<string, unknown>
                if (v) bag.url = v
                else delete bag.url
              })
            }
            onRemove={() =>
              editMeta((m) => {
                const bag = ((m.layout.sectionSettings ??= {})[sectionKey] ??= {}) as Record<string, unknown>
                delete bag.url
              })
            }
          />
        ) : null}
      </h2>
      <div className="rm-section-body">
        <SectionBody
          sectionKey={sectionKey}
          doc={doc}
          config={config}
          edit={edit}
          editMeta={editMeta}
          compact={compact}
          noMeta={noMeta}
        />
      </div>
    </section>
  )
}

/**
 * Renders a single section (title + body) in the template's real visual style.
 * Used by the "Add a section" gallery so each card shows how that section will
 * actually look in the chosen template. Icons are forced inline here (the
 * hanging-icon gutter only exists inside a full page), so nothing clips.
 */
export function SectionPreview({
  doc,
  config,
  sectionKey,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  sectionKey: string
}) {
  const vars = useVars(doc, FIT_AS_SET, config.header)
  const t = doc.metadata.typography
  ensureFont(t.fontFamily)
  ensureFont(t.headingFamily)
  ensureFont(t.nameFamily)
  const hasIcons =
    (doc.metadata.layout.sectionIconStyle ?? 'folio') !== 'none' &&
    (config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id))
  const cls = [
    'rm-root',
    'rm-section-preview',
    config.class,
    'rm-single',
    headingCaseClasses(t),
    hasIcons ? 'rm-icons' : '',
    `sec-${config.section}`,
    `skl-${config.skills}`,
    'mode-preview',
    ...iconAndLinkClasses(doc),
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={vars} data-template={config.id}>
      <Section sectionKey={sectionKey} doc={doc} config={config} noMeta />
    </div>
  )
}

export function Artboard({
  doc,
  config,
  mode = 'preview',
  edit,
  editMeta,
  fitScale = 1,
  fit,
  onAddSection,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  mode?: RenderMode
  edit?: EditFn
  editMeta?: MetaEditFn
  /** One scale for type and spacing together (the old fit). */
  fitScale?: number
  /** Magic fit's two scales; wins over fitScale when given. */
  fit?: FitVector
  onAddSection?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const vars = useVars(doc, fit ?? { type: fitScale, space: fitScale }, config.header)
  // In edit mode keep empty (non-hidden) sections so they render on the canvas
  // with their inline "Add item" affordance; print/thumbnail show content only.
  const editing = !!edit
  const { main, aside, footer } = useMemo(() => resolveOrder(doc, { includeEmpty: editing }), [doc, editing])
  const twoCol = doc.metadata.layout.columns === 2 && aside.length > 0
  const t = doc.metadata.typography

  // Inject fonts as soon as the template renders (idempotent).
  ensureFont(t.fontFamily)
  ensureFont(t.headingFamily)
  ensureFont(t.nameFamily)

  const iconStyle = doc.metadata.layout.sectionIconStyle ?? 'folio'
  const hasIcons = iconStyle !== 'none' && (config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id))
  const rootClass = [
    'rm-root',
    config.class,
    twoCol ? '' : 'rm-single',
    headingCaseClasses(doc.metadata.typography),
    hasIcons ? 'rm-icons' : '',
    // The composition the page draws - the author's choice, else the
    // template's - so a template rule for `.hdr-block` restyles a header the
    // author recomposed as much as one the template chose.
    `hdr-${doc.metadata.layout.headerStyle ?? config.header}`,
    `sec-${config.section}`,
    `skl-${config.skills}`,
    `mode-${mode}`,
    `side-${doc.metadata.layout.sidebar}`,
    // Where the contact line sits in the header (the sidebar placement is
    // drawn by the sidebar itself, so it takes no class here).
    !contactsInSidebar(doc) && (doc.metadata.layout.contactPlacement ?? 'below') !== 'below'
      ? `cpos-${doc.metadata.layout.contactPlacement}`
      : '',
    // How a heading set beside its content is drawn.
    doc.metadata.layout.headingPlacement === 'side' ? `shs-${doc.metadata.layout.sideHeadingStyle ?? 'rail'}` : '',
    // Where a language's level sits.
    (doc.metadata.layout.levelPlacement ?? 'end') !== 'end' ? `lvl-${doc.metadata.layout.levelPlacement}` : '',
    // The page seats a footer strip at its foot (artboard.css).
    footer.length ? 'rm-has-footer' : '',
    // An entry's dates can have a column of their own: a gutter of
    // decorative years on the left, or a margin holding the real date on
    // the right. Absent unless asked for, so nothing existing shifts.
    // ...and only while some entry has a date to put there (metaColumnOn).
    metaColumnOn(doc.metadata, doc.content) !== 'none' ? `meta-${metaColumnOn(doc.metadata, doc.content)}` : '',
    // A long name says so, for a header that sets the name beside other
    // things (the band): a name that would take three lines at full size
    // takes one size down instead.
    (doc.content.basics.name || '').trim().length > 22 ? 'rm-long-name' : '',
    // A section can hand its title a column of its own on the left, beside
    // the content instead of above it. Absent unless asked for, so a page
    // that never chose it keeps the headings it has.
    doc.metadata.layout.headingPlacement === 'side' ? 'heads-side' : '',
    ...iconAndLinkClasses(doc),
    // Editing-time signal only: the canvas grays its link marks when the
    // export will not make them clickable, so the state is visible without
    // opening Design. Print styling never reads this class.
    doc.metadata.links?.clickable === false ? 'links-off' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // A sidebar on paper of its own - one the page's own text colour cannot be
  // read on - is a BAND, and in a band a design's page colours stand down
  // (artboard.css .rm-aside-painted). A pale sidebar is the page's paper
  // tinted, where those colours were chosen to read and still do.
  const sideTheme = doc.metadata.theme
  const asidePainted =
    twoCol && contrastRatio(sideTheme.text, sideTheme.sidebar || sideTheme.background || '#ffffff') < 4.5
  const AsideCol = twoCol ? (
    <aside className={asidePainted ? 'rm-col-aside rm-aside-painted' : 'rm-col-aside'}>
      {doc.metadata.layout.showPhoto && doc.content.basics.image ? (
        <Photo doc={doc} editMeta={editMeta} />
      ) : doc.metadata.layout.monogram ? (
        <Monogram doc={doc} editMeta={editMeta} />
      ) : null}
      {contactsInSidebar(doc) ? (
        <div className="rm-aside-contacts">
          {edit ? (
            <EditableContacts doc={doc} edit={edit} icons={doc.metadata.layout.icons} inSidebar />
          ) : (
            <Contacts entries={buildContacts(doc)} icons={doc.metadata.layout.icons} cls={contactsClass(doc, true)} />
          )}
        </div>
      ) : null}
      {aside.map((key) => (
        <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} noMeta />
      ))}
    </aside>
  ) : null

  // The footer strip: the sections the author moved to layout.footer, after
  // the columns in a full-width band, in the compact row form. It is one
  // block to the paginator (rm-keep-whole, walk.ts) and to the browser's own
  // print path (print.css), so it moves whole to a new page rather than
  // tearing, and its rows never split (rm-keep-entries).
  const FooterStrip = footer.length ? (
    <footer className="rm-footer rm-keep-entries rm-keep-whole">
      {footer.map((key) => (
        <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} compact />
      ))}
    </footer>
  ) : null

  // After every render, in BOTH trees this component serves - the on-screen
  // preview and the offscreen one the PDF is painted from - keep each keyword
  // that fits its column from breaking mid-term (keywordFit.ts). Running it
  // here rather than on the export's DOM alone is what keeps the exported
  // wrap identical to the previewed one.
  useLayoutEffect(() => {
    if (!rootRef.current) return
    // Headings first: shrinking one changes the width available to nothing
    // else, but it must be settled before keywords are measured against it.
    fitHeadingWords(rootRef.current)
    applyKeywordFit(rootRef.current)
  })
  // ...and again once the document's own faces have actually loaded. The pass
  // above fires with whatever the browser had at the time, which for a
  // freshly chosen face is the FALLBACK - and nothing re-renders this tree
  // when the real face lands. The offscreen measure portal is rendered once
  // per edit and then left alone, so it kept a heading fitted to the fallback
  // while the exporter, rendering its own tree later, fitted to the real
  // face: two sizes for one heading, and page cuts that disagreed between the
  // preview and the export (see keywordFit.ts).
  const { fontFamily, headingFamily, nameFamily } = doc.metadata.typography
  useEffect(() => {
    if (!rootRef.current) return
    return refitWhenFontsReady(rootRef.current, [fontFamily, headingFamily, nameFamily])
  }, [fontFamily, headingFamily, nameFamily])

  return (
    <div ref={rootRef} className={rootClass} style={vars} data-template={config.id}>
      <div className={`rm-body ${twoCol ? '' : 'rm-single'}`}>
        {twoCol && doc.metadata.layout.sidebar === 'left' ? AsideCol : null}
        <main className="rm-col-main">
          <Header doc={doc} config={config} edit={edit} editMeta={editMeta} />
          {main.map((key, i) => (
            <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} index={i} />
          ))}
          {onAddSection ? (
            <button type="button" className="rm-add-section no-print" onClick={onAddSection} title="Add a section">
              + Add section
            </button>
          ) : null}
        </main>
        {twoCol && doc.metadata.layout.sidebar === 'right' ? AsideCol : null}
      </div>
      {FooterStrip}
    </div>
  )
}
