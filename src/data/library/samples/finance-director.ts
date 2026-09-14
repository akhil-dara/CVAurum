import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * A lead résumé has a second job: proving the person can run a function, not
 * just a model. So the first bullet of the current role states team size and
 * scope, and the ones after it are the outcomes that only a function owner can
 * claim — a plan landed, a facility priced, cash pulled out of receivables.
 */
export const sample: LibrarySample = {
  slug: 'finance-director',
  role: 'Finance Director',
  category: 'finance',
  seniority: 'lead',
  region: 'us',
  template: 'slate',
  blurb:
    'A finance leader across healthcare, software and cooperatives, told in team size, plan accuracy and cash freed.',
  keywords: [
    'finance director',
    'head of finance',
    'finance manager',
    'FP&A leader',
    'board reporting',
    'healthcare finance',
    'CPA MBA',
  ],
  content: content({
    basics: {
      name: 'Tessa Lindgren',
      label: 'Finance Director',
      image: '',
      email: 'tessa.lindgren@example.com',
      phone: '+1 (555) 0164',
      url: 'https://tessalindgren.example.com',
      summary:
        'Finance leader with sixteen years across healthcare, software and agricultural cooperatives, now running a team of fourteen for a $410M provider group. Restructured 31 payer contracts to add $9.2M of annual contribution.',
      location: { city: 'Minneapolis', region: 'MN', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'tessalindgren', url: 'https://linkedin.com/in/tessalindgren' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Larkspur Health Partners',
        logo: monogram('L', '#0f766e'),
        position: 'Finance Director',
        location: 'Minneapolis, MN',
        url: '',
        startDate: '2022-01',
        endDate: '',
        summary: 'FP&A, accounting and revenue cycle for a $410M multi-site provider group.',
        highlights: [
          'Leads a finance team of fourteen across FP&A, accounting and revenue cycle, reporting to the chief executive and the board finance committee.',
          'Delivered the 2025 operating plan two weeks early and closed the year within 1.4% of the revenue forecast, the tightest of the last six plans.',
          'Restructured the payer contract model across 31 agreements, lifting net revenue per visit by $18 and adding $9.2M of annual contribution.',
          'Took days in accounts receivable from 62 to 38 by rebuilding the denials workflow with the revenue cycle team, freeing $21M of cash.',
          'Led diligence on a $55M credit facility that closed 175 basis points inside the facility it replaced.',
        ],
      },
      {
        id: 'w2',
        name: 'Cedar Loop Software',
        logo: monogram('C', '#1d4ed8'),
        position: 'Senior Finance Manager',
        location: 'Minneapolis, MN',
        url: '',
        startDate: '2018-03',
        endDate: '2021-12',
        summary: '',
        highlights: [
          'Built the FP&A function at a 320-person software company from one spreadsheet to a modeled plan across seven cost centers and 41 budget owners.',
          'Replaced quarterly guesswork on net revenue retention with a monthly cohort view, which the board used to move $4M of spend from new logos to expansion.',
          'Ran the finance workstream on two acquisitions worth $87M combined, with both onto a single ledger within a quarter of close.',
        ],
      },
      {
        id: 'w3',
        name: 'Thorsen Dairy Cooperative',
        logo: monogram('T', '#7c2d12'),
        position: 'FP&A Manager',
        location: 'Saint Paul, MN',
        url: '',
        startDate: '2014-06',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Rebuilt the hedging model for milk and feed inputs, cutting gross margin volatility from 4.2 points to 1.6 over two seasons.',
          'Ran the annual budget for 11 plants and 1,400 employees, delivering the first on-time plan in five years.',
          'Replaced a 90-tab budget workbook with a planning tool, taking each plant submission from three days to four hours.',
        ],
      },
      {
        id: 'w4',
        name: 'Aldrich Petrie LLP',
        logo: monogram('A', '#334155'),
        position: 'Audit Senior',
        location: 'Minneapolis, MN',
        url: '',
        startDate: '2010-09',
        endDate: '2014-05',
        summary: '',
        highlights: [
          'Led fieldwork on health system and cooperative clients with revenue up to $900M.',
          'Qualified as a CPA while carrying a nine-client busy-season caseload.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Northside Youth Music Collective',
        position: 'Board Treasurer',
        url: '',
        startDate: '2020-03',
        endDate: '',
        summary: '',
        highlights: [
          'Chairs the finance committee for a youth arts nonprofit with a $1.8M budget, which moved from a $140k deficit to a balanced budget in two years.',
          'Wrote the reserve policy that took the operating reserve from six weeks of expenses to five months.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Carlson School of Management, University of Minnesota',
        area: 'Business Administration',
        studyType: 'MBA',
        location: 'Minneapolis, MN',
        startDate: '2016-09',
        endDate: '2019-05',
        score: '3.8 GPA',
        url: '',
        summary: 'Completed part-time while working full time.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Minnesota Twin Cities',
        area: 'Accounting',
        studyType: 'B.S.',
        location: 'Minneapolis, MN',
        startDate: '2006-09',
        endDate: '2010-05',
        score: '3.6 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Finance leadership',
        level: '',
        keywords: [
          'Operating plan',
          'Board reporting',
          'Team building',
          'Debt financing',
          'Acquisition integration',
          'Pricing strategy',
        ],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: [
          'Three-statement modeling',
          'Unit economics',
          'Payer contract modeling',
          'Scenario planning',
          'Cash forecasting',
        ],
      },
      {
        id: 's3',
        name: 'Domain',
        level: '',
        keywords: ['Revenue cycle', 'Healthcare reimbursement', 'US GAAP', 'Subscription metrics', 'Commodity hedging'],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['Workday Adaptive Planning', 'NetSuite', 'Snowflake', 'Power BI', 'Excel', 'SQL'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Public Accountant (CPA)',
        date: '2012',
        issuer: 'Minnesota Board of Accountancy',
        url: '',
      },
    ],
  }),
}

export default sample
