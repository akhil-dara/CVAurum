import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * How to put a career break on a résumé: as a dated entry in its own right,
 * with the CPD that continued through it, followed by the contract role that
 * bridged back to permanent work. Nothing is hidden and nothing needs
 * explaining in an interview.
 */
export const sample: LibrarySample = {
  slug: 'electrical-design-engineer',
  role: 'Electrical Design Engineer',
  category: 'engineering',
  seniority: 'mid',
  region: 'uk',
  template: 'timeline',
  blurb:
    'Seven years of building-services electrical design, including a career break and the contract role that followed it.',
  keywords: [
    'electrical design engineer',
    'building services engineer',
    'BS 7671',
    'IEng MIET',
    'LV distribution design',
    'Amtech ProDesign',
  ],
  guide: {
    why: [
      'The career break is listed as an entry of its own, with IET membership and the BS 7671 Amendment 2 update course kept current. Naming the gap and showing CPD continued answers the question before an interviewer asks it.',
      'Savings are framed in the terms a building-services client cares about: 190 kVA off the connected load avoided a DNO supply upgrade quoted at £310,000.',
      'Projects are given value and sector, such as a £24m community diagnostic centre “energised on programme with no post-handover remedials”, which tells a UK reader the healthcare experience and the delivery record in one line.',
      'Professional standing is explicit: Incorporated Engineer (IEng MIET), working towards CEng, and mentoring graduates through the IET Monitored Professional Development Scheme.',
    ],
    faq: [
      {
        q: 'How long should an electrical design engineer CV be in the UK?',
        a: 'Two pages is standard for a UK engineering CV with five or more years of experience. Lead with project value, sector and the systems you designed, and leave out a photo, date of birth and marital status.',
      },
      {
        q: 'How do you explain a career break on an engineering CV?',
        a: 'List it as a dated entry with a one-line reason, then show what kept your competence current: institution membership, CPD, regulation updates such as BS 7671 amendments. Follow it with the role that brought you back.',
      },
      {
        q: 'What software should an electrical design engineer CV list?',
        a: 'The design and calculation tools the practice uses: Amtech ProDesign or Trimble Nova for cable sizing, Dialux for lighting, Revit MEP and AutoCAD for drawings. Show at least one in a bullet with a result.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Sian Merriweather',
      label: 'Electrical Design Engineer',
      image: '',
      email: 'sian.merriweather@example.com',
      phone: '+44 7700 900128',
      url: 'https://sianmerriweather.example.com',
      summary:
        'Electrical design engineer with seven years on LV distribution, lighting and fire-alarm design for healthcare and education buildings. Designed the electrical services for a £24m community diagnostic centre that energised on programme with no post-handover remedials. Registered IEng with the IET and working towards CEng.',
      location: { city: 'Bristol', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'sianmerriweather', url: 'https://linkedin.com/in/sianmerriweather' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Marbeck Building Services',
        position: 'Electrical Design Engineer',
        location: 'Bristol',
        url: '',
        startDate: '2023-03',
        endDate: '',
        summary: 'Electrical lead on healthcare and education projects between £3m and £24m.',
        highlights: [
          'Designed the LV distribution, lighting and fire-alarm systems for a £24m community diagnostic centre, energised on programme with no post-handover remedials.',
          'Took 190 kVA off the connected load of a secondary-school scheme through daylight-linked lighting and revised diversity, avoiding a DNO supply upgrade quoted at £310,000.',
          'Standardised the Dialux calculation templates used across the practice, taking a typical lighting scheme from three days to one.',
          'Mentors two graduates through the IET Monitored Professional Development Scheme; both passed their first-year review.',
        ],
      },
      {
        id: 'w2',
        name: 'Penhale Design Partnership',
        position: 'Electrical Design Engineer (contract)',
        location: 'Bristol',
        url: '',
        startDate: '2022-06',
        endDate: '2023-02',
        summary: 'Nine-month contract covering a maternity leave on the residential team.',
        highlights: [
          'Delivered RIBA Stage 4 electrical design for three retirement-living blocks totalling 214 dwellings inside the contract term.',
          'Resolved 62 clashes between containment and structural steel in Revit before the first site release, avoiding an estimated four weeks of rework.',
        ],
      },
      {
        id: 'w3',
        name: 'Career break',
        position: 'Full-time family carer',
        location: 'Cardiff',
        url: '',
        startDate: '2021-04',
        endDate: '2022-05',
        summary:
          'Fourteen months of full-time care for a family member. IET membership and CPD record kept current, including the BS 7671 Amendment 2 update course.',
        highlights: [],
      },
      {
        id: 'w4',
        name: 'Calderstone M&E',
        position: 'Electrical Engineer',
        location: 'Cardiff',
        url: '',
        startDate: '2017-09',
        endDate: '2021-03',
        summary: '',
        highlights: [
          'Produced electrical designs for 40 primary-care refurbishments, each delivered inside a six-week survey-to-issue window.',
          'Rewrote the office cable-sizing spreadsheet to BS 7671 Amendment 1, correcting a volt-drop error that had undersized 11 circuits.',
          'Witnessed commissioning and testing on 18 distribution boards, clearing all certification for handover without a retest.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Bath',
        area: 'Electrical and Electronic Engineering',
        studyType: 'BEng (Hons)',
        location: 'Bath',
        startDate: '2013-09',
        endDate: '2017-06',
        score: 'Upper Second Class Honours (2:1)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: [
          'LV distribution',
          'Lighting design',
          'Fire alarm (BS 5839)',
          'Small power & containment',
          'Load and diversity calculations',
          'Earthing and bonding',
        ],
      },
      {
        id: 's2',
        name: 'Standards',
        level: '',
        keywords: ['BS 7671', 'CIBSE Guides', 'HTM 06-01', 'BS 5266 emergency lighting', 'Part L compliance'],
      },
      {
        id: 's3',
        name: 'Software',
        level: '',
        keywords: ['Amtech ProDesign', 'Dialux evo', 'Revit MEP', 'AutoCAD', 'Trimble Nova'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Incorporated Engineer (IEng MIET)', date: '2022', issuer: 'Engineering Council', url: '' },
      {
        id: 'c2',
        name: 'City & Guilds 2382-22: BS 7671 18th Edition Wiring Regulations',
        date: '2022',
        issuer: 'City & Guilds',
        url: '',
      },
      { id: 'c3', name: 'Site Safety Plus SSSTS', date: '2024', issuer: 'CITB', url: '' },
    ],
  }),
}

export default sample
