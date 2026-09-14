import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Senior, UK. A consulting history is a list of other people's problems, so
 * each entry names the client shape, the money, and the metric that moved —
 * plus the two things a firm actually promotes on: sold work and people kept.
 */
export const sample: LibrarySample = {
  slug: 'management-consultant',
  role: 'Management Consultant',
  category: 'business',
  seniority: 'senior',
  region: 'uk',
  template: 'pinnacle',
  blurb:
    'Nine years of UK operations consulting, with the savings delivered, the work sold and the client metrics on the page.',
  keywords: [
    'management consultant',
    'engagement manager',
    'operations consulting',
    'cost transformation',
    'operating model design',
    'strategy consultant UK',
  ],
  content: content({
    basics: {
      name: 'Fiona Attwell',
      label: 'Engagement Manager, Operations',
      image: '',
      email: 'fiona.attwell@example.com',
      phone: '+44 7700 900177',
      url: 'https://fionaattwell.example.com',
      summary:
        'Management consultant with nine years on cost and operations transformation for UK retail, utilities and logistics, now leading engagement teams of six. Delivered £24M of annualised savings across three programmes without a compulsory redundancy.',
      location: { city: 'London', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'fionaattwell', url: 'https://linkedin.com/in/fionaattwell' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ravenscourt Partners',
        logo: monogram('R', '#1e3a8a'),
        position: 'Engagement Manager',
        location: 'London',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary: 'Operations practice. Leads teams of four to six on cost, supply chain and service transformation.',
        highlights: [
          'Led a £14M cost programme for a 340-store retailer, taking store payroll from 11.2% of sales to 9.4% with customer service scores unchanged.',
          'Redesigned field-service scheduling for a water utility, lifting first-time fix from 68% to 86% across 1,100 engineers.',
          'Sold £3.1M of follow-on work across two accounts, and turned one six-week diagnostic into a two-year delivery mandate.',
          'Built the benchmarking library of 40 operational metrics now used to scope every proposal the practice writes.',
          'Mentors five consultants; three were promoted at the last cycle and none has left the firm.',
        ],
      },
      {
        id: 'w2',
        name: 'Ravenscourt Partners',
        logo: monogram('R', '#1e3a8a'),
        position: 'Consultant',
        location: 'London',
        url: '',
        startDate: '2020-01',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Ran the supply-chain diagnostic for a grocery wholesaler that found £6.8M of avoidable freight spend, £4.2M of it banked within the year.',
          'Rebuilt demand forecasting on a 30-line pilot, cutting forecast error from 34% to 19% and stock write-offs by £900k.',
          'Trained 22 client managers on the new weekly operating rhythm so it continued unchanged after the team left.',
        ],
      },
      {
        id: 'w3',
        name: 'Wexbury Group',
        logo: monogram('W', '#0f766e'),
        position: 'Analyst, Operations Advisory',
        location: 'Manchester',
        url: '',
        startDate: '2017-09',
        endDate: '2019-12',
        summary: '',
        highlights: [
          'Modelled a 19-site depot network for a parcels operator; the two closures recommended saved £2.3M a year.',
          'Produced the weekly cost tracker for a £40M transformation, which caught a £700k overrun in month three.',
        ],
      },
      {
        id: 'w4',
        name: 'Alderwick Foods',
        logo: monogram('A', '#b45309'),
        position: 'Supply Planner',
        location: 'Leeds',
        url: '',
        startDate: '2016-08',
        endDate: '2017-08',
        summary: '',
        highlights: [
          'Planned production across six lines at a 400-person bakery, cutting short-dated waste by 27% in a year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'London School of Economics and Political Science',
        area: 'Management',
        studyType: 'MSc',
        location: 'London',
        startDate: '2015-09',
        endDate: '2016-07',
        score: 'Distinction',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Warwick',
        area: 'Economics',
        studyType: 'BSc',
        location: 'Coventry',
        startDate: '2012-09',
        endDate: '2015-06',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'Where the cost went: field service productivity in UK utilities',
        publisher: 'Ravenscourt Partners Insight Series',
        releaseDate: '2024-06',
        url: '',
        summary:
          'A study of scheduling practice across nine utility field forces, presented at two industry conferences.',
      },
      {
        id: 'pub2',
        name: 'Rebuilding store payroll models after the wage floor moved',
        publisher: 'Ravenscourt Partners Insight Series',
        releaseDate: '2023-02',
        url: '',
        summary: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Consulting',
        level: '',
        keywords: [
          'Cost transformation',
          'Operating model design',
          'Diagnostics',
          'Benefits tracking',
          'Client workshops',
        ],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: ['Cost-to-serve modelling', 'Network optimisation', 'SQL', 'Alteryx', 'Advanced Excel'],
      },
      {
        id: 's3',
        name: 'Sectors',
        level: '',
        keywords: ['Grocery and retail', 'Utilities', 'Parcels and logistics', 'Food manufacturing'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'French', fluency: 'Professional working', rating: 3 },
    ],
  }),
}

export default sample
