import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A returner. The two-year break sits in the history as its own entry, dated
 * and explained in one line, because a reader who finds a gap will invent a
 * worse reason than the real one. Everything after it is written to show the
 * climb back, which is the whole argument this résumé makes.
 */
export const sample: LibrarySample = {
  slug: 'senior-accountant',
  role: 'Senior Accountant',
  category: 'finance',
  seniority: 'mid',
  region: 'us',
  template: 'newton',
  blurb:
    'A senior accountant returning after a two-year caregiving break, with the close times and audit results that followed.',
  keywords: [
    'senior accountant',
    'CPA resume',
    'month-end close',
    'general ledger accountant',
    'return to work after career break',
    'ASC 606',
    'account reconciliation',
  ],
  guide: {
    why: [
      'The career break is its own dated entry, “Full-time family caregiving”, with the CPA license kept active and 80 hours of continuing education noted, so a reader never has to guess at the gap.',
      'Close speed is the headline: a three-entity monthly close cut “from eleven business days to six” by moving 40 recurring journal entries onto a schedule, the measure a controller cares about most.',
      'Audit results are stated as outcomes, the first clean external audit in four years and an ASC 606 policy accepted without adjustment, which answers any doubt about readiness after a break.',
      'Dollar recoveries, $190k of understated accumulated depreciation and $128k of under-billed common area maintenance, show the reconciliation work paying for itself.',
    ],
    faq: [
      {
        q: 'How do you explain a career break on an accounting resume?',
        a: 'List it as a dated entry with a one-line reason, and show you stayed current: an active CPA license and continuing education hours. Then let the roles after the break show results, so the gap reads as planned.',
      },
      {
        q: 'What should a senior accountant resume include?',
        a: 'Month-end close ownership and days to close, reconciliations, audit outcomes, standards applied such as ASC 606 or US GAAP, and the systems used, like NetSuite or Sage Intacct. Put the CPA in the headline if you hold it.',
      },
      {
        q: 'Should a CPA put the license number on a resume?',
        a: 'No. Name the license and the issuing state board with the year; employers verify it with the board. Mark it active if there has been a break, so the reader does not assume it lapsed.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Marisol Quintero',
      label: 'Senior Accountant, CPA',
      image: '',
      email: 'marisol.quintero@example.com',
      phone: '+1 (555) 0176',
      url: '',
      summary:
        'Senior accountant with seven years on the general ledger across public accounting, real estate and utilities, and a CPA license kept current through a two-year caregiving break. Took a three-entity close from eleven days to six.',
      location: { city: 'Phoenix', region: 'AZ', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'marisolquintero', url: 'https://linkedin.com/in/marisolquintero' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Copperline Utilities',
        position: 'Senior Accountant',
        location: 'Phoenix, AZ',
        url: '',
        startDate: '2023-10',
        endDate: '',
        summary: 'General ledger owner for three entities under one shared services team.',
        highlights: [
          'Owns the monthly close for three entities and took it from eleven business days to six by moving 40 recurring journal entries onto an automated schedule.',
          'Rebuilt the fixed asset register for 2,300 items after a system migration dropped depreciation history, recovering $190k of understated accumulated depreciation.',
          'Led the first clean external audit in four years, closing all nine prior-year management letter comments before fieldwork began.',
          'Wrote the revenue recognition policy for a new metered billing product under ASC 606, which the auditors accepted without adjustment.',
        ],
      },
      {
        id: 'w2',
        name: 'Agave Ridge Property Group',
        position: 'Staff Accountant',
        location: 'Phoenix, AZ',
        url: '',
        startDate: '2021-08',
        endDate: '2023-09',
        summary: '',
        highlights: [
          'Cleared a backlog of 600 unmatched items across 14 property bank accounts within one quarter of starting, then held monthly reconciliations current for two years.',
          'Rewrote the common area maintenance reconciliation for 38 tenants, recovering $128k of under-billed recoveries for the prior year.',
          'Trained two accounts payable clerks on the three-way match, taking duplicate payments from 19 a year to two.',
        ],
      },
      {
        id: 'w3',
        name: 'Career break',
        position: 'Full-time family caregiving',
        location: 'Tucson, AZ',
        url: '',
        startDate: '2019-06',
        endDate: '2021-07',
        summary:
          'Planned break for full-time care of a parent after surgery. CPA license kept active throughout with 80 hours of continuing education.',
        highlights: [],
      },
      {
        id: 'w4',
        name: 'Halvorsen & Pike CPAs',
        position: 'Staff Accountant',
        location: 'Tucson, AZ',
        url: '',
        startDate: '2016-07',
        endDate: '2019-05',
        summary: '',
        highlights: [
          'Prepared about 90 small-business and individual returns each tax season, with 96% clearing partner review on first submission.',
          'Compiled monthly financials for 22 bookkeeping clients and standardized the chart of accounts across the whole portfolio.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Arizona State University',
        area: 'Accountancy',
        studyType: 'B.S.',
        location: 'Tempe, AZ',
        startDate: '2012-08',
        endDate: '2016-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Accounting',
        level: '',
        keywords: [
          'Month-end close',
          'Account reconciliation',
          'Fixed assets',
          'Accruals and prepaids',
          'ASC 606',
          'Audit preparation',
        ],
      },
      {
        id: 's2',
        name: 'Controls and reporting',
        level: '',
        keywords: [
          'US GAAP',
          'Internal controls',
          'Financial statement preparation',
          'Sales and use tax',
          'Variance commentary',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['NetSuite', 'Sage Intacct', 'QuickBooks', 'Yardi', 'Excel', 'Power Query'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Public Accountant (CPA)',
        date: '2018',
        issuer: 'Arizona State Board of Accountancy',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Native', rating: 5 },
    ],
  }),
}

export default sample
