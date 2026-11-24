/**
 * A panel's own English words, translated where they are written.
 *
 * `<T>Layout</T>` says the same thing as the string it wraps, in the reader's
 * language; a word that is a name — A4, PDF, LinkedIn — passes through
 * unchanged because src/i18n/labels.ts has no entry for it.
 */
import type { ReactNode } from 'react'
import { useLabel } from './labels'

export function T({ children }: { children: string }): ReactNode {
  const L = useLabel()
  return L(children)
}
