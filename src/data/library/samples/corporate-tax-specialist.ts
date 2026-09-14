import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Practice, a nine-month in-house contract, then practice again. The interim
 * role is labelled as a contract so nobody has to guess why it lasted nine
 * months, and every tax bullet ends in a figure recovered or an enquiry closed,
 * because that is the only evidence a tax hirer can act on.
 */
export const sample: LibrarySample = {
  slug: 'corporate-tax-specialist',
  role: 'Corporate Tax Specialist',
  category: 'finance',
  seniority: 'mid',
  region: 'uk',
  template: 'academic',
  blurb:
    'Corporate tax across practice and an in-house contract, with every claim and enquiry written as a figure recovered.',
  keywords: [
    'corporate tax specialist',
    'tax senior',
    'CT600 compliance',
    'R&D tax relief',
    'ACCA CTA',
    'capital allowances',
    'HMRC enquiry',
  ],
  content: content({
    basics: {
      name: 'Yasmin Okonkwo',
      label: 'Corporate Tax Senior, ACCA CTA',
      image: '',
      email: 'yasmin.okonkwo@example.com',
      phone: '+44 7700 900114',
      url: '',
      summary:
        'Corporate tax specialist with eight years in practice and in-house, covering compliance and the relief claims that sit on top of it. Recovered £412,000 across three R&D claims, one defended through an HMRC enquiry without reduction.',
      location: { city: 'Birmingham', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'yasminokonkwo', url: 'https://linkedin.com/in/yasminokonkwo' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Tredwell Marsh LLP',
        position: 'Corporate Tax Senior',
        location: 'Birmingham',
        url: '',
        startDate: '2023-02',
        endDate: '',
        summary: 'Corporate tax compliance and advisory for 46 owner-managed companies across the Midlands.',
        highlights: [
          'Manages the full compliance cycle for 46 companies and filed every CT600 of the 2025 cycle on time, with no late-filing penalties across the portfolio.',
          'Recovered £412,000 across three R&D claims in advanced manufacturing, including one defended to closure through an HMRC enquiry without reduction.',
          'Reorganised a nine-company group onto a consolidated payment arrangement, cutting quarterly instalment interest by £27,000 a year.',
          'Wrote the firm briefing on full expensing and trained 14 staff on applying it to capital allowances claims.',
        ],
      },
      {
        id: 'w2',
        name: 'Winterbourne Housing Group',
        position: 'Interim Tax Accountant (nine-month contract)',
        location: 'Birmingham',
        url: '',
        startDate: '2022-04',
        endDate: '2022-12',
        summary: '',
        highlights: [
          'Delivered the first in-house corporation tax computation for a 4,200-home housing group, ending a £38,000 annual outsourcing fee.',
          'Agreed a revised partial exemption special method with HMRC, recovering £96,000 of input tax the previous method had blocked.',
          'Documented the Senior Accounting Officer controls for tax, which the group auditors signed off without qualification.',
        ],
      },
      {
        id: 'w3',
        name: 'Quarrie & Fenn LLP',
        position: 'Tax Semi-Senior',
        location: 'Nottingham',
        url: '',
        startDate: '2018-09',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Prepared roughly 180 corporation tax computations a year across retail, hospitality and property clients.',
          'Identified £310,000 of capital allowances on a hotel refurbishment the client had treated wholly as repairs.',
          'Passed all thirteen ACCA examinations while carrying a full compliance caseload.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Ladywood Reading Trust',
        position: 'Honorary Treasurer',
        url: '',
        startDate: '2021-01',
        endDate: '',
        summary: '',
        highlights: [
          'Prepares the annual accounts and independent examination pack for a literacy charity with £240,000 of income, filed with the Charity Commission on time for four consecutive years.',
          'Introduced a restricted funds tracker that ended the year-end reallocation of about £30,000 of grant income.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Leeds',
        area: 'Accounting and Finance',
        studyType: 'BA',
        location: 'Leeds',
        startDate: '2015-09',
        endDate: '2018-06',
        score: 'Upper Second Class Honours (2:1)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Corporate tax',
        level: '',
        keywords: [
          'CT600 compliance',
          'R&D tax relief',
          'Capital allowances',
          'Group relief',
          'Quarterly instalment payments',
          'Loss planning',
        ],
      },
      {
        id: 's2',
        name: 'Wider tax',
        level: '',
        keywords: [
          'VAT partial exemption',
          'HMRC enquiries',
          'Senior Accounting Officer',
          'Employment taxes',
          'Charity taxation',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['Alphatax', 'CCH', 'Xero', 'Sage 50', 'Excel', 'Power Query'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Chartered Tax Adviser (CTA)',
        date: '2024',
        issuer: 'Chartered Institute of Taxation',
        url: '',
      },
      {
        id: 'c2',
        name: 'Chartered Certified Accountant (ACCA)',
        date: '2021',
        issuer: 'ACCA',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'French', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
