/**
 * Template registry. Each template is pure data (variant flags + theme defaults)
 * plus a scoped CSS block in templates.css. Adding a template = one entry here +
 * a `.tpl-<id>` CSS block. The set spans single- and two-column layouts:
 * Single, Double, DoubleColored, Timeline, Elegant, Minimal, Classic,
 * Contemporary, Condensed, Polished, plus Ivy-League / High-Performer styles.
 */
import type { Metadata } from '@/types/metadata'
import type { TemplateConfig } from '@/types/template'
import { defaultMetadata, DEFAULT_MAIN_ORDER, DEFAULT_TWO_COL_MAIN, DEFAULT_ASIDE_ORDER } from '@/data/defaults'

type Defaults = TemplateConfig['defaults']

const BASE = defaultMetadata()

function defs(
  template: string,
  theme: Partial<Metadata['theme']>,
  typo: Partial<Metadata['typography']>,
  layout: Partial<Metadata['layout']>
): Defaults {
  const twoCol = layout.columns === 2
  return {
    template,
    theme: { ...BASE.theme, ...theme },
    typography: { ...BASE.typography, ...typo },
    layout: {
      ...BASE.layout,
      main: twoCol ? DEFAULT_TWO_COL_MAIN : DEFAULT_MAIN_ORDER,
      aside: twoCol ? DEFAULT_ASIDE_ORDER : [],
      ...layout,
    },
  }
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'modern',
    name: 'Aria',
    description: 'Clean single-column with a confident accent. The safe, sharp default.',
    tags: ['ats-safe', 'single-column', 'modern'],
    atsSafe: true,
    class: 'tpl-modern',
    header: 'standard',
    section: 'underline',
    skills: 'grouped-chips',
    defaults: defs(
      'modern',
      { primary: '#2563eb', text: '#1f2937', muted: '#64748b' },
      { fontFamily: 'Inter', headingFamily: 'Inter', fontSize: 9.6, headingScale: 1.5, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'classic',
    name: 'Oxford',
    description: 'Timeless serif résumé. Conservative, recruiter-friendly, ATS-perfect.',
    tags: ['ats-safe', 'single-column', 'classic'],
    atsSafe: true,
    class: 'tpl-classic',
    header: 'centered',
    section: 'rule-after',
    skills: 'inline',
    defaults: defs(
      'classic',
      { primary: '#1f2937', text: '#1a1a1a', muted: '#52525b' },
      { fontFamily: 'PT Serif', headingFamily: 'PT Serif', fontSize: 9.6, lineHeight: 1.42, headingScale: 1.5, uppercaseHeadings: false },
      { columns: 1, icons: false }
    ),
  },
  {
    id: 'cambridge',
    name: 'Cambridge',
    description: 'RenderCV-grade clean layout: Source Sans, navy accent, ruled headings, right-aligned dates. The academic/engineer favorite.',
    tags: ['ats-safe', 'single-column', 'classic'],
    atsSafe: true,
    class: 'tpl-cambridge',
    header: 'centered',
    section: 'plain',
    skills: 'inline',
    defaults: defs(
      'cambridge',
      { primary: '#0e4c92', text: '#1a1a1a', muted: '#525c6b' },
      { fontFamily: 'Source Sans 3', headingFamily: 'Source Sans 3', nameFamily: 'Source Sans 3', fontSize: 9.8, lineHeight: 1.34, letterSpacing: 0, headingScale: 1.55, uppercaseHeadings: false },
      { columns: 1, icons: false, sectionGap: 10, itemGap: 6 }
    ),
  },
  {
    id: 'minimal',
    name: 'Frost',
    description: 'Maximum whitespace, no chrome. Lets the words carry the page.',
    tags: ['ats-safe', 'single-column', 'minimal'],
    atsSafe: true,
    class: 'tpl-minimal',
    header: 'standard',
    section: 'plain',
    skills: 'inline',
    defaults: defs(
      'minimal',
      { primary: '#0f172a', text: '#27272a', muted: '#71717a' },
      { fontFamily: 'Inter', headingFamily: 'Inter', fontSize: 9.6, lineHeight: 1.5, letterSpacing: 0, headingScale: 1.4, uppercaseHeadings: true },
      { columns: 1, icons: false, sectionGap: 13, itemGap: 6 }
    ),
  },
  {
    id: 'executive',
    name: 'Sterling',
    description: 'Senior, authoritative. Playfair headings over a clean body.',
    tags: ['ats-safe', 'single-column', 'executive', 'elegant'],
    atsSafe: true,
    class: 'tpl-executive',
    header: 'split',
    section: 'underline',
    skills: 'inline',
    defaults: defs(
      'executive',
      { primary: '#1e3a5f', text: '#1a202c', muted: '#5a6678' },
      { fontFamily: 'Lato', headingFamily: 'Playfair Display', nameFamily: 'Playfair Display', fontSize: 9.6, headingScale: 1.6, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'timeline',
    name: 'Vertex',
    description: 'A vertical timeline rail threads your experience into a story.',
    tags: ['single-column', 'modern', 'timeline'],
    atsSafe: true,
    class: 'tpl-timeline',
    header: 'standard',
    section: 'bar',
    skills: 'grouped-chips',
    defaults: defs(
      'timeline',
      { primary: '#0ea5e9', text: '#1e293b', muted: '#64748b' },
      { fontFamily: 'Rubik', headingFamily: 'Rubik', fontSize: 9.6, headingScale: 1.5, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'double',
    name: 'Apex',
    description: 'Dark sidebar for skills & contact, generous main column for impact.',
    tags: ['two-column', 'modern', 'technical'],
    atsSafe: true,
    class: 'tpl-double',
    header: 'standard',
    section: 'underline',
    skills: 'bars',
    languageMeter: true,
    defaults: defs(
      'double',
      { primary: '#0ea5e9', text: '#1f2937', muted: '#64748b', sidebar: '#0f172a', sidebarText: '#e2e8f0' },
      { fontFamily: 'Inter', headingFamily: 'Inter', fontSize: 9.3, headingScale: 1.5, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.33 }
    ),
  },
  {
    id: 'double-colored',
    name: 'Prism',
    description: 'A bold color sidebar. Confident, contemporary, memorable.',
    tags: ['two-column', 'creative', 'modern', 'photo'],
    atsSafe: true,
    class: 'tpl-double-colored',
    header: 'standard',
    section: 'underline',
    skills: 'dots',
    languageMeter: true,
    defaults: defs(
      'double-colored',
      { primary: '#1d4ed8', text: '#1f2937', muted: '#64748b', sidebar: '#1d4ed8', sidebarText: '#eff6ff' },
      { fontFamily: 'Montserrat', headingFamily: 'Montserrat', fontSize: 9.3, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.34, showPhoto: true, photoShape: 'circle' }
    ),
  },
  {
    id: 'aside',
    name: 'Linen',
    description: 'A soft right sidebar keeps the focus on your story, then your skills.',
    tags: ['two-column', 'modern', 'minimal'],
    atsSafe: true,
    class: 'tpl-aside',
    header: 'standard',
    section: 'plain',
    skills: 'chips',
    defaults: defs(
      'aside',
      { primary: '#4f46e5', text: '#27272a', muted: '#71717a', sidebar: '#f4f4f8', sidebarText: '#3f3f56' },
      { fontFamily: 'Work Sans', headingFamily: 'Work Sans', fontSize: 9.6, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'right', sidebarWidth: 0.32 }
    ),
  },
  {
    id: 'compact',
    name: 'Quartz',
    description: 'Dense and efficient. Fits a deep career on a single page.',
    tags: ['ats-safe', 'single-column', 'compact'],
    atsSafe: true,
    class: 'tpl-compact',
    header: 'compact',
    section: 'rule-after',
    skills: 'inline',
    defaults: defs(
      'compact',
      { primary: '#374151', text: '#1f2937', muted: '#6b7280' },
      { fontFamily: 'Roboto', headingFamily: 'Roboto', fontSize: 8.8, lineHeight: 1.32, headingScale: 1.35, uppercaseHeadings: true },
      { columns: 1, sectionGap: 9, itemGap: 5 }
    ),
  },
  {
    id: 'elegant',
    name: 'Lumière',
    description: 'Refined Garamond with airy spacing. Quietly luxurious.',
    tags: ['single-column', 'elegant', 'minimal'],
    atsSafe: true,
    class: 'tpl-elegant',
    header: 'centered',
    section: 'plain',
    skills: 'inline',
    defaults: defs(
      'elegant',
      { primary: '#9a7b4f', text: '#2d2a26', muted: '#7a7268' },
      { fontFamily: 'EB Garamond', headingFamily: 'Cormorant Garamond', nameFamily: 'Cormorant Garamond', fontSize: 10.3, lineHeight: 1.42, letterSpacing: 0.01, headingScale: 1.7, uppercaseHeadings: true },
      { columns: 1, icons: false, sectionGap: 11 }
    ),
  },
  {
    id: 'contemporary',
    name: 'Editorial',
    description: 'Editorial gutter headings. Magazine-grade structure.',
    tags: ['single-column', 'modern', 'creative'],
    atsSafe: true,
    class: 'tpl-contemporary',
    header: 'standard',
    section: 'side',
    skills: 'grouped-chips',
    defaults: defs(
      'contemporary',
      { primary: '#e11d48', text: '#27272a', muted: '#71717a' },
      { fontFamily: 'DM Sans', headingFamily: 'DM Sans', fontSize: 9.6, headingScale: 1.5, uppercaseHeadings: true },
      { columns: 1, sectionGap: 11 }
    ),
  },
  {
    id: 'polished',
    name: 'Marquee',
    description: 'A full-width color banner sets a bold, confident tone.',
    tags: ['single-column', 'creative', 'modern'],
    atsSafe: true,
    class: 'tpl-polished',
    header: 'banner',
    section: 'bar',
    skills: 'chips',
    defaults: defs(
      'polished',
      { primary: '#7c3aed', text: '#1f2937', muted: '#64748b' },
      { fontFamily: 'Poppins', headingFamily: 'Poppins', fontSize: 9.3, headingScale: 1.4, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'technical',
    name: 'Terminal',
    description: 'Monospace headings and skill tags. Built for engineers.',
    tags: ['ats-safe', 'single-column', 'technical'],
    atsSafe: true,
    class: 'tpl-technical',
    header: 'standard',
    section: 'bar',
    skills: 'chips',
    defaults: defs(
      'technical',
      { primary: '#059669', text: '#111827', muted: '#6b7280' },
      { fontFamily: 'IBM Plex Sans', headingFamily: 'IBM Plex Mono', nameFamily: 'IBM Plex Mono', fontSize: 9.3, headingScale: 1.4, uppercaseHeadings: false },
      { columns: 1 }
    ),
  },
  {
    id: 'creative',
    name: 'Nova',
    description: 'Vivid sidebar, photo, and rounded tags. Stand out tastefully.',
    tags: ['two-column', 'creative', 'photo'],
    atsSafe: false,
    class: 'tpl-creative',
    header: 'banner',
    section: 'plain',
    skills: 'dots',
    languageMeter: true,
    defaults: defs(
      'creative',
      { primary: '#8b5cf6', text: '#27272a', muted: '#71717a', sidebar: '#6d28d9', sidebarText: '#f5f3ff' },
      { fontFamily: 'Poppins', headingFamily: 'Poppins', fontSize: 9.3, headingScale: 1.4, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.35, showPhoto: true, photoShape: 'rounded' }
    ),
  },
  {
    id: 'ivy',
    name: 'Scholar',
    description: 'Academic, Times-set, single column. The gold standard for tradition.',
    tags: ['ats-safe', 'single-column', 'classic'],
    atsSafe: true,
    class: 'tpl-ivy',
    header: 'centered',
    section: 'rule-after',
    skills: 'inline',
    defaults: defs(
      'ivy',
      { primary: '#3b1f1f', text: '#1a1a1a', muted: '#57534e' },
      { fontFamily: 'Tinos', headingFamily: 'Tinos', fontSize: 9.8, lineHeight: 1.4, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 1, icons: false }
    ),
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Monochrome and architectural. Quiet confidence in black and white.',
    tags: ['ats-safe', 'single-column', 'minimal', 'modern'],
    atsSafe: true,
    class: 'tpl-onyx',
    header: 'split',
    section: 'rule-after',
    skills: 'inline',
    defaults: defs(
      'onyx',
      { primary: '#18181b', text: '#18181b', muted: '#71717a' },
      { fontFamily: 'Inter', headingFamily: 'Archivo', nameFamily: 'Archivo', fontSize: 9.6, headingScale: 1.55, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'A bold cobalt banner and crisp tags. Modern and high-energy.',
    tags: ['single-column', 'modern', 'creative'],
    atsSafe: true,
    class: 'tpl-cobalt',
    header: 'banner',
    section: 'bar',
    skills: 'chips',
    defaults: defs(
      'cobalt',
      { primary: '#1e40af', text: '#1f2937', muted: '#64748b' },
      { fontFamily: 'Mulish', headingFamily: 'Mulish', fontSize: 9.6, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'academic',
    name: 'Academia',
    description: 'A scholarly serif CV with room for publications. Built for academia.',
    tags: ['ats-safe', 'single-column', 'classic', 'elegant'],
    atsSafe: true,
    class: 'tpl-academic',
    header: 'centered',
    section: 'rule-after',
    skills: 'inline',
    defaults: defs(
      'academic',
      { primary: '#374151', text: '#1f2933', muted: '#6b7280' },
      { fontFamily: 'Source Serif 4', headingFamily: 'Source Serif 4', fontSize: 9.7, lineHeight: 1.42, headingScale: 1.5, uppercaseHeadings: false },
      { columns: 1, icons: false }
    ),
  },
  {
    id: 'verdant',
    name: 'Verdant',
    description: 'A calm green sidebar. Fresh, friendly, and easy to read.',
    tags: ['two-column', 'modern', 'minimal'],
    atsSafe: true,
    class: 'tpl-verdant',
    header: 'standard',
    section: 'plain',
    skills: 'chips',
    defaults: defs(
      'verdant',
      { primary: '#047857', text: '#1f2933', muted: '#6b7280', sidebar: '#ecfdf5', sidebarText: '#065f46' },
      { fontFamily: 'Figtree', headingFamily: 'Figtree', fontSize: 9.6, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'right', sidebarWidth: 0.33 }
    ),
  },
  {
    id: 'sienna',
    name: 'Sienna',
    description: 'Warm Spectral serif with terracotta accents. Editorial and inviting.',
    tags: ['single-column', 'elegant', 'creative'],
    atsSafe: true,
    class: 'tpl-sienna',
    header: 'centered',
    section: 'plain',
    skills: 'inline',
    defaults: defs(
      'sienna',
      { primary: '#b45309', text: '#292524', muted: '#78716c' },
      { fontFamily: 'Spectral', headingFamily: 'Spectral', nameFamily: 'Spectral', fontSize: 9.8, lineHeight: 1.44, headingScale: 1.6, uppercaseHeadings: true },
      { columns: 1, icons: false, sectionGap: 11 }
    ),
  },
  {
    id: 'newton',
    name: 'Newton',
    description: 'A scholarly, LaTeX-style single column. Serif, centered, timeless.',
    tags: ['ats-safe', 'single-column', 'classic', 'elegant'],
    atsSafe: true,
    class: 'tpl-newton',
    header: 'centered',
    section: 'rule-after',
    skills: 'inline',
    sectionIcons: false,
    defaults: defs(
      'newton',
      { primary: '#334155', text: '#1e293b', muted: '#64748b' },
      { fontFamily: 'Source Serif 4', headingFamily: 'Source Serif 4', fontSize: 9.9, lineHeight: 1.36, headingScale: 1.5, uppercaseHeadings: false },
      { columns: 1, icons: false }
    ),
  },
  {
    id: 'deedy',
    name: 'Deedy',
    description: 'The iconic two-column résumé — tight, bold, and recruiter-loved.',
    tags: ['two-column', 'modern', 'technical'],
    atsSafe: true,
    class: 'tpl-deedy',
    header: 'standard',
    section: 'plain',
    skills: 'inline',
    sectionIcons: false,
    defaults: defs(
      'deedy',
      { primary: '#b03a2e', text: '#26211d', muted: '#6b6256', sidebar: '#faf7f2', sidebarText: '#3f372e' },
      { fontFamily: 'Lato', headingFamily: 'Lato', fontSize: 9.4, headingScale: 1.7, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.3 }
    ),
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Editorial gutter headings in cool teal. Quiet, confident, modern.',
    tags: ['single-column', 'modern', 'minimal'],
    atsSafe: true,
    class: 'tpl-slate',
    header: 'standard',
    section: 'side',
    skills: 'grouped-chips',
    sectionIcons: false,
    defaults: defs(
      'slate',
      { primary: '#0f766e', text: '#1f2937', muted: '#6b7280' },
      { fontFamily: 'DM Sans', headingFamily: 'DM Sans', fontSize: 9.6, headingScale: 1.5, uppercaseHeadings: true },
      { columns: 1, sectionGap: 14 }
    ),
  },
  {
    id: 'mercury',
    name: 'Mercury',
    description: 'Corporate navy with Playfair headings. Executive and trustworthy.',
    tags: ['ats-safe', 'single-column', 'executive', 'classic'],
    atsSafe: true,
    class: 'tpl-mercury',
    header: 'split',
    section: 'underline',
    skills: 'inline',
    sectionIcons: true,
    defaults: defs(
      'mercury',
      { primary: '#1e3a8a', text: '#1f2937', muted: '#64748b' },
      { fontFamily: 'Lato', headingFamily: 'Playfair Display', nameFamily: 'Playfair Display', fontSize: 9.6, headingScale: 1.6, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'halcyon',
    name: 'Halcyon',
    description: 'A calm cyan sidebar with a photo. Friendly, fresh, easy to scan.',
    tags: ['two-column', 'modern', 'photo'],
    atsSafe: true,
    class: 'tpl-halcyon',
    header: 'standard',
    section: 'plain',
    skills: 'chips',
    sectionIcons: true,
    languageMeter: true,
    defaults: defs(
      'halcyon',
      { primary: '#0e7490', text: '#1f2937', muted: '#64748b', sidebar: '#ecfeff', sidebarText: '#155e63' },
      { fontFamily: 'Figtree', headingFamily: 'Figtree', fontSize: 9.5, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'right', sidebarWidth: 0.33, showPhoto: true, photoShape: 'circle', photoSize: 'm' }
    ),
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Monochrome ink with accent bars. Sharp, structured, engineer-ready.',
    tags: ['ats-safe', 'single-column', 'technical', 'modern'],
    atsSafe: true,
    class: 'tpl-graphite',
    header: 'standard',
    section: 'bar',
    skills: 'chips',
    sectionIcons: true,
    defaults: defs(
      'graphite',
      { primary: '#111827', text: '#111827', muted: '#6b7280' },
      { fontFamily: 'IBM Plex Sans', headingFamily: 'IBM Plex Sans', fontSize: 9.5, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 1 }
    ),
  },
  {
    id: 'portrait',
    name: 'Portrait',
    description: 'Photo-forward with a deep sidebar. A personal, memorable first impression.',
    tags: ['two-column', 'photo', 'modern', 'creative'],
    atsSafe: false,
    class: 'tpl-portrait',
    header: 'standard',
    section: 'plain',
    skills: 'chips',
    sectionIcons: true,
    languageMeter: true,
    defaults: defs(
      'portrait',
      { primary: '#0ea5e9', text: '#1f2937', muted: '#64748b', sidebar: '#0f172a', sidebarText: '#e2e8f0' },
      { fontFamily: 'Inter', headingFamily: 'Inter', fontSize: 9.4, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.34, showPhoto: true, photoShape: 'rounded', photoSize: 'l' }
    ),
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'A bold color banner with your photo. Confident and contemporary.',
    tags: ['single-column', 'creative', 'photo', 'modern'],
    atsSafe: false,
    class: 'tpl-spotlight',
    header: 'banner',
    section: 'bar',
    skills: 'chips',
    sectionIcons: true,
    defaults: defs(
      'spotlight',
      { primary: '#7c3aed', text: '#1f2937', muted: '#64748b' },
      { fontFamily: 'Poppins', headingFamily: 'Poppins', fontSize: 9.5, headingScale: 1.4, uppercaseHeadings: true },
      { columns: 1, showPhoto: true, photoShape: 'circle', photoSize: 'm' }
    ),
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Stark black-on-white minimalism. Pure typography, zero noise.',
    tags: ['ats-safe', 'single-column', 'minimal'],
    atsSafe: true,
    class: 'tpl-mono',
    header: 'standard',
    section: 'plain',
    skills: 'inline',
    sectionIcons: false,
    defaults: defs(
      'mono',
      { primary: '#111111', text: '#111111', muted: '#777777' },
      { fontFamily: 'Inter', headingFamily: 'Inter', fontSize: 9.7, lineHeight: 1.4, headingScale: 1.4, uppercaseHeadings: true },
      { columns: 1, icons: false, sectionGap: 14 }
    ),
  },
  {
    id: 'opal',
    name: 'Opal',
    description: 'A soft pastel sidebar with a photo. Calm, polished, approachable.',
    tags: ['two-column', 'photo', 'modern', 'elegant'],
    atsSafe: true,
    class: 'tpl-opal',
    header: 'standard',
    section: 'plain',
    skills: 'chips',
    sectionIcons: true,
    languageMeter: true,
    defaults: defs(
      'opal',
      { primary: '#7c3aed', text: '#27272a', muted: '#71717a', sidebar: '#f5f3ff', sidebarText: '#4c1d95' },
      { fontFamily: 'Work Sans', headingFamily: 'Work Sans', fontSize: 9.5, headingScale: 1.45, uppercaseHeadings: true },
      { columns: 2, sidebar: 'left', sidebarWidth: 0.33, showPhoto: true, photoShape: 'circle', photoSize: 'm' }
    ),
  },
]

export const TEMPLATE_MAP: Record<string, TemplateConfig> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(id?: string): TemplateConfig {
  return (id && TEMPLATE_MAP[id]) || TEMPLATE_MAP.modern
}
