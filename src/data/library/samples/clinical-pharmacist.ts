import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A hospital pharmacist in India. State council registration is stated in the
 * format a recruiter expects, and the stewardship work is measured the way the
 * infection control committee measures it.
 */
export const sample: LibrarySample = {
  slug: 'clinical-pharmacist',
  role: 'Clinical Pharmacist',
  category: 'healthcare',
  seniority: 'mid',
  region: 'india',
  template: 'verdant',
  blurb:
    'Six years of ward pharmacy in Indian hospitals, with antimicrobial stewardship results a clinical committee would recognise.',
  keywords: [
    'clinical pharmacist resume',
    'hospital pharmacist',
    'Pharm.D',
    'antimicrobial stewardship',
    'medication reconciliation',
    'registered pharmacist India',
  ],
  guide: {
    why: [
      'Stewardship results are given in the unit an infection control committee uses: restricted carbapenem days of therapy down 34% in 12 months, “with no adverse signal at mortality review”.',
      'Safety interventions are counted and qualified: 148 dosing errors prevented, 41 of them renal adjustments, and 47 of 310 reconciliation discrepancies judged clinically significant by the treating unit.',
      'Registration is stated the way Indian recruiters expect, Maharashtra State Pharmacy Council with the number on request, beside a Pharm.D with 8.4 CGPA from Poona College of Pharmacy.',
      'The anticoagulation clinic shows initiative beyond the ward: 210 warfarin patients followed and time in therapeutic range raised from 48% to 67%.',
    ],
    faq: [
      { q: 'What skills go on a clinical pharmacist resume?', a: 'Ward and ICU rounds, medication reconciliation, renal and hepatic dosing, therapeutic drug monitoring and antimicrobial stewardship, plus safety work such as high-alert medication protocols. Show each with a figure in a bullet: charts reviewed, errors prevented, days of therapy reduced.' },
      { q: 'Should a pharmacist resume include the registration number?', a: 'State the council and that the number is available on request; give the number itself only on an application form that asks for it. Include the renewal year so the reader knows it is current.' },
      { q: 'Is a Pharm.D enough to become a clinical pharmacist in India?', a: 'It is the usual route for hospital clinical roles, especially with an internship in general medicine or specialty wards. Experience on an ICU or stewardship round and a certificate in antimicrobial stewardship make a candidate easier to place.' },
    ],
  },
  content: content({
    basics: {
      name: 'Anuja Kulkarni',
      label: 'Clinical Pharmacist, Critical Care and Antimicrobial Stewardship',
      image: '',
      email: 'anuja.kulkarni@example.com',
      phone: '+91 12345 60817',
      url: 'https://anujakulkarni.example.com',
      summary:
        'Pharm.D-qualified clinical pharmacist with six years on Indian hospital wards, now covering a 22-bed ICU and the antimicrobial stewardship round. Built the stewardship programme that cut restricted carbapenem days of therapy by 34% in a year with no adverse signal at mortality review.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'anujakulkarnipharmd', url: 'https://linkedin.com/in/anujakulkarnipharmd' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Chandanvan Multispeciality Hospital',
        logo: brandmark('Chandanvan Multispeciality Hospital'),
        position: 'Clinical Pharmacist, Critical Care and Antimicrobial Stewardship',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-03',
        endDate: '',
        summary:
          '420-bed NABH-accredited hospital. Covers the medical and surgical ICU round and sits on the infection control committee.',
        highlights: [
          'Reviews 60 to 70 ICU medication charts a week; interventions in the first year prevented 148 dosing errors, 41 of them renal adjustments.',
          'Built the twice-weekly stewardship round with two intensivists, taking restricted carbapenem days of therapy down 34% in 12 months.',
          'Wrote the 26-drug intravenous-to-oral switch protocol now used on four wards, shortening mean IV antibiotic duration from 6.8 days to 4.1.',
          'Trains every new nursing batch on high-alert medication double checks; 180 nurses through the session so far, and reported insulin near-misses halved.',
        ],
      },
      {
        id: 'w2',
        name: 'Suvarna Institute of Medical Sciences',
        logo: brandmark('Suvarna Institute of Medical Sciences'),
        position: 'Clinical Pharmacist',
        location: 'Nashik, Maharashtra',
        url: '',
        startDate: '2022-04',
        endDate: '2024-02',
        summary: '',
        highlights: [
          'Set up the first pharmacist-led anticoagulation clinic at the hospital, following 210 warfarin patients and raising time in therapeutic range from 48% to 67%.',
          'Reconciled medication histories for 2,400 admissions and found 310 discrepancies, 47 of which the treating unit judged clinically significant.',
          'Cut ward-stock expiry write-offs from Rs 4.2 lakh to Rs 90,000 a year with a monthly near-expiry swap between wards.',
        ],
      },
      {
        id: 'w3',
        name: 'Meghdoot Hospitals',
        logo: brandmark('Meghdoot Hospitals'),
        position: 'Pharmacist, Inpatient Dispensary',
        location: 'Nagpur, Maharashtra',
        url: '',
        startDate: '2020-08',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Checked and dispensed about 400 inpatient prescriptions a day, and introduced a look-alike sound-alike shelf separation that ended three recurring mix-ups.',
          'Digitised the narcotic register, turning a two-hour manual monthly reconciliation into a 15-minute one.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Poona College of Pharmacy, Bharati Vidyapeeth (Deemed to be University)',
        area: 'Pharmacy Practice',
        studyType: 'Pharm.D',
        location: 'Pune, Maharashtra',
        startDate: '2014-08',
        endDate: '2020-07',
        score: '8.4 CGPA',
        url: '',
        summary: 'Sixth-year internship in general medicine, nephrology and paediatrics.',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Stewardship dashboard',
        description:
          'A ward-level board tracking antibiotic days of therapy per 1,000 patient days, built from the pharmacy issue data already collected.',
        url: '',
        startDate: '2024-08',
        endDate: '',
        highlights: [
          'Published to the six unit heads every Monday; three units changed their empirical choice within two cycles of seeing their own line.',
        ],
        keywords: ['Antimicrobial stewardship', 'Days of therapy', 'Pharmacy data'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Registered Pharmacist, Maharashtra State Pharmacy Council (registration number on request)',
        date: 'Renewed 2025',
        issuer: 'Pharmacy Council of India',
        url: '',
      },
      {
        id: 'c2',
        name: 'Antimicrobial Stewardship Certificate',
        date: '2024',
        issuer: 'British Society for Antimicrobial Chemotherapy',
        url: '',
      },
      {
        id: 'c3',
        name: 'Good Clinical Practice (ICH-GCP)',
        date: '2023',
        issuer: 'Indian Society for Clinical Research',
        url: '',
      },
      { id: 'c4', name: 'Basic Life Support Provider', date: '2025', issuer: 'American Heart Association', url: '' },
    ],
    skills: [
      {
        id: 's1',
        name: 'Clinical practice',
        level: '',
        keywords: [
          'Ward and ICU rounds',
          'Medication reconciliation',
          'Renal and hepatic dosing',
          'Therapeutic drug monitoring',
          'Anticoagulation clinics',
          'Parenteral nutrition review',
        ],
      },
      {
        id: 's2',
        name: 'Medication safety',
        level: '',
        keywords: [
          'Adverse drug reaction reporting',
          'High-alert medication protocols',
          'Look-alike sound-alike controls',
          'Antibiotic policy',
          'NABH documentation',
        ],
      },
      {
        id: 's3',
        name: 'Teaching and analysis',
        level: '',
        keywords: [
          'Nursing in-service training',
          'Pharm.D intern supervision',
          'Drug utilisation review',
          'Formulary evaluation',
          'Prescription audit',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
