/**
 * Standalone, chrome-free page for native "Save as PDF". Loads the document,
 * injects the correct @page size, waits for fonts, applies the same
 * auto-fit-to-one-page scaling as the editor, then opens the print dialog.
 * The browser paginates the same DOM the editor previews — perfect fidelity.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS, MM_TO_PX } from '@/types/metadata'
import { loadDoc } from '@/lib/storage'
import { ensureFontsReady } from '@/data/fonts'
import { fitOnePageScale } from '@/lib/fitOnePage'
import { pdfBaseName } from '@/lib/pdf'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

export function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<ResumeDocument | null>(null)
  const [missing, setMissing] = useState(false)
  const [fitScale, setFitScale] = useState(1)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
    if (!id) return
    loadDoc(id).then((d) => (d ? setDoc(d) : setMissing(true)))
  }, [id])

  useEffect(() => {
    if (!doc) return
    const fmt = doc.metadata.page.format === 'Letter' ? 'Letter' : 'A4'
    const style = document.createElement('style')
    style.textContent = `@page { size: ${fmt}; margin: 0; }`
    document.head.appendChild(style)
    const prevTitle = document.title
    document.title = pdfBaseName(doc)

    let cancelled = false
    // Auto-open the print dialog only on desktop. On touch devices the dialog is
    // Android/iOS's own (flaky, and easy to get stranded behind), so we instead
    // land the user on the toolbar and let them tap "Save as PDF" deliberately.
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const auto = !/[?&]noprint/.test(window.location.search) && !coarse
    // Two animation frames — but NEVER hang. If a new print tab opens
    // backgrounded on mobile, RAF is throttled and would stall forever, so fall
    // back to a timer. This guarantees the page always becomes printable.
    const raf2 = () =>
      new Promise<void>((r) => {
        let done = false
        const finish = () => { if (!done) { done = true; r() } }
        requestAnimationFrame(() => requestAnimationFrame(finish))
        setTimeout(finish, 400)
      })
    // The photo's height isn't scaled by fit, so an unloaded image reflows the
    // sheet AFTER we measure — wait for it like we wait for fonts.
    const awaitPhoto = async () => {
      if (!doc.metadata.layout.showPhoto) return
      const img = sheetRef.current?.querySelector('img.rm-photo') as HTMLImageElement | null
      if (img && !img.complete) {
        await new Promise<void>((r) => {
          img.onload = () => r()
          img.onerror = () => r()
          setTimeout(r, 1500)
        })
      }
    }

    // Cap any single async wait so font loading / measurement can never block
    // the page from becoming printable (a stuck promise would otherwise strand
    // the user on a blank stage, especially on mobile).
    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))])

    void (async () => {
      try {
        await withTimeout(
          ensureFontsReady([doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily]),
          4000,
        )
        await awaitPhoto()
        await raf2()
        if (cancelled) return

        if (doc.metadata.page.autoFit && sheetRef.current) {
          const { h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
          // Same binary-search fit the editor preview uses → identical page count.
          await fitOnePageScale(pageH, async (sc) => {
            if (cancelled || !sheetRef.current) return Number.POSITIVE_INFINITY
            setFitScale(sc)
            await raf2()
            return sheetRef.current?.scrollHeight ?? Number.POSITIVE_INFINITY
          })
        }
        await raf2()
        if (cancelled) return
        // If the resume fits a page (after fit), clamp the sheet to exactly one
        // page and clip — so a hair of sub-pixel overflow can't emit a blank 2nd
        // page. Genuinely multi-page resumes (well over a page) flow normally.
        if (sheetRef.current) {
          const { h: pageHpx } = PAGE_DIMENSIONS[doc.metadata.page.format]
          // Only clamp when the overflow is within the bottom margin — i.e. it's
          // trailing whitespace/rounding, never a real line of text.
          const padPx = doc.metadata.page.margin * MM_TO_PX
          if (sheetRef.current.scrollHeight <= pageHpx + padPx) {
            sheetRef.current.style.height = `${Math.floor(pageHpx) - 2}px`
            sheetRef.current.style.overflow = 'hidden'
          }
        }
      } catch {
        /* fall through — still mark ready so the user can print what rendered */
      }
      if (cancelled) return
      document.documentElement.setAttribute('data-print-ready', '1')
      if (auto) {
        // Close the tab after printing ONLY if we were opened as a script tab
        // (desktop new-tab flow). On mobile the popup is often blocked and we
        // land here in the same tab — closing would fail/strand the user, so the
        // toolbar's Back button handles the return instead.
        window.addEventListener('afterprint', () => { if (window.opener) window.close() }, { once: true })
        window.print()
      }
    })()

    return () => {
      cancelled = true
      style.remove()
      document.title = prevTitle
    }
  }, [doc])

  if (missing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p>Resume not found.</p>
      </div>
    )
  }
  if (!doc) return null

  const widthCss = doc.metadata.page.format === 'Letter' ? '8.5in' : '210mm'
  const goBack = () => {
    if (window.opener) window.close()
    else if (window.history.length > 1) window.history.back()
    else window.location.assign(id ? `/resume/${id}` : '/app')
  }

  return (
    <>
      {/* On-screen toolbar (never printed). The native print dialog is the real
          "Save as PDF", but mobile often blocks auto-print — so always give an
          explicit button, plus a way back so nobody is stranded on this page. */}
      <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur">
        <button className="btn-ghost btn-sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-xs font-medium text-muted-foreground">{pdfBaseName(doc)}.pdf</span>
        <button className="btn-primary btn-sm" onClick={() => window.print()}>
          <Download className="h-4 w-4" /> Save as PDF
        </button>
      </div>
      <div className="print-stage" style={{ paddingTop: 64 }}>
        <div ref={sheetRef} className="print-sheet" style={{ width: widthCss }}>
          <TemplateRenderer doc={doc} mode="print" fitScale={fitScale} />
        </div>
      </div>
    </>
  )
}
