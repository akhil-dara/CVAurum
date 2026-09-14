import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, UK, and a returner. The twelve months away are named in the
 * history rather than left as a hole for a reader to wonder about, and the
 * retention numbers either side of it do the arguing.
 */
export const sample: LibrarySample = {
  slug: 'customer-success-manager',
  role: 'Customer Success Manager',
  category: 'business',
  seniority: 'mid',
  region: 'uk',
  template: 'atlas',
  blurb:
    'A returner after a year of caring, with the renewal and expansion numbers that carried the book before and after.',
  keywords: [
    'customer success manager',
    'SaaS renewals',
    'gross retention rate',
    'account management',
    'returning to work after a career break',
    'onboarding and QBRs',
  ],
  content: content({
    basics: {
      name: 'Eleanor Whitcombe',
      label: 'Customer Success Manager',
      image: '',
      email: 'eleanor.whitcombe@example.com',
      phone: '+44 7700 900121',
      url: '',
      summary:
        'Customer success manager looking after a £9M book of mid-market SaaS accounts, seven years in the discipline either side of a year as a full-time carer. Took gross renewal from 81% to 94% by replacing ad-hoc onboarding with a fixed ninety-day plan.',
      location: { city: 'Bristol', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'eleanorwhitcombe', url: 'https://linkedin.com/in/eleanorwhitcombe' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Brackenford Software',
        position: 'Customer Success Manager',
        location: 'Bristol',
        url: '',
        startDate: '2024-03',
        endDate: '',
        summary: 'Owns 38 mid-market retail and hospitality accounts worth £9M in annual recurring revenue.',
        highlights: [
          'Lifted gross renewal from 81% to 94% in two years by replacing ad-hoc onboarding with a fixed ninety-day plan and one named success milestone per account.',
          'Grew the book by £1.3M of expansion revenue, 61% of it traced to a usage report that flags accounts nearing their licence ceiling.',
          'Defined the seven churn signals now built into the health score; of 16 accounts flagged red in 2025, 12 were saved.',
          'Runs the quarterly business review programme for the segment, which 34 of 38 accounts now attend at director level or above.',
        ],
      },
      {
        id: 'w2',
        name: 'Career break',
        position: 'Full-time carer',
        location: 'Bristol',
        url: '',
        startDate: '2023-02',
        endDate: '2024-02',
        summary: 'Twelve months away from work as the primary carer for a parent recovering from a stroke.',
        highlights: ['Completed the CCXP certification and two SQL courses during the break.'],
      },
      {
        id: 'w3',
        name: 'Cheswick Retail Systems',
        position: 'Customer Success Manager',
        location: 'Bristol',
        url: '',
        startDate: '2020-06',
        endDate: '2023-01',
        summary: '',
        highlights: [
          'Carried 52 accounts through a change of pricing model, retaining 49 of them and organising 11 multi-year renewals.',
          'Cut average time to first value from 71 days to 34 by pre-building the three reports every new customer asked for.',
          'Set up the monthly churn post-mortem with product and support; four of the six causes it surfaced were fixed within two releases.',
        ],
      },
      {
        id: 'w4',
        name: 'Dunstan Logistics',
        position: 'Account Support Analyst',
        location: 'Bristol',
        url: '',
        startDate: '2018-09',
        endDate: '2020-05',
        summary: '',
        highlights: [
          'Handled 60 accounts on a shared queue and wrote the escalation matrix that halved the issues reaching the operations director.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Bath',
        area: 'Business Administration',
        studyType: 'BSc',
        location: 'Bath',
        startDate: '2015-09',
        endDate: '2018-06',
        score: '2:1 (Upper Second Class Honours)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Avonside Carers Network',
        position: 'Peer Support Volunteer',
        url: '',
        startDate: '2023-06',
        endDate: '',
        summary: '',
        highlights: ['Runs a fortnightly session for 15 to 20 carers preparing to return to work after a break.'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Retention',
        level: '',
        keywords: ['Onboarding design', 'Health scoring', 'Renewal negotiation', 'Churn analysis', 'QBR facilitation'],
      },
      {
        id: 's2',
        name: 'Growth',
        level: '',
        keywords: ['Expansion forecasting', 'Usage reporting', 'Executive relationships', 'Reference programmes'],
      },
      { id: 's3', name: 'Systems', level: '', keywords: ['Gainsight', 'Salesforce', 'SQL', 'Looker', 'Zendesk'] },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Customer Experience Professional (CCXP)', date: '2023', issuer: 'CXPA', url: '' },
      { id: 'c2', name: 'ITIL 4 Foundation', date: '2021', issuer: 'PeopleCert', url: '' },
    ],
  }),
}

export default sample
