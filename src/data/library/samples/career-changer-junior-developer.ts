import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Going back to study at 33. The conversion MSc leads, the support-desk job
 * beside it proves the switch is already working, and the six retail years do
 * not apologise: they are written for what a development team would want from
 * them. British spelling throughout.
 */
export const sample: LibrarySample = {
  slug: 'career-changer-junior-developer',
  role: 'Junior Software Developer',
  category: 'student',
  seniority: 'student',
  region: 'uk',
  template: 'compact',
  blurb:
    'Retail manager to developer: a part-time conversion MSc, a support-desk job, and eleven retail years rewritten for a dev team.',
  keywords: [
    'career change resume',
    'career changer CV',
    'conversion MSc computer science',
    'junior developer CV UK',
    'retail to tech',
    'part-time masters CV',
  ],
  content: content({
    basics: {
      name: 'Gemma Hollis',
      label: 'MSc Computer Science (part-time)',
      image: '',
      email: 'gemma.hollis@example.com',
      phone: '+44 7700 900512',
      url: 'https://gemmahollis.example.com',
      summary:
        'Former store manager two-thirds of the way through a part-time conversion MSc in computer science, working a support-desk role alongside it. Traced a stock-sync fault that had generated complaints for eight months and shipped the fix; before that, ran a 22-person shop through a £3.1m trading year.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [
        { network: 'GitHub', username: 'gemhollis', url: 'https://github.com/gemhollis' },
        { network: 'LinkedIn', username: 'gemmahollis', url: 'https://linkedin.com/in/gemmahollis' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'Manchester Metropolitan University',
        area: 'Computer Science (conversion)',
        studyType: 'MSc',
        location: 'Manchester',
        startDate: '2025-09',
        endDate: '2027-09',
        score: 'Distinction average, 76% across four completed modules',
        url: '',
        summary: 'Studied part-time alongside full employment.',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Object-Oriented Programming',
          'Databases and Data Modelling',
          'Software Engineering Practice',
          'Algorithms and Data Structures',
        ],
      },
      {
        id: 'e2',
        institution: 'University of Leeds',
        area: 'English Literature',
        studyType: 'BA (Hons)',
        location: 'Leeds',
        startDate: '2011-09',
        endDate: '2014-07',
        score: '2:1',
        url: '',
        summary: '',
        status: 'completed',
        level: 'degree',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Kesgrave Systems',
        position: 'Support Engineer (part-time)',
        location: 'Manchester',
        url: '',
        startDate: '2025-10',
        endDate: '',
        summary: 'Second-line support for a warehouse management product used across 70 sites.',
        highlights: [
          'Handles 40 to 60 tickets a week and closes 82% without escalating, against a desk average of 64%.',
          'Traced a recurring stock-sync failure to a time-zone assumption in a nightly job and shipped the fix, ending a complaint that had run for eight months.',
          'Wrote 31 diagnostic SQL queries into a saved library the whole desk now uses, cutting the average data-fix ticket from 45 minutes to 12.',
        ],
      },
      {
        id: 'w2',
        name: 'Halliwell Stores',
        position: 'Store Manager',
        location: 'Manchester',
        url: '',
        startDate: '2014-09',
        endDate: '2025-09',
        summary: 'Joined as a sales assistant straight from the BA; ran the branch from 2019.',
        highlights: [
          'Ran a 22-person branch through a £3.1m trading year, lifting like-for-like sales 9% in a flat regional market.',
          'Replaced a paper rota with a shared scheduling model, cutting unplanned overtime by £26,000 a year at the branch.',
          'Trained six supervisors, four of whom were promoted to run their own branches.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Rota Planner',
        description: 'The scheduling tool written to replace the spreadsheet above.',
        url: 'https://github.com/gemhollis/rota-planner',
        startDate: '2026-01',
        endDate: '',
        highlights: [
          'Solves holiday entitlement, minimum-rest rules and a 40-person branch in under a second; three shops have run their weekly rota on it for 18 months with no data loss.',
        ],
        keywords: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
      },
      {
        id: 'p2',
        name: 'Open-source contributions',
        description: 'Fixes and tests to two Java libraries met at work.',
        url: '',
        startDate: '2026-02',
        endDate: '2026-06',
        highlights: [
          'Fixed a date-parsing fault in an open-source invoicing library and added the 14 tests covering it; merged and released in March 2026.',
        ],
        keywords: ['Java', 'JUnit', 'Git'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Java', 'Python', 'JavaScript', 'SQL', 'HTML and CSS'] },
      {
        id: 's2',
        name: 'Tools',
        level: '',
        keywords: ['Git', 'Spring Boot', 'PostgreSQL', 'Docker', 'Linux', 'JUnit'],
      },
      {
        id: 's3',
        name: 'Working practice',
        level: '',
        keywords: ['Code review', 'Agile stand-ups', 'Incident triage', 'Team leadership', 'Written handovers'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'AWS Certified Cloud Practitioner', date: '2026', issuer: 'Amazon Web Services', url: '' },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'projects', 'skills', 'certificates']
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      projects: { ...(m.layout.sectionSettings?.projects ?? {}), showKeywords: true },
    }
  },
}

export default sample
