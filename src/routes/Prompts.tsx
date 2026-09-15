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
 *
 * SHAPE, and why it changed (2026-09-15). The page used to open with two
 * paragraphs, a three-step strip, a paragraph about the schema and an on-page
 * index before the first prompt, then print all six in full: 7791px on a
 * 375x812 phone, with the first thing you could press 536px down. It now
 * leads with the one line that says what to do, lists the six as a stack of
 * plain titles, and opens ONE at a time. Every prompt still renders into the
 * DOM — the closed ones are `hidden`, not absent — so what a crawler is
 * served, what the Markdown twin says and what a person can read are one
 * text, which is the rule this page has always been held to.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, Check, ChevronDown, ClipboardPaste, Copy, FileJson, Plus } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { NewResumeModal, SamplePicker, useResumeActions } from '@/components/dashboard/newResume'
import { PROMPTS, PROMPTS_INTRO, SCHEMA_DOC, SITE, promptsPageMeta, type PromptEntry } from '@/lib/seoPages'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/utils'

/** How long the button says "Copied" before going back to "Copy". */
const COPIED_MS = 1800

/** Where the paste box lives, so a prompt can send you straight to it. */
const PASTE_ID = 'paste-the-answer'

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

  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)

  /**
   * Which prompt is open. One at a time: six prompts opened at once is the
   * page this one replaced. None is open on arrival, which is what makes the
   * first screen a list you can read — six titles and the paste box all fit
   * above the fold on a 375x812 phone, where the old page needed 536px of
   * scrolling before the first thing you could press.
   */
  const [open, setOpen] = useState<string>('')

  // A link into one prompt (the Markdown twin and the pre-rendered HTML both
  // carry the fragments, and so does the index further down) has to OPEN that
  // prompt, or it lands on a closed row and looks broken.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    const hit = PROMPTS.find((p) => p.id === id)
    if (hit) {
      setOpen(hit.id)
      // After the panel is in the DOM, not before it.
      requestAnimationFrame(() => document.getElementById(hit.id)?.scrollIntoView())
      return
    }
    // Arriving from a link halfway down another page keeps that page's scroll
    // position.
    window.scrollTo(0, 0)
  }, [])

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
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="max-w-3xl">
          {/* Smaller than the other pages' h1 on a phone on purpose: at
              text-3xl this heading took three lines and 120px of the first
              screen before a word of instruction. */}
          <h1 className="text-[1.6rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.4rem] sm:leading-[1.12]">
            {PROMPTS.length} prompts for your AI assistant
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">{PROMPTS_INTRO}</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            {PROMPTS.map((p, i) => (
              <PromptRow
                key={p.id}
                prompt={p}
                n={i + 1}
                open={open === p.id}
                onToggle={() => setOpen((cur) => (cur === p.id ? '' : p.id))}
              />
            ))}
          </div>

          <PasteAnswer onImport={importFile} />

          <p className="mt-7 text-sm leading-relaxed text-muted-foreground">
            Every prompt asks for{' '}
            <a
              className="text-primary hover:underline"
              href="https://jsonresume.org/schema"
              target="_blank"
              rel="noreferrer"
            >
              JSON Resume
            </a>
            , the open format this app reads and writes, and sends the assistant to{' '}
            <a className="text-primary hover:underline" href="/skills/cvaurum/SKILL.md">
              the field list
            </a>{' '}
            rather than letting it guess.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nothing here is sent anywhere: the copying, the pasting and the import all happen in your browser. What you
            type into someone else's assistant is between you and them — leave out anything you would not want stored
            there, and put it in the editor instead.
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

/**
 * One row of the stack: a title you can press, and the prompt underneath it.
 *
 * The panel is rendered whether or not it is open and hidden with the `hidden`
 * attribute. Unmounting it would be cheaper, but it would also take the prompt
 * out of the page a crawler and an assistant read — and the whole argument for
 * this page is that the six prompts ARE its content.
 */
function PromptRow({ prompt, n, open, onToggle }: { prompt: PromptEntry; n: number; open: boolean; onToggle: () => void }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), COPIED_MS)
    return () => clearTimeout(t)
  }, [state])

  const copy = async () => setState((await copyText(prompt.prompt)) ? 'done' : 'failed')

  return (
    // `scroll-mt` so a fragment link does not land the title under the sticky
    // header.
    <section id={prompt.id} className="scroll-mt-16 border-b border-border last:border-b-0">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${prompt.id}-panel`}
          // min-h-[56px]: the whole row is the target, not the chevron. A
          // 32px row was what the copy buttons measured on the old page.
          className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums',
              open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
            aria-hidden
          >
            {n}
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{prompt.title}</span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h2>

      <div id={`${prompt.id}-panel`} hidden={!open} className="border-t border-border bg-background px-4 pb-5 pt-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{prompt.when}</p>

        <button
          type="button"
          onClick={copy}
          // Full width and 44px tall on a phone: this is the button the whole
          // page exists for, and the old one was 83x32.
          className={cn(
            'btn-primary mt-3.5 h-11 w-full sm:w-auto sm:px-6',
            state === 'done' && 'bg-success text-white'
          )}
          aria-label={`Copy the prompt: ${prompt.title}`}
        >
          {state === 'done' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {state === 'done' ? 'Copied' : state === 'failed' ? 'Select it instead' : 'Copy this prompt'}
        </button>

        <pre
          // `whitespace-pre-wrap` and `break-words`: the prompts hold lines far
          // wider than a 375px phone, and a <pre> that does not wrap is the
          // classic way a page ends up scrolling sideways.
          className="mt-3.5 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-3.5 font-mono text-[12.5px] leading-relaxed text-foreground sm:p-4"
        >
          {prompt.prompt}
        </pre>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">What to do with the answer: </span>
          {prompt.after}
        </p>

        {/* The other half of the loop is a long prompt away once this panel is
            open, so the panel carries its own way back to it. */}
        <a
          href={`#${PASTE_ID}`}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
          Paste the answer
        </a>

        <span aria-live="polite" className="sr-only">
          {state === 'done' ? 'Prompt copied to the clipboard' : ''}
        </span>
      </div>
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
    <section id={PASTE_ID} className="mt-6 scroll-mt-16 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground sm:text-lg">
        <ClipboardPaste className="h-4 w-4 text-primary" />
        Paste the answer here
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        It opens as a résumé you can edit. Leaving the code fence on is fine.
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
        className="textarea mt-3 min-h-[7.5rem] w-full p-3 font-mono text-[12.5px]"
      />
      <button type="button" className="btn-primary mt-3 h-11 w-full sm:w-auto sm:px-6" disabled={!body} onClick={go}>
        <FileJson className="h-4 w-4" />
        Open it as a résumé
      </button>
    </section>
  )
}
