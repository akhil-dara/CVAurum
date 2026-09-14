import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Entry level, US, and a career change. The move from clinic operations into
 * reporting happened inside one employer, so the page reads as one story
 * rather than a restart: the operations role is kept, and it is what makes
 * the analyst credible to the people who read the dashboards.
 */
export const sample: LibrarySample = {
  slug: 'business-intelligence-analyst',
  role: 'Business Intelligence Analyst',
  category: 'data',
  seniority: 'entry',
  region: 'us',
  template: 'marker',
  blurb: 'A career change from clinic operations into BI, told as one story inside one employer rather than a restart.',
  keywords: [
    'business intelligence analyst',
    'BI analyst',
    'Power BI',
    'career change into data',
    'healthcare analytics',
    'reporting analyst',
  ],
  content: content({
    basics: {
      name: 'Delaney Foster',
      label: 'Business Intelligence Analyst',
      image: '',
      email: 'delaney.foster@example.com',
      phone: '+1 (555) 0173',
      url: '',
      summary:
        'Business intelligence analyst who came to the work from clinic operations and still builds reports the way an operator reads them. Rebuilt staffing reporting in Power BI, turning a six-hour Monday routine into 20 minutes, and now owns the 14 dashboards behind weekly operations reviews.',
      location: { city: 'Columbus', region: 'OH', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'delaneyfoster', url: 'https://linkedin.com/in/delaneyfoster' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ridgehaven Health Partners',
        position: 'Business Intelligence Analyst',
        location: 'Columbus, OH',
        url: '',
        startDate: '2025-02',
        endDate: '',
        summary: 'Reporting for 26 clinics and 310,000 patient visits a year.',
        highlights: [
          'Owns the 14 dashboards behind weekly operations reviews, covering visit volume, no-shows, staffing and supply spend across 26 sites.',
          "Replaced a hand-built staffing spreadsheet with an hourly Power BI model, cutting the operations team's Monday preparation from six hours to 20 minutes.",
          'Found that an overlapping join double-counted 11% of no-show appointments; the corrected rate of 17% changed how three clinics staffed Fridays.',
          'Wrote the metric definitions page that ended a two-year disagreement between finance and operations over what counts as a completed visit.',
        ],
      },
      {
        id: 'w2',
        name: 'Ridgehaven Health Partners',
        position: 'Operations Coordinator',
        location: 'Columbus, OH',
        url: '',
        startDate: '2022-06',
        endDate: '2025-01',
        summary: 'Moved into the analytics team after building the scheduling model the department adopted.',
        highlights: [
          'Scheduled 40 clinical staff across four sites and built the Excel model that cut overtime hours 23% in its first quarter.',
          'Reconciled 1,100 monthly supply orders against invoices, recovering $47,000 in duplicate charges over 18 months.',
          'Trained 26 site leads on the new visit-tracking workflow, taking same-day chart closure from 62% to 91%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Ohio State University',
        area: 'Economics',
        studyType: 'B.A.',
        location: 'Columbus, OH',
        startDate: '2018-08',
        endDate: '2022-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Central Ohio Food Collective',
        position: 'Volunteer Data Analyst',
        url: '',
        startDate: '2023-03',
        endDate: '',
        summary: '',
        highlights: [
          'Built the distribution dashboard 11 pantry sites now order stock from, cutting reported spoilage from 8% to 3% of received weight.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Reporting',
        level: '',
        keywords: ['Power BI', 'DAX', 'Tableau', 'Excel', 'Paginated reports'],
      },
      {
        id: 's2',
        name: 'Data',
        level: '',
        keywords: ['SQL Server', 'T-SQL', 'Star schemas', 'Data modeling', 'Python'],
      },
      {
        id: 's3',
        name: 'Healthcare operations',
        level: '',
        keywords: ['Scheduling', 'Capacity planning', 'Claims data', 'HIPAA-safe reporting'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Microsoft Certified: Power BI Data Analyst Associate (PL-300)',
        date: '2024',
        issuer: 'Microsoft',
        url: '',
      },
      { id: 'c2', name: 'Tableau Desktop Specialist', date: '2025', issuer: 'Tableau', url: '' },
    ],
  }),
}

export default sample
