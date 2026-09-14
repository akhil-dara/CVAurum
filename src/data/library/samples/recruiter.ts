import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A career changer. The retail job is not hidden and not apologised for: it is
 * written as hiring work, because that is what it was, so the two roles read as
 * one continuous story about filling shifts and then filling requisitions.
 */
export const sample: LibrarySample = {
  slug: 'recruiter',
  role: 'Recruiter',
  category: 'operations',
  seniority: 'entry',
  region: 'us',
  template: 'initials',
  blurb: "A retail floor manager's move into recruiting, with the hiring numbers from both jobs doing the talking.",
  keywords: [
    'recruiter',
    'talent acquisition',
    'agency recruiter',
    'time to hire',
    'candidate sourcing',
    'career change into recruiting',
    'entry level recruiter',
  ],
  content: content({
    basics: {
      name: 'Talia Brennan',
      label: 'Recruiter',
      image: '',
      email: 'talia.brennan@example.com',
      phone: '+1 (555) 0178',
      url: '',
      summary:
        'Recruiter two years off a retail sales floor, now running operations and manufacturing searches end to end. Filled 41 roles last year at a median 34-day time to hire, eleven days under the desk average, with 92% still in seat at twelve months.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'taliabrennan', url: 'https://linkedin.com/in/taliabrennan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Northgate Talent Group',
        position: 'Recruiter',
        location: 'Chicago, IL',
        url: '',
        startDate: '2024-08',
        endDate: '',
        summary: 'Agency desk covering operations, warehouse and manufacturing roles for 14 Midwest clients.',
        highlights: [
          'Filled 41 roles in twelve months at a median 34-day time to hire against a 45-day desk average, with 92% of placements still employed at one year.',
          'Rebuilt the intake call as a nine-question scorecard signed off by the hiring manager; submit-to-interview rate rose from 28% to 51%.',
          'Sourced 60% of placements through outbound outreach rather than job boards, taking average cost per hire from $6,200 to $4,050.',
          'Wrote the scheduling templates that moved candidates from first contact to a booked interview in four hours instead of two days.',
        ],
      },
      {
        id: 'w2',
        name: 'Cedar & Vane Outfitters',
        position: 'Assistant Store Manager',
        location: 'Evanston, IL',
        url: '',
        startDate: '2021-06',
        endDate: '2024-07',
        summary: '',
        highlights: [
          'Hired and onboarded 38 seasonal staff across three peak seasons, averaging four days from application to first shift with no unfilled openings.',
          'Cut seasonal turnover from 44% to 26% by replacing walk-in hiring with a two-interview process and a written first-week plan.',
          'Trained six shift leads, four of whom were promoted into store roles within a year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'DePaul University',
        area: 'Psychology',
        studyType: 'B.A.',
        location: 'Chicago, IL',
        startDate: '2017-08',
        endDate: '2021-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Sourcing',
        level: '',
        keywords: [
          'Boolean search',
          'Outbound outreach',
          'Talent mapping',
          'Referral programs',
          'Market salary research',
        ],
      },
      {
        id: 's2',
        name: 'Hiring process',
        level: '',
        keywords: [
          'Intake scorecards',
          'Structured interviewing',
          'Offer negotiation',
          'Reference checks',
          'Pipeline reporting',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['Greenhouse', 'Lever', 'Workday Recruiting', 'Gem', 'Excel'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Talent Acquisition Specialty Credential', date: '2025', issuer: 'SHRM', url: '' },
    ],
  }),
}

export default sample
