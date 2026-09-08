/**
 * The shared rendering engine. Turns (document + template config) into the
 * resume DOM. All visual parameters become CSS variables on .rm-root so the
 * exact same tree renders on screen and in the printed PDF.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { RenderMode, TemplateConfig } from '@/types/template'
import { fontStack, ensureFont } from '@/data/fonts'
import { MM_TO_PX, PAGE_DIMENSIONS } from '@/types/metadata'
import { metaColumnOn, resolveOrder, sectionLabel } from '@/lib/sections'
import { safeHref } from '@/lib/utils'
import { headingCaseClasses, headingVars, typeScaleVars } from '@/lib/typeStyle'
import { elementColorVars, lighten, readableOn, veilAlpha, withAlpha } from '@/lib/elementColors'
import { resolveStatTiles } from '@/lib/stats'
import { applyKeywordFit, fitHeadingWords, refitWhenFontsReady } from '@/lib/pdf/keywordFit'
import { SectionBody } from './sections'
import { CONTACT_ICON_CHOICES, ContactIcons, contactIcon, prettyUrl, cleanEmail, Deco } from './atoms'
import { Ed, type EditFn, type MetaEditFn } from './Editable'
import { LinkButton } from './LinkButton'
import { SectionGear } from './SectionGear'
import { HeaderGear } from './HeaderGear'
import { ART_BAND_GROUNDS, artBandSrc } from './headerStyles'
import { keepEntriesOn, sectionOverrideClasses } from './sectionClasses'
import { sectionIconFor } from '@/components/icons/sectionIcons'
import { FolioIcon, folioIconKind } from './folioIcons'

/** Traditional templates render headings without icon chips. */
const NO_SECTION_ICONS = new Set(['classic', 'ivy', 'academic', 'elegant', 'minimal', 'executive', 'sienna'])

function SectionIcon({ sectionKey, style }: { sectionKey: string; style: string }) {
  if (style === 'folio') {
    // The folio chip: a solid glyph (sibling svgs, one fill each - the PDF
    // painter reads one fill per <svg> root) and two fold triangles, a light
    // outer wedge with a darker inner one, which read as a folded page
    // corner. Each fold is its own svg for the same one-fill reason. Custom
    // and unknown sections take the set's fallback glyph.
    return (
      <span className="rm-section-icon" aria-hidden>
        <FolioIcon kind={folioIconKind(sectionKey)} />
        <svg className="rm-folio-fold rm-folio-fold-lt" viewBox="0 0 8 8" aria-hidden focusable="false">
          <polygon points="0,0 8,0 8,8" />
        </svg>
        <svg className="rm-folio-fold rm-folio-fold-dk" viewBox="0 0 8 8" aria-hidden focusable="false">
          <polygon points="8,0 8,8 3.2,8" />
        </svg>
      </span>
    )
  }
  const Icon = sectionIconFor(sectionKey)
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
      '--rm-section-title-size': `${(fs * t.sectionTitleScale).toFixed(2)}px`,
      '--rm-section-gap': `${(layout.sectionGap * PT_TO_PX * fitScale).toFixed(2)}px`,
      '--rm-item-gap': `${(layout.itemGap * PT_TO_PX * fitScale).toFixed(2)}px`,
      /* One slider, two rhythms. The item gap is sized so two multi-line
       * ENTRY blocks read as separate; between two ONE-LINE minis (a
       * language, an interest, a credential line) the same gap reads as a
       * hole - the built-in example's languages sat 21pt apart for 10pt of
       * text. Minis take a derived fraction, so tightening or loosening the
       * one slider keeps both rhythms in proportion. */
      '--rm-item-gap-mini': `${Math.max(2, layout.itemGap * 0.55 * PT_TO_PX * fitScale).toFixed(2)}px`,
      '--rm-pad': `${(page.margin * MM_TO_PX).toFixed(2)}px`,
      '--rm-text': theme.text,
      '--rm-muted': theme.muted,
      '--rm-primary': theme.primary,
      // The band header's second gradient stop, and the colour a block or
      // band header sets its text in: the author's own when chosen, else
      // derived from the accent alone (elementColors.ts).
      '--rm-gradient-to': theme.gradientTo || lighten(theme.primary, 0.18),
      '--rm-on-primary': readableOn(theme.primary, theme.text),
      // The stepped header's second and third bands: the accent lightened
      // 14% and 28%, so the three steps grade from the accent down. A
      // template can name its own two shades instead, on the header element
      // itself (templates.css): written here they are inline on the root,
      // which no stylesheet rule can outrank.
      '--rm-step-2': lighten(theme.primary, 0.14),
      '--rm-step-3': lighten(theme.primary, 0.28),
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
      '--rm-art-veil': withAlpha(
        theme.background,
        veilAlpha(theme.background, theme.text, ART_BAND_GROUNDS[theme.artBand ?? 'none'] ?? [])
      ),
      '--rm-art-veil-accent': withAlpha(theme.primary, 0.55),
      // The footer strip: its ground is the theme's footer colour when one
      // is set (the stylesheet falls back to the text colour), and its text
      // whichever of white and the text colour reads on that ground.
      ...(theme.footer ? { '--rm-footer-bg': theme.footer } : {}),
      '--rm-on-footer': readableOn(theme.footer || theme.text, theme.text),
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
        { none: '""', dot: '"·"', pipe: '"|"', slash: '"/"', dash: '"–"' } as Record<string, string>
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
      // The headline and contact scales, the two weights, and the multiplier
      // a template's own section-title ratio rides on (typeStyle.ts).
      ...typeScaleVars(t),
      // The air under a section title and, when chosen, the width of its rule.
      ...headingVars(t),
      // The five element colours, each present only when set, so the
      // stylesheet's fallback chains decide the rest (elementColors.ts).
      ...elementColorVars(theme),
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
  // How many there are, for a header that lays them out by count (the band
  // stands a few in one column and splits more into columns).
  return (
    <div className={cls} data-contacts={entries.length}>
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
  // 'auto' marks rows whose link nobody AUTHORED - email and phone become
  // mailto:/tel: on their own. They join the underline parity (print
  // underlines them when underlining is on) but not the dotted link X-ray,
  // which marks the words an author attached an address to.
  const field = (icon: ReactNode, el: ReactNode, key: string, after?: ReactNode, linked?: boolean | 'auto') => (
    <span
      className={`rm-contact${linked ? ' rm-contact-linked' : ''}${linked === 'auto' ? ' rm-contact-auto' : ''}`}
      key={key}
    >
      {icons ? icon : null}
      {el}
      {after}
    </span>
  )
  return (
    <div className={cls} data-contacts={4 + (b.profiles?.length ?? 0)}>
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
        cleanEmail(b.email) ? 'auto' : undefined
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
        b.phone ? 'auto' : undefined
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

/** The stats band: up to four figures derived from the content (stats.ts),
 *  each decorative text - ink for a reader, nothing for a parser. The band
 *  header has a slot for it under the gradient; any other header carries it
 *  at its foot. */
function StatsBand({ doc }: { doc: ResumeDocument }) {
  const stats = resolveStatTiles(doc.content, doc.metadata.layout.statTiles)
  if (!stats.length) return null
  return (
    <div className="rm-stats">
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
  const stats = doc.metadata.layout.stats ? <StatsBand doc={doc} /> : null
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
  // A section whose entries must not be torn across a page break says so on
  // the element itself: the paginator reads the policy off the rendered page
  // (walk.ts), so the export and the preview overlay can never disagree about
  // it, and the browser's own print path avoids the same splits.
  // A section in the footer strip holds its rows whole whatever the document
  // says: the strip is one block of the page.
  const keepEntries = compact || keepEntriesOn(doc.metadata.page, ss)
  const cls = [
    'rm-section',
    ...sectionOverrideClasses(ss),
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
  const number = doc.metadata.layout.sectionNumbers && index !== undefined ? String(index + 1).padStart(2, '0') : null
  return (
    <section className={cls} style={secStyle} data-section={sectionKey}>
      {editMeta ? <SectionGear sectionKey={sectionKey} doc={doc} editMeta={editMeta} /> : null}
      <h2 className="rm-section-title">
        {showIcon ? <SectionIcon sectionKey={sectionKey} style={iconStyle} /> : null}
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
  const vars = useVars(doc, 1)
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

  const AsideCol = twoCol ? (
    <aside className="rm-col-aside">
      {doc.metadata.layout.showPhoto && doc.content.basics.image ? (
        <Photo doc={doc} editMeta={editMeta} />
      ) : doc.metadata.layout.monogram ? (
        <Monogram doc={doc} editMeta={editMeta} />
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
