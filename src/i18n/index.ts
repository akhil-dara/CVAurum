/**
 * Two languages, one interface.
 *
 * The app's own chrome (header, dashboard, editor, panels, dialogs) speaks
 * English or Persian. A RESUME is a separate thing with its own language and
 * its own direction — `metadata.layout.rtl` mirrors that one document's canvas
 * (see rtl-canvas.css) and is untouched by this: a Persian interface can hold
 * an English resume and the other way round.
 *
 * What follows from the choice is the document's own attributes, set once in
 * AppStore.applyAppearance: `lang`, `dir` (rtl for Persian) and `data-locale`,
 * which index.css keys the Persian face off. Setting `dir` on <html> is what
 * makes every logical utility in the codebase (ms/me/ps/pe, start/end,
 * text-start) and every flex row mirror without a second stylesheet.
 */
import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { translate, type Locale, type MsgKey } from './core'

export {
  LOCALES,
  LOCALE_NAME,
  LOCALE_CHIP,
  dirOf,
  isLocale,
  translate,
  type Locale,
  type MsgKey,
} from './core'

/** The sentences, for the current interface language. */
export function useT() {
  const locale = useAppStore((s) => s.settings.locale)
  return useCallback(
    (key: MsgKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
}

/** The interface language itself, for the places that need more words
 *  (a direction-dependent icon, a translated list built in a helper). */
export function useLocale(): Locale {
  return useAppStore((s) => s.settings.locale)
}

/** For code outside React — a store's toast, a keyboard handler, a library
 *  helper. Reads the language the app is in right now. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  return translate(useAppStore.getState().settings.locale, key, vars)
}
