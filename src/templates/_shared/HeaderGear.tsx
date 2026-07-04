/**
 * On-canvas gear for the HEADER — restyle the name/contacts composition right
 * where you see it (mirrors the per-section gear). Pinned to the viewport's
 * right edge so the header stays visible while it changes live.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import type { MetaEditFn } from './Editable'
import { HEADER_STYLES, HeaderMini } from './headerStyles'

export function HeaderGear({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(0)
  const current = doc.metadata.layout.headerStyle ?? ''

  const openPopover = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTop(Math.max(8, Math.min(r.top - 4, window.innerHeight - 320)))
    setOpen(true)
  }
  const pick = (value: string) =>
    editMeta((m) => {
      m.layout.headerStyle = (value || undefined) as Metadata['layout']['headerStyle']
    })

  return (
    <>
      <button
        type="button"
        className="rm-section-gear no-print"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
        title="Header style"
        aria-label="Header style"
      >
        <Settings2 /> Style
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[61] w-[19rem] rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-float"
              style={{ top, left: Math.max(8, window.innerWidth - 304 - 12) }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Header <span className="font-normal normal-case">— layout</span>
              </div>
              <div className="flex flex-wrap gap-1.5 px-2 pb-1.5 pt-0.5">
                {HEADER_STYLES.map((h) => {
                  const on = current === h.value
                  return (
                    <button
                      key={h.value || 'auto'}
                      type="button"
                      title={h.label}
                      onClick={() => pick(h.value)}
                      className={`flex w-[64px] flex-col items-center gap-1 rounded-lg border p-1.5 transition ${on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'}`}
                    >
                      <span className="flex h-8 w-full items-center justify-center overflow-hidden rounded-[3px] border border-border/70 bg-white p-1">
                        <HeaderMini kind={h.value} />
                      </span>
                      <span className={`text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}>{h.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="px-2 pb-1 text-[10px] leading-snug text-muted-foreground">Changes apply live — Auto uses the template's own header.</p>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
