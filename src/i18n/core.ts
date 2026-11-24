/**
 * The dictionary, without React and without the store.
 *
 * The panel's sentences come from `index.ts`, which reads the language off the
 * store. The ATS analysis is a plain module — it runs in a test, and it runs
 * for a PDF measured outside the editor — so it cannot reach the store, but it
 * must still speak the same language the interface is in. This file holds the
 * half of i18n that is only a table and a lookup: `index.ts` re-exports all of
 * it, so a component still imports `useT` and `Locale` from `@/i18n`.
 */
import { en, type MsgKey } from './en'
import { fa } from './fa'

export type { MsgKey }

/** The languages the interface is written in. Persian's script is why the
 *  app has a direction at all. */
export type Locale = 'en' | 'fa'

export const LOCALES: readonly Locale[] = ['en', 'fa'] as const

/** Each language under its own name, as a language picker shows them. */
export const LOCALE_NAME: Record<Locale, string> = { en: 'English', fa: 'فارسی' }

/** Two letters for the header chip: the language you are NOT reading. */
export const LOCALE_CHIP: Record<Locale, string> = { en: 'فا', fa: 'EN' }

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'fa'
}

/** Which way the interface runs: the script's own direction. */
export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'fa' ? 'rtl' : 'ltr'
}

const DICTS: Record<Locale, Record<MsgKey, string>> = { en, fa }

/** One sentence in one language, with `{n}`-style figures filled in.
 *
 *  Missing keys fall back to English rather than to the key: a stray English
 *  sentence is a smaller failure than "top.downloadPdf" on a button. */
export function translate(locale: Locale, key: MsgKey, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale] ?? en
  let text = dict[key] ?? en[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value))
  }
  return text
}
