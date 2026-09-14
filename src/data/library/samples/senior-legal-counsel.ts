import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * An in-house solicitor who took a nine-month career break and came back
 * through part-time consultancy. The break is on the page as its own entry,
 * dated and explained, because hiding it is what makes a gap look bad.
 */
export const sample: LibrarySample = {
  slug: 'senior-legal-counsel',
  role: 'Senior Legal Counsel',
  category: 'legal',
  seniority: 'senior',
  region: 'uk',
  template: 'obsidian',
  blurb:
    'An in-house commercial solicitor back from a career break via part-time consultancy, with the gap dated and explained.',
  keywords: [
    'in-house counsel',
    'senior legal counsel',
    'commercial solicitor',
    'UK GDPR',
    'contract playbook',
    'return to work after career break',
  ],
  content: content({
    basics: {
      name: 'Iona Fairhurst',
      label: 'Senior Legal Counsel, Commercial & Regulatory',
      image: '',
      email: 'iona.fairhurst@example.com',
      phone: '+44 7700 900226',
      url: 'https://ionafairhurst.example.com',
      summary:
        'Commercial solicitor with thirteen years in practice, eight of them in-house in energy and retail. Rewrote a supplier contracting programme that took average time to signature from 34 days to 9 and removed £1.1M of unmanaged indemnity exposure.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'ionafairhurst', url: 'https://linkedin.com/in/ionafairhurst' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Brightmoor Energy',
        position: 'Senior Legal Counsel, Commercial & Regulatory',
        location: 'Manchester',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary:
          'Senior lawyer for the commercial function, reporting to the General Counsel and supervising one paralegal.',
        highlights: [
          'Rewrote supplier contracting around a three-tier playbook, taking average time to signature from 34 days to 9 across the 240 contracts signed each year.',
          'Advised on the licence conditions for a flexible-tariff product and cleared launch four weeks ahead of the commercial deadline.',
          'Reduced external counsel spend by £280k a year by bringing data protection and routine procurement work in-house and re-tendering the panel.',
          'Leads UK GDPR compliance, including a records-of-processing rebuild that closed all 17 findings from the previous audit.',
        ],
      },
      {
        id: 'w2',
        name: 'Fernhill Legal Consulting',
        position: 'Consultant Solicitor (part-time)',
        location: 'Manchester',
        url: '',
        startDate: '2021-11',
        endDate: '2022-08',
        summary: 'Three days a week, returning to practice after a planned career break.',
        highlights: [
          'Renegotiated 68 reseller agreements onto post-Brexit customs and origin terms for a logistics client, finishing the remediation in five months.',
          'Drafted the data-sharing agreements for a healthcare analytics pilot, accepted by the client’s information governance panel without amendment.',
        ],
      },
      {
        id: 'w3',
        name: 'Career break',
        position: 'Planned career break',
        location: 'Manchester',
        url: '',
        startDate: '2021-02',
        endDate: '2021-10',
        summary:
          'Nine months away from practice for full-time family care. Practising certificate kept current and the CIPP/E completed during the period.',
        highlights: [],
      },
      {
        id: 'w4',
        name: 'Velbury Retail Group',
        position: 'Legal Counsel',
        location: 'Leeds',
        url: '',
        startDate: '2017-05',
        endDate: '2021-01',
        summary: '',
        highlights: [
          'Ran the legal workstream on the acquisition of a 19-store regional chain, completing diligence in six weeks against an eight-week timetable.',
          'Replaced 26 bespoke concession agreements with one negotiable schedule used across 340 stores.',
          'Answered 11 consumer-law complaints referred by Trading Standards and closed every one without formal enforcement action.',
        ],
      },
      {
        id: 'w5',
        name: 'Kettering Mayne LLP',
        position: 'Associate, Commercial',
        location: 'London',
        url: '',
        startDate: '2013-09',
        endDate: '2017-04',
        summary: '',
        highlights: [
          'Advised retail and manufacturing clients on outsourcing and supply agreements worth £6M to £40M, recording 1,650 chargeable hours a year.',
          'Qualified into the commercial team in 2015 after a training contract covering corporate, disputes and employment seats.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'BPP University Law School',
        area: 'Legal Practice Course',
        studyType: 'LPC',
        location: 'London',
        startDate: '2012-09',
        endDate: '2013-06',
        score: 'Distinction',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Nottingham',
        area: 'Law',
        studyType: 'LLB',
        location: 'Nottingham',
        startDate: '2009-09',
        endDate: '2012-06',
        score: 'Upper Second Class Honours (2:1)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Salford Community Law Clinic',
        position: 'Trustee',
        url: '',
        startDate: '2020-04',
        endDate: '',
        summary: '',
        highlights: [
          'Chairs the governance sub-committee; the clinic passed its first external audit without qualification in 2023 and doubled its casework grant.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Commercial',
        level: '',
        keywords: ['Supply and outsourcing', 'Reseller agreements', 'Procurement', 'Licensing', 'Contract playbooks'],
      },
      {
        id: 's2',
        name: 'Regulatory',
        level: '',
        keywords: [
          'UK GDPR',
          'Energy licence conditions',
          'Consumer protection',
          'Competition compliance',
          'Modern slavery reporting',
        ],
      },
      {
        id: 's3',
        name: 'Working with the business',
        level: '',
        keywords: ['Panel management', 'Legal budgeting', 'Risk escalation', 'Training delivery', 'Board reporting'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Admitted as a Solicitor of the Senior Courts of England and Wales',
        date: '2015',
        issuer: 'Solicitors Regulation Authority',
        url: '',
      },
      {
        id: 'c2',
        name: 'Certified Information Privacy Professional/Europe (CIPP/E)',
        date: '2021',
        issuer: 'IAPP',
        url: '',
      },
    ],
  }),
}

export default sample
