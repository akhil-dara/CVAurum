import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A plant-floor résumé. The numbers a manufacturing manager actually asks
 * about — OEE, changeover minutes, scrap percentage, ppm — carry every line,
 * and the tool names sit in the skills block where they belong rather than
 * inside the bullets.
 */
export const sample: LibrarySample = {
  slug: 'manufacturing-engineer',
  role: 'Manufacturing Engineer',
  category: 'engineering',
  seniority: 'mid',
  region: 'us',
  template: 'vector',
  blurb:
    'Six years on molding and assembly lines, written as line rate, scrap and downtime rather than a list of software.',
  keywords: [
    'manufacturing engineer',
    'lean manufacturing',
    'Six Sigma Green Belt',
    'injection molding',
    'OEE improvement',
    'process engineer',
  ],
  content: content({
    basics: {
      name: 'Renata Alvarez',
      label: 'Manufacturing Engineer',
      image: '',
      email: 'renata.alvarez@example.com',
      phone: '+1 (555) 0173',
      url: 'https://renataalvarez.example.com',
      summary:
        'Manufacturing engineer with six years on injection molding and assembly lines for appliance and medical components. Raised OEE on a nine-press molding cell from 61% to 84% in eleven months, recovering about $1.1M a year in capacity. Certified Six Sigma Green Belt who runs changeover and scrap projects from the floor.',
      location: { city: 'Grand Rapids', region: 'MI', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'renataalvarez', url: 'https://linkedin.com/in/renataalvarez' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Halverton Plastics Group',
        logo: brandmark('Halverton Plastics Group'),
        position: 'Manufacturing Engineer',
        location: 'Grand Rapids, MI',
        url: '',
        startDate: '2023-11',
        endDate: '',
        summary: 'Owns process engineering for a nine-press molding cell and two downstream assembly lines.',
        highlights: [
          'Raised cell OEE from 61% to 84% in eleven months by rebalancing cycle times and moving mold changes off the critical path, recovering about $1.1M of annual capacity.',
          'Cut average mold changeover from 74 minutes to 26 through SMED, freeing 310 press hours a year.',
          'Drove scrap on a glass-filled nylon housing from 6.8% to 1.9% by correcting gate location and a 40°F melt-temperature drift.',
          'Qualified two backup resin suppliers through full IQ/OQ/PQ, closing a single-source exposure raised in the 2024 customer audit.',
        ],
      },
      {
        id: 'w2',
        name: 'Cranmore Industrial',
        logo: brandmark('Cranmore Industrial'),
        position: 'Process Engineer',
        location: 'Toledo, OH',
        url: '',
        startDate: '2021-09',
        endDate: '2023-10',
        summary: '',
        highlights: [
          'Launched three molded parts through PPAP with no customer rejections, holding every critical characteristic above 1.67 Cpk.',
          'Redesigned a manual assembly station around a poka-yoke fixture, taking misbuilds from 1,100 ppm to 90 ppm.',
          'Reduced press hydraulic downtime 41% by converting reactive repairs to a condition-based PM schedule.',
        ],
      },
      {
        id: 'w3',
        name: 'Stonefield Tooling',
        logo: brandmark('Stonefield Tooling'),
        position: 'Associate Manufacturing Engineer',
        location: 'Toledo, OH',
        url: '',
        startDate: '2020-06',
        endDate: '2021-08',
        summary: '',
        highlights: [
          'Programmed and proved out 38 CNC fixtures in Mastercam, cutting average setup time by 19 minutes per job.',
          'Built the first cutting-parameter database the tool room had, from 200 logged runs, extending insert life 27%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Michigan Technological University',
        area: 'Mechanical Engineering',
        studyType: 'B.S.',
        location: 'Houghton, MI',
        startDate: '2016-08',
        endDate: '2020-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Process',
        level: '',
        keywords: [
          'Scientific injection molding',
          'SMED',
          'Statistical process control',
          'Design of experiments',
          'Poka-yoke',
          'Line balancing',
        ],
      },
      {
        id: 's2',
        name: 'Quality systems',
        level: '',
        keywords: ['PPAP', 'APQP', 'PFMEA', 'IQ/OQ/PQ validation', 'ISO 13485', 'Gage R&R'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['SolidWorks', 'Mastercam', 'Minitab', 'Ignition SCADA', 'AutoCAD'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Plant Engineering Award',
        date: '2025',
        awarder: 'Halverton Plastics Group',
        summary: 'Given for the molding-cell OEE program, selected from 31 submissions across four plants.',
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Six Sigma Green Belt', date: '2022', issuer: 'ASQ', url: '' },
      { id: 'c2', name: 'Certified Manufacturing Engineer (CMfgE)', date: '2024', issuer: 'SME', url: '' },
    ],
  }),
}

export default sample
