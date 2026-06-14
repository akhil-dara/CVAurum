/**
 * Template contract.
 *
 * A template is mostly DATA: structural variant flags + a scoped CSS class +
 * the theme/typography/layout defaults it ships with. The shared rendering
 * engine (<Artboard>) reads these flags to lay out the resume, and the scoped
 * CSS file (`.tpl-<id> { ... }`) gives each template its distinct look.
 *
 * This keeps the contribution barrier near-zero: a new template is
 * a config object + a CSS file — no new React code, nothing that can break the
 * type-check or the build.
 */
import type { ComponentType } from 'react'
import type { Metadata } from './metadata'
import type { ResumeDocument } from './document'

export type RenderMode = 'preview' | 'print' | 'thumbnail'

export interface TemplateProps {
  doc: ResumeDocument
  mode: RenderMode
}

export type TemplateTag =
  | 'ats-safe'
  | 'single-column'
  | 'two-column'
  | 'modern'
  | 'classic'
  | 'creative'
  | 'minimal'
  | 'executive'
  | 'technical'
  | 'timeline'
  | 'photo'
  | 'compact'
  | 'elegant'

/** How the name/contact header is laid out. */
export type HeaderVariant =
  | 'standard' // name left, contacts under, optional photo right
  | 'centered' // everything centered
  | 'banner' // colored full-width band behind the header
  | 'split' // name left / contacts right, divider rule
  | 'compact' // single line name + inline contacts

/** Section heading treatment. */
export type SectionStyle =
  | 'underline' // text + bottom rule (default)
  | 'rule-after' // text then a full-width rule trailing
  | 'bar' // left accent bar
  | 'plain' // text only
  | 'boxed' // filled/inverse heading
  | 'side' // heading sits in a left gutter (modern)

/** Skill rendering. */
export type SkillStyle = 'inline' | 'chips' | 'bars' | 'dots' | 'grouped-chips'

export interface TemplateConfig {
  id: string
  name: string
  description: string
  tags: TemplateTag[]
  atsSafe: boolean
  /** scoped CSS root class, e.g. 'tpl-modern' */
  class: string
  header: HeaderVariant
  section: SectionStyle
  skills: SkillStyle
  /** show level meters for languages */
  languageMeter?: boolean
  /** show an icon chip beside each section title (premium look). Defaults on
   *  for modern templates, off for traditional/minimal ones. */
  sectionIcons?: boolean
  /** the metadata this template applies when selected */
  defaults: Pick<Metadata, 'theme' | 'typography' | 'layout'> & { template: string }
  /** optional fully-custom component (rare; overrides the generic Artboard) */
  Component?: ComponentType<TemplateProps>
}

export type TemplateDefaults = TemplateConfig['defaults']

export type { Metadata, ResumeDocument }
