import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * The hardest résumé in education to write well: two years in, almost no
 * seniority to lean on, so every line has to carry a class size, a screening
 * score or an attendance figure instead.
 */
export const sample: LibrarySample = {
  slug: 'elementary-school-teacher',
  role: 'Elementary School Teacher',
  category: 'education',
  seniority: 'entry',
  region: 'us',
  template: 'modern',
  blurb:
    'Two years in the classroom, written so every line names a class, a number and what changed for the children in it.',
  keywords: [
    'elementary teacher',
    'third grade teacher',
    'K-5 teacher resume',
    'guided reading',
    'new teacher resume',
    'classroom teacher',
  ],
  content: content({
    basics: {
      name: 'Hallie Brennan',
      label: 'Third Grade Teacher',
      image: '',
      email: 'hallie.brennan@example.com',
      phone: '+1 (555) 0118',
      url: 'https://halliebrennan.example.com',
      summary:
        'Elementary teacher licensed in Ohio for grades K-5, now in a third year of full classroom teaching at a Title I school. Took a third grade class from 11 of 24 students meeting the reading benchmark to 19, and cut chronic absence in that class from 17% to 6%.',
      location: { city: 'Columbus', region: 'OH', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'halliebrennan', url: 'https://linkedin.com/in/halliebrennan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Kestrel Ridge Elementary School',
        logo: monogram('K', '#b45309'),
        position: 'Third Grade Teacher',
        location: 'Columbus, OH',
        url: '',
        startDate: '2024-08',
        endDate: '',
        summary:
          'Title I school, 480 students. One of four third grade classrooms; 24 students, seven on IEPs or 504 plans.',
        highlights: [
          'Teaches a 24-student third grade class in which 19 met or exceeded the spring reading benchmark, against 11 at the September screening.',
          'Built a daily 30-minute small-group reading block from running-record data, moving eight students off the intervention list by February.',
          'Wrote the grade team unit on Ohio watersheds, now taught in all four third grade classrooms and shared with the district science coach.',
          'Cut chronic absence in the class from 17% to 6% by calling every family in the first two weeks and again after any second absence.',
          'Mentors a first-year teacher on the grade team through weekly planning sessions and two observations a month.',
        ],
      },
      {
        id: 'w2',
        name: 'Marley Park Elementary School',
        logo: monogram('M', '#0f766e'),
        position: 'Long-Term Substitute Teacher, Grade 1',
        location: 'Columbus, OH',
        url: '',
        startDate: '2023-08',
        endDate: '2024-06',
        summary: '',
        highlights: [
          'Held a first grade class for the full year after the classroom teacher went on leave in week three, keeping the reading scope and sequence the school had planned.',
          'Taught the phonics routine from the school structured-literacy materials; 21 of 25 students passed the end-of-year letter-sound check, against 14 at midyear.',
          'Set up take-home book bags for all 25 students, which raised weekly reading logs returned from 9 to 22.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Ohio State University',
        area: 'Elementary Education',
        studyType: 'B.S.Ed.',
        location: 'Columbus, OH',
        startDate: '2019-08',
        endDate: '2023-05',
        score: '3.7 GPA',
        url: '',
        summary:
          'Full-year student teaching placement in a Grade 2 classroom of 27. Capstone study on early reading intervention in multilingual classrooms.',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Instruction',
        level: '',
        keywords: [
          'Guided reading',
          'Small-group intervention',
          'Differentiation',
          'Writing workshop',
          'Standards-based planning',
        ],
      },
      {
        id: 's2',
        name: 'Assessment',
        level: '',
        keywords: [
          'Running records',
          'DIBELS',
          'Formative checks',
          'Data-driven grouping',
          'IEP and 504 accommodations',
        ],
      },
      {
        id: 's3',
        name: 'Classroom and family',
        level: '',
        keywords: [
          'Responsive Classroom',
          'Behavior plans',
          'Family conferences',
          'Co-teaching',
          'Spanish-speaking family outreach',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Ohio Resident Educator License, Primary (K-5)',
        date: '2023',
        issuer: 'Ohio Department of Education and Workforce',
        url: '',
      },
      {
        id: 'c2',
        name: 'Classroom Educator, Level 1',
        date: '2024',
        issuer: 'Academy of Orton-Gillingham Practitioners and Educators',
        url: '',
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Scioto Reads',
        position: 'Volunteer Reading Tutor',
        url: '',
        startDate: '2021-09',
        endDate: '',
        summary: '',
        highlights: [
          'Tutors two second graders every Saturday morning during the school year; both finished 2025 reading at grade level.',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
