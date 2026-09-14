import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Senior, US. Chief of staff is the role most often written as a list of
 * meetings attended, so this one is measured the way the job actually is:
 * decisions closed, plans delivered, an integration landed, a deck cut in half.
 * The part-time MBA is still running, which is what `status: pursuing` is for.
 */
export const sample: LibrarySample = {
  slug: 'chief-of-staff',
  role: 'Chief of Staff',
  category: 'business',
  seniority: 'senior',
  region: 'us',
  template: 'crest',
  blurb:
    'A consultant turned chief of staff, measured the way the job really is: cadence held, decisions closed, deals landed.',
  keywords: [
    'chief of staff',
    'chief of staff to CEO',
    'business operations',
    'board reporting',
    'post-merger integration',
    'strategy to operations',
  ],
  content: content({
    basics: {
      name: 'Adrian Vogel',
      label: 'Chief of Staff to the CEO',
      image: '',
      email: 'adrian.vogel@example.com',
      phone: '+1 (555) 0196',
      url: '',
      summary:
        'Chief of staff to the CEO of a 480-person health technology company, after five years in strategy consulting. Ran the operating cadence through a Series C and a $38M acquisition, and rebuilt planning so committed work ships on time 87% of the time instead of 52%.',
      location: { city: 'Boston', region: 'MA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'adrianvogel', url: 'https://linkedin.com/in/adrianvogel' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Larkspur Health Technologies',
        position: 'Chief of Staff to the CEO',
        location: 'Boston, MA',
        url: '',
        startDate: '2022-06',
        endDate: '',
        summary:
          'Reports to the CEO. Owns the operating cadence, board materials, and the work that does not yet have an owner.',
        highlights: [
          'Rebuilt quarterly planning around six company goals instead of 41 departmental ones; on-time delivery of committed work rose from 52% to 87%.',
          'Ran diligence and the first hundred days of a $38M acquisition, integrating 90 employees with 94% retention at the one-year mark.',
          'Prepared 14 consecutive board packages and cut the average deck from 62 slides to 24 by moving detail into a pre-read.',
          'Chairs the weekly executive staff meeting; decisions closed within two weeks of being logged went from 44% to 91%.',
          'Led the pricing review that retired three legacy plans and lifted average contract value 19%.',
        ],
      },
      {
        id: 'w2',
        name: 'Salter & Vaughn',
        position: 'Engagement Manager',
        location: 'Boston, MA',
        url: '',
        startDate: '2019-08',
        endDate: '2022-05',
        summary: '',
        highlights: [
          'Led four healthcare payer engagements on cost and growth strategy, each between $600k and $1.4M in fees.',
          'Built the market-entry case for a client expanding into three states, which became a $120M revenue line within two years.',
          'Managed teams of five and ran the recruiting loop that hired 11 analysts in a year.',
        ],
      },
      {
        id: 'w3',
        name: 'Salter & Vaughn',
        position: 'Associate Consultant',
        location: 'Boston, MA',
        url: '',
        startDate: '2017-07',
        endDate: '2019-07',
        summary: '',
        highlights: [
          'Modeled the merger of two regional clinic groups and found $9.4M of overlap that moved the final offer price.',
          'Rebuilt a payer network model covering 2,300 providers that cut contracting analysis from six weeks to four days.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Boston University Questrom School of Business',
        area: 'Business Administration',
        studyType: 'MBA (part-time)',
        location: 'Boston, MA',
        startDate: '2024-09',
        endDate: '2027-05',
        score: '',
        url: '',
        summary: '',
        courses: [],
        status: 'pursuing',
      },
      {
        id: 'e2',
        institution: 'Boston College',
        area: 'Economics',
        studyType: 'B.A.',
        location: 'Chestnut Hill, MA',
        startDate: '2013-08',
        endDate: '2017-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Back Bay Clinic Alliance',
        position: 'Board Member, Finance Committee',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary: '',
        highlights: [
          'Reviews a $7M annual budget for a network of four free clinics, and chaired the search that hired its first operations director.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Operating',
        level: '',
        keywords: [
          'Board reporting',
          'Goal setting and OKRs',
          'Executive communication',
          'Decision logs',
          'Meeting design',
        ],
      },
      {
        id: 's2',
        name: 'Corporate',
        level: '',
        keywords: ['M&A diligence', 'Post-merger integration', 'Pricing strategy', 'Fundraising support'],
      },
      {
        id: 's3',
        name: 'Analysis',
        level: '',
        keywords: ['Financial modeling', 'Market sizing', 'SQL', 'Tableau', 'Scenario planning'],
      },
    ],
  }),
}

export default sample
