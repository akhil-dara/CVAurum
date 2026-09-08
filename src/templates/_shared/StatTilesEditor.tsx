/**
 * The Numbers editor: which figures the band shows, in what order, with the
 * author's own labels and values.
 *
 * The band used to be a single on/off flag over four derived figures, so an
 * author who did not want "3.2k stars" or the count of listed skills had no
 * way to say so. One component serves both places the band can be reached:
 * the header's Style popover on the canvas, and the Design panel (the phone
 * has no editable canvas, so the panel must carry the same control).
 */
import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import type { MetaEditFn } from './Editable'
import { DEFAULT_STAT_ORDER, deriveStat, type StatKind, type StatTile } from '@/lib/stats'

const KINDS: { kind: StatKind; name: string }[] = [
  { kind: 'years', name: 'Years of experience' },
  { kind: 'companies', name: 'Companies' },
  { kind: 'projects', name: 'Projects' },
  { kind: 'certifications', name: 'Certifications' },
  { kind: 'languages', name: 'Languages' },
  { kind: 'headline', name: 'Headline figure' },
  { kind: 'skills', name: 'Skills' },
]
const MAX = 5
let seq = 0
const newId = () => `st${Date.now().toString(36)}${(seq++).toString(36)}`

/** The list as the author sees it: absent means the derived default, so
 *  the first edit materialises that default and changes nothing else. */
function currentTiles(layout: Metadata['layout']): StatTile[] {
  return layout.statTiles ?? DEFAULT_STAT_ORDER.map((kind) => ({ id: kind, kind }))
}

export function StatTilesEditor({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const layout = doc.metadata.layout
  const tiles = currentTiles(layout)
  const derived = useMemo(
    () =>
      Object.fromEntries(KINDS.map((k) => [k.kind, deriveStat(k.kind, doc.content)])) as Record<
        StatKind,
        ReturnType<typeof deriveStat>
      >,
    [doc.content]
  )
  const write = (next: StatTile[]) =>
    editMeta((m) => {
      m.layout.statTiles = next
    })
  const on = (kind: StatKind) => tiles.some((t) => t.kind === kind)
  const toggle = (kind: StatKind) => {
    if (on(kind)) write(tiles.filter((t) => t.kind !== kind))
    else if (tiles.length < MAX) write([...tiles, { id: newId(), kind }])
  }
  const patch = (id: string, p: Partial<StatTile>) => write(tiles.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= tiles.length) return
    const next = tiles.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    write(next)
  }
  return (
    <div className="px-2 pb-1.5" data-testid="stat-tiles-editor">
      <label className="flex cursor-pointer items-center gap-2 text-xs phone:min-h-[44px] phone:text-sm">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-primary phone:h-5 phone:w-5"
          checked={layout.stats}
          onChange={(e) =>
            editMeta((m) => {
              m.layout.stats = e.target.checked
            })
          }
        />
        Show numbers
      </label>
      {layout.stats && (
        <>
          <div className="mt-1.5 flex flex-col gap-1 phone:gap-0">
            {KINDS.map((k) => {
              const d = derived[k.kind]
              const checked = on(k.kind)
              return (
                <label
                  key={k.kind}
                  className={`flex items-center gap-2 text-xs phone:min-h-[44px] phone:text-sm ${!d && !checked ? 'text-muted-foreground' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary phone:h-5 phone:w-5"
                    checked={checked}
                    disabled={!checked && (!d || tiles.length >= MAX)}
                    onChange={() => toggle(k.kind)}
                  />
                  <span className="flex-1">{k.name}</span>
                  <span className="text-muted-foreground">{d ? `${d.value} ${d.label}`.trim() : 'no data'}</span>
                </label>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {tiles.length} of {MAX}
            </span>
            <button
              type="button"
              className="btn-outline btn-xs phone:h-10 phone:px-3 phone:text-sm"
              disabled={tiles.length >= MAX}
              onClick={() => write([...tiles, { id: newId(), kind: 'custom', value: '', label: '' }])}
            >
              <Plus className="h-3 w-3" /> Custom
            </button>
          </div>
          <ol className="mt-1.5 flex flex-col gap-1.5">
            {tiles.map((t, i) => {
              const d = t.kind === 'custom' ? null : derived[t.kind]
              return (
                <li key={t.id} className="rounded-lg border border-border p-1.5">
                  <div className="flex items-center gap-1 phone:gap-2">
                    <span className="flex-1 text-[11px] font-medium phone:text-sm">
                      {t.kind === 'custom' ? 'Custom' : KINDS.find((k) => k.kind === t.kind)?.name}
                    </span>
                    <button
                      type="button"
                      className="btn-icon h-6 w-6 phone:h-10 phone:w-10"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-6 w-6 phone:h-10 phone:w-10"
                      aria-label="Move down"
                      disabled={i === tiles.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-6 w-6 phone:h-10 phone:w-10"
                      aria-label="Remove"
                      onClick={() => write(tiles.filter((x) => x.id !== t.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <input
                      className="input h-7 w-16 px-1.5 text-xs phone:h-10 phone:w-20 phone:text-sm"
                      placeholder={d?.value ?? 'value'}
                      value={t.value ?? ''}
                      onChange={(e) => patch(t.id, { value: e.target.value })}
                      aria-label="Value"
                    />
                    <input
                      className="input h-7 min-w-0 flex-1 px-1.5 text-xs phone:h-10 phone:text-sm"
                      placeholder={d?.label || 'label'}
                      value={t.label ?? ''}
                      onChange={(e) => patch(t.id, { label: e.target.value })}
                      aria-label="Label"
                    />
                  </div>
                  {t.kind === 'custom' && !(t.value || '').trim() && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Type a value or this tile is not drawn.</p>
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}
