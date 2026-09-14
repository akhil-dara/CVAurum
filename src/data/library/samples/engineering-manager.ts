import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A manager is still judged on results, so the numbers here are the ones a
 * manager actually moves: hiring, attrition, predictability, the cost of the
 * thing the team decided not to keep building.
 */
export const sample: LibrarySample = {
  slug: 'engineering-manager',
  role: 'Engineering Manager',
  category: 'software',
  seniority: 'lead',
  region: 'us',
  template: 'scribe',
  blurb:
    'Twelve years to manager, with hiring, attrition and predictability treated as the engineering results they are.',
  keywords: [
    'engineering manager',
    'software engineering leadership',
    'team lead',
    'hiring engineers',
    'delivery predictability',
    'staff engineer to manager',
  ],
  content: content({
    basics: {
      name: 'Gwen Marchetti',
      label: 'Engineering Manager',
      image: '',
      email: 'gwen.marchetti@example.com',
      phone: '+1 (555) 0196',
      url: 'https://gwenmarchetti.example.com',
      summary:
        'Engineering manager with twelve years in software and five leading teams, still in every design review. Grew a group from 6 engineers to 19 across three squads while taking committed work landing on schedule from 54% to 91%, and brought voluntary attrition down to 4%.',
      location: { city: 'Boston', region: 'MA', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'gwenmarchetti', url: 'https://linkedin.com/in/gwenmarchetti' },
        { network: 'GitHub', username: 'gmarchetti', url: 'https://github.com/gmarchetti' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Wrenfield Software',
        logo: brandmark('Wrenfield Software'),
        position: 'Engineering Manager',
        location: 'Boston, MA',
        url: '',
        startDate: '2021-09',
        endDate: '',
        summary: 'Three squads and 19 engineers owning a clinical scheduling platform and its integrations.',
        highlights: [
          'Grew the group from 6 engineers to 19, hiring 14 through a structured loop that took offer acceptance from 52% to 86%.',
          'Took committed work landing on schedule from 54% to 91% by capping work in progress and replacing quarterly estimates with a weekly forecast.',
          'Cut voluntary attrition from 22% to 4% over two years after rebuilding on-call compensation and publishing a growth framework.',
          'Sponsored the integration rewrite that retired nine bespoke customer pipelines, saving $610k a year in support engineering.',
          'Runs promotion calibration for the 40 engineers in the department.',
        ],
      },
      {
        id: 'w2',
        name: 'Hollis Grid',
        logo: brandmark('Hollis Grid'),
        position: 'Engineering Manager',
        location: 'Boston, MA',
        url: '',
        startDate: '2019-03',
        endDate: '2021-08',
        summary: '',
        highlights: [
          'Led the eight-person team that took a demand-response product from prototype to $4.2M of annual revenue across 40 utilities in 22 months.',
          'Replaced a six-week release train with weekly releases behind feature flags, cutting merge-to-customer from 41 days to 6.',
          'Started the first incident review program at the company; incident count halved within three quarters.',
        ],
      },
      {
        id: 'w3',
        name: 'Ellerby Analytics',
        logo: brandmark('Ellerby Analytics'),
        position: 'Staff Software Engineer',
        location: 'Cambridge, MA',
        url: '',
        startDate: '2016-01',
        endDate: '2019-02',
        summary: '',
        highlights: [
          'Designed the streaming pipeline behind a usage-billing product, carrying 2.4 billion events a month with under a minute of lag.',
          'Led the four-engineer rewrite of the query layer, taking dashboard load for the largest accounts from 9s to 1.1s.',
          'Mentored six engineers, four of whom were promoted within two years.',
        ],
      },
      {
        id: 'w4',
        name: 'Calderbrook Systems',
        logo: brandmark('Calderbrook Systems'),
        position: 'Software Engineer',
        location: 'Providence, RI',
        url: '',
        startDate: '2014-06',
        endDate: '2015-12',
        summary: '',
        highlights: [
          'Built the reporting service for a benefits platform used by 300 employers, replacing exports an analyst had assembled every week.',
          'Cut a nightly job from seven hours to 40 minutes by batching writes and adding two indexes.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Northeastern University',
        area: 'Computer Science',
        studyType: 'B.S.',
        location: 'Boston, MA',
        startDate: '2010-09',
        endDate: '2014-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Leadership',
        level: '',
        keywords: ['Hiring and interview design', 'Performance and promotion', 'Roadmap planning', 'Coaching'],
      },
      {
        id: 's2',
        name: 'Delivery',
        level: '',
        keywords: ['Forecasting', 'Incident review', 'Service-level objectives', 'Architecture review'],
      },
      {
        id: 's3',
        name: 'Technical',
        level: '',
        keywords: ['Distributed systems', 'Go', 'TypeScript', 'PostgreSQL', 'AWS', 'Kafka'],
      },
    ],
  }),
}

export default sample
