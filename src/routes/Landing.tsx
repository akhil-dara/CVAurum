/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { SkipLink } from '@/components/ui/SkipLink'
import { CreateButton, HeaderThemeToggle, PhoneResumesLink } from '@/components/site/HeaderActions'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, ArrowRight, Github, Check, CircleHelp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { TEMPLATE_COUNT, TEMPLATES } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'
import { SITE } from '@/data/siteCopy'
import { HeroTypeOnce } from '@/components/landing/HeroTypeOnce'
import { TemplateCarousel } from '@/components/landing/TemplateCarousel'
import { Logo } from '@/components/ui/Logo'
import { SiteMenuButton } from '@/components/site/SiteMenu'
import { useResumeActions, NewResumeModal, SamplePicker } from '@/components/dashboard/newResume'
import { InstallButton } from '@/components/ui/InstallButton'
import { useTitle } from '@/lib/useTitle'

const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** The comparison rows, from the one place the page's words live. */
const COMPARISON = SITE.comparison

const SIGNATURE_COUNT = TEMPLATES.filter((t) => t.tags.includes('signature')).length

export function Landing() {
  useTitle('CVAurum — Free Open-Source Resume Builder (Local, Private, ATS-Ready)')
  const library = useAppStore((s) => s.library)
  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
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
      {/* nav */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur border-border bg-background/80"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          <nav
            className={`hidden items-center gap-5 whitespace-nowrap text-sm md:flex lg:gap-6 text-muted-foreground`}
          >
            {/* The site chrome's rule (SiteChrome.tsx): md carries the pages,
                and the in-page anchors come back once there is room (xl here:
                this header also carries GitHub, the theme and My resumes). At 768px this row held
                five links, wrapped "How it works" onto three lines and pushed
                the Create button off the edge (831px of page in 768). */}
            <a href="#how" className={`hidden transition xl:inline hover:text-foreground`}>
              How it works
            </a>
            <Link to="/templates" className={`transition hover:text-foreground`}>
              Templates
            </Link>
            <Link to="/examples" className={`transition hover:text-foreground`}>
              Examples
            </Link>
            {/* every other page's header offers it (SiteChrome.tsx); this one
                built its own and left it out */}
            <Link to="/prompts" className={`transition hover:text-foreground`}>
              Prompts
            </Link>
            <a href="#compare" className={`hidden transition xl:inline hover:text-foreground`}>
              Compare
            </a>
            <a href="#privacy" className={`hidden transition xl:inline hover:text-foreground`}>
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
        {/* hero: type your name, watch real pages wear it */}
        <HeroTypeOnce
          onStart={({ templateId, name, role }) =>
            create(false, templateId, undefined, undefined, name ? `${name}'s Resume` : undefined, { name, label: role })
          }
          onSample={() => setSampleOpen(true)}
          onImportPdf={() => pdfRef.current?.click()}
        />

        {/* the template shelf, straight after the hero */}
        <section id="templates" className="border-b border-border py-14 sm:py-16" aria-labelledby="templates-title">
          <div className="mx-auto mb-7 flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 sm:px-6">
            <div>
              <h2 id="templates-title" className="font-display text-3xl font-semibold sm:text-4xl">
                Start from a recruiter-ready template
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                Every design exports real, selectable text an ATS reads word for word. Pick one to start; switch any
                time and your content stays. Not sure what to write?{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to="/examples">
                  Read {SAMPLE_COUNT} full examples
                </Link>
                .
              </p>
            </div>
            <Link className="btn-ghost btn-sm" to="/templates">
              See all {TEMPLATE_COUNT} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <TemplateCarousel onPick={(id) => create(true, id)} />
        </section>

        {/* The Signature collection: structures built for this app, under the plain shelf. */}
        <section id="signature" className="border-b border-border bg-surface-muted/40 py-14 sm:py-16" aria-labelledby="signature-title">
          <div className="mx-auto mb-2 max-w-6xl px-4 sm:px-6">
            <h2 id="signature-title" className="font-display text-3xl font-semibold sm:text-4xl">
              The Signature collection
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {SIGNATURE_COUNT} designs with page structures of their own, made for this app and held to the same rule as every other: the
              text an ATS reads is word for word what you wrote.
            </p>
          </div>
          <TemplateCarousel onPick={(id) => create(true, id)} tabs={[{ tag: 'signature', label: 'Signature' }]} label="Signature designs" />
        </section>

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

        {/* The proof: what makes the file different, shown on a real page.
            It replaces four icon tiles (private, ATS, export, offline) that
            any app could have printed; every fact here is measured on every
            design by the export gates. */}
        <section className="border-y border-border bg-surface-muted/40" aria-labelledby="proof-title">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,22rem)_1fr] land-reveal">
            <figure className="mx-auto w-full max-w-[22rem]">
              <img
                src="/img/templates/thumb/keystone.webp"
                srcSet="/img/templates/thumb/keystone.webp 520w, /img/templates/keystone.webp 1200w"
                sizes="(min-width: 640px) 22rem, 100vw"
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
              Privacy, open source, design, ATS, offline: what CVAurum does on each, measured, and the question
              worth asking of any other builder you are weighing.
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
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">Ask of any other builder</span> — {r.others}
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
                  <th className="px-4 py-3 font-medium text-muted-foreground">Ask of any other builder</th>
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

        {/* privacy: set as a statement, not a card. The call to start lives
            once, at the foot of the page; here the only link is the proof. */}
        <section id="privacy" className="mx-auto max-w-6xl px-6 py-16 land-reveal">
          <div className="grid gap-8 border-t border-border pt-10 md:grid-cols-[minmax(0,5fr),minmax(0,6fr)] md:gap-16">
            <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Your résumé never leaves your device
            </h2>
            <div className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              <p>
                Most online builders upload your career history to their servers. CVAurum doesn't have a server.
                Your content, your photo and your exports are made and kept in your browser.
              </p>
              <p className="mt-3">
                A backup file holds every résumé and restores them anywhere. The code is open, so you can check all of
                this yourself.
              </p>
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition hover:decoration-foreground"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" /> Read the source
              </a>
            </div>
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="mx-auto max-w-3xl px-6 pb-16 land-reveal">
          <h2 className="font-display text-center text-3xl font-semibold sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
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

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group py-1">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        {q}
        <span aria-hidden className="shrink-0 text-lg leading-none text-muted-foreground transition group-open:rotate-45">+</span>
      </summary>
      <p className="max-w-2xl pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  )
}
