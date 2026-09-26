import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * The right-hand buttons of the public header on a phone, shaped by who is
 * visiting.
 *
 * A phone header has room for the logo and about three buttons (measured at
 * 360px: 40px to spare with theme, Create and the menu). Someone who has
 * saved résumés came back for them, and "My resumes" sat only inside the
 * menu, where people did not find it (reported 2026-09-26). So for them the
 * row becomes: My resumes, Create as its icon alone, the menu; the theme
 * switch moves into the menu. A first visit keeps theme, Create and the menu.
 * From `sm` up nothing changes.
 *
 * One module for the landing page's own header and the shared one, which
 * otherwise drift.
 */
export function useSavedCount(): number {
  return useAppStore((s) => s.library.length)
}

/** "My resumes" on a phone, for someone who has any. */
export function PhoneResumesLink() {
  const n = useSavedCount()
  if (!n) return null
  return (
    // No icon and the count as a small badge: with them written out the
    // button measured 142px and pushed a 360px page sideways.
    <Link className="btn-outline btn-sm gap-1.5 whitespace-nowrap px-2 sm:hidden" to="/app" aria-label={`My resumes, ${n} saved`}>
      <span aria-hidden>My resumes</span>
      <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums" aria-hidden>
        {n}
      </span>
    </Link>
  )
}

/** The theme switch, which gives its place to "My resumes" on a phone. */
export function HeaderThemeToggle() {
  const n = useSavedCount()
  return <ThemeToggle className={n ? 'btn-icon hidden sm:inline-flex' : 'btn-icon'} />
}

/** Create, as a word where there is room for one and as its icon where
 *  "My resumes" needs the room. Its name is always "Create resume". */
export function CreateButton({ onClick }: { onClick: () => void }) {
  const n = useSavedCount()
  return (
    <button className={`btn-primary btn-sm${n ? ' px-2.5 sm:px-3' : ''}`} onClick={onClick} aria-label="Create resume">
      <Plus className="h-4 w-4" aria-hidden />
      <span className={n ? 'hidden sm:inline' : ''} aria-hidden>
        Create<span className="hidden sm:inline"> resume</span>
      </span>
    </button>
  )
}
