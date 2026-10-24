import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Fifteen years, four employers, one page and a bit. The early audit years get
 * two lines each while the controller role gets five, because a reader hiring a
 * controller wants the close calendar and the cost model, not a tour of 2011.
 */
export const sample: LibrarySample = {
  slug: 'financial-controller',
  role: 'Financial Controller',
  category: 'finance',
  seniority: 'senior',
  region: 'us',
  template: 'harvard',
  blurb:
    'A controller who came up through audit and cost accounting, told in close days, margin found and controls closed.',
  keywords: [
    'financial controller',
    'controller resume',
    'month-end close',
    'standard costing',
    'SOX compliance',
    'CPA CMA',
    'manufacturing finance',
  ],
  guide: {
    why: [
      'Close speed is given as a before and after, “from fourteen days to five”, with the method: eliminations moved into the ERP and 26 spreadsheet handoffs retired.',
      'The standard-costing rebuild across 4,800 part numbers exposed $2.1M of margin and repriced 340 loss-making items. It shows the controller as a source of profit, not only of reports.',
      'Control work is concrete: 71 key controls documented and six significant deficiencies closed in two cycles, which is what a SOX-readiness employer is looking for.',
      'Both credentials, Certified Public Accountant and Certified Management Accountant, appear in the header label and the certificates, signalling financial and cost accounting depth for a manufacturing controller role.',
    ],
    faq: [
      {
        q: 'What should a financial controller resume include?',
        a: 'Close timeline, team size, control and audit results, systems implemented and the business result of costing or working capital work. Include credentials such as CPA or CMA beside your name.',
      },
      {
        q: 'Is a CMA useful on a controller resume?',
        a: 'In manufacturing and other cost-heavy industries, yes. It signals cost accounting and performance management skills beside the CPA’s reporting and audit grounding.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Garrett Pemberton',
      label: 'Financial Controller, CPA CMA',
      image: '',
      email: 'garrett.pemberton@example.com',
      phone: '+1 (555) 0193',
      url: '',
      summary:
        'Controller with fifteen years in manufacturing finance, four of them running accounting for a $240M maker across four plants. Rebuilt standard costing for 4,800 parts and exposed $2.1M of hidden margin.',
      location: { city: 'Grand Rapids', region: 'MI', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'garrettpemberton', url: 'https://linkedin.com/in/garrettpemberton' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Halloway Machine Works',
        position: 'Financial Controller',
        location: 'Grand Rapids, MI',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary: 'Accounting for a $240M manufacturer across four plants, with a team of eleven.',
        highlights: [
          'Leads close, accounts receivable, accounts payable and cost accounting for four plants, with a team of eleven and two direct managers.',
          'Took the monthly close from fourteen days to five by moving intercompany eliminations into the ERP and retiring 26 spreadsheet handoffs.',
          'Rebuilt standard costing for 4,800 part numbers, exposing $2.1M of margin absorbed into one overhead pool and repricing 340 loss-making items.',
          'Ran the SOX readiness program ahead of a planned listing, documenting 71 key controls and closing all six significant deficiencies within two cycles.',
          'Renegotiated the borrowing base after tightening inventory reporting, releasing $6M of additional revolver capacity.',
        ],
      },
      {
        id: 'w2',
        name: 'Vandermeer Plastics Group',
        position: 'Assistant Controller',
        location: 'Holland, MI',
        url: '',
        startDate: '2018-01',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Consolidated four legacy ledgers onto one ERP instance on schedule, retiring $180k a year of maintenance on the systems replaced.',
          'Introduced a weekly cash forecast that held forecast error under 3% for eight consecutive quarters.',
          'Built the plant-level income statement pack that the operations directors still run their weekly reviews from.',
        ],
      },
      {
        id: 'w3',
        name: 'Vandermeer Plastics Group',
        position: 'Accounting Manager',
        location: 'Holland, MI',
        url: '',
        startDate: '2015-09',
        endDate: '2017-12',
        summary: '',
        highlights: [
          'Managed a team of four through the close, cutting post-close adjusting entries from 31 a month to seven.',
          'Implemented the fixed asset module for 6,200 assets, correcting $940k misstated under the prior manual schedule.',
        ],
      },
      {
        id: 'w4',
        name: 'Ketteridge & Voss LLP',
        position: 'Audit Senior',
        location: 'Chicago, IL',
        url: '',
        startDate: '2011-08',
        endDate: '2015-08',
        summary: '',
        highlights: [
          'Led fieldwork on eleven middle-market manufacturing clients with revenue from $40M to $600M.',
          'Trained 14 associates on the firm inventory observation methodology across three busy seasons.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Michigan State University',
        area: 'Accounting',
        studyType: 'B.A.',
        location: 'East Lansing, MI',
        startDate: '2007-08',
        endDate: '2011-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Controllership',
        level: '',
        keywords: [
          'US GAAP',
          'Month-end close',
          'Consolidations',
          'Standard costing',
          'Internal controls',
          'External audit management',
        ],
      },
      {
        id: 's2',
        name: 'Planning and capital',
        level: '',
        keywords: [
          'Annual budget',
          'Cash forecasting',
          'Borrowing base reporting',
          'Capital expenditure approval',
          'Pricing analysis',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['NetSuite', 'Microsoft Dynamics 365', 'Hyperion', 'BlackLine', 'Power BI', 'Excel'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Chairman Award for Operational Impact',
        date: '2024',
        awarder: 'Halloway Machine Works',
        summary: 'Given for the standard-costing rebuild that repriced 340 loss-making part numbers.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Public Accountant (CPA)',
        date: '2013',
        issuer: 'Michigan Board of Accountancy',
        url: '',
      },
      {
        id: 'c2',
        name: 'Certified Management Accountant (CMA)',
        date: '2019',
        issuer: 'Institute of Management Accountants',
        url: '',
      },
    ],
  }),
}

export default sample
