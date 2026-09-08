import { TEMPLATE_COUNT } from '@/templates/registry'

/**
 * The landing page's words, in one place.
 *
 * The page (src/routes/Landing.tsx) renders from this object, and so do the
 * copies a machine reader gets: the static HTML written into dist/index.html
 * and the llms.txt pair (src/lib/seoPages.ts). One source, so the page a
 * person sees and the text a crawler or an assistant reads cannot drift
 * apart. Plain facts, present tense, nothing here that is not true of the
 * code.
 */
export interface SiteCopy {
  name: 'CVAurum'
  /** One factual sentence: what it is. */
  oneLiner: string
  /** The h1, as one line of text. */
  hero: string
  steps: { title: string; body: string }[]
  comparison: { capability: string; cvaurum: string; others: string }[]
  faq: { q: string; a: string }[]
  privacy: string[]
  links: { site: string; repo: string; gallery: string; app: string }
}

export const SITE: SiteCopy = {
  name: 'CVAurum',
  oneLiner: `CVAurum is a free, open-source (MIT) résumé builder that runs entirely in your browser: no account, no server, no tracking; ${TEMPLATE_COUNT} templates, a built-in deterministic ATS check, PDF import with on-device OCR, and vector PDF, Word and JSON Resume export, working offline as an installable app.`,
  hero: 'A resume this beautiful never leaves your browser.',
  steps: [
    {
      title: 'Pick a template',
      body: `Choose from ${TEMPLATE_COUNT} recruiter-ready designs. Switch anytime — your content carries over.`,
    },
    {
      title: 'Fill it in',
      body: 'Edit right on the page. A live ATS score and keyword match keep you on track.',
    },
    {
      title: 'Export & apply',
      body: 'Download a crisp, selectable PDF or an ATS-friendly Word file in one click.',
    },
  ],
  /** Honest head-to-head: what CVAurum does vs. what most resume builders do. */
  comparison: [
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
      cvaurum: `${TEMPLATE_COUNT} designer templates, restylable section by section`,
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
  ],
  faq: [
    {
      q: 'How do I know my data is really private?',
      a: "Because you can check. CVAurum runs entirely in your browser — your resume is stored locally and never sent anywhere. There's no account, no server, and no analytics. Open your browser's network tab and you'll see zero outbound requests, even for fonts, which we self-host.",
    },
    {
      q: "If it's free and open source, what's the catch?",
      a: "There isn't one. CVAurum is MIT-licensed and the full source is on GitHub. There's no paid tier, no export paywall, and no data to monetize because we never collect any. Fork it, self-host it, or run it offline forever.",
    },
    {
      q: 'Is the ATS score real, or AI guesswork?',
      a: "It's deterministic, not a guess. The same resume and job description always produce the same score, and it shows exactly which keywords matched and which are missing — so you can fix your resume with confidence.",
    },
    {
      q: 'Where is my data stored?',
      a: "Only in your browser, using local storage. Nothing is sent anywhere. Clear your browser data and it's gone — so use Backup to keep a copy.",
    },
    {
      q: 'Will my résumé pass ATS scans?',
      a: "The exported PDF and Word files use real, selectable text (not an image), and there's a built-in ATS check that scores structure and keyword coverage against a job description.",
    },
    {
      q: 'Can I move my résumé to another computer?',
      a: 'Yes. Export a full backup (one file) or a single JSON Resume file, then import it in any browser.',
    },
    {
      q: 'Do I need to create an account?',
      a: "No. There's no sign-up, no email, and no login — open CVAurum and start editing immediately. Most builders make you register before you can even see the editor; CVAurum never does.",
    },
    {
      q: "What's the difference between a CV and a resume?",
      a: 'A resume is a concise, one-to-two page summary tailored to a specific job (common in the US). A CV is a longer, comprehensive record of your academic and professional history (standard in academia and much of Europe). CVAurum builds both — pick a compact template for a resume, or add sections for a full CV.',
    },
    {
      q: 'Are the links in my PDF clickable?',
      a: 'Yes, by default — they are real clickable regions in the file, not underlined words. Each link also keeps its display text separate from its destination, so it can read Portfolio or Verify while pointing anywhere: a project can carry several named links, and a certification or award can end its line with a short Verify (printed as small tags, or as plain words if you prefer) — with an issuer badge beside the name if you add one. Where a link prints as a word, that word is also the control — click it on the page and the same card opens. The Word file and the ATS preview say the same thing the page does, and Word gets real hyperlinks. If you are printing on paper or submitting somewhere a live link is unwelcome, one switch in Design turns clickability off while keeping the text.',
    },
    {
      q: 'Can I edit on my phone?',
      a: "Yes. The drag-and-drop canvas is a desktop surface, so on a phone the form panel is the editor — and everything the canvas offers is reachable there: contact icons, section heading links, and each section's full style sheet (heading style, skills layout, badge size and shape, bullets) opens as a bottom sheet. Nothing scrolls sideways, and your work syncs to the same resume you edit on a laptop.",
    },
    {
      q: 'What file formats can I download?',
      a: 'A crisp vector PDF with real, selectable text; an editable Word (.docx) that mirrors your template; and the open JSON Resume format. Every export is free and unlimited — no paywall, no watermark.',
    },
    {
      q: 'Is the PDF archival quality?',
      a: 'Yes — and accessible. Every export conforms to both PDF/A-2B (the ISO standard for long-term archiving, with all fonts and an sRGB colour profile embedded) and PDF/UA-1 (the accessibility standard), checked against the veraPDF reference validator. It is fully tagged, so a screen reader reads your headings, paragraphs and bullet lists as real structure — in logical order, so your name comes first even on sidebar layouts.',
    },
    {
      q: 'How long should my resume be?',
      a: "For most roles, one page — two if you have 10+ years of experience. CVAurum auto-fits your content to a single page when it's close, and shows live page-break guides so you always know where you stand.",
    },
  ],
  privacy: [
    'No server: there is no backend to send your data to.',
    'No account, no login: open the app and start.',
    'No analytics, no tracking, no cookies.',
    'Zero external requests: fonts are bundled, so the app contacts no third-party server at all, not even a font CDN.',
    "All résumé data is stored locally in your browser's IndexedDB; clearing your site data deletes it, and a backup file keeps a copy.",
  ],
  links: {
    site: 'https://cvaurum.com',
    repo: 'https://github.com/akhil-dara/cvaurum',
    gallery: '/templates',
    app: '/app',
  },
}
