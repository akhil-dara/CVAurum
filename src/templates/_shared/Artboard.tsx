/**
 * The shared rendering engine. Turns (document + template config) into the
 * resume DOM. All visual parameters become CSS variables on .rm-root so the
 * exact same tree renders on screen and in the printed PDF.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { RenderMode, TemplateConfig } from '@/types/template'
import { fontStack, ensureFont } from '@/data/fonts'
import { MM_TO_PX } from '@/types/metadata'
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { safeHref } from '@/lib/utils'
import { applyKeywordFit, fitHeadingWords } from '@/lib/pdf/keywordFit'
import { SectionBody } from './sections'
import { CONTACT_ICON_CHOICES, ContactIcons, contactIcon, prettyUrl, cleanEmail } from './atoms'
import { Ed, type EditFn, type MetaEditFn } from './Editable'
import { LinkButton } from './LinkButton'
import { SectionGear } from './SectionGear'
import { HeaderGear } from './HeaderGear'
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
      // The glyph itself, as a CSS `content` string. Written as real
      // characters rather than escapes: this value is handed to CSS verbatim.
      '--rm-contact-sep': (
        { none: '""', dot: '"·"', pipe: '"|"', slash: '"/"', dash: '"–"' } as Record<string, string>
      )[layout.contactSeparator ?? 'none'],
      '--rm-photo-align':
        layout.photoAlign === 'left' ? 'flex-start' : layout.photoAlign === 'right' ? 'flex-end' : 'center',
      '--rm-photo-margin':
        layout.photoAlign === 'left' ? '0 auto 0 0' : layout.photoAlign === 'right' ? '0 0 0 auto' : '0 auto',
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
  // How URLs READ is the author's choice; where they POINT never changes.
  const disp = doc.metadata.links?.display ?? 'pretty'
  const out: ContactEntry[] = []
  const { Mail, Phone, Globe, MapPin } = ContactIcons
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  const email = cleanEmail(b.email)
  if (email) out.push({ icon: <Mail />, text: email, href: `mailto:${email}` })
  if (b.phone) out.push({ icon: <Phone />, text: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, '')}` })
  if (loc) out.push({ icon: <MapPin />, text: loc })
  // The author's own words win over anything derived from the address: a link
  // labelled "Portfolio" is what they typed, not what the URL happens to say.
  if (b.url || b.urlLabel) {
    const UrlIcon = b.urlIcon ? contactIcon(undefined, b.urlIcon) : Globe
    out.push({ icon: <UrlIcon />, text: b.urlLabel?.trim() || prettyUrl(b.url, disp), href: safeHref(b.url) })
  }
  for (const p of b.profiles ?? []) {
    const Icon = contactIcon(p.network, p.icon)
    // Keep profiles legible even when the template hides icons: prefer the clean
    // URL (so LinkedIn vs GitHub is obvious), else show "Network · handle" rather
    // than a bare, ambiguous username.
    const handle = (p.username || '').replace(/^@+/, '')
    const text =
      p.label?.trim() ||
      prettyUrl(p.url, disp) ||
      (p.network ? (handle ? `${p.network} · ${handle}` : p.network) : handle)
    // Same rule as the canvas: no address and no handle means no contact,
    // however the row happens to be named.
    if (text && (p.url?.trim() || handle)) out.push({ icon: <Icon />, text, href: safeHref(p.url) })
  }
  return out
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
function contactsClass(doc: ResumeDocument): string {
  const { contactStyle, contactSeparator } = doc.metadata.layout
  return `rm-contacts${contactStyle === 'stacked' ? ' rm-contacts-stacked' : ''}${
    contactSeparator && contactSeparator !== 'none' ? ' rm-contacts-sep' : ''
  }`
}

function Contacts({ entries, icons, cls }: { entries: ContactEntry[]; icons: boolean; cls: string }) {
  if (!entries.length) return null
  return (
    <div className={cls}>
      {entries.map((e, i) => (
        <span className="rm-contact" key={i}>
          {icons ? e.icon : null}
          {e.href ? <a href={e.href}>{e.text}</a> : <span>{e.text}</span>}
        </span>
      ))}
    </div>
  )
}

/**
 * Edit-mode contacts: email / phone / location / website are editable right on
 * the canvas (empty ones show placeholders so they're discoverable). Profiles
 * (LinkedIn, GitHub…) stay as links — they're URL-backed, managed in the panel.
 */
function EditableContacts({ doc, edit, icons }: { doc: ResumeDocument; edit: EditFn; icons: boolean }) {
  const cls = contactsClass(doc)
  const b = doc.content.basics
  const { Mail, Phone, Globe, MapPin } = ContactIcons
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  // `after` is where the link popup goes: the row's text is what the reader
  // sees, and the chain button beside it owns the address.
  const field = (icon: ReactNode, el: ReactNode, key: string, after?: ReactNode, linked?: boolean) => (
    <span className={`rm-contact${linked ? ' rm-contact-linked' : ''}`} key={key}>
      {icons ? icon : null}
      {el}
      {after}
    </span>
  )
  return (
    <div className={cls}>
      {field(
        <Mail />,
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
        !!cleanEmail(b.email)
      )}
      {field(
        <Phone />,
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
        !!b.phone
      )}
      {field(
        <MapPin />,
        <Ed
          edit={edit}
          value={loc}
          apply={(c, v) => {
            const [city, ...rest] = v.split(',')
            c.basics.location = { ...c.basics.location, city: (city || '').trim(), region: rest.join(',').trim() }
          }}
          placeholder="City, Region"
        />,
        'loc'
      )}
      {/* Typing here sets the LABEL, not the address. It used to write
          straight to basics.url, so giving a link custom text destroyed the
          link - the display and the destination were the same field. */}
      {field(
        b.urlIcon ? (() => { const I = contactIcon(undefined, b.urlIcon); return <I /> })() : <Globe />,
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
        !!b.url
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
              !!p.url?.trim()
            )
          : null
      })}
    </div>
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
    <span className="rm-visual-wrap">
      {photo}
      <button
        type="button"
        className="rm-visual-hide no-print"
        contentEditable={false}
        title="Hide photo (turn back on via the header's Style button)"
        aria-label="Hide photo"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() =>
          editMeta((m) => {
            m.layout.showPhoto = false
          })
        }
      >
        ×
      </button>
    </span>
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
    <span className="rm-visual-wrap">
      {mark}
      <button
        type="button"
        className="rm-visual-hide no-print"
        contentEditable={false}
        title="Hide monogram (turn back on via the header's Style button)"
        aria-label="Hide monogram"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() =>
          editMeta((m) => {
            m.layout.monogram = false
          })
        }
      >
        ×
      </button>
    </span>
  )
}

/** Header visual: the user's PHOTO always wins; the monogram is the fallback
 *  identity mark when no photo is shown (so the two can never conflict). */
function HeaderVisual({ doc, editMeta }: { doc: ResumeDocument; editMeta?: MetaEditFn }) {
  const hasPhoto = doc.metadata.layout.showPhoto && !!doc.content.basics.image
  if (hasPhoto) return <Photo doc={doc} editMeta={editMeta} />
  return doc.metadata.layout.monogram ? <Monogram doc={doc} editMeta={editMeta} /> : null
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
  const ContactsEl = edit ? (
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

  if (variant === 'centered') {
    return (
      <header className="rm-header rm-header-centered">
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
    return (
      <header className="rm-header rm-header-banner">
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
    return (
      <header className="rm-header rm-header-split">
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
    return (
      <header className="rm-header rm-header-compact">
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
  return (
    <header className="rm-header rm-header-standard">
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

function Section({
  sectionKey,
  doc,
  config,
  edit,
  editMeta,
}: {
  sectionKey: string
  doc: ResumeDocument
  config: TemplateConfig
  edit?: EditFn
  editMeta?: MetaEditFn
}) {
  // 'none' drops the badge here rather than hiding it in CSS, so it leaves
  // the accessibility tree and the tagged PDF too, not just the page.
  const showIcon =
    (doc.metadata.layout.sectionIconStyle ?? 'chip') !== 'none' &&
    (config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id))
  // Per-section style overrides (user picks in the section gear) — scoped classes
  // that beat the template's root-level sec-*/skl-* defaults.
  const ss = doc.metadata.layout.sectionSettings?.[sectionKey]
  const cls = [
    'rm-section',
    ss?.headingStyle ? `sec-ov-${ss.headingStyle}` : '',
    ss?.skillsStyle ? `skl-ov-${ss.skillsStyle}` : '',
    ss?.chipSize ? `chip-${ss.chipSize}` : '',
    ss?.entryLayout ? `lay-ov-${ss.entryLayout}` : '',
    ss?.scoreStyle ? `score-ov-${ss.scoreStyle}` : '',
  ]
    .filter(Boolean)
    .join(' ')
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
  return (
    <section className={cls} style={secStyle} data-section={sectionKey}>
      {editMeta ? <SectionGear sectionKey={sectionKey} doc={doc} editMeta={editMeta} /> : null}
      <h2 className="rm-section-title">
        {showIcon ? <SectionIcon sectionKey={sectionKey} /> : null}
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
        <SectionBody sectionKey={sectionKey} doc={doc} config={config} edit={edit} editMeta={editMeta} />
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

export function Artboard({
  doc,
  config,
  mode = 'preview',
  edit,
  editMeta,
  fitScale = 1,
  onAddSection,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  mode?: RenderMode
  edit?: EditFn
  editMeta?: MetaEditFn
  fitScale?: number
  onAddSection?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
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

  const iconStyle = doc.metadata.layout.sectionIconStyle ?? 'chip'
  const hasIcons = iconStyle !== 'none' && (config.sectionIcons ?? !NO_SECTION_ICONS.has(config.id))
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
    `sicon-${iconStyle}`,
    // Underlining links is off by default - a resume full of underlines reads
    // badly - but a reader cannot otherwise SEE which text is clickable.
    doc.metadata.links?.underline ? 'links-underline' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const AsideCol = twoCol ? (
    <aside className="rm-col-aside">
      {doc.metadata.layout.showPhoto && doc.content.basics.image ? (
        <Photo doc={doc} editMeta={editMeta} />
      ) : doc.metadata.layout.monogram ? (
        <Monogram doc={doc} editMeta={editMeta} />
      ) : null}
      {aside.map((key) => (
        <Section key={key} sectionKey={key} doc={doc} config={config} edit={edit} editMeta={editMeta} />
      ))}
    </aside>
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

  return (
    <div ref={rootRef} className={rootClass} style={vars} data-template={config.id}>
      <div className={`rm-body ${twoCol ? '' : 'rm-single'}`}>
        {twoCol && doc.metadata.layout.sidebar === 'left' ? AsideCol : null}
        <main className="rm-col-main">
          <Header doc={doc} config={config} edit={edit} editMeta={editMeta} />
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
