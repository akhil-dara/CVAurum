/**
 * Section renderers shared by every template. Each section returns its BODY;
 * the <Artboard> engine wraps it with the section heading. When an `edit`
 * function is supplied (editable preview), text fields render as inline-editable
 * (<Ed>) and write straight back to the store; otherwise they render plain so
 * print/thumbnail stay clean.
 */
import { Fragment, lazy, Suspense, useEffect, useRef, useState, type ReactNode, type FocusEvent } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import type { TemplateConfig } from '@/types/template'
import { formatDateRange, formatDate, htmlToText, safeHref } from '@/lib/utils'
import { pushNewItem, removeItem, moveItem, sectionHasContent, entryBadgeOn, ADD_LABEL } from '@/lib/sections'
import { Chips, Dots, LevelBar, Stars, RichText, prettyUrl } from './atoms'
import { Ed, type EditFn, type MetaEditFn } from './Editable'
import { LinkButton } from './LinkButton'
import { CanvasDate } from './CanvasDate'
import { usePopoverA11y } from './popoverA11y'
import { keywordChunks } from '@/lib/keywordChunks'

/**
 * A keyword list where each term is its own element.
 *
 * Rendered as separate spans purely so a line break can be kept from falling
 * inside a term - `keywordFit.ts` marks the ones that fit unbreakable. The
 * text is character-for-character what `items.join(sep)` produced before, so
 * everything downstream (copy, search, the exported text layer) is unchanged.
 *
 * The separator travels WITH the term before it, and only the space after it
 * is left as a break opportunity. Otherwise a wrap can fall on the space in
 * front of a separator and start the next line with it - measured on a real
 * export, three lines began " . ", which reads as a bullet marker to anything
 * parsing the text rather than as a list separator.
 */
function KeywordList({ items, sep }: { items: string[]; sep: string }) {
  const glued = sep.replace(/\s+$/, '')
  return (
    <>
      {items.map((k, i) => {
        const last = i === items.length - 1
        // A term too wide to keep whole still must not break badly:
        // keywordChunks decides which spaces inside it may take a line break,
        // keeping the separator with the last word and a lone connector with
        // the word it joins. Pieces rejoin with single spaces and reproduce
        // the term exactly.
        const pieces = keywordChunks(k, last ? '' : glued)
        return (
          <Fragment key={i}>
            <span className="rm-kw">
              {pieces.map((piece, pi) => (
                <Fragment key={pi}>
                  {pi > 0 ? ' ' : null}
                  {piece.includes(' ') ? <span className="rm-kw-tail">{piece}</span> : piece}
                </Fragment>
              ))}
            </span>
            {last ? null : ' '}
          </Fragment>
        )
      })}
    </>
  )
}

const has = (s?: string) => !!s && htmlToText(s).length > 0
/** Any of these values carries real text? (strings or string arrays) */
const anyText = (...vals: Array<string | string[] | undefined>) =>
  vals.some((v) =>
    Array.isArray(v) ? v.some((x) => htmlToText(x).trim().length > 0) : !!v && htmlToText(v).trim().length > 0
  )

/** Per-section visibility + style overrides (undefined = shown / template default). */
export type SecOpts = {
  showBullets?: boolean
  showDates?: boolean
  showLocation?: boolean
  showSummary?: boolean
  bulletStyle?: string
  meterStyle?: string
  showKeywords?: boolean
  headingStyle?: string
  skillsStyle?: string
  entryLayout?: string
  showBadges?: boolean
  scoreStyle?: string
  /** entry logo / letter-badge size and shape (the section's own overrides) */
  badgeSize?: string
  badgeShape?: string
  /** Writes those two back. Present only in edit mode, and only when the
   *  caller can reach section metadata - the canvas logo menu uses it so the
   *  mark can be styled where it is seen, not only from the side panel. */
  setBadge?: (key: 'badgeSize' | 'badgeShape', v: string) => void
  /** Document-level, carried here because this bag is the channel that
   *  reaches an entry row - the link card says whether the result will be
   *  clickable, and it should not say so when the author turned that off. */
  linksClickable?: boolean
}
const show = (v?: boolean) => v !== false

type Apply = (c: ResumeDocument['content'], v: string) => void
/** A date range that's click-to-edit on the canvas (and plain text in print). */
function rangeDate(
  edit: EditFn | undefined,
  visible: boolean,
  start: string,
  end: string,
  applyStart: Apply,
  applyEnd: Apply
): ReactNode {
  if (!visible) return undefined
  if (!edit) return formatDateRange(start, end) || undefined
  return <CanvasDate edit={edit} range start={start} end={end} applyStart={applyStart} applyEnd={applyEnd} />
}
/** A single date that's click-to-edit on the canvas. */
function singleDate(edit: EditFn | undefined, visible: boolean, date: string, applyDate: Apply): ReactNode {
  if (!visible) return undefined
  if (!edit) return date ? formatDate(date) : undefined
  return <CanvasDate edit={edit} start={date} applyStart={applyDate} />
}

type ProfStyle = 'dots' | 'bars' | 'stars' | 'text' | 'none'

/** Render a 0–5 rating as the chosen meter (only for meter styles). */
function Proficiency({ rating, style }: { rating?: number; style: ProfStyle }) {
  if (rating == null) return null
  if (style === 'stars') return <Stars value={rating} />
  if (style === 'bars') return <LevelBar value={rating} />
  return <Dots value={rating} />
}

function Bullets({
  items,
  edit,
  setItem,
  onAdd,
  onRemove,
  onInsertAfter,
  onPruneEmpty,
}: {
  items: string[]
  edit?: EditFn
  setItem?: (c: ResumeDocument['content'], bi: number, v: string) => void
  onAdd?: () => void
  onRemove?: (bi: number) => void
  onInsertAfter?: (bi: number) => void
  onPruneEmpty?: () => void
}) {
  const ulRef = useRef<HTMLUListElement>(null)
  const pendingFocus = useRef<number | null>(null)
  const deleting = useRef(false)
  useEffect(() => {
    if (pendingFocus.current == null || !ulRef.current) return
    const eds = ulRef.current.querySelectorAll<HTMLElement>('.rm-bullet-row .rm-editable')
    eds[pendingFocus.current]?.focus()
    pendingFocus.current = null
  })

  // When focus leaves the whole list, drop any blank bullets the user added but
  // never filled — otherwise they linger as empty rows on the canvas yet vanish
  // from the printed resume (breaking WYSIWYG). Skipped mid-delete so it can't
  // re-index a splice that's already in flight.
  const onListBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!onPruneEmpty || deleting.current) return
    const next = e.relatedTarget as Node | null
    if (next && ulRef.current?.contains(next)) return
    if (items.some((h) => htmlToText(h).trim().length === 0)) onPruneEmpty()
  }

  const visible = items.filter((h) => htmlToText(h).length > 0)
  if (!edit && !visible.length) return null
  if (!edit) {
    return (
      <ul className="rm-bullets">
        {visible.map((h, i) => (
          <li key={i}>
            <RichText html={h} />
          </li>
        ))}
      </ul>
    )
  }
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()
  return (
    <ul className="rm-bullets rm-bullets-edit" ref={ulRef} onBlur={onListBlur}>
      {items.map((h, bi) => (
        <li key={bi} className="rm-bullet-row">
          <Ed
            edit={edit}
            value={h}
            rich
            onEnter={
              onInsertAfter
                ? () => {
                    pendingFocus.current = bi + 1
                    onInsertAfter(bi)
                  }
                : undefined
            }
            apply={(c, v) => setItem?.(c, bi, v)}
            placeholder="e.g. Cut deploy time 40% by automating the CI pipeline"
          />
          {onRemove && (
            <button
              type="button"
              className="rm-bullet-del no-print"
              contentEditable={false}
              onMouseDown={stop}
              onClick={() => {
                // Blur the focused bullet first: otherwise React keeps the focused
                // (index-keyed) editable's stale DOM text after the splice, so a
                // DIFFERENT bullet appears to vanish. The `deleting` guard stops the
                // resulting list-blur from also pruning (which would re-index `bi`).
                deleting.current = true
                ;(document.activeElement as HTMLElement | null)?.blur()
                onRemove(bi)
                deleting.current = false
              }}
              aria-label="Remove bullet"
              title="Remove bullet"
            >
              ×
            </button>
          )}
        </li>
      ))}
      {onAdd && (
        <li className="rm-bullet-addrow no-print" contentEditable={false}>
          <button
            type="button"
            className="rm-add-btn"
            onMouseDown={stop}
            onClick={() => {
              pendingFocus.current = items.length
              onAdd()
            }}
            title="Add a bullet"
          >
            + bullet
          </button>
        </li>
      )}
    </ul>
  )
}

/** First letter of the org/name — the ATS-safe stand-in for a company logo. */
const badgeLetter = (s?: string) => (s || '').trim().charAt(0).toUpperCase()

/** Locally-encoded image only — remote URLs would break zero-external-requests. */
const isLocalImg = (s?: string) => !!s && /^(data:image\/|blob:)/i.test(s)
/** Entries showing a logo/badge get a left "mark gutter" so the whole entry
 *  (title, org, meta, bullets) keeps ONE aligned left edge. */
const markClass = (logo?: string, badge?: string) => (isLocalImg(logo) || badge ? ' rm-has-mark' : '')

/* Cropper is editor-only chrome — lazy so print/thumbnail renders never load it. */
const LazyCropper = lazy(() => import('@/components/editor/ImageCropper').then((m) => ({ default: m.ImageCropper })))

/**
 * The entry mark, editable right on the canvas: click a logo to replace/remove
 * it, click the letter badge (or the hover "+" chip) to add one. Uploads go
 * through the same crop → downscale flow as the panel's logo picker, and the
 * result is a small local data URI — nothing ever leaves the device.
 */
const MARK_SIZES = [
  { v: '', label: 'Auto' },
  { v: 's', label: 'S' },
  { v: 'm', label: 'M' },
  { v: 'l', label: 'L' },
]
const MARK_SHAPES = [
  { v: '', label: 'Auto', title: 'Template default shape' },
  { v: 'rounded', label: '▢', title: 'Rounded corners' },
  { v: 'circle', label: '◯', title: 'Circle' },
  { v: 'square', label: '□', title: 'Square' },
]

/** One row of the canvas mark menu: a label and its four small toggles. */
function MarkRow({
  label,
  value,
  options,
  onPick,
}: {
  label: string
  value?: string
  options: { v: string; label: string; title?: string }[]
  onPick: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <span className="w-9 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="grid flex-1 grid-cols-4 gap-1">
        {options.map((o) => (
          <button
            key={o.v || 'auto'}
            type="button"
            role="menuitemradio"
            aria-checked={(value ?? '') === o.v}
            title={o.title || o.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(o.v)}
            className={`min-w-0 truncate rounded-md border px-1 py-1 text-[11px] font-medium transition ${
              (value ?? '') === o.v
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CanvasLogo({
  logo,
  badge,
  onChange,
  size,
  shape,
  setBadge,
}: {
  logo?: string
  badge?: string
  onChange: (v: string) => void
  size?: string
  shape?: string
  setBadge?: (key: 'badgeSize' | 'badgeShape', v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  usePopoverA11y(menu != null, () => setMenu(null), menuRef)

  const pick = (file?: File) => {
    // Deliberately permissive about the TYPE. An .ai file is reported as
    // application/postscript (or nothing at all), so this test dropped it in
    // silence - the picker simply appeared to do nothing. The cropper decodes
    // the file and says plainly when it cannot, which is the useful answer.
    // Video and audio are still refused: nothing here can make sense of them.
    if (!file || /^(video|audio)\//.test(file.type)) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onCropSave = async (dataUrl: string) => {
    setCropSrc(null)
    try {
      const { downscaleDataUrl } = await import('@/lib/image')
      onChange(await downscaleDataUrl(dataUrl, 128))
    } catch {
      /* unreadable image — keep whatever was there */
    }
  }

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // A letter badge is just as stylable as an uploaded mark, so it opens the
    // menu rather than jumping straight to the file picker - the picker is
    // still one click away inside it. Only a genuinely empty slot (the hover
    // "+ Logo" chip) skips ahead, where picking a file is the whole point.
    if (logo || badge) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMenu({
        top: Math.min(r.bottom + 6, window.innerHeight - 240),
        left: Math.max(8, Math.min(r.left, window.innerWidth - 248)),
      })
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <>
      <button
        type="button"
        className={`rm-logo-btn${logo ? '' : badge ? '' : ' rm-logo-btn-empty no-print'}`}
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={logo ? 'Change or remove this logo' : 'Add a small logo (company / institution mark)'}
        aria-label={logo ? 'Change or remove logo' : 'Add logo'}
      >
        {logo ? (
          <img className="rm-item-logo" src={logo} alt="" aria-hidden />
        ) : badge ? (
          <span className="rm-item-badge" aria-hidden>
            {badge}
          </span>
        ) : (
          <span className="rm-logo-add" aria-hidden>
            + Logo
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Logo image"
        onChange={(e) => {
          pick(e.target.files?.[0] ?? undefined)
          e.target.value = ''
        }}
      />
      {menu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} />
            <div
              ref={menuRef}
              role="menu"
              aria-label="Logo options"
              tabIndex={-1}
              className="fixed z-[61] w-56 rounded-lg border border-border bg-surface p-1 text-foreground shadow-float"
              style={{ top: menu.top, left: menu.left }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => {
                  setMenu(null)
                  inputRef.current?.click()
                }}
              >
                {logo ? 'Replace logo' : 'Add logo'}
              </button>
              {logo ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger/10"
                  onClick={() => {
                    setMenu(null)
                    onChange('')
                  }}
                >
                  Remove logo
                </button>
              ) : null}
              {/* Size and shape live here because this is where the author is
                  looking at the mark. They stay open while being tried, so a
                  size can be compared against the page without reopening. */}
              {setBadge ? (
                <>
                  <div className="my-1 border-t border-border" />
                  <MarkRow label="Size" value={size} options={MARK_SIZES} onPick={(v) => setBadge('badgeSize', v)} />
                  <MarkRow
                    label="Shape"
                    value={shape}
                    options={MARK_SHAPES}
                    onPick={(v) => setBadge('badgeShape', v)}
                  />
                  <p className="px-2 pb-1 pt-0.5 text-[10px] leading-snug text-muted-foreground">
                    Applies to every entry in this section.
                  </p>
                </>
              ) : null}
            </div>
          </>,
          document.body
        )}
      {cropSrc &&
        // Portaled OUT of .rm-root: inside it the dialog inherits the resume's
        // print ink color, which is illegible on the app's dark-mode surface.
        createPortal(
          <Suspense fallback={null}>
            <LazyCropper kind="logo" src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />
          </Suspense>,
          document.body
        )}
    </>
  )
}

function ItemHead({
  title,
  date,
  badge,
  logo,
  edit,
  setLogo,
  href,
  setHref,
  linkLabel,
  opts,
}: {
  title: ReactNode
  date?: ReactNode
  badge?: string
  logo?: string
  edit?: EditFn
  setLogo?: Apply
  /** The section's own settings - the mark's size and shape, and the setter
   *  the canvas menu writes them back through. */
  opts?: SecOpts
  href?: string
  /** Present when this entry's link can be edited from the canvas. */
  setHref?: (c: ResumeDocument['content'], v: string) => void
  linkLabel?: string
}) {
  // A real uploaded logo wins over the letter badge. Locally-encoded only —
  // remote URLs would break the zero-external-requests promise.
  const logoOk = logo && /^(data:image\/|blob:)/i.test(logo) ? logo : undefined
  return (
    <div className="rm-item-head">
      {edit && setLogo ? (
        <CanvasLogo
          logo={logoOk}
          badge={badge}
          onChange={(v) => edit((c) => setLogo(c, v))}
          size={opts?.badgeSize}
          shape={opts?.badgeShape}
          setBadge={opts?.setBadge}
        />
      ) : logoOk ? (
        <img className="rm-item-logo" src={logoOk} alt="" aria-hidden />
      ) : badge ? (
        <span className="rm-item-badge" aria-hidden>
          {badge}
        </span>
      ) : null}
      {/* An entry with a link makes its own TITLE the link, so the author gets
          a hyperlink whose display text is whatever they wrote - rather than a
          bare URL printed underneath it. The exporter turns any anchor into a
          clickable region, so this is live in the PDF too. On the canvas the
          click is swallowed: the title is being edited, not followed. */}
      <div className="rm-item-title">
        {href ? (
          <a className="rm-title-link" href={href} onClick={edit ? (e) => e.preventDefault() : undefined}>
            {title}
          </a>
        ) : (
          title
        )}
        {edit && setHref ? (
          <LinkButton
            href={href}
            label={linkLabel || 'this entry'}
            text={linkLabel}
            clickable={opts?.linksClickable !== false}
            onChange={(v) => edit((c) => setHref(c, v))}
          />
        ) : null}
      </div>
      {date ? <div className="rm-item-date">{date}</div> : null}
    </div>
  )
}

/**
 * On-canvas item delete (edit mode only): a small ghost trash button that sits
 * in the item's right gutter, revealed on hover/focus. Splices the item out via
 * the SAME store mutation the side panel's Trash2 delete uses — see removeItem
 * in lib/sections.ts — so there's one splice-by-id implementation, not two.
 * Never rendered in print/thumbnail (no `edit` there).
 */
/**
 * Move this entry up or down, on the canvas.
 *
 * Entries could be dragged in the side panel and nowhere else, so reordering
 * meant leaving the document you were looking at. Buttons rather than drag:
 * entries are stacked, a drag inside markup that is largely contentEditable
 * fights text selection, and two buttons are reachable from the keyboard for
 * free.
 */
function ItemMove({ edit, sectionKey, id, label }: { edit?: EditFn; sectionKey: string; id?: string; label: string }) {
  if (!edit || !id) return null
  const move = (delta: number) => edit((c) => moveItem(c, sectionKey, id, delta))
  return (
    <span className="rm-item-move no-print" contentEditable={false}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => move(-1)}
        aria-label={`Move ${label} earlier`}
        title={`Move ${label} up`}
      >
        <ChevronUp />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => move(1)}
        aria-label={`Move ${label} later`}
        title={`Move ${label} down`}
      >
        <ChevronDown />
      </button>
    </span>
  )
}

function ItemDelete({
  edit,
  sectionKey,
  id,
  label,
}: {
  edit?: EditFn
  sectionKey: string
  id?: string
  label: string
}) {
  if (!edit || !id) return null
  return (
    <button
      type="button"
      className="rm-item-del no-print"
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => edit((c) => removeItem(c, sectionKey, id))}
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
    >
      <Trash2 />
    </button>
  )
}

/**
 * Inline-editable keyword chips on the canvas (skills, etc.). Mirrors Bullets:
 * each chip is editable text + an × to remove, with a "+" to add, blank chips
 * pruned when focus leaves. Without `edit` it renders plain, print-clean chips.
 */
/** Drag payload naming the list a keyword came from, so another group can
 *  adopt it. A plain text/plain drop stays an ordinary in-list move. */
const KW_MIME = 'application/x-cvaurum-keyword'

/**
 * The keyword currently being dragged, shared by every list on the page.
 *
 * `dataTransfer` alone is not enough to carry this. Its payload is readable on
 * DROP but not reliably on DRAGOVER, which is where a list has to decide
 * whether to accept the drop at all - and automated drags populate it not at
 * all, so the behaviour could not be tested. The transfer object is still
 * filled in, because a drag that leaves the page entirely should still carry
 * its text somewhere useful.
 */
let activeKeywordDrag: { listId: string; index: number; text: string } | null = null

function EditableChips({
  items,
  edit,
  setItem,
  onAdd,
  onRemove,
  onPruneEmpty,
  addLabel = '+ skill',
  placeholder = 'Skill',
  variant = 'chips',
  lead = '',
  onMove,
  listId,
  onAdopt,
}: {
  items: string[]
  edit?: EditFn
  setItem?: (c: ResumeDocument['content'], ki: number, v: string) => void
  onAdd?: () => void
  onRemove?: (ki: number) => void
  onPruneEmpty?: () => void
  addLabel?: string
  placeholder?: string
  /** Match the style the document actually uses, so the canvas shows what the
   *  export will show. 'inline' renders the keywords as running text with the
   *  same separator the preview uses. */
  variant?: 'chips' | 'inline'
  /** Text before the first keyword in the inline variant (the ": " after a
   *  group name), so editing does not change the punctuation. */
  lead?: string
  /** Move the keyword at `from` to `to`. Absent means this list cannot be
   *  reordered, and no affordance is shown for it. */
  onMove?: (from: number, to: number) => void
  /** Identifies this list so a keyword can be dragged into a DIFFERENT one.
   *  Absent means keywords stay inside their own list. */
  listId?: string
  /** Take the keyword `text`, which came from the list `fromId`, and put it at
   *  `toIndex` in this one. The source list removes it itself. */
  onAdopt?: (fromId: string, fromIndex: number, text: string, toIndex: number) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<number | null>(null)
  const deleting = useRef(false)
  const [grabbed, setGrabbed] = useState<number | null>(null)
  useEffect(() => {
    if (pendingFocus.current == null || !wrapRef.current) return
    const eds = wrapRef.current.querySelectorAll<HTMLElement>('.rm-chip-edit .rm-editable')
    eds[pendingFocus.current]?.focus()
    pendingFocus.current = null
  })

  const onWrapBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!onPruneEmpty || deleting.current) return
    const next = e.relatedTarget as Node | null
    if (next && wrapRef.current?.contains(next)) return
    if (items.some((k) => (k || '').trim().length === 0)) onPruneEmpty()
  }

  if (!edit) {
    const visible = items.filter((k) => (k || '').trim().length > 0)
    if (!visible.length) return null
    return variant === 'inline' ? (
      <span className="rm-skill-inline">
        {lead}
        <KeywordList items={visible} sep=" · " />
      </span>
    ) : (
      <Chips items={visible} />
    )
  }

  const stop = (e: { preventDefault: () => void }) => e.preventDefault()

  // Reordering. A chip is draggable only while its HANDLE is held: the keyword
  // itself is contentEditable, and a permanently draggable chip turns an
  // ordinary attempt to select a word into a drag of the whole chip.
  const dragFrom = useRef<number | null>(null)
  /**
   * Commit whatever is being edited BEFORE the list order changes.
   *
   * Each keyword is a contentEditable that only takes a new value from props
   * while it is NOT focused. Move the list under a focused one and it keeps
   * the text it was showing, then writes that text back at its new index on
   * blur: reordering ["TypeScript", "Go"] produced ["Go", "Go"], losing a
   * keyword outright. Blurring first makes the pending edit land on the index
   * it was actually typed into.
   */
  const commitBeforeMove = () => {
    const el = document.activeElement as HTMLElement | null
    if (el && wrapRef.current?.contains(el)) el.blur()
  }
  const dragProps = (ki: number) =>
    onMove
      ? {
          onDragStart: (e: React.DragEvent) => {
            dragFrom.current = ki
            e.dataTransfer.effectAllowed = 'move'
            // Carries which LIST the keyword came from, so another group can
            // adopt it. Firefox also needs a payload for the drag to start.
            e.dataTransfer.setData('text/plain', items[ki] ?? '')
            if (listId) {
              const payload = { listId, index: ki, text: items[ki] ?? '' }
              activeKeywordDrag = payload
              e.dataTransfer.setData(KW_MIME, JSON.stringify(payload))
            }
          },
          onDragOver: (e: React.DragEvent) => {
            // A keyword from ANOTHER group is welcome even though this list did
            // not start the drag, so the check cannot be "did I start it".
            const foreign = !!onAdopt && !!activeKeywordDrag && activeKeywordDrag.listId !== listId
            if (!foreign && (dragFrom.current === null || dragFrom.current === ki)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault()
            const from = dragFrom.current
            dragFrom.current = null
            setGrabbed(null)
            const dragged = activeKeywordDrag
            activeKeywordDrag = null
            if (onAdopt && dragged && dragged.listId !== listId) {
              commitBeforeMove()
              onAdopt(dragged.listId, dragged.index, dragged.text, ki)
              return
            }
            if (from !== null && from !== ki) {
              commitBeforeMove()
              onMove(from, ki)
            }
          },
          onDragEnd: () => {
            dragFrom.current = null
            activeKeywordDrag = null
            setGrabbed(null)
          },
          // Alt+arrows do the same without a mouse, which is the only way a
          // keyboard user can reorder at all.
          onKeyDown: (e: React.KeyboardEvent) => {
            // Alt+Arrow alone is the browser's Back and Forward, so the move
            // shortcut takes Shift too.
            if (!e.altKey || !e.shiftKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
            const to = e.key === 'ArrowLeft' ? ki - 1 : ki + 1
            if (to < 0 || to >= items.length) return
            e.preventDefault()
            commitBeforeMove()
            pendingFocus.current = to
            onMove(ki, to)
          },
        }
      : {}
  const handle = (ki: number, k: string) =>
    onMove ? (
      <button
        type="button"
        className="rm-kw-grip no-print"
        aria-label={`Reorder ${k || placeholder}. Hold Alt and Shift and press the left or right arrow key to move it.`}
        title="Drag to reorder (or Alt + Shift + arrow keys)"
        onMouseDown={() => setGrabbed(ki)}
        onMouseUp={() => setGrabbed(null)}
      >
        &#10247;
      </button>
    ) : null

  if (variant === 'inline') {
    return (
      <span
        className="rm-skill-inline rm-inline-edit"
        ref={wrapRef as unknown as React.Ref<HTMLSpanElement>}
        onBlur={onWrapBlur}
      >
        {lead}
        {items.map((k, ki) => (
          <span key={ki} className="rm-kw-edit" draggable={grabbed === ki} {...dragProps(ki)}>
            {ki > 0 ? <span className="rm-kw-sep"> · </span> : null}
            {handle(ki, k)}
            <Ed
              edit={edit}
              value={k}
              apply={(c, v) => setItem?.(c, ki, v)}
              placeholder={placeholder}
              spellCheck={false}
              onEnter={
                onAdd
                  ? () => {
                      pendingFocus.current = items.length
                      onAdd()
                    }
                  : undefined
              }
            />
            {onRemove && (
              <button
                type="button"
                className="rm-kw-x no-print"
                aria-label={`Remove ${k || placeholder}`}
                onMouseDown={(e) => {
                  deleting.current = true
                  stop(e)
                }}
                onClick={() => {
                  onRemove(ki)
                  deleting.current = false
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {onAdd && (
          <button
            type="button"
            className="rm-add-btn no-print"
            onMouseDown={stop}
            onClick={() => {
              pendingFocus.current = items.length
              onAdd()
            }}
          >
            {addLabel}
          </button>
        )}
      </span>
    )
  }
  return (
    <div className="rm-chips rm-chips-edit" ref={wrapRef} onBlur={onWrapBlur}>
      {items.map((k, ki) => (
        <span key={ki} className="rm-chip rm-chip-edit" draggable={grabbed === ki} {...dragProps(ki)}>
          {handle(ki, k)}
          <Ed
            edit={edit}
            value={k}
            apply={(c, v) => setItem?.(c, ki, v)}
            placeholder={placeholder}
            spellCheck={false}
            onEnter={
              onAdd
                ? () => {
                    pendingFocus.current = items.length
                    onAdd()
                  }
                : undefined
            }
          />
          {onRemove && (
            <button
              type="button"
              className="rm-chip-del no-print"
              contentEditable={false}
              onMouseDown={stop}
              onClick={() => {
                deleting.current = true
                ;(document.activeElement as HTMLElement | null)?.blur()
                onRemove(ki)
                deleting.current = false
              }}
              aria-label="Remove"
              title="Remove"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {onAdd && (
        <button
          type="button"
          className="rm-add-btn no-print"
          contentEditable={false}
          onMouseDown={stop}
          onClick={() => {
            pendingFocus.current = items.length
            onAdd()
          }}
          title="Add a skill"
        >
          {addLabel}
        </button>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- renderers */

function Summary({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <Ed
      edit={edit}
      value={doc.content.basics.summary ?? ''}
      rich
      multiline
      as="div"
      className="rm-item"
      apply={(c, v) => {
        c.basics.summary = v
      }}
      placeholder="2–3 lines: who you are, your specialty, one standout win — e.g. “Data analyst, 4 yrs — built dashboards that cut reporting time 60%.”"
    />
  )
}

function Work({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.work.map((w, i) => {
        if (!edit && !anyText(w.position, w.name, w.summary, w.highlights)) return null
        return (
          <article
            className={`rm-item rm-keep${markClass(w.logo, entryBadgeOn(w, opts) ? badgeLetter(w.name || w.position) : undefined)}`}
            key={w.id}
            data-item-id={w.id}
          >
            <ItemHead
              opts={opts}
              badge={entryBadgeOn(w, opts) ? badgeLetter(w.name || w.position) : undefined}
              href={safeHref(w.url)}
              setHref={(c, val) => {
                c.work[i].url = val
              }}
              linkLabel={w.position || w.name}
              logo={w.logo}
              edit={edit}
              setLogo={(c, v) => {
                c.work[i].logo = v
              }}
              title={
                <Ed
                  edit={edit}
                  value={w.position}
                  apply={(c, v) => {
                    c.work[i].position = v
                  }}
                  placeholder="Job title — e.g. Product Manager"
                />
              }
              date={rangeDate(
                edit,
                show(opts?.showDates),
                w.startDate,
                w.endDate,
                (c, v) => {
                  c.work[i].startDate = v
                },
                (c, v) => {
                  c.work[i].endDate = v
                }
              )}
            />
            <div className="rm-item-sub">
              <Ed
                edit={edit}
                value={w.name}
                apply={(c, v) => {
                  c.work[i].name = v
                }}
                className="rm-item-org"
                placeholder="Company — e.g. Acme Corp"
              />
              {show(opts?.showLocation) && (edit || w.location) ? (
                <Ed
                  edit={edit}
                  value={w.location}
                  apply={(c, v) => {
                    c.work[i].location = v
                  }}
                  className="rm-item-loc"
                  placeholder="Location"
                />
              ) : null}
            </div>
            {show(opts?.showSummary) && (has(w.summary) || edit) ? (
              <div className="rm-item-summary">
                <Ed
                  edit={edit}
                  value={w.summary}
                  rich
                  multiline
                  as="div"
                  apply={(c, v) => {
                    c.work[i].summary = v
                  }}
                  placeholder="Brief role overview — scope, team, mission (optional)"
                />
              </div>
            ) : null}
            {show(opts?.showBullets) ? (
              <Bullets
                items={w.highlights}
                edit={edit}
                setItem={(c, bi, v) => {
                  c.work[i].highlights[bi] = v
                }}
                onAdd={
                  edit
                    ? () =>
                        edit((c) => {
                          c.work[i].highlights.push('')
                        })
                    : undefined
                }
                onRemove={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.work[i].highlights.splice(bi, 1)
                        })
                    : undefined
                }
                onInsertAfter={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.work[i].highlights.splice(bi + 1, 0, '')
                        })
                    : undefined
                }
                onPruneEmpty={
                  edit
                    ? () =>
                        edit((c) => {
                          c.work[i].highlights = c.work[i].highlights.filter((h) => htmlToText(h).trim().length > 0)
                        })
                    : undefined
                }
              />
            ) : null}
            <ItemMove edit={edit} sectionKey="work" id={w.id} label={ADD_LABEL.work} />
            <ItemDelete edit={edit} sectionKey="work" id={w.id} label={ADD_LABEL.work} />
          </article>
        )
      })}
    </>
  )
}

function Education({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.education.map((e, i) => {
        if (!edit && !anyText(e.institution, e.area, e.studyType)) return null
        const title = [e.studyType, e.area].filter(Boolean).join(', ') || e.institution
        return (
          <article
            className={`rm-item rm-keep${markClass(e.logo, entryBadgeOn(e, opts) ? badgeLetter(e.institution || e.area) : undefined)}`}
            key={e.id}
            data-item-id={e.id}
          >
            <ItemHead
              opts={opts}
              badge={entryBadgeOn(e, opts) ? badgeLetter(e.institution || e.area) : undefined}
              href={safeHref(e.url)}
              setHref={(c, val) => {
                c.education[i].url = val
              }}
              linkLabel={e.institution || e.area}
              logo={e.logo}
              edit={edit}
              setLogo={(c, v) => {
                c.education[i].logo = v
              }}
              title={
                edit ? (
                  // Degree + field are BOTH on the canvas (they both print) —
                  // hiding studyType here broke WYSIWYG and invited retyping
                  // the degree into the field box.
                  <>
                    <Ed
                      edit={edit}
                      value={e.studyType}
                      apply={(c, v) => {
                        c.education[i].studyType = v
                      }}
                      placeholder="Degree — e.g. B.S."
                    />
                    <span aria-hidden>{', '}</span>
                    <Ed
                      edit={edit}
                      value={e.area}
                      apply={(c, v) => {
                        c.education[i].area = v
                      }}
                      placeholder="Field — e.g. Computer Science"
                    />
                  </>
                ) : (
                  title
                )
              }
              date={rangeDate(
                edit,
                show(opts?.showDates),
                e.startDate,
                e.endDate,
                (c, v) => {
                  c.education[i].startDate = v
                },
                (c, v) => {
                  c.education[i].endDate = v
                }
              )}
            />
            <div className="rm-item-sub">
              <Ed
                edit={edit}
                value={e.institution}
                apply={(c, v) => {
                  c.education[i].institution = v
                }}
                className="rm-item-org"
                placeholder="School — e.g. State University"
              />
              {show(opts?.showLocation) && (edit || e.location) ? (
                <Ed
                  edit={edit}
                  value={e.location}
                  apply={(c, v) => {
                    c.education[i].location = v
                  }}
                  className="rm-item-loc"
                  placeholder="Location"
                />
              ) : null}
              {edit || e.score ? (
                <Ed
                  edit={edit}
                  value={e.score}
                  apply={(c, v) => {
                    c.education[i].score = v
                  }}
                  className="rm-item-score"
                  placeholder="GPA"
                />
              ) : null}
            </div>
            {has(e.summary) ? <RichText html={e.summary} /> : null}
            {e.courses?.length ? (
              <div className="rm-skill-inline">
                <KeywordList items={e.courses} sep=" · " />
              </div>
            ) : null}
            <ItemMove edit={edit} sectionKey="education" id={e.id} label={ADD_LABEL.education} />
            <ItemDelete edit={edit} sectionKey="education" id={e.id} label={ADD_LABEL.education} />
          </article>
        )
      })}
    </>
  )
}

function Projects({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.projects.map((p, i) => {
        if (!edit && !anyText(p.name, p.description, p.highlights)) return null
        return (
          <article
            className={`rm-item rm-keep${markClass(undefined, opts?.showBadges ? badgeLetter(p.name) : undefined)}`}
            key={p.id}
            data-item-id={p.id}
          >
            <ItemHead
              opts={opts}
              badge={opts?.showBadges ? badgeLetter(p.name) : undefined}
              href={safeHref(p.url)}
              setHref={(c, val) => {
                c.projects[i].url = val
              }}
              linkLabel={p.name}
              // Without this the head had no `edit`, so a project's title
              // carried neither the link button nor the mark control - every
              // other entry type had both. A project link could only be typed
              // into the URL line underneath, which is the one place it should
              // NOT have had to be.
              edit={edit}
              title={
                edit ? (
                  <Ed
                    edit={edit}
                    value={p.name}
                    apply={(c, v) => {
                      c.projects[i].name = v
                    }}
                    placeholder="Project name"
                  />
                ) : (
                  p.name
                )
              }
              date={rangeDate(
                edit,
                show(opts?.showDates),
                p.startDate,
                p.endDate,
                (c, v) => {
                  c.projects[i].startDate = v
                },
                (c, v) => {
                  c.projects[i].endDate = v
                }
              )}
            />
            {/* The link line shows only when there IS a link. It used to be an
                always-present empty slot in edit mode - a mystery field - and
                it duplicated the title's own link editor, so two controls
                wrote one value and each undid the other. The title's chain
                button is where a project link is SET; this line displays it. */}
            {edit && p.url ? (
              <div className="rm-item-link">
                <Ed
                  edit={edit}
                  value={p.url}
                  apply={(c, v) => {
                    c.projects[i].url = v
                  }}
                  placeholder="Project link (e.g. github.com/you/project)"
                />
              </div>
            ) : !edit && p.url ? (
              <div className="rm-item-link">
                {safeHref(p.url) ? <a href={safeHref(p.url)}>{prettyUrl(p.url)}</a> : prettyUrl(p.url)}
              </div>
            ) : null}
            {edit || p.description ? (
              <div className="rm-item-summary">
                <Ed
                  edit={edit}
                  value={p.description}
                  apply={(c, v) => {
                    c.projects[i].description = v
                  }}
                  placeholder="One-line description"
                />
              </div>
            ) : null}
            {show(opts?.showBullets) ? (
              <Bullets
                items={p.highlights}
                edit={edit}
                setItem={(c, bi, v) => {
                  c.projects[i].highlights[bi] = v
                }}
                onAdd={
                  edit
                    ? () =>
                        edit((c) => {
                          c.projects[i].highlights.push('')
                        })
                    : undefined
                }
                onRemove={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.projects[i].highlights.splice(bi, 1)
                        })
                    : undefined
                }
                onInsertAfter={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.projects[i].highlights.splice(bi + 1, 0, '')
                        })
                    : undefined
                }
                onPruneEmpty={
                  edit
                    ? () =>
                        edit((c) => {
                          c.projects[i].highlights = c.projects[i].highlights.filter(
                            (h) => htmlToText(h).trim().length > 0
                          )
                        })
                    : undefined
                }
              />
            ) : null}
            {show(opts?.showKeywords) ? (
              edit ? (
                <EditableChips
                  items={p.keywords ?? []}
                  edit={edit}
                  setItem={(c, ki, v) => {
                    ;(c.projects[i].keywords ??= [])[ki] = v
                  }}
                  onAdd={() =>
                    edit((c) => {
                      ;(c.projects[i].keywords ??= []).push('')
                    })
                  }
                  onRemove={(ki) =>
                    edit((c) => {
                      c.projects[i].keywords?.splice(ki, 1)
                    })
                  }
                  onPruneEmpty={() =>
                    edit((c) => {
                      c.projects[i].keywords = (c.projects[i].keywords ?? []).filter((k) => (k || '').trim().length > 0)
                    })
                  }
                  addLabel="+ tag"
                  placeholder="Tech"
                />
              ) : p.keywords?.length ? (
                <Chips items={p.keywords} />
              ) : null
            ) : null}
            <ItemMove edit={edit} sectionKey="projects" id={p.id} label={ADD_LABEL.projects} />
            <ItemDelete edit={edit} sectionKey="projects" id={p.id} label={ADD_LABEL.projects} />
          </article>
        )
      })}
    </>
  )
}

function Skills({
  doc,
  config,
  edit,
  opts,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  edit?: EditFn
  opts?: SecOpts
}) {
  // The user's per-section display choice wins over the template's default.
  // tags/grid reuse the chips markup (distinct keyword elements) restyled by CSS.
  const override = opts?.skillsStyle
  // 'inline' and 'stacked' both render the keyword LIST as running text; they
  // differ only in whether that list starts after the group name or beneath
  // it. Everything else reuses the chip markup, restyled by CSS.
  const style = override ? (override === 'inline' || override === 'stacked' ? override : 'chips') : config.skills
  const prof = (opts?.meterStyle ?? doc.metadata.typography.proficiency) as ProfStyle
  const meter = prof === 'dots' || prof === 'bars' || prof === 'stars'
  return (
    <>
      {doc.content.skills.map((s, i) => {
        const hasKeywords = s.keywords && s.keywords.length > 0
        if (!hasKeywords && typeof s.rating === 'number' && meter) {
          return (
            <div className="rm-skill-group" key={s.id} data-item-id={s.id}>
              <div className="rm-level">
                <span className="rm-skill-group-name">
                  {/* Same chunking as a keyword: a group named "BI, Reporting
                      & Visualisation" wrapped with "&" alone on a line. */}
                  {keywordChunks(s.name || '', '').map((piece, pi) => (
                    <Fragment key={pi}>
                      {pi > 0 ? ' ' : null}
                      {piece.includes(' ') ? <span className="rm-kw-tail">{piece}</span> : piece}
                    </Fragment>
                  ))}
                </span>
                <Proficiency rating={s.rating} style={prof} />
              </div>
              <ItemMove edit={edit} sectionKey="skills" id={s.id} label={ADD_LABEL.skills} />
              <ItemDelete edit={edit} sectionKey="skills" id={s.id} label={ADD_LABEL.skills} />
            </div>
          )
        }
        const chipStyle = style === 'chips' || style === 'grouped-chips' || style === 'bars' || style === 'dots'
        const stacked = style === 'stacked'
        // A group can carry BOTH a rating and keywords (the common case: user
        // sets a level in the side panel on a chip group). Meter still applies —
        // it just gets the keywords rendered below it instead of standing alone.
        const showMeter = meter && typeof s.rating === 'number'
        const nameEl =
          s.name || edit ? (
            <Ed
              edit={edit}
              value={s.name}
              apply={(c, v) => {
                c.skills[i].name = v
              }}
              className="rm-skill-group-name"
              placeholder="Category"
              chunk
            />
          ) : null
        return (
          <div className={`rm-skill-group${stacked ? ' rm-skill-stacked' : ''}`} key={s.id} data-item-id={s.id}>
            {showMeter ? (
              <div className="rm-level">
                {nameEl}
                <Proficiency rating={s.rating} style={prof} />
              </div>
            ) : (
              nameEl
            )}
            {edit ? (
              // The canvas renders the style the document actually uses, with
              // the editing affordances laid over it. It used to render chips
              // whatever the style was, so an inline list looked like pills
              // while being edited and like running text everywhere else -
              // the editing surface disagreeing with its own output.
              <EditableChips
                variant={chipStyle ? 'chips' : 'inline'}
                // The colon joins the name to the list; stacked puts the
                // list on its own line, where a leading colon reads as a typo.
                lead={!chipStyle && s.name && !stacked ? ': ' : ''}
                items={s.keywords ?? []}
                edit={edit}
                setItem={(c, ki, v) => {
                  ;(c.skills[i].keywords ??= [])[ki] = v
                }}
                onAdd={() =>
                  edit((c) => {
                    ;(c.skills[i].keywords ??= []).push('')
                  })
                }
                onRemove={(ki) =>
                  edit((c) => {
                    c.skills[i].keywords?.splice(ki, 1)
                  })
                }
                onPruneEmpty={() =>
                  edit((c) => {
                    c.skills[i].keywords = (c.skills[i].keywords ?? []).filter((k) => (k || '').trim().length > 0)
                  })
                }
                onMove={(from, to) =>
                  edit((c) => {
                    const list = (c.skills[i].keywords ??= [])
                    const [moved] = list.splice(from, 1)
                    list.splice(to, 0, moved)
                  })
                }
                listId={s.id}
                onAdopt={(fromId, fromIndex, text, toIndex) =>
                  edit((c) => {
                    // Take it out of the group it came from and put it in this
                    // one. Removing by INDEX and checking the text still matches:
                    // the index is what the drag captured, and the text is what
                    // proves the list has not changed under it.
                    const src = c.skills.find((g) => g.id === fromId)
                    if (!src?.keywords) return
                    const at = src.keywords[fromIndex] === text ? fromIndex : src.keywords.indexOf(text)
                    if (at < 0) return
                    src.keywords.splice(at, 1)
                    const dest = (c.skills[i].keywords ??= [])
                    dest.splice(Math.min(toIndex, dest.length), 0, text)
                  })
                }
              />
            ) : hasKeywords && chipStyle ? (
              <Chips items={s.keywords!} />
            ) : hasKeywords ? (
              <span className="rm-skill-inline">
                {stacked || !s.name ? '' : ': '}
                <KeywordList items={s.keywords!} sep=" · " />
              </span>
            ) : null}
            <ItemMove edit={edit} sectionKey="skills" id={s.id} label={ADD_LABEL.skills} />
            <ItemDelete edit={edit} sectionKey="skills" id={s.id} label={ADD_LABEL.skills} />
          </div>
        )
      })}
    </>
  )
}

function Languages({
  doc,
  edit,
  opts,
}: {
  doc: ResumeDocument
  config: TemplateConfig
  edit?: EditFn
  opts?: SecOpts
}) {
  const prof = (opts?.meterStyle ?? doc.metadata.typography.proficiency) as ProfStyle
  const meter = prof === 'dots' || prof === 'bars' || prof === 'stars'
  return (
    <>
      {doc.content.languages.map((l, i) => {
        if (!edit && !anyText(l.language)) return null
        return (
          <div className="rm-mini" key={l.id} data-item-id={l.id}>
            {meter && typeof l.rating === 'number' ? (
              <div className="rm-level">
                {edit ? (
                  <Ed
                    edit={edit}
                    value={l.language}
                    apply={(c, v) => {
                      c.languages[i].language = v
                    }}
                    className="rm-mini-title"
                    placeholder="Language"
                  />
                ) : (
                  <span className="rm-mini-title">{l.language}</span>
                )}
                <Proficiency rating={l.rating} style={prof} />
              </div>
            ) : (
              <div className="rm-item-head">
                <Ed
                  edit={edit}
                  value={l.language}
                  apply={(c, v) => {
                    c.languages[i].language = v
                  }}
                  className="rm-mini-title"
                  placeholder="Language"
                />
                {prof !== 'none' && (edit || l.fluency) ? (
                  <Ed
                    edit={edit}
                    value={l.fluency}
                    apply={(c, v) => {
                      c.languages[i].fluency = v
                    }}
                    className="rm-mini-sub"
                    placeholder="Fluency"
                  />
                ) : null}
              </div>
            )}
            <ItemMove edit={edit} sectionKey="languages" id={l.id} label={ADD_LABEL.languages} />
            <ItemDelete edit={edit} sectionKey="languages" id={l.id} label={ADD_LABEL.languages} />
          </div>
        )
      })}
    </>
  )
}

function Certificates({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.certificates.map((cert, i) => {
        if (!edit && !anyText(cert.name, cert.issuer)) return null
        return (
          <div className="rm-mini" key={cert.id} data-item-id={cert.id}>
            <div className="rm-item-head">
              <span className="rm-mini-title">
                {edit ? (
                  <Ed
                    edit={edit}
                    value={cert.name}
                    apply={(c, v) => {
                      c.certificates[i].name = v
                    }}
                    placeholder="Certificate"
                  />
                ) : safeHref(cert.url) ? (
                  <a href={safeHref(cert.url)}>{cert.name}</a>
                ) : (
                  cert.name
                )}
              </span>
              {edit || cert.date ? (
                <span className="rm-item-date">
                  {singleDate(edit, true, cert.date, (c, v) => {
                    c.certificates[i].date = v
                  })}
                </span>
              ) : null}
            </div>
            {edit || cert.issuer ? (
              <Ed
                edit={edit}
                value={cert.issuer}
                apply={(c, v) => {
                  c.certificates[i].issuer = v
                }}
                className="rm-mini-sub"
                placeholder="Issuer"
              />
            ) : null}
            <ItemMove edit={edit} sectionKey="certificates" id={cert.id} label={ADD_LABEL.certificates} />
            <ItemDelete edit={edit} sectionKey="certificates" id={cert.id} label={ADD_LABEL.certificates} />
          </div>
        )
      })}
    </>
  )
}

function Awards({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.awards.map((a, i) => {
        if (!edit && !anyText(a.title, a.awarder, a.summary)) return null
        return (
          <div className="rm-mini" key={a.id} data-item-id={a.id}>
            <div className="rm-item-head">
              <Ed
                edit={edit}
                value={a.title}
                apply={(c, v) => {
                  c.awards[i].title = v
                }}
                className="rm-mini-title"
                placeholder="Award"
              />
              {edit || a.date ? (
                <span className="rm-item-date">
                  {singleDate(edit, true, a.date, (c, v) => {
                    c.awards[i].date = v
                  })}
                </span>
              ) : null}
            </div>
            {edit || a.awarder ? (
              <Ed
                edit={edit}
                value={a.awarder}
                apply={(c, v) => {
                  c.awards[i].awarder = v
                }}
                className="rm-mini-sub"
                placeholder="Awarder"
              />
            ) : null}
            {has(a.summary) ? <RichText html={a.summary} /> : null}
            <ItemMove edit={edit} sectionKey="awards" id={a.id} label={ADD_LABEL.awards} />
            <ItemDelete edit={edit} sectionKey="awards" id={a.id} label={ADD_LABEL.awards} />
          </div>
        )
      })}
    </>
  )
}

function Publications({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.publications.map((p, i) => {
        if (!edit && !anyText(p.name, p.publisher, p.summary)) return null
        return (
          <div className="rm-mini" key={p.id} data-item-id={p.id}>
            <div className="rm-item-head">
              <span className="rm-mini-title">
                {edit ? (
                  <Ed
                    edit={edit}
                    value={p.name}
                    apply={(c, v) => {
                      c.publications[i].name = v
                    }}
                    placeholder="Title"
                  />
                ) : safeHref(p.url) ? (
                  <a href={safeHref(p.url)}>{p.name}</a>
                ) : (
                  p.name
                )}
              </span>
              {edit || p.releaseDate ? (
                <span className="rm-item-date">
                  {singleDate(edit, true, p.releaseDate, (c, v) => {
                    c.publications[i].releaseDate = v
                  })}
                </span>
              ) : null}
            </div>
            {edit || p.publisher ? (
              <Ed
                edit={edit}
                value={p.publisher}
                apply={(c, v) => {
                  c.publications[i].publisher = v
                }}
                className="rm-mini-sub"
                placeholder="Publisher"
              />
            ) : null}
            {has(p.summary) ? <RichText html={p.summary} /> : null}
            <ItemMove edit={edit} sectionKey="publications" id={p.id} label={ADD_LABEL.publications} />
            <ItemDelete edit={edit} sectionKey="publications" id={p.id} label={ADD_LABEL.publications} />
          </div>
        )
      })}
    </>
  )
}

function Volunteer({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.volunteer.map((v, i) => {
        if (!edit && !anyText(v.position, v.organization, v.summary, v.highlights)) return null
        return (
          <article
            className={`rm-item rm-keep${markClass(v.logo, entryBadgeOn(v, opts) ? badgeLetter(v.organization || v.position) : undefined)}`}
            key={v.id}
            data-item-id={v.id}
          >
            <ItemHead
              opts={opts}
              badge={entryBadgeOn(v, opts) ? badgeLetter(v.organization || v.position) : undefined}
              href={safeHref(v.url)}
              setHref={(c, val) => {
                c.volunteer[i].url = val
              }}
              linkLabel={v.organization || v.position}
              logo={v.logo}
              edit={edit}
              setLogo={(c, val) => {
                c.volunteer[i].logo = val
              }}
              title={
                <Ed
                  edit={edit}
                  value={v.position}
                  apply={(c, val) => {
                    c.volunteer[i].position = val
                  }}
                  placeholder="Role"
                />
              }
              date={rangeDate(
                edit,
                show(opts?.showDates),
                v.startDate,
                v.endDate,
                (c, val) => {
                  c.volunteer[i].startDate = val
                },
                (c, val) => {
                  c.volunteer[i].endDate = val
                }
              )}
            />
            {edit || v.organization ? (
              <div className="rm-item-sub">
                <Ed
                  edit={edit}
                  value={v.organization}
                  apply={(c, val) => {
                    c.volunteer[i].organization = val
                  }}
                  className="rm-item-org"
                  placeholder="Organization"
                />
              </div>
            ) : null}
            {has(v.summary) ? <RichText html={v.summary} /> : null}
            {show(opts?.showBullets) ? (
              <Bullets
                items={v.highlights}
                edit={edit}
                setItem={(c, bi, val) => {
                  c.volunteer[i].highlights[bi] = val
                }}
                onAdd={
                  edit
                    ? () =>
                        edit((c) => {
                          c.volunteer[i].highlights.push('')
                        })
                    : undefined
                }
                onRemove={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.volunteer[i].highlights.splice(bi, 1)
                        })
                    : undefined
                }
                onInsertAfter={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.volunteer[i].highlights.splice(bi + 1, 0, '')
                        })
                    : undefined
                }
                onPruneEmpty={
                  edit
                    ? () =>
                        edit((c) => {
                          c.volunteer[i].highlights = c.volunteer[i].highlights.filter(
                            (h) => htmlToText(h).trim().length > 0
                          )
                        })
                    : undefined
                }
              />
            ) : null}
            <ItemMove edit={edit} sectionKey="volunteer" id={v.id} label={ADD_LABEL.volunteer} />
            <ItemDelete edit={edit} sectionKey="volunteer" id={v.id} label={ADD_LABEL.volunteer} />
          </article>
        )
      })}
    </>
  )
}

function Interests({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.interests.map((it, i) => {
        if (!edit && !anyText(it.name, it.keywords)) return null
        return (
          <div className="rm-mini" key={it.id} data-item-id={it.id}>
            <Ed
              edit={edit}
              value={it.name}
              apply={(c, v) => {
                c.interests[i].name = v
              }}
              className="rm-mini-title"
              placeholder="Interest"
            />
            {edit ? (
              <EditableChips
                items={it.keywords ?? []}
                edit={edit}
                setItem={(c, ki, v) => {
                  ;(c.interests[i].keywords ??= [])[ki] = v
                }}
                onAdd={() =>
                  edit((c) => {
                    ;(c.interests[i].keywords ??= []).push('')
                  })
                }
                onRemove={(ki) =>
                  edit((c) => {
                    c.interests[i].keywords?.splice(ki, 1)
                  })
                }
                onPruneEmpty={() =>
                  edit((c) => {
                    c.interests[i].keywords = (c.interests[i].keywords ?? []).filter((k) => (k || '').trim().length > 0)
                  })
                }
                addLabel="+ keyword"
                placeholder="Keyword"
              />
            ) : it.keywords?.length ? (
              <span className="rm-skill-inline">
                {' '}
                — <KeywordList items={it.keywords} sep=", " />
              </span>
            ) : null}
            <ItemMove edit={edit} sectionKey="interests" id={it.id} label={ADD_LABEL.interests} />
            <ItemDelete edit={edit} sectionKey="interests" id={it.id} label={ADD_LABEL.interests} />
          </div>
        )
      })}
    </>
  )
}

function References({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.references.map((r, i) => {
        if (!edit && !anyText(r.name, r.reference)) return null // blank rows never print
        return (
          <div className="rm-mini" key={r.id} data-item-id={r.id}>
            <Ed
              edit={edit}
              as="div"
              value={r.name}
              apply={(c, v) => {
                c.references[i].name = v
              }}
              className="rm-mini-title"
              placeholder="Name"
            />
            {edit || r.reference ? (
              <Ed
                edit={edit}
                as="div"
                value={r.reference}
                apply={(c, v) => {
                  c.references[i].reference = v
                }}
                className="rm-mini-sub"
                placeholder="“Available on request”"
              />
            ) : null}
            <ItemMove edit={edit} sectionKey="references" id={r.id} label={ADD_LABEL.references} />
            <ItemDelete edit={edit} sectionKey="references" id={r.id} label={ADD_LABEL.references} />
          </div>
        )
      })}
    </>
  )
}

function Custom({
  doc,
  sectionKey,
  edit,
  opts,
}: {
  doc: ResumeDocument
  sectionKey: string
  edit?: EditFn
  opts?: SecOpts
}) {
  const id = sectionKey.slice('custom-'.length)
  const secIndex = doc.content.custom.findIndex((c) => c.id === id)
  const sec = doc.content.custom[secIndex]
  if (!sec) return null
  return (
    <>
      {sec.items.map((it, i) => {
        if (!edit && !anyText(it.name, it.subtitle, it.summary, it.highlights)) return null
        return (
          <article className="rm-item rm-keep" key={it.id} data-item-id={it.id}>
            <ItemHead
              opts={opts}
              badge={opts?.showBadges ? badgeLetter(it.name || it.subtitle) : undefined}
              // A custom item carries a url like every other entry, so it gets
              // the same link treatment rather than a field nothing could set.
              href={safeHref(it.url)}
              setHref={(c, val) => {
                c.custom[secIndex].items[i].url = val
              }}
              linkLabel={it.name || it.subtitle}
              edit={edit}
              title={
                <Ed
                  edit={edit}
                  value={it.name}
                  apply={(c, v) => {
                    c.custom[secIndex].items[i].name = v
                  }}
                  placeholder="Title"
                />
              }
              date={singleDate(edit, show(opts?.showDates), it.date ?? '', (c, v) => {
                c.custom[secIndex].items[i].date = v
              })}
            />
            {edit || it.subtitle || it.location ? (
              <div className="rm-item-sub">
                <Ed
                  edit={edit}
                  value={it.subtitle ?? ''}
                  apply={(c, v) => {
                    c.custom[secIndex].items[i].subtitle = v
                  }}
                  className="rm-item-org"
                  placeholder="Subtitle"
                />
                {show(opts?.showLocation) && (edit || it.location) ? (
                  <Ed
                    edit={edit}
                    value={it.location ?? ''}
                    apply={(c, v) => {
                      c.custom[secIndex].items[i].location = v
                    }}
                    className="rm-item-loc"
                    placeholder="Location"
                  />
                ) : null}
              </div>
            ) : null}
            {has(it.summary) ? (
              <Ed
                edit={edit}
                value={it.summary ?? ''}
                rich
                multiline
                as="div"
                apply={(c, v) => {
                  c.custom[secIndex].items[i].summary = v
                }}
                placeholder="Description"
              />
            ) : null}
            {show(opts?.showBullets) ? (
              <Bullets
                items={it.highlights ?? []}
                edit={edit}
                setItem={(c, bi, v) => {
                  c.custom[secIndex].items[i].highlights[bi] = v
                }}
                onAdd={
                  edit
                    ? () =>
                        edit((c) => {
                          ;(c.custom[secIndex].items[i].highlights ??= []).push('')
                        })
                    : undefined
                }
                onRemove={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          c.custom[secIndex].items[i].highlights?.splice(bi, 1)
                        })
                    : undefined
                }
                onInsertAfter={
                  edit
                    ? (bi) =>
                        edit((c) => {
                          ;(c.custom[secIndex].items[i].highlights ??= []).splice(bi + 1, 0, '')
                        })
                    : undefined
                }
                onPruneEmpty={
                  edit
                    ? () =>
                        edit((c) => {
                          const a = c.custom[secIndex].items[i].highlights
                          if (a)
                            c.custom[secIndex].items[i].highlights = a.filter((h) => htmlToText(h).trim().length > 0)
                        })
                    : undefined
                }
              />
            ) : null}
            <ItemDelete edit={edit} sectionKey={sectionKey} id={it.id} label={ADD_LABEL[sectionKey] ?? 'entry'} />
          </article>
        )
      })}
    </>
  )
}

/** Canvas-only "+ Add <entry>" row, mirroring the Bullets add-row. Lets the user
 *  add the first/next item to a section directly on the page (never printed). */
function AddEntry({ sectionKey, edit }: { sectionKey: string; edit: EditFn }) {
  const label = ADD_LABEL[sectionKey] ?? 'entry'
  return (
    <div className="rm-add-entry-row no-print" contentEditable={false}>
      <button
        type="button"
        className="rm-add-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => edit((c) => pushNewItem(c, sectionKey))}
        title={`Add ${label}`}
      >
        + Add {label}
      </button>
    </div>
  )
}

/** Discoverability hint under a section that hasn't got real content yet — the
 *  ghost placeholder text (Title, Publisher, …) looks like a normal entry, so
 *  this makes clear it's not what will show up in the exported PDF. Canvas-only,
 *  one muted line, never affects layout in print/thumbnail (no `edit` there). */
function EmptyHint() {
  return (
    <p className="rm-empty-hint no-print" contentEditable={false}>
      Empty sections are not exported
    </p>
  )
}

function sectionRenderer(
  sectionKey: string,
  doc: ResumeDocument,
  config: TemplateConfig,
  edit?: EditFn,
  opts?: SecOpts
): ReactNode {
  switch (sectionKey) {
    case 'summary':
      return <Summary doc={doc} edit={edit} />
    case 'work':
      return <Work doc={doc} edit={edit} opts={opts} />
    case 'education':
      return <Education doc={doc} edit={edit} opts={opts} />
    case 'projects':
      return <Projects doc={doc} edit={edit} opts={opts} />
    case 'skills':
      return <Skills doc={doc} config={config} edit={edit} opts={opts} />
    case 'languages':
      return <Languages doc={doc} config={config} edit={edit} opts={opts} />
    case 'certificates':
      return <Certificates doc={doc} edit={edit} />
    case 'awards':
      return <Awards doc={doc} edit={edit} />
    case 'publications':
      return <Publications doc={doc} edit={edit} />
    case 'volunteer':
      return <Volunteer doc={doc} edit={edit} opts={opts} />
    case 'interests':
      return <Interests doc={doc} edit={edit} />
    case 'references':
      return <References doc={doc} edit={edit} />
    default:
      if (sectionKey.startsWith('custom-')) return <Custom doc={doc} sectionKey={sectionKey} edit={edit} opts={opts} />
      return null
  }
}

/** Render the body of any section by key. */
export function SectionBody({
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
  const saved = doc.metadata.layout.sectionSettings?.[sectionKey]
  // An empty value clears the override so the template's own choice returns -
  // storing '' instead would pin the section to a size no template asked for.
  const setBadge = editMeta
    ? (key: 'badgeSize' | 'badgeShape', v: string) =>
        editMeta((m) => {
          const ss = ((m.layout.sectionSettings ??= {})[sectionKey] ??= {}) as Record<string, unknown>
          if (v) ss[key] = v
          else delete ss[key]
        })
    : undefined
  const opts: SecOpts = { ...(saved ?? {}), setBadge, linksClickable: doc.metadata.links?.clickable !== false }
  const body = sectionRenderer(sectionKey, doc, config, edit, opts)
  // Summary is a single field (always editable); every other section is a list,
  // so offer an inline "+ Add" affordance on the canvas (edit mode only).
  const canAdd = !!edit && sectionKey !== 'summary'
  if (!canAdd) return body
  return (
    <>
      {body}
      {!sectionHasContent(sectionKey, doc.content) ? <EmptyHint /> : null}
      <AddEntry sectionKey={sectionKey} edit={edit} />
    </>
  )
}
