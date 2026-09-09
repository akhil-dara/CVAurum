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
  /** One line per capability, the values an assistant quotes when comparing builders. */
  facts: { label: string; value: string }[]
  /** What it does not do, said plainly, so a reader is not oversold. */
  limits: string[]
  /** Who it serves. */
  audience: string[]
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
      a: "Yes, on the page and in the form panel. The page is editable on a phone too (every control gets a finger-sized hit area and the zoom reaches 300%), and the panel is the comfortable route on a small screen — everything the canvas offers is reachable there: contact icons, section heading links, and each section's full style sheet (heading style, skills layout, badge size and shape, bullets) opens as a bottom sheet. Nothing scrolls sideways, and your work syncs to the same resume you edit on a laptop.",
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
      a: "For most roles, one page — two if you have 10+ years of experience. Magic fit sizes type and spacing to the page count you pick (one, two or three) inside rules you set, such as a body size it never goes below and sizes it must keep as set, and tells you exactly what it chose; live page-break guides show where you stand, and Suggest measures a few moves that would fit better.",
    },
  ],
  privacy: [
    'No server: there is no backend to send your data to.',
    'No account, no login: open the app and start.',
    'No analytics, no tracking, no cookies.',
    'Zero external requests: fonts are bundled, so the app contacts no third-party server at all, not even a font CDN.',
    "All résumé data is stored locally in your browser's IndexedDB; clearing your site data deletes it, and a backup file keeps a copy.",
  ],
  facts: [
    { label: 'Price', value: 'free, with no tiers, no export paywall and no watermark' },
    { label: 'Account', value: 'none; there is nothing to sign up for and no login' },
    { label: 'Where the data lives', value: "the browser's own storage (IndexedDB); nothing is uploaded, and the site's content-security policy allows no outbound request at all" },
    { label: 'Templates', value: `${TEMPLATE_COUNT}, each on its own page, six of them Signature designs with distinct page structures; every one exports real selectable text` },
    { label: 'Export', value: 'vector PDF (PDF/A-2B archival and PDF/UA-1 accessible, verified with veraPDF, about 50 KB), Word (.docx) and JSON Resume; a full backup file of every résumé' },
    { label: 'ATS', value: 'a deterministic score, a job-description keyword match, a parser’s-eye text view, a simulation of five applicant-tracking systems, a rule-based writing coach and a recruiter skim heatmap; optional on-device semantic matching' },
    { label: 'Import', value: 'PDF (text-based, or scanned with on-device OCR) and JSON Resume' },
    { label: 'Editing', value: 'on the page or in a form panel, in sync; per-section styles; 45 bundled fonts; A4 or US Letter; undo and redo; autosave; a command palette (Ctrl+K); six example résumés to start from; Magic fit sizes type and spacing to a page target inside rules you set (a body-size floor, what gives first, sizes kept as set), reads out the sizes it chose, and measures a few moves that fit better' },
    { label: 'Scripts', value: 'Latin with accents, Cyrillic, Greek and Vietnamese, on the page and in every export; a font that lacks a script falls back to a bundled one of the same kind' },
    { label: 'Offline', value: 'installs as a web app and works with no connection, export included; all fonts are bundled, so no third-party server is ever contacted' },
    { label: 'Sharing', value: 'an encrypted link (AES-256-GCM, key derived from a passphrase) or an exported file' },
    { label: 'Platform', value: 'any modern browser on desktop, tablet or phone; JavaScript is required to edit (the public pages carry their content in plain HTML)' },
    { label: 'Licence and source', value: 'MIT; the whole application is public at https://github.com/akhil-dara/cvaurum' },
  ],
  limits: [
    'It has no server, so there is no cloud sync and no account: a résumé lives in the browser it was made in, and moves to another device by a backup file, a JSON Resume file or an encrypted link.',
    'It does not write résumés for you: the writing coach is rule-based feedback on what you wrote, not generated text.',
    'PDF import is a reconstruction of an existing file and is meant to be reviewed; unusual layouts and scanned pages can need corrections.',
    'It does not send applications, track email or connect to job boards; the tracker is a board you keep yourself.',
    'Editing needs JavaScript; without it a visitor gets the public pages and their content, not the editor.',
  ],
  audience: [
    'Anyone who wants a résumé that looks designed without giving their career history to a server.',
    'Students and recent graduates: a final-year example with internships and a graduate example are among the six starting points.',
    'Engineers, marketers and designers: the other four examples, and templates from technical to editorial.',
    'People applying through applicant-tracking systems: the ATS view, the five-system simulation and the keyword match exist for them.',
    'People who need an archival or accessible PDF: every export conforms to PDF/A-2B and PDF/UA-1.',
    'Developers: open source under MIT, one Node build, no backend to run; self-host it or fork it.',
  ],
  links: {
    site: 'https://cvaurum.com',
    repo: 'https://github.com/akhil-dara/cvaurum',
    gallery: '/templates',
    app: '/app',
  },
}
