import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useT } from '@/i18n'

/**
 * A plain, unambiguous light/dark switch. We resolve the current effective mode
 * (honouring the OS when the saved setting is still "system") and show the icon
 * of the mode you'll switch TO — Moon while light, Sun while dark. No three-way
 * cycle and no "monitor" glyph, which read as confusing.
 *
 * `className` lets a cramped header ask for a bigger phone-sized tap target
 * without changing the default everywhere else.
 */
export function ThemeToggle({ className = 'btn-icon' }: { className?: string }) {
  const theme = useAppStore((s) => s.settings.theme)
  const update = useAppStore((s) => s.updateSettings)
  const t = useT()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  const label = t(isDark ? 'ui.lightMode' : 'ui.darkMode')
  return (
    <button
      className={className}
      onClick={() => update({ theme: isDark ? 'light' : 'dark' })}
      title={label}
      aria-label={label}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
