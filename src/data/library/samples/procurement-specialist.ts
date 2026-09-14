import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * Mid level, UK, British spelling throughout. A nine-month fixed-term contract
 * sits in the middle of the history and is labelled as one, which is what a
 * reader wants: a named contract reads as a choice, an unexplained one as a gap.
 */
export const sample: LibrarySample = {
  slug: 'procurement-specialist',
  role: 'Procurement Specialist',
  category: 'operations',
  seniority: 'mid',
  region: 'uk',
  template: 'double-colored',
  blurb:
    'Six years of indirect buying: tenders won on cost, suppliers consolidated, and the governance that survives an audit.',
  keywords: [
    'procurement specialist',
    'indirect procurement',
    'category management',
    'supplier negotiation',
    'MCIPS',
    'cost savings',
    'tendering',
  ],
  content: content({
    basics: {
      name: 'Imogen Farrell',
      label: 'Procurement Specialist (Indirect)',
      image: portrait('Imogen Farrell'),
      email: 'imogen.farrell@example.com',
      phone: '+44 7700 900198',
      url: '',
      summary:
        'Procurement specialist with six years buying indirect categories for manufacturing and facilities. Runs a £14m book across facilities, MRO, logistics and professional services, and has taken £1.9m out of annual spend without a service level moving.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'imogenfarrell', url: 'https://linkedin.com/in/imogenfarrell' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Brightmoor Industrial Group',
        position: 'Procurement Specialist (Indirect)',
        location: 'Manchester',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary:
          'Indirect categories worth £14m a year across nine UK sites: facilities, MRO, logistics and professional services.',
        highlights: [
          'Delivered £1.9m of annualised savings across three competitive tenders, each figure signed off by finance against the prior-year baseline.',
          'Consolidated 240 MRO suppliers to 46, cutting purchase-order volume by 61% and shortening requisition-to-order from nine days to two.',
          'Introduced a quarterly supplier scorecard on delivery, quality and responsiveness; on-time-in-full across the top 20 suppliers rose from 82% to 94%.',
          'Wrote the modern slavery and environmental questionnaire now issued with every tender above £50k, closing an audit action open for two years.',
        ],
      },
      {
        id: 'w2',
        name: 'Tenby & Crowe',
        position: 'Procurement Officer (fixed-term contract)',
        location: 'Leeds',
        url: '',
        startDate: '2021-11',
        endDate: '2022-08',
        summary: 'Nine-month fixed-term contract covering a purchasing system migration.',
        highlights: [
          'Migrated 3,800 supplier records and 1,200 live contracts into the new purchasing module with no missed payment run.',
          'Cleared a backlog of 640 unapproved invoices in seven weeks and recovered £96k of duplicated payments.',
        ],
      },
      {
        id: 'w3',
        name: 'Harlow Vale Foods',
        position: 'Buyer',
        location: 'Preston',
        url: '',
        startDate: '2018-08',
        endDate: '2021-10',
        summary: '',
        highlights: [
          'Bought packaging and ingredients worth £6m a year; renegotiated the corrugate agreement to hold price flat through a 19% market rise.',
          'Cut stockouts on 40 core lines from 23 a month to four by moving three suppliers onto call-off agreements with agreed lead times.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Trafford Community Food Hub',
        position: 'Supply Volunteer',
        url: '',
        startDate: '2023-02',
        endDate: '',
        summary: '',
        highlights: [
          'Sources surplus stock from four wholesalers; monthly food parcels distributed rose from 550 to 900 in eighteen months.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Manchester',
        area: 'Business Management',
        studyType: 'BSc (Hons)',
        location: 'Manchester',
        startDate: '2015-09',
        endDate: '2018-06',
        score: '2:1',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Categories',
        level: '',
        keywords: ['Indirect spend', 'MRO', 'Facilities', 'Logistics', 'Professional services', 'Packaging'],
      },
      {
        id: 's2',
        name: 'Commercial',
        level: '',
        keywords: [
          'Competitive tendering',
          'Contract negotiation',
          'Should-cost analysis',
          'Call-off agreements',
          'Supplier scorecards',
        ],
      },
      {
        id: 's3',
        name: 'Governance',
        level: '',
        keywords: ['Modern Slavery Act compliance', 'Supplier due diligence', 'Contract renewals', 'Audit evidence'],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['SAP Ariba', 'Coupa', 'Power BI', 'Advanced Excel'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'MCIPS (Chartered Member)',
        date: '2023',
        issuer: 'Chartered Institute of Procurement & Supply',
        url: '',
      },
      {
        id: 'c2',
        name: 'Level 4 Diploma in Procurement and Supply',
        date: '2020',
        issuer: 'Chartered Institute of Procurement & Supply',
        url: '',
      },
    ],
  }),
}

export default sample
