/**
 * The public site's phone menu.
 *
 * Below `md` the header's <nav> is display:none and the row keeps only the
 * logo, the theme switch and the two buttons — so on a 375px phone /templates
 * offered no way to /prompts or /examples but the footer. This is the button
 * that opens the rest, and the sheet it opens.
 *
 * It is one component on purpose: the landing page keeps its own copy of the
 * header markup (its bar wears ink glass while the hero is under it, which the
 * shared header knows nothing about), and a menu written twice is a menu that
 * loses a destination in one of the two the next time one is added.
 *
 * Shape, and why:
 *  - the button is 44x44 with `-my-1`, so the target is a finger's and the
 *    header row still measures 60px. /prompts anchors its sections with
 *    `scroll-mt-16` (64px); a 68px header would have parked every linked
 *    heading under the bar.
 *  - the scrim is flat `bg-black/60`. A full-screen `backdrop-filter` blur was
 *    measured in this repo at 15 fps, and there is nothing behind this one
 *    worth reading through.
 *  - the panel stops short of the left edge, leaving a strip of scrim to tap:
 *    a sheet that reaches edge to edge has no backdrop left to dismiss it with
 *    (measured on the lightbox at 375x812, where every "outside" tap landed on
 *    the panel).
 *  - Escape, the focus trap and the scroll lock follow PageLightbox rather
 *    than inventing a second set of rules for the same job.
 */
import { useEffect, useRef, useState, Fragment, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Menu as MenuIcon, Moon, Sun, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { siteMenuItems, type SiteMenuItem, type SiteMenuSection } from './siteNav'

const SHEET_ID = 'site-menu-sheet'
const TITLE_ID = 'site-menu-title'

/** Everything a keyboard can land on. An element inside a `hidden` parent is
 *  display:none and never focusable, which is what offsetParent filters out. */
function focusables(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement)
}

export function SiteMenuButton({
  current = null,
  repoUrl,
  onCreate,
}: {
  current?: SiteMenuSection
  repoUrl: string
  /** Given only where the header itself shows a Create button. */
  onCreate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const library = useAppStore((s) => s.library)
  const items = siteMenuItems({ current, repoUrl, libraryCount: library.length, canCreate: Boolean(onCreate) })

  return (
    <>
      <button
        ref={button}
        type="button"
        // btn-ghost so the landing's hero bar, which repaints its ghost
        // buttons white, repaints this one too.
        className="btn-ghost -my-1 h-11 w-11 p-0 md:hidden"
        aria-label={open ? 'Close menu' : 'Menu'}
        aria-expanded={open}
        aria-controls={SHEET_ID}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>
      {open && (
        <SiteMenuSheet items={items} onCreate={onCreate} onClose={() => setOpen(false)} restoreTo={button} />
      )}
    </>
  )
}

function SiteMenuSheet({
  items,
  onCreate,
  onClose,
  restoreTo,
}: {
  items: SiteMenuItem[]
  onCreate?: () => void
  onClose: () => void
  restoreTo: RefObject<HTMLElement | null>
}) {
  const panel = useRef<HTMLDivElement>(null)

  // Focus goes in on open and comes back to the button on close — a reader who
  // opened this with a keyboard is otherwise dropped at the top of the page.
  useEffect(() => {
    const first = panel.current ? focusables(panel.current)[0] : null
    ;(first ?? panel.current)?.focus()
    return () => {
      const el = restoreTo.current
      if (el && document.contains(el)) el.focus()
    }
  }, [restoreTo])

  // The page behind must not scroll under the sheet.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // At `md` the real nav comes back and this button is display:none. Closing on
  // the way past that width keeps a rotated phone from leaving a sheet nobody
  // can see — with the page's scroll still locked behind it.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)')
    if (wide.matches) onClose()
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) onClose()
    }
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab' && panel.current) {
        const ring = focusables(panel.current)
        if (!ring.length) return
        const first = ring[0]
        const last = ring[ring.length - 1]
        const here = document.activeElement
        if (e.shiftKey && (here === first || here === panel.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && here === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    // Capture, so the topmost surface is the one Escape closes.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        id={SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-border bg-background shadow-float outline-none animate-slide-up"
      >
        {/* Same 60px as the header row it covers, so the close sits where the
            button that opened it was. */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
          <h2 id={TITLE_ID} className="text-sm font-semibold text-foreground">
            Menu
          </h2>
          <button type="button" className="btn-ghost h-11 w-11 p-0" aria-label="Close menu" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Site">
          {items.map((item, i) => (
            <Fragment key={item.key}>
              {i > 0 && items[i - 1].group !== item.group && <div className="my-1.5 border-t border-border" />}
              <MenuRow item={item} onCreate={onCreate} onClose={onClose} />
            </Fragment>
          ))}
          <div className="my-1.5 border-t border-border" />
          <ThemeRow />
        </nav>
      </div>
    </div>,
    document.body
  )
}

/** The theme switch as a row. On a phone with saved résumés the header gives
 *  the switch's place to "My resumes" (HeaderActions.tsx), so it lives here
 *  for everyone on a phone. */
function ThemeRow() {
  const theme = useAppStore((s) => s.settings.theme)
  const update = useAppStore((s) => s.updateSettings)
  const isDark =
    theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  return (
    <button type="button" className={cn(ROW, REST, 'text-left')} role="switch" aria-checked={isDark} onClick={() => update({ theme: isDark ? 'light' : 'dark' })}>
      <span className="truncate">Dark mode</span>
      {isDark ? <Moon className="h-4 w-4 text-primary" aria-hidden /> : <Sun className="h-4 w-4 text-muted-foreground" aria-hidden />}
    </button>
  )
}

/** 48px, edge to edge of the sheet: a row a thumb cannot miss. */
const ROW = 'flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg px-3 text-[15px] transition'
const REST = 'text-foreground hover:bg-muted active:bg-muted'

function MenuRow({
  item,
  onCreate,
  onClose,
}: {
  item: SiteMenuItem
  onCreate?: () => void
  onClose: () => void
}) {
  const trail = (
    <span className="flex shrink-0 items-center gap-2">
      {item.note && <span className="text-xs tabular-nums text-muted-foreground">{item.note}</span>}
      {item.external && <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
      {item.active && <Check className="h-4 w-4 text-primary" aria-hidden />}
    </span>
  )

  // The page you are already on, marked the way the desk nav marks it:
  // `aria-current` on something that is not a link, because a link that goes
  // nowhere is a link a screen reader still offers to follow.
  if (item.active) {
    return (
      <div className={cn(ROW, 'bg-muted font-medium text-foreground')} aria-current="page">
        <span className="truncate">{item.label}</span>
        {trail}
      </div>
    )
  }

  if (item.action) {
    return (
      <button
        type="button"
        className={cn(ROW, REST, 'text-left font-medium')}
        onClick={() => {
          onClose()
          onCreate?.()
        }}
      >
        <span className="truncate">{item.label}</span>
        {trail}
      </button>
    )
  }

  if (item.to) {
    return (
      <Link className={cn(ROW, REST)} to={item.to} onClick={onClose}>
        <span className="truncate">{item.label}</span>
        {trail}
      </Link>
    )
  }

  return (
    <a
      className={cn(ROW, REST)}
      href={item.href}
      onClick={onClose}
      {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      <span className="truncate">{item.label}</span>
      {trail}
    </a>
  )
}
