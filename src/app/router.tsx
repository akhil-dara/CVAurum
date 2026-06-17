import { Component, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, useRouteError } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { Landing } from '@/routes/Landing'

const RELOAD_KEY = 'cvaurum:chunk-reload'

async function withRetry<T>(fn: () => Promise<T>, times: number, delayMs: number): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i <= times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (i < times) await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw lastErr
}

/**
 * Code-split a route, but survive a failed chunk fetch — the #1 "white screen /
 * JS error" new users hit. It happens when a dynamic import can't be retrieved:
 * a flaky mobile network, or (most often) a fresh deploy that renamed the hashed
 * chunks the already-loaded page is still asking for. We retry briefly, then do
 * ONE hard reload to pick up the new asset manifest. The session guard prevents
 * a reload loop; if it still fails, the error boundary shows a friendly retry.
 */
function lazyRoute<T extends { default: ComponentType<unknown> }>(factory: () => Promise<T>) {
  return lazy(async () => {
    try {
      const mod = await withRetry(factory, 2, 350)
      sessionStorage.removeItem(RELOAD_KEY)
      return mod
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise<T>(() => {}) // never resolves — the page is reloading
      }
      throw err
    }
  })
}

// Heavy routes are code-split so the homepage loads instantly.
const Dashboard = lazyRoute(() => import('@/routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const EditorRoute = lazyRoute(() => import('@/routes/EditorRoute').then((m) => ({ default: m.EditorRoute })))
const Tracker = lazyRoute(() => import('@/routes/Tracker').then((m) => ({ default: m.Tracker })))
const PrintPage = lazyRoute(() => import('@/routes/PrintPage').then((m) => ({ default: m.PrintPage })))

function Loader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

function FailedToLoad() {
  const reload = () => {
    sessionStorage.removeItem(RELOAD_KEY)
    window.location.reload()
  }
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-lg font-semibold">This part didn’t load</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        A piece of the app failed to download — usually a network hiccup or a fresh update. Reloading fixes it. Your saved
        resumes are safe in this browser.
      </p>
      <button className="btn-primary" onClick={reload}>
        Reload
      </button>
    </div>
  )
}

/** Catches render/chunk errors under a route and offers a clean reload instead
 *  of a blank screen. */
class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Route failed to load:', error)
  }
  render() {
    return this.state.failed ? <FailedToLoad /> : this.props.children
  }
}

const s = (el: ReactNode) => (
  <RouteErrorBoundary>
    <Suspense fallback={<Loader />}>{el}</Suspense>
  </RouteErrorBoundary>
)

/** Router-level catch-all. If anything escapes to React Router (so it would
 *  otherwise show its raw "Unexpected Application Error!"), auto-reload once on
 *  a chunk-load failure, else show the friendly fallback. */
function RouteError() {
  const err = useRouteError()
  const msg = err instanceof Error ? err.message : String(err ?? '')
  const isChunk = /dynamically imported module|importing a module|failed to fetch|loading chunk|\.js/i.test(msg)
  useEffect(() => {
    if (isChunk && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    }
  }, [isChunk])
  return <FailedToLoad />
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/app', element: s(<Dashboard />) },
      { path: '/resume/:id', element: s(<EditorRoute />) },
      { path: '/tracker', element: s(<Tracker />) },
    ],
  },
  // Standalone, chrome-free page used for native "Save as PDF".
  { path: '/print/:id', element: s(<PrintPage />), errorElement: <RouteError /> },
])
