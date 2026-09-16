/**
 * The header and footer every public page outside the app wears.
 *
 * They were copied between the gallery and the design page, so a nav link
 * added to one was missing from the other; a third and fourth public page
 * would have made four copies of the same markup and four places to keep a
 * link in step. One component, one nav.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { InstallButton } from '@/components/ui/InstallButton'
import { SiteMenuButton } from './SiteMenu'
import { cn } from '@/lib/utils'

export const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** Which public page the reader is on, so its nav item says so. */
export type SiteSection = 'templates' | 'examples' | 'prompts' | null

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return active ? (
    // `aria-current` rather than a link to the page already open: a link that
    // goes nowhere is a link a screen reader still offers to follow.
    <span className="font-medium text-foreground" aria-current="page">
      {label}
    </span>
  ) : (
    <Link className="transition hover:text-foreground" to={to}>
      {label}
    </Link>
  )
}

export function SiteHeader({
  current = null,
  action,
  onCreate,
}: {
  current?: SiteSection
  action?: ReactNode
  /** What the header's own Create button does, so the phone menu can offer
   *  the same thing as a row. Pass it wherever `action` is that button. */
  onCreate?: () => void
}) {
  const library = useAppStore((s) => s.library)
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Logo to="/" />
        {/* The landing sections are fragment targets, and a client-side
            navigation to another route's fragment does not scroll to it —
            only a real one does. Those stay plain anchors so the section a
            reader asked for is the section they land on. */}
        {/* The landing anchors give way first, and the landing page still
            carries all three. That rule now costs all of them at tablet width:
            at 768px this row already wrapped to two lines and pushed the
            viewport to 838px with four items (measured before Prompts was
            added, which costs 6px more), so md keeps the three PAGES and lg
            brings the anchors back. That plus a 20px gap below lg lands the
            row at exactly 768 — one line, nothing off the edge, for the first
            time. */}
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex lg:gap-6">
          <a className="hidden transition hover:text-foreground lg:inline" href="/#how">
            How it works
          </a>
          <NavLink to="/templates" label="Templates" active={current === 'templates'} />
          <NavLink to="/examples" label="Examples" active={current === 'examples'} />
          <NavLink to="/prompts" label="Prompts" active={current === 'prompts'} />
          <a className="hidden transition hover:text-foreground lg:inline" href="/#compare">
            Compare
          </a>
          <a className="hidden transition hover:text-foreground lg:inline" href="/#privacy">
            Privacy
          </a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            className="btn-ghost btn-sm hidden sm:inline-flex"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
          >
            <Github className="h-4 w-4" /> GitHub
          </a>
          <InstallButton />
          <ThemeToggle />
          {/* Below sm this chip gives its 87px to the menu button, which lists
              "My resumes" as a row: measured at 375px, the row had 18px of
              slack left and a 44px target needs 50 of them. */}
          <Link
            className={cn('btn-sm hidden sm:inline-flex', library.length ? 'btn-outline' : 'btn-ghost')}
            to="/app"
          >
            My resumes{library.length ? ` (${library.length})` : ''}
          </Link>
          {action}
          <SiteMenuButton current={current} repoUrl={REPO_URL} onCreate={onCreate} />
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
        <span className="inline-flex items-center gap-1.5">
          <Logo compact to="/" /> · Built for everyone job hunting.
        </span>
        <span className="inline-flex flex-wrap items-center justify-center gap-3">
          <Link className="transition hover:text-foreground" to="/">
            Home
          </Link>
          <Link className="transition hover:text-foreground" to="/templates">
            Templates
          </Link>
          <Link className="transition hover:text-foreground" to="/examples">
            Examples
          </Link>
          <Link className="transition hover:text-foreground" to="/prompts">
            Prompts
          </Link>
          <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span>100% local · MIT licensed</span>
        </span>
      </div>
    </footer>
  )
}
