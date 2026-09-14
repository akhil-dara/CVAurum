import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A classroom teacher who moved into edtech. The teaching years stay at the
 * bottom because they are the reason the design work is any good, but the
 * numbers on top are completion, retention and prep time — what the new
 * industry actually measures.
 */
export const sample: LibrarySample = {
  slug: 'instructional-designer',
  role: 'Instructional Designer',
  category: 'education',
  seniority: 'mid',
  region: 'india',
  template: 'swiss-aurum',
  blurb:
    'A mathematics teacher who moved into edtech, with the completion and retention numbers each redesign actually moved.',
  keywords: [
    'instructional designer',
    'learning experience designer',
    'edtech curriculum',
    'e-learning storyboarding',
    'teacher to instructional design',
    'learning design India',
  ],
  content: content({
    basics: {
      name: 'Meghna Sarkar',
      label: 'Senior Instructional Designer',
      image: '',
      email: 'meghna.sarkar@example.com',
      phone: '+91 12345 60418',
      url: 'https://meghnasarkar.example.com',
      summary:
        'Instructional designer with six years in edtech after three years teaching school mathematics. Designs the K-12 mathematics catalogue at a Pune studio, where rebuilding the Grade 8 algebra course around faded worked examples took completion from 41% to 68%.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'meghnasarkar', url: 'https://linkedin.com/in/meghnasarkar' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Lumenpath Learning',
        logo: brandmark('Lumenpath Learning'),
        position: 'Senior Instructional Designer',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2023-04',
        endDate: '',
        summary: 'K-12 mathematics catalogue for a school-facing platform used by 340 schools.',
        highlights: [
          'Owns the Grades 6 to 10 mathematics catalogue: 240 lessons shipped, each with a formative check, a worked example set and a teacher script.',
          'Rebuilt the Grade 8 algebra course around faded worked examples, raising completion from 41% to 68% and median quiz score from 54% to 71%.',
          'Runs monthly usability sessions with 60 teachers a year; the redesigned lesson planner cut reported preparation time per lesson from 25 minutes to 9.',
          'Wrote the studio accessibility standard for captions, contrast and screen-reader order, now applied to all 240 lessons and to new production by default.',
          'Reviews every storyboard before production and coaches two junior designers through their first courses.',
        ],
      },
      {
        id: 'w2',
        name: 'Nimbus Learning Studio',
        logo: brandmark('Nimbus Learning Studio'),
        position: 'Instructional Designer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2020-06',
        endDate: '2023-03',
        summary: '',
        highlights: [
          'Converted 18 instructor-led corporate courses to self-paced modules, taking average time to completion from six weeks to 11 days.',
          'Built the storyboard template and review checklist the team of nine still works from, cutting rework cycles per course from three to one.',
          'Ran a randomised trial of spaced quizzing across 3,200 learners, which raised 30-day retention scores by 22 points and became the studio default.',
        ],
      },
      {
        id: 'w3',
        name: 'Hillcrest Public School',
        logo: brandmark('Hillcrest Public School'),
        position: 'Mathematics Teacher, Grades 7-10',
        location: 'Nashik, Maharashtra',
        url: '',
        startDate: '2017-06',
        endDate: '2020-04',
        summary: '',
        highlights: [
          'Taught six sections of mathematics, 240 students a year; the Grade 10 board average in mathematics rose from 68% to 79% across three cohorts.',
          'Built a bank of 300 graded problems that all four mathematics teachers adopted, replacing per-teacher worksheet writing.',
          'Digitised the remedial mathematics programme for 90 students across three trust schools, which is where the move into design began.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Savitribai Phule Pune University',
        area: 'Education',
        studyType: 'M.A.',
        location: 'Pune, Maharashtra',
        startDate: '2019-07',
        endDate: '2021-05',
        score: 'First Class, 72%',
        url: '',
        summary:
          'Completed part time alongside full-time work. Dissertation on worked-example design in low-bandwidth classrooms.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Tilak College of Education, Pune',
        area: 'Education',
        studyType: 'B.Ed.',
        location: 'Pune, Maharashtra',
        startDate: '2016-06',
        endDate: '2017-04',
        score: '76%',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e3',
        institution: 'Fergusson College, Pune',
        area: 'Mathematics',
        studyType: 'B.Sc.',
        location: 'Pune, Maharashtra',
        startDate: '2013-06',
        endDate: '2016-04',
        score: '8.1 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Open Maths Worksheets',
        description:
          'A free worksheet generator for Grades 6 to 8 that prints the same problem set in English and Marathi.',
        url: 'https://worksheets.example.com',
        startDate: '2021-08',
        endDate: '',
        highlights: [
          'Used by 1,900 teachers across Maharashtra; every sheet ships with an answer key and a two-page teacher note.',
        ],
        keywords: ['Curriculum design', 'Bilingual materials', 'Open educational resources'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: ['Backward design', 'Storyboarding', 'Worked examples', 'Assessment writing', 'Cognitive load'],
      },
      {
        id: 's2',
        name: 'Tools',
        level: '',
        keywords: ['Articulate Storyline', 'Figma', 'Camtasia', 'xAPI', 'SCORM', 'Moodle'],
      },
      {
        id: 's3',
        name: 'Evidence',
        level: '',
        keywords: [
          'A/B testing',
          'Learner interviews',
          'Completion analytics',
          'Accessibility audits',
          'Usability testing',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Professional in Talent Development (CPTD)',
        date: '2024',
        issuer: 'Association for Talent Development',
        url: '',
      },
      {
        id: 'c2',
        name: 'Certified Professional in Accessibility Core Competencies (CPACC)',
        date: '2023',
        issuer: 'International Association of Accessibility Professionals',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
