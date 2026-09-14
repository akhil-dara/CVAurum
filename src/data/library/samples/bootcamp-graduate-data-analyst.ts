import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A bootcamp only counts for what came out of it, so the capstone carries a
 * finding and a number rather than a stack list. The five years of practice
 * management underneath are rewritten as the analysis they actually were.
 */
export const sample: LibrarySample = {
  slug: 'bootcamp-graduate-data-analyst',
  role: 'Junior Data Analyst',
  category: 'student',
  seniority: 'entry',
  region: 'us',
  template: 'modern',
  blurb:
    'Six months of analytics training on top of five years running a dental practice, with a contract analyst role already underway.',
  keywords: [
    'bootcamp graduate resume',
    'junior data analyst resume',
    'career change to data',
    'data analytics bootcamp',
    'SQL Python portfolio',
    'entry level analyst',
  ],
  content: content({
    basics: {
      name: 'Devon Asare',
      label: 'Data Analyst',
      image: '',
      email: 'devon.asare@example.com',
      phone: '+1 (555) 0157',
      url: 'https://devonasare.example.com',
      summary:
        'Data analyst six months out of a full-time analytics program, working a part-time contract while looking for a first full-time role. Built the donor-retention dashboard a 9,000-name file had never had, and spent five years before that turning a dental practice front office into numbers people acted on.',
      location: { city: 'Columbus', region: 'OH', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'dasare', url: 'https://github.com/dasare' },
        { network: 'LinkedIn', username: 'devonasare', url: 'https://linkedin.com/in/devonasare' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'Riverlight Data Academy',
        logo: brandmark('Riverlight Data Academy'),
        area: 'Data Analytics, full-time program',
        studyType: 'Certificate',
        location: 'Columbus, OH',
        startDate: '2026-01',
        endDate: '2026-06',
        score: '620 hours, capstone selected for the closing showcase',
        url: '',
        summary: '',
        status: 'completed',
        level: 'certificate',
        courses: [
          'SQL and Relational Modeling',
          'Python for Analysis',
          'Statistical Inference',
          'Dashboard Design',
          'Experiment Design',
        ],
      },
      {
        id: 'e2',
        institution: 'Ohio University',
        logo: brandmark('Ohio University'),
        area: 'Communication',
        studyType: 'B.A.',
        location: 'Athens, OH',
        startDate: '2016-08',
        endDate: '2020-05',
        score: '3.31 GPA',
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
        name: 'Hilliard Trails Conservancy',
        position: 'Data Analyst (part-time contract)',
        location: 'Columbus, OH',
        url: '',
        startDate: '2026-07',
        endDate: '',
        summary: '20 hours a week for a land trust with a 9,000-name donor file.',
        highlights: [
          'Built the retention dashboard the organization had never had, showing that 38% of lapsed donors left after a single gift.',
          'Deduplicated the donor file against 11 years of event records, removing 1,340 duplicate households before a mailing that cost $0.62 apiece.',
          'Automates the monthly board report in Python; the previous version took a volunteer six hours to assemble by hand.',
        ],
      },
      {
        id: 'w2',
        name: 'Glenmoor Family Dentistry',
        position: 'Practice Manager',
        location: 'Columbus, OH',
        url: '',
        startDate: '2020-08',
        endDate: '2025-12',
        summary: 'Scheduling, billing and a six-person front office for a practice seeing 140 patients a week.',
        highlights: [
          'Cut no-show appointments from 14% to 5% by rebuilding the reminder schedule around when patients had actually booked.',
          'Recovered $58,000 in denied insurance claims in two years by tracking denial reasons nobody had recorded before.',
          'Renegotiated the supply contract after charting 18 months of usage, taking $9,400 a year out of consumables.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Columbus bus reliability',
        description: 'Capstone: where the delays on a city transit system actually come from.',
        url: 'https://github.com/dasare/bus-reliability',
        startDate: '2026-04',
        endDate: '2026-06',
        highlights: [
          'Pulled 14 months of published arrival data and found three routes accounting for 41% of all delays over ten minutes.',
          'Published the route-level map and method; the write-up has been read 2,100 times and cited in a neighborhood transit petition.',
        ],
        keywords: ['Python', 'pandas', 'GeoPandas', 'Tableau'],
      },
      {
        id: 'p2',
        name: 'Ohio small-business lending gap',
        description: 'Federal loan disclosures joined to county business counts.',
        url: 'https://github.com/dasare/ohio-lending',
        startDate: '2026-08',
        endDate: '',
        highlights: [
          'Showed that the ten lowest-borrowing counties took one loan per 34 businesses against a state median of one per 11.',
        ],
        keywords: ['SQL', 'PostgreSQL', 'Power BI'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: ['SQL', 'Python (pandas)', 'Excel', 'Cohort analysis', 'A/B testing', 'Regression'],
      },
      {
        id: 's2',
        name: 'Visualization',
        level: '',
        keywords: ['Tableau', 'Power BI', 'Matplotlib', 'Dashboard design'],
      },
      {
        id: 's3',
        name: 'Data handling',
        level: '',
        keywords: ['PostgreSQL', 'Data cleaning', 'Record deduplication', 'ETL scripting', 'Google Sheets'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Microsoft Certified: Power BI Data Analyst Associate',
        date: '2026',
        issuer: 'Microsoft',
        url: '',
      },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'projects', 'skills', 'certificates']
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      projects: { ...(m.layout.sectionSettings?.projects ?? {}), showKeywords: true, tagStyle: 'tags' },
    }
  },
}

export default sample
