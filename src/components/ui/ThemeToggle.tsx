import { Moon, Sun, Monitor } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const ORDER = ['system', 'light', 'dark'] as const
const ICON = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle() {
  const theme = useAppStore((s) => s.settings.theme)
  const update = useAppStore((s) => s.updateSettings)
  const Icon = ICON[theme]
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  return (
    <button
      className="btn-icon"
      onClick={() => update({ theme: next })}
      title={`Theme: ${theme} — click for ${next}`}
      aria-label={`Switch theme (currently ${theme})`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  )
}
