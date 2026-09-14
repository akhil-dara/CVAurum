import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Twenty-four years in one profession, four roles, and the ladder visible in
 * the dates. A head teacher is hired on roll numbers, board results and staff
 * retention, so those three run through every role rather than a line about
 * vision and values.
 */
export const sample: LibrarySample = {
  slug: 'school-principal',
  role: 'School Principal',
  category: 'education',
  seniority: 'lead',
  region: 'india',
  template: 'folio-noir',
  blurb:
    'Eight years leading a 1,860-student CBSE school, with enrolment, board results and staff retention on every line.',
  keywords: [
    'school principal',
    'head of school',
    'CBSE principal',
    'vice principal',
    'school leadership',
    'academic administration',
  ],
  content: content({
    basics: {
      name: 'Vikram Nandakumar',
      label: 'Principal, Senior Secondary School',
      image: '',
      email: 'vikram.nandakumar@example.com',
      phone: '+91 12345 70926',
      url: '',
      summary:
        'School leader with 24 years in CBSE senior secondary education, the last eight as principal of a 1,860-student school in Chennai. Grew the roll by 620 while holding class size at 34, and cut teacher attrition from 19% to 6%.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'vikramnandakumar', url: 'https://linkedin.com/in/vikramnandakumar' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Kaveri Heights Senior Secondary School',
        position: 'Principal',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2018-04',
        endDate: '',
        summary:
          'CBSE co-educational school, Classes I to XII. 1,860 students, 112 teaching staff, annual budget of Rs 21 crore.',
        highlights: [
          'Leads 112 teaching staff and 1,860 students; the Class XII pass rate has held at 100% for five years while the average aggregate rose from 74% to 86%.',
          'Lifted Class X mathematics and science averages by 11 and 9 points through a daily 40-minute remedial block and named tracking for every child below 60%.',
          'Grew enrolment from 1,240 to 1,860 over eight years while holding class size at 34, adding nine sections and 28 teachers without a fee increase above inflation.',
          'Cut teacher attrition from 19% to 6% with a paid 40-hour annual development entitlement and a named mentor for every new joiner.',
          'Opened 128 places under the RTE quota and added the transport and uniform support that has kept attendance for those students above 92%.',
        ],
      },
      {
        id: 'w2',
        name: 'Kaveri Heights Senior Secondary School',
        position: 'Vice Principal (Academics)',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2013-06',
        endDate: '2018-03',
        summary: '',
        highlights: [
          'Rewrote the Classes VI to VIII assessment policy around termly diagnostics, taking students reading below grade level from 31% to 14%.',
          'Introduced fortnightly lesson observation cycles across eight departments, with written feedback for all 74 teachers and a termly moderation meeting.',
          'Led the CBSE affiliation renewal and the infrastructure case that funded 12 new classrooms and a 4,000-title library.',
        ],
      },
      {
        id: 'w3',
        name: 'Thillai Public School',
        position: 'Head of Department, Science',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2007-06',
        endDate: '2013-05',
        summary: '',
        highlights: [
          'Led eight science teachers across Classes VI to XII and raised the Class XII physics average from 61% to 78% over four cohorts.',
          'Built the first working junior laboratories for Classes VI to VIII, with a timetabled practical for each of 640 students every fortnight.',
        ],
      },
      {
        id: 'w4',
        name: 'Thillai Public School',
        position: 'Post Graduate Teacher, Physics',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2002-06',
        endDate: '2007-05',
        summary: '',
        highlights: [
          'Taught Classes XI and XII physics to 180 students a year; students clearing the engineering entrance cut-off rose from 9 a year to 34.',
          'Started the Saturday doubt-clearing clinic that ran for 14 years and is still timetabled.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Madras',
        area: 'Education',
        studyType: 'M.Ed.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2010-07',
        endDate: '2012-05',
        score: 'First Class, 71%',
        url: '',
        summary: 'Completed part time while teaching. Dissertation on remedial timetabling in large CBSE schools.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Madras',
        area: 'Education',
        studyType: 'B.Ed.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2001-06',
        endDate: '2002-04',
        score: 'First Class',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e3',
        institution: 'Loyola College, Chennai',
        area: 'Physics',
        studyType: 'M.Sc.',
        location: 'Chennai, Tamil Nadu',
        startDate: '1999-06',
        endDate: '2001-04',
        score: 'First Class',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'School leadership',
        level: '',
        keywords: ['Academic planning', 'Staff appraisal', 'Timetabling', 'Budget and fee policy', 'Board affiliation'],
      },
      {
        id: 's2',
        name: 'Curriculum and outcomes',
        level: '',
        keywords: [
          'CBSE curriculum',
          'NEP 2020 rollout',
          'Assessment reform',
          'Remedial programmes',
          'Career counselling',
        ],
      },
      {
        id: 's3',
        name: 'Community and compliance',
        level: '',
        keywords: [
          'Parent engagement',
          'RTE admissions',
          'Child safeguarding',
          'Alumni relations',
          'Fire and safety audits',
        ],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'State Award for Best Principal',
        date: '2023',
        awarder: 'Directorate of School Education, Tamil Nadu',
        summary: 'Cited for the remedial programme and the RTE admissions support.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certificate in School Leadership and Management',
        date: '2019',
        issuer: 'National Institute of Educational Planning and Administration',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
