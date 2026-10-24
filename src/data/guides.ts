import { TEMPLATE_COUNT } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'

/**
 * The pages that answer a search in its own words.
 *
 * Someone who types "free resume builder", "ATS resume checker" or "resume
 * builder no sign up" is asking one question, and the answer was spread
 * across the landing page's FAQ, its comparison table and the facts in
 * llms.txt. Each guide gathers that answer onto one page with the question as
 * its heading. Those first guides make no new claims: every line is something
 * siteCopy.ts already says, or a count read from the registry and the library,
 * so the guides, the landing page and what an assistant reads cannot disagree.
 *
 * Some guides now carry writing advice too ("resume format", "how to write a
 * resume", "resume for freshers", "CV template", "resume template Word"). They
 * are held to the same rule: they name no other product, invent no figure, and
 * say nothing about CVAurum the code does not do. Counts come from the same
 * constants; example and design links use real slugs from the library and the
 * registry.
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
  /** A body built from the sample library after the written sections
   *  (src/data/guideData.ts): every summary, every role's skills, or the
   *  verbs the bullets open with. Read there, not here, so this file stays
   *  small enough for the router and the footer to import. */
  generated?: 'summaries' | 'skills' | 'verbs'
}

export const GUIDES: readonly Guide[] = [
  {
    slug: 'free-resume-builder',
    title: 'Free Resume Builder — No Paywall, No Watermark · CVAurum',
    heading: 'A free resume builder that stays free when you download',
    description: `Build and download a resume for free: ${TEMPLATE_COUNT} templates, PDF and Word export, no paywall, no watermark, no account. Open source and private.`,
    short: 'Free resume builder',
    intro: [
      'Most resume builders are free until the moment you press Download. CVAurum is free at that moment too: every template, every export format and every check, with no tier to upgrade to and no watermark on the file.',
      'It can afford to be, because it has no server to pay for. The whole application runs in your browser, your résumé is saved on your own device, and the source code is public under the AGPL-3.0.',
    ],
    sections: [
      {
        heading: 'What is free',
        paragraphs: ['All of it. There is no paid plan, so there is nothing held back from this list.'],
        list: [
          `${TEMPLATE_COUNT} resume templates, each restylable section by section`,
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
    heading: 'A free ATS resume checker that never uploads your resume',
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
        paragraphs: ['The checks answer four questions in turn: can a parser read the file at all, is the right material on the page, is it written well, and is it set so a person skimming it sees what matters.'],
        list: [
          'The file itself: real selectable text or a scanned picture, characters that decode, headings spaced into single letters, two columns a parser may read straight across, page size and file name',
          'What a parser pulled out, field by field — name, email, phone, each role with its dates — and which fields it could not find',
          'The plain text a parser reads, in the order it is read',
          'A keyword match against a job description you paste in: which terms you have and which are missing',
          'Structure: contact details, section headings a parser recognises, dates it can read',
          'Your bullets: how many carry a number, which start with a weak verb, which run past two lines, and finished roles told in the present tense',
          'Gaps between roles, emoji and symbols a parser drops, and personal details such as a date of birth that invite bias',
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
          'Drop your PDF on the box at the top of this page. The report appears right here: the score, what a parser pulled out, every check worst first, and a box for the job description. Nothing is saved.',
          'To fix what it found, open the résumé in the editor from the report: each fault is marked where it is, and the score moves as you type. Or rebuild it in any of the designs without retyping.',
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
    heading: 'A resume builder with no sign-up, no login and no email',
    description: `Make a resume without creating an account: open the editor and start. ${TEMPLATE_COUNT} templates, free PDF and Word export, saved only in your browser.`,
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
        heading: 'Moving a resume to another device',
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
  {
    slug: 'resume-format',
    title: 'Resume Format: Chronological, Functional or Hybrid · CVAurum',
    heading: 'Resume format: use reverse-chronological unless you have a clear reason not to',
    description:
      'Which resume format to use: chronological, functional or hybrid, the section order, one page or two, fonts, margins, PDF or Word, and what an ATS needs.',
    short: 'Resume format',
    intro: [
      'For most people the right résumé format is reverse-chronological: your most recent role first, each role with its dates, then education and skills. A hybrid format suits career changers; a purely functional one rarely helps.',
      'Format also means the page itself: one column, a readable font, clear headings, sensible margins and a file a parser can read. This guide covers both.',
    ],
    sections: [
      {
        heading: 'What are the three resume formats?',
        paragraphs: ['Every résumé is some arrangement of the same material. The three named formats differ in what leads.'],
        list: [
          'Reverse-chronological: roles listed newest first, each with its employer, dates and achievements. It is what recruiters expect and what applicant-tracking systems parse most reliably.',
          'Functional (skills-based): skills grouped by theme at the top, with the work history reduced to a short list or left out. It hides gaps, and readers know that, so it tends to raise the very question it avoids.',
          'Hybrid (combination): a short skills or highlights block first, then a full reverse-chronological history. It lets you lead with what transfers while still showing where and when you did it.',
        ],
      },
      {
        heading: 'Which resume format should you choose?',
        paragraphs: [
          'Choose by what your history looks like, not by what looks impressive. If the answer is not obvious, choose reverse-chronological: it is never the wrong answer, only sometimes not the strongest one.',
        ],
        list: [
          'A steady history in one field, or a step up in it: reverse-chronological.',
          'Changing careers, where your best evidence comes from a different field: hybrid, with a skills block that names what transfers.',
          'Returning after a long break: reverse-chronological with the gap stated plainly in a line, or hybrid. A gap explained in a few words is read more kindly than one hidden.',
          'Little or no work history yet: the fresher format below, which is reverse-chronological with education and projects moved up.',
          'Academic or research posts: a CV, which is longer and lists publications, grants and teaching. See the CV template guide.',
        ],
      },
      {
        heading: 'What order should resume sections go in?',
        paragraphs: [
          'Put the strongest evidence for the job nearest the top. For someone with experience, that is the experience; for a recent graduate, it is usually education and projects. A common order:',
        ],
        list: [
          'Name and contact line: phone, email, city, and a LinkedIn or portfolio link if it adds something',
          'Summary: two or three lines on who you are and what you are aiming for',
          'Experience, newest first',
          'Skills, grouped and specific',
          'Education, with certifications',
          'Optional sections that earn their place: projects, publications, awards, languages, volunteering',
        ],
      },
      {
        heading: 'Should a resume be one page or two?',
        paragraphs: [
          'One page if you are early in your career or the extra page would only repeat itself. Two pages are fine once you have the experience to fill them with distinct, relevant work, and are normal for a CV in the UK and for senior roles. Never pad to reach a second page, and never shrink the type until it is hard to read to stay on one.',
          'If you are close to a page boundary, cut the oldest or least relevant bullets first. In CVAurum, Magic fit can size the page to one, two or three pages inside limits you set, so the type never drops below what you allow.',
        ],
      },
      {
        heading: 'What font, size and margins should a resume use?',
        paragraphs: [
          'Use one plain, widely available typeface, or two at most: a serif or sans-serif for the body and, if you like, another for headings. Keep body text in the range a reader takes in without effort, roughly 10 to 12 points depending on the face, with headings a step larger and bold.',
          'Leave margins wide enough that the page does not look crowded, and keep spacing consistent: the same gap above every heading, the same date format in every role. Consistency reads as care more than any decoration does.',
        ],
      },
      {
        heading: 'Is a PDF or Word resume better?',
        paragraphs: [
          'Send a PDF unless the employer asks for Word. A PDF looks the same on every screen and printer; a Word file can reflow on a computer with different fonts. Some recruiters and agencies ask for Word because they edit or reformat what they forward, and then a .docx is the right answer.',
          'Either way the file must carry real text. A résumé exported as a picture, or scanned, gives a parser nothing to read. CVAurum exports both: a vector PDF with selectable text, and an editable Word file laid out in a single column.',
        ],
      },
      {
        heading: 'What resume format is ATS-friendly?',
        paragraphs: ['An applicant-tracking system reads the text of your file in order. It does best with:'],
        list: [
          'One column, or a layout whose text still reads in a sensible order',
          'Standard section headings such as Experience, Education and Skills',
          'Dates in a consistent, readable form on every role',
          'Contact details as text in the body, not in a header image',
          'No tables, text boxes or icons standing in for words',
          'Keywords from the job description, where they are true of you',
        ],
      },
      {
        heading: 'What is the best resume format for freshers?',
        paragraphs: [
          'A fresher’s résumé is still reverse-chronological, but education leads because it is your strongest evidence. After it come projects, internships and any part-time work, then skills, then achievements and activities. Keep it to one page.',
          'Give projects the same treatment as jobs: a title, your role, the tools you used and what came of it. The resume for freshers guide covers this in full.',
        ],
      },
      {
        heading: 'Where can you see each format?',
        paragraphs: [
          `The ${SAMPLE_COUNT} [examples in the library](/examples) are complete résumés in these formats, including an [India final-year engineering student](/examples/final-year-engineering-student), a [UK career changer moving into software](/examples/career-changer-junior-developer) and a [senior US backend engineer](/examples/senior-backend-engineer). For a plain single-column design, try [Harvard](/templates/harvard), [Oxford](/templates/classic) or [Aria](/templates/modern); for a dense page, [Quartz](/templates/compact).`,
        ],
      },
    ],
    faq: [
      {
        q: 'What is the most common resume format?',
        a: 'Reverse-chronological: most recent role first, each with dates and achievements. It suits most people and is the format applicant-tracking systems read most reliably.',
      },
      {
        q: 'Is a functional resume a good idea?',
        a: 'Rarely. It hides dates, which readers notice. If you are changing careers, a hybrid format leads with transferable skills and still shows a full work history.',
      },
      {
        q: 'Can a resume be two pages?',
        a: 'Yes, when two pages of distinct, relevant experience exist. Early in a career, one page is usually better.',
      },
      {
        q: 'Should I send my resume as a PDF or a Word file?',
        a: 'A PDF, unless the employer or agency asks for Word. Both must contain real, selectable text.',
      },
    ],
    action: { label: 'Browse templates', href: '/templates' },
  },
  {
    slug: 'how-to-write-a-resume',
    title: 'How to Write a Resume, Step by Step (With Examples) · CVAurum',
    heading: 'How to write a resume: seven steps, from contact line to proofread',
    description:
      'How to write a resume step by step: contact line, summary, experience bullets with results, skills, education, tailoring to the job and proofreading.',
    short: 'How to write a resume',
    intro: [
      'Write a résumé in this order: contact line, a short summary, experience as bullets that each show an action, its scope and a result, then skills and education. Tailor it to each job description, and proofread it before you send it.',
      `Start from an example close to your own role rather than a blank page. The library holds ${SAMPLE_COUNT} [complete ones](/examples), and any of them opens in any of the ${TEMPLATE_COUNT} [templates](/templates).`,
    ],
    sections: [
      {
        heading: 'Step 1: What goes in the contact line?',
        paragraphs: [
          'Your name, largest on the page, then one line of contact details: phone, a professional email address, your city and country, and a link to LinkedIn, a portfolio or code if it shows real work. A full street address is not needed.',
          'Leave out date of birth, marital status and a photo unless the country or employer expects them. Put the contact line in the body of the page, not in a header graphic, so a parser reads it.',
        ],
      },
      {
        heading: 'Step 2: How do you write a resume summary?',
        paragraphs: [
          'Two or three lines: what you do, the level you do it at, what you are strongest in, and what you want next. Write it last, once the rest of the page tells you what is worth summarising.',
          'Make it specific to you. “Hard-working team player” describes anyone; “Data analyst with three years in retail pricing, strongest in SQL and experiment design” describes one person. If you are a student, a single line on what you study and the role you are looking for is enough.',
        ],
      },
      {
        heading: 'Step 3: How do you write experience bullet points?',
        paragraphs: [
          'List roles newest first, each with job title, employer, location and dates. Under each, write three to six bullets. A strong bullet has three parts: what you did, how big it was, and what changed because of it.',
        ],
        list: [
          'Action: open with a specific verb, such as built, led, cut, negotiated or redesigned, rather than “responsible for”.',
          'Scope: the size of the thing, such as the team, the budget, the number of users, accounts or sites.',
          'Result: what improved, by how much or by when. Use a real number when you have one; when you do not, name the concrete outcome.',
          'Example: “Rebuilt the month-end close checklist across four entities, cutting the close from eight working days to five.”',
          'Use the past tense for finished roles and the present tense only for the job you hold now.',
          'Keep each bullet to one or two lines, and put the most relevant one first.',
        ],
      },
      {
        heading: 'Step 4: Which skills should you list?',
        paragraphs: [
          'List skills a reader can check: tools, languages, methods, certifications, spoken languages. Group them under short labels, such as Languages, Tools and Methods, so they scan quickly. Leave out soft skills as bare words; show them in your bullets instead.',
          'Use the exact names the job description uses, where they are true of you. If it says “financial modelling”, write that, not only “Excel”.',
        ],
      },
      {
        heading: 'Step 5: How should you list education?',
        paragraphs: [
          'Degree, institution, location and dates, newest first. Add a grade or CGPA when it is strong or when the employer asks for it, and relevant modules, a thesis or honours when you are early in your career. Once you have a few years of experience, education moves below experience and shrinks to one line per qualification.',
        ],
      },
      {
        heading: 'Step 6: How do you tailor a resume to a job description?',
        paragraphs: ['Keep a full master résumé, and make a copy for each application. Then, for each job:'],
        list: [
          'Read the job description and mark the skills, tools and duties it repeats',
          'Make sure each of those that is true of you appears on the page, in the employer’s own words',
          'Move the most relevant bullets to the top of each role, and cut ones that do not serve this job',
          'Adjust the summary so its first line answers what this employer is hiring for',
          'Run a keyword check against the job description and close the real gaps, never by adding words that are not true',
        ],
      },
      {
        heading: 'Step 7: How do you proofread a resume?',
        paragraphs: ['Errors are the easiest reason to set a résumé aside, and the easiest to remove.'],
        list: [
          'Read it aloud, slowly, once on screen and once on paper',
          'Check every date, job title and employer name against the facts',
          'Check consistency: one date format, one tense per role, one style of bullet',
          'Make sure your email and phone number are correct and that every link opens',
          'Ask someone else to read it; they will find what you skim past',
          'Save the final file under your name, such as Firstname-Lastname-Resume.pdf',
        ],
      },
      {
        heading: 'How can CVAurum help with each step?',
        paragraphs: [
          'Open an example close to your role and replace its content with yours, or import your current PDF, a scanned one included, so you start from what you already have. The ATS check scores the page as you type: it flags bullets with no number, weak opening verbs, bullets that run past two lines and finished roles written in the present tense, and it matches your page against a pasted job description to show which terms are present and which are missing. The same check works on any PDF at the [ATS resume checker](/ats-resume-checker).',
          'Examples worth reading for bullet style: [Product Manager](/examples/product-manager), [Registered Nurse](/examples/registered-nurse), [Data Analyst](/examples/data-analyst), [Senior Accountant](/examples/senior-accountant) and [Customer Success Manager](/examples/customer-success-manager).',
        ],
      },
    ],
    faq: [
      {
        q: 'How long should a resume be?',
        a: 'One page early in a career; two pages once you have enough distinct, relevant experience to fill them.',
      },
      {
        q: 'What should I leave off a resume?',
        a: 'Date of birth, marital status, a photo in countries that do not expect one, “references available on request”, and duties that do not serve the job you are applying for.',
      },
      {
        q: 'Do I need a different resume for every job?',
        a: 'A tailored copy for each, yes. Keep one master résumé and adjust the summary, bullet order and keywords for each job description.',
      },
      {
        q: 'What if I have no numbers to put in my bullets?',
        a: 'Name the concrete outcome instead: what shipped, what was fixed, who used it. Scope, such as team size or number of clients, also counts.',
      },
    ],
    action: { label: 'Browse examples', href: '/examples' },
  },
  {
    slug: 'resume-for-freshers',
    title: 'Resume for Freshers: Format, Examples and Tips · CVAurum',
    heading: 'Resume for freshers: lead with education and projects, and keep it to one page',
    description:
      'How to write a fresher or student resume with little experience: format, what to include (projects, internships, coursework), examples and common mistakes.',
    short: 'Resume for freshers',
    intro: [
      'A fresher’s résumé fits on one page and leads with what you have: education, then projects and internships, then skills, then achievements. Write projects the way you would write a job, with your role, the tools and a result.',
      'It applies whether you are graduating in India, the UK, the US or anywhere else, and to anyone applying for a first full-time role.',
    ],
    sections: [
      {
        heading: 'What should a fresher put on a resume?',
        paragraphs: ['Little work experience does not mean little evidence. Look for it in:'],
        list: [
          'Projects: final-year, academic, hackathon or personal, each with what you built, the tools you used and what came of it',
          'Internships and training: even a short one, written with the same action-and-result bullets as a job',
          'Part-time work and freelancing: they show reliability, and often customer or team skills',
          'Relevant coursework: a short line of modules that match the role, only when it adds something your degree title does not',
          'Achievements: competition ranks, scholarships, published papers, certifications with the issuer named',
          'Leadership and activities: a society you ran, an event you organised, a team you captained, with what you did rather than only the title',
        ],
      },
      {
        heading: 'What is the best resume format for freshers?',
        paragraphs: ['Reverse-chronological within each section, with the sections in this order:'],
        list: [
          'Name and contact line: phone, email, city, and a LinkedIn, portfolio or code profile link that shows real work',
          'Objective or summary: one or two lines on what you study and the role you want',
          'Education: degree, institution, year of graduation and grade or CGPA; school results only if the employer asks for them',
          'Projects and internships',
          'Skills: grouped, and only those you could answer questions on',
          'Certifications, achievements and activities',
        ],
      },
      {
        heading: 'How long should a fresher resume be?',
        paragraphs: [
          'One page. A fresher’s second page is almost always filler, and a tight first page shows judgement. If you are over, shorten coursework and activities before you cut a project. In CVAurum, Magic fit can fit the page to one page within the smallest type size you allow.',
        ],
      },
      {
        heading: 'How do you write projects on a resume?',
        paragraphs: [
          'Give each project a name, your role if it was a team effort, the dates and two or three bullets. Say what problem it solved, what you built and with what, and what it achieved: a grade, a ranking, users, a measured improvement, or a working result someone can see. Link the code or a demo when one exists.',
          'Example: “Built a Flask and PostgreSQL attendance system for a department of 300 students; adopted by two faculty members for the semester.” Use your own true details; a specific small result beats a vague large one.',
        ],
      },
      {
        heading: 'Should a fresher resume have a career objective?',
        paragraphs: [
          'A short one, if it is specific. “Seeking a challenging position in a reputed organisation” tells the reader nothing. “Final-year electronics student looking for an embedded firmware role, with two projects on ARM microcontrollers” tells them who you are and what you want, in one line.',
        ],
      },
      {
        heading: 'What about personal details, a declaration or a photo?',
        paragraphs: [
          'Some older formats, common in India, add date of birth, father’s name, marital status, a photo and a signed declaration at the end. Most employers do not need them, and they take space your projects could use. Leave them out unless the employer or form asks. The ATS check in CVAurum flags a date of birth and similar personal details, and a photo can be hidden with one switch.',
        ],
      },
      {
        heading: 'What mistakes should freshers avoid?',
        paragraphs: [],
        list: [
          'Listing every skill you have heard of: keep the ones you can discuss in an interview',
          'Copying a classmate’s template wording: readers see the same lines many times',
          'Writing duties instead of outcomes: “worked on a website” instead of what the website did',
          'An unprofessional email address, or one you do not check',
          'Two columns, tables and skill bars that a parser reads out of order',
          'Spelling and grammar errors; read it aloud and ask someone to check it',
        ],
      },
      {
        heading: 'Which examples fit a fresher or student?',
        paragraphs: [
          'Start from one of these in the library and replace the content with yours. From India: [Final-Year Engineering Student](/examples/final-year-engineering-student), [Junior Accounts Executive](/examples/junior-accounts-executive), [MBA Candidate](/examples/mba-candidate), [Frontend Engineer](/examples/frontend-engineer), [Data Analyst](/examples/data-analyst), [Business Analyst](/examples/business-analyst) and [Audit Associate](/examples/audit-associate). From elsewhere: [Entry-Level Business Analyst](/examples/new-graduate-business-analyst), [Junior Data Analyst](/examples/bootcamp-graduate-data-analyst), [Mechanical Engineering Intern](/examples/mechanical-engineering-intern) and [Engineering Apprentice](/examples/school-leaver-apprenticeship).',
          'For the design, a plain single-column template keeps the page easy for a parser to read: [Harvard](/templates/harvard), [Aria](/templates/modern) or [Frost](/templates/minimal).',
        ],
      },
    ],
    faq: [
      {
        q: 'How do I make a resume with no experience?',
        a: 'Lead with education, then projects, internships and part-time work written as action-and-result bullets, then skills and achievements. Keep it to one page.',
      },
      {
        q: 'Should I include my CGPA or percentage?',
        a: 'Include it when it is strong or when the employer sets a cut-off. Otherwise you may leave it out.',
      },
      {
        q: 'Is a resume for freshers different from a CV?',
        a: 'In India and the UK the words are often used for the same document. For a fresher, both mean a one-page summary of education, projects and skills.',
      },
      {
        q: 'Should a fresher resume include a photo?',
        a: 'Only if the employer asks for one. Most do not, and a photo can confuse some applicant-tracking systems.',
      },
    ],
    action: { label: 'Browse examples', href: '/examples' },
  },
  {
    slug: 'cv-template',
    title: 'CV Template and CV Format for the UK, India and Europe · CVAurum',
    heading: 'CV template: a clear, two-page-at-most CV in the format employers expect',
    description:
      'CV format and templates: CV vs resume by country, academic CV vs job CV, and UK conventions (no photo, no date of birth, two pages is fine), with examples.',
    short: 'CV template',
    intro: [
      'In the UK, Ireland, India and much of Europe, “CV” is simply the word for the document Americans call a résumé. A job CV is usually one or two pages, reverse-chronological, with no photo or date of birth in the UK.',
      'An academic CV is different: longer, and built around publications, research and teaching.',
    ],
    sections: [
      {
        heading: 'Is a CV the same as a resume?',
        paragraphs: ['It depends on where you are applying.'],
        list: [
          'UK and Ireland: CV is the everyday word for a job application document. Résumé is rarely used.',
          'India: CV, résumé and biodata are often used interchangeably; follow the word the employer uses.',
          'Much of continental Europe: CV is the usual term, and local conventions vary, for example on whether a photo is expected.',
          'US and Canada: résumé means the one-or-two-page job document; CV means the long academic record.',
          'Australia and New Zealand: both words are used for job applications, often meaning the same thing.',
        ],
      },
      {
        heading: 'What is the difference between an academic CV and a job CV?',
        paragraphs: [
          'A job CV is a selection: the experience that makes the case for one role, in one or two pages. An academic CV is a record: it lists everything relevant to a research or teaching career and grows with it, so several pages is normal.',
          'An academic CV usually adds publications, conference talks, grants and funding, teaching, supervision, and academic service such as reviewing. Lead with education and research, and list publications in a consistent citation style.',
        ],
      },
      {
        heading: 'What is the standard UK CV format?',
        paragraphs: ['A UK CV is reverse-chronological and usually runs to two A4 pages at most. The usual sections:'],
        list: [
          'Name and contact details: phone, email, town or city, and a LinkedIn or portfolio link',
          'Personal statement: a short paragraph on who you are and what you are looking for',
          'Work experience, newest first, with achievements rather than duties',
          'Education and qualifications, including degree classification, and A-levels or equivalent when you are early in your career',
          'Skills, with any professional registration or membership',
          'Optional: volunteering, interests that say something about you, languages',
        ],
      },
      {
        heading: 'What should you leave off a UK CV?',
        paragraphs: [
          'UK employers generally do not expect personal details that are unrelated to the job, and leaving them out avoids inviting bias:',
        ],
        list: [
          'A photo, unless the role is one where appearance is part of the job, such as acting',
          'Date of birth or age',
          'Marital status, nationality and religion; state your right to work in the UK if it is relevant',
          'Your full postal address: a town or city is enough',
          '“References available on request”: it is assumed',
        ],
      },
      {
        heading: 'How long should a CV be?',
        paragraphs: [
          'Two pages is normal and acceptable for a UK job CV; one page is fine for a graduate or school leaver. Use the space for relevant work, not padding. An academic CV runs as long as its record requires.',
        ],
      },
      {
        heading: 'How does a CV differ in India and Europe?',
        paragraphs: [
          'In India, older CV formats often include date of birth, a photo and a signed declaration. Many employers no longer need them; include them only when the employer or application form asks. Grades or CGPA are commonly expected for recent graduates.',
          'In some continental European countries a photo and date of birth are still customary. Follow the local norm and the advert. Where you are unsure, a clean CV without them is the safer choice.',
        ],
      },
      {
        heading: 'Which CV templates and examples can you start from?',
        paragraphs: [
          'Any design in CVAurum works as a CV. Set the page size to A4 in Design, hide the photo with one switch, and rename a section heading, such as Summary to Personal Statement, if you prefer the UK wording. The ATS check flags a photo and a date of birth if you leave them in.',
          'Designs that suit a UK or academic CV: [Cambridge](/templates/cambridge), [Academia](/templates/academic), which has room for publications, [Scholar](/templates/ivy) and [Oxford](/templates/classic).',
          'UK examples in the library: [Graduate Structural Engineer](/examples/graduate-structural-engineer), [Graphic Designer](/examples/graphic-designer), [Physiotherapist](/examples/physiotherapist), [Secondary School Physics Teacher](/examples/secondary-physics-teacher), [Office Manager](/examples/office-manager), [Management Consultant](/examples/management-consultant) and [Engineering Apprentice](/examples/school-leaver-apprenticeship). Academic CVs: [University Lecturer](/examples/university-lecturer), [Postdoctoral Research Associate](/examples/postdoctoral-researcher) and [PhD Applicant in Neuroscience](/examples/phd-applicant-neuroscience).',
        ],
      },
    ],
    faq: [
      {
        q: 'Should I put a photo on my CV in the UK?',
        a: 'No, not for most jobs. UK employers do not expect one, and leaving it out avoids inviting bias.',
      },
      {
        q: 'Can a CV be two pages?',
        a: 'Yes. Two A4 pages is normal for a UK job CV. Graduates and school leavers often need only one.',
      },
      {
        q: 'Is a CV the same as a resume?',
        a: 'In the UK, Ireland and India the words mean the same job document. In the US, a CV is the longer academic record.',
      },
      {
        q: 'What is the difference between a CV and an academic CV?',
        a: 'A job CV is a one-to-two-page selection for one role. An academic CV records publications, grants and teaching, and can run to several pages.',
      },
    ],
    action: { label: 'Browse templates', href: '/templates' },
  },
  {
    slug: 'resume-template-word',
    title: 'Resume Template for Word: Free, Editable .docx · CVAurum',
    heading: 'A free resume template for Word: every design downloads as an editable .docx',
    description: `Free resume templates for Word: ${TEMPLATE_COUNT} designs, each downloadable as an editable, ATS-friendly .docx or a vector PDF. No sign-up, no watermark.`,
    short: 'Resume template for Word',
    intro: [
      `Every one of CVAurum’s ${TEMPLATE_COUNT} designs downloads as an editable Word (.docx) file and as a vector PDF, free and with no account. Build the résumé in the browser, then press Download Word.`,
      'The Word file keeps the design’s fonts, colours, heading style, margins and page size, set out in a single column so an applicant-tracking system reads it in order.',
    ],
    sections: [
      {
        heading: 'How do you get a resume template in Word format?',
        paragraphs: [],
        list: [
          'Pick a design from the [templates](/templates), or start from one of the [examples](/examples)',
          'Fill it in with your own content in the editor; it saves in your browser as you type',
          'Choose Download Word, name the file, and the .docx is saved to your device',
          'Open it in Word, or in any program that reads .docx, and edit it like any other document',
        ],
      },
      {
        heading: 'What does the Word file keep from the design?',
        paragraphs: [
          'The .docx is built from the same résumé as the page you see, and follows its settings:',
        ],
        list: [
          'Your fonts, text size, line spacing and page margins, scaled to the same fit as the PDF',
          'The accent colour on your name, headline, section headings and links, and each heading’s rule',
          'Page size: A4 or US Letter, as you set it',
          'Your photo, if you show one, and a header art band if the design has one',
          'Skill and language ratings, written as text meters',
          'Links as real, clickable hyperlinks',
        ],
      },
      {
        heading: 'Why is the Word file a single column?',
        paragraphs: [
          'Two-column designs keep their columns in the PDF, but the Word file always sets the content in one column, with sidebar sections following the main ones. Word builds side-by-side columns out of tables, and a parser may read a table cell by cell in the wrong order, or skip it. One column keeps your name first and every section in the order a reader expects.',
          'Two other things Word cannot do exactly: a photo is cropped square or rounded rather than circular, and chips such as skill tags appear as inline text rather than rounded pills. A page background colour only prints if Word’s option to print background colours is on.',
        ],
      },
      {
        heading: 'Should you send a Word or PDF resume?',
        paragraphs: [
          'Send the PDF by default. It keeps the full design, including two columns, and looks identical on every screen and printer. CVAurum’s PDF carries real, selectable text whose reading order matches the ATS view.',
          'Send the Word file when the job advert, application form or recruiter asks for .docx, or when an agency will edit or reformat your résumé before passing it on. Some older applicant-tracking systems also handle .docx better than PDF; if an application portal asks for Word, give it Word.',
        ],
      },
      {
        heading: 'How do you edit the resume in Word or Google Docs?',
        paragraphs: [
          'In Word, open the .docx and edit the text directly; headings, bullets and dates are ordinary paragraphs with their own formatting. If a font looks different, that font is not installed on the computer you are using, and Word has substituted another; install it or choose a similar one.',
          'In Google Docs, upload the .docx to Google Drive and open it with Google Docs. The layout carries over in most cases; check line breaks and page breaks before you download it again.',
          'For larger changes, it is often quicker to edit in CVAurum and download a fresh file. If you have edited the Word file and want to bring it back, save it as a PDF in Word and import that PDF; CVAurum imports PDF and JSON Resume files, not .docx.',
        ],
      },
      {
        heading: 'Is a Word resume ATS-friendly?',
        paragraphs: [
          'It can be, if the text is real and in order. The Word file from CVAurum sets your content as ordinary paragraphs in a single column, under standard section headings, with real hyperlinks, no text boxes and no text locked inside images. Before you send either file, run the ATS check: it scores the résumé, shows the plain text a parser reads, and matches it against a job description you paste in. To check any PDF, use the [ATS resume checker](/ats-resume-checker).',
        ],
      },
      {
        heading: 'Which designs work well in Word?',
        paragraphs: [
          'Every design exports, but single-column designs look most like their PDF in Word because nothing has to move: [Harvard](/templates/harvard), [Oxford](/templates/classic), [Garamond](/templates/garamond), [Aria](/templates/modern), [Sterling](/templates/executive) and [Quartz](/templates/compact). A two-column design such as [Duet](/templates/duet) still exports cleanly, with its sidebar sections following the main column.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is the Word resume download free?',
        a: 'Yes. Word, PDF and JSON Resume downloads are free and unlimited, with no account and no watermark.',
      },
      {
        q: 'Can I edit the downloaded resume in Word?',
        a: 'Yes. The .docx is an ordinary editable Word document: change the text, fonts and formatting as you would any other.',
      },
      {
        q: 'Does the Word file look exactly like the template?',
        a: 'It keeps the fonts, colours, headings, margins and page size, but always in a single column. The PDF keeps the full layout.',
      },
      {
        q: 'Can I open the file in Google Docs?',
        a: 'Yes. Upload the .docx to Google Drive and open it with Google Docs.',
      },
      {
        q: 'Can I import a Word resume into CVAurum?',
        a: 'Not directly. Save it as a PDF from Word and import the PDF; the text is read on your device.',
      },
    ],
    action: { label: 'Browse templates', href: '/templates' },
  },
  {
    slug: 'resume-summary-examples',
    title: `Resume Summary Examples for ${SAMPLE_COUNT} Jobs · CVAurum`,
    heading: `Resume summary examples for ${SAMPLE_COUNT} jobs`,
    description: `${SAMPLE_COUNT} resume summary examples by job and field, each from a complete example résumé you can open and edit for free. No sign-up.`,
    short: 'Resume summary examples',
    intro: [
      'A resume summary is two or three lines under your name that say what you do, what you are good at and one result that proves it. Below are the summaries from every example résumé in the library, grouped by field, each linked to the full résumé it opens.',
      'Read them for their shape rather than their words: a role and a specialty first, then a figure, then where you are heading. The people and employers are invented; the structure is the part worth copying.',
    ],
    sections: [
      {
        heading: 'How to write a resume summary',
        paragraphs: [
          'Start with the job you do and the level you do it at, add the area you are known for, and end on one measured result. Three lines is plenty; a summary that runs to a paragraph is read as one.',
          'Skip the adjectives a reader cannot check ("hard-working", "passionate") and the objective statement about what you want. The summary is the place to say what an employer gets.',
        ],
      },
    ],
    faq: [
      {
        q: 'How long should a resume summary be?',
        a: 'Two or three lines, around 40 to 60 words. Long enough to name your role, your strength and one result; short enough to be read in full.',
      },
      {
        q: 'Do I need a summary if I have little experience?',
        a: 'A short one helps a fresher or career changer: say what you studied or did, the skill you bring and the role you want. See the [resume for freshers](/resume-for-freshers) guide.',
      },
      {
        q: 'Is a summary the same as an objective?',
        a: 'No. An objective says what you want; a summary says what you offer. Most employers now expect a summary.',
      },
    ],
    action: { label: 'Browse resume examples', href: '/examples' },
    generated: 'summaries',
  },
  {
    slug: 'resume-skills',
    title: 'Skills for a Resume: Examples by Job and Field · CVAurum',
    heading: 'Skills to put on a resume, by job',
    description: `The skills listed on ${SAMPLE_COUNT} example résumés, by job and field, grouped the way an employer scans them. Open any example and edit it for free.`,
    short: 'Resume skills by job',
    intro: [
      'The right skills for a resume are the ones the job description names and your bullets prove. Below are the skill sections of every example résumé in the library, by field and job, each grouped into named sets rather than one long list.',
      'Use them to see what a section looks like for a role close to yours, then keep only what you can back up with a line of your own experience.',
    ],
    sections: [
      {
        heading: 'How to choose skills for a resume',
        paragraphs: [
          'Group skills into a few named sets (languages, tools, methods, certifications) so a reader finds the one they came for. Lead with the ones the job description asks for, using its exact wording, because both a recruiter and an applicant-tracking system look for those terms.',
          'Every skill you list should appear in a bullet too, where you used it and what came of it. A skill named only in the list reads as a claim; one shown in a result reads as experience.',
        ],
      },
    ],
    faq: [
      {
        q: 'How many skills should a resume list?',
        a: 'Usually 10 to 20, in three to five named groups. More than that turns the section into a keyword list and hides the ones that matter.',
      },
      {
        q: 'Should soft skills go on a resume?',
        a: 'Show them in bullets rather than list them: "led a team of six" says more than "leadership". Keep the skills section for skills a reader can check.',
      },
    ],
    action: { label: 'Check a resume against a job', href: '/ats-resume-checker' },
    generated: 'skills',
  },
  {
    slug: 'resume-action-verbs',
    title: 'Action Verbs for a Resume, With Example Bullets · CVAurum',
    heading: 'Action verbs for a resume, with a real bullet for each',
    description: `The verbs that open the bullets of ${SAMPLE_COUNT} example résumés, counted and grouped, each shown in a full bullet. Free examples you can edit.`,
    short: 'Resume action verbs',
    intro: [
      'An action verb opens a bullet with what you did: built, cut, led, won. Below are the verbs that open the work-history bullets of every example résumé in the library, counted, grouped by the kind of claim they make, and each shown in a whole bullet so you can see the result that follows it.',
      'A verb only works when the rest of the bullet says what changed. Every example below ends on a figure, a scale or an outcome.',
    ],
    sections: [
      {
        heading: 'How to use action verbs on a resume',
        paragraphs: [
          'Open each bullet with the most specific verb that is true: "cut" or "rebuilt" says more than "worked on" or "responsible for". Use the past tense for past roles and the present for the job you hold now.',
          'Vary the verbs down a page, but never at the cost of accuracy: a reader trusts "ran" over "spearheaded" when that is what happened.',
        ],
      },
    ],
    faq: [
      {
        q: 'What are the best action verbs for a resume?',
        a: 'The specific ones that match what happened: cut, built, led, won, reduced, launched. The counts below show which verbs carry the most bullets across the library.',
      },
      {
        q: 'Should every bullet start with a verb?',
        a: 'Almost every one. A bullet that opens with a verb and ends with a result is the easiest line on a resume to read quickly.',
      },
    ],
    action: { label: 'Start a résumé', href: '/app' },
    generated: 'verbs',
  },
]

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
