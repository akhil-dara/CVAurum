/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  Plus,
  FileUp,
  ShieldCheck,
  Target,
  FileDown,
  WifiOff,
  ArrowRight,
  LayoutGrid,
  PencilLine,
  Download,
  Github,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useResumeActions, NewResumeModal } from '@/components/dashboard/newResume'
import { useTitle } from '@/lib/useTitle'

const GOLD = 'linear-gradient(135deg,#8a5a12,#d4982f,#f7d774)'
const goldText = { backgroundImage: GOLD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const
const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** Templates shown live (with sample content) in the showcase strip. */
const SHOWCASE = ['mercury', 'halcyon', 'aria', 'deedy', 'onyx', 'portrait']

/** Honest head-to-head: what CVAurum does vs. what most resume builders do. */
const COMPARISON: { capability: string; cvaurum: string; others: string }[] = [
  { capability: 'Where your data lives', cvaurum: 'Only in your browser — no server, no account, no tracking', others: 'Uploaded to a server behind a login' },
  { capability: 'Source code', cvaurum: 'Fully open source (MIT) — read it, fork it, self-host it', others: 'Closed — you take the privacy claims on faith' },
  { capability: 'Templates', cvaurum: '30 premium templates, edited live on the canvas', others: 'A few basic layouts, polish behind a paywall' },
  { capability: 'ATS check', cvaurum: 'Built-in deterministic score + job-description keyword match', others: 'None, or an opaque AI score you can’t reproduce' },
  { capability: 'Offline', cvaurum: 'All fonts self-hosted — zero external requests, truly offline', others: 'Pulls fonts/assets from CDNs — still phones home' },
  { capability: 'Export formats', cvaurum: 'Vector PDF (selectable text), Word .docx, and JSON Resume', others: 'PDF only, often a flattened image' },
  { capability: 'Price', cvaurum: 'Free, forever — no tiers, no upsell', others: 'Free to start, then paywalled to export' },
]

export function Landing() {
  useTitle('CVAurum — Free Open-Source Resume Builder (Local, Private, ATS-Ready)')
  const library = useAppStore((s) => s.library)
  const { create, importFile } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)

  // Throwaway sample docs (one per showcased template) for the live thumbnails.
  const showcase = useMemo(
    () =>
      SHOWCASE.map((id) => {
        const d = createDocument({ sample: true })
        d.metadata = applyTemplateToMetadata(d.metadata, getTemplate(id).defaults)
        return { id, doc: d }
      }),
    [],
  )

  const hasResumes = library.length > 0

  return (
    <div className="min-h-full bg-background">
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />

      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo to="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#templates" className="transition hover:text-foreground">Templates</a>
            <a href="#compare" className="transition hover:text-foreground">Compare</a>
            <a href="#privacy" className="transition hover:text-foreground">Privacy</a>
          </nav>
          <div className="flex items-center gap-2">
            <a className="btn-ghost btn-sm hidden sm:inline-flex" href={REPO_URL} target="_blank" rel="noreferrer" title="View source on GitHub">
              <Github className="h-4 w-4" /> GitHub
            </a>
            <ThemeToggle />
            {hasResumes ? (
              <Link className="btn-outline btn-sm" to="/app">
                My resumes ({library.length})
              </Link>
            ) : (
              <Link className="btn-ghost btn-sm" to="/app">
                My resumes
              </Link>
            )}
            <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
              <Plus className="h-4 w-4" /> Create resume
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ background: 'radial-gradient(60% 50% at 70% 0%, #d4982f 0%, transparent 70%)' }}
          />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Local-first · Free · Open source
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                A beautiful resume that never leaves your <span style={goldText}>browser</span>.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                CVAurum is the only resume builder that's <strong className="text-foreground">private</strong> and{' '}
                <strong className="text-foreground">open-source</strong> and genuinely beautiful — with 30 templates, a
                built-in ATS check, and true offline use. <strong className="text-foreground">Free, forever.</strong>
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn-primary" onClick={() => setChooser(true)}>
                  <Plus className="h-4 w-4" /> Create my resume
                </button>
                <button className="btn-outline" onClick={() => create(true)}>
                  <FileText className="h-4 w-4" /> Start with an example
                </button>
                <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                  <FileUp className="h-4 w-4" /> Import JSON
                </button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">No account. No tracking. Works offline.</p>
            </motion.div>

            {/* floating template preview */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative mx-auto hidden w-full max-w-sm md:block"
            >
              <div className="absolute -inset-6 -z-10 rounded-[2rem] opacity-20 blur-2xl" style={{ background: GOLD }} />
              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <div className="aspect-[210/297] overflow-hidden">{showcase[0] && <PreviewThumb doc={showcase[0].doc} width={384} />}</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Three steps to a polished résumé</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                No sign-up, no setup. Everything happens right here in your browser.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <Step n={1} icon={<LayoutGrid className="h-5 w-5" />} title="Pick a template" body="Choose from 30 recruiter-ready designs. Switch anytime — your content carries over." />
              <Step n={2} icon={<PencilLine className="h-5 w-5" />} title="Fill it in" body="Edit right on the page. A live ATS score and keyword match keep you on track." />
              <Step n={3} icon={<Download className="h-5 w-5" />} title="Export & apply" body="Download a crisp, selectable PDF or an ATS-friendly Word file in one click." />
            </div>
          </div>
        </section>

        {/* template showcase */}
        <section id="templates" className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Start from a recruiter-ready template</h2>
              <p className="mt-1 text-sm text-muted-foreground">Click any design to start editing — switch anytime, your content stays.</p>
            </div>
            <Link className="btn-ghost btn-sm hidden sm:inline-flex" to="/app">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map(({ id, doc }) => (
              <button
                key={id}
                onClick={() => create(true, id)}
                className="group block overflow-hidden rounded-xl border border-border bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
                title={`Use the ${getTemplate(id).name} template`}
              >
                <div className="aspect-[210/297] overflow-hidden">
                  <PreviewThumb doc={doc} width={210} />
                </div>
                <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5">
                  <span className="text-xs font-medium">{getTemplate(id).name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* feature band */}
        <section className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Private by architecture" body="No server, no account, no tracking. Your data lives only in this browser." />
            <Feature icon={<Target className="h-5 w-5" />} title="ATS built in" body="A live, deterministic ATS score and job-description keyword matching." />
            <Feature icon={<FileDown className="h-5 w-5" />} title="PDF & Word export" body="Pixel-perfect PDF plus a clean, ATS-friendly .docx — generated in-browser." />
            <Feature icon={<WifiOff className="h-5 w-5" />} title="Works offline" body="Installable, with all fonts bundled. Zero external requests, ever." />
          </div>
        </section>

        {/* comparison */}
        <section id="compare" className="mx-auto max-w-5xl px-6 py-14">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Most builders win one thing. CVAurum wins them all.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Privacy, or open source, or design, or ATS, or offline — most tools pick one. Here's the honest head-to-head.
            </p>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground"> </th>
                  <th className="px-4 py-3 font-bold" style={goldText}>CVAurum</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Most builders</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.capability} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">{r.capability}</td>
                    <td className="px-4 py-3">
                      <span className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{r.cvaurum}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* privacy callout */}
        <section id="privacy" className="mx-auto max-w-6xl px-6 py-16">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-8 sm:p-12">
            <div className="grid items-center gap-8 md:grid-cols-[auto,1fr]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ background: GOLD }}>
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Your résumé never leaves your device</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Most online builders upload your career history to their servers. CVAurum doesn't have a server. Everything —
                  your content, your photo, your exports — is created and stored locally in your browser. You can back it all up
                  to a single file and restore it anywhere. It's open source, so you can verify exactly that.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
                    <Plus className="h-4 w-4" /> Create my resume
                  </button>
                  <a className="btn-outline btn-sm" href={REPO_URL} target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4" /> View the source
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* faq */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <h2 className="text-center text-xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6 space-y-3">
            <Faq q="How do I know my data is really private?" a="Because you can check. CVAurum runs entirely in your browser — your resume is stored locally and never sent anywhere. There's no account, no server, and no analytics. Open your browser's network tab and you'll see zero outbound requests, even for fonts, which we self-host." />
            <Faq q="If it's free and open source, what's the catch?" a="There isn't one. CVAurum is MIT-licensed and the full source is on GitHub. There's no paid tier, no export paywall, and no data to monetize because we never collect any. Fork it, self-host it, or run it offline forever." />
            <Faq q="Is the ATS score real, or AI guesswork?" a="It's deterministic, not a guess. The same resume and job description always produce the same score, and it shows exactly which keywords matched and which are missing — so you can fix your resume with confidence." />
            <Faq q="Where is my data stored?" a="Only in your browser, using local storage. Nothing is sent anywhere. Clear your browser data and it's gone — so use Backup to keep a copy." />
            <Faq q="Will my résumé pass ATS scans?" a="The exported PDF and Word files use real, selectable text (not an image), and there's a built-in ATS check that scores structure and keyword coverage against a job description." />
            <Faq q="Can I move my résumé to another computer?" a="Yes. Export a full backup (one file) or a single JSON Resume file, then import it in any browser." />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-1.5">
            <Logo compact to="/" /> · Built for everyone job hunting.
          </span>
          <span className="inline-flex items-center gap-3">
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
            <span>100% local · MIT licensed</span>
          </span>
        </div>
      </footer>

      {chooser && (
        <NewResumeModal
          onBlank={() => { setChooser(false); create(false) }}
          onExample={() => { setChooser(false); create(true) }}
          onImport={() => { setChooser(false); fileRef.current?.click() }}
          onClose={() => setChooser(false)}
        />
      )}
    </div>
  )
}

function Step({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-background p-6">
      <span className="absolute right-5 top-5 text-3xl font-bold text-muted-foreground/15">{n}</span>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border bg-surface px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
        {q}
        <span className="ml-4 text-muted-foreground transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  )
}
