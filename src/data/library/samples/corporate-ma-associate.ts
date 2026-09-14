import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A fourth-year transactional associate who came to law from finance. The
 * bullets are deal-shaped: what closed, how big, how fast, and what the
 * negotiation actually won for the client.
 */
export const sample: LibrarySample = {
  slug: 'corporate-ma-associate',
  role: 'Corporate M&A Associate',
  category: 'legal',
  seniority: 'mid',
  region: 'us',
  template: 'sapphire',
  blurb:
    'A mid-level transactional associate, written as closed deals and negotiated outcomes rather than a list of practice areas.',
  keywords: [
    'corporate associate',
    'mergers and acquisitions',
    'M&A attorney',
    'private equity lawyer',
    'venture financing',
    'law firm associate resume',
  ],
  content: content({
    basics: {
      name: 'Naomi Brandt',
      label: 'Corporate M&A Associate',
      image: '',
      email: 'naomi.brandt@example.com',
      phone: '+1 (555) 0163',
      url: 'https://naomibrandt.example.com',
      summary:
        'Corporate associate with four years on middle-market M&A and venture financings, admitted in New York since 2023. Ran the buy-side workstream on a $410M carve-out that signed and closed in eleven weeks, and wrote the transaction insurance playbook the group now runs every deal through.',
      location: { city: 'New York', region: 'NY', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'naomibrandt', url: 'https://linkedin.com/in/naomibrandt' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Harrow & Vance LLP',
        position: 'Corporate Associate',
        location: 'New York, NY',
        url: '',
        startDate: '2024-05',
        endDate: '',
        summary:
          'Mergers and acquisitions group. Middle-market private equity buyers, corporate carve-outs and growth financings.',
        highlights: [
          'Ran buy-side diligence on a $410M industrials carve-out, surfacing a $6.2M change-of-control exposure that became a purchase-price adjustment in the buyer’s favor.',
          'Drafted and negotiated nine purchase agreements averaging $85M in value; eight signed inside the client’s target window and none reopened after closing.',
          'Wrote the group’s representation and warranty insurance playbook after six RWI-backed deals, cutting the broker-to-bind cycle from 23 days to 9.',
          'Trains four first-year associates on disclosure schedules; corrections caught at signing fell from about 30 per deal to fewer than 8.',
        ],
      },
      {
        id: 'w2',
        name: 'Delmar & Frost LLP',
        position: 'Corporate Associate',
        location: 'New York, NY',
        url: '',
        startDate: '2022-09',
        endDate: '2024-04',
        summary: '',
        highlights: [
          'Closed 17 Series A and Series B financings totaling $290M, drafting the full document suite from term sheet through stock purchase agreement.',
          'Cleaned up capitalization tables for nine portfolio companies ahead of exit diligence, resolving 140 unsigned option grants that had stalled two term sheets.',
          'Wrote the onboarding memo on closing mechanics now issued to every incoming corporate associate at the firm.',
        ],
      },
      {
        id: 'w3',
        name: 'Sutherland Reach Capital',
        position: 'Investment Analyst',
        location: 'New York, NY',
        url: '',
        startDate: '2017-07',
        endDate: '2019-06',
        summary: '',
        highlights: [
          'Modeled 22 leveraged buyouts for a $900M middle-market fund, three of which the investment committee took to a letter of intent.',
          'Rebuilt the quarterly portfolio reporting pack, cutting preparation from nine days to two.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Fordham University School of Law',
        area: 'Law',
        studyType: 'J.D.',
        location: 'New York, NY',
        startDate: '2019-08',
        endDate: '2022-05',
        score: '3.71 GPA',
        url: '',
        summary: 'Fordham Law Review, Notes Editor. Moot Court Board, best-brief award in the intramural competition.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Boston College',
        area: 'Economics',
        studyType: 'B.A.',
        location: 'Chestnut Hill, MA',
        startDate: '2013-08',
        endDate: '2017-05',
        score: '3.60 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Transactions',
        level: '',
        keywords: [
          'Mergers and acquisitions',
          'Corporate carve-outs',
          'Venture financings',
          'Asset purchases',
          'Joint ventures',
        ],
      },
      {
        id: 's2',
        name: 'Drafting',
        level: '',
        keywords: [
          'Purchase agreements',
          'Disclosure schedules',
          'Stockholder agreements',
          'Board consents',
          'Side letters',
        ],
      },
      {
        id: 's3',
        name: 'Deal process',
        level: '',
        keywords: [
          'Buy-side diligence',
          'Rep and warranty insurance',
          'HSR filings',
          'Closing checklists',
          'Signing-to-closing tracking',
        ],
      },
      {
        id: 's4',
        name: 'Sectors',
        level: '',
        keywords: ['Industrials', 'Healthcare services', 'B2B software', 'Logistics'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Admitted to the New York State Bar',
        date: '2023',
        issuer: 'Appellate Division, First Department',
        url: '',
      },
      {
        id: 'c2',
        name: 'Admitted to practice, U.S. District Courts for the Southern and Eastern Districts of New York',
        date: '2023',
        issuer: 'United States District Court',
        url: '',
      },
    ],
  }),
}

export default sample
