import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Financial crime compliance, where the whole job is measurable: alert
 * quality, backlog, findings closed, training completed. Every bullet picks
 * one of those and says what it was before and after.
 */
export const sample: LibrarySample = {
  slug: 'compliance-officer',
  role: 'Compliance Officer',
  category: 'legal',
  seniority: 'mid',
  region: 'uk',
  template: 'onyx-noir',
  blurb:
    'Financial crime and regulatory compliance told in alert quality, findings closed and remediation delivered on deadline.',
  keywords: [
    'compliance officer',
    'financial crime compliance',
    'AML officer',
    'FCA regulated firm',
    'SMCR',
    'Consumer Duty',
  ],
  content: content({
    basics: {
      name: 'Femi Adebanjo',
      label: 'Compliance Manager, Financial Crime',
      image: '',
      email: 'femi.adebanjo@example.com',
      phone: '+44 7700 900107',
      url: '',
      summary:
        'Compliance professional with nine years in payments and wealth management, the last four owning financial crime for an FCA-authorised e-money firm. Retuned a transaction-monitoring model that cut false positives by 62% while lifting the suspicious-activity conversion rate from 3% to 11%.',
      location: { city: 'London', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'femiadebanjo', url: 'https://linkedin.com/in/femiadebanjo' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Pellworth Payments',
        position: 'Compliance Manager, Financial Crime',
        location: 'London',
        url: '',
        startDate: '2022-05',
        endDate: '',
        summary:
          'Reports to the MLRO. Owns transaction monitoring, sanctions screening and the annual financial crime risk assessment for 1.4 million customers.',
        highlights: [
          'Retuned the monitoring rule set against 18 months of alert outcomes, cutting false positives by 62% and raising the suspicious-activity conversion rate from 3% to 11%.',
          'Rebuilt sanctions screening on fuzzy-match thresholds agreed with the board risk committee, clearing a 4,300-alert backlog in seven weeks.',
          'Wrote the Consumer Duty outcomes-monitoring framework and the first two board reports under it, both accepted without amendment.',
          'Runs the annual financial crime training programme for 380 staff; completion inside the 30-day window rose from 71% to 98%.',
        ],
      },
      {
        id: 'w2',
        name: 'Ashcombe Wealth Management',
        position: 'Compliance Officer',
        location: 'London',
        url: '',
        startDate: '2019-09',
        endDate: '2022-04',
        summary: '',
        highlights: [
          'Closed 34 of 36 findings from a skilled-person review inside the agreed nine months, with the remaining two re-scoped by agreement with the regulator.',
          'Built the certification process for 96 certified staff under the Senior Managers and Certification Regime, evidenced annually against a single register.',
          'Reviewed 1,200 financial promotions a year against the conduct rules and stopped 47 before publication.',
        ],
      },
      {
        id: 'w3',
        name: 'Braemar Trust Services',
        position: 'KYC Analyst',
        location: 'Edinburgh',
        url: '',
        startDate: '2017-06',
        endDate: '2019-08',
        summary: '',
        highlights: [
          'Completed enhanced due diligence on 600 high-risk corporate structures, escalating 38 to the MLRO and exiting nine relationships.',
          'Cut corporate onboarding turnaround from 21 days to 12 by standardising the beneficial-ownership evidence checklist.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Leeds',
        area: 'Economics',
        studyType: 'BSc',
        location: 'Leeds',
        startDate: '2014-09',
        endDate: '2017-06',
        score: 'Upper Second Class Honours (2:1)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Financial crime',
        level: '',
        keywords: [
          'Anti-money laundering',
          'Sanctions screening',
          'Transaction monitoring',
          'Enhanced due diligence',
          'SAR reporting',
        ],
      },
      {
        id: 's2',
        name: 'Regulatory',
        level: '',
        keywords: ['FCA Handbook', 'SMCR', 'Consumer Duty', 'Client assets', 'RegData returns'],
      },
      {
        id: 's3',
        name: 'Assurance',
        level: '',
        keywords: [
          'Compliance monitoring plans',
          'Remediation programmes',
          'Business-wide risk assessment',
          'Policy drafting',
          'Board reporting',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'International Diploma in Anti Money Laundering',
        date: '2021',
        issuer: 'International Compliance Association',
        url: '',
      },
      { id: 'c2', name: 'Certified Anti-Money Laundering Specialist (CAMS)', date: '2019', issuer: 'ACAMS', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Yoruba', fluency: 'Fluent', rating: 4 },
      { id: 'l3', language: 'French', fluency: 'Professional', rating: 3 },
    ],
  }),
}

export default sample
