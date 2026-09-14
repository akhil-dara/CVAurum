import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A newly qualified Chartered Accountant. The articleship is the longest thing
 * on the page, so it is written as assignments finished and money found rather
 * than as a training period, and the qualification sits in education where an
 * Indian reader looks for it first.
 */
export const sample: LibrarySample = {
  slug: 'audit-associate',
  role: 'Audit Associate',
  category: 'finance',
  seniority: 'entry',
  region: 'india',
  template: 'garamond',
  blurb:
    'Three years of articleship and a first statutory audit led end to end, written the way a newly qualified CA should.',
  keywords: [
    'audit associate',
    'chartered accountant fresher',
    'statutory audit',
    'Ind AS',
    'CA resume',
    'internal audit',
    'GST reconciliation',
  ],
  content: content({
    basics: {
      name: 'Sanika Kulkarni',
      label: 'Audit Associate | Chartered Accountant',
      image: '',
      email: 'sanika.kulkarni@example.com',
      phone: '+91 12345 60482',
      url: '',
      summary:
        'Chartered Accountant with a three-year articleship and two years of statutory audit across manufacturing and NBFC clients. Led the field team on a ₹740 crore turnover audit and closed fieldwork four days before the filing deadline.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'sanikakulkarni', url: 'https://linkedin.com/in/sanikakulkarni' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Anvaya Assurance LLP',
        position: 'Audit Associate',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-09',
        endDate: '',
        summary: 'Statutory audit of listed manufacturing and NBFC clients reporting under Ind AS.',
        highlights: [
          'Led a field team of three on the statutory audit of a ₹740 crore auto-components client, closing fieldwork four days before the filing deadline.',
          'Traced a ₹1.2 crore revenue cut-off misstatement to despatch records at two plants; the client restated before the audit report was signed.',
          'Replaced judgemental inventory testing at a 9,000-SKU warehouse with stratified sampling, cutting count time from six days to two at the same coverage.',
          'Reviews Ind AS 115 workpapers for two articled assistants before they go to the engagement partner.',
        ],
      },
      {
        id: 'w2',
        name: 'Ramanathan Bhave & Co., Chartered Accountants',
        position: 'Articled Assistant',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2021-08',
        endDate: '2024-07',
        summary: '',
        highlights: [
          'Completed 31 statutory and tax audit assignments across textiles, hospitality and co-operative banking during the articleship.',
          'Built the GST reconciliation workbook the firm still issues to clients, recovering ₹38 lakh of unclaimed input credit for a single manufacturing client.',
          'Drafted internal audit reports for a 40-branch retail chain, documenting cash-handling gaps at seven branches that were closed within the quarter.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Institute of Chartered Accountants of India',
        area: 'Chartered Accountancy',
        studyType: 'CA',
        location: 'Pune, Maharashtra',
        startDate: '2021-08',
        endDate: '2024-11',
        score: 'Both groups cleared at first attempt',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Fergusson College, Savitribai Phule Pune University',
        area: 'Commerce (Accounting and Finance)',
        studyType: 'B.Com',
        location: 'Pune, Maharashtra',
        startDate: '2018-06',
        endDate: '2021-05',
        score: '8.4 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Audit and assurance',
        level: '',
        keywords: [
          'Statutory audit',
          'Ind AS',
          'Internal financial controls',
          'Risk-based sampling',
          'Audit documentation',
          'Physical verification',
        ],
      },
      {
        id: 's2',
        name: 'Tax and compliance',
        level: '',
        keywords: ['GST returns', 'Form 3CD tax audit', 'TDS', 'Companies Act 2013', 'ROC filings'],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['SAP FICO', 'Tally Prime', 'Excel', 'CaseWare', 'ClearTax'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Diploma in Information Systems Audit (DISA)',
        date: '2025',
        issuer: 'The Institute of Chartered Accountants of India',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
