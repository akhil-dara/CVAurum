/**
 * Shared "create a resume" plumbing used by both the explainer homepage (/) and
 * the dashboard (/app): the create/import actions (which navigate straight into
 * the editor) and the Blank-vs-Example chooser modal.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, FileText, FilePlus2, FileUp, Search, SlidersHorizontal, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import { saveDoc } from '@/lib/storage'
import { importDocumentFromFile } from '@/lib/io'
import { CATEGORY_LABELS, LIBRARY_CATEGORIES, type LibraryCategory, type LibrarySample } from '@/data/library/types'
import { EMPTY_LIBRARY_FILTER, filterLibrary, toggleFacet } from '@/lib/libraryFilter'
import { cn } from '@/lib/utils'
import { PagePicture } from '@/components/preview/PagePicture'
import { HoverZoom } from '@/components/preview/HoverZoom'
import type { ResumeContent } from '@/types/document'
import { ThumbSkeleton } from '@/components/preview/ThumbSkeleton'

/** Create/import a resume and land the user in the editor. */
export function useResumeActions() {
  const navigate = useNavigate()
  const refreshLibrary = useAppStore((s) => s.refreshLibrary)
  const toast = useAppStore((s) => s.toast)

  const create = async (
    sample: boolean,
    templateId?: string,
    content?: ResumeContent,
    tweak?: (m: import('@/types/metadata').Metadata) => void,
    // What to call it. A résumé started from the "Registered Nurse" example
    // arriving in the list as "My Resume" is a list of identical names the
    // moment someone tries two.
    title?: string
  ) => {
    const doc = createDocument({ sample: sample || !!content, content, title })
    if (templateId) doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(templateId).defaults)
    // Persona polish (per-section styles, badges…) — applied after the template
    // defaults so sample resumes demonstrate the customization system.
    tweak?.(doc.metadata)
    await saveDoc(doc)
    await refreshLibrary()
    // A blank start with no chosen design: open the editor on the Templates
    // panel so "pick your look" is the natural first step, not a hunt.
    if (!sample && !content && !templateId) {
      try {
        sessionStorage.setItem('cvaurum:pick-design', doc.id)
      } catch {
        /* private mode — skip the nudge */
      }
    }
    navigate(`/resume/${doc.id}`)
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const doc = await importDocumentFromFile(file)
      await saveDoc(doc)
      await refreshLibrary()
      toast('Resume imported', 'success')
      navigate(`/resume/${doc.id}`)
    } catch (e) {
      console.error(e)
      toast('Could not import that file. Expecting JSON Resume format.', 'error')
    }
  }

  /** Import an existing PDF résumé — parsed 100% in the browser, never uploaded. */
  const importPdf = async (file?: File) => {
    if (!file) return
    toast('Reading your PDF — all on your device…', 'info')
    try {
      const { importResumeFromPdf } = await import('@/lib/import')
      let announcedOcr = false
      const { content, meta } = await importResumeFromPdf(file, {
        // Scanned / image-only pages get on-device OCR; tell the user once, since
        // it loads the recognition engine and can take a few seconds per page.
        onOcrProgress: () => {
          if (!announcedOcr) {
            announcedOcr = true
            toast('Looks scanned — reading it with on-device OCR (a few seconds)…', 'info')
          }
        },
      })
      // Even OCR couldn't pull readable text — show a clear message, not a blank.
      const empty = !content.basics.name && !content.basics.email && !content.work.length && !content.education.length && !content.skills.length
      if (meta.chars < 30 || empty) {
        toast(
          meta.ocrEngineFailed
            ? "The on-device text-recognition engine couldn't start (offline or blocked by the browser). Reload the page and try again — or use a text-based PDF."
            : "Couldn't read this PDF, even with OCR — the scan may be very low quality. Try a sharper scan or a text-based PDF.",
          'error',
        )
        return
      }
      const name = content.basics.name?.trim()
      const doc = createDocument({
        content,
        sample: true, // lay out exactly the sections we found
        title: name ? `${name} — Resume` : 'Imported résumé',
      })
      await saveDoc(doc)
      await refreshLibrary()
      toast(meta.ocrPages.length ? 'Imported via OCR — please review the fields closely' : 'Imported from PDF — review and tidy the fields', 'success')
      navigate(`/resume/${doc.id}`)
    } catch (e) {
      console.error(e)
      toast('Could not read that PDF. Please try another file, or a text-based PDF.', 'error')
    }
  }

  return { create, importFile, importPdf }
}

export function NewResumeModal({ onBlank, onExample, onImport, onImportPdf, onClose }: { onBlank: () => void; onExample: () => void; onImport: () => void; onImportPdf?: () => void; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-float">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a resume</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Start from a clean slate, or from a filled-in example you can edit.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChooserCard
            icon={<FilePlus2 className="h-6 w-6" />}
            title="Blank resume"
            body="A clean slate with the core sections ready to fill in."
            onClick={onBlank}
            primary
          />
          <ChooserCard
            icon={<FileText className="h-6 w-6" />}
            title="From an example"
            body="A complete sample resume — just swap in your details."
            onClick={onExample}
          />
        </div>
        {onImportPdf && (
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 py-2.5 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10"
            onClick={onImportPdf}
          >
            <FileUp className="h-4 w-4" /> Import your existing PDF résumé
          </button>
        )}
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Parsed entirely in your browser — your résumé is never uploaded.</p>
        <button
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
          onClick={onImport}
        >
          <FileUp className="h-3.5 w-3.5" /> or import a JSON Resume file
        </button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Persona picker for "Start with an example" — shows a few believable, varied
 * resumes (engineer, marketing, new grad, student, designer) rendered live in
 * a flattering template, so first-run users of any background see themselves
 * and get ideas. The student is the one still IN school: an expected
 * graduation, school marks, and projects where a job history would be.
 */
/** What the picker hands back: enough to start the résumé, and to name it. */
export interface PickedSample {
  template: string
  content: ResumeContent
  tweaks?: (m: import('@/types/metadata').Metadata) => void
  role: string
}

/**
 * Pick a starting example.
 *
 * It used to offer seven hand-written personas while the public library holds
 * a hundred and eight, so someone who had just browsed the examples on the
 * site found a different, much smaller set the moment they were inside the
 * app. It offers the same library now — searchable, and filtered by field.
 *
 * The library is imported DYNAMICALLY, on open: it is a hundred complete
 * résumés, and every page that can open this dialog (the landing page among
 * them) would otherwise carry them all.
 */
export function SamplePicker({ onPick, onClose }: { onPick: (p: PickedSample) => void; onClose: () => void }) {
  const [library, setLibrary] = useState<readonly LibrarySample[] | null>(null)
  /** Where each sample's page picture lives, and what to call it — loaded WITH
   *  the library rather than imported at the top of this file, because
   *  lib/seoLibrary imports the library itself and every page that can open
   *  this dialog (the landing page among them) would then carry all 108. */
  const [pics, setPics] = useState<SamplePictures | null>(null)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<readonly LibraryCategory[]>([])
  // Twelve field chips stood between the search box and the first example on a
  // 375px phone; the public shelves already fold theirs.
  const [chipsOpen, setChipsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([import('@/data/library'), import('@/lib/seoLibrary')]).then(([lib, seo]) => {
      if (!alive) return
      setLibrary(lib.LIBRARY)
      setPics(seo)
    })
    return () => {
      alive = false
    }
  }, [])

  // Escape closes, and the search box takes the caret, so the dialog can be
  // driven without reaching for the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    searchRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = useMemo(
    () => (library ? filterLibrary(library, { ...EMPTY_LIBRARY_FILTER, query, categories }) : []),
    [library, query, categories]
  )

  return createPortal(
    // The scrim is a flat colour, never a backdrop filter. Blurring the whole
    // page behind a dialog is re-computed every frame while it is open, and
    // over this page it measured 50ms a frame (15fps); a deeper scrim reads
    // the same and composites once.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick a starting example"
        className="relative z-10 flex max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-border bg-surface p-4 shadow-float sm:p-6"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pick a starting example</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          A complete résumé for that job, written out in full — swap in your details, switch designs anytime. Everything
          in one is invented.
        </p>

        <div className="mb-3 space-y-2.5">
          <label className="relative block max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a job title, a skill, a field…"
              aria-label="Search the examples"
              className="input h-9 w-full pl-9 pr-3 text-sm"
            />
          </label>
          <button
            type="button"
            className="btn-outline btn-sm w-full justify-between sm:hidden"
            aria-expanded={chipsOpen}
            onClick={() => setChipsOpen((v) => !v)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Fields
              {categories.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                  {categories.length}
                </span>
              )}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', chipsOpen && 'rotate-180')} />
          </button>
          <div className={cn('flex-wrap gap-1.5 sm:flex', chipsOpen ? 'flex' : 'hidden')}>
            {LIBRARY_CATEGORIES.map((c) => {
              const on = categories.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategories(toggleFacet(categories, c))}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    on
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {library ? `${shown.length} of ${library.length} examples` : 'Loading the examples…'}
          </p>
          <Link
            to="/examples"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Read them in full <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {library && shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-medium">No example matches that</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
              Try the job title on its own, or clear the field chips.
            </p>
          </div>
        ) : (
          // Two per row at 375px, not one: a single column of page-shaped cards
          // put the second example a full screen below the first.
          <div className="panel-scroll grid grid-cols-2 gap-3 overflow-y-auto overflow-x-hidden pr-1 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            {library && pics
              ? shown.map((sample, i) => (
                  <SampleCard key={sample.slug} sample={sample} pics={pics} eager={i < 6} onPick={onPick} />
                ))
              : // Placeholders at the shape of the cards, so the dialog does not
                // jump the moment the library lands.
                Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                    <div className="aspect-[210/297] border-b border-border bg-white">
                      <ThumbSkeleton />
                    </div>
                    <div className="h-[58px] p-3" />
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/** The three things this dialog needs to show a sample's picture. Named as a
 *  type so the dynamic import's shape is checked, not cast. */
type SamplePictures = {
  samplePageImage: (slug: string) => string
  samplePageImageHeight: (slug: string) => number
  sampleImageAlt: (slug: string) => string
}

function SampleCard({
  sample,
  pics,
  onPick,
  eager,
}: {
  sample: LibrarySample
  pics: SamplePictures
  onPick: (p: PickedSample) => void
  eager?: boolean
}) {
  // Every full résumé here used to mount live — four at once when the dialog
  // opened, then one per idle grant. Opening the dialog and browsing it cost
  // 9.7s of main-thread task time on a desk and 6.7s on a phone, and after
  // nine seconds only 35 of the 108 cards had a résumé in them (production
  // build, 2026-09-15). It is the picture of the exported page now.
  const pick = () => onPick({ template: sample.template, content: sample.content, tweaks: sample.tweaks, role: sample.role })

  return (
    <HoverZoom
      src={pics.samplePageImage(sample.slug)}
      height={pics.samplePageImageHeight(sample.slug)}
      label={`${sample.role} example`}
    >
      <button
        onClick={pick}
        // The CARD follows the theme; only the thumbnail below is paper
        // white. It used to be white throughout while its text used
        // theme tokens, so in dark mode the title was light-on-white and
        // effectively invisible (2026-08-25 report).
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
        title={`Start from the ${sample.role} example`}
      >
        <PagePicture
          src={pics.samplePageImage(sample.slug)}
          height={pics.samplePageImageHeight(sample.slug)}
          alt={pics.sampleImageAlt(sample.slug)}
          eager={eager}
          className="w-full border-b border-border"
        />
        <div className="p-2.5 sm:p-3">
          <div className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">{sample.role}</div>
          <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{sample.blurb}</div>
        </div>
      </button>
    </HoverZoom>
  )
}

function ChooserCard({ icon, title, body, onClick, primary }: { icon: React.ReactNode; title: string; body: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${primary ? 'border-primary/40 bg-primary/5 hover:border-primary' : 'border-border bg-surface hover:border-primary/60'}`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${primary ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
  )
}
