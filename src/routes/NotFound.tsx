import { Link, useLocation } from 'react-router-dom'
import { FileText, LayoutGrid, Home } from 'lucide-react'
import { useTitle } from '@/lib/useTitle'

/**
 * The page for an address the app has no route for. Before this existed an
 * unknown path fell through to the router's error element, which told the
 * visitor "This part didn't load... reloading fixes it" - a chunk-failure
 * message for what was a wrong URL - and left the boot splash in place over
 * it (the root layout that removes the splash is not rendered for an error).
 */
export function NotFound() {
  useTitle('Page not found · CVAurum')
  const { pathname } = useLocation()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 py-16 text-center text-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">There’s nothing at this address</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">{pathname}</code> is not a page
        CVAurum has. The link may be out of date, or a character may be missing. Nothing of yours is affected: your
        résumés stay in this browser.
      </p>
      <nav className="mt-2 flex flex-wrap justify-center gap-3" aria-label="Where to go instead">
        <Link className="btn-primary btn-sm" to="/app">
          <FileText className="h-4 w-4" /> My resumes
        </Link>
        <Link className="btn-outline btn-sm" to="/templates">
          <LayoutGrid className="h-4 w-4" /> Templates
        </Link>
        <Link className="btn-ghost btn-sm" to="/">
          <Home className="h-4 w-4" /> Home
        </Link>
      </nav>
    </main>
  )
}
