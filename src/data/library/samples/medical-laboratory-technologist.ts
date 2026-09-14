import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Three years on the bench, written so the quality numbers do the talking:
 * turnaround, rejection rate and external quality assurance performance are
 * what a laboratory in-charge actually reads a junior CV for.
 */
export const sample: LibrarySample = {
  slug: 'medical-laboratory-technologist',
  role: 'Medical Laboratory Technologist',
  category: 'healthcare',
  seniority: 'entry',
  region: 'india',
  template: 'mercury',
  blurb:
    'Three years on a diagnostic bench, told through turnaround, sample rejection and quality control rather than a list of analysers.',
  keywords: [
    'medical laboratory technologist resume',
    'MLT resume',
    'B.Sc MLT',
    'haematology technician',
    'clinical biochemistry',
    'NABL ISO 15189',
  ],
  content: content({
    basics: {
      name: 'Meghna Bhat',
      label: 'Medical Laboratory Technologist, Haematology and Clinical Biochemistry',
      image: '',
      email: 'meghna.bhat@example.com',
      phone: '+91 12345 47390',
      url: 'https://meghnabhat.example.com',
      summary:
        'B.Sc MLT graduate with three years on diagnostic benches across haematology, biochemistry and blood bank. Resequenced the morning run at a 260-sample-a-day laboratory, taking haematology turnaround from 5 hours 20 minutes to 3 hours 5 minutes.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'meghnabhatmlt', url: 'https://linkedin.com/in/meghnabhatmlt' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Nirmalya Diagnostics',
        position: 'Medical Laboratory Technologist, Haematology',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2024-11',
        endDate: '',
        summary:
          'NABL-accredited reference laboratory. Runs a five-analyser haematology and biochemistry bench on the morning shift.',
        highlights: [
          'Resequenced the morning run and moved calibration to the night shift, cutting haematology turnaround from 5 hours 20 minutes to 3 hours 5 minutes.',
          'Traced a recurring potassium drift to a single centrifuge rotor; replacing it ended 40 to 60 spurious haemolysis flags a month.',
          'Runs the daily Levey-Jennings review for 18 analytes and has held the bench inside two standard deviations on every quality assurance cycle for seven quarters.',
          'Wrote the peripheral smear reporting checklist six technologists now follow, which halved the smears sent back for re-staining.',
        ],
      },
      {
        id: 'w2',
        name: 'Panchvati Speciality Hospital',
        position: 'Laboratory Technologist (rotational intern, then technologist)',
        location: 'Hubballi, Karnataka',
        url: '',
        startDate: '2023-07',
        endDate: '2024-10',
        summary: '',
        highlights: [
          'Rotated through microbiology, histopathology, blood bank and biochemistry, completing 11 months of supervised bench work before taking an independent shift.',
          'Brought sample rejection at the phlebotomy counter from 4.1% to 1.3% by redrawing the tube-order chart and retraining 14 collection staff.',
          'Maintained the blood bank cross-match register for about 900 units a year with no clerical discrepancy across two internal audits.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Manipal College of Health Professions, Manipal Academy of Higher Education',
        area: 'Medical Laboratory Technology',
        studyType: 'B.Sc.',
        location: 'Manipal, Karnataka',
        startDate: '2020-08',
        endDate: '2023-06',
        score: '8.3 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'St Aloysius Pre-University College',
        area: 'Physics, Chemistry, Biology',
        studyType: 'Pre-University (Science)',
        location: 'Mangaluru, Karnataka',
        startDate: '2018-06',
        endDate: '2020-04',
        score: '91.4%',
        url: '',
        summary: '',
        courses: [],
        level: 'intermediate',
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Manual versus automated differential counts in anaemia workups',
        description: 'Final-year project across 300 peripheral smears at a district hospital laboratory.',
        url: '',
        startDate: '2023-01',
        endDate: '2023-05',
        highlights: [
          'Found the analyser flagged 12% of blast-containing smears for review that a manual count confirmed; the written review criteria now sit on the smear bench.',
        ],
        keywords: ['Haematology', 'Peripheral smear', 'Method comparison'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Registered Medical Laboratory Technologist, Karnataka (registration number on request)',
        date: '2023',
        issuer: 'Karnataka State Allied and Healthcare Council',
        url: '',
      },
      {
        id: 'c2',
        name: 'Internal Auditor, ISO 15189',
        date: '2025',
        issuer: 'National Accreditation Board for Testing and Calibration Laboratories',
        url: '',
      },
      {
        id: 'c3',
        name: 'External Quality Assurance Programme, Clinical Biochemistry',
        date: '2025',
        issuer: 'Christian Medical College, Vellore',
        url: '',
      },
      {
        id: 'c4',
        name: 'Biomedical Waste Management and BSL-2 Biosafety',
        date: '2024',
        issuer: 'Karnataka State Pollution Control Board',
        url: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Bench work',
        level: '',
        keywords: [
          'Automated haematology analysers',
          'Peripheral smear morphology',
          'Clinical biochemistry',
          'Coagulation (PT/INR, aPTT)',
          'Urinalysis',
          'Phlebotomy',
        ],
      },
      {
        id: 's2',
        name: 'Quality',
        level: '',
        keywords: [
          'Levey-Jennings charts',
          'Westgard rules',
          'External quality assurance',
          'ISO 15189 documentation',
          'Calibration and maintenance logs',
        ],
      },
      {
        id: 's3',
        name: 'Systems and safety',
        level: '',
        keywords: [
          'LIS entry and validation',
          'Barcode sample tracking',
          'Biomedical waste segregation',
          'Spill and exposure protocol',
          'Cold chain handling',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 4 },
      { id: 'l2', language: 'Kannada', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
