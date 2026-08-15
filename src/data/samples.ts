import type { ResumeContent } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { SAMPLE_CONTENT } from './sample'

/**
 * A small gallery of believable, persona-specific sample resumes shown in the
 * "Start with an example" picker, so a first-time user (not just an engineer)
 * sees themselves and gets ideas. Each persona pairs its content with a template
 * that flatters it, and each one deliberately SHOWS OFF a different slice of the
 * customization system (logos, initial badges, timeline layout, meters, GPA
 * pills…) so the samples double as a live feature tour.
 * The original engineer sample stays the canonical one used for the template
 * gallery's live previews.
 */
export interface SamplePersona {
  id: string
  name: string
  role: string
  blurb: string
  /** template id this persona looks best in */
  template: string
  content: ResumeContent
  /** persona-specific metadata polish (per-section styles, badges…) applied
   *  AFTER the template's defaults — this is what demos the customization. */
  tweaks?: (m: Metadata) => void
}

/** Tiny self-contained SVG mark (data URI) — demos per-entry logos with zero
 *  external requests and a few hundred bytes. Deliberately fictional brands. */
const mark = (letters: string, bg: string, fg = '#ffffff') =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="43" font-family="Arial, Helvetica, sans-serif" font-size="${letters.length > 1 ? 24 : 32}" font-weight="700" fill="${fg}" text-anchor="middle">${letters}</text></svg>`,
  )

/** Fill the required-but-unused list fields so every persona is schema-complete. */
function persona(over: Partial<ResumeContent> & { basics: ResumeContent['basics'] }): ResumeContent {
  return {
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
    custom: [],
    ...over,
  }
}

/* ------------------------------------------------ engineer (canonical + logos) */
// Clone the canonical gallery content, then dress it up with entry logos and a
// role-summary line — the picker's engineer shows the logo feature; the gallery
// keeps rendering the untouched original.
const ENGINEER: ResumeContent = (() => {
  const c: ResumeContent = JSON.parse(JSON.stringify(SAMPLE_CONTENT))
  c.work[0].logo = mark('V', '#4f46e5')
  c.work[0].summary = 'Platform group of 14 — own billing, payments, and checkout infrastructure.'
  c.work[1].logo = mark('N', '#0f766e')
  c.education[0].logo = mark('UC', '#1e3a8a')
  c.interests = [
    { id: 'i1', name: 'Open source', keywords: [] },
    { id: 'i2', name: 'Trail running', keywords: [] },
  ]
  return c
})()

/* ----------------------------------------------------------------- marketing */
const MARKETING: ResumeContent = persona({
  basics: {
    name: 'Jordan Rivera',
    label: 'Senior Marketing Manager',
    image: '',
    email: 'jordan.rivera@email.com',
    phone: '(555) 712-3380',
    url: 'https://jordanrivera.co',
    summary:
      '<p>Growth-focused marketing manager with <strong>7 years</strong> driving demand across B2B SaaS. I turn positioning into pipeline — owning brand, content, and paid programs that compound quarter over quarter.</p>',
    location: { city: 'New York', region: 'NY', countryCode: 'US' },
    profiles: [{ network: 'LinkedIn', username: 'jordanrivera', url: 'https://linkedin.com/in/jordanrivera' }],
  },
  work: [
    {
      id: 'w1', name: 'Brightwave', position: 'Senior Marketing Manager', location: 'New York, NY', url: '',
      startDate: '2021-04', endDate: '', logo: mark('B', '#b45309'),
      summary: 'Own the full marketing engine for a $30M-ARR B2B SaaS — team of 5.',
      highlights: [
        'Grew marketing-sourced pipeline <strong>3.1×</strong> in 18 months to $22M ARR influence.',
        'Launched a category-defining content engine that lifted organic traffic <strong>140%</strong> and cut CAC 28%.',
        'Rebuilt attribution end-to-end; reallocated $400k of spend to channels with 2× payback.',
      ],
    },
    {
      id: 'w2', name: 'Loop Analytics', position: 'Growth Marketing Lead', location: 'Remote', url: '',
      startDate: '2018-07', endDate: '2021-03', summary: '', logo: mark('L', '#7c3aed'),
      highlights: [
        'Scaled paid acquisition from $0 to <strong>$1.2M/yr</strong> at a blended 4.2× ROAS.',
        'Ran 200+ A/B tests on lifecycle email, raising activation <strong>19%</strong>.',
      ],
    },
    {
      id: 'w3', name: 'Copperline Agency', position: 'Marketing Associate', location: 'New York, NY', url: '',
      startDate: '2016-06', endDate: '2018-06', summary: '', logo: mark('C', '#be123c'),
      highlights: ['Managed social and email calendars for 8 retained clients; grew combined audience 65%.'],
    },
  ],
  education: [
    { id: 'e1', institution: 'New York University', area: 'Marketing & Communications', studyType: 'B.B.A.', location: 'New York, NY', startDate: '2011-09', endDate: '2015-05', score: '', url: '', summary: '', courses: [], logo: mark('NYU', '#581c87') },
  ],
  skills: [
    { id: 's1', name: 'Growth', level: '', keywords: ['Demand Gen', 'SEO', 'Paid Social', 'Lifecycle', 'CRO'] },
    { id: 's2', name: 'Tools', level: '', keywords: ['HubSpot', 'GA4', 'Webflow', 'Figma', 'Looker'] },
    { id: 's3', name: 'Strategy', level: '', keywords: ['Positioning', 'GTM', 'Brand', 'Analytics'] },
  ],
  certificates: [
    { id: 'c1', name: 'Google Analytics Certification', date: '2023', issuer: 'Google', url: '' },
  ],
  awards: [
    { id: 'a1', title: 'Marketer of the Year', date: '2023', awarder: 'Brightwave', summary: 'Company-wide award for the pipeline turnaround.' },
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Portuguese', fluency: 'Conversational', rating: 3 },
  ],
})

/* ------------------------------------------------------------------ graduate */
const GRADUATE: ResumeContent = persona({
  basics: {
    name: 'Sam Chen',
    label: 'Computer Science Graduate',
    image: '',
    email: 'sam.chen@email.com',
    phone: '(555) 449-2210',
    url: 'https://samchen.dev',
    summary:
      '<p>Recent CS graduate (3.9 GPA) seeking a software engineering role. Strong in data structures and full-stack web; two internships shipping production features used by thousands.</p>',
    location: { city: 'Seattle', region: 'WA', countryCode: 'US' },
    profiles: [
      { network: 'GitHub', username: 'samchen', url: 'https://github.com/samchen' },
      { network: 'LinkedIn', username: 'samchen', url: 'https://linkedin.com/in/samchen' },
    ],
  },
  education: [
    {
      id: 'e1', institution: 'University of Washington', area: 'Computer Science', studyType: 'B.S.', location: 'Seattle, WA',
      startDate: '2021-09', endDate: '2025-06', score: '3.9 GPA', url: '', summary: '',
      courses: ['Data Structures', 'Operating Systems', 'Databases', 'Machine Learning', 'Web Development'],
    },
  ],
  work: [
    {
      id: 'w1', name: 'Cloudbase', position: 'Software Engineering Intern', location: 'Seattle, WA', url: '',
      startDate: '2024-06', endDate: '2024-09', summary: '',
      highlights: [
        'Built a React dashboard widget used by <strong>12k</strong> daily users; shipped to production in 8 weeks.',
        'Cut an internal report query from 9s to <strong>1.2s</strong> by adding indexes and pagination.',
      ],
    },
    {
      id: 'w2', name: 'UW Research Lab', position: 'Undergraduate Research Assistant', location: 'Seattle, WA', url: '',
      startDate: '2023-09', endDate: '2024-05', summary: '',
      highlights: ['Implemented data-pipeline tooling in Python for a 2M-row NLP dataset.'],
    },
  ],
  skills: [
    { id: 's1', name: 'Languages', level: '', keywords: ['Python', 'Java', 'JavaScript', 'C++', 'SQL'] },
    { id: 's2', name: 'Web', level: '', keywords: ['React', 'Node.js', 'Flask', 'PostgreSQL'] },
    { id: 's3', name: 'Tools', level: '', keywords: ['Git', 'Docker', 'AWS', 'Linux'] },
  ],
  projects: [
    {
      id: 'p1', name: 'StudySync', description: 'A collaborative flashcard app for study groups.', url: 'https://github.com/samchen/studysync',
      startDate: '2024', endDate: '', highlights: ['600+ users in the first term.', 'Real-time sync with WebSockets.'], keywords: ['React', 'Node.js', 'WebSockets'],
    },
    {
      id: 'p2', name: 'TrailCast', description: 'Offline-first hiking weather PWA.', url: 'https://github.com/samchen/trailcast',
      startDate: '2023', endDate: '', highlights: ['Won Best Student Hack (UW DubHacks) among 120 teams.'], keywords: ['TypeScript', 'Service Workers'],
    },
  ],
  certificates: [
    { id: 'c1', name: 'AWS Certified Cloud Practitioner', date: '2024', issuer: 'Amazon Web Services', url: '' },
  ],
  awards: [
    { id: 'a1', title: "Dean's List — 6 consecutive quarters", date: '2024', awarder: 'University of Washington', summary: '' },
  ],
  volunteer: [
    {
      id: 'v1', organization: 'Code for Community', position: 'Volunteer Web Developer', url: '',
      startDate: '2023-01', endDate: '', summary: '',
      highlights: ['Rebuilt a nonprofit food-bank site, doubling online volunteer signups.'],
    },
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Mandarin', fluency: 'Native', rating: 5 },
  ],
})

/* ------------------------------------------------------------------ designer */
const DESIGNER: ResumeContent = persona({
  basics: {
    name: 'Maya Patel',
    label: 'Senior Product Designer',
    image: '',
    email: 'maya.patel@email.com',
    phone: '(555) 806-4415',
    url: 'https://mayapatel.design',
    summary:
      '<p>Product designer with <strong>6 years</strong> taking B2B and health products from fuzzy problem to shipped, measured outcome. I run discovery, design systems, and the hard conversations in between.</p>',
    location: { city: 'Austin', region: 'TX', countryCode: 'US' },
    profiles: [
      { network: 'Portfolio', username: 'mayapatel.design', url: 'https://mayapatel.design' },
      { network: 'LinkedIn', username: 'mayapatel', url: 'https://linkedin.com/in/mayapatel' },
    ],
  },
  work: [
    {
      id: 'w1', name: 'Nimbus Health', position: 'Senior Product Designer', location: 'Austin, TX', url: '',
      startDate: '2022-02', endDate: '', logo: mark('N', '#0e7490'),
      summary: 'Design lead for the patient-scheduling suite (3 squads).',
      highlights: [
        'Redesigned intake flows, lifting appointment completion <strong>+24%</strong> across 400 clinics.',
        'Built the <strong>Foliage design system</strong> (120 components); cut design-to-dev handoff time in half.',
        'Ran 40+ moderated studies; drove the roadmap pivot that reduced no-shows 18%.',
      ],
    },
    {
      id: 'w2', name: 'Fernwood Studio', position: 'Product Designer', location: 'Remote', url: '',
      startDate: '2019-05', endDate: '2022-01', summary: '', logo: mark('F', '#365314'),
      highlights: [
        'Shipped 14 client products end-to-end — fintech dashboards to consumer mobile.',
        'Introduced usability benchmarking that became the studio-wide QA gate.',
      ],
    },
  ],
  education: [
    { id: 'e1', institution: 'University of Texas at Austin', area: 'Design', studyType: 'B.F.A.', location: 'Austin, TX', startDate: '2013-09', endDate: '2017-05', score: '', url: '', summary: '', courses: [], logo: mark('UT', '#9a3412') },
  ],
  skills: [
    { id: 's1', name: 'Product Design', level: '', rating: 5, keywords: ['Discovery', 'Wireframing', 'Prototyping', 'Design Systems'] },
    { id: 's2', name: 'Research', level: '', rating: 4, keywords: ['Moderated Studies', 'Usability Benchmarks', 'Surveys'] },
    { id: 's3', name: 'Tools', level: '', rating: 5, keywords: ['Figma', 'FigJam', 'Framer', 'Webflow'] },
    { id: 's4', name: 'Front-of-front-end', level: '', rating: 3, keywords: ['HTML/CSS', 'Design Tokens', 'Motion'] },
  ],
  projects: [
    {
      id: 'p1', name: 'Foliage — open design system', description: 'Tokens-first Figma + code library.', url: 'https://mayapatel.design/foliage',
      startDate: '2023', endDate: '', highlights: ['Adopted by 3 external teams; 2k+ Figma community duplicates.'], keywords: ['Design Tokens', 'Figma'],
    },
  ],
  awards: [
    { id: 'a1', title: 'Best in Show — Health UX', date: '2024', awarder: 'Austin Design Week', summary: '' },
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Hindi', fluency: 'Professional', rating: 4 },
    { id: 'l3', language: 'Spanish', fluency: 'Conversational', rating: 3 },
  ],
  interests: [
    { id: 'i1', name: 'Letterpress printing', keywords: [] },
    { id: 'i2', name: 'Community garden design', keywords: [] },
  ],
})

/** Helper for tweak recipes. */
const sec = (m: Metadata, key: string, over: Record<string, unknown>) => {
  if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
  m.layout.sectionSettings[key] = { ...(m.layout.sectionSettings[key] ?? {}), ...over }
}

export const SAMPLES: SamplePersona[] = [
  {
    id: 'engineer',
    name: 'Alex Morgan',
    role: 'Software Engineer',
    blurb: 'Experienced IC with impact metrics — shows off company logos and a GPA pill.',
    template: 'aurum',
    content: ENGINEER,
    tweaks: (m) => {
      sec(m, 'education', { scoreStyle: 'pill' })
    },
  },
  {
    id: 'marketing',
    name: 'Jordan Rivera',
    role: 'Marketing Manager',
    blurb: 'Growth leader — timeline experience layout, skill pills, and language meters.',
    template: 'aurum-editorial',
    content: MARKETING,
    tweaks: (m) => {
      sec(m, 'work', { entryLayout: 'timeline' })
      sec(m, 'skills', { skillsStyle: 'chips' })
      sec(m, 'languages', { meterStyle: 'bars' })
    },
  },
  {
    id: 'graduate',
    name: 'Sam Chen',
    role: 'Recent Graduate',
    blurb: 'New grad — initial badges per entry, coursework up top, dash bullets on projects.',
    template: 'harvard',
    content: GRADUATE,
    tweaks: (m) => {
      sec(m, 'work', { showBadges: true })
      sec(m, 'education', { scoreStyle: 'pill' })
      sec(m, 'projects', { bulletStyle: 'dash' })
    },
  },
  {
    id: 'designer',
    name: 'Maya Patel',
    role: 'Product Designer',
    blurb: 'Two-column with a monogram sidebar — dot-meter skills, logos, and tag chips.',
    template: 'pinnacle',
    content: DESIGNER,
    tweaks: (m) => {
      sec(m, 'skills', { meterStyle: 'dots' })
      sec(m, 'projects', { showKeywords: true })
    },
  },
]
