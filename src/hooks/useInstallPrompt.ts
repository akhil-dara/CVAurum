import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallBridge {
  event: BeforeInstallPromptEvent | null
  installed: boolean
}

/** Read the prompt captured early by /public/pwa-install.js (it can fire before
 *  React mounts, so a React-only listener would miss it). */
function bridge(): InstallBridge {
  return ((window as unknown as { __cvaurumInstall?: InstallBridge }).__cvaurumInstall ??= {
    event: null,
    installed: false,
  })
}

/**
 * Wraps the `beforeinstallprompt` flow so the app can show its OWN "Install app"
 * button (Chrome/Edge/Android only — they fire this event once the PWA install
 * criteria are met). Much more discoverable than the browser's address-bar menu.
 * iOS Safari never fires it (install there is Share → Add to Home Screen).
 *
 * The event is captured at page load by the first-party /pwa-install.js script
 * and stashed on `window.__cvaurumInstall`, so this hook works even if Chrome
 * fired the prompt before React hydrated.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() => bridge().event)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone || bridge().installed) setInstalled(true)

    // Pick up a prompt the early script already captured.
    if (bridge().event) setDeferred(bridge().event)

    const onAvailable = () => setDeferred(bridge().event)
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    // Fired by the early script, and directly (belt-and-suspenders) in case it
    // arrives after the hook mounts.
    window.addEventListener('cvaurum:installable', onAvailable)
    window.addEventListener('cvaurum:installed', onInstalled)
    window.addEventListener('beforeinstallprompt', onAvailable)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('cvaurum:installable', onAvailable)
      window.removeEventListener('cvaurum:installed', onInstalled)
      window.removeEventListener('beforeinstallprompt', onAvailable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async () => {
    const evt = deferred ?? bridge().event
    if (!evt) return
    await evt.prompt()
    await evt.userChoice
    bridge().event = null
    setDeferred(null)
  }

  return { canInstall: !!deferred && !installed, promptInstall }
}
