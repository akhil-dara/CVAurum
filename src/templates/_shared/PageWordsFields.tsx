import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { furnitureYear, kickerWords } from '@/lib/pageWords'
import { Segmented, Toggle } from '@/components/editor/fields/Controls'
import type { PageNumberStyle } from '@/lib/pageWords'

type EditMeta = (recipe: (m: Metadata) => void) => void

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
    ? 'h-7 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-foreground outline-none focus:border-primary'
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
              maxLength={80}
              value={k?.left ?? defaults.left}
              onChange={(e) => set({ left: e.target.value })}
            />
            <input
              aria-label="Words on the right"
              className={input}
              maxLength={80}
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

/** The page foot's settings: its words, how it numbers the pages (only a
 *  document of two pages or more prints a number), where the two sit, and
 *  the hairline above them. */
export function FootFields({ doc, editMeta }: { doc: ResumeDocument; editMeta: EditMeta }) {
  const l = doc.metadata.layout
  return (
    <div className="flex flex-col gap-2">
      <FootLabelField doc={doc} editMeta={editMeta} />
      <div>
        <label className="label">Page number</label>
        <Segmented
          value={l.pageFootNumber ?? 'slash'}
          options={NUMBER_OPTIONS}
          onChange={(v) =>
            editMeta((m) => {
              m.layout.pageFootNumber = v
            })
          }
        />
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
      <p className="text-[11px] text-muted-foreground">
        Decoration only, never read by an ATS. The number prints once there is a second page.
      </p>
    </div>
  )
}

export function FootLabelField({ doc, editMeta }: { doc: ResumeDocument; editMeta: EditMeta }) {
  const label = doc.metadata.layout.pageFootLabel
  return (
    <div className="flex flex-col gap-1">
      <input
        aria-label="Words at the foot of each page"
        className="input"
        maxLength={80}
        value={label ?? doc.content.basics.name ?? ''}
        onChange={(e) =>
          editMeta((m) => {
            m.layout.pageFootLabel = e.target.value
          })
        }
      />
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
