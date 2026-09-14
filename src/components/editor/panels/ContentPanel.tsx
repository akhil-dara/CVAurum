import { useState } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { cn } from '@/lib/utils'
import { BasicsEditor } from '../BasicsEditor'
import { SectionsOrganizer } from '../SectionsOrganizer'

/**
 * Is the top of the résumé already answered?
 *
 * A name and one way to be reached is the whole job of this block. When it is
 * done, the person who opened Content came for the SECTIONS — and those sat
 * below fifteen fields, which on a phone is more than a screen of scrolling
 * before the list they wanted appears at all.
 */
export function basicsDone(doc: ResumeDocument): boolean {
  const b = doc.content.basics
  return !!b.name?.trim() && !!(b.email?.trim() || b.phone?.trim())
}

export function ContentPanel({ doc }: { doc: ResumeDocument }) {
  // Open on a résumé that still needs it, folded on one that does not. Only the
  // FIRST render decides: a person who opens it keeps it open while they work.
  const [openBasics, setOpenBasics] = useState(() => !basicsDone(doc))
  const b = doc.content.basics
  // The folded row says what is inside it, so folding hides nothing.
  const summary = [b.name?.trim(), b.email?.trim() || b.phone?.trim()].filter(Boolean).join(' · ')
  return (
    <div className="space-y-3">
      <div className={cn('rounded-lg border bg-surface', openBasics ? 'border-border shadow-soft' : 'border-border')}>
        <button
          className="flex w-full items-center gap-2 px-2.5 py-2.5 text-left"
          onClick={() => setOpenBasics((o) => !o)}
          aria-expanded={openBasics}
        >
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Personal details</span>
            {!openBasics && summary && (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{summary}</span>
            )}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', openBasics && 'rotate-180')}
          />
        </button>
        {openBasics && (
          <div className="border-t border-border p-3">
            <BasicsEditor doc={doc} />
          </div>
        )}
      </div>

      <div className="px-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</div>
      <SectionsOrganizer doc={doc} />
    </div>
  )
}
