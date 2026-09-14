import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A return after a career break, handled the way it should be: the 14 months
 * are on the page with a date range and a line about what was done in them,
 * so no reader has to work out the gap for themselves.
 */
export const sample: LibrarySample = {
  slug: 'communications-manager',
  role: 'Communications Manager',
  category: 'marketing',
  seniority: 'mid',
  region: 'us',
  template: 'polished',
  blurb:
    'Seven years of PR and corporate communications, including a career break kept on the page rather than hidden.',
  keywords: [
    'communications manager',
    'public relations',
    'media relations',
    'crisis communications',
    'corporate communications',
    'share of voice',
    'return to work after career break',
  ],
  content: content({
    basics: {
      name: 'Erin Doherty',
      label: 'Communications Manager',
      image: '',
      email: 'erin.doherty@example.com',
      phone: '+1 (555) 0129',
      url: 'https://erindoherty.example.com',
      summary:
        'Communications manager with seven years across agency public relations and in-house corporate communications, accredited by PRSA. Placed 78 stories in a year for an outdoor brand and took its trade-press share of voice from 8% to 17%.',
      location: { city: 'Minneapolis', region: 'MN', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'erindoherty', url: 'https://linkedin.com/in/erindoherty' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Alderpine Outdoors',
        position: 'Communications Manager',
        location: 'Minneapolis, MN',
        url: '',
        startDate: '2023-09',
        endDate: '',
        summary:
          'Runs media relations, executive communications and internal comms for an outdoor gear brand of 400 staff.',
        highlights: [
          'Placed 78 stories in 2024, three of them national features that together drove 61,000 site sessions in a single week.',
          'Led communications on a 9,000-unit stove recall; all 12 outlet enquiries were answered inside four hours and coverage stayed factual.',
          'Rewrote the executive messaging house and prepared four spokespeople; share of voice in trade press rose from 8% to 17%.',
          'Started an internal newsletter now read by 84% of staff, retiring an all-hands slide deck that 9% of them opened.',
        ],
      },
      {
        id: 'w2',
        name: 'Career break',
        position: 'Family caregiving and freelance communications',
        location: 'Minneapolis, MN',
        url: '',
        startDate: '2022-06',
        endDate: '2023-08',
        summary: '',
        highlights: [
          'Took 14 months to care for a parent after surgery, keeping two retainer clients throughout for launch announcements and executive bylines.',
          'Earned the Accreditation in Public Relations during the break, passing the panel presentation and examination in one attempt.',
        ],
      },
      {
        id: 'w3',
        name: 'Sparrowhill Communications',
        position: 'Senior Account Executive',
        location: 'Chicago, IL',
        url: '',
        startDate: '2019-02',
        endDate: '2022-05',
        summary: '',
        highlights: [
          'Ran public relations for six B2B clients, securing 210 placements in three years, 34 of them in national outlets.',
          'Took a manufacturing client from 4% to 15% share of voice in 18 months with a research report that produced one story a quarter.',
          'Wrote the crisis playbook the agency now runs as a paid onboarding deliverable; four clients used it live in its first year.',
        ],
      },
      {
        id: 'w4',
        name: 'Tidewell Public Affairs',
        position: 'Account Coordinator',
        location: 'Chicago, IL',
        url: '',
        startDate: '2017-06',
        endDate: '2019-01',
        summary: '',
        highlights: [
          'Rebuilt media lists of 4,000 journalists around beats rather than outlets, taking pitch-to-placement from 3% to 9%.',
          'Drafted 60 press releases and the quarterly coverage report across three accounts.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Minnesota Twin Cities',
        area: 'Strategic Communication',
        studyType: 'B.A.',
        location: 'Minneapolis, MN',
        startDate: '2013-09',
        endDate: '2017-05',
        score: '3.6 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Media',
        level: '',
        keywords: ['Media relations', 'Press materials', 'Spokesperson training', 'Editorial pitching', 'Trade press'],
      },
      {
        id: 's2',
        name: 'Corporate',
        level: '',
        keywords: [
          'Crisis communications',
          'Executive ghostwriting',
          'Internal comms',
          'Issues monitoring',
          'Message houses',
        ],
      },
      {
        id: 's3',
        name: 'Measurement',
        level: '',
        keywords: ['Share of voice', 'Message pull-through', 'Coverage quality scoring', 'Muck Rack', 'Cision'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Accreditation in Public Relations (APR)',
        date: '2023',
        issuer: 'Public Relations Society of America',
        url: '',
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Twin Cities Reading Partners',
        position: 'Communications Volunteer',
        url: '',
        startDate: '2018-03',
        endDate: '',
        summary: '',
        highlights: [
          'Writes the annual report and the donor appeal; the 2024 appeal raised $96,000, the best result in the charity’s nine years.',
        ],
      },
    ],
  }),
}

export default sample
