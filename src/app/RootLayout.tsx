import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Toaster } from '@/components/ui/Toaster'

export function RootLayout() {
  const init = useAppStore((s) => s.init)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    init().finally(() => {
      setReady(true)
      document.getElementById('boot-splash')?.remove()
    })
    // Re-apply theme when the system preference changes (theme: 'system').
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => useAppStore.getState().applyTheme()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [init])

  if (!ready) return null

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}
