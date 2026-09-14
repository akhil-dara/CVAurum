import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * An internal move rather than a job change: eighteen months of writing code,
 * then the training team. The engineering role is kept because it is the
 * reason the trainer is credible in front of engineers.
 */
export const sample: LibrarySample = {
  slug: 'corporate-trainer',
  role: 'Corporate Trainer',
  category: 'education',
  seniority: 'entry',
  region: 'india',
  template: 'modern',
  blurb:
    'An engineer who moved into technical training, with cohort pass rates and score movements behind every change made.',
  keywords: [
    'corporate trainer',
    'technical trainer',
    'learning and development',
    'onboarding bootcamp',
    'L&D associate',
    'trainer resume India',
  ],
  content: content({
    basics: {
      name: 'Nikhil Raghavan',
      label: 'Technical Trainer, Learning and Development',
      image: '',
      email: 'nikhil.raghavan@example.com',
      phone: '+91 12345 38207',
      url: '',
      summary:
        'Technical trainer with three years at a product engineering firm, the first eighteen months of them writing the code now taught. Runs the four-week engineering onboarding bootcamp, where a rebuilt Java module lifted average assessment scores from 61% to 78%.',
      location: { city: 'Hyderabad', region: 'Telangana', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'nikhilraghavan', url: 'https://linkedin.com/in/nikhilraghavan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Orbitspan Technologies',
        position: 'Learning and Development Associate (Technical Trainer)',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2025-02',
        endDate: '',
        summary: 'Engineering academy of four trainers; owns the Java and SQL tracks of the new-hire bootcamp.',
        highlights: [
          'Runs the four-week onboarding bootcamp for engineering hires: 148 trainees across five cohorts, of whom 96% cleared the exit assessment at the first attempt.',
          'Rebuilt the Java track around live debugging of real defects from the product backlog, raising average assessment scores from 61% to 78%.',
          'Facilitates 30 to 40 people a month through SQL and version-control workshops, and answers the internal help channel that follows each one.',
          'Wrote 22 graded lab exercises and the marking rubric the other three trainers now use, ending a year of trainer-by-trainer scoring differences.',
        ],
      },
      {
        id: 'w2',
        name: 'Orbitspan Technologies',
        position: 'Software Engineer',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2023-07',
        endDate: '2025-01',
        summary: '',
        highlights: [
          'Built and maintained the reporting APIs behind an internal people-operations product used by 2,100 employees.',
          'Volunteered as a bootcamp mentor for three cohorts, then joined the training team full time after the 2024 cohort scored highest on record.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Jawaharlal Nehru Technological University Hyderabad',
        area: 'Information Technology',
        studyType: 'B.Tech.',
        location: 'Hyderabad, Telangana',
        startDate: '2019-08',
        endDate: '2023-05',
        score: '8.4 CGPA',
        url: '',
        summary:
          'Final-year project: an automatic grader for SQL assignments, later released as the open-source drill set below.',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'SQL Drills',
        description: 'An open set of 120 graded SQL exercises with an automatic marker teachers can run on a laptop.',
        url: 'https://github.com/nraghavan/sql-drills',
        startDate: '2023-01',
        endDate: '',
        highlights: [
          'Used by 640 learners and three engineering colleges in Telangana; every exercise ships with a worked solution.',
        ],
        keywords: ['SQL', 'PostgreSQL', 'Python', 'Assessment'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Facilitation',
        level: '',
        keywords: [
          'Classroom delivery',
          'Virtual facilitation',
          'Live coding demonstrations',
          'Cohort management',
          'Coaching and feedback',
        ],
      },
      {
        id: 's2',
        name: 'Programme design',
        level: '',
        keywords: [
          'Lab writing',
          'Assessment design',
          'Marking rubrics',
          'Kirkpatrick levels 1-3',
          'LMS administration',
        ],
      },
      { id: 's3', name: 'Technical', level: '', keywords: ['Java', 'SQL', 'Git', 'REST APIs', 'Linux fundamentals'] },
    ],
    certificates: [
      { id: 'c1', name: 'CTT+ Certified Technical Trainer', date: '2025', issuer: 'CompTIA', url: '' },
      { id: 'c2', name: 'AWS Certified Cloud Practitioner', date: '2024', issuer: 'Amazon Web Services', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Telugu', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
