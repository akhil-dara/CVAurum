/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
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
const goldText = {
  backgroundImage: GOLD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
} as const
const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** Templates shown live (with sample content) in the showcase strip. */
const SHOWCASE = ['clarity', 'obsidian', 'sapphire', 'crest', 'halcyon', 'pinnacle']

/** Honest head-to-head: what CVAurum does vs. what most resume builders do. */
const COMPARISON: { capability: string; cvaurum: string; others: string }[] = [
  {
    capability: 'Where your data lives',
    cvaurum: 'Only in your browser — no server, no account, no tracking',
    others: 'Uploaded to a server behind a login',
  },
  {
    capability: 'Source code',
    cvaurum: 'Fully open source (MIT) — read it, fork it, self-host it',
    others: 'Closed — you take the privacy claims on faith',
  },
  {
    capability: 'Templates',
    cvaurum: '52 designer templates, restylable section by section',
    others: 'A few basic layouts, polish behind a paywall',
  },
  {
    capability: 'ATS check',
    cvaurum: 'Built-in deterministic score + job-description keyword match',
    others: 'None, or an opaque AI score you can’t reproduce',
  },
  {
    capability: 'Offline',
    cvaurum: 'All fonts self-hosted — zero external requests, truly offline',
    others: 'Pulls fonts/assets from CDNs — still phones home',
  },
  {
    capability: 'Export formats',
    cvaurum: 'Vector PDF (PDF/A-2B archival + PDF/UA-1 accessible), Word .docx, and JSON Resume',
    others: 'PDF only, often a flattened image',
  },
  {
    capability: 'Price',
    cvaurum: 'Free, forever — no tiers, no upsell',
    others: 'Free to start, then paywalled to export',
  },
]

export function Landing() {
  useTitle('CVAurum — Free Open-Source Resume Builder (Local, Private, ATS-Ready)')
  const library = useAppStore((s) => s.library)
  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  // The sticky nav sits on the dark hero first, then on token-colored sections.
  // A light glass bar over the hero looks like a rendering glitch — so the nav
  // wears ink glass while the hero is under it and swaps to theme glass after.
  const [overHero, setOverHero] = useState(true)
  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('hero-stage')
      setOverHero(window.scrollY < (hero ? hero.offsetHeight : 600) - 56)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Throwaway sample docs (one per showcased template) for the live thumbnails.
  const showcase = useMemo(
    () =>
      SHOWCASE.map((id) => {
        const d = createDocument({ sample: true })
        d.metadata = applyTemplateToMetadata(d.metadata, getTemplate(id).defaults)
        return { id, doc: d }
      }),
    []
  )

  const hasResumes = library.length > 0

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

      {/* nav — ink glass over the hero, theme glass past it */}
      <header
        className={`sticky top-0 z-30 border-b transition-colors duration-300 ${overHero ? '' : 'backdrop-blur '}${
          overHero
            ? 'border-white/10 bg-[#0a0c12]/85 text-white [&_.btn-ghost]:text-white/85 [&_.btn-ghost:hover]:bg-white/10 [&_.btn-outline]:border-white/25 [&_.btn-outline]:bg-transparent [&_.btn-outline]:text-white [&_.btn-outline:hover]:bg-white/10'
            : 'border-border bg-background/80'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          <nav
            className={`hidden items-center gap-6 text-sm md:flex ${overHero ? 'text-white/60' : 'text-muted-foreground'}`}
          >
            <a href="#how" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              How it works
            </a>
            <a href="#templates" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Templates
            </a>
            <a href="#compare" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Compare
            </a>
            <a href="#privacy" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Privacy
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              className="btn-ghost btn-sm hidden sm:inline-flex"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              title="View source on GitHub"
            >
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
              <span>
                Create<span className="hidden sm:inline"> resume</span>
              </span>
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
        />

        {/* how it works */}
        <section id="how" className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-14 land-reveal">
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Three steps to a polished résumé</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                No sign-up, no setup. Everything happens right here in your browser.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <Step
                n={1}
                icon={<LayoutGrid className="h-5 w-5" />}
                title="Pick a template"
                body="Choose from 52 recruiter-ready designs. Switch anytime — your content carries over."
              />
              <Step
                n={2}
                icon={<PencilLine className="h-5 w-5" />}
                title="Fill it in"
                body="Edit right on the page. A live ATS score and keyword match keep you on track."
              />
              <Step
                n={3}
                icon={<Download className="h-5 w-5" />}
                title="Export & apply"
                body="Download a crisp, selectable PDF or an ATS-friendly Word file in one click."
              />
            </div>
          </div>
        </section>

        {/* template showcase */}
        {/* A full-bleed band of the paper art behind the template strip: ivory
            with one gold stroke in the light theme, charcoal sheets with gold
            edges in the dark one. Feathered top and bottom so it reads as a
            place on the page, not a slab. */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ maskImage: 'linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent)' }}
          >
            <img
              src="/art/band-ivory-stroke-1280.webp"
              srcSet="/art/band-ivory-stroke-1280.webp 1280w, /art/band-ivory-stroke-1920.webp 1920w"
              sizes="100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-80 dark:hidden"
            />
            <img
              src="/art/band-sheets-1280.webp"
              srcSet="/art/band-sheets-1280.webp 1280w, /art/band-sheets-1920.webp 1920w"
              sizes="100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 hidden h-full w-full object-cover opacity-60 dark:block"
            />
          </div>
        <section id="templates" className="relative mx-auto max-w-6xl px-6 py-14 land-reveal">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Start from a recruiter-ready template</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Click any design to start editing — switch anytime, your content stays.
              </p>
            </div>
            <Link className="btn-ghost btn-sm hidden sm:inline-flex" to="/app">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6" data-nosnippet>
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
                  <span className="text-xs font-medium text-slate-800">{getTemplate(id).name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </button>
            ))}
          </div>
        </section>
        </div>

        {/* feature band */}
        <section className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 land-reveal">
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Private by architecture"
              body="No server, no account, no tracking. Your data lives only in this browser."
            />
            <Feature
              icon={<Target className="h-5 w-5" />}
              title="ATS built in"
              body="A live, deterministic ATS score and job-description keyword matching."
            />
            <Feature
              icon={<FileDown className="h-5 w-5" />}
              title="PDF & Word export"
              body="Pixel-perfect PDF plus a clean, ATS-friendly .docx — generated in-browser."
            />
            <Feature
              icon={<WifiOff className="h-5 w-5" />}
              title="Works offline"
              body="Installable, with all fonts bundled. Zero external requests, ever."
            />
          </div>
        </section>

        {/* comparison */}
        <section id="compare" className="mx-auto max-w-5xl px-6 py-14 land-reveal">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Most builders win one thing. CVAurum wins them all.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Privacy, or open source, or design, or ATS, or offline — most tools pick one. Here's the honest
              head-to-head.
            </p>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground"> </th>
                  <th className="px-4 py-3 font-bold" style={goldText}>
                    CVAurum
                  </th>
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
        <section id="privacy" className="mx-auto max-w-6xl px-6 py-16 land-reveal">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-8 shadow-[0_0_90px_-30px_rgba(212,152,47,0.4)] sm:p-12">
            <div className="grid items-center gap-8 md:grid-cols-[auto,1fr]">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                style={{ background: GOLD }}
              >
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Your résumé never leaves your device</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Most online builders upload your career history to their servers. CVAurum doesn't have a server.
                  Everything — your content, your photo, your exports — is created and stored locally in your browser.
                  You can back it all up to a single file and restore it anywhere. It's open source, so you can verify
                  exactly that.
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
        <section className="mx-auto max-w-3xl px-6 pb-16 land-reveal">
          <h2 className="text-center text-xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6 space-y-3">
            <Faq
              q="How do I know my data is really private?"
              a="Because you can check. CVAurum runs entirely in your browser — your resume is stored locally and never sent anywhere. There's no account, no server, and no analytics. Open your browser's network tab and you'll see zero outbound requests, even for fonts, which we self-host."
            />
            <Faq
              q="If it's free and open source, what's the catch?"
              a="There isn't one. CVAurum is MIT-licensed and the full source is on GitHub. There's no paid tier, no export paywall, and no data to monetize because we never collect any. Fork it, self-host it, or run it offline forever."
            />
            <Faq
              q="Is the ATS score real, or AI guesswork?"
              a="It's deterministic, not a guess. The same resume and job description always produce the same score, and it shows exactly which keywords matched and which are missing — so you can fix your resume with confidence."
            />
            <Faq
              q="Where is my data stored?"
              a="Only in your browser, using local storage. Nothing is sent anywhere. Clear your browser data and it's gone — so use Backup to keep a copy."
            />
            <Faq
              q="Will my résumé pass ATS scans?"
              a="The exported PDF and Word files use real, selectable text (not an image), and there's a built-in ATS check that scores structure and keyword coverage against a job description."
            />
            <Faq
              q="Can I move my résumé to another computer?"
              a="Yes. Export a full backup (one file) or a single JSON Resume file, then import it in any browser."
            />
            <Faq
              q="Do I need to create an account?"
              a="No. There's no sign-up, no email, and no login — open CVAurum and start editing immediately. Most builders make you register before you can even see the editor; CVAurum never does."
            />
            <Faq
              q="What's the difference between a CV and a resume?"
              a="A resume is a concise, one-to-two page summary tailored to a specific job (common in the US). A CV is a longer, comprehensive record of your academic and professional history (standard in academia and much of Europe). CVAurum builds both — pick a compact template for a resume, or add sections for a full CV."
            />
            <Faq
              q="Are the links in my PDF clickable?"
              a="Yes, by default — they are real clickable regions in the file, not underlined words. Each link also keeps its display text separate from its destination, so it can read Portfolio or Verify while pointing anywhere: a project can carry several named links, and a certification or award can end its line with a short Verify (printed as small tags, or as plain words if you prefer) — with an issuer badge beside the name if you add one. Where a link prints as a word, that word is also the control — click it on the page and the same card opens. The Word file and the ATS preview say the same thing the page does, and Word gets real hyperlinks. If you are printing on paper or submitting somewhere a live link is unwelcome, one switch in Design turns clickability off while keeping the text."
            />
            <Faq
              q="Can I edit on my phone?"
              a="Yes. The drag-and-drop canvas is a desktop surface, so on a phone the form panel is the editor — and everything the canvas offers is reachable there: contact icons, section heading links, and each section's full style sheet (heading style, skills layout, badge size and shape, bullets) opens as a bottom sheet. Nothing scrolls sideways, and your work syncs to the same resume you edit on a laptop."
            />
            <Faq
              q="What file formats can I download?"
              a="A crisp vector PDF with real, selectable text; an editable Word (.docx) that mirrors your template; and the open JSON Resume format. Every export is free and unlimited — no paywall, no watermark."
            />
            <Faq
              q="Is the PDF archival quality?"
              a="Yes — and accessible. Every export conforms to both PDF/A-2B (the ISO standard for long-term archiving, with all fonts and an sRGB colour profile embedded) and PDF/UA-1 (the accessibility standard), checked against the veraPDF reference validator. It is fully tagged, so a screen reader reads your headings, paragraphs and bullet lists as real structure — in logical order, so your name comes first even on sidebar layouts."
            />
            <Faq
              q="How long should my resume be?"
              a="For most roles, one page — two if you have 10+ years of experience. CVAurum auto-fits your content to a single page when it's close, and shows live page-break guides so you always know where you stand."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-1.5">
            <Logo compact to="/" /> · Built for everyone job hunting.
          </span>
          <span className="inline-flex items-center gap-3">
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span>100% local · MIT licensed</span>
          </span>
        </div>
      </footer>

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
            create(true, p.template, p.content, p.tweaks)
          }}
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

/**
 * The cinematic hero: a self-contained dark stage with a drifting aurora,
 * a shimmering headline, and a mouse-parallax 3D fan of live template cards.
 * Pure CSS + framer-motion (zero external assets); honors reduced-motion.
 */
function HeroCinema({
  onCreate,
  onSample,
  onImportPdf,
}: {
  onCreate: () => void
  onSample: () => void
  onImportPdf: () => void
}) {
  const reduce = useReducedMotion()
  // The aurora kept drifting long after the reader scrolled past it - three
  // infinite animations writing styles every frame under a whole page that no
  // longer showed them. They run only while the hero is actually on screen.
  const heroRef = useRef<HTMLElement | null>(null)
  const heroInView = useInView(heroRef, { amount: 0.05 })
  const drift = !reduce && heroInView
  // The morph reel: identical sample content flowing through contrasting
  // designs — the template engine demonstrating itself.
  const morph = useMemo(
    () =>
      ['clarity', 'obsidian', 'sapphire', 'crest', 'halcyon', 'pinnacle'].map((id) => {
        const d = createDocument({ sample: true })
        d.metadata = applyTemplateToMetadata(d.metadata, getTemplate(id).defaults)
        return { id, name: getTemplate(id).name, doc: d }
      }),
    []
  )
  const [ti, setTi] = useState(0)
  useEffect(() => {
    // The crossfade mounted a fresh full-resume render every 3.4 seconds
    // FOREVER - scrolled past, tab hidden, it kept spending a frame budget
    // nobody was watching. It ticks only while the hero is on screen and the
    // tab is visible.
    if (reduce || !heroInView) return
    const t = setInterval(() => {
      if (!document.hidden) setTi((i) => (i + 1) % morph.length)
    }, 3400)
    return () => clearInterval(t)
  }, [reduce, morph.length, heroInView])
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 110, damping: 16 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 110, damping: 16 })
  // The backdrop art moves against the pointer (a few px, sprung) so the
  // stage reads as a space with depth rather than a poster; the gold glow
  // follows the pointer across the whole stage.
  const bgX = useSpring(useTransform(mx, [-0.5, 0.5], [16, -16]), { stiffness: 60, damping: 18 })
  const bgY = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 60, damping: 18 })
  // Compositor-only: the glow travels by transform, in fractions of the stage
  // measured in the same normalised units the pointer already reports, so a
  // pointer frame never triggers layout.
  const glowSX = useSpring(mx, { stiffness: 50, damping: 18 })
  const glowSY = useSpring(my, { stiffness: 50, damping: 18 })
  const glowX = useTransform(glowSX, (v) => `${(v + 0.5) * 100}%`)
  const glowY = useTransform(glowSY, (v) => `${(v + 0.5) * 100}%`)
  // The still's slow drift is only for the moments the video is not carrying
  // the motion: it stops the instant the loop is playing (two animated
  // full-stage layers were measured as a second, redundant cost).
  const [loopReady, setLoopReady] = useState(false)
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <section ref={heroRef} id="hero-stage" className="relative overflow-hidden bg-[#0a0c12] text-white" onMouseMove={onMove}>
      {/* Backdrop art: black paper threaded with gold. A still for everyone;
          for viewers who allow motion, a slow loop of the same scene fades in
          over it (a palindrome, so it never pops at the seam) and the whole
          layer drifts against the pointer. Overscaled a touch so the parallax
          never shows an edge. */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 will-change-transform" style={{ x: bgX, y: bgY, scale: 1.06 }}>
        <img
          src="/art/hero-veins-1280.webp"
          srcSet="/art/hero-veins-1280.webp 1280w, /art/hero-veins-1920.webp 1920w"
          sizes="100vw"
          alt=""
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 h-full w-full object-cover opacity-90${reduce || loopReady ? '' : ' hero-still-drift'}`}
        />
        {drift && (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[1400ms] data-[ready=true]:opacity-90"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/art/hero-veins-1280.webp"
            disablePictureInPicture
            disableRemotePlayback
            onCanPlay={(e) => {
              e.currentTarget.dataset.ready = 'true'
              setLoopReady(true)
            }}
          >
            <source src="/art/hero-loop-veins.webm" type="video/webm" />
            <source src="/art/hero-loop-veins.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>
      {/* legibility: the copy column stays ink-dark, the edges vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,12,18,.86) 0%, rgba(10,12,18,.62) 42%, rgba(10,12,18,.28) 100%), radial-gradient(120% 80% at 50% 115%, rgba(10,12,18,.92), transparent 60%)',
        }}
      />
      {/* a warm glow that follows the pointer across the stage */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-[28rem] w-[28rem] rounded-full will-change-transform"
          style={{ x: glowX, y: glowY, translateX: '-50%', translateY: '-50%', background: 'radial-gradient(closest-side, rgba(212,152,47,.22), transparent 70%)' }}
        />
      </div>
      {/* drifting aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[8%] h-[34rem] w-[34rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side,#d4982f4d,#d4982f1f 55%,transparent 85%)' }}
        animate={drift ? { x: [0, 60, -30, 0], y: [0, 30, 10, 0] } : undefined}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 right-[4%] h-[38rem] w-[38rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side,#5b5df02e,#5b5df014 55%,transparent 85%)' }}
        animate={drift ? { x: [0, -70, 20, 0], y: [0, -30, 20, 0] } : undefined}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-1/3 top-1/3 h-[26rem] w-[26rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side,#2dd4bf1f,#2dd4bf0f 55%,transparent 85%)' }}
        animate={drift ? { x: [0, 40, -40, 0], y: [0, -40, 24, 0] } : undefined}
        transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* fine dot grid for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.55) 1px, transparent 1.4px)',
          backgroundSize: '26px 26px',
        }}
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
              style={{
                backgroundImage: 'linear-gradient(110deg,#8a5a12 0%,#d4982f 25%,#f7d774 50%,#d4982f 75%,#8a5a12 100%)',
              }}
            >
              browser
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
            52 designer templates you can restyle <em className="not-italic text-white/90">section by section</em>, a
            built-in ATS check with a parser&apos;s-eye view, PDF import with on-device OCR, exports whose links still
            click — and not a single byte of your career story sent to any server.
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
            <button
              onClick={onImportPdf}
              className="inline-flex items-center gap-1 font-medium text-amber-300/90 underline-offset-2 hover:underline"
            >
              <FileUp className="h-3.5 w-3.5" /> Import your PDF
            </button>{' '}
            — parsed entirely on your device.
          </p>

          {/* phones: the same live morph, compact — the product stays visible */}
          <div className="mt-10 flex justify-center md:hidden" aria-hidden data-nosnippet>
            <div className="relative w-64 overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,0.8)]">
              <div className="relative aspect-[210/297] overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={morph[ti].id}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                  >
                    <PreviewThumb doc={morph[ti].doc} width={256} />
                  </motion.div>
                </AnimatePresence>
                <div className="hero-sheen" aria-hidden />
              </div>
              <div className="pointer-events-none absolute bottom-2 right-2">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-[#0a0c12]/85 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#d4982f' }} />
                  {morph[ti].name} — same content, one click
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* the product, demonstrated: ONE resume re-skinning itself live */}
        <div className="hidden [perspective:1400px] md:block" aria-hidden data-nosnippet>
          <motion.div
            style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
            className="relative mx-auto h-[34rem] w-[30rem]"
          >
            {/* depth: the NEXT design waits behind */}
            <div
              className="absolute left-20 top-8 w-[24rem] overflow-hidden rounded-xl border border-white/10 opacity-35 shadow-2xl"
              style={{ transform: 'translateZ(-70px) rotate(5deg)' }}
            >
              <div className="aspect-[210/297] overflow-hidden bg-white">
                <PreviewThumb doc={morph[(ti + 1) % morph.length].doc} width={384} />
              </div>
            </div>

            {/* front card — crossfades between templates */}
            <div
              className="absolute left-0 top-0 w-[26rem] overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
              style={{ transform: 'translateZ(50px) rotate(-2deg)' }}
            >
              <div className="relative aspect-[210/297] overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={morph[ti].id}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                  >
                    <PreviewThumb doc={morph[ti].doc} width={416} />
                  </motion.div>
                </AnimatePresence>
                <div className="hero-sheen" aria-hidden />
              </div>
              {/* live template name — proof it's the same content, restyled */}
              <div className="pointer-events-none absolute bottom-3 right-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={morph[ti].id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-[#0a0c12]/85 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#d4982f' }} />
                    {morph[ti].name} — same content, one click
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* floating proof chips */}
            <motion.div
              className="absolute -top-7 left-4 rounded-xl border border-white/15 bg-[#0a0c12]/80 px-3.5 py-2.5 text-xs text-white/90 shadow-xl backdrop-blur-md"
              style={{ z: 90 }}
              animate={reduce ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="font-semibold text-emerald-300">0 bytes uploaded</div>
              <div className="mt-0.5 text-white/60">everything stays on this device</div>
            </motion.div>
            <motion.div
              className="absolute -right-16 top-44 rounded-xl border border-white/15 bg-[#0a0c12]/80 px-3.5 py-2.5 text-xs text-white/90 shadow-xl backdrop-blur-md"
              style={{ z: 80 }}
              animate={reduce ? undefined : { y: [0, -9, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
            >
              <div className="font-semibold" style={{ color: '#f7d774' }}>
                52 designs, one resume
              </div>
              <div className="mt-0.5 text-white/60">restyle section by section</div>
            </motion.div>
            <motion.div
              className="absolute -bottom-14 left-2 rounded-xl border border-white/15 bg-[#0a0c12]/80 px-3.5 py-2.5 text-xs text-white/90 shadow-xl backdrop-blur-md"
              style={{ z: 70 }}
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <div className="font-semibold text-sky-300">See what the ATS sees</div>
              <div className="mt-0.5 text-white/60">parser's-eye view, built in</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
