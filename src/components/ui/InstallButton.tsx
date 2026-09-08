import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

/**
 * "Install app" button — only renders when the browser reports the PWA is
 * installable (Chrome/Edge/Android) and it isn't already installed. Makes the
 * install one obvious tap instead of hunting in the browser menu. On a phone
 * the wording drops away and the download glyph carries it, so the button
 * cannot push the rest of a header off the screen.
 */
export function InstallButton({ className = 'btn-outline btn-sm' }: { className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt()
  if (!canInstall) return null
  return (
    <button className={className} onClick={promptInstall} title="Install CVAurum as an app" aria-label="Install app">
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install app</span>
    </button>
  )
}
