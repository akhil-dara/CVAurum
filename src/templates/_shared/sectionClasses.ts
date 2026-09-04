import type { Metadata } from '@/types/metadata'

/** One section's own settings (layout.sectionSettings[key]). */
export type SectionSettings = Metadata['layout']['sectionSettings'][string]

/**
 * The per-section style overrides as scoped classes on the section element,
 * where the .rm-root-anchored rules in the stylesheets beat any template's
 * own. A setting the section never made adds no class, so the template's own
 * treatment stands.
 */
export function sectionOverrideClasses(ss: SectionSettings | undefined): string[] {
  if (!ss) return []
  return [
    ss.headingStyle ? `sec-ov-${ss.headingStyle}` : '',
    ss.skillsStyle ? `skl-ov-${ss.skillsStyle}` : '',
    ss.chipSize ? `chip-${ss.chipSize}` : '',
    ss.entryLayout ? `lay-ov-${ss.entryLayout}` : '',
    ss.scoreStyle ? `score-ov-${ss.scoreStyle}` : '',
    ss.headingAlign ? `sec-align-${ss.headingAlign}` : '',
  ].filter(Boolean)
}
