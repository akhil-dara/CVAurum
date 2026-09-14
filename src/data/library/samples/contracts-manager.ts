import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A site engineer who moved across into contracts and claims. The career
 * change is the spine of the résumé rather than an apology in the summary: the
 * engineering years are what let the claims be quantified.
 */
export const sample: LibrarySample = {
  slug: 'contracts-manager',
  role: 'Contracts Manager',
  category: 'legal',
  seniority: 'senior',
  region: 'india',
  template: 'onyx-gold',
  blurb:
    'A site engineer turned contracts lead, with claims recovered, notice discipline and guarantee costs as the measures.',
  keywords: [
    'contracts manager',
    'contract administration',
    'FIDIC claims',
    'EPC contracts',
    'commercial manager infrastructure',
    'extension of time claim',
  ],
  content: content({
    basics: {
      name: 'Arvind Thakkar',
      label: 'Senior Manager, Contracts & Commercial',
      image: '',
      email: 'arvind.thakkar@example.com',
      phone: '+91 12345 70216',
      url: '',
      summary:
        'Contracts and commercial lead on large infrastructure projects, twelve years in the sector and eight of them on the contracts side after starting as a site engineer. Recovered ₹31 crore in time-extension and variation claims across three EPC packages, every one settled at conciliation without reaching arbitration.',
      location: { city: 'Hyderabad', region: 'Telangana', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'arvindthakkar', url: 'https://linkedin.com/in/arvindthakkar' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Vindhya Infratech',
        logo: brandmark('Vindhya Infratech'),
        position: 'Senior Manager, Contracts & Commercial',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary: 'Owns contract administration for a ₹2,400 crore highways and water portfolio. Leads a team of five.',
        highlights: [
          'Recovered ₹31 crore in extension-of-time and variation claims across three FIDIC-based EPC packages, all settled at conciliation without arbitration.',
          'Rewrote the subcontract suite onto back-to-back payment and indemnity terms, ending about ₹4 crore a year of unrecoverable pass-through cost.',
          'Released 46 expired and duplicate bank guarantees the projects had left outstanding, cutting carrying cost by ₹1.1 crore a year.',
          'Chairs the monthly commercial review with project directors; claim notices now leave inside the 28-day contractual window on 94% of events, up from 52%.',
        ],
      },
      {
        id: 'w2',
        name: 'Ekanth Constructions',
        logo: brandmark('Ekanth Constructions'),
        position: 'Manager, Contracts & Claims',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2017-04',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Prepared the ₹19 crore delay claim on a metro viaduct package, including the as-planned versus as-built analysis the tribunal relied on in awarding 71%.',
          'Negotiated 140 vendor and subcontract agreements a year, moving 80% onto a standard template and cutting execution time from 26 days to 11.',
          'Set up the correspondence register that ended a pattern of unanswered engineer’s instructions; the package closed with no time-bar objection raised.',
        ],
      },
      {
        id: 'w3',
        name: 'Neelkanth Projects',
        logo: brandmark('Neelkanth Projects'),
        position: 'Site Engineer, then Assistant Manager (Contracts)',
        location: 'Nagpur, Maharashtra',
        url: '',
        startDate: '2014-07',
        endDate: '2017-03',
        summary: '',
        highlights: [
          'Measured and certified works worth ₹56 crore across two road packages with no measurement dispute raised by the client’s engineer.',
          'Moved into contracts after quantifying a ₹3.2 crore rate-variation entitlement the site team had written off as unrecoverable.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Indian Law Institute, New Delhi',
        area: 'Corporate Laws and Management',
        studyType: 'Post Graduate Diploma',
        location: 'New Delhi (distance)',
        startDate: '2018-07',
        endDate: '2019-06',
        score: 'First Division',
        url: '',
        summary: '',
        courses: [],
        level: 'diploma',
      },
      {
        id: 'e2',
        institution: 'College of Engineering, Pune',
        area: 'Civil Engineering',
        studyType: 'B.E.',
        location: 'Pune, Maharashtra',
        startDate: '2010-07',
        endDate: '2014-05',
        score: '72.4%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Contract administration',
        level: '',
        keywords: [
          'FIDIC Red and Yellow Book',
          'EPC and item-rate contracts',
          'Variations and EOT',
          'Bank guarantees',
          'Contract closeout',
        ],
      },
      {
        id: 's2',
        name: 'Commercial',
        level: '',
        keywords: [
          'Claim quantification',
          'Delay analysis',
          'Vendor negotiation',
          'Risk registers',
          'Cost-to-complete review',
        ],
      },
      {
        id: 's3',
        name: 'Dispute avoidance',
        level: '',
        keywords: [
          'Conciliation',
          'Dispute adjudication boards',
          'Arbitration support',
          'Notice discipline',
          'Correspondence control',
        ],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['SAP MM', 'Primavera P6', 'Excel cost modelling', 'Document management'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Contract and Commercial Management — Advanced Practitioner',
        date: '2022',
        issuer: 'World Commerce & Contracting',
        url: '',
      },
      {
        id: 'c2',
        name: 'FIDIC Contracts: Management and Administration',
        date: '2020',
        issuer: 'International Federation of Consulting Engineers',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
      { id: 'l4', language: 'Telugu', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
