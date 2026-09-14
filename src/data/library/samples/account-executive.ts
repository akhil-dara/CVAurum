import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, US. A quota-carrying seller, so the résumé is read for numbers
 * first: attainment against a stated number, deal size, cycle length, and what
 * changed to move them. Awards sit at the bottom where they belong.
 */
export const sample: LibrarySample = {
  slug: 'account-executive',
  role: 'Account Executive',
  category: 'business',
  seniority: 'mid',
  region: 'us',
  template: 'emblem',
  blurb: 'A quota-carrying seller whose résumé leads with attainment, deal size and cycle time rather than adjectives.',
  keywords: [
    'account executive',
    'mid-market account executive',
    'SaaS sales',
    'quota attainment',
    'new business sales',
    'B2B closing role',
  ],
  content: content({
    basics: {
      name: 'Grant Halloway',
      label: 'Account Executive, Mid-Market',
      image: '',
      email: 'grant.halloway@example.com',
      phone: '+1 (555) 0128',
      url: '',
      summary:
        'Account executive selling field-service software to contractors between 50 and 500 technicians, six years carrying a new-business number. Closed $3.2M in new ARR last year against a $2.4M quota, the best result on a nine-person team.',
      location: { city: 'Denver', region: 'CO', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'granthalloway', url: 'https://linkedin.com/in/granthalloway' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Wrenmark Field Systems',
        position: 'Account Executive, Mid-Market',
        location: 'Denver, CO',
        url: '',
        startDate: '2022-04',
        endDate: '',
        summary: 'Eleven-state western territory selling to HVAC, electrical and plumbing contractors.',
        highlights: [
          'Closed $3.2M in new ARR against a $2.4M quota in 2025, including a 340-technician contractor that had sat open for five years.',
          'Raised average contract value from $41k to $67k by leading with the scheduling module that every won deal in 2023 had in common.',
          'Cut median sales cycle from 94 days to 61 by moving the security review to week two instead of the week before signature.',
          'Wrote the territory account plan that eight reps now work from; new-hire ramp fell from seven months to four.',
        ],
      },
      {
        id: 'w2',
        name: 'Pinemarsh Logistics Software',
        position: 'Account Executive, SMB',
        location: 'Denver, CO',
        url: '',
        startDate: '2020-02',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Finished at 118% and 121% of a $780k quota across two full years, on 60 to 70 closed deals a year.',
          'Turned a stalled reseller channel into 22% of personal bookings by running monthly joint pipeline reviews with three regional partners.',
          "Wrote the objection-handling one-pager on implementation cost, which became the team's standard leave-behind.",
        ],
      },
      {
        id: 'w3',
        name: 'Pinemarsh Logistics Software',
        position: 'Sales Development Representative',
        location: 'Denver, CO',
        url: '',
        startDate: '2018-08',
        endDate: '2020-01',
        summary: '',
        highlights: [
          'Booked 312 qualified meetings in 17 months, 41% above team average, and converted 28% of them into opportunities.',
          'Rebuilt the cold-call opener around one question about dispatch delays, lifting connect-to-meeting rate from 9% to 16%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Denver',
        area: 'Business Administration',
        studyType: 'B.S.',
        location: 'Denver, CO',
        startDate: '2014-09',
        endDate: '2018-06',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: "President's Club",
        date: '2025',
        awarder: 'Wrenmark Field Systems',
        summary: 'First of nine mid-market representatives on new ARR.',
      },
      { id: 'a2', title: 'Rookie of the Year', date: '2019', awarder: 'Pinemarsh Logistics Software', summary: '' },
    ],
    skills: [
      {
        id: 's1',
        name: 'Selling',
        level: '',
        keywords: [
          'MEDDPICC qualification',
          'Multithreaded deals',
          'Discovery calls',
          'Negotiation',
          'Executive briefings',
        ],
      },
      {
        id: 's2',
        name: 'Tools',
        level: '',
        keywords: ['Salesforce', 'Outreach', 'Gong', 'ZoomInfo', 'Clari forecasting'],
      },
      {
        id: 's3',
        name: 'Segments',
        level: '',
        keywords: ['Mid-market SaaS', 'Field service', 'Logistics', 'Reseller channel'],
      },
    ],
  }),
}

export default sample
