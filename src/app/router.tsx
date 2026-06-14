import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { Landing } from '@/routes/Landing'

// Heavy routes are code-split so the homepage loads instantly.
const Dashboard = lazy(() => import('@/routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const EditorRoute = lazy(() => import('@/routes/EditorRoute').then((m) => ({ default: m.EditorRoute })))
const Tracker = lazy(() => import('@/routes/Tracker').then((m) => ({ default: m.Tracker })))
const PrintPage = lazy(() => import('@/routes/PrintPage').then((m) => ({ default: m.PrintPage })))

function Loader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

const s = (el: ReactNode) => <Suspense fallback={<Loader />}>{el}</Suspense>

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/app', element: s(<Dashboard />) },
      { path: '/resume/:id', element: s(<EditorRoute />) },
      { path: '/tracker', element: s(<Tracker />) },
    ],
  },
  // Standalone, chrome-free page used for native "Save as PDF".
  { path: '/print/:id', element: s(<PrintPage />) },
])
