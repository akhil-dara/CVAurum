import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * The leanest page in this category, deliberately. A distance-learning B.Com
 * and two part-time jobs, and nothing else: six real things, each with a
 * figure behind it, beats a padded page every time.
 */
export const sample: LibrarySample = {
  slug: 'junior-accounts-executive',
  role: 'Junior Accounts Executive',
  category: 'student',
  seniority: 'student',
  region: 'india',
  template: 'compact',
  blurb:
    'B.Com by distance while keeping the books part-time for a Rs 4.2 crore business, and applying for a first full-time role.',
  keywords: [
    'accounts executive fresher resume',
    'B.Com student resume',
    'part-time work resume',
    'Tally GST resume',
    'first job resume India',
    'accounting fresher',
  ],
  guide: {
    why: [
      'Part-time work is treated as real accounting: about 380 vouchers a month in Tally and books closed by the fourth working day, down from the eleventh.',
      'One result shows judgement beyond data entry: Rs 6.8 lakh of unmatched GST input credit reconciled and recovered in the 2025-26 filings.',
      'The CA Foundation (cleared) certificate and the B.Com (Hons) by distance from the University of Delhi are both shown, explaining how study and work fit together.',
      'Even the evening counter job at Shanti Sweets and Bakers carries a result, closing the till to the rupee across ten months, which signals accuracy with cash.',
    ],
    faq: [
      {
        q: 'What should an accounts fresher resume include in India?',
        a: 'Education with percentages, any accounting work including part-time or family business, software such as Tally Prime and Excel, and GST or TDS tasks you have handled. Add CA Foundation or similar exams if cleared.',
      },
      {
        q: 'Should part-time jobs go on a fresher resume?',
        a: 'Yes, especially if they involve accounts, cash or customers. Give each one a measured result, such as books closed faster or receivables reduced.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Jyoti Rathore',
      label: 'B.Com Student and Part-Time Accounts Assistant',
      image: '',
      email: 'jyoti.rathore@example.com',
      phone: '+91 12345 88301',
      url: '',
      summary:
        'Third-year B.Com student keeping the books part-time for a furnishings business turning over Rs 4.2 crore a year, and cleared the CA Foundation in November 2025. Recovered Rs 6.8 lakh of unmatched GST input credit that two years of filings had left behind.',
      location: { city: 'New Delhi', region: 'Delhi', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'jyotirathore', url: 'https://linkedin.com/in/jyotirathore' }],
    },
    education: [
      {
        id: 'e1',
        institution: 'School of Open Learning, University of Delhi',
        area: 'Commerce',
        studyType: 'B.Com (Hons)',
        location: 'New Delhi, Delhi',
        startDate: '2024-07',
        endDate: '2027-05',
        score: '76.4% across four semesters',
        url: '',
        summary: 'Studied by distance while working; classes on Sundays.',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Corporate Accounting',
          'Income Tax Law and Practice',
          'Cost Accounting',
          'Goods and Services Tax',
          'Auditing',
        ],
      },
      {
        id: 'e2',
        institution: 'Kendriya Vidyalaya, R.K. Puram',
        area: 'Commerce with Accountancy and Economics',
        studyType: 'Class XII, CBSE',
        location: 'New Delhi, Delhi',
        startDate: '2022-04',
        endDate: '2024-03',
        score: '82.6%',
        url: '',
        summary: '',
        status: 'completed',
        level: 'intermediate',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Ambika Furnishings',
        position: 'Accounts Assistant (part-time)',
        location: 'New Delhi, Delhi',
        url: '',
        startDate: '2025-06',
        endDate: '',
        summary: 'Six mornings a week for a wholesale furnishings business, Rs 4.2 crore annual turnover.',
        highlights: [
          'Posts about 380 vouchers a month in Tally and closes the books by the fourth working day, down from the eleventh.',
          'Reconciled two years of unmatched GST input credit worth Rs 6.8 lakh, which the firm recovered in the 2025-26 filings.',
          'Cut monthly GSTR-1 preparation from three days to six hours with a sales-register template that maps straight to the return format.',
          'Chases receivables every Monday; invoices overdue past 60 days fell from Rs 31 lakh to Rs 9 lakh in a year.',
        ],
      },
      {
        id: 'w2',
        name: 'Shanti Sweets and Bakers',
        position: 'Counter Assistant (evenings)',
        location: 'New Delhi, Delhi',
        url: '',
        startDate: '2024-08',
        endDate: '2025-05',
        summary: '',
        highlights: [
          'Handled the evening counter and cash till through a 200-customer rush and closed the day to the rupee across ten months.',
          'Set up a pre-order register for festival boxes that took 140 orders in one Diwali week without a single mix-up.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Accounting',
        level: '',
        keywords: ['Tally Prime', 'Journal entries', 'Bank reconciliation', 'Accounts receivable', 'Trial balance'],
      },
      {
        id: 's2',
        name: 'Compliance',
        level: '',
        keywords: ['GSTR-1 and GSTR-3B', 'TDS deduction', 'E-way bills', 'Form 26AS matching'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Excel pivot tables', 'VLOOKUP', 'Google Sheets', 'Zoho Books'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'CA Foundation (cleared)',
        date: '2025',
        issuer: 'Institute of Chartered Accountants of India',
        url: '',
      },
      { id: 'c2', name: 'Tally Prime with GST', date: '2025', issuer: 'Tally Education', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Professional', rating: 4 },
      { id: 'l3', language: 'Punjabi', fluency: 'Conversational', rating: 3 },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'certificates', 'skills', 'languages']
    m.layout.headings = { ...m.layout.headings, work: 'Part-Time Work' }
  },
}

export default sample
