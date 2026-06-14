import { useState } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { cn } from '@/lib/utils'
import { BasicsEditor } from '../BasicsEditor'
import { SectionsOrganizer } from '../SectionsOrganizer'

export function ContentPanel({ doc }: { doc: ResumeDocument }) {
  const [openBasics, setOpenBasics] = useState(true)
  return (
    <div className="space-y-3">
      <div className={cn('rounded-lg border bg-surface', openBasics ? 'border-border shadow-soft' : 'border-border')}>
        <button
          className="flex w-full items-center gap-2 px-2.5 py-2.5 text-left"
          onClick={() => setOpenBasics((o) => !o)}
        >
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">Personal details</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openBasics && 'rotate-180')} />
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
