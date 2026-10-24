import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * The route into banking that nobody puts on a milkround poster: audit, then
 * transaction services, then the deal floor. Each engagement is written as the
 * number it moved — a multiple, a premium, a count of parties contacted — which
 * is the only currency a deal CV trades in.
 */
export const sample: LibrarySample = {
  slug: 'investment-banking-analyst',
  role: 'Investment Banking Analyst',
  category: 'finance',
  seniority: 'mid',
  region: 'uk',
  template: 'broadsheet',
  blurb:
    'Mid-market M&A told deal by deal, by an analyst who arrived through transaction services rather than a graduate scheme.',
  keywords: [
    'investment banking analyst',
    'M&A analyst',
    'mergers and acquisitions',
    'LBO modelling',
    'transaction services',
    'ACA ICAEW',
    'CFA candidate',
  ],
  guide: {
    why: [
      'Deals are told one by one with size and outcome: a £310m carve-out signed at 8.4x EBITDA against an initial range of 7.2x to 7.9x, which is how deal teams discuss their own work.',
      'Process metrics show the analyst ran the work: 74 parties approached, 11 NDAs signed and four binding offers on the £95m sale.',
      'The route through transaction services at Ashdown Levett LLP is presented as an asset, 19 buy-side diligence engagements and a £2.1m EBITDA normalisation that reset a price.',
      'Qualifications are compact and relevant: the ACA from ICAEW passed at first attempt, CFA progress, and a First from the University of Warwick.',
    ],
    faq: [
      {
        q: 'How long should an investment banking CV be in the UK?',
        a: 'One page. Banks expect a tight CV with deals listed by size, sector and your role. Education goes near the top for analysts, with grades.',
      },
      {
        q: 'Should an investment banking CV list deal values?',
        a: 'Yes, where they are public or can be described without naming the client, such as a £310m packaging carve-out. Give your role in each deal and one result, like the multiple achieved.',
      },
      {
        q: 'Can you move into investment banking from audit or transaction services?',
        a: 'Yes, and a CV should show it plainly: diligence engagements, modelling work and chartered status such as ACA. Lead with the deal work, not audit duties.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Callum Wetherby',
      label: 'Investment Banking Analyst, M&A',
      image: '',
      email: 'callum.wetherby@example.com',
      phone: '+44 7700 900163',
      url: '',
      summary:
        'M&A analyst covering mid-market industrials and business services, with four years in transaction services before the deal floor. Built the operating model on a £310m packaging carve-out that closed at 8.4x EBITDA in March 2026.',
      location: { city: 'London', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'callumwetherby', url: 'https://linkedin.com/in/callumwetherby' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Thamesreach Partners',
        logo: brandmark('Thamesreach Partners'),
        position: 'Investment Banking Analyst',
        location: 'London',
        url: '',
        startDate: '2023-04',
        endDate: '',
        summary: 'Mid-market M&A across industrials and business services, in deal teams of four.',
        highlights: [
          'Built the operating model and DCF on a £310m carve-out of a packaging division, which signed at 8.4x EBITDA against an initial range of 7.2x to 7.9x.',
          'Ran buyer outreach on a £95m business services sale, approaching 74 parties and converting 11 to signed NDAs and four binding offers.',
          'Wrote the information memorandum for a founder-owned engineering group; the process closed 22% above the indicative range set at kick-off.',
          'Rebuilt the sector comparables library as one refreshable workbook, taking a pitch valuation page from a full day to under two hours.',
          'Reviews first-draft models for two graduate analysts and runs the monthly modelling clinic the intake now sits through.',
        ],
      },
      {
        id: 'w2',
        name: 'Ashdown Levett LLP',
        logo: brandmark('Ashdown Levett LLP'),
        position: 'Assistant Manager, Transaction Services',
        location: 'Leeds',
        url: '',
        startDate: '2021-09',
        endDate: '2023-03',
        summary: '',
        highlights: [
          'Delivered 19 buy-side due diligence engagements, including a £140m distribution platform where a £2.1m normalisation to EBITDA reset the headline price.',
          'Standardised the quality-of-earnings workbook used across the Leeds team, taking a first draft from four days to a day and a half.',
          'Trained six graduates on working capital normalisation ahead of the 2022 intake.',
        ],
      },
      {
        id: 'w3',
        name: 'Ashdown Levett LLP',
        logo: brandmark('Ashdown Levett LLP'),
        position: 'Audit Associate',
        location: 'Leeds',
        url: '',
        startDate: '2019-09',
        endDate: '2021-08',
        summary: '',
        highlights: [
          'Owned revenue and inventory sections on 14 manufacturing and retail audits under FRS 102, on engagements up to £220m of turnover.',
          'Passed all fifteen ACA examinations at first attempt while carrying a full audit caseload.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Warwick',
        area: 'Economics',
        studyType: 'BSc',
        location: 'Coventry',
        startDate: '2016-09',
        endDate: '2019-07',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Deal execution',
        level: '',
        keywords: [
          'Sell-side M&A',
          'Buy-side due diligence',
          'Information memoranda',
          'Data room management',
          'Bid process management',
        ],
      },
      {
        id: 's2',
        name: 'Valuation',
        level: '',
        keywords: [
          'DCF',
          'LBO modelling',
          'Trading comparables',
          'Precedent transactions',
          'Accretion and dilution',
          'Quality of earnings',
        ],
      },
      {
        id: 's3',
        name: 'Technical',
        level: '',
        keywords: ['Excel', 'VBA', 'Python', 'Capital IQ', 'PowerPoint', 'FRS 102 and IFRS'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Chartered Accountant (ACA)', date: '2021', issuer: 'ICAEW', url: '' },
      { id: 'c2', name: 'Passed Level II of the CFA Program', date: '2025', issuer: 'CFA Institute', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'French', fluency: 'Professional working', rating: 3 },
    ],
  }),
}

export default sample
