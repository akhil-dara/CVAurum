import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * The placement-season résumé: degree first because it is the strongest thing
 * on the page, two summer internships on the rail, and two projects that other
 * people actually use. Six real things, one page.
 */
export const sample: LibrarySample = {
  slug: 'final-year-engineering-student',
  role: 'Final-Year Engineering Student',
  category: 'student',
  seniority: 'student',
  region: 'india',
  template: 'modern',
  blurb:
    'Graduating in 2027 with two summer internships and a hostel app 900 students use — education first, no padding anywhere.',
  keywords: [
    'final year student resume',
    'B.Tech resume',
    'campus placement resume',
    'computer engineering student',
    'software internship',
    'fresher resume India',
  ],
  content: content({
    basics: {
      name: 'Aarav Kulkarni',
      label: 'Final-Year B.Tech, Computer Engineering',
      image: '',
      email: 'aarav.kulkarni@example.com',
      phone: '+91 12345 60118',
      url: 'https://aaravkulkarni.example.com',
      summary:
        'Final-year computer engineering student at COEP Technological University, graduating May 2027 with an 8.7 CGPA. Two summer internships on payment infrastructure, the second of which cut refunds stuck past a day from 310 a week to 12.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'GitHub', username: 'aaravk', url: 'https://github.com/aaravk' },
        { network: 'LinkedIn', username: 'aaravkulkarni', url: 'https://linkedin.com/in/aaravkulkarni' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'COEP Technological University',
        logo: monogram('C', '#b45309'),
        area: 'Computer Engineering',
        studyType: 'B.Tech',
        location: 'Pune, Maharashtra',
        startDate: '2023-07',
        endDate: '2027-05',
        score: '8.7 CGPA',
        url: '',
        summary: '',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Operating Systems',
          'Database Management Systems',
          'Computer Networks',
          'Design and Analysis of Algorithms',
          'Distributed Systems',
        ],
      },
      {
        id: 'e2',
        institution: 'Jnana Prabodhini Prashala',
        logo: monogram('J', '#0f766e'),
        area: 'Science with Mathematics',
        studyType: 'Class XII, Maharashtra State Board',
        location: 'Pune, Maharashtra',
        startDate: '2021-06',
        endDate: '2023-03',
        score: '91.3%',
        url: '',
        summary: '',
        status: 'completed',
        level: 'intermediate',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Saptaflow Technologies',
        rail: { word: 'Internship' },
        position: 'Backend Engineering Intern',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2026-05',
        endDate: '2026-07',
        summary: 'Ten weeks on the payments team, on the refund and settlement path.',
        highlights: [
          'Built the retry queue behind the UPI refund job, cutting refunds stuck past 24 hours from 310 a week to 12.',
          'Replaced an N+1 query in the merchant dashboard with a single joined view, taking page load from 4.1s to 600ms.',
          'Wrote the first integration tests for the settlement module; the suite caught two rounding faults before release.',
        ],
      },
      {
        id: 'w2',
        name: 'Kelvara Systems',
        rail: { word: 'Internship' },
        position: 'Software Intern',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2025-05',
        endDate: '2025-07',
        summary: '',
        highlights: [
          'Automated a CSV reconciliation an analyst ran by hand for three hours every morning, reducing it to a scheduled four-minute job.',
          'Documented 14 undocumented API endpoints, ending a standing round of questions from the two teams that consumed them.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Hostelmate',
        description: 'Mess attendance and billing for four campus hostels.',
        url: 'https://github.com/aaravk/hostelmate',
        startDate: '2025-08',
        endDate: '',
        highlights: [
          'Used by 900 residents; took the warden office from two days of spreadsheets a month to a 20-minute review.',
          'Runs on one shared campus server and has not lost a billing cycle in 11 months of use.',
        ],
        keywords: ['React', 'Node.js', 'PostgreSQL'],
      },
      {
        id: 'p2',
        name: 'Devanagari word-image corpus',
        description: 'An open dataset and baseline model for handwritten Marathi.',
        url: 'https://github.com/aaravk/devanagari-words',
        startDate: '2026-01',
        endDate: '2026-04',
        highlights: [
          'Released 12,000 hand-labelled word images and a CRNN baseline that reads them at 94.2% character accuracy.',
        ],
        keywords: ['PyTorch', 'OpenCV', 'CRNN'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Python', 'Java', 'JavaScript', 'SQL', 'C'] },
      {
        id: 's2',
        name: 'Tools and platforms',
        level: '',
        keywords: ['Git', 'Docker', 'PostgreSQL', 'Redis', 'Linux', 'AWS EC2'],
      },
      {
        id: 's3',
        name: 'Foundations',
        level: '',
        keywords: ['Data structures', 'REST API design', 'Unit testing', 'Concurrency'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Runner-up, Smart India Hackathon (Software Edition)',
        date: '2025',
        awarder: 'Ministry of Education, Government of India',
        summary: 'Six-member team; built a grievance-routing system for a state transport corporation over 36 hours.',
      },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
  tweaks: (m) => {
    // A student's story reads degree, then what was done with it, then what was built.
    m.layout.main = ['summary', 'education', 'work', 'projects', 'skills', 'awards', 'languages']
    m.layout.headings = { ...m.layout.headings, work: 'Internships' }
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      education: { ...(m.layout.sectionSettings?.education ?? {}), scoreStyle: 'pill' },
      projects: { ...(m.layout.sectionSettings?.projects ?? {}), showKeywords: true, tagStyle: 'tags' },
    }
  },
}

export default sample
