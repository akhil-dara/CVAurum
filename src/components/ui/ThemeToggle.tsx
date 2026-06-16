import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

/**
 * A plain, unambiguous light/dark switch. We resolve the current effective mode
 * (honouring the OS when the saved setting is still "system") and show the icon
 * of the mode you'll switch TO — Moon while light, Sun while dark. No three-way
 * cycle and no "monitor" glyph, which read as confusing.
 */
export function ThemeToggle() {
  const theme = useAppStore((s) => s.settings.theme)
  const update = useAppStore((s) => s.updateSettings)
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  return (
    <button
      className="btn-icon"
      onClick={() => update({ theme: isDark ? 'light' : 'dark' })}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
