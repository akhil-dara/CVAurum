import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A career changer: two years of instrumentation engineering, then a PGCE and
 * six years of teaching. The engineering role earns its place because it is
 * where the schools outreach — and the decision to retrain — came from.
 */
export const sample: LibrarySample = {
  slug: 'secondary-physics-teacher',
  role: 'Secondary School Physics Teacher',
  category: 'education',
  seniority: 'mid',
  region: 'uk',
  template: 'ivy',
  blurb:
    'An engineer who retrained to teach, with A-level uptake and GCSE grades attached to each change made to the department.',
  keywords: [
    'physics teacher',
    'secondary school teacher',
    'teacher of science',
    'QTS PGCE',
    'second in science',
    'A-level physics',
  ],
  content: content({
    basics: {
      name: 'Ellis Whitmore',
      label: 'Teacher of Physics and Second in Science',
      image: '',
      email: 'ellis.whitmore@example.com',
      phone: '+44 7700 900219',
      url: '',
      summary:
        'Physics teacher with six years in 11-18 comprehensives, following two years as a design engineer. Rewrote a Key Stage 4 physics scheme of work that took grade 5+ from 58% to 74% over three cohorts, and grew A-level physics from 19 students to 34.',
      location: { city: 'Leeds', region: 'West Yorkshire', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'elliswhitmore', url: 'https://linkedin.com/in/elliswhitmore' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ashcombe Academy',
        position: 'Teacher of Physics and Second in Science',
        location: 'Leeds',
        url: '',
        startDate: '2023-09',
        endDate: '',
        summary:
          '11-18 comprehensive, 1,450 on roll. Leads physics across Key Stages 3 to 5 within a science faculty of 14.',
        highlights: [
          'Teaches 22 periods a fortnight across Key Stages 3 to 5, including two A-level physics classes and a Year 11 triple science set.',
          'Rewrote the Key Stage 4 physics scheme of work around the required practicals, taking GCSE physics grade 5+ from 58% to 74% across three cohorts.',
          'Set up a Year 12 bridging programme in maths for physicists, which grew A-level uptake from 19 students to 34 and girls from 4 to 13.',
          'Mentors two early career teachers through the ECF, observing fortnightly; both passed induction on schedule.',
          'Organises the fortnightly practical audit that ended a two-year run of equipment shortages reported on lesson-observation forms.',
        ],
      },
      {
        id: 'w2',
        name: 'Northgate High School',
        position: 'Teacher of Science',
        location: 'Sheffield',
        url: '',
        startDate: '2020-09',
        endDate: '2023-08',
        summary: '',
        highlights: [
          'Taught five GCSE combined science sets a year; the lowest prior-attainment set in 2022 finished a grade above target on the department tracker.',
          'Built the practical assessment tracker adopted by all nine science teachers, cutting the marking each required practical needed from 90 minutes to 25.',
          'Delivered the Year 9 options talk for science, after which triple science uptake rose from 41 pupils to 63.',
        ],
      },
      {
        id: 'w3',
        name: 'Vantis Instrumentation',
        position: 'Graduate Design Engineer',
        location: 'Sheffield',
        url: '',
        startDate: '2017-09',
        endDate: '2019-07',
        summary: '',
        highlights: [
          'Tested pressure sensors for industrial gas rigs and wrote the calibration procedure still followed on the 400-series line.',
          'Ran the schools outreach programme, reaching 600 pupils across nine schools, which is what led to retraining as a teacher.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Leeds',
        area: 'Secondary Science (Physics)',
        studyType: 'PGCE',
        location: 'Leeds',
        startDate: '2019-09',
        endDate: '2020-07',
        score: 'Merit',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Sheffield',
        area: 'Physics',
        studyType: 'BSc (Hons)',
        location: 'Sheffield',
        startDate: '2014-09',
        endDate: '2017-07',
        score: 'First Class Honours',
        url: '',
        summary:
          'Final-year project on low-cost muon detection, built into the sixth-form club project still run at Ashcombe.',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Curriculum',
        level: '',
        keywords: [
          'AQA GCSE Physics',
          'A-level Physics',
          'Key Stage 3 science',
          'Required practicals',
          'Scheme of work design',
        ],
      },
      {
        id: 's2',
        name: 'Teaching practice',
        level: '',
        keywords: [
          'Retrieval practice',
          'Worked examples',
          'Adaptive teaching',
          'Live marking',
          'Behaviour for learning',
        ],
      },
      {
        id: 's3',
        name: 'Department leadership',
        level: '',
        keywords: [
          'ECF mentoring',
          'Data analysis and targets',
          'Exam board moderation',
          'Parental engagement',
          'Technician liaison',
        ],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Qualified Teacher Status (QTS)', date: '2020', issuer: 'Teaching Regulation Agency', url: '' },
      {
        id: 'c2',
        name: 'NPQ in Leading Teacher Development',
        date: '2025',
        issuer: 'Department for Education',
        url: '',
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Aire Valley Stargazers',
        position: 'Outreach Volunteer',
        url: '',
        startDate: '2021-03',
        endDate: '',
        summary: '',
        highlights: [
          'Runs six public observing evenings a year, each bringing 40 to 70 visitors, and lends the club telescopes to school clubs.',
        ],
      },
    ],
  }),
}

export default sample
