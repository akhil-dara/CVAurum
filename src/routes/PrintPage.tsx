/**
 * Standalone, chrome-free page for native "Save as PDF". Loads the document,
 * injects the correct @page size, waits for fonts, applies the same
 * auto-fit-to-one-page scaling as the editor, then opens the print dialog.
 * The browser paginates the same DOM the editor previews — perfect fidelity.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
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
    const auto = !/[?&]noprint/.test(window.location.search)
    const raf2 = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
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

    void (async () => {
      await ensureFontsReady([doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily])
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
      document.documentElement.setAttribute('data-print-ready', '1')
      if (auto) {
        // Close the print tab once the save/print dialog is dismissed, so the
        // user is never stranded on the bare print page.
        window.addEventListener('afterprint', () => window.close(), { once: true })
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

  return (
    <div className="print-stage">
      <div ref={sheetRef} className="print-sheet" style={{ width: widthCss }}>
        <TemplateRenderer doc={doc} mode="print" fitScale={fitScale} />
      </div>
    </div>
  )
}
