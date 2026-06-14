import { FileText, Palette, LayoutTemplate, Target, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useEditorStore, type LeftTab } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'

const TABS: { id: LeftTab; label: string; icon: typeof FileText }[] = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'ats', label: 'ATS', icon: Target },
]

export function LeftRail() {
  const { leftTab, setLeftTab, leftOpen, toggleLeft } = useEditorStore()
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-3">
      {TABS.map((t) => {
        const Icon = t.icon
        const active = leftOpen && leftTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => {
              if (!leftOpen) toggleLeft()
              setLeftTab(t.id)
            }}
            className={cn(
              'flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title={t.label}
          >
            <Icon className="h-[18px] w-[18px]" />
            {t.label}
          </button>
        )
      })}
      <button
        onClick={toggleLeft}
        className="mt-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        title={leftOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {leftOpen ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px]" />}
      </button>
    </nav>
  )
}
