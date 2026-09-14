import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, India, with a contract role at the start of the history. Delivery
 * work is easy to write vaguely, so every entry here names the thing shipped,
 * the date it was due, and what the schedule or the budget did.
 */
export const sample: LibrarySample = {
  slug: 'program-manager',
  role: 'Program Manager',
  category: 'business',
  seniority: 'mid',
  region: 'india',
  template: 'chronicle',
  blurb:
    'A hardware and software rollout told in numbers: vehicles live, weeks saved, budget returned, rollbacks stopped.',
  keywords: [
    'program manager',
    'technical program manager',
    'PMP certified',
    'cross-functional delivery',
    'hardware rollout',
    'risk and dependency management',
  ],
  content: content({
    basics: {
      name: 'Rohit Iyer',
      label: 'Senior Program Manager',
      image: '',
      email: 'rohit.iyer@example.com',
      phone: '+91 12345 72604',
      url: '',
      summary:
        'Program manager for hardware and software launches at an electric fleet company, seven years running delivery across engineering, firmware and field teams. Landed a 4,200-vehicle telematics rollout in 14 cities three weeks early and 8% under a ₹6.4 crore budget.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'rohitiyer', url: 'https://linkedin.com/in/rohitiyer' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Nirvaan Mobility',
        position: 'Senior Program Manager',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary:
          'Owns launch delivery for the telematics platform: hardware, firmware, backend and field installation.',
        highlights: [
          'Delivered a 4,200-vehicle telematics rollout across 14 cities three weeks early and 8% under a ₹6.4 crore budget, coordinating 11 vendors and 60 field technicians.',
          'Cut the firmware release train from six weeks to 12 days by splitting one monolithic test cycle into staged hardware-in-the-loop gates.',
          'Introduced a single risk register across four squads, taking scope added mid-quarter from 31% of the plan to 9%.',
          'Chairs the launch readiness review for every release; the last nine shipped without a rollback, after four rollbacks the year before.',
        ],
      },
      {
        id: 'w2',
        name: 'Kestrel Freight Systems',
        position: 'Program Manager',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2020-08',
        endDate: '2022-12',
        summary: '',
        highlights: [
          'Migrated 1,900 fleet customers onto a new dispatch platform over nine months at 99.4% data accuracy and with no billing disputes raised.',
          'Mapped dependencies across six teams, which took the average age of a cross-team blocker from 12 days to 3.',
          'Chaired the review after a two-day outage and drove the seven actions that followed; the same failure has not recurred in three years.',
        ],
      },
      {
        id: 'w3',
        name: 'Varnika Foods',
        position: 'Project Coordinator (contract)',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2019-05',
        endDate: '2020-07',
        summary: '',
        highlights: [
          'Coordinated a barcode traceability rollout across nine plants on a 15-month contract, closing all 42 plant sign-offs before the audit window.',
          'Replaced a weekly status call across nine plants with a shared tracker, saving 20 hours of reporting a month.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'National Institute of Technology, Tiruchirappalli',
        area: 'Mechanical Engineering',
        studyType: 'B.Tech.',
        location: 'Tiruchirappalli, Tamil Nadu',
        startDate: '2015-07',
        endDate: '2019-04',
        score: '8.2 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Delivery',
        level: '',
        keywords: ['Program governance', 'Risk registers', 'Dependency mapping', 'Release trains', 'Vendor management'],
      },
      {
        id: 's2',
        name: 'Technical',
        level: '',
        keywords: ['Telematics hardware', 'Firmware release cycles', 'SQL', 'Jira', 'Grafana dashboards'],
      },
      {
        id: 's3',
        name: 'Business',
        level: '',
        keywords: ['Budget ownership', 'Field operations', 'Stakeholder reporting', 'Post-incident review'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Project Management Professional (PMP)',
        date: '2022',
        issuer: 'Project Management Institute',
        url: '',
      },
      { id: 'c2', name: 'Certified ScrumMaster (CSM)', date: '2021', issuer: 'Scrum Alliance', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 3 },
    ],
  }),
}

export default sample
