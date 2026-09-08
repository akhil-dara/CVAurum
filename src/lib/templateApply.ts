import { defaultMetadata } from '@/data/defaults'
import { getTemplate } from '@/templates/registry'
import type { Metadata } from '@/types/metadata'
import type { TemplateDefaults } from '@/types/template'

/**
 * Produce new metadata when switching to a template. Adopts the template's look
 * (theme, typography, spacing, header/column model) while preserving the user's
 * content decisions (page format/margin, hidden sections, heading renames) and
 * intelligently re-routing sections between main/aside when the column count
 * changes — so picking a two-column template actually populates the sidebar, and
 * picking a single-column one folds the sidebar back into the main flow.
 */
/**
 * Which value survives a template switch for a field that has a real default.
 *
 * `cur` is the document's value, `fallback` the schema's default, `next` the
 * incoming template's. A document still sitting on the default never made a
 * choice, so the template's value wins; anything else is the author's and
 * stays. (Fields that are OPTIONAL - the header composition, say - need none
 * of this: undefined already means "no choice".)
 */
function chosen<T>(cur: T, fallback: T, next: T): T {
  return cur === fallback ? next : cur
}

export function applyTemplateToMetadata(cur: Metadata, defaults: TemplateDefaults): Metadata {
  const targetCols = defaults.layout.columns
  let main = [...cur.layout.main]
  let aside = [...cur.layout.aside]

  if (targetCols === 2) {
    if (aside.length === 0) {
      // Seed columns from the template's defaults...
      const seededMain = defaults.layout.main.length ? [...defaults.layout.main] : [...main]
      const seededAside = [...defaults.layout.aside]
      const present = new Set([...seededMain, ...seededAside])
      // ...but preserve any keys the user already had that the defaults omit
      // (custom-* sections, or standard sections not in the default order).
      for (const k of [...cur.layout.main, ...cur.layout.aside]) {
        if (!present.has(k)) {
          seededMain.push(k)
          present.add(k)
        }
      }
      const asideSet = new Set(seededAside)
      main = seededMain.filter((k) => !asideSet.has(k))
      aside = seededAside
    }
  } else {
    // Single column: fold sidebar back into the main flow.
    main = [...main, ...aside]
    aside = []
  }

  // The footer strip: the author's own once they have moved a section there,
  // else the one the template ships (Marquee seats skills and languages in
  // its strip), the way the art band and the photo light up only where
  // nothing was decided.
  // ...unless the strip is exactly the one the PREVIOUS template shipped:
  // that was the template's, not the author's, and it must not follow the
  // author into a design that has no strip (a two-column template that
  // came after the poster kept the poster's skills strip, and printed the
  // skills twice).
  const prevFooter = (cur.template ? getTemplate(cur.template).defaults.layout.footer : []) ?? []
  const footerIsPrev = cur.layout.footer.join('|') === prevFooter.join('|')
  const footer = cur.layout.footer.length && !footerIsPrev ? cur.layout.footer : defaults.layout.footer

  // Dedupe so no section can ever appear in both columns (guards against drift
  // over a long chain of template switches). A section in the footer strip is
  // the strip's alone, so a re-seeded body never lists it again.
  const seen = new Set<string>(footer)
  const dedupe = (arr: string[]) => arr.filter((k) => (seen.has(k) ? false : (seen.add(k), true)))
  main = dedupe(main)
  aside = dedupe(aside)

  // What the document's previous template gave it, so a value that only
  // came from that template is never mistaken for the author's own choice.
  // An unknown or missing template id reads as the schema defaults.
  const prev = cur.template ? getTemplate(cur.template).defaults.layout : defaultMetadata().layout

  return defaultMetadata({
    template: defaults.template,
    page: cur.page,
    theme: {
      ...cur.theme,
      ...defaults.theme,
      // A colour the author set on one element is theirs across a switch;
      // one the template ships applies only where nothing was decided.
      name: cur.theme.name ?? defaults.theme.name,
      headline: cur.theme.headline ?? defaults.theme.headline,
      headings: cur.theme.headings ?? defaults.theme.headings,
      contacts: cur.theme.contacts ?? defaults.theme.contacts,
      links: cur.theme.links ?? defaults.theme.links,
      // The art band is the author's once chosen; a template that ships one
      // lights it up only where nothing was decided, the way the photo does.
      artBand: cur.theme.artBand !== 'none' ? cur.theme.artBand : defaults.theme.artBand,
    },
    // Adopt the template's typographic identity (fonts, sizes, spacing, case) but
    // keep the user's cross-cutting style choices so a switch never silently
    // resets them.
    typography: {
      ...cur.typography,
      ...defaults.typography,
      bulletStyle: cur.typography.bulletStyle,
      bulletIndent: cur.typography.bulletIndent,
      bulletGap: cur.typography.bulletGap,
      proficiency: cur.typography.proficiency,
      // How the prose is set is the author's call about their own words, not
      // part of a template's identity, so it survives a switch.
      align: cur.typography.align,
      // How far the section titles, the headline and the contacts sit from
      // the body, the heading case and the two weights are the author's too;
      // an undecided case or weight stays undecided.
      sectionTitleScale: cur.typography.sectionTitleScale,
      headlineScale: cur.typography.headlineScale,
      contactScale: cur.typography.contactScale,
      headingCase: cur.typography.headingCase,
      nameWeight: cur.typography.nameWeight,
      headingWeight: cur.typography.headingWeight,
      // The air under a heading and the weight of its rule stay too; an
      // undecided rule width stays undecided.
      headingGap: cur.typography.headingGap,
      headingRuleWidth: cur.typography.headingRuleWidth,
    },
    layout: {
      ...cur.layout,
      columns: targetCols,
      sidebar: defaults.layout.sidebar,
      sidebarWidth: defaults.layout.sidebarWidth,
      icons: defaults.layout.icons,
      // Preserve the user's photo intent across template switches: keep it shown
      // if they enabled it, but let a photo-oriented template light it up by
      // default. Keep their chosen shape/size unless they had no photo before.
      showPhoto: cur.layout.showPhoto || defaults.layout.showPhoto,
      // Monogram is a template-identity choice (initials badge), so adopt it.
      monogram: defaults.layout.monogram,
      // A monogram defines its own badge shape; otherwise keep the user's photo shape.
      photoShape: defaults.layout.monogram ? defaults.layout.photoShape : cur.layout.showPhoto ? cur.layout.photoShape : defaults.layout.photoShape,
      photoSize: cur.layout.showPhoto ? cur.layout.photoSize : defaults.layout.photoSize,
      sectionGap: defaults.layout.sectionGap,
      itemGap: defaults.layout.itemGap,
      main,
      aside,
      // preserve user choices (sectionSettings - every per-section choice,
      // the entry order and emphasis included - rides the spread above):
      hidden: cur.layout.hidden,
      // Structural choices the author MADE stay when the template changes,
      // like the column split and the header composition do. Every one of
      // these fields has a real default rather than being optional, so the
      // document cannot say "no choice" with undefined - and a value that
      // merely came from the PREVIOUS template is not the author's either.
      // Comparing against the schema default let a gutter template leave
      // its gutter off ('none' won); comparing against it and nothing else
      // then let that gutter follow the author into the next template,
      // whose whole idea was a margin. So the comparison is against what
      // the previous template gave the document: unchanged means the
      // author never chose, and the new template applies.
      metaColumn: chosen(cur.layout.metaColumn, prev.metaColumn, defaults.layout.metaColumn),
      headingPlacement: chosen(cur.layout.headingPlacement, prev.headingPlacement, defaults.layout.headingPlacement),
      sectionFrame: chosen(cur.layout.sectionFrame, prev.sectionFrame, defaults.layout.sectionFrame),
      footer,
      // The two switches follow the same rule: what the previous template
      // turned on is the previous template's, not the author's.
      stats: chosen(cur.layout.stats, prev.stats, defaults.layout.stats),
      sectionNumbers: chosen(cur.layout.sectionNumbers, prev.sectionNumbers, defaults.layout.sectionNumbers),
      sectionSettings: seedSectionSettings(defaults.layout.sectionSettings, cur.layout.sectionSettings),
      headings: cur.layout.headings,
    },
    // Link settings are the author's, not the template's: display, the
    // clickable switch, underlining and the tag style all used to reset on
    // every switch because the rebuild had no slot for them.
    links: cur.links,
    // So is how dates read: the month style, the separator, the present
    // word and the language belong to the document, not to its look.
    dates: cur.dates,
  })
}

type SectionSettings = NonNullable<Metadata['layout']['sectionSettings']>

/**
 * The per-section styles a template ships (Atlas draws its skills as rings),
 * under the author's own: a setting the author chose for a section stays,
 * one they left open takes the template's. A template that ships none
 * leaves the author's untouched.
 */
function seedSectionSettings(tpl: SectionSettings | undefined, cur: SectionSettings | undefined): SectionSettings | undefined {
  if (!tpl || Object.keys(tpl).length === 0) return cur
  const out: SectionSettings = { ...(cur ?? {}) }
  for (const [key, bag] of Object.entries(tpl)) out[key] = { ...bag, ...(out[key] ?? {}) }
  return out
}
