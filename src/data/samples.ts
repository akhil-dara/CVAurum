import type { ResumeContent } from '@/types/document'
import { SAMPLE_CONTENT } from './sample'

/**
 * A small gallery of believable, persona-specific sample resumes shown in the
 * "Start with an example" picker, so a first-time user (not just an engineer)
 * sees themselves and gets ideas. Each persona pairs its content with a template
 * that flatters it. The original engineer sample stays the canonical one used
 * for the template gallery's live previews.
 */
export interface SamplePersona {
  id: string
  name: string
  role: string
  blurb: string
  /** template id this persona looks best in */
  template: string
  content: ResumeContent
}

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

const MARKETING: ResumeContent = persona({
  basics: {
    name: 'Jordan Rivera',
    label: 'Senior Marketing Manager',
    image: '',
    email: 'jordan.rivera@email.com',
    phone: '(555) 712-3380',
    url: 'https://jordanrivera.co',
    summary:
      '<p>Growth-focused marketing manager with <strong>7 years</strong> driving demand across B2B SaaS. I turn positioning into pipeline — owning brand, content, and paid programs that compound.</p>',
    location: { city: 'New York', region: 'NY', countryCode: 'US' },
    profiles: [{ network: 'LinkedIn', username: 'jordanrivera', url: 'https://linkedin.com/in/jordanrivera' }],
  },
  work: [
    {
      id: 'w1', name: 'Brightwave', position: 'Senior Marketing Manager', location: 'New York, NY', url: '',
      startDate: '2021-04', endDate: '', summary: '',
      highlights: [
        'Grew marketing-sourced pipeline <strong>3.1x</strong> in 18 months to $22M ARR influence.',
        'Launched a category-defining content engine that lifted organic traffic <strong>140%</strong> and cut CAC 28%.',
        'Built and led a team of 5 across content, lifecycle, and demand gen.',
      ],
    },
    {
      id: 'w2', name: 'Loop Analytics', position: 'Growth Marketing Lead', location: 'Remote', url: '',
      startDate: '2018-07', endDate: '2021-03', summary: '',
      highlights: [
        'Scaled paid acquisition from $0 to $1.2M/yr at a blended 4.2x ROAS.',
        'Ran 200+ A/B tests on lifecycle email, raising activation 19%.',
      ],
    },
  ],
  education: [
    { id: 'e1', institution: 'New York University', area: 'Marketing & Communications', studyType: 'B.B.A.', location: 'New York, NY', startDate: '2011-09', endDate: '2015-05', score: '', url: '', summary: '', courses: [] },
  ],
  skills: [
    { id: 's1', name: 'Growth', level: '', keywords: ['Demand Gen', 'SEO', 'Paid Social', 'Lifecycle', 'CRO'] },
    { id: 's2', name: 'Tools', level: '', keywords: ['HubSpot', 'GA4', 'Webflow', 'Figma', 'Looker'] },
    { id: 's3', name: 'Strategy', level: '', keywords: ['Positioning', 'GTM', 'Brand', 'Analytics'] },
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Portuguese', fluency: 'Conversational', rating: 3 },
  ],
})

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
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Mandarin', fluency: 'Native', rating: 5 },
  ],
})

export const SAMPLES: SamplePersona[] = [
  { id: 'engineer', name: 'Alex Morgan', role: 'Software Engineer', blurb: 'Experienced IC with impact metrics, projects, and certifications.', template: 'aurum', content: SAMPLE_CONTENT },
  { id: 'marketing', name: 'Jordan Rivera', role: 'Marketing Manager', blurb: 'Growth & brand leader — pipeline, content, and team wins.', template: 'aurum-editorial', content: MARKETING },
  { id: 'graduate', name: 'Sam Chen', role: 'Recent Graduate', blurb: 'New grad with internships, projects, and coursework up top.', template: 'harvard', content: GRADUATE },
]
