/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
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
import { useResumeActions, NewResumeModal, SamplePicker } from '@/components/dashboard/newResume'
import { InstallButton } from '@/components/ui/InstallButton'
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
  { capability: 'Templates', cvaurum: '30+ premium templates, edited live on the canvas', others: 'A few basic layouts, polish behind a paywall' },
  { capability: 'ATS check', cvaurum: 'Built-in deterministic score + job-description keyword match', others: 'None, or an opaque AI score you can’t reproduce' },
  { capability: 'Offline', cvaurum: 'All fonts self-hosted — zero external requests, truly offline', others: 'Pulls fonts/assets from CDNs — still phones home' },
  { capability: 'Export formats', cvaurum: 'Vector PDF (selectable text), Word .docx, and JSON Resume', others: 'PDF only, often a flattened image' },
  { capability: 'Price', cvaurum: 'Free, forever — no tiers, no upsell', others: 'Free to start, then paywalled to export' },
]

export function Landing() {
  useTitle('CVAurum — Free Open-Source Resume Builder (Local, Private, ATS-Ready)')
  const library = useAppStore((s) => s.library)
  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)

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
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => importPdf(e.target.files?.[0])} />

      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#templates" className="transition hover:text-foreground">Templates</a>
            <a href="#compare" className="transition hover:text-foreground">Compare</a>
            <a href="#privacy" className="transition hover:text-foreground">Privacy</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a className="btn-ghost btn-sm hidden sm:inline-flex" href={REPO_URL} target="_blank" rel="noreferrer" title="View source on GitHub">
              <Github className="h-4 w-4" /> GitHub
            </a>
            <InstallButton />
            <ThemeToggle />
            <Link className={hasResumes ? 'btn-outline btn-sm' : 'btn-ghost btn-sm'} to="/app">
              <span className="sm:hidden">Resumes</span>
              <span className="hidden sm:inline">My resumes{hasResumes ? ` (${library.length})` : ''}</span>
            </Link>
            <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
              <Plus className="h-4 w-4" />
              <span>Create<span className="hidden sm:inline"> resume</span></span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* hero — the cinematic stage */}
        <HeroCinema
          onCreate={() => setChooser(true)}
          onSample={() => setSampleOpen(true)}
          onImportPdf={() => pdfRef.current?.click()}
          cards={showcase.slice(0, 3)}
        />

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
              <Step n={1} icon={<LayoutGrid className="h-5 w-5" />} title="Pick a template" body="Choose from 30+ recruiter-ready designs. Switch anytime — your content carries over." />
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
            <Faq q="Do I need to create an account?" a="No. There's no sign-up, no email, and no login — open CVAurum and start editing immediately. Most builders make you register before you can even see the editor; CVAurum never does." />
            <Faq q="What's the difference between a CV and a resume?" a="A resume is a concise, one-to-two page summary tailored to a specific job (common in the US). A CV is a longer, comprehensive record of your academic and professional history (standard in academia and much of Europe). CVAurum builds both — pick a compact template for a resume, or add sections for a full CV." />
            <Faq q="What file formats can I download?" a="A crisp vector PDF with real, selectable text; an editable Word (.docx) that mirrors your template; and the open JSON Resume format. Every export is free and unlimited — no paywall, no watermark." />
            <Faq q="How long should my resume be?" a="For most roles, one page — two if you have 10+ years of experience. CVAurum auto-fits your content to a single page when it's close, and shows live page-break guides so you always know where you stand." />
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
          onExample={() => { setChooser(false); setSampleOpen(true) }}
          onImport={() => { setChooser(false); fileRef.current?.click() }}
          onImportPdf={() => { setChooser(false); pdfRef.current?.click() }}
          onClose={() => setChooser(false)}
        />
      )}
      {sampleOpen && (
        <SamplePicker onClose={() => setSampleOpen(false)} onPick={(p) => { setSampleOpen(false); create(true, p.template, p.content) }} />
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

/**
 * The cinematic hero: a self-contained dark stage with a drifting aurora,
 * a shimmering headline, and a mouse-parallax 3D fan of live template cards.
 * Pure CSS + framer-motion (zero external assets); honors reduced-motion.
 */
function HeroCinema({
  onCreate,
  onSample,
  onImportPdf,
  cards,
}: {
  onCreate: () => void
  onSample: () => void
  onImportPdf: () => void
  cards: { id: string; doc: ReturnType<typeof createDocument> }[]
}) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 110, damping: 16 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 110, damping: 16 })
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <section className="relative overflow-hidden bg-[#0a0c12] text-white" onMouseMove={onMove}>
      {/* drifting aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[8%] h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side,#d4982f55,transparent)' }}
        animate={reduce ? undefined : { x: [0, 60, -30, 0], y: [0, 30, 10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 right-[4%] h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side,#5b5df033,transparent)' }}
        animate={reduce ? undefined : { x: [0, -70, 20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-1/3 top-1/3 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side,#2dd4bf22,transparent)' }}
        animate={reduce ? undefined : { x: [0, 40, -40, 0], y: [0, -40, 24, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* fine dot grid for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.55) 1px, transparent 1.4px)', backgroundSize: '26px 26px' }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.05fr_1fr] md:py-28">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Local-first · Free · Open source
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            A resume this beautiful
            <br />
            never leaves your{' '}
            <span
              className="hero-shimmer bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(110deg,#8a5a12 0%,#d4982f 25%,#f7d774 50%,#d4982f 75%,#8a5a12 100%)' }}
            >
              browser
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
            52 designer templates you can restyle <em className="not-italic text-white/90">section by section</em>, a built-in ATS check with a
            parser&apos;s-eye view, PDF import with on-device OCR — and not a single byte of your career story sent to any server.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-[#1c1503] shadow-[0_10px_44px_-10px_rgba(212,152,47,0.65)] transition hover:scale-[1.03] active:scale-[0.99]"
              style={{ background: GOLD }}
              onClick={onCreate}
            >
              <Plus className="h-4 w-4" /> Create my resume
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/[0.12]"
              onClick={onSample}
            >
              <FileText className="h-4 w-4" /> Start with an example
            </button>
          </div>
          <p className="mt-5 text-xs text-white/50">
            Already have one?{' '}
            <button onClick={onImportPdf} className="inline-flex items-center gap-1 font-medium text-amber-300/90 underline-offset-2 hover:underline">
              <FileUp className="h-3.5 w-3.5" /> Import your PDF
            </button>{' '}
            — parsed entirely on your device.
          </p>
        </motion.div>

        {/* parallax 3D fan of live templates */}
        <div className="hidden [perspective:1200px] md:block" aria-hidden>
          <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }} className="relative mx-auto h-[26rem] w-[24rem]">
            {cards.map((c, i) => (
              <motion.div
                key={c.id}
                className="absolute overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_24px_70px_-18px_rgba(0,0,0,0.75)]"
                style={{
                  width: '15rem',
                  left: `${i * 3.4}rem`,
                  top: `${i * 1.6}rem`,
                  zIndex: 3 - i,
                  rotate: `${(i - 1) * 7}deg`,
                  transform: `translateZ(${(2 - i) * 46}px)`,
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, i % 2 ? -8 : -14, 0] }}
                transition={
                  reduce
                    ? { duration: 0.6, delay: 0.15 + i * 0.12 }
                    : {
                        opacity: { duration: 0.6, delay: 0.15 + i * 0.12 },
                        y: { duration: 7 + i * 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 },
                      }
                }
              >
                <div className="aspect-[210/297] overflow-hidden">
                  <PreviewThumb doc={c.doc} width={240} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
