import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Seventeen years, so the page has to compress: the two oldest roles get two
 * bullets each and the current one carries the scope — headcount, capital
 * plan, conversion cost. The part-time executive MBA is dated against the job
 * it overlapped, which is what keeps the history readable.
 */
export const sample: LibrarySample = {
  slug: 'manufacturing-engineering-manager',
  role: 'Manufacturing Engineering Manager',
  category: 'engineering',
  seniority: 'lead',
  region: 'india',
  template: 'vector',
  blurb:
    'Seventeen years from the shop floor to running engineering for three plants, every number tied to output or cost.',
  keywords: [
    'manufacturing engineering manager',
    'head of manufacturing engineering',
    'plant engineering',
    'TPM deployment',
    'lean manufacturing',
    'automotive production',
  ],
  content: content({
    basics: {
      name: 'Sameer Phatak',
      label: 'Head of Manufacturing Engineering',
      image: '',
      email: 'sameer.phatak@example.com',
      phone: '+91 12345 80394',
      url: 'https://sameerphatak.example.com',
      summary:
        'Manufacturing engineering leader with seventeen years in forging, machining and assembly for commercial vehicles, the last five running engineering across three plants. Delivered a ₹42 crore capacity expansion that lifted output 38% without new floor space, and took group conversion cost down 14% over three years. Leads a department of 46 engineers and technicians.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'sameerphatak', url: 'https://linkedin.com/in/sameerphatak' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Prashti Mobility Systems',
        position: 'Head of Manufacturing Engineering',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2021-08',
        endDate: '',
        summary: 'Engineering across three plants: 46 engineers and technicians, ₹60 crore annual capital plan.',
        highlights: [
          'Delivered a ₹42 crore capacity expansion that raised output 38% on the existing footprint, commissioned six weeks ahead of the customer start-of-production date.',
          'Took group conversion cost down 14% over three years through line rebalancing, automated gauging and a supplier tooling consolidation.',
          'Lifted overall equipment effectiveness across 11 machining cells from 58% to 79% by making TPM a line-owner responsibility rather than a maintenance one.',
          'Built a machine-data platform covering 140 assets that cut unplanned downtime 31% in its first year.',
          'Hired and developed 18 engineers, five of whom now run their own cells; department attrition fell from 24% to 9%.',
        ],
      },
      {
        id: 'w2',
        name: 'Nirvaan Forgings',
        position: 'Manager — Manufacturing Engineering',
        location: 'Chhatrapati Sambhajinagar, Maharashtra',
        url: '',
        startDate: '2016-05',
        endDate: '2021-07',
        summary: '',
        highlights: [
          'Led the move from three-shift manual forging to two automated lines, raising tonnes per operator-hour by 2.6 times.',
          'Reduced die cost per tonne 27% by bringing die design in-house and standardising on four preform geometries.',
          'Commissioned 14 machines and two robot cells against a ₹31 crore budget, all inside approved capital.',
        ],
      },
      {
        id: 'w3',
        name: 'Tanvish Engineering Works',
        position: 'Assistant Manager — Production Engineering',
        location: 'Nashik, Maharashtra',
        url: '',
        startDate: '2012-06',
        endDate: '2016-04',
        summary: '',
        highlights: [
          'Relaid a gear-machining shop around cellular flow, cutting work-in-progress 44% and part travel by 380 metres.',
          'Raised first-pass yield on a hobbing line from 86% to 97% by changing over on tool life rather than shift end.',
        ],
      },
      {
        id: 'w4',
        name: 'Tarangi Gears',
        position: 'Production Engineer',
        location: 'Nashik, Maharashtra',
        url: '',
        startDate: '2009-07',
        endDate: '2012-05',
        summary: 'Joined as a graduate engineer trainee.',
        highlights: [
          'Ran a 22-machine turning section and lifted schedule adherence from 81% to 96%.',
          'Cut coolant consumption 40% through concentration monitoring, saving ₹11 lakh a year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'S.P. Jain Institute of Management and Research',
        area: 'Operations Management',
        studyType: 'Executive MBA',
        location: 'Mumbai, Maharashtra',
        startDate: '2017-06',
        endDate: '2019-05',
        score: '3.5/4.0 CGPA',
        url: '',
        summary: 'Part-time programme completed alongside the manufacturing engineering role.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Veermata Jijabai Technological Institute (VJTI)',
        area: 'Production Engineering',
        studyType: 'B.E.',
        location: 'Mumbai, Maharashtra',
        startDate: '2005-08',
        endDate: '2009-05',
        score: '68.4%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Manufacturing',
        level: '',
        keywords: [
          'Line design and balancing',
          'Forging and machining processes',
          'Robot cell integration',
          'Tooling strategy',
          'Capacity planning',
        ],
      },
      {
        id: 's2',
        name: 'Operating system',
        level: '',
        keywords: ['TPM', 'Value-stream mapping', 'Six Sigma', 'Kaizen', 'Standard work', 'SMED'],
      },
      {
        id: 's3',
        name: 'Leadership',
        level: '',
        keywords: [
          'Capital planning',
          'Supplier development',
          'Team building',
          'Customer SOP readiness',
          'Conversion cost ownership',
        ],
      },
      {
        id: 's4',
        name: 'Digital',
        level: '',
        keywords: ['MES and machine data', 'Power BI', 'SAP PP/PM', 'Condition monitoring'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'TPM Excellence Award, Category A',
        date: '2024',
        awarder: 'Japan Institute of Plant Maintenance',
        summary: 'Awarded to the Pune plant after a three-year deployment assessed across all eight TPM pillars.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Maintenance & Reliability Professional (CMRP)',
        date: '2022',
        issuer: 'Society for Maintenance & Reliability Professionals',
        url: '',
      },
      { id: 'c2', name: 'Lean Six Sigma Black Belt', date: '2018', issuer: 'American Society for Quality', url: '' },
      {
        id: 'c3',
        name: 'TPM Instructor Course',
        date: '2020',
        issuer: 'Japan Institute of Plant Maintenance',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
