/**
 * The shared rendering engine. Turns (document + template config) into the
 * resume DOM. All visual parameters become CSS variables on .rm-root so the
 * exact same tree renders on screen and in the printed PDF.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { RenderMode, TemplateConfig } from '@/types/template'
import { fontStack, ensureFont } from '@/data/fonts'
import { MM_TO_PX } from '@/types/metadata'
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { safeHref } from '@/lib/utils'
import { SectionBody } from './sections'
import { ContactIcons, networkIcon, prettyUrl, cleanEmail } from './atoms'
import { Ed, type EditFn, type MetaEditFn } from './Editable'
import { SectionGear } from './SectionGear'
import { sectionIconFor } from '@/components/icons/sectionIcons'

/** Traditional templates render headings without icon chips. */
const NO_SECTION_ICONS = new Set(['classic', 'ivy', 'academic', 'elegant', 'minimal', 'executive', 'sienna'])

function SectionIcon({ sectionKey }: { sectionKey: string }) {
  const Icon = sectionIconFor(sectionKey)
  return (
    <span className="rm-section-icon" aria-hidden>
      <Icon />
    </span>
  )
}

const PT_TO_PX = 96 / 72
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** CSS `list-style-type` values per bullet style (string markers need quoting). */
const BULLET_TYPE: Record<string, string> = {
  disc: 'disc',
  circle: 'circle',
  square: 'square',
  dash: '"–  "',
  arrow: '"›  "',
  check: '"✓  "',
  diamond: '"◆  "',
  none: 'none',
}

function useVars(doc: ResumeDocument, fitScale: number): CSSProperties {
  const { theme, typography: t, layout, page } = doc.metadata
  return useMemo(() => {
    const fs = t.fontSize * PT_TO_PX * fitScale
    const nameSize = fs * (1.55 + clamp(t.headingScale, 1, 2.6) * 0.62)
    return {
      '--rm-fs': `${fs.toFixed(2)}px`,
      '--rm-lh': String(t.lineHeight),
      '--rm-ls': `${t.letterSpacing}em`,
      '--rm-name-size': `${nameSize.toFixed(2)}px`,
      '--rm-section-title-size': `${(fs * 1.06).toFixed(2)}px`,
      '--rm-section-gap': `${(layout.sectionGap * PT_TO_PX * fitScale).toFixed(2)}px`,
      '--rm-item-gap': `${(layout.itemGap * PT_TO_PX * fitScale).toFixed(2)}px`,
      '--rm-pad': `${(page.margin * MM_TO_PX).toFixed(2)}px`,
      '--rm-text': theme.text,
      '--rm-muted': theme.muted,
      '--rm-primary': theme.primary,
      '--rm-bg': theme.background,
      '--rm-sidebar-bg': theme.sidebar,
      '--rm-sidebar-text': theme.sidebarText,
      '--rm-font-body': fontStack(t.fontFamily),
      '--rm-font-heading': fontStack(t.headingFamily || t.fontFamily),
      '--rm-font-name': fontStack(t.nameFamily || t.headingFamily || t.fontFamily),
      '--rm-aside-w': `${(layout.sidebarWidth * 100).toFixed(1)}%`,
      '--rm-photo-size': layout.photoSize === 's' ? '6em' : layout.photoSize === 'l' ? '9.6em' : '7.6em',
      '--rm-bullet-type': BULLET_TYPE[t.bulletStyle] ?? 'disc',
    } as CSSProperties
  }, [theme, t, layout, page, fitScale])
}

interface ContactEntry {
  icon: ReactNode
  text: string
  href?: string
}

function buildContacts(doc: ResumeDocument): ContactEntry[] {
  const b = doc.content.basics
  const out: ContactEntry[] = []
  const { Mail, Phone, Globe, MapPin } = ContactIcons
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  const email = cleanEmail(b.email)
  if (email) out.push({ icon: <Mail />, text: email, href: `mailto:${email}` })
  if (b.phone) out.push({ icon: <Phone />, text: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, '')}` })
  if (loc) out.push({ icon: <MapPin />, text: loc })
  if (b.url) out.push({ icon: <Globe />, text: prettyUrl(b.url), href: safeHref(b.url) })
  for (const p of b.profiles ?? []) {
    const Icon = networkIcon(p.network)
    // Keep profiles legible even when the template hides icons: prefer the clean
    // URL (so LinkedIn vs GitHub is obvious), else show "Network · handle" rather
    // than a bare, ambiguous username.
    const handle = (p.username || '').replace(/^@+/, '')
    const text = prettyUrl(p.url) || (p.network ? (handle ? `${p.network} · ${handle}` : p.network) : handle)
    if (text) out.push({ icon: <Icon />, text, href: safeHref(p.url) })
  }
  return out
}

function Contacts({ entries, icons }: { entries: ContactEntry[]; icons: boolean }) {
  if (!entries.length) return null
  return (
    <div className="rm-contacts">
      {entries.map((e, i) => (
        <span className="rm-contact" key={i}>
          {icons ? e.icon : null}
          {e.href ? <a href={e.href}>{e.text}</a> : <span>{e.text}</span>}
        </span>
      ))}
    </div>
  )
}

function Photo({ doc }: { doc: ResumeDocument }) {
  const { showPhoto, photoShape } = doc.metadata.layout
  const img = doc.content.basics.image
  if (!showPhoto || !img) return null
  // Only ever render locally-encoded images. A remote http(s) src (e.g. from a
  // crafted import) would fire an external request on render — breaking the
  // zero-external-requests promise — so it's dropped here too.
  if (!/^(data:image\/|blob:)/i.test(img)) return null
  return <img className={`rm-photo ${photoShape}`} src={img} alt={doc.content.basics.name} />
}

function Header({ doc, config, edit }: { doc: ResumeDocument; config: TemplateConfig; edit?: EditFn }) {
  const b = doc.content.basics
  const icons = doc.metadata.layout.icons
  const entries = buildContacts(doc)
  const name = b.name || 'Your Name'
  const variant = config.header
  // In two-column layouts the sidebar owns the photo, so the header omits it.
  const twoCol = doc.metadata.layout.columns === 2
  const HeaderPhoto = twoCol ? null : <Photo doc={doc} />

  const nameEl = edit ? (
    <Ed edit={edit} as="h1" className="rm-name" value={b.name} apply={(c, v) => { c.basics.name = v }} placeholder="Your Name" />
  ) : (
    <h1 className="rm-name">{name}</h1>
  )
  const headlineEl = edit ? (
    <Ed edit={edit} as="div" className="rm-headline" value={b.label ?? ''} apply={(c, v) => { c.basics.label = v }} placeholder="Your professional headline" />
  ) : b.label ? (
    <div className="rm-headline">{b.label}</div>
  ) : null

  const NameBlock = (
    <div className="rm-header-main">
      {nameEl}
      {headlineEl}
    </div>
  )

  if (variant === 'centered') {
    return (
      <header className="rm-header rm-header-centered">
        <div className="rm-header-main">
          {HeaderPhoto}
          {nameEl}
          {headlineEl}
          <Contacts entries={entries} icons={icons} />
        </div>
      </header>
    )
  }

  if (variant === 'banner') {
    return (
      <header className="rm-header rm-header-banner">
        <div className="rm-header-main">
          {nameEl}
          {headlineEl}
          <Contacts entries={entries} icons={icons} />
        </div>
        {HeaderPhoto}
      </header>
    )
  }

  if (variant === 'split') {
    return (
      <header className="rm-header rm-header-split">
        <div className="rm-header-lead">
          {HeaderPhoto}
          {NameBlock}
        </div>
        <div className="rm-header-aside">
          <Contacts entries={entries} icons={icons} />
        </div>
      </header>
    )
  }

  if (variant === 'compact') {
    return (
      <header className="rm-header rm-header-compact">
        {HeaderPhoto}
        <div className="rm-header-main">
          <h1 className="rm-name">
            {edit ? <Ed edit={edit} value={b.name} apply={(c, v) => { c.basics.name = v }} placeholder="Your Name" /> : name}
            {b.label ? <span className="rm-headline-inline"> — {b.label}</span> : null}
          </h1>
          <Contacts entries={entries} icons={icons} />
        </div>
      </header>
    )
  }

  // standard
  return (
    <header className="rm-header rm-header-standard">
      <div className="rm-header-main">
        {nameEl}
        {headlineEl}
        <Contacts entries={entries} icons={icons} />
      </div>
      {HeaderPhoto}
    </header>
  )
}

function Section({ sectionKey, doc, config, edit, editMeta }: { sectionKey: string; doc: ResumeDocument; config: TemplateConfig; edit?: EditFn; editMeta?: MetaEditFn }) {
  const showIcon = config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id)
  return (
    <section className="rm-section" data-section={sectionKey}>
      {editMeta ? <SectionGear sectionKey={sectionKey} doc={doc} editMeta={editMeta} /> : null}
      <h2 className="rm-section-title">
        {showIcon ? <SectionIcon sectionKey={sectionKey} /> : null}
        <span className="rm-section-title-text">{sectionLabel(sectionKey, doc)}</span>
      </h2>
      <div className="rm-section-body">
        <SectionBody sectionKey={sectionKey} doc={doc} config={config} edit={edit} />
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
export function SectionPreview({ doc, config, sectionKey }: { doc: ResumeDocument; config: TemplateConfig; sectionKey: string }) {
  const vars = useVars(doc, 1)
  const t = doc.metadata.typography
  ensureFont(t.fontFamily)
  ensureFont(t.headingFamily)
  ensureFont(t.nameFamily)
  const hasIcons = config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id)
  const cls = [
    'rm-root',
    'rm-section-preview',
    config.class,
    'rm-single',
    t.uppercaseHeadings ? 'rm-uppercase' : '',
    hasIcons ? 'rm-icons' : '',
    `sec-${config.section}`,
    `skl-${config.skills}`,
    'mode-preview',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={vars} data-template={config.id}>
      <Section sectionKey={sectionKey} doc={doc} config={config} />
    </div>
  )
}

export function Artboard({ doc, config, mode = 'preview', edit, editMeta, fitScale = 1, onAddSection }: { doc: ResumeDocument; config: TemplateConfig; mode?: RenderMode; edit?: EditFn; editMeta?: MetaEditFn; fitScale?: number; onAddSection?: () => void }) {
  const vars = useVars(doc, fitScale)
  // In edit mode keep empty (non-hidden) sections so they render on the canvas
  // with their inline "Add item" affordance; print/thumbnail show content only.
  const editing = !!edit
  const { main, aside } = useMemo(() => resolveOrder(doc, { includeEmpty: editing }), [doc, editing])
  const twoCol = doc.metadata.layout.columns === 2 && aside.length > 0
  const t = doc.metadata.typography

  // Inject fonts as soon as the template renders (idempotent).
  ensureFont(t.fontFamily)
  ensureFont(t.headingFamily)
  ensureFont(t.nameFamily)

  const hasIcons = config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id)
  const rootClass = [
    'rm-root',
    config.class,
    twoCol ? '' : 'rm-single',
    doc.metadata.typography.uppercaseHeadings ? 'rm-uppercase' : '',
    hasIcons ? 'rm-icons' : '',
    `hdr-${config.header}`,
    `sec-${config.section}`,
    `skl-${config.skills}`,
    `mode-${mode}`,
    `side-${doc.metadata.layout.sidebar}`,
  ]
    .filter(Boolean)
    .join(' ')

  const AsideCol = twoCol ? (
    <aside className="rm-col-aside">
      {doc.metadata.layout.showPhoto && doc.content.basics.image ? <Photo doc={doc} /> : null}
      {aside.map((key) => (
        <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} />
      ))}
    </aside>
  ) : null

  return (
    <div className={rootClass} style={vars} data-template={config.id}>
      <div className={`rm-body ${twoCol ? '' : 'rm-single'}`}>
        {twoCol && doc.metadata.layout.sidebar === 'left' ? AsideCol : null}
        <main className="rm-col-main">
          <Header doc={doc} config={config} edit={edit} />
          {main.map((key) => (
            <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} />
          ))}
          {onAddSection ? (
            <button type="button" className="rm-add-section no-print" onClick={onAddSection} title="Add a section">
              + Add section
            </button>
          ) : null}
        </main>
        {twoCol && doc.metadata.layout.sidebar === 'right' ? AsideCol : null}
      </div>
    </div>
  )
}
