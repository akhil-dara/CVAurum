import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useT } from '@/i18n'

/**
 * The right-hand buttons of the public header on a phone, shaped by who is
 * visiting.
 *
 * A phone header has room for the logo and about three buttons (measured at
 * 360px: 40px to spare with theme, Create and the menu). Someone who has
 * saved resumes came back for them, and "My resumes" sat only inside the
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
  const t = useT()
  if (!n) return null
  return (
    // No icon and the count as a small badge: with them written out the
    // button measured 142px and pushed a 360px page sideways.
    <Link
      className="btn-outline btn-sm gap-1.5 whitespace-nowrap px-2 sm:hidden"
      to="/app"
      aria-label={`${t('common.myResumes')}, ${n}`}
    >
      <span aria-hidden>{t('common.myResumes')}</span>
      <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-4 text-primary-foreground tabular-nums" aria-hidden>
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

/** The language switch, with the same budget rule as the theme switch: on a
 *  phone that also carries "My resumes" both move into the menu sheet, which
 *  lists them as rows. */
export function HeaderLanguageToggle() {
  const n = useSavedCount()
  return <LanguageToggle className={n ? 'btn-icon hidden sm:inline-flex' : 'btn-icon'} />
}

/** Create, as a word where there is room for one and as its icon where
 *  "My resumes" needs the room. Its name is always "Create resume". */
export function CreateButton({ onClick }: { onClick: () => void }) {
  const n = useSavedCount()
  const t = useT()
  const label = t('common.createResume')
  // Persian says it in two words; the split English label ("Create" alone on a
  // phone) is an English-only saving, so it is used for English alone.
  const [first, ...rest] = label.split(' ')
  return (
    <button className={`btn-primary btn-sm${n ? ' px-2.5 sm:px-3' : ''}`} onClick={onClick} aria-label={label}>
      <Plus className="h-4 w-4" aria-hidden />
      <span className={n ? 'hidden sm:inline' : ''} aria-hidden>
        {first}
        {rest.length > 0 && <span className="hidden sm:inline"> {rest.join(' ')}</span>}
      </span>
    </button>
  )
}
