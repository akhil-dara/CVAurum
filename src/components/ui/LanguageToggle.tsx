import { useAppStore } from '@/store/useAppStore'
import { LOCALE_CHIP, useLocale, useT, type Locale } from '@/i18n'

/**
 * The interface's language switch, beside the light/dark one and built the
 * same way: a plain button in the header row whose label is the language you
 * are NOT reading ("فا" while the app is in English), so one tap says what it
 * will do. Persian also turns the whole interface right-to-left — that is the
 * document's `dir`, set by AppStore.applyAppearance, which every logical
 * utility in the app follows.
 *
 * `className` lets a cramped header ask for a phone-sized target, exactly like
 * ThemeToggle.
 */
export function LanguageToggle({ className = 'btn-icon' }: { className?: string }) {
  const locale = useLocale()
  const update = useAppStore((s) => s.updateSettings)
  const t = useT()
  const next: Locale = locale === 'fa' ? 'en' : 'fa'
  const label = t(next === 'fa' ? 'ui.switchToPersian' : 'ui.switchToEnglish')
  return (
    <button
      className={className}
      onClick={() => update({ locale: next })}
      title={label}
      aria-label={`${t('ui.language')}: ${label}`}
      lang={next}
    >
      {/* Two letters, not a globe: the chip reads at a glance, and it keeps the
          36px target the other icon buttons have. */}
      <span aria-hidden className="text-[13px] font-semibold leading-none">
        {LOCALE_CHIP[locale]}
      </span>
    </button>
  )
}
