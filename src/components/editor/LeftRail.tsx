import { FileText, Palette, LayoutTemplate, Target, PanelLeftClose, PanelLeft, Eye } from 'lucide-react'
import { useEditorStore, type LeftTab } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'
import { useT, type MsgKey } from '@/i18n'

// The rail's four names live in the dictionary, so the tab a Persian editor
// presses and the panel it opens cannot disagree.
const TABS: { id: LeftTab; key: MsgKey; icon: typeof FileText }[] = [
  { id: 'content', key: 'rail.content', icon: FileText },
  { id: 'design', key: 'rail.design', icon: Palette },
  { id: 'templates', key: 'rail.templates', icon: LayoutTemplate },
  { id: 'ats', key: 'rail.score', icon: Target },
]

/**
 * Navigation rail. Desktop: a slim vertical rail on the left. Mobile: a bottom
 * tab bar (the panel and canvas can't fit side-by-side on a phone), with an
 * extra "Preview" tab that closes the panel to reveal the resume canvas.
 */
export function LeftRail() {
  const { leftTab, setLeftTab, leftOpen, toggleLeft, setLeftOpen } = useEditorStore()
  const t = useT()
  return (
    <nav
      data-tour="nav"
      className={cn(
        'flex shrink-0 items-stretch justify-around border-border bg-background',
        // mobile: horizontal bottom bar (order-3, sent below panel+canvas).
        // desktop: vertical left rail — keep its natural DOM order (first child)
        // so it sits on the LEFT, before the panel and canvas.
        // `border-e` and not `border-r`: the rail's hairline has to face the
        // panel it opens in a right-to-left interface too.
        'order-3 border-t desk:order-none desk:w-16 desk:flex-col desk:items-center desk:justify-start desk:gap-1 desk:border-e desk:border-t-0 desk:py-3',
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = leftOpen && leftTab === tab.id
        return (
          <button
            key={tab.id}
            data-tour={tab.id === 'templates' || tab.id === 'design' ? tab.id : undefined}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              setLeftTab(tab.id)
              setLeftOpen(true)
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors desk:h-14 desk:w-14 desk:flex-none desk:rounded-xl desk:py-0',
              // The active label in full ink (accent on its own tint measured 4.0:1);
              // the accent stays on the icon, which marks the tab as clearly.
              active ? 'text-foreground desk:bg-primary/10 [&>svg]:text-primary' : 'text-muted-foreground hover:text-foreground desk:hover:bg-muted',
            )}
            title={t(tab.key)}
          >
            <Icon className="h-[18px] w-[18px]" />
            {t(tab.key)}
          </button>
        )
      })}

      {/* Mobile-only: switch to the resume canvas. */}
      <button
        onClick={() => setLeftOpen(false)}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors desk:hidden',
          !leftOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
        title={t('rail.preview')}
      >
        <Eye className="h-[18px] w-[18px]" />
        {t('rail.preview')}
      </button>

      {/* Desktop-only: collapse/expand the panel. */}
      <button
        onClick={toggleLeft}
        className="mt-auto hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground desk:flex"
        title={t(leftOpen ? 'rail.collapse' : 'rail.expand')}
      >
        {leftOpen ? <PanelLeftClose className="flip-rtl h-[18px] w-[18px]" /> : <PanelLeft className="flip-rtl h-[18px] w-[18px]" />}
      </button>
    </nav>
  )
}
