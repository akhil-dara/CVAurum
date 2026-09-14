import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * B2B product marketing, where the work is invisible unless it is attached to
 * a sales number. Every bullet here lands on pipeline, win rate, contract
 * value or cycle length — the four things a PMM is actually hired to move.
 */
export const sample: LibrarySample = {
  slug: 'product-marketing-manager',
  role: 'Product Marketing Manager',
  category: 'marketing',
  seniority: 'senior',
  region: 'us',
  template: 'contemporary',
  blurb: 'Nine years of B2B SaaS positioning and launches, measured in win rate, pipeline and contract value.',
  keywords: [
    'product marketing manager',
    'B2B SaaS',
    'positioning and messaging',
    'go-to-market strategy',
    'sales enablement',
    'competitive intelligence',
    'product launch',
  ],
  content: content({
    basics: {
      name: 'Naomi Feldstein',
      label: 'Senior Product Marketing Manager',
      image: '',
      email: 'naomi.feldstein@example.com',
      phone: '+1 (555) 0163',
      url: 'https://naomifeldstein.example.com',
      summary:
        'Product marketer with nine years in B2B software, working from win-loss interviews rather than adjectives. Repositioned a $70M ARR platform around data access instead of storage, moving win rate against the incumbent from 22% to 41%.',
      location: { city: 'Boston', region: 'MA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'naomifeldstein', url: 'https://linkedin.com/in/naomifeldstein' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Orrington Data',
        position: 'Senior Product Marketing Manager',
        location: 'Boston, MA',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary: 'Owns positioning, launches and competitive strategy for a $70M ARR data governance platform.',
        highlights: [
          'Repositioned the platform around data access rather than data storage; win rate against the category incumbent moved from 22% to 41% in three quarters.',
          'Launched the governance module to $4.2M of pipeline in 90 days, the first product at the company to pass its year-one target in month seven.',
          'Wrote the competitive battlecards from 40 win-loss interviews; sales cycles on competitive deals shortened from 94 to 71 days.',
          'Led the pricing and packaging change that moved 62% of new logos onto the platform tier, lifting average contract value from $31k to $48k.',
          'Runs the launch-tier framework three product teams now plan against, which ended a year of every feature asking for a keynote.',
        ],
      },
      {
        id: 'w2',
        name: 'Pinefall Software',
        position: 'Product Marketing Manager',
        location: 'Boston, MA',
        url: '',
        startDate: '2018-03',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Took three products into healthcare, a vertical the company had never sold to, which grew to 18% of new bookings in nine quarters.',
          'Grew the reference programme from 5 to 24 accounts willing to take a call, and attached a case study to 71% of closed-won deals.',
          'Trained 60 sellers on new messaging; discovery-call-to-demo conversion rose from 44% to 58% the quarter after.',
        ],
      },
      {
        id: 'w3',
        name: 'Wrenfield Analytics',
        position: 'Demand Generation Manager',
        location: 'Providence, RI',
        url: '',
        startDate: '2015-07',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Built the webinar programme from nothing to 1,100 registrants a month at $42 per marketing-qualified lead.',
          'Rewrote the nurture tracks by buying stage, taking lead-to-opportunity conversion from 4% to 8.3%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Boston University',
        area: 'Economics',
        studyType: 'B.A.',
        location: 'Boston, MA',
        startDate: '2011-09',
        endDate: '2015-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Positioning',
        level: '',
        keywords: [
          'Messaging frameworks',
          'Segmentation',
          'Pricing and packaging',
          'Narrative development',
          'Analyst relations',
        ],
      },
      {
        id: 's2',
        name: 'Go-to-market',
        level: '',
        keywords: [
          'Launch tiering',
          'Sales enablement',
          'Win-loss research',
          'Competitive intelligence',
          'Partner marketing',
        ],
      },
      {
        id: 's3',
        name: 'Evidence',
        level: '',
        keywords: ['Customer interviews', 'Message testing', 'Pipeline reporting', 'Salesforce', 'SQL'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Pragmatic Certified: Foundations and Focus',
        date: '2020',
        issuer: 'Pragmatic Institute',
        url: '',
      },
    ],
    awards: [{ id: 'a1', title: 'Launch of the Year', date: '2023', awarder: 'Orrington Data', summary: '' }],
  }),
}

export default sample
