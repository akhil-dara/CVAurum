import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'

/** Opens the Design panel at the text-contrast card, from anywhere. */
export function openContrast() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-contrast')), 80)
}

/**
 * The page's WCAG contrast result, on the page: a pill beside Magic fit's
 * that says either that every run of text meets AA or how many do not, and
 * opens the card with the fixes on a tap. The card alone sat at the top of a
 * long panel, where an author who never opened Design never learned the page
 * had a problem.
 */
export function ContrastChip() {
  const contrast = useEditorStore((s) => s.contrast)
  if (!contrast) return null
  const n = contrast.report.findings.length
  const ok = n === 0
  return (
    <button
      type="button"
      data-testid="contrast-chip"
      onClick={openContrast}
      title={ok ? 'Every run of text meets WCAG AA contrast' : 'Open the contrast fixes'}
      className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 py-1 pl-2 pr-2.5 text-[11px] font-medium text-foreground shadow-float backdrop-blur transition hover:border-primary/50 coarse:min-h-9"
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-hidden />
      )}
      <span className="whitespace-nowrap">
        {ok ? 'Contrast · WCAG AA' : `${n} contrast issue${n === 1 ? '' : 's'}`}
      </span>
    </button>
  )
}
