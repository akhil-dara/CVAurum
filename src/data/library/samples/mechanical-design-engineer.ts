import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Two years out of a B.Tech, so the résumé has to earn its page on detail
 * rather than scope: part counts, scrap dropped, drawings released. The
 * projects section carries the university work that a hiring manager for a
 * design office still reads at this stage.
 */
export const sample: LibrarySample = {
  slug: 'mechanical-design-engineer',
  role: 'Mechanical Design Engineer',
  category: 'engineering',
  seniority: 'entry',
  region: 'india',
  template: 'classic',
  blurb:
    'Two years of CAD and tolerance work at an automotive supplier, each design change tied to the scrap or cost it removed.',
  keywords: [
    'mechanical design engineer',
    'SolidWorks',
    'GD&T',
    'automotive components',
    'B.Tech mechanical',
    'sheet metal design',
  ],
  content: content({
    basics: {
      name: 'Rohan Gokhale',
      label: 'Mechanical Design Engineer',
      image: '',
      email: 'rohan.gokhale@example.com',
      phone: '+91 12345 60118',
      url: 'https://rohangokhale.example.com',
      summary:
        'Mechanical design engineer with two years on powertrain brackets and sheet-metal assemblies for commercial vehicles. Redrew an eleven-part bracket family onto three common blanks, cutting machining time 34% and removing ₹18 lakh of annual scrap. Designs in SolidWorks and Siemens NX with GD&T applied to ASME Y14.5.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'rohangokhale', url: 'https://linkedin.com/in/rohangokhale' },
        { network: 'GrabCAD', username: 'rgokhale', url: 'https://grabcad.com/rgokhale' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Drishaan Mobility Systems',
        position: 'Design Engineer',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2025-08',
        endDate: '',
        summary: 'Chassis and powertrain mounting group of six, supplying two commercial-vehicle OEM programmes.',
        highlights: [
          'Redesigned a family of eleven engine-mount brackets onto three common blanks, cutting machining time 34% and removing ₹18 lakh of annual scrap.',
          'Ran topology optimisation on a gearbox cross-member in Ansys, taking 2.3 kg per vehicle out of the part while holding the 1.8 mm deflection limit.',
          'Closed 47 supplier drawing queries in twelve months by rewriting datum schemes that three vendors had each read differently.',
          'Built the first reusable fastener and hardware library in the group, taking a new bracket model from two days to four hours.',
        ],
      },
      {
        id: 'w2',
        name: 'Ketara Precision Works',
        position: 'Graduate Engineer Trainee',
        location: 'Nashik, Maharashtra',
        url: '',
        startDate: '2024-07',
        endDate: '2025-07',
        summary: '',
        highlights: [
          'Detailed 120 sheet-metal parts for a bus-body programme and corrected the bend allowances that had caused 9 of the first 30 flat patterns to be rejected.',
          'Reduced die-change downtime on a press line 22% by standardising locator pin heights across four progressive tools.',
          'Wrote the drawing-release checklist the design office adopted; drawings returned for rework fell from 18% to 5%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'COEP Technological University',
        area: 'Mechanical Engineering',
        studyType: 'B.Tech',
        location: 'Pune, Maharashtra',
        startDate: '2020-08',
        endDate: '2024-06',
        score: '8.4 CGPA',
        url: '',
        summary: '',
        courses: ['Machine Design', 'Finite Element Analysis', 'Manufacturing Processes', 'Automotive Systems'],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Regenerative Suspension Damper',
        description: 'Final-year project: an electromagnetic damper that recovers energy from suspension travel.',
        url: '',
        startDate: '2023-08',
        endDate: '2024-05',
        highlights: [
          'Bench rig recovered 41 W at 2 Hz excitation, and the build was judged first of 28 projects at the university technical symposium.',
        ],
        keywords: ['SolidWorks', 'Ansys', 'Prototyping'],
      },
      {
        id: 'p2',
        name: 'SUPRA SAEINDIA — Chassis Subsystem',
        description: 'Two seasons on the university formula team, owning the tubular space-frame chassis.',
        url: '',
        startDate: '2021-09',
        endDate: '2023-06',
        highlights: [
          'Took 7.4 kg out of the frame through node-load FEA while clearing the rulebook torsional-stiffness target by 12%.',
        ],
        keywords: ['FEA', 'Welded structures', 'Design for manufacture'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'CAD & drafting',
        level: '',
        keywords: [
          'SolidWorks',
          'Siemens NX',
          'AutoCAD',
          'GD&T (ASME Y14.5)',
          'Sheet-metal design',
          'Tolerance stack-up',
        ],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: ['Ansys Mechanical', 'Static & modal FEA', 'Topology optimisation', 'Hand calculations'],
      },
      {
        id: 's3',
        name: 'Manufacturing',
        level: '',
        keywords: ['Press tooling', 'CNC machining', 'Weld fixtures', 'DFM reviews', 'PPAP documentation'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified SolidWorks Professional (CSWP)',
        date: '2024',
        issuer: 'Dassault Systèmes',
        url: '',
      },
      { id: 'c2', name: 'GD&T Fundamentals (ASME Y14.5-2018)', date: '2025', issuer: 'ASME', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
