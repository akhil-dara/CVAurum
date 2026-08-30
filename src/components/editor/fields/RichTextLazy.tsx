/**
 * The rich-text field, loaded when one first renders. TipTap and its
 * extensions are ~306KB the editor route paid on EVERY open - including
 * sessions that never expand an entry - because the static import chain
 * (ContentPanel -> SectionItemEditors -> RichTextEditor) put it on the
 * critical path. The fallback holds the field's exact frame, so the panel
 * does not jump when the editor arrives a beat later.
 */
import { lazy, Suspense } from 'react'

const Impl = lazy(() => import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

export function RichTextLazy(props: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  withLists?: boolean
  minHeight?: number
}) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-md border border-input bg-surface opacity-60"
          style={{ minHeight: (props.minHeight ?? 64) + 34 }}
          aria-hidden
        />
      }
    >
      <Impl {...props} />
    </Suspense>
  )
}
