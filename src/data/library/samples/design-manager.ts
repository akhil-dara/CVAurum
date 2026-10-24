import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * A manager's résumé has to answer two questions at once: what the team
 * shipped, and what changed about the team. Every role here carries at least
 * one of each, and the promotion inside one company is shown as two entries.
 */
export const sample: LibrarySample = {
  slug: 'design-manager',
  role: 'Design Manager',
  category: 'design',
  seniority: 'lead',
  region: 'us',
  template: 'opal',
  blurb:
    'Twelve years of product design, five of them managing: hiring, a career framework, and activation from 38% to 64%.',
  keywords: [
    'design manager',
    'head of design',
    'design leadership',
    'design systems',
    'hiring designers',
    'director of product design',
  ],
  guide: {
    why: [
      'The promotion at Ardenfield Software is shown as two entries, Design Manager then Director of Design, so a reader sees the jump in scope instead of one long role with a single title.',
      'Team results are counted the way a hiring manager counts them: grown “from four to sixteen”, 15 of the 16 still in post after two years, attrition at 6%. Retention is the proof that the hiring loop worked.',
      'Design outcomes carry business figures: activation “from 38% to 64%” and $4.1M in annual recurring revenue tie the onboarding redesign to money, which is what a product leadership panel will ask about.',
      'Craft is still visible at manager level: the permissions model designed while managing seven designers, and WCAG 2.1 AA across 180 screens, show the hands-on depth behind the leadership claims.',
    ],
    faq: [
      {
        q: 'How long should a design manager resume be?',
        a: 'Two pages is normal once you have ten or more years and several years of managing. Spend the first page on the leadership roles, with team size and retention, and keep individual-contributor roles to two or three bullets each.',
      },
      {
        q: 'Should a design manager resume include a portfolio link?',
        a: 'Yes. Put it in the header beside email and LinkedIn. For a manager, the portfolio should show team work and decisions you led, such as a design system or a redesign, with your role in each made clear.',
      },
      {
        q: 'What metrics belong on a design manager resume?',
        a: 'Two kinds: team metrics (headcount grown, retention, promotions, hiring loop results) and product metrics (activation, conversion, revenue, time saved). Each leadership role should carry at least one of each.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Lena Quintero',
      label: 'Director of Design',
      image: portrait('Lena Quintero'),
      email: 'lena.quintero@example.com',
      phone: '+1 (555) 0188',
      url: 'https://lenaquintero.example.com',
      urlLabel: 'Portfolio',
      summary:
        'Design leader with twelve years in product design, the last five running teams. Grew a four-person team to sixteen across three product groups and stood up the research and design-system practice behind an onboarding redesign that took seven-day activation from 38% to 64%. Still reviews every portfolio that comes through the hiring loop.',
      location: { city: 'Portland', region: 'OR', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'lenaquintero', url: 'https://linkedin.com/in/lenaquintero' },
        { network: 'Substack', username: 'lenaquintero', url: 'https://substack.com/@lenaquintero' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Ardenfield Software',
        position: 'Director of Design',
        location: 'Portland, OR',
        url: '',
        startDate: '2023-02',
        endDate: '',
        summary:
          'Sixteen designers, researchers and content designers across three product groups; reports to the Chief Product Officer.',
        highlights: [
          'Grew the team from four to sixteen on a hiring loop built around a scored portfolio review; 15 of the 16 are still in post after two years.',
          'Led the onboarding redesign across three products, taking activation within seven days from 38% to 64% and adding $4.1M in annual recurring revenue.',
          'Replaced three divergent UI kits with one design system; a screen now goes from brief to build in four days rather than eleven, and accessibility defects fell 78%.',
          'Stood up the research practice the company had never had; 62 studies in two years now sit behind every item on the quarterly plan.',
          'Wrote a six-level career framework with expectations in plain language; eight designers have been promoted against it and attrition sits at 6%.',
        ],
      },
      {
        id: 'w2',
        name: 'Ardenfield Software',
        position: 'Design Manager',
        location: 'Portland, OR',
        url: '',
        startDate: '2021-05',
        endDate: '2023-01',
        summary: '',
        highlights: [
          'Managed seven designers on billing and admin while still designing the permissions model, which cut support escalations about account access by 54%.',
          'Introduced a weekly critique with written decisions; rework after engineering handoff fell from 3.2 rounds to 1.1.',
          'Ran the first accessibility program, taking the flagship product to WCAG 2.1 AA across 180 screens in nine months.',
        ],
      },
      {
        id: 'w3',
        name: 'Silverbrook Labs',
        position: 'Lead Product Designer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2018-03',
        endDate: '2021-04',
        summary: '',
        highlights: [
          'Designed the analytics workspace that became the company’s best-selling module, reaching $9M in annual revenue in its second year.',
          'Cut the time an analyst needed to build a report from 22 minutes to six by replacing a six-step wizard with a direct-manipulation canvas.',
          'Led a five-designer team before the title existed and wrote the interview rubric the company still hires against.',
        ],
      },
      {
        id: 'w4',
        name: 'Tallow and Pike',
        position: 'Product Designer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2014-08',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Designed 11 client products across fintech, logistics and retail; four are still shipping the interface as drawn.',
          'Built the agency’s first shared component library, taking the setup of a new client project from two weeks to three days.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Oregon',
        area: 'Graphic Design',
        studyType: 'B.A.',
        location: 'Eugene, OR',
        startDate: '2010-09',
        endDate: '2014-06',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'AIGA Portland',
        position: 'Mentor, Portfolio Review Program',
        url: '',
        startDate: '2019-09',
        endDate: '',
        summary: '',
        highlights: [
          'Reviews 20 portfolios a year for designers moving in from print or front-end work; 14 mentees have landed a first product design role.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Leadership',
        level: '',
        keywords: [
          'Hiring and onboarding',
          'Career frameworks',
          'Coaching and performance',
          'Roadmap partnership',
          'Design operations',
        ],
      },
      {
        id: 's2',
        name: 'Craft',
        level: '',
        keywords: [
          'Product strategy',
          'Interaction design',
          'Design systems',
          'Content design',
          'Accessibility (WCAG 2.1 AA)',
        ],
      },
      {
        id: 's3',
        name: 'Research',
        level: '',
        keywords: ['Discovery planning', 'Usability testing', 'Experiment design', 'Analytics review'],
      },
      {
        id: 's4',
        name: 'Tools',
        level: '',
        keywords: ['Figma', 'Storybook', 'Dovetail', 'Amplitude', 'Linear'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
