import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A career changer: a mechanical engineering degree, an MBA in finance, and
 * then eight years of treasury. The switch is never apologised for anywhere in
 * the text — the education block simply states both degrees and the bullets
 * carry basis points, idle cash and hedge outcomes, which is what a treasury
 * reader is scanning for.
 */
export const sample: LibrarySample = {
  slug: 'treasury-analyst',
  role: 'Treasury Analyst',
  category: 'finance',
  seniority: 'mid',
  region: 'india',
  template: 'slate',
  blurb:
    'Treasury across an Indian manufacturer and an NBFC, measured in basis points saved and idle cash taken off the books.',
  keywords: [
    'treasury analyst',
    'corporate treasury India',
    'cash flow forecasting',
    'debt refinancing',
    'forex hedging',
    'asset liability management',
    'MBA finance',
  ],
  guide: {
    why: [
      'The summary leads with the refinancing a treasurer asks about first, ₹380 crore of term debt at 85 basis points below the prior rate, and the bullet adds the ₹3.2 crore a year it saves.',
      'Cash forecasting is measured in idle money, balances taken “from ₹64 crore to ₹18 crore” with ₹1.4 crore a year of yield added, which turns a 13-week forecast into a result.',
      'The engineering-to-finance switch is never explained away: the B.E. from College of Engineering Guindy and the MBA from Great Lakes Institute of Management simply sit together, and the bullets make the case.',
      'Regulatory work at Neytal Finance Limited, quarterly asset-liability statements for the Reserve Bank of India and a 1-to-30-day bucket gap closed, shows NBFC treasury experience beyond corporate cash.',
    ],
    faq: [
      {
        q: 'What should a treasury analyst resume include?',
        a: 'Debt book size, refinancing or borrowing cost in basis points, cash forecasting accuracy or idle balances, hedging outcomes and regulatory filings. Name the systems you used, such as SAP Treasury or Kyriba, in a skills group.',
      },
      {
        q: 'Should a treasury resume in India mention CFA levels passed?',
        a: 'Yes, state the exact level, such as passed Level II of the CFA Program, with the year. Do not write CFA alone unless you hold the charter; Indian finance employers check.',
      },
      {
        q: 'Should an engineer moving into finance explain the switch on a resume?',
        a: 'No explanation is needed if the MBA and the finance roles carry results. List both degrees plainly, put finance experience first, and let a line such as a refinancing in basis points show the fit.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Karthik Raghavan',
      label: 'Senior Treasury Analyst',
      image: '',
      email: 'karthik.raghavan@example.com',
      phone: '+91 12345 71930',
      url: '',
      summary:
        'Treasury professional with eight years across manufacturing and non-banking finance, covering debt, liquidity and currency risk. Refinanced ₹380 crore of term debt at 85 basis points below the prior rate.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'karthikraghavan', url: 'https://linkedin.com/in/karthikraghavan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Marudham Auto Components Limited',
        logo: brandmark('Marudham Auto Components Limited'),
        position: 'Senior Treasury Analyst',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2023-05',
        endDate: '',
        summary: 'Treasury for a listed components maker with ₹1,100 crore of debt across nine lenders.',
        highlights: [
          'Manages the debt book across nine lenders, including covenant testing and the quarterly lender pack that goes to the audit committee.',
          'Refinanced ₹380 crore of term loans at 85 basis points below the prior rate, cutting annual interest cost by ₹3.2 crore.',
          'Built a 13-week rolling cash forecast across 11 bank accounts, taking idle balances from ₹64 crore to ₹18 crore and adding ₹1.4 crore a year in yield.',
          'Hedged $14 million of import exposure with forwards under a board-approved policy, holding realised currency loss to 0.3% against a 2.1% unhedged move.',
          'Cut bank charges 22% by consolidating collections onto two cash management banks and renegotiating the mandate slab.',
        ],
      },
      {
        id: 'w2',
        name: 'Neytal Finance Limited',
        logo: brandmark('Neytal Finance Limited'),
        position: 'Treasury Analyst',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2020-06',
        endDate: '2023-04',
        summary: '',
        highlights: [
          'Ran daily liquidity for a ₹2,400 crore loan book through the 2022 rate cycle without one drawdown on the overdraft line.',
          'Prepared the quarterly asset-liability statements filed with the Reserve Bank of India, closing a structural gap in the 1-to-30-day bucket that had been flagged twice.',
          'Placed ₹210 crore of commercial paper across four issuances, pricing the last 40 basis points inside the first.',
        ],
      },
      {
        id: 'w3',
        name: 'Sevanti Chemicals Limited',
        logo: brandmark('Sevanti Chemicals Limited'),
        position: 'Finance Executive',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2018-07',
        endDate: '2020-05',
        summary: '',
        highlights: [
          'Cut days sales outstanding from 74 to 51 by putting a credit-limit check into the order release workflow for 320 dealers.',
          'Reconciled 36 bank accounts each month and cleared a ₹90 lakh suspense balance that had been carried for three years.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Great Lakes Institute of Management',
        area: 'Finance',
        studyType: 'MBA',
        location: 'Chennai, Tamil Nadu',
        startDate: '2016-06',
        endDate: '2018-04',
        score: '8.1 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'College of Engineering Guindy, Anna University',
        area: 'Mechanical Engineering',
        studyType: 'B.E.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2012-07',
        endDate: '2016-05',
        score: '78%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Treasury',
        level: '',
        keywords: [
          'Cash flow forecasting',
          'Debt refinancing',
          'Working capital',
          'Covenant compliance',
          'Bank relationship management',
          'Commercial paper',
        ],
      },
      {
        id: 's2',
        name: 'Markets and risk',
        level: '',
        keywords: [
          'Currency forwards',
          'Interest rate swaps',
          'Asset-liability management',
          'Liquidity coverage',
          'Counterparty limits',
        ],
      },
      {
        id: 's3',
        name: 'Regulatory',
        level: '',
        keywords: ['RBI ALM returns', 'FEMA', 'Ind AS 109', 'Companies Act 2013'],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['SAP Treasury', 'Kyriba', 'Oracle ERP', 'Excel', 'Power BI', 'Bloomberg Terminal'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Treasury Professional (CTP)',
        date: '2024',
        issuer: 'Association for Financial Professionals',
        url: '',
      },
      { id: 'c2', name: 'Passed Level II of the CFA Program', date: '2023', issuer: 'CFA Institute', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
