/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { SkipLink } from '@/components/ui/SkipLink'
import { CreateButton, HeaderThemeToggle, PhoneResumesLink } from '@/components/site/HeaderActions'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { FileText, Plus, FileUp, ShieldCheck, ArrowRight, Github, Check, Minus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { TEMPLATE_COUNT, getTemplate } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'
import { SITE } from '@/data/siteCopy'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { HoverZoom } from '@/components/preview/HoverZoom'
import { Logo } from '@/components/ui/Logo'
import { SiteMenuButton } from '@/components/site/SiteMenu'
import { useResumeActions, NewResumeModal, SamplePicker } from '@/components/dashboard/newResume'
import { InstallButton } from '@/components/ui/InstallButton'
import { useTitle } from '@/lib/useTitle'

const GOLD = 'linear-gradient(135deg,#8a5a12,#d4982f,#f7d774)'
const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** Templates shown live (with sample content) in the showcase strip. */
// Four of the signature six (each a different structure) beside two classics
// (a light two-column and a dark sidebar), so the strip shows the range.
const SHOWCASE = ['broadsheet', 'marquee', 'atlas', 'chronicle', 'clarity', 'sapphire']

/** The comparison rows, from the one place the page's words live. */
const COMPARISON = SITE.comparison

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

      <SkipLink />
      {/* nav — ink glass over the hero, theme glass past it */}
      <header
        className={`sticky top-0 z-30 border-b transition-colors duration-300 ${overHero ? '' : 'backdrop-blur '}${
          overHero
            ? 'border-white/10 bg-[#0a0c12]/[0.97] text-white [&_.btn-ghost]:text-white/85 [&_.btn-ghost:hover]:bg-white/10 [&_.btn-outline]:border-white/25 [&_.btn-outline]:bg-transparent [&_.btn-outline]:text-white [&_.btn-outline:hover]:bg-white/10'
            : 'border-border bg-background/80'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          <nav
            className={`hidden items-center gap-5 whitespace-nowrap text-sm md:flex lg:gap-6 ${overHero ? 'text-white/60' : 'text-muted-foreground'}`}
          >
            {/* The site chrome's rule (SiteChrome.tsx): md carries the pages,
                and the in-page anchors come back once there is room (xl here:
                this header also carries GitHub, the theme and My resumes). At 768px this row held
                five links, wrapped "How it works" onto three lines and pushed
                the Create button off the edge (831px of page in 768). */}
            <a href="#how" className={`hidden transition xl:inline ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              How it works
            </a>
            <Link to="/templates" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Templates
            </Link>
            <Link to="/examples" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Examples
            </Link>
            {/* every other page's header offers it (SiteChrome.tsx); this one
                built its own and left it out */}
            <Link to="/prompts" className={`transition ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Prompts
            </Link>
            <a href="#compare" className={`hidden transition xl:inline ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
              Compare
            </a>
            <a href="#privacy" className={`hidden transition xl:inline ${overHero ? 'hover:text-white' : 'hover:text-foreground'}`}>
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
            <HeaderThemeToggle />
            {/* Below sm: "My resumes" for someone who has any (HeaderActions.tsx);
                the menu lists it as a row as well. */}
            <PhoneResumesLink />
            <Link
              className={`hidden sm:inline-flex ${hasResumes ? 'btn-outline btn-sm' : 'btn-ghost btn-sm'}`}
              to="/app"
            >
              My resumes{hasResumes ? ` (${library.length})` : ''}
            </Link>
            <CreateButton onClick={() => setChooser(true)} />
            <SiteMenuButton current="home" repoUrl={REPO_URL} onCreate={() => setChooser(true)} />
          </div>
        </div>
      </header>

      <main>
        {/* hero — the cinematic stage */}
        <HeroCinema
          onCreate={() => create(false)}
          onSample={() => setSampleOpen(true)}
          onImportPdf={() => pdfRef.current?.click()}
          covered={chooser || sampleOpen}
        />

        {/* how it works */}
        <section id="how" className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-14 land-reveal">
            <div className="text-center">
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">Three steps to a polished résumé</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                No sign-up, no setup. Everything happens right here in your browser.
              </p>
            </div>
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
              <Step
                n={1}
                title="Pick a template"
                body={`Choose from ${TEMPLATE_COUNT} recruiter-ready designs. Switch anytime — your content carries over.`}
              />
              <Step
                n={2}
                title="Fill it in"
                body="Edit right on the page. A live ATS score and keyword match keep you on track."
              />
              <Step
                n={3}
                title="Export & apply"
                body="Download a crisp, selectable PDF or an ATS-friendly Word file in one click."
              />
            </ol>
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
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">Start from a recruiter-ready template</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Click any design to start editing — switch anytime, your content stays. Not sure what to write?{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to="/examples">
                  Read {SAMPLE_COUNT} full examples
                </Link>
                .
              </p>
            </div>
            <Link className="btn-ghost btn-sm hidden sm:inline-flex" to="/templates">
              See all {TEMPLATE_COUNT} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6" data-nosnippet>
            {showcase.map(({ id, doc }) => (
              // A card this size can be recognised but not read. Dwelling on
              // one floats a large render beside it, the same way the example
              // picker and the editor's gallery do - it was the only one of
              // the three showing thumbnails with no way to see the design.
              <HoverZoom key={id} doc={doc} label={getTemplate(id).name}>
                <button
                  onClick={() => create(true, id)}
                  className="group block w-full overflow-hidden rounded-xl border border-border bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
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
              </HoverZoom>
            ))}
          </div>
        </section>
        </div>

        {/* The proof: what makes the file different, shown on a real page.
            It replaces four icon tiles (private, ATS, export, offline) that
            any app could have printed; every fact here is measured on every
            design by the export gates. */}
        <section className="border-y border-border bg-surface-muted/40" aria-labelledby="proof-title">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,22rem)_1fr] land-reveal">
            <figure className="mx-auto w-full max-w-[22rem]">
              <img
                src="/img/templates/keystone.webp"
                alt="A page exported from the Keystone design"
                width={1200}
                height={1697}
                loading="lazy"
                decoding="async"
                className="w-full rounded-sm border border-border bg-white shadow-[0_18px_40px_-24px_rgba(15,17,25,0.45)]"
              />
              <figcaption className="mt-3 text-center text-xs text-muted-foreground">
                A page as it exports: Keystone, one of the Signature designs.
              </figcaption>
            </figure>
            <div>
              <h2
                id="proof-title"
                className="font-display text-4xl font-semibold leading-tight sm:text-5xl"
               
              >
                The PDF is made the way print is.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                Not a picture of a web page: every export is drawn as type and lines, and every design is checked for all three below, release after release.
              </p>
              <dl className="mt-8 divide-y divide-border border-y border-border">
                {[
                  ['Real text', 'Every word is selectable and searchable, and the text an ATS reads is the text you wrote, checked word for word on every design.'],
                  ['About 60 KB', 'A one-page résumé weighs about as much as a short email: drawn in vectors, with only the letters it uses embedded.'],
                  ['Accessible and archive-ready', 'Exports follow PDF/UA, the standard screen readers rely on, and PDF/A, the one archives keep.'],
                ].map(([term, body]) => (
                  <div key={term} className="grid gap-1 py-4 sm:grid-cols-[15rem_1fr] sm:gap-6">
                    <dt
                      className="font-display text-xl font-semibold"
                     
                    >
                      {term}
                    </dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">{body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* comparison */}
        <section id="compare" className="mx-auto max-w-5xl px-6 py-14 land-reveal">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              How it compares, honestly
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Privacy, or open source, or design, or ATS, or offline — most tools pick one. Here's the honest
              head-to-head.
            </p>
          </div>
          {/* Narrow screens: two columns of prose can't fit, and a sideways scroller hides the
              "Most builders" column entirely — so the same head-to-head reads as one card per
              row, both answers labelled, nothing off the edge. The table returns from md up. */}
          <div className="mt-8 space-y-3 md:hidden">
            {COMPARISON.map((r) => (
              <div key={r.capability} className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">{r.capability}</h3>
                <p className="mt-3 flex gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    <span className="font-semibold text-primary">
                      CVAurum
                    </span>{' '}
                    — {r.cvaurum}
                  </span>
                </p>
                <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">Most builders</span> — {r.others}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-border md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground"> </th>
                  <th className="px-4 py-3 font-bold text-primary">
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
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-8 sm:p-12">
            <div className="grid items-center gap-8 md:grid-cols-[auto,1fr]">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                style={{ background: GOLD }}
              >
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">Your résumé never leaves your device</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Most online builders upload your career history to their servers. CVAurum doesn't have a server.
                  Everything — your content, your photo, your exports — is created and stored locally in your browser.
                  You can back it all up to a single file and restore it anywhere. It's open source, so you can verify
                  exactly that.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="btn-primary btn-sm" onClick={() => create(false)}>
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
        <section id="faq" className="mx-auto max-w-3xl px-6 pb-16 land-reveal">
          <h2 className="font-display text-center text-3xl font-semibold sm:text-4xl">Questions</h2>
          <div className="mt-6 space-y-3">
            {SITE.faq.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* The last thing on the page is the first thing it asks: the call
            to start used to end 1,500px back, at the privacy box. */}
        <section className="border-t border-border" aria-labelledby="closing-title">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2
              id="closing-title"
              className="font-display text-4xl font-semibold sm:text-5xl"
             
            >
              Start yours. It stays here.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              No account, no upload, nothing to pay. Your résumé is saved in this browser as you type.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button className="btn-primary" onClick={() => create(false)}>
                <Plus className="h-4 w-4" /> Create my resume
              </button>
              <button className="btn-outline" onClick={() => setSampleOpen(true)}>
                <FileText className="h-4 w-4" /> Start with an example
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-1.5">
            <Logo compact to="/" /> · Built for everyone job hunting.
          </span>
          <span className="inline-flex items-center gap-3">
            <Link className="transition hover:text-foreground" to="/templates">
              Templates
            </Link>
            <Link className="transition hover:text-foreground" to="/examples">
              Examples
            </Link>
            <Link className="transition hover:text-foreground" to="/prompts">
              Prompts
            </Link>
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span>100% local · AGPL-3.0</span>
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
            create(true, p.template, p.content, p.tweaks, `${p.role} resume`)
          }}
        />
      )}
    </div>
  )
}

/** One step on a hairline rule, numbered in the display face: the order is
 *  the point, so the numeral leads and nothing is boxed. */
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="border-t border-foreground/20 pt-4">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl font-semibold leading-none text-primary [font-variant-numeric:lining-nums]" aria-hidden="true">
          {n}
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  )
}

/**
 * The hero reel's pages, stacked so a change of design never flickers.
 *
 * Each tick used to mount a fresh full-resume render and fade it in while the
 * old one faded out: the new page painted its first frames mid-fade, both
 * layers sat near half opacity at the crossing (the stage showed through),
 * and the card behind swapped with no fade at all. Now the previous, current
 * and next pages stay mounted; the next one is already laid out, invisible,
 * before its turn, so a tick only fades it in ON TOP of a page that stays
 * fully opaque beneath it.
 */
function ReelPages({ items, index, width }: { items: { id: string; doc: ResumeDocument }[]; index: number; width: number }) {
  const n = items.length
  const layers = [(index - 1 + n) % n, index, (index + 1) % n]
  return (
    <>
      {layers.map((i, slot) => (
        <div
          key={items[i].id}
          className="absolute inset-0 bg-white transition-opacity duration-500 ease-out"
          style={{ opacity: slot === 2 ? 0 : 1, zIndex: slot === 1 ? 2 : slot === 0 ? 1 : 0 }}
        >
          <PreviewThumb doc={items[i].doc} width={width} />
        </div>
      ))}
    </>
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
  covered,
}: {
  onCreate: () => void
  onSample: () => void
  onImportPdf: () => void
  /** A dialog is over the stage. Its backdrop is translucent, so a loop
   *  still playing underneath shimmers through the blur and reads as the
   *  page flickering - and it competes for frames with the four resume
   *  previews the dialog is busy rendering. */
  covered: boolean
}) {
  const reduce = useReducedMotion()
  // The backdrop loop and the reel run only while the hero is on screen.
  const heroRef = useRef<HTMLElement | null>(null)
  const heroInView = useInView(heroRef, { amount: 0.05 })
  const onScreen = !reduce && heroInView
  // The morph reel: identical sample content flowing through contrasting
  // designs — the template engine demonstrating itself.
  // Some frames also show a choice the page offers on top of any design - a
  // labelled contact strip, pills, contacts beside the name, headings on a
  // rail, dates in the company line - so the reel shows the controls too, not
  // only the templates.
  const morph = useMemo(
    () =>
      (
        // It opens on the Signature designs - the ones nothing else has -
        // then shows the choices any design takes on top. A light page leads:
        // the hero is dark, and a dark page first read as an empty stage.
        [
          ['broadsheet', 'Signature', null],
          ['measure', 'typeset to a baseline', null],
          ['marquee', 'Signature', null],
          ['folio-noir', 'Signature', null],
          ['clarity', 'labelled contacts', (m) => void (m.layout.contactStyle = 'strip')],
          ['sapphire', 'contact pills', (m) => void (m.layout.contactStyle = 'pills')],
          ['crest', 'headings on a rail', (m) => void (m.layout.headingPlacement = 'side')],
          ['keystone', 'Signature', null],
          ['halcyon', 'dates in the company line', (m) => void (m.layout.dateAlign = 'inline')],
        ] as [string, string, ((m: ResumeDocument['metadata']) => void) | null][]
      ).map(([id, note, tweak]) => {
        const d = createDocument({ sample: true })
        d.metadata = applyTemplateToMetadata(d.metadata, getTemplate(id).defaults)
        tweak?.(d.metadata)
        return { id, name: getTemplate(id).name, note, doc: d }
      }),
    []
  )
  const [ti, setTi] = useState(0)
  useEffect(() => {
    // The crossfade mounted a fresh full-resume render every few seconds
    // FOREVER - scrolled past, tab hidden, it kept spending a frame budget
    // nobody was watching. It ticks only while the hero is on screen and the
    // tab is visible.
    if (reduce || !heroInView || covered) return
    const t = setInterval(() => {
      if (!document.hidden) setTi((i) => (i + 1) % morph.length)
    }, 5500)
    return () => clearInterval(t)
  }, [reduce, morph.length, heroInView, covered])
  // The still's slow drift is only for the moments the video is not carrying
  // the motion: it stops the instant the loop is playing (two animated
  // full-stage layers were measured as a second, redundant cost).
  const [loopReady, setLoopReady] = useState(false)
  // Paused, not unmounted: closing the dialog resumes the loop where it
  // stood instead of re-fetching and re-decoding it. A hidden tab counts as
  // covered - a background tab decoding video is pure waste.
  const loopRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = loopRef.current
    if (!v) return
    const sync = () => {
      if (covered || document.hidden) v.pause()
      else void v.play().catch(() => {})
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [covered])
  return (
    <section
      ref={heroRef}
      id="hero-stage"
      className={`relative overflow-hidden bg-[#0a0c12] text-white${covered ? ' hero-covered' : ''}`}
    >
      {/* Backdrop art: black paper threaded with gold. A still for everyone;
          for viewers who allow motion, a slow loop of the same scene fades in
          over it (a palindrome, so it never pops at the seam) and the whole
          layer drifts against the pointer. Overscaled a touch so the parallax
          never shows an edge. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img
          src="/art/hero-veins-1280.webp"
          srcSet="/art/hero-veins-1280.webp 1280w, /art/hero-veins-1920.webp 1920w"
          sizes="100vw"
          alt=""
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover opacity-90${reduce || loopReady ? '' : ' hero-still-drift'}`}
        />
        {onScreen && (
          <video
            ref={loopRef}
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
      </div>
      {/* legibility: the copy column stays ink-dark, the edges vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,12,18,.86) 0%, rgba(10,12,18,.62) 42%, rgba(10,12,18,.28) 100%), radial-gradient(120% 80% at 50% 115%, rgba(10,12,18,.92), transparent 60%)',
        }}
      />
      {/* One ambient layer - the backdrop above - and the reel. The pointer
          glow, three drifting aurora blobs, a dot grid, parallax, a 3D tilt,
          a shimmering headline and three bobbing glass chips all ran here at
          once (critique, 2026-10-23): a stage busier than the product on it. */}
      {/* Two columns from lg: at a 768px tablet the headline was squeezed to
          one word per line beside a card hanging off the edge. */}
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Local-first · Free · Open source
          </span>
          {/* Set in the face of Folio Noir, a Signature design: the page is
              typeset like the résumés it makes, not lit like any other app. */}
          <h1
            className="font-display mt-6 text-5xl font-semibold leading-[0.98] sm:text-7xl"
           
          >
            A resume this beautiful
            <br />
            never leaves your <span style={{ color: '#e2b04f' }}>browser</span>.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
            {TEMPLATE_COUNT} designs, a built-in ATS check, and a real vector PDF, made and kept entirely in your
            browser. Free, with nothing to sign up for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-[#1c1503] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)] transition hover:scale-[1.03] active:scale-[0.99]"
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
          <div className="mt-10 flex justify-center lg:hidden" aria-hidden data-nosnippet>
            <div className="relative w-64 overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,0.8)]">
              <div className="relative aspect-[210/297] overflow-hidden">
                <ReelPages items={morph} index={ti} width={256} />
              </div>
              {/* Inside the card's edges and allowed to wrap: on one line it ran
                  wider than the card on a phone and was cut at the left
                  ("apphire · contact pills", reported 2026-09-26). */}
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-end">
                <span className="inline-flex max-w-full items-start gap-1.5 rounded-2xl border border-white/20 bg-[#0a0c12]/85 px-2.5 py-1 text-[10px] font-medium leading-snug text-white shadow-lg backdrop-blur">
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#d4982f' }} />
                  <span>
                    {morph[ti].name}
                    {morph[ti].note ? ` · ${morph[ti].note}` : ''}, same content
                  </span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* the product, demonstrated: ONE resume re-skinning itself live */}
        <div className="hidden [perspective:1400px] lg:block" aria-hidden data-nosnippet>
          <div className="relative mx-auto h-[34rem] w-[30rem]" style={{ transformStyle: 'preserve-3d' }}>
            {/* depth: the NEXT design waits behind */}
            <div
              className="absolute left-20 top-8 w-[24rem] overflow-hidden rounded-xl border border-white/10 opacity-35 shadow-2xl"
              style={{ transform: 'translateZ(-70px) rotate(5deg)' }}
            >
              <div className="relative aspect-[210/297] overflow-hidden bg-white">
                <ReelPages items={morph} index={(ti + 1) % morph.length} width={384} />
              </div>
            </div>

            {/* front card — crossfades between templates */}
            <div
              className="absolute left-0 top-0 w-[26rem] overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
              style={{ transform: 'translateZ(50px) rotate(-2deg)' }}
            >
              <div className="relative aspect-[210/297] overflow-hidden">
                <ReelPages items={morph} index={ti} width={416} />
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
                    {morph[ti].name}
                    {morph[ti].note ? ` · ${morph[ti].note}` : ''}, same content
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
