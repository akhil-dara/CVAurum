import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Senior, India. A warehouse is one of the few jobs where every claim already
 * has a number attached on the floor — units per day, shrinkage, dock-to-stock,
 * days without an injury — so the résumé's job is simply to use them.
 */
export const sample: LibrarySample = {
  slug: 'warehouse-manager',
  role: 'Warehouse Manager',
  category: 'operations',
  seniority: 'senior',
  region: 'india',
  template: 'cascade',
  blurb:
    'Eleven years of distribution centres, told in units dispatched a day, shrinkage, dock-to-stock and days without an injury.',
  keywords: [
    'warehouse manager',
    'distribution centre operations',
    'inventory accuracy',
    'WMS implementation',
    'shrinkage control',
    'warehouse safety',
    'FMCG logistics',
  ],
  content: content({
    basics: {
      name: 'Arvind Deshpande',
      label: 'Warehouse Manager',
      image: '',
      email: 'arvind.deshpande@example.com',
      phone: '+91 12345 71460',
      url: '',
      summary:
        'Warehouse manager with eleven years running distribution centres for FMCG and e-commerce. Runs a 2.4 lakh sq ft site of 260 staff where daily dispatch has grown from 38,000 to 61,000 units in the same footprint and shrinkage sits at 0.07% of dispatched value.',
      location: { city: 'Bhiwandi', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'arvinddeshpande', url: 'https://linkedin.com/in/arvinddeshpande' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Verdant Rowe Distribution',
        position: 'Warehouse Manager',
        location: 'Bhiwandi, Maharashtra',
        url: '',
        startDate: '2021-05',
        endDate: '',
        summary:
          'A 2.4 lakh sq ft FMCG distribution centre: 260 staff across three shifts, 61,000 units dispatched a day.',
        highlights: [
          'Lifted daily dispatch from 38,000 to 61,000 units in the same footprint by re-slotting the pick face to velocity and moving to wave picking.',
          'Brought shrinkage from 0.42% to 0.07% of dispatched value with daily blind cycle counts and a two-person seal check at the dock.',
          'Cut dock-to-stock from 14 hours to 3.5 by booking inbound appointments and pre-allocating putaway locations before the vehicle arrives.',
          'Cut agency labour from 38% to 12% of shift hours by building a trained flex pool from local hiring, saving ₹1.1 crore a year.',
          'Holds 1,040 days without a lost-time injury, on a site that averaged nine reportable incidents a year before the forklift licensing programme.',
        ],
      },
      {
        id: 'w2',
        name: 'Kalindi Supply Services',
        position: 'Assistant Warehouse Manager',
        location: 'Chakan, Maharashtra',
        url: '',
        startDate: '2016-08',
        endDate: '2021-04',
        summary: '',
        highlights: [
          'Commissioned a 90,000 sq ft site from empty shell to first dispatch in 11 weeks, hiring and training 85 staff along the way.',
          'Raised inventory record accuracy from 93.4% to 99.6% by replacing the annual stock-take with rolling ABC cycle counts.',
          'Took picking errors from 1,800 to 310 per lakh lines by moving from paper pick lists to handheld scanning.',
        ],
      },
      {
        id: 'w3',
        name: 'Marwar Logistics Park',
        position: 'Shift Supervisor',
        location: 'Nagpur, Maharashtra',
        url: '',
        startDate: '2013-07',
        endDate: '2016-07',
        summary: '',
        highlights: [
          'Ran a 40-person night shift dispatching 900 orders a night at 98.1% on-time vehicle departure.',
          'Cut vehicle detention charges by ₹18 lakh a year by re-sequencing loading against carrier cut-off times.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Indira Gandhi National Open University',
        area: 'Operations Management',
        studyType: 'MBA',
        location: 'Distance learning',
        startDate: '2017-07',
        endDate: '2019-06',
        score: '68%',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Rashtrasant Tukadoji Maharaj Nagpur University',
        area: 'Mechanical Engineering',
        studyType: 'B.E.',
        location: 'Nagpur, Maharashtra',
        startDate: '2009-07',
        endDate: '2013-05',
        score: '72%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Warehouse operations',
        level: '',
        keywords: [
          'Slotting and pick-face design',
          'Wave picking',
          'Dock scheduling',
          'Cross-docking',
          'Cycle counting',
          'Site commissioning',
        ],
      },
      {
        id: 's2',
        name: 'People and safety',
        level: '',
        keywords: [
          'Shift planning',
          'Flex-pool hiring',
          'Forklift licensing',
          'Toolbox talks',
          'Incident investigation',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['SAP EWM', 'Manhattan WMS', 'RF scanning', 'Power BI', 'Advanced Excel'],
      },
      {
        id: 's4',
        name: 'Measures',
        level: '',
        keywords: [
          'Units per hour',
          'Shrinkage',
          'Dock-to-stock',
          'Inventory record accuracy',
          'Cost per unit shipped',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified in Planning and Inventory Management (CPIM)',
        date: '2022',
        issuer: 'ASCM',
        url: '',
      },
      {
        id: 'c2',
        name: 'International General Certificate in Occupational Health and Safety',
        date: '2020',
        issuer: 'NEBOSH',
        url: '',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Site of the Year, Safety',
        date: '2024',
        awarder: 'Verdant Rowe Distribution',
        summary:
          'Chosen from 11 distribution centres for the lowest recordable incident rate and the highest internal audit score.',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 4 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Marathi', fluency: 'Native', rating: 5 },
    ],
  }),
}

export default sample
