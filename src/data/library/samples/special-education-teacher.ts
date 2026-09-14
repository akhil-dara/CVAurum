import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A returner. Two years out for family caregiving sit between the sixth and
 * seventh years of teaching, and the résumé names the break plainly through
 * the advocacy work done during it rather than leaving a hole in the dates.
 */
export const sample: LibrarySample = {
  slug: 'special-education-teacher',
  role: 'Special Education Teacher',
  category: 'education',
  seniority: 'senior',
  region: 'us',
  template: 'ivy',
  blurb:
    'A special educator back full time after a two-year break, shown through caseload compliance and reading growth.',
  keywords: [
    'special education teacher',
    'IEP case manager',
    'resource room teacher',
    'co-teaching',
    'structured literacy',
    'returning to teaching',
  ],
  content: content({
    basics: {
      name: 'Dana Whitlock',
      label: 'Special Education Teacher and IEP Case Manager',
      image: '',
      email: 'dana.whitlock@example.com',
      phone: '+1 (555) 0173',
      url: '',
      summary:
        'Special educator with twelve years in K-8 resource and co-taught settings, back full time since 2021 after a two-year family care break. Carries 26 IEPs with five years of clean compliance, and moved caseload students meeting annual reading goals from 54% to 81%.',
      location: { city: 'Portland', region: 'OR', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'danawhitlock', url: 'https://linkedin.com/in/danawhitlock' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Mill Hollow School District',
        position: 'Special Education Teacher and Case Manager, Grades 6-8',
        location: 'Portland, OR',
        url: '',
        startDate: '2021-08',
        endDate: '',
        summary:
          'Middle school of 640 students. Resource and co-taught settings; caseload of 26 IEPs across three grades.',
        highlights: [
          'Manages 26 IEPs and holds every annual and triennial meeting on time; the school has recorded no compliance findings and no due-process filings in five years.',
          'Raised the share of caseload students meeting annual reading goals from 54% to 81% by moving every goal to weekly curriculum-based measurement.',
          'Co-teaches three sections of Grade 7 math, where students with IEPs passed the state assessment at 63% against 38% in sections without co-teaching.',
          'Trained 34 general education teachers on accommodation delivery; documented accommodation use in walkthrough checks rose from 40% to 88%.',
          'Rewrote the transition plan template now used across all four middle schools in the district.',
        ],
      },
      {
        id: 'w2',
        name: 'Hawthorne Learning Partners',
        position: 'Reading Interventionist (part-time contract)',
        location: 'Portland, OR',
        url: '',
        startDate: '2020-09',
        endDate: '2021-06',
        summary: '',
        highlights: [
          'Delivered structured literacy intervention to 14 students in Grades 3 to 8 across three afternoons a week; 11 gained more than a year of reading growth in nine months.',
          'Wrote progress reports that districts accepted as outside evaluation evidence for six of the 14 students.',
        ],
      },
      {
        id: 'w3',
        name: 'Northbrook School District',
        position: 'Special Education Teacher, Grades K-5',
        location: 'Salem, OR',
        url: '',
        startDate: '2012-08',
        endDate: '2018-05',
        summary: '',
        highlights: [
          'Ran a K-5 resource room serving 22 students a year; 17 students exited at least one goal area over six years.',
          'Built the first structured social-skills group in the district for students with autism, nine students a cycle, cutting recorded behavior incidents by 62%.',
          'Trained every new special education hire in the district on IEP writing and the case management system for four years running.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Rose City Family Support Network',
        position: 'Volunteer Parent Advocate',
        url: '',
        startDate: '2018-06',
        endDate: '2020-08',
        summary: 'Two-year career break for family caregiving, spent advocating alongside families in the IEP process.',
        highlights: [
          'Sat with 40 families in IEP meetings as a support advocate and wrote the plain-language parent guide the network still distributes.',
          'Ran eight evening workshops on procedural safeguards, attended by 220 parents across Multnomah and Clackamas counties.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Portland State University',
        area: 'Special Education',
        studyType: 'M.Ed.',
        location: 'Portland, OR',
        startDate: '2010-09',
        endDate: '2012-06',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Oregon',
        area: 'Psychology',
        studyType: 'B.A.',
        location: 'Eugene, OR',
        startDate: '2006-09',
        endDate: '2010-06',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Specially designed instruction',
        level: '',
        keywords: ['IEP writing', 'Structured literacy', 'Orton-Gillingham', 'Task analysis', 'Math intervention'],
      },
      {
        id: 's2',
        name: 'Assessment and compliance',
        level: '',
        keywords: [
          'Curriculum-based measurement',
          'WJ-IV and KTEA-3',
          'FBA and behavior plans',
          'IDEA safeguards',
          'Progress monitoring',
        ],
      },
      {
        id: 's3',
        name: 'Collaboration',
        level: '',
        keywords: [
          'Co-teaching',
          'Paraeducator coaching',
          'Family conferences',
          'Transition planning',
          'Related-service coordination',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Oregon Special Educator License, Generalist K-12',
        date: '2012, renewed 2024',
        issuer: 'Oregon Teacher Standards and Practices Commission',
        url: '',
      },
      {
        id: 'c2',
        name: 'Associate Level Certification',
        date: '2020',
        issuer: 'Academy of Orton-Gillingham Practitioners and Educators',
        url: '',
      },
      {
        id: 'c3',
        name: 'Nonviolent Crisis Intervention',
        date: '2024',
        issuer: 'Crisis Prevention Institute',
        url: '',
      },
    ],
  }),
}

export default sample
