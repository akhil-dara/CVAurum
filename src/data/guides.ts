import { TEMPLATE_COUNT } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'

/**
 * The three pages that answer a search in its own words.
 *
 * Someone who types "free resume builder", "ATS resume checker" or "resume
 * builder no sign up" is asking one question, and the answer was spread
 * across the landing page's FAQ, its comparison table and the facts in
 * llms.txt. Each guide gathers that answer onto one page with the question as
 * its heading. They are not new claims: every line is something siteCopy.ts
 * already says, or a count read from the registry and the library, so the
 * guides, the landing page and what an assistant reads cannot disagree.
 *
 * One source for every copy of a guide - the page a person reads
 * (src/routes/Guide.tsx), the HTML written at build for a reader that runs no
 * script, the Markdown twin and the structured data (src/lib/seoPages.ts).
 */
export interface GuideSection {
  heading: string
  paragraphs: string[]
  /** A plain list under the paragraphs, when the answer is a list. */
  list?: string[]
}

export interface Guide {
  /** The URL path without its slash: /<slug>. */
  slug: string
  /** The <title>. Keyword first, brand last. */
  title: string
  /** The h1: the search, answered in a line. */
  heading: string
  /** The meta description, 155 characters or fewer. */
  description: string
  /** The short name used in a breadcrumb and a link list. */
  short: string
  intro: string[]
  sections: GuideSection[]
  faq: { q: string; a: string }[]
  /** Where the page sends someone who is convinced. */
  action: { label: string; href: string }
  /** A working tool on the page itself, not only a way to one. */
  tool?: 'ats-check'
}

export const GUIDES: readonly Guide[] = [
  {
    slug: 'free-resume-builder',
    title: 'Free Resume Builder — No Paywall, No Watermark · CVAurum',
    heading: 'A free resume builder that stays free when you download',
    description: `Build and download a résumé for free: ${TEMPLATE_COUNT} templates, PDF and Word export, no paywall, no watermark, no account. Open source and private.`,
    short: 'Free resume builder',
    intro: [
      'Most résumé builders are free until the moment you press Download. CVAurum is free at that moment too: every template, every export format and every check, with no tier to upgrade to and no watermark on the file.',
      'It can afford to be, because it has no server to pay for. The whole application runs in your browser, your résumé is saved on your own device, and the source code is public under the AGPL-3.0.',
    ],
    sections: [
      {
        heading: 'What is free',
        paragraphs: ['All of it. There is no paid plan, so there is nothing held back from this list.'],
        list: [
          `${TEMPLATE_COUNT} résumé templates, each restylable section by section`,
          `${SAMPLE_COUNT} complete example résumés to start from, across twelve fields`,
          'Unlimited PDF downloads: vector text you can select, archival (PDF/A-2B) and accessible (PDF/UA-1)',
          'An editable Word (.docx) file and a JSON Resume file',
          'An ATS check with a job-description keyword match',
          'Import from an existing PDF, including a scanned one',
          'Magic fit, which sizes the page to one, two or three pages inside rules you set',
        ],
      },
      {
        heading: 'Why there is no catch',
        paragraphs: [
          'A résumé site usually pays for itself with a subscription, with advertising, or with the data people type into it. CVAurum has no subscription, shows no advertising, and never receives your data: there is no account, no analytics and no tracking, and the site’s content-security policy does not allow the page to send anything anywhere.',
          'You can check that rather than trust it. Open your browser’s network panel while you edit and nothing leaves the page, not even a request for a font, because the fonts are part of the app.',
        ],
      },
      {
        heading: 'What it does not do',
        paragraphs: [
          'It does not write your résumé for you, and it does not sync between devices, because there is no server to sync through. A résumé lives in the browser it was made in; a backup file, a JSON Resume file or an encrypted link moves it to another one.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is it really free to download the PDF?',
        a: 'Yes. Every download is free and unlimited, in PDF, Word and JSON Resume, with no watermark. There is no paid plan to unlock.',
      },
      {
        q: 'Do I need to give an email address?',
        a: 'No. There is no sign-up and no login; open the editor and start typing.',
      },
      {
        q: 'Who pays for it?',
        a: 'There is little to pay for: the app is a set of static files and your browser does all the work. It is an open-source project under the AGPL-3.0.',
      },
    ],
    action: { label: 'Start a résumé', href: '/app' },
  },
  {
    slug: 'ats-resume-checker',
    title: 'Free ATS Resume Checker — Private, No Upload · CVAurum',
    heading: 'A free ATS résumé checker that never uploads your résumé',
    description:
      'Check a résumé the way an applicant-tracking system reads it: a repeatable score, a keyword match against the job and the text a parser sees. No upload.',
    short: 'ATS resume checker',
    intro: [
      'An applicant-tracking system reads the text of your file, not the picture of it. CVAurum’s ATS check shows you that text and scores what a parser needs from it, inside your browser, so the résumé you are checking is never sent to anyone.',
      'The score is deterministic: the same résumé and the same job description give the same score every time, and every point it takes away comes with the reason and the place on the page.',
    ],
    sections: [
      {
        heading: 'What it checks',
        paragraphs: ['The checks fall under three questions: can a parser read the file, will the right keywords be found, and will a person reading it quickly see what matters.'],
        list: [
          'The plain text a parser reads, shown beside the page, in the order it is read',
          'A keyword match against a job description you paste in: which terms you have and which are missing',
          'Structure: contact details, section headings a parser recognises, dates it can read',
          'Your bullets: how many carry a number, and which start with a weak verb',
          'How five kinds of applicant-tracking system would split the file into fields',
          'A skim map of where a recruiter’s eye lands in the first seconds',
        ],
      },
      {
        heading: 'Why the file passes, not only the score',
        paragraphs: [
          'A good score on a file a parser cannot read is worth nothing, so the export is held to the same standard as the check. The PDF carries real, selectable text; decoration such as rules, monograms and heading numerals is drawn as shapes and never becomes text; and the text layer of every design matches the ATS view word for word.',
          'Every export is also a tagged PDF/UA-1 file, so the structure a parser or a screen reader finds — headings, paragraphs, lists, in reading order — is the structure you see.',
        ],
      },
      {
        heading: 'How to use it',
        paragraphs: [
          'Open or import your résumé in the editor, open the ATS panel, and paste the job description into the box at the bottom. Fix what it points at, and watch the score and the keyword match move as you type.',
        ],
      },
    ],
    faq: [
      {
        q: 'Do I have to upload my résumé to check it?',
        a: 'No. The check runs in your browser. Import your existing PDF (a scanned one works too) and it is read on your own device.',
      },
      {
        q: 'Is the ATS score an AI guess?',
        a: 'No. It is rule-based and deterministic: the same inputs always give the same score, and each deduction names its reason.',
      },
      {
        q: 'Does it guarantee I will get an interview?',
        a: 'No checker can. It makes sure a parser can read what you wrote and that the job’s keywords are there when they are true of you; the rest is your experience.',
      },
    ],
    action: { label: 'Check a résumé', href: '/app' },
    tool: 'ats-check',
  },
  {
    slug: 'resume-builder-no-sign-up',
    title: 'Resume Builder With No Sign-Up or Login · CVAurum',
    heading: 'A résumé builder with no sign-up, no login and no email',
    description: `Make a résumé without creating an account: open the editor and start. ${TEMPLATE_COUNT} templates, free PDF and Word export, saved only in your browser.`,
    short: 'No sign-up resume builder',
    intro: [
      'There is no account to create. Open CVAurum and the editor is in front of you: pick a template, type, and download. No email address, no password, no confirmation link.',
      'Without an account there is nowhere else for your résumé to go, so it is saved where you made it — in your own browser — and nowhere else.',
    ],
    sections: [
      {
        heading: 'How it works without an account',
        paragraphs: [
          'Your résumés are kept in your browser’s own storage and saved as you type. Nothing is uploaded, because there is no server to upload to. The app installs like any other web app and keeps working with no connection at all.',
        ],
      },
      {
        heading: 'Moving a résumé to another device',
        paragraphs: ['Without an account there is no cloud sync, so a résumé travels the way a file does:'],
        list: [
          'A backup file of every résumé, restored in any browser',
          'A single résumé as a JSON Resume file',
          'An encrypted link, locked with a passphrase you choose (AES-256-GCM)',
        ],
      },
      {
        heading: 'One thing to know',
        paragraphs: [
          'Because the résumé lives only in your browser, clearing that browser’s site data deletes it. Keep a backup file of anything you would not want to type again.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I download my résumé without signing up?',
        a: 'Yes. PDF, Word and JSON Resume downloads are free and need no account.',
      },
      {
        q: 'Where is my résumé saved?',
        a: 'In your browser’s storage on your own device. It is never sent to a server.',
      },
      {
        q: 'What happens if I clear my browser data?',
        a: 'The résumé is deleted with it. Use Backup to keep a copy you can restore.',
      },
    ],
    action: { label: 'Open the editor', href: '/app' },
  },
]

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
