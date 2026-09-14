/**
 * The prompt library (/prompts).
 *
 * Someone who talks to an assistant every day already has their history in a
 * chat window rather than in a form, and the shortest path from there to a
 * résumé is a prompt whose answer this app imports. So every prompt here asks
 * for JSON Resume — which is literally what a CVAurum file is (src/lib/io.ts)
 * — and the page closes the loop itself: paste the answer into the box at the
 * foot and the résumé opens in the editor.
 *
 * The prompts themselves live in src/lib/seoPages.ts, not here, because the
 * pre-rendered HTML and the Markdown twin have to be the same text as the
 * page. This file is only how a person reads and copies them.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardPaste, Copy, FileJson, Plus } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { NewResumeModal, SamplePicker, useResumeActions } from '@/components/dashboard/newResume'
import { PROMPTS, PROMPTS_INTRO, SCHEMA_DOC, SITE, promptsPageMeta, type PromptEntry } from '@/lib/seoPages'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/utils'

/** How long the button says "Copied" before going back to "Copy". */
const COPIED_MS = 1800

/**
 * Put text on the clipboard.
 *
 * `navigator.clipboard` is unavailable on an insecure origin and can reject
 * when the document is not focused, and a prompt nobody can copy is a page
 * with no purpose — so the old execCommand path stays as the fallback.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function Prompts() {
  const meta = promptsPageMeta()
  useSeo({
    title: meta.title,
    description: meta.description,
    image: `${SITE}${meta.image}`,
    url: `${SITE}${meta.path}`,
  })
  // Arriving from a link halfway down another page keeps that page's scroll
  // position, and this one is tall enough to hold one.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)

  return (
    <div className="min-h-full bg-background">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => importFile(e.target.files?.[0])}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => importPdf(e.target.files?.[0])}
      />

      <SiteHeader
        current="prompts"
        action={
          <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
            <Plus className="h-4 w-4" />
            <span>
              Create<span className="hidden sm:inline"> resume</span>
            </span>
          </button>
        }
      />

      {/* The header's own row is max-w-6xl, so the page sits in one too and
          keeps its prose to max-w-3xl inside it — centring a 3xl column in the
          viewport instead put the h1 well to the right of the logo. */}
      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.12]">
            {PROMPTS.length} prompts for the assistant you already use
          </h1>
          <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">{PROMPTS_INTRO}</p>

          <ol className="mt-6 flex flex-col gap-1.5 border-y border-border py-5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            <li className="text-muted-foreground">
              <span className="mr-1.5 font-semibold text-foreground">1</span>Copy a prompt
            </li>
            <li className="text-muted-foreground">
              <span className="mr-1.5 font-semibold text-foreground">2</span>Paste it into your assistant, with your own
              material
            </li>
            <li className="text-muted-foreground">
              <span className="mr-1.5 font-semibold text-foreground">3</span>Paste the answer back here
            </li>
          </ol>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Every prompt asks for{' '}
            <a
              className="text-primary hover:underline"
              href="https://jsonresume.org/schema"
              target="_blank"
              rel="noreferrer"
            >
              JSON Resume
            </a>
            , the open format this app reads and writes — a file exported here <em>is</em> a JSON Resume document. The
            field names an assistant needs are published at{' '}
            <a className="text-primary hover:underline" href="/skills/cvaurum/SKILL.md">
              /skills/cvaurum/SKILL.md
            </a>
            , generated from the schemas the importer validates against, so a prompt can never send it after a field
            that no longer exists. Import drops a field it cannot read rather than the whole file, so an imperfect
            answer still arrives as most of a résumé.
          </p>

          {/* A short index: six long prompts are a long page, and someone who
            came for one of them should not have to scroll past five. */}
          <nav aria-label="The prompts" className="mt-7 rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {PROMPTS.map((p) => (
                <li key={p.id}>
                  <a className="text-sm text-foreground transition hover:text-primary" href={`#${p.id}`}>
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 flex flex-col gap-8">
            {PROMPTS.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>

          <PasteAnswer onImport={importFile} />

          <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
            Nothing on this page is sent anywhere: the copying, the pasting and the import all happen in your browser.
            What you type into someone else's assistant is between you and them — so leave out anything you would not
            want stored there, and put it in the editor instead.
          </p>

          <p className="mt-6 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" to="/templates">
              Browse the designs
            </Link>{' '}
            ·{' '}
            <Link className="text-primary hover:underline" to="/examples">
              Read complete examples
            </Link>{' '}
            ·{' '}
            <a className="text-primary hover:underline" href={SCHEMA_DOC.replace(SITE, '')}>
              The document shape, for an assistant
            </a>
          </p>
        </div>
      </main>

      <SiteFooter />

      {chooser && (
        <NewResumeModal
          onBlank={() => {
            setChooser(false)
            create(false)
          }}
          onExample={() => {
            setChooser(false)
            setSampleOpen(true)
          }}
          onImport={() => {
            setChooser(false)
            fileRef.current?.click()
          }}
          onImportPdf={() => {
            setChooser(false)
            pdfRef.current?.click()
          }}
          onClose={() => setChooser(false)}
        />
      )}
      {sampleOpen && (
        <SamplePicker
          onClose={() => setSampleOpen(false)}
          onPick={(p) => {
            setSampleOpen(false)
            create(true, p.template, p.content, p.tweaks, `${p.role} resume`)
          }}
        />
      )}
    </div>
  )
}

/** One prompt: what it is for, the text, and what to do with the answer. */
function PromptCard({ prompt }: { prompt: PromptEntry }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), COPIED_MS)
    return () => clearTimeout(t)
  }, [state])

  const copy = async () => setState((await copyText(prompt.prompt)) ? 'done' : 'failed')

  return (
    // `scroll-mt` so the index's jump links do not land the heading under the
    // sticky header.
    <section id={prompt.id} className="scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug text-foreground">{prompt.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{prompt.when}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          // The copy button sits above the block on a phone, where the heading
          // takes the full width; keeping it a real button (not an icon on the
          // block's corner) is what makes it reachable with a thumb.
          className={cn('btn-outline btn-sm shrink-0', state === 'done' && 'border-success/50 text-success')}
          aria-label={`Copy the prompt: ${prompt.title}`}
        >
          {state === 'done' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {state === 'done' ? 'Copied' : state === 'failed' ? 'Select it instead' : 'Copy'}
        </button>
      </div>
      <pre
        // `whitespace-pre-wrap` and `break-words`: the prompts hold lines far
        // wider than a 375px phone, and a <pre> that does not wrap is the
        // classic way a page ends up scrolling sideways.
        className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-4 font-mono text-[12.5px] leading-relaxed text-foreground"
      >
        {prompt.prompt}
      </pre>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">What to do with the answer: </span>
        {prompt.after}
      </p>
      <span aria-live="polite" className="sr-only">
        {state === 'done' ? 'Prompt copied to the clipboard' : ''}
      </span>
    </section>
  )
}

/**
 * The other half of the loop: the answer arrives in a chat window, not as a
 * file, so the page takes it as text. It goes through the SAME import path a
 * dropped file does (importDocumentFromFile, via useResumeActions), so the
 * photo sanitising and the field-by-field salvage apply here too rather than
 * being reimplemented and drifting.
 */
function PasteAnswer({ onImport }: { onImport: (file?: File) => void | Promise<void> }) {
  const [text, setText] = useState('')
  const trimmed = text.trim()
  // A fenced block pasted straight out of a chat window is the common case,
  // and refusing it would send people back to strip three backticks by hand.
  const body = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim()

  const go = () => {
    if (!body) return
    onImport(new File([body], 'from-a-prompt.json', { type: 'application/json' }))
  }

  return (
    <section className="mt-12 rounded-2xl border border-border bg-surface p-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
        <ClipboardPaste className="h-4 w-4 text-primary" />
        Paste the answer
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Drop the JSON your assistant gave you in here and it opens as a résumé you can edit. The code fence around it is
        fine to leave on. Nothing is uploaded — the file is built and read in this browser.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={'{\n  "basics": { "name": "…" },\n  "work": [ … ]\n}'}
        aria-label="The JSON Resume document your assistant produced"
        // `textarea`, not `input`: the latter is a fixed 36px row, which
        // squashed a five-row box down to one line and hid all but the first
        // brace of the placeholder.
        className="textarea mt-3.5 min-h-[9rem] w-full p-3 font-mono text-[12.5px]"
      />
      <button type="button" className="btn-primary btn-sm mt-3" disabled={!body} onClick={go}>
        <FileJson className="h-4 w-4" />
        Open it as a résumé
      </button>
    </section>
  )
}
