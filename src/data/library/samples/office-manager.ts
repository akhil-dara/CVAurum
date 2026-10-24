import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, UK, British spelling. An office manager's work is invisible when
 * it is described as looking after things, so each line here is a cost taken
 * out, a move delivered or an inspection action closed. One role is part-time
 * and says so.
 */
export const sample: LibrarySample = {
  slug: 'office-manager',
  role: 'Office Manager',
  category: 'operations',
  seniority: 'mid',
  region: 'uk',
  template: 'compact',
  blurb:
    "A restaurant floor manager's move into office management, priced in supplier retenders, occupancy and one weekend move.",
  keywords: [
    'office manager',
    'facilities management',
    'business support',
    'supplier contracts',
    'health and safety',
    'hybrid working',
    'office relocation',
  ],
  guide: {
    why: [
      'Cost savings are itemised: £63k taken out of running costs by retendering cleaning, print, catering and confidential waste shows exactly which contracts the office manager controls.',
      'The office move is told by its outcome, 90 desks live on the Monday and no chargeable hours lost, which is how a consultancy partner judges whether a move went well.',
      'Hybrid working is turned into income: occupancy from 41% to 68% and a released floor sublet for £48k a year is a facilities result a finance director will notice.',
      'The restaurant years at The Bell & Barrow are kept short but measured, rostering 28 staff and cutting wastage from 6.1% to 2.8%, so the career change reads as transferable operations experience.',
    ],
    faq: [
      {
        q: 'What should an office manager CV include in the UK?',
        a: 'Premises and facilities, supplier contracts and budgets, health and safety duties, and the systems you run. Give each a result in pounds, desks or occupancy, and list IOSH Managing Safely or a first aid certificate if you hold them.',
      },
      {
        q: 'How to move from hospitality into office management on a CV?',
        a: 'Put the office role first and keep the hospitality job to two bullets that show rotas, budgets and stock control with figures. A short summary line naming the change helps a reader see the link without a separate explanation.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Nadia Chowdhury',
      label: 'Office Manager',
      image: '',
      email: 'nadia.chowdhury@example.com',
      phone: '+44 7700 900184',
      url: '',
      summary:
        'Office manager for a 90-person consultancy, five years in after running restaurant floors. Retendered four supplier contracts in one year to take £63k out of annual running costs, and delivered a two-floor office move over a single weekend with no trading lost.',
      location: { city: 'Bristol', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'nadiachowdhury', url: 'https://linkedin.com/in/nadiachowdhury' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Redgrave Fenwick',
        position: 'Office Manager',
        location: 'Bristol',
        url: '',
        startDate: '2022-01',
        endDate: '',
        summary:
          'Premises, facilities, supplier contracts and front of house for a 90-person consultancy across two floors.',
        highlights: [
          'Took £63k out of annual running costs in one year by retendering cleaning, print, catering and confidential waste, and renegotiating the service charge.',
          'Organised the move to a 6,400 sq ft floor across a single weekend, with 90 desks live on the Monday and no chargeable hours lost.',
          'Introduced a desk-booking rota for hybrid working; average occupancy rose from 41% to 68% and the released floor was sublet for £48k a year.',
          'Holds the health and safety file: 14 risk assessments completed, nine fire marshals trained, and every action from the insurer inspection closed.',
        ],
      },
      {
        id: 'w2',
        name: 'Ashcombe Legal Services',
        position: 'Office Coordinator (part-time)',
        location: 'Bristol',
        url: '',
        startDate: '2020-03',
        endDate: '2021-12',
        summary: 'Three days a week alongside study for the IOSH certificate.',
        highlights: [
          'Cut stationery and print spend by 38% by moving 11 ad-hoc accounts onto one supplier with a quarterly price review.',
          'Set up the remote-working kit process in March 2020, equipping 40 staff at home within nine days.',
        ],
      },
      {
        id: 'w3',
        name: 'The Bell & Barrow',
        position: 'Assistant Restaurant Manager',
        location: 'Bath',
        url: '',
        startDate: '2016-06',
        endDate: '2020-02',
        summary: '',
        highlights: [
          'Rostered 28 staff across a seven-day operation, holding labour at 28% of revenue through two menu changes and a refurbishment.',
          'Cut stock wastage from 6.1% to 2.8% in a year by moving to weekly counts against fixed par levels.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Sheffield Hallam University',
        area: 'Hospitality Business Management',
        studyType: 'BA (Hons)',
        location: 'Sheffield',
        startDate: '2013-09',
        endDate: '2016-06',
        score: '2:1',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Office operations',
        level: '',
        keywords: [
          'Facilities management',
          'Supplier contracts',
          'Lease and service charge',
          'Desk booking',
          'Front of house',
        ],
      },
      {
        id: 's2',
        name: 'Finance',
        level: '',
        keywords: ['Purchase orders', 'Invoice approval', 'Budget tracking', 'Expense policy', 'Supplier retendering'],
      },
      {
        id: 's3',
        name: 'Compliance',
        level: '',
        keywords: ['Risk assessments', 'Fire safety', 'DSE assessments', 'GDPR records', 'Business continuity'],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['Microsoft 365', 'SharePoint', 'Xero', 'Asana'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'IOSH Managing Safely', date: '2021', issuer: 'IOSH', url: '' },
      { id: 'c2', name: 'Level 3 Award in First Aid at Work', date: '2024', issuer: 'St John Ambulance', url: '' },
    ],
  }),
}

export default sample
