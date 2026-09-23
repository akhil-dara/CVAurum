/**
 * A guide (/free-resume-builder, /ats-resume-checker, /resume-builder-no-sign-up):
 * one search question, answered on one page.
 *
 * The words live in src/data/guides.ts, not here, because the pre-rendered
 * HTML, the Markdown twin and the structured data have to be the same text as
 * this page. This file is only how a person reads it.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, FileUp, ShieldCheck } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { useResumeActions } from '@/components/dashboard/newResume'
import { GUIDES, guideBySlug } from '@/data/guides'
import { SITE, guidePageMeta } from '@/lib/seoPages'
import { useSeo } from '@/lib/useSeo'
import { TEMPLATE_COUNT } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'

/**
 * The checker itself, on the checker's page: drop a PDF and it is read here,
 * on this device, then opened in the editor on the ATS panel. Someone who
 * searched for an ATS checker came to check a résumé, not to read about one.
 */
function AtsDrop() {
  const { importPdf } = useResumeActions()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const take = async (file?: File) => {
    if (!file || busy) return
    setBusy(true)
    try {
      await importPdf(file, { openAts: true })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      data-ats-drop
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void take(e.dataTransfer.files?.[0])
      }}
      className={`mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
        over ? 'border-primary bg-primary/5' : 'border-border bg-surface'
      }`}
    >
      <FileUp className="mx-auto h-8 w-8 text-primary" aria-hidden />
      <p className="mt-3 text-[15px] font-medium">Drop your résumé PDF here</p>
      <p className="mt-1 text-sm text-muted-foreground">It is read on this device and opened in the ATS check. Scanned PDFs work too.</p>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => void take(e.target.files?.[0])}
      />
      <button type="button" className="btn-primary mt-4" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Reading…' : 'Choose a PDF'}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Nothing is uploaded: there is no server to send it to.
      </p>
    </div>
  )
}

export function Guide() {
  // The router lists each guide by its own path, so the path IS the slug.
  const slug = useLocation().pathname.replace(/^\/+|\/+$/g, '')
  const g = guideBySlug(slug)
  const meta = guidePageMeta(g ? slug : GUIDES[0].slug)
  useSeo({
    title: meta.title,
    description: meta.description,
    image: `${SITE}${meta.image}`,
    url: `${SITE}${meta.path}`,
  })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])
  if (!g) return null
  const others = GUIDES.filter((x) => x.slug !== g.slug)

  return (
    <div className="min-h-full bg-background">
      <SiteHeader
        action={
          <Link className="btn-primary btn-sm" to={g.action.href}>
            {g.action.label}
          </Link>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <article className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link className="hover:text-foreground" to="/">
              CVAurum
            </Link>{' '}
            › {g.short}
          </nav>
          <h1 className="mt-3 text-[1.6rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.4rem] sm:leading-[1.12]">
            {g.heading}
          </h1>
          {g.intro.map((p, i) => (
            <p key={i} className="mt-3 text-[15px] leading-relaxed text-foreground">
              {p}
            </p>
          ))}
          {g.tool === 'ats-check' ? (
            <AtsDrop />
          ) : (
            <Link className="btn-primary mt-6" to={g.action.href}>
              {g.action.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}

          {g.sections.map((sec) => (
            <section key={sec.heading} className="mt-10">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{sec.heading}</h2>
              {sec.paragraphs.map((p, i) => (
                <p key={i} className="mt-2.5 text-[15px] leading-relaxed text-foreground">
                  {p}
                </p>
              ))}
              {sec.list && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground marker:text-muted-foreground">
                  {sec.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Questions</h2>
            <dl className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
              {g.faq.map((f) => (
                <div key={f.q} className="p-4">
                  <dt className="text-[15px] font-medium">{f.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link className="text-primary hover:underline" to="/templates">
              Browse the {TEMPLATE_COUNT} résumé templates
            </Link>
            <Link className="text-primary hover:underline" to="/examples">
              Read {SAMPLE_COUNT} complete résumé examples
            </Link>
            {others.map((x) => (
              <Link key={x.slug} className="text-primary hover:underline" to={`/${x.slug}`}>
                {x.short}
              </Link>
            ))}
          </p>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
