import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { furnitureYear, kickerWords } from '@/lib/pageWords'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Segmented, Toggle } from '@/components/editor/fields/Controls'
import { pageFootText, type PageNumberStyle } from '@/lib/pageWords'

type EditMeta = (recipe: (m: Metadata) => void) => void

/** The longest words each line holds before it runs into its neighbour,
 *  measured on the widest face at the furniture's size and tracking (about
 *  8px a capital): the line above the name gives each side half the page,
 *  the foot shares its line with the page number. */
const KICKER_MAX = 40
const FOOT_MAX = 60

/**
 * The author's words for the page furniture: the line above the name (the
 * kicker header) and the words at the left of the page foot. One component
 * for the Design panel and the header's Style popover, so a phone - which
 * edits in the panel - reaches the same controls the canvas does.
 *
 * What the fields show is what prints: the defaults appear as the fields'
 * own text (a plain label, the place and the year, the name) rather than as
 * placeholders, an emptied field leaves that side blank, and "Use the
 * defaults" puts the document's own words back.
 */
export function KickerFields({ doc, editMeta, compact }: { doc: ResumeDocument; editMeta: EditMeta; compact?: boolean }) {
  const k = doc.metadata.layout.kicker
  const shown = k?.show !== false
  const defaults = kickerWords(undefined, doc.content.basics, furnitureYear(doc.updatedAt))
  const set = (patch: { show?: boolean; left?: string; right?: string }) =>
    editMeta((m) => {
      m.layout.kicker = { ...(m.layout.kicker ?? {}), ...patch }
    })
  const input = compact
    ? 'h-7 phone:h-10 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-foreground outline-none focus:border-primary'
    : 'input'
  const customised = k !== undefined && (k.left !== undefined || k.right !== undefined || k.show === false)
  return (
    <div className={compact ? 'flex flex-col gap-1.5 px-2 pb-1.5' : 'flex flex-col gap-2'}>
      <Toggle label="Line above the name" checked={shown} onChange={(v) => set({ show: v })} />
      {shown ? (
        <>
          <div className="flex gap-1.5">
            <input
              aria-label="Words on the left"
              className={input}
              maxLength={KICKER_MAX}
              value={k?.left ?? defaults.left}
              onChange={(e) => set({ left: e.target.value })}
            />
            <input
              aria-label="Words on the right"
              className={input}
              maxLength={KICKER_MAX}
              value={k?.right ?? defaults.right}
              onChange={(e) => set({ right: e.target.value })}
            />
          </div>
          {customised ? (
            <button
              type="button"
              className="self-start text-[11px] font-medium text-primary hover:underline"
              onClick={() =>
                editMeta((m) => {
                  delete m.layout.kicker
                })
              }
            >
              Use the defaults
            </button>
          ) : null}
        </>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Decoration only — your own words, never read by an ATS. Empty a side to leave it blank.
      </p>
    </div>
  )
}

const NUMBER_OPTIONS: { value: PageNumberStyle; label: string }[] = [
  { value: 'slash', label: '1 / 2' },
  { value: 'of', label: 'Page 1 of 2' },
  { value: 'plain', label: '1' },
  { value: 'none', label: 'None' },
]

/** The page foot's settings: its words (the name by default, or none), how
 *  it numbers the pages and whether this résumé will print a number at all,
 *  where the two sit, and the hairline above them. `pages` is the page count
 *  the canvas last measured; `onRemove` offers to take the whole foot away
 *  (the canvas popover - the panel has its own switch for that). */
export function FootFields({
  doc,
  editMeta,
  pages,
  onRemove,
}: {
  doc: ResumeDocument
  editMeta: EditMeta
  pages?: number
  onRemove?: () => void
}) {
  const l = doc.metadata.layout
  const style = l.pageFootNumber ?? 'slash'
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="label">Words</label>
        <FootLabelField doc={doc} editMeta={editMeta} />
      </div>
      <div>
        <label className="label">Page number</label>
        <Segmented
          value={style}
          options={NUMBER_OPTIONS}
          wrap
          itemClass="grow basis-[45%] whitespace-nowrap"
          onChange={(v) =>
            editMeta((m) => {
              m.layout.pageFootNumber = v
            })
          }
        />
        <p className="mt-1 text-[11px] text-muted-foreground" data-foot-number-status="">
          {footNumberStatus(style, pages)}
        </p>
      </div>
      <div>
        <label className="label">Place</label>
        <Segmented
          value={l.pageFootAlign ?? 'split'}
          options={[
            { value: 'split', label: 'Spread' },
            { value: 'center', label: 'Centred' },
          ]}
          onChange={(v) =>
            editMeta((m) => {
              m.layout.pageFootAlign = v
            })
          }
        />
      </div>
      <Toggle
        label="Line above the foot"
        checked={l.pageFootRule !== false}
        onChange={(v) =>
          editMeta((m) => {
            m.layout.pageFootRule = v
          })
        }
      />
      <p className="text-[11px] text-muted-foreground">Decoration only: an ATS never reads the foot.</p>
      {onRemove ? (
        <button type="button" className="btn-ghost h-9 justify-center text-danger phone:h-11" onClick={onRemove}>
          Remove the foot
        </button>
      ) : null}
    </div>
  )
}

/** Whether - and how - this résumé prints its page numbers, in words. */
export function footNumberStatus(style: PageNumberStyle, pages?: number): string {
  if (style === 'none') return 'No page number.'
  if (!pages || pages < 2) return 'One page, so no number prints yet. It appears on every page once there is a second.'
  return `Prints on all ${pages} pages: ${pageFootText(1, pages, style)} … ${pageFootText(pages, pages, style)}.`
}

/** The words at the left of the foot: the name until the author writes
 *  their own, and nothing at all once they remove them. */
export function FootLabelField({ doc, editMeta }: { doc: ResumeDocument; editMeta: EditMeta }) {
  const label = doc.metadata.layout.pageFootLabel
  // What is being typed: an emptied field is a word being retyped, not the
  // words removed - that happens on leaving it empty, or on the cross.
  const [draft, setDraft] = useState<string | null>(null)
  if (label === '') {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">None - the number stands alone</span>
        <button
          type="button"
          className="text-[11px] font-medium text-primary hover:underline"
          onClick={() =>
            editMeta((m) => {
              delete m.layout.pageFootLabel
            })
          }
        >
          Add your name
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          aria-label="Words at the foot of each page"
          className="input min-w-0 flex-1 phone:h-10"
          maxLength={FOOT_MAX}
          value={draft ?? label ?? doc.content.basics.name ?? ''}
          onChange={(e) => {
            const v = e.target.value
            setDraft(v)
            if (v.trim())
              editMeta((m) => {
                m.layout.pageFootLabel = v
              })
          }}
          onBlur={() => {
            if (draft !== null && !draft.trim())
              editMeta((m) => {
                m.layout.pageFootLabel = ''
              })
            setDraft(null)
          }}
        />
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-danger phone:h-10 phone:w-10"
          aria-label="Remove the words from the foot"
          title="Remove the words from the foot"
          onClick={() =>
            editMeta((m) => {
              m.layout.pageFootLabel = ''
            })
          }
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {label !== undefined ? (
        <button
          type="button"
          className="self-start text-[11px] font-medium text-primary hover:underline"
          onClick={() =>
            editMeta((m) => {
              delete m.layout.pageFootLabel
            })
          }
        >
          Use your name
        </button>
      ) : null}
    </div>
  )
}
