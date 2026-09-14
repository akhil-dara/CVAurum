import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * A newly qualified Band 5 in the NHS. Pre-registration placements carry the
 * weight a graduate CV needs them to, and the part-time assistant job during
 * study is written as work rather than as filler.
 */
export const sample: LibrarySample = {
  slug: 'physiotherapist',
  role: 'Physiotherapist (Band 5)',
  category: 'healthcare',
  seniority: 'entry',
  region: 'uk',
  template: 'verde',
  blurb:
    'A newly qualified NHS physiotherapist, with placements, HCPC registration and a part-time assistant job all pulling their weight.',
  keywords: [
    'physiotherapist CV',
    'band 5 physiotherapy',
    'newly qualified physiotherapist',
    'HCPC registered',
    'NHS rotational physiotherapist',
    'musculoskeletal outpatients',
  ],
  content: content({
    basics: {
      name: 'Nadia Osman',
      label: 'Band 5 Rotational Physiotherapist',
      image: portrait('Nadia Osman'),
      email: 'nadia.osman@example.com',
      phone: '+44 7700 900191',
      url: 'https://nadiaosman.example.com',
      summary:
        'HCPC-registered physiotherapist one year into a Band 5 rotation, currently on trauma and orthopaedics after six months of respiratory and on-call cover. Started the post-operative hip and knee class that freed six one-to-one slots a week and brought the ward waiting list down to same-day.',
      location: { city: 'Cardiff', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'nadiaosmanphysio', url: 'https://linkedin.com/in/nadiaosmanphysio' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Cwm Aderyn University Health Board',
        position: 'Band 5 Rotational Physiotherapist',
        location: 'Cardiff',
        url: '',
        startDate: '2025-08',
        endDate: '',
        summary:
          'Six-month rotations across respiratory, trauma and orthopaedics, and community rehabilitation. Carries 12 to 14 inpatients and takes the respiratory on-call rota.',
        highlights: [
          'Started the twice-weekly post-operative hip and knee class, which freed six one-to-one slots a week and took the ward waiting list to same-day.',
          'Assessed and cleared 340 patients on stairs before discharge in ten months, with 3 fall-related readmissions against a ward baseline of 11.',
          'Redrew the ward exercise handout into pictures and eight short sentences after speaking with 20 patients; day-one teach-back rose from five in ten to nine in ten.',
          'Taught the respiratory on-call refresher to nine newly qualified colleagues, using the case pack written during that rotation.',
        ],
      },
      {
        id: 'w2',
        name: 'Tredowr Care Group',
        position: 'Therapy Assistant (part-time, term-time)',
        location: 'Swansea',
        url: '',
        startDate: '2022-10',
        endDate: '2025-07',
        summary: 'Two residential homes, 16 hours a week alongside full-time study.',
        highlights: [
          'Delivered prescribed exercise programmes to 18 residents a week, reporting progress back to the visiting physiotherapist each fortnight.',
          'Kept the falls diary that showed a corridor handrail gap; after the handrail went in, recorded falls in that wing fell from nine a quarter to two.',
          'Trained 11 care assistants in safe transfer technique, which ended the home reliance on agency moving-and-handling cover.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Cardiff University',
        area: 'Physiotherapy',
        studyType: 'BSc (Hons)',
        location: 'Cardiff',
        startDate: '2022-09',
        endDate: '2025-06',
        score: 'First Class Honours',
        url: '',
        summary: 'Dissertation on early mobilisation after elective hip arthroplasty, graded 78.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Cardiff and Vale College',
        area: 'Biology A*, Chemistry A, Psychology A',
        studyType: 'A-levels',
        location: 'Cardiff',
        startDate: '2020-09',
        endDate: '2022-06',
        score: 'A*AA',
        url: '',
        summary: '',
        courses: [],
        level: 'intermediate',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'HCPC registered, Physiotherapist (registration number on request)',
        date: 'Since 2025',
        issuer: 'Health and Care Professions Council',
        url: '',
      },
      {
        id: 'c2',
        name: 'Chartered member (MCSP)',
        date: '2025',
        issuer: 'Chartered Society of Physiotherapy',
        url: '',
      },
      {
        id: 'c3',
        name: 'Respiratory On-Call Competency, signed off',
        date: '2026',
        issuer: 'Cwm Aderyn University Health Board',
        url: '',
      },
      { id: 'c4', name: 'Emergency First Aid at Work', date: '2025', issuer: 'St John Ambulance', url: '' },
    ],
    custom: [
      {
        id: 'cs1',
        name: 'Pre-registration placements',
        items: [
          {
            id: 'ci1',
            name: 'Respiratory and critical care',
            subtitle: 'Cwm Aderyn University Health Board',
            date: '2024',
            location: 'Cardiff',
            url: '',
            summary:
              'Six weeks on intensive care and the respiratory ward, treating 60 ventilated and post-extubation patients under supervision.',
            highlights: [],
          },
          {
            id: 'ci2',
            name: 'Musculoskeletal outpatients',
            subtitle: 'Glanmor Health Centre',
            date: '2024',
            location: 'Bridgend',
            url: '',
            summary:
              'Held a supervised caseload of eight patients a day in the final fortnight, with a graded return-to-work plan written for each.',
            highlights: [],
          },
          {
            id: 'ci3',
            name: 'Community neurological rehabilitation',
            subtitle: 'Tredowr Care Group',
            date: '2025',
            location: 'Swansea',
            url: '',
            summary:
              'Home visits to 14 stroke and Parkinson patients, writing the six-week goal plans reviewed at discharge.',
            highlights: [],
          },
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Assessment',
        level: '',
        keywords: [
          'Subjective and objective assessment',
          'Outcome measures (Berg, TUG)',
          'Gait analysis',
          'Respiratory auscultation',
          'Red flag screening',
        ],
      },
      {
        id: 's2',
        name: 'Treatment',
        level: '',
        keywords: [
          'Exercise prescription',
          'Manual therapy',
          'Airway clearance',
          'Post-operative mobilisation',
          'Falls prevention',
          'Group class delivery',
        ],
      },
      {
        id: 's3',
        name: 'Working practice',
        level: '',
        keywords: [
          'Multidisciplinary ward rounds',
          'Discharge planning',
          'Caseload prioritisation',
          'CSP record-keeping standards',
          'Student supervision',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Taffside Harriers Athletics Club',
        position: 'Pitchside First Aid and Rehabilitation Volunteer',
        url: '',
        startDate: '2023-09',
        endDate: '',
        summary: '',
        highlights: [
          'Covers Sunday fixtures for a 90-member club, screening 40 runners a season and returning 34 of them to full training inside the planned window.',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Arabic', fluency: 'Fluent', rating: 4 },
      { id: 'l3', language: 'Welsh', fluency: 'Conversational', rating: 2 },
    ],
  }),
}

export default sample
