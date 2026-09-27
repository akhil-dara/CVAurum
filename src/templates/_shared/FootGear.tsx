import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import type { MetaEditFn } from './Editable'
import { usePopoverA11y } from './popoverA11y'
import { wantsSheet } from './HeaderGear'
import { FootFields } from './PageWordsFields'

/** The event a copy of the foot on an earlier page (PageChrome.tsx) sends,
 *  so every page's foot opens the one popover. */
export const OPEN_PAGE_FOOT = 'cvaurum:open-page-foot'

/**
 * The page foot as its own control on the canvas. The foot itself is
 * decoration - aria-hidden outlines in a layer nothing can click - so this
 * lays one button over it, edit mode only: hovering it outlines the foot,
 * and a click anywhere on it opens the foot's settings (its words, the
 * number and whether it prints, the place, the rule) with a way to remove
 * it. While the résumé is one page, a faint note stands where the number
 * will go, so an author can see a number is coming rather than wonder.
 *
 * No control is revealed by hover alone: the button is the foot's own box,
 * always hittable, and its label is visible to a keyboard and a screen
 * reader the whole time.
 */
export function FootGear({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [top, setTop] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  usePopoverA11y(open, () => setOpen(false), panelRef)
  const pages = useEditorStore((s) => s.fitResult?.pages)
  const l = doc.metadata.layout
  const numberComing = (l.pageFootNumber ?? 'slash') !== 'none' && (!pages || pages < 2) && l.pageFootAlign !== 'center'

  const openAt = (y: number) => {
    const s = wantsSheet()
    setSheet(s)
    // Above the foot when there is room, the panel being about 460px tall.
    setTop(Math.max(8, Math.min(y - 470, window.innerHeight - 480)))
    setOpen(true)
  }
  useEffect(() => {
    const onOpen = (e: Event) => openAt((e as CustomEvent<{ y?: number }>).detail?.y ?? window.innerHeight)
    window.addEventListener(OPEN_PAGE_FOOT, onOpen)
    return () => window.removeEventListener(OPEN_PAGE_FOOT, onOpen)
  }, [])

  return (
    <>
      <button
        type="button"
        className="rm-foot-edit no-print"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => openAt((e.currentTarget as HTMLElement).getBoundingClientRect().top)}
        aria-label="Page foot settings"
        title="Page foot: words, page number, place"
      >
        {numberComing ? <span className="rm-foot-edit-note">Page number from page 2</span> : null}
        <span className="rm-foot-edit-pill">
          <Settings2 /> Foot
        </span>
      </button>
      {open &&
        createPortal(
          <>
            <div className={`fixed inset-0 z-[60] ${sheet ? 'bg-black/35' : ''}`} onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label="Page foot"
              className={
                sheet
                  ? 'fixed inset-x-0 bottom-0 z-[61] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-border bg-surface p-3 pb-5 text-foreground shadow-float'
                  : 'fixed z-[61] w-[19rem] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-3 text-foreground shadow-float'
              }
              style={
                sheet
                  ? { maxHeight: Math.round(window.innerHeight * 0.8) }
                  : { top, maxHeight: window.innerHeight - top - 8, left: Math.max(8, document.documentElement.clientWidth - 304 - 12) }
              }
            >
              <div className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Page foot <span className="font-normal normal-case">— on every page</span>
              </div>
              <FootFields
                doc={doc}
                editMeta={editMeta}
                pages={pages}
                onRemove={() => {
                  editMeta((m) => {
                    m.layout.pageFoot = false
                  })
                  setOpen(false)
                }}
              />
            </div>
          </>,
          document.body
        )}
    </>
  )
}
