/**
 * The homepage hero. The visitor types their name and job title, and three
 * real résumé pages wear it as they type; clicking a page brings it forward
 * and makes it the design they start with. It demonstrates both halves of
 * the offer at once: the designs, and that what you type stays here (the
 * field never leaves the page - the app makes no outbound request at all).
 */
import { useDeferredValue, useMemo, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, FileText, FileUp, Lock } from 'lucide-react'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { TEMPLATE_COUNT, getTemplate } from '@/templates/registry'
import { SITE } from '@/data/siteCopy'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import type { ResumeDocument } from '@/types/document'

/** Two plain single-column designs an ATS reads cleanly, and one two-column. */
const HERO_PAGES = [
  { id: 'harvard', note: 'Single column' },
  { id: 'modern', note: 'Single column' },
  { id: 'clarity', note: 'Two columns' },
] as const

/** Where each slot sits, in % of a card's own width, so phone and desk share it. */
const SLOTS = {
  left: { x: '-46%', rotate: -4, scale: 0.86, zIndex: 1 },
  center: { x: '0%', rotate: 0, scale: 1, zIndex: 3 },
  right: { x: '46%', rotate: 4, scale: 0.86, zIndex: 1 },
} as const

export interface HeroStart {
  templateId: string
  name: string
  role: string
}

export function HeroTypeOnce({
  onStart,
  onSample,
  onImportPdf,
}: {
  onStart: (start: HeroStart) => void
  onSample: () => void
  onImportPdf: () => void
}) {
  const reduce = useReducedMotion()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [chosen, setChosen] = useState(1)
  // Three full pages re-render on a keystroke; deferring keeps typing instant.
  const dName = useDeferredValue(name.trim())
  const dRole = useDeferredValue(role.trim())

  const base = useMemo(
    () =>
      HERO_PAGES.map(({ id }) => {
        const d = createDocument({ sample: true })
        d.metadata = applyTemplateToMetadata(d.metadata, getTemplate(id).defaults)
        return d
      }),
    []
  )
  const docs = useMemo<ResumeDocument[]>(
    () =>
      base.map((d) => ({
        ...d,
        content: {
          ...d.content,
          basics: { ...d.content.basics, name: dName || d.content.basics.name, label: dRole || d.content.basics.label },
        },
      })),
    [base, dName, dRole]
  )

  // The chosen page takes the centre; the other two keep their order either side.
  const slotOf = (i: number): keyof typeof SLOTS => {
    if (i === chosen) return 'center'
    const rest = [0, 1, 2].filter((k) => k !== chosen)
    return rest[0] === i ? 'left' : 'right'
  }
  const chosenName = getTemplate(HERO_PAGES[chosen].id).name

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onStart({ templateId: HERO_PAGES[chosen].id, name: name.trim(), role: role.trim() })
  }

  const [lead, last] = splitLastWord(SITE.hero)

  return (
    <section id="hero-stage" className="relative overflow-hidden bg-[#f5f3ee] dark:bg-background">
      {/* Morning light across a desk: the pages below are lying in it. */}
      <img
        src="/art/hero-daylight-1280.webp"
        srcSet="/art/hero-daylight-1280.webp 1280w, /art/hero-daylight-1920.webp 1920w"
        sizes="100vw"
        alt=""
        aria-hidden
        decoding="async"
        {...{ fetchpriority: 'high' }}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
      />
      <div className="relative mx-auto grid max-w-6xl gap-x-10 gap-y-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,28rem)_1fr] lg:grid-rows-[auto_1fr] lg:pb-24 lg:pt-20">
        <div className="lg:self-end">
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] text-[#16171d] sm:text-[3.5rem] dark:text-foreground">
            {lead} <span className="text-[#8a5a12] dark:text-[#e2b04f]">{last}</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a4d57] dark:text-muted-foreground">
            {TEMPLATE_COUNT} designs, a built-in ATS check and a real vector PDF. Free and open source, with nothing to sign up for.
          </p>
        </div>

        <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-2">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[#e3dfd5] bg-white/90 p-4 shadow-[0_18px_40px_-28px_rgba(22,23,29,0.45)] sm:p-5 dark:border-border dark:bg-surface"
          >
            <p className="text-sm font-medium text-[#16171d] dark:text-foreground">Try it: type your name and watch the pages.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-[#5b5e68] dark:text-muted-foreground">Your name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  maxLength={60}
                  className="mt-1 h-11 w-full rounded-lg border border-[#d9d5ca] bg-white px-3 text-[15px] text-[#16171d] outline-none transition placeholder:text-[#9a9ca4] focus:border-[#b07a1e] focus:ring-2 focus:ring-[#d4982f]/30 dark:border-border dark:bg-background dark:text-foreground"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#5b5e68] dark:text-muted-foreground">Job title</span>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  autoComplete="organization-title"
                  placeholder="Senior Software Engineer"
                  maxLength={80}
                  className="mt-1 h-11 w-full rounded-lg border border-[#d9d5ca] bg-white px-3 text-[15px] text-[#16171d] outline-none transition placeholder:text-[#9a9ca4] focus:border-[#b07a1e] focus:ring-2 focus:ring-[#d4982f]/30 dark:border-border dark:bg-background dark:text-foreground"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(138,90,18,0.9)] transition hover:brightness-110 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg,#8a5a12,#c08a2a)' }}
              >
                Start with {chosenName} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSample}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d9d5ca] bg-white px-4 text-sm font-semibold text-[#16171d] transition hover:bg-[#f7f5f0] dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-surface-muted"
              >
                <FileText className="h-4 w-4" /> Start with an example
              </button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[#5b5e68] dark:text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" /> What you type stays in this browser. Nothing is sent anywhere.
            </p>
          </form>

          <p className="mt-4 text-sm text-[#5b5e68] dark:text-muted-foreground">
            Already have one?{' '}
            <button
              onClick={onImportPdf}
              className="relative inline-flex items-center gap-1 font-medium text-[#8a5a12] underline-offset-2 before:absolute before:-inset-2 before:content-[''] hover:underline dark:text-[#e2b04f]"
            >
              <FileUp className="h-3.5 w-3.5" /> Import your PDF
            </button>{' '}
            to edit it here, read on your own device.
          </p>
        </div>

        {/* The pages, and above them the switch that names them: the page in
            front is the design you start with. A page can be clicked too. */}
        <div className="relative order-1 mx-auto w-full max-w-[38rem] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" data-nosnippet>
          <div
            role="radiogroup"
            aria-label="Design to start with"
            className="relative z-10 mx-auto flex w-fit max-w-full gap-1 rounded-full border border-[#e3dfd5] bg-white/85 p-1 shadow-[0_6px_18px_-12px_rgba(22,23,29,0.35)] backdrop-blur-sm dark:border-border dark:bg-surface"
          >
            {HERO_PAGES.map(({ id, note }, i) => {
              const on = i === chosen
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChosen(i)}
                  className={`h-9 rounded-full px-3.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07a1e] sm:px-4 ${
                    on
                      ? 'bg-[#16171d] text-white dark:bg-foreground dark:text-background'
                      : 'text-[#4a4d57] hover:bg-[#f2efe8] hover:text-[#16171d] dark:text-muted-foreground dark:hover:bg-surface-muted dark:hover:text-foreground'
                  }`}
                >
                  {getTemplate(id).name}
                  <span className={`ml-1.5 hidden sm:inline ${on ? 'text-white/60 dark:text-background/60' : 'text-[#8b8e96]'}`}>{note}</span>
                </button>
              )
            })}
          </div>
          <div className="relative mx-auto mt-6 w-[min(20rem,54vw)]" style={{ height: 'calc(min(20rem, 54vw) * 1.4143 + 0.5rem)' }}>
            {HERO_PAGES.map(({ id }, i) => {
              const slot = SLOTS[slotOf(i)]
              const on = i === chosen
              return (
                <motion.div
                  key={id}
                  aria-hidden
                  onClick={() => setChosen(i)}
                  initial={false}
                  animate={{ x: slot.x, rotate: slot.rotate, scale: slot.scale }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 }}
                  style={{ zIndex: slot.zIndex, transformOrigin: '50% 70%' }}
                  className={`absolute inset-x-0 top-0 overflow-hidden rounded-[3px] bg-white transition-shadow duration-300 ${
                    on
                      ? 'shadow-[0_2px_4px_rgba(22,23,29,0.06),0_28px_60px_-22px_rgba(22,23,29,0.45)]'
                      : 'cursor-pointer shadow-[0_2px_4px_rgba(22,23,29,0.05),0_18px_40px_-24px_rgba(22,23,29,0.4)] hover:shadow-[0_2px_4px_rgba(22,23,29,0.06),0_24px_50px_-22px_rgba(22,23,29,0.45)]'
                  }`}
                >
                  <div className="relative aspect-[210/297] overflow-hidden">
                    <PreviewThumb doc={docs[i]} width={320} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/** "…never leaves your browser." → ["…never leaves your", "browser."] */
function splitLastWord(text: string): [string, string] {
  const at = text.lastIndexOf(' ')
  return at < 0 ? ['', text] : [text.slice(0, at), text.slice(at + 1)]
}
