import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Two years in, and the page still has numbers on it: an early-career résumé
 * works when the bullets say what the work changed for the people using it —
 * paint times on cheap phones, tickets that stopped arriving — rather than
 * listing the frameworks the person has touched.
 */
export const sample: LibrarySample = {
  slug: 'frontend-engineer',
  role: 'Frontend Engineer',
  category: 'software',
  seniority: 'entry',
  region: 'india',
  template: 'signal',
  blurb:
    'Two years of React work for low-end Android, shown as paint times and page weight rather than a list of tools.',
  keywords: [
    'frontend engineer',
    'React developer',
    'TypeScript',
    'web performance',
    'junior frontend developer',
    'web accessibility',
  ],
  content: content({
    basics: {
      name: 'Ananya Deshmukh',
      label: 'Frontend Engineer',
      image: '',
      email: 'ananya.deshmukh@example.com',
      phone: '+91 12345 60418',
      url: 'https://ananyadeshmukh.example.com',
      summary:
        'Frontend engineer with two years on React and TypeScript products used by schools across Maharashtra. Took a lesson planner from 4.1s to 1.3s to first paint on the entry-level Android phones most teachers carry, and built the offline drafts that ended a monthly wave of lost-work tickets.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'GitHub', username: 'ananyadsh', url: 'https://github.com/ananyadsh' },
        { network: 'LinkedIn', username: 'ananyadeshmukh', url: 'https://linkedin.com/in/ananyadeshmukh' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Kitewind Learning',
        position: 'Frontend Engineer',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2023-07',
        endDate: '',
        summary: 'Three-person web team behind a lesson planner used by 900 schools.',
        highlights: [
          'Cut first contentful paint from 4.1s to 1.3s on entry-level Android by splitting the bundle per route and loading the editor only when a lesson is opened.',
          'Rewrote the timetable grid as a virtualised list, so a 1,200-row term view scrolls at 60fps where it had frozen for six seconds.',
          'Built the offline draft store on IndexedDB after teachers lost work on patchy 4G; tickets about lost lessons fell from 40 a month to 2.',
          'Added Playwright coverage for the six flows that carry 90% of traffic, catching 14 regressions before release in the first quarter.',
        ],
      },
      {
        id: 'w2',
        name: 'Peartree Labs',
        position: 'Web Development Intern',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2023-01',
        endDate: '2023-06',
        summary: '',
        highlights: [
          'Converted a 40-page marketing site from jQuery to Next.js, taking its Lighthouse performance score from 52 to 94.',
          'Built the accessible dialog, combobox and date-picker components that four internal projects now import.',
          'Automated the screenshot comparison reviewers had run by hand, saving about six hours per release.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'College of Engineering Pune',
        area: 'Computer Engineering',
        studyType: 'B.Tech',
        location: 'Pune, Maharashtra',
        startDate: '2019-08',
        endDate: '2023-06',
        score: '8.4 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Devanagari Input Kit',
        description: 'An open-source React input that transliterates Latin typing into Devanagari as the user types.',
        url: 'https://github.com/ananyadsh/devanagari-input-kit',
        startDate: '2022-11',
        endDate: '',
        highlights: [
          'Ships 4,200 mappings in 9kB gzipped; adopted by a municipal complaint portal that takes 30,000 filings a year.',
        ],
        keywords: ['React', 'TypeScript', 'Internationalisation'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'Sass'] },
      {
        id: 's2',
        name: 'Frameworks',
        level: '',
        keywords: ['React', 'Next.js', 'Redux Toolkit', 'Tailwind CSS', 'Vite'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['WCAG 2.2 accessibility', 'Core Web Vitals', 'Playwright', 'Design handoff', 'Code review'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
