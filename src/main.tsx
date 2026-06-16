import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './app/router'
import { ErrorBoundary } from './app/ErrorBoundary'

// A dynamically-imported chunk failed to download — the classic "random .js
// missing" a new user hits when they navigate (e.g. into /app) right after a
// deploy: the loaded page references hashed files the server no longer has.
// Vite fires this event the moment a preload/import fails; reload ONCE to pull
// the fresh asset manifest. The session guard (shared with the router's retry)
// prevents a reload loop.
window.addEventListener('vite:preloadError', (e) => {
  const KEY = 'cvaurum:chunk-reload'
  if (sessionStorage.getItem(KEY)) return
  e.preventDefault()
  sessionStorage.setItem(KEY, '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>
)
