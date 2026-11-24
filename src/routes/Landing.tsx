/**
 * Explainer homepage (/). The front door for someone who's never seen the app:
 * what it is, how it works, why it's private — with clear ways in. The actual
 * resume library/dashboard lives at /app.
 */
import { SkipLink } from '@/components/ui/SkipLink'
import { CreateButton, HeaderThemeToggle, PhoneResumesLink } from '@/components/site/HeaderActions'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useT, useLocale } from '@/i18n'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, ArrowRight, Github, Check, CircleHelp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { TEMPLATE_COUNT, TEMPLATES } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'
import { SITE } from '@/data/siteCopy'
import { SITE_FA } from '@/data/siteCopyFa'
import { HeroTypeOnce } from '@/components/landing/HeroTypeOnce'
import { TemplateCarousel } from '@/components/landing/TemplateCarousel'
import { Logo } from '@/components/ui/Logo'
import { SiteMenuButton } from '@/components/site/SiteMenu'
import { useResumeActions, NewResumeModal, SamplePicker } from '@/components/dashboard/newResume'
import { InstallButton } from '@/components/ui/InstallButton'
import { useTitle } from '@/lib/useTitle'

const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

const SIGNATURE_COUNT = TEMPLATES.filter((t) => t.tags.includes('signature')).length

export function Landing() {
  const t = useT()
  const locale = useLocale()
  // The comparison table and the FAQ are long-form: English is also what the
  // static HTML and llms.txt carry, so they live outside the key table and
  // get a Persian twin here.
  const comparison = locale === 'fa' ? SITE_FA.comparison : SITE.comparison
  const faq = locale === 'fa' ? SITE_FA.faq : SITE.faq
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
              {t('nav.how')}
            </a>
            <Link to="/templates" className={`transition hover:text-foreground`}>
              {t('nav.templates')}
            </Link>
            <Link to="/examples" className={`transition hover:text-foreground`}>
              {t('nav.examples')}
            </Link>
            {/* every other page's header offers it (SiteChrome.tsx); this one
                built its own and left it out */}
            <Link to="/prompts" className={`transition hover:text-foreground`}>
              {t('nav.prompts')}
            </Link>
            <a href="#compare" className={`hidden transition xl:inline hover:text-foreground`}>
              {t('nav.compare')}
            </a>
            <a href="#privacy" className={`hidden transition xl:inline hover:text-foreground`}>
              {t('nav.privacy')}
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              className="btn-ghost btn-sm hidden sm:inline-flex"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              title={t('nav.viewSource')}
            >
              <Github className="h-4 w-4" /> {t('nav.github')}
            </a>
            <InstallButton />
            {/* The switch sits on the FRONT DOOR, not only behind the editor:
                someone who wants the app in Persian has to be able to say so
                before they have a resume. Always visible, phone included. */}
            <LanguageToggle />
            <HeaderThemeToggle />
            {/* Below sm: "My resumes" for someone who has any (HeaderActions.tsx);
                the menu lists it as a row as well. */}
            <PhoneResumesLink />
            <Link
              className={`hidden sm:inline-flex ${hasResumes ? 'btn-outline btn-sm' : 'btn-ghost btn-sm'}`}
              to="/app"
            >
              {hasResumes ? t('common.myResumesCount', { n: library.length }) : t('common.myResumes')}
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
                {t('land.templatesTitle')}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                {t('land.templatesBody')}{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to="/examples">
                  {t('land.readExamples', { n: SAMPLE_COUNT })}
                </Link>
                .
              </p>
            </div>
            <Link className="btn-ghost btn-sm" to="/templates">
              {t('land.seeAll', { n: TEMPLATE_COUNT })} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <TemplateCarousel onPick={(id) => create(true, id)} />
        </section>

        {/* The Signature collection: structures built for this app, under the plain shelf. */}
        <section id="signature" className="border-b border-border bg-surface-muted/40 py-14 sm:py-16" aria-labelledby="signature-title">
          <div className="mx-auto mb-2 max-w-6xl px-4 sm:px-6">
            <h2 id="signature-title" className="font-display text-3xl font-semibold sm:text-4xl">
              {t('land.signatureTitle')}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {t('land.signatureBody', { n: SIGNATURE_COUNT })}
            </p>
          </div>
          <TemplateCarousel
            onPick={(id) => create(true, id)}
            tabs={[{ tag: 'signature', label: t('land.signature') }]}
            label={t('land.signatureDesigns')}
          />
        </section>

        {/* how it works */}
        <section id="how" className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-14 land-reveal">
            <div className="text-center">
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t('land.howTitle')}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t('land.howBody')}</p>
            </div>
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
              <Step n={1} title={t('land.step1Title')} body={t('land.step1Body', { n: TEMPLATE_COUNT })} />
              <Step n={2} title={t('land.step2Title')} body={t('land.step2Body')} />
              <Step n={3} title={t('land.step3Title')} body={t('land.step3Body')} />
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
                alt={t('land.proofAlt')}
                width={1200}
                height={1697}
                loading="lazy"
                decoding="async"
                className="w-full rounded-sm border border-border bg-white shadow-[0_18px_40px_-24px_rgba(15,17,25,0.45)]"
              />
              <figcaption className="mt-3 text-center text-xs text-muted-foreground">{t('land.proofFig')}</figcaption>
            </figure>
            <div>
              <h2
                id="proof-title"
                className="font-display text-4xl font-semibold leading-tight sm:text-5xl"
               
              >
                {t('land.proofTitle')}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{t('land.proofBody')}</p>
              <dl className="mt-8 divide-y divide-border border-y border-border">
                {[
                  [t('land.proof1Term'), t('land.proof1Body')],
                  [t('land.proof2Term'), t('land.proof2Body')],
                  [t('land.proof3Term'), t('land.proof3Body')],
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
              {t('land.compareTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{t('land.compareBody')}</p>
          </div>
          {/* Narrow screens: two columns of prose can't fit, and a sideways scroller hides the
              "Most builders" column entirely — so the same head-to-head reads as one card per
              row, both answers labelled, nothing off the edge. The table returns from md up. */}
          <div className="mt-8 space-y-3 md:hidden">
            {comparison.map((r) => (
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
                    <span className="font-semibold">{t('land.askOthers')}</span> — {r.others}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-border md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-muted/50 text-start">
                  <th className="px-4 py-3 font-medium text-muted-foreground"> </th>
                  <th className="px-4 py-3 font-bold text-primary">
                    CVAurum
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('land.askOthers')}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((r) => (
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
              {t('land.privacyTitle')}
            </h2>
            <div className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              <p>{t('land.privacy1')}</p>
              <p className="mt-3">{t('land.privacy2')}</p>
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition hover:decoration-foreground"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" /> {t('land.readSource')}
              </a>
            </div>
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="mx-auto max-w-3xl px-6 pb-16 land-reveal">
          <h2 className="font-display text-center text-3xl font-semibold sm:text-4xl">{t('land.faqTitle')}</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {faq.map((f) => (
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
              {t('land.closingTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t('land.closingBody')}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button className="btn-primary" onClick={() => create(false)}>
                <Plus className="h-4 w-4" /> {t('land.createMine')}
              </button>
              <button className="btn-outline" onClick={() => setSampleOpen(true)}>
                <FileText className="h-4 w-4" /> {t('land.startWithExample')}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-1.5">
            <Logo compact to="/" /> · {t('footer.builtFor')}
          </span>
          <span className="inline-flex items-center gap-3">
            <Link className="transition hover:text-foreground" to="/templates">
              {t('nav.templates')}
            </Link>
            <Link className="transition hover:text-foreground" to="/examples">
              {t('nav.examples')}
            </Link>
            <Link className="transition hover:text-foreground" to="/prompts">
              {t('nav.prompts')}
            </Link>
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
              {t('nav.github')}
            </a>
            <span>{t('land.licence')}</span>
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
