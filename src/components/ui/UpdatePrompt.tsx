/**
 * New-version toast. The service worker used to autoUpdate, which can swap the
 * app shell mid-edit (template registry mismatch, lost final keystrokes). Now
 * the user chooses when — and the open resume is flushed to storage first.
 */
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { useResumeStore } from '@/store/useResumeStore'
import { saveDoc } from '@/lib/storage'

/** How often an open, visible tab asks whether a new version was deployed. */
const CHECK_EVERY_MS = 20 * 60 * 1000
/** The least time between two checks, however often the tab comes back. */
const CHECK_GAP_MS = 60 * 1000

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // The browser looks for a new worker only when a page loads, so a tab
    // left open never heard about a deploy (measured: an hour-old tab showed
    // nothing until it was reloaded). Ask again when the tab comes back into
    // view, and now and then while it is in view.
    onRegisteredSW(_url, reg) {
      if (!reg) return
      let last = Date.now()
      const check = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return
        if (Date.now() - last < CHECK_GAP_MS) return
        last = Date.now()
        void reg.update().catch(() => {})
      }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', check)
      window.addEventListener('focus', check)
    },
  })
  if (!needRefresh) return null
  const reload = async () => {
    const doc = useResumeStore.getState().doc
    if (doc) {
      try {
        await saveDoc(doc)
      } catch {
        /* best effort — the SW swap must not be blocked by a failed flush */
      }
    }
    void updateServiceWorker(true)
  }
  return (
    <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-border bg-surface/95 py-1.5 pl-4 pr-1.5 text-sm shadow-float backdrop-blur">
        <span>A new version of CVAurum is ready.</span>
        <button className="btn-primary btn-sm rounded-full" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
        <button className="btn-ghost btn-sm rounded-full" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </div>
  )
}
