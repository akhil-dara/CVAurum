import { FileText, Palette, LayoutTemplate, Target, PanelLeftClose, PanelLeft, Eye } from 'lucide-react'
import { useEditorStore, type LeftTab } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'

const TABS: { id: LeftTab; label: string; icon: typeof FileText }[] = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'ats', label: 'ATS', icon: Target },
]

/**
 * Navigation rail. Desktop: a slim vertical rail on the left. Mobile: a bottom
 * tab bar (the panel and canvas can't fit side-by-side on a phone), with an
 * extra "Preview" tab that closes the panel to reveal the resume canvas.
 */
export function LeftRail() {
  const { leftTab, setLeftTab, leftOpen, toggleLeft, setLeftOpen } = useEditorStore()
  return (
    <nav
      className={cn(
        'flex shrink-0 items-stretch justify-around border-border bg-background',
        // mobile: horizontal bottom bar; desktop: vertical left rail
        'order-3 border-t md:order-1 md:w-16 md:flex-col md:items-center md:justify-start md:gap-1 md:border-r md:border-t-0 md:py-3',
      )}
    >
      {TABS.map((t) => {
        const Icon = t.icon
        const active = leftOpen && leftTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => {
              setLeftTab(t.id)
              setLeftOpen(true)
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors md:h-14 md:w-14 md:flex-none md:rounded-xl md:py-0',
              active ? 'text-primary md:bg-primary/10' : 'text-muted-foreground hover:text-foreground md:hover:bg-muted',
            )}
            title={t.label}
          >
            <Icon className="h-[18px] w-[18px]" />
            {t.label}
          </button>
        )
      })}

      {/* Mobile-only: switch to the resume canvas. */}
      <button
        onClick={() => setLeftOpen(false)}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors md:hidden',
          !leftOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
        title="Preview"
      >
        <Eye className="h-[18px] w-[18px]" />
        Preview
      </button>

      {/* Desktop-only: collapse/expand the panel. */}
      <button
        onClick={toggleLeft}
        className="mt-auto hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
        title={leftOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {leftOpen ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px]" />}
      </button>
    </nav>
  )
}
