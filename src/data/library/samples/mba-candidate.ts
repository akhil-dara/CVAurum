import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'
import { portrait } from '../avatar'

/**
 * An MBA student is a student with a career behind them. The degree leads
 * because it is why the reader is looking, but the four years of plant
 * operations underneath it are what the numbers come from.
 */
export const sample: LibrarySample = {
  slug: 'mba-candidate',
  role: 'MBA Candidate',
  category: 'student',
  seniority: 'student',
  region: 'india',
  template: 'cascade',
  blurb:
    'Second-year PGP student with four years on an inverter line behind the degree, and a summer brief that became a launch plan.',
  keywords: [
    'MBA resume',
    'MBA candidate resume',
    'IIM resume format',
    'summer internship MBA',
    'consulting resume India',
    'operations to strategy',
  ],
  content: content({
    basics: {
      name: 'Ishita Bhandari',
      label: 'MBA Candidate, Class of 2027',
      image: portrait('Ishita Bhandari'),
      email: 'ishita.bhandari@example.com',
      phone: '+91 12345 70244',
      url: '',
      summary:
        'Second-year PGP student at IIM Bangalore with four years running an inverter assembly line before business school. Took line rework from 6.1% to 1.8%, and last summer sized a ready-to-cook category from 1,400 household interviews into a launch plan the board approved.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'ishitabhandari', url: 'https://linkedin.com/in/ishitabhandari' }],
    },
    education: [
      {
        id: 'e1',
        institution: 'Indian Institute of Management Bangalore',
        area: 'Post Graduate Programme in Management',
        studyType: 'MBA',
        location: 'Bengaluru, Karnataka',
        startDate: '2025-06',
        endDate: '2027-03',
        score: '3.42/4.00 CGPA',
        url: '',
        summary: 'Electives in pricing, competitive strategy and supply chain analytics.',
        status: 'pursuing',
        level: 'degree',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'R.V. College of Engineering',
        area: 'Mechanical Engineering',
        studyType: 'B.E.',
        location: 'Bengaluru, Karnataka',
        startDate: '2017-08',
        endDate: '2021-06',
        score: '8.4 CGPA',
        url: '',
        summary: '',
        status: 'completed',
        level: 'degree',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Suvarna Consumer Brands',
        logo: brandmark('Suvarna Consumer Brands'),
        rail: { word: 'Internship' },
        position: 'Summer Intern, Strategy',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2026-04',
        endDate: '2026-06',
        summary: 'Eight weeks with the category team on a ready-to-cook entry.',
        highlights: [
          'Sized the ready-to-cook category across six metros from 1,400 household interviews; the brief became the basis of a Rs 40 crore launch plan approved in July 2026.',
          'Found that 31% of modern-trade shelf space still carried expired planograms, and a corrected audit routine lifted compliance to 88% in eight weeks.',
          'Built the pricing model the brand team now runs monthly, replacing a quarterly external engagement.',
        ],
      },
      {
        id: 'w2',
        name: 'Varsha Energy Systems',
        logo: brandmark('Varsha Energy Systems'),
        position: 'Assistant Manager, Operations',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2021-07',
        endDate: '2025-05',
        summary: 'Solar inverter assembly, 240 units a day across two shifts.',
        highlights: [
          'Cut rework from 6.1% to 1.8% by re-sequencing the torque stations and adding a single fixed-order checklist.',
          'Negotiated three component contracts worth Rs 11 crore a year, holding landed prices flat through a 14% rise in copper.',
          'Trained 34 line operators on a revised quality gate; first-pass yield rose nine points over two quarters.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Setu Livelihoods Trust',
        position: 'Volunteer Analyst',
        url: '',
        startDate: '2025-08',
        endDate: '',
        summary: '',
        highlights: [
          'Rebuilt the costing for a 600-member weavers collective, exposing a Rs 38 per-metre gap that a revised price list closed in one season.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Business',
        level: '',
        keywords: [
          'Market sizing',
          'Pricing strategy',
          'Financial modelling',
          'Competitive analysis',
          'Supplier negotiation',
        ],
      },
      { id: 's2', name: 'Analysis', level: '', keywords: ['Excel', 'SQL', 'Power BI', 'Tableau', 'Survey design'] },
      {
        id: 's3',
        name: 'Operations',
        level: '',
        keywords: ['Lean manufacturing', 'Six Sigma', 'Vendor management', 'Sales and operations planning'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Lean Six Sigma Green Belt', date: '2023', issuer: 'American Society for Quality', url: '' },
    ],
    awards: [
      { id: 'a1', title: 'CAT 2024: 99.62 percentile', date: '2024', awarder: 'Common Admission Test', summary: '' },
      {
        id: 'a2',
        title: 'Merit scholarship, top 5% of the PGP cohort',
        date: '2026',
        awarder: 'IIM Bangalore',
        summary: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Kannada', fluency: 'Conversational', rating: 3 },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'volunteer']
    m.layout.aside = ['skills', 'certificates', 'awards', 'languages']
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      education: { ...(m.layout.sectionSettings?.education ?? {}), scoreStyle: 'pill' },
    }
  },
}

export default sample
