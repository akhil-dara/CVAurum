import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * An Indian disputes lawyer six years into practice. Written the way a
 * litigator is actually judged: which forum, which relief, what was recovered,
 * and how the docket was kept from slipping.
 */
export const sample: LibrarySample = {
  slug: 'litigation-associate',
  role: 'Litigation Associate',
  category: 'legal',
  seniority: 'mid',
  region: 'india',
  template: 'garnet',
  blurb:
    'A disputes lawyer’s résumé built on forums, relief obtained and amounts recovered — not a list of statutes read in law school.',
  keywords: [
    'litigation associate',
    'disputes lawyer India',
    'advocate resume',
    'Bombay High Court',
    'insolvency IBC',
    'arbitration associate',
  ],
  content: content({
    basics: {
      name: 'Aparna Sathe',
      label: 'Senior Associate, Dispute Resolution',
      image: portrait('Aparna Sathe'),
      email: 'aparna.sathe@example.com',
      phone: '+91 12345 60418',
      url: '',
      summary:
        'Disputes lawyer with six years before the Bombay High Court, the NCLT and domestic arbitral tribunals, the last four running matters end to end. Recovered ₹18.4 crore for an operational creditor through a Section 9 insolvency petition the debtor settled before admission.',
      location: { city: 'Mumbai', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'aparnasathe', url: 'https://linkedin.com/in/aparnasathe' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Sethna Rao & Partners',
        position: 'Senior Associate, Dispute Resolution',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2022-04',
        endDate: '',
        summary: 'Commercial disputes team of eleven. Carries a personal docket of 30 to 35 active matters.',
        highlights: [
          'Recovered ₹18.4 crore for an engineering client through a Section 9 petition under the Insolvency and Bankruptcy Code, settled by the debtor before admission.',
          'Argued 60 interim applications before the Bombay High Court and the City Civil Court, obtaining ad-interim relief in 41 of them.',
          'Standardised the brief-preparation format for senior counsel, taking turnaround from six days to two across the disputes team.',
          'Mentors three junior associates and reviews every pleading before filing; drafts returned by senior counsel fell from four rounds to one.',
        ],
      },
      {
        id: 'w2',
        name: 'Bhavsar & Naik, Advocates',
        position: 'Associate',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2019-08',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Handled 120 cheque-dishonour prosecutions under Section 138 of the Negotiable Instruments Act for a non-banking lender, closing 88 by compounding within 14 months.',
          'Drafted the statement of claim and evidence affidavits in a ₹42 crore construction arbitration seated in Mumbai, settled after cross-examination on the tribunal’s suggestion.',
          'Built the cause-list tracker the firm still uses after two listings were missed; no listing has been missed since.',
        ],
      },
      {
        id: 'w3',
        name: 'Chambers of R. K. Ghatge, Senior Advocate',
        position: 'Junior Counsel',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2018-08',
        endDate: '2019-07',
        summary: '',
        highlights: [
          'Researched and drafted 45 written submissions in writ petitions before the Bombay High Court, nine of which were adopted verbatim at final arguments.',
          'Compiled the chamber’s standing note bank on service and indirect tax matters, still the first stop for new briefs.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Symbiosis Law School, Pune',
        area: 'Law',
        studyType: 'B.A. LL.B. (Hons.)',
        location: 'Pune, Maharashtra',
        startDate: '2013-07',
        endDate: '2018-05',
        score: 'CGPA 8.1/10',
        url: '',
        summary: 'Associate editor of the student law review; national moot court finalist in 2016 and 2017.',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Dadar Legal Aid Desk',
        position: 'Volunteer Advocate',
        url: '',
        startDate: '2020-01',
        endDate: '',
        summary: '',
        highlights: [
          'Appears without fee for complainants under the Protection of Women from Domestic Violence Act, 2005; 22 protection orders obtained since 2020.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Forums',
        level: '',
        keywords: [
          'Bombay High Court',
          'NCLT Mumbai',
          'City Civil Court',
          'Domestic arbitration',
          'Consumer commissions',
        ],
      },
      {
        id: 's2',
        name: 'Practice areas',
        level: '',
        keywords: [
          'Commercial suits',
          'Insolvency and bankruptcy',
          'Recovery and NI Act',
          'Contract disputes',
          'Writ petitions',
        ],
      },
      {
        id: 's3',
        name: 'Drafting',
        level: '',
        keywords: [
          'Plaints and written statements',
          'Interim applications',
          'Statements of claim',
          'Legal notices',
          'Written submissions',
        ],
      },
      {
        id: 's4',
        name: 'Research',
        level: '',
        keywords: ['SCC Online', 'Manupatra', 'e-Courts case status', 'Case digests'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'All India Bar Examination', date: '2018', issuer: 'Bar Council of India', url: '' },
      { id: 'c2', name: 'Enrolled Advocate', date: '2018', issuer: 'Bar Council of Maharashtra and Goa', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
