import { defaultMetadata } from '@/data/defaults'
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

  // Dedupe so no section can ever appear in both columns (guards against drift
  // over a long chain of template switches).
  const seen = new Set<string>()
  const dedupe = (arr: string[]) => arr.filter((k) => (seen.has(k) ? false : (seen.add(k), true)))
  main = dedupe(main)
  aside = dedupe(aside)

  return defaultMetadata({
    template: defaults.template,
    page: cur.page,
    theme: { ...cur.theme, ...defaults.theme },
    // Adopt the template's typographic identity (fonts, sizes, spacing, case) but
    // keep the user's cross-cutting style choices so a switch never silently
    // resets them.
    typography: {
      ...cur.typography,
      ...defaults.typography,
      bulletStyle: cur.typography.bulletStyle,
      proficiency: cur.typography.proficiency,
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
      photoShape: cur.layout.showPhoto ? cur.layout.photoShape : defaults.layout.photoShape,
      photoSize: cur.layout.showPhoto ? cur.layout.photoSize : defaults.layout.photoSize,
      sectionGap: defaults.layout.sectionGap,
      itemGap: defaults.layout.itemGap,
      main,
      aside,
      // preserve user choices:
      hidden: cur.layout.hidden,
      headings: cur.layout.headings,
    },
  })
}
