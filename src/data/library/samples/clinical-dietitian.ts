import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A returner. The sixteen-month break is on the page as its own entry, with
 * what was done during it, and the part-time return that followed is written
 * as real work rather than as an apology.
 */
export const sample: LibrarySample = {
  slug: 'clinical-dietitian',
  role: 'Clinical Dietitian (Head of Nutrition)',
  category: 'healthcare',
  seniority: 'senior',
  region: 'india',
  template: 'verdant',
  blurb:
    'Twelve years of hospital nutrition either side of a planned career break, with the break and part-time return both on the page.',
  keywords: [
    'clinical dietitian resume',
    'registered dietitian India',
    'hospital nutrition',
    'renal dietitian',
    'enteral nutrition',
    'return to work after career break',
    'M.Sc dietetics',
  ],
  content: content({
    basics: {
      name: 'Shalini Menon',
      label: 'Head of Clinical Nutrition',
      image: '',
      email: 'shalini.menon@example.com',
      phone: '+91 12345 74206',
      url: 'https://shalinimenon.example.com',
      summary:
        'Registered dietitian with twelve years in Indian hospital nutrition, now leading a team of seven across 640 beds. Built the enteral feeding protocol with intensive care that took time from ICU admission to first feed from 38 hours to 19, and returned to full-time practice in 2022 after a planned sixteen-month break.',
      location: { city: 'Kochi', region: 'Kerala', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'shalinimenonrd', url: 'https://linkedin.com/in/shalinimenonrd' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Anantham Institute of Medical Sciences',
        position: 'Head of Clinical Nutrition',
        location: 'Kochi, Kerala',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary:
          '640-bed teaching hospital. Leads seven dietitians across the wards, the ICU nutrition round and the outpatient clinic.',
        highlights: [
          'Introduced screening within 24 hours of admission; malnutrition risk is now identified in 82% of at-risk inpatients against 31% before, across 9,000 admissions a year.',
          'Built the enteral feeding protocol with intensive care, cutting time from ICU admission to first feed from 38 hours to 19 and feed interruptions by a third.',
          'Runs the weekly renal clinic for 120 dialysis patients; serum phosphate within target rose from 44% to 68% over two years.',
          'Trained 40 nurses as ward nutrition links, which is why the screening form is now completed without a dietitian chasing it.',
          'Replaced the therapeutic diet menu with 14 standard diets costed per plate, taking kitchen wastage from 19% to 7%.',
        ],
      },
      {
        id: 'w2',
        name: 'Vaidyanath Multispeciality Hospital',
        position: 'Senior Clinical Dietitian (part-time, return to practice)',
        location: 'Kochi, Kerala',
        url: '',
        startDate: '2021-01',
        endDate: '2022-08',
        summary: 'Three days a week, covering the gastroenterology and bariatric caseload.',
        highlights: [
          'Carried about 45 outpatients a month through pre- and post-operative bariatric nutrition, alongside the inpatient gastroenterology referrals.',
          'Set the post-bariatric follow-up schedule at 2, 6 and 12 months; attendance at the one-year visit rose from 38% to 71%.',
          'Wrote the Malayalam and Tamil versions of the carbohydrate-counting handout now given at every new diabetes diagnosis.',
        ],
      },
      {
        id: 'w3',
        name: 'Career break',
        position: 'Planned career break, family caregiving and relocation',
        location: 'Thrissur to Kochi, Kerala',
        url: '',
        startDate: '2019-09',
        endDate: '2020-12',
        summary: '',
        highlights: [
          'Completed the nutrition support practitioner programme and renewed registration with the Indian Dietetic Association before returning to practice.',
        ],
      },
      {
        id: 'w4',
        name: 'Padmatheeram Diabetes and Metabolic Centre',
        position: 'Clinical Dietitian, Diabetes and Renal',
        location: 'Thrissur, Kerala',
        url: '',
        startDate: '2015-06',
        endDate: '2019-08',
        summary: '',
        highlights: [
          'Counselled about 1,600 patients a year on type 2 diabetes and chronic kidney disease diets through a structured three-visit review.',
          'Ran the group education programme for 320 patients, whose mean HbA1c fell 1.1 percentage points at six months.',
          'Co-wrote the renal diet manual still used across the three branches of the centre.',
        ],
      },
      {
        id: 'w5',
        name: 'Nallura Speciality Hospital',
        position: 'Dietitian, Inpatient Services',
        location: 'Thrissur, Kerala',
        url: '',
        startDate: '2012-08',
        endDate: '2015-05',
        summary: '',
        highlights: [
          'Covered 180 inpatient beds alone, screening every admission and writing about 60 therapeutic diet orders a week.',
          'Cut tray errors on the therapeutic diet trolley from 25 a week to 4 by colour-coding the diet slips against the ward list.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Avinashilingam Institute for Home Science and Higher Education for Women',
        area: 'Food Service Management and Dietetics',
        studyType: 'M.Sc.',
        location: 'Coimbatore, Tamil Nadu',
        startDate: '2010-07',
        endDate: '2012-05',
        score: '8.6 CGPA',
        url: '',
        summary: 'Dissertation on protein adequacy in maintenance haemodialysis, 210 patients.',
        courses: [],
      },
      {
        id: 'e2',
        institution: "St Teresa's College, Ernakulam",
        area: 'Clinical Nutrition and Dietetics',
        studyType: 'B.Sc.',
        location: 'Kochi, Kerala',
        startDate: '2007-07',
        endDate: '2010-04',
        score: '79.2%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Registered Dietitian (RD), registration number on request',
        date: 'Renewed 2025',
        issuer: 'Indian Dietetic Association',
        url: '',
      },
      {
        id: 'c2',
        name: 'Nutrition Support Practitioner Programme',
        date: '2020',
        issuer: 'Indian Society for Parenteral and Enteral Nutrition',
        url: '',
      },
      {
        id: 'c3',
        name: 'Certificate Course in Diabetes Management',
        date: '2018',
        issuer: 'Indian Medical Association',
        url: '',
      },
      {
        id: 'c4',
        name: 'Food Safety Supervisor (FoSTaC), Catering',
        date: '2023',
        issuer: 'Food Safety and Standards Authority of India',
        url: '',
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Phosphate control in maintenance haemodialysis after a dietitian-led clinic: a two-year review',
        publisher: 'Indian Journal of Nephrology',
        releaseDate: '2025-03',
        url: '',
        summary: 'First author. 120 patients across two years of clinic data.',
      },
      {
        id: 'pb2',
        name: 'Causes of enteral feed interruption in a tertiary intensive care unit',
        publisher: 'Indian Journal of Critical Care Medicine',
        releaseDate: '2024-07',
        url: '',
        summary: 'Co-author. 210 ventilated patients audited before and after protocol change.',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Best Paper, Clinical Nutrition Track',
        date: '2024',
        awarder: 'Indian Dietetic Association, Kerala Chapter Annual Conference',
        summary: 'For the enteral feed interruption audit.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Clinical nutrition',
        level: '',
        keywords: [
          'Nutrition assessment (SGA, MUST)',
          'Enteral and parenteral support',
          'Renal and dialysis diets',
          'Diabetes medical nutrition therapy',
          'Bariatric follow-up',
          'Paediatric feeds',
        ],
      },
      {
        id: 's2',
        name: 'Service leadership',
        level: '',
        keywords: [
          'Leading a team of seven',
          'Therapeutic menu costing',
          'Ward screening pathways',
          'NABH documentation',
          'Kitchen food safety audit',
        ],
      },
      {
        id: 's3',
        name: 'Teaching and research',
        level: '',
        keywords: [
          'Intern supervision',
          'Link-nurse training',
          'Clinical audit',
          'Patient education materials',
          'Conference presentation',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Malayalam', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Tamil', fluency: 'Professional', rating: 4 },
      { id: 'l4', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
