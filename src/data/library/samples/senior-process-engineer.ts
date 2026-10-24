import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Process engineering in a PSM-covered plant, where the two things a hiring
 * manager weighs are money and incidents. Yield points, steam, payback period
 * and flare events carry the bullets; the process-safety work is given its own
 * skills group rather than being left implied.
 */
export const sample: LibrarySample = {
  slug: 'senior-process-engineer',
  role: 'Senior Process Engineer',
  category: 'engineering',
  seniority: 'senior',
  region: 'us',
  template: 'cambridge',
  blurb:
    'Thirteen years in specialty chemicals and refining, where each improvement is stated as yield, energy or an outage avoided.',
  keywords: [
    'process engineer',
    'chemical engineer',
    'process safety management',
    'HAZOP facilitator',
    'distillation troubleshooting',
    'Aspen Plus',
  ],
  guide: {
    why: [
      'The distillation redesign is written as an investment case: yield up 4.2 points, steam down 38,000 lb/hr and a “fourteen-month payback on $2.6M”, the language a plant manager uses to approve capital.',
      'Process safety gets numbers too: 19 HAZOPs facilitated and 240 of 261 recommendations closed inside the two-year PSM cycle, against 61% before, which matters for any role at a PSM-covered site.',
      'Uptime is counted in production terms, unplanned outages cut from five a year to one and 22 production days added, so reliability work reads as output rather than maintenance.',
      'The Louisiana PE license, AIChE HAZOP facilitation training and OSHA 30-Hour General Industry sit together, matching the credentials senior process roles in refining and chemicals ask for.',
    ],
    faq: [
      {
        q: 'Should a process engineer resume include a PE license?',
        a: 'Yes, with the discipline, state and year, such as Professional Engineer (Chemical), Louisiana. It matters most for senior roles that sign off on relief systems, design changes or management of change.',
      },
      {
        q: 'What should a senior process engineer resume include?',
        a: 'Improvements stated as yield, energy, throughput or outages avoided, with cost and payback where known; process safety work such as HAZOPs and PSM; and simulation tools like Aspen Plus or HYSYS.',
      },
      {
        q: 'How long should a process engineer resume be?',
        a: 'Two pages for thirteen years across several plants. Keep each role to the units you owned and three or four results, and leave out routine duties every process engineer performs.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Miguel Ocampo',
      label: 'Senior Process Engineer',
      image: '',
      email: 'miguel.ocampo@example.com',
      phone: '+1 (555) 0129',
      url: 'https://miguelocampo.example.com',
      summary:
        'Chemical engineer with thirteen years on continuous processes in specialty chemicals and refining. Redesigned a distillation train that lifted yield 4.2 points and cut steam demand 38,000 lb/hr, paying back its $2.6M cost in fourteen months. Licensed PE and the plant HAZOP facilitator since 2021.',
      location: { city: 'Baton Rouge', region: 'LA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'miguelocampo', url: 'https://linkedin.com/in/miguelocampo' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ravenwood Chemical',
        position: 'Senior Process Engineer',
        location: 'Baton Rouge, LA',
        url: '',
        startDate: '2020-02',
        endDate: '',
        summary: 'Technical owner of two continuous trains producing 180,000 tons a year of specialty intermediates.',
        highlights: [
          'Redesigned a three-column distillation train, raising yield 4.2 points and cutting steam demand 38,000 lb/hr for a fourteen-month payback on $2.6M.',
          'Facilitated 19 HAZOPs and closed 240 of 261 recommendations inside the two-year PSM cycle, against 61% closure in the prior cycle.',
          'Ended a recurring reactor fouling shutdown, taking unplanned outages from five a year to one and adding 22 production days.',
          'Rewrote the startup procedures after a near-miss review; the next two startups ran with no flare events, against a six-event average.',
        ],
      },
      {
        id: 'w2',
        name: 'Tidegate Refining',
        position: 'Process Engineer',
        location: 'Port Arthur, TX',
        url: '',
        startDate: '2016-01',
        endDate: '2020-01',
        summary: '',
        highlights: [
          'Owned the hydrotreater through two turnarounds, both completed on schedule and 8% under budget.',
          'Modeled and commissioned a heat-integration project that cut fired-heater duty 11%, worth $840k a year in fuel gas.',
          'Traced a catalyst deactivation trend to a bypassing feed filter, restoring cycle length from 9 months to 15.',
        ],
      },
      {
        id: 'w3',
        name: 'Ashfall Polymers',
        position: 'Process Engineer',
        location: 'Lake Charles, LA',
        url: '',
        startDate: '2013-07',
        endDate: '2015-12',
        summary: '',
        highlights: [
          'Commissioned an extrusion line from water batching to on-spec product in 26 days against a 45-day plan.',
          'Cut off-spec resin 31% by retuning melt-temperature control loops and adding a die-pressure alarm.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Louisiana State University',
        area: 'Chemical Engineering',
        studyType: 'B.S.',
        location: 'Baton Rouge, LA',
        startDate: '2009-08',
        endDate: '2013-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Process design',
        level: '',
        keywords: [
          'Distillation and separations',
          'Heat integration',
          'Reactor troubleshooting',
          'Hydraulics and relief sizing',
          'Mass and energy balances',
        ],
      },
      {
        id: 's2',
        name: 'Process safety',
        level: '',
        keywords: [
          'PSM (29 CFR 1910.119)',
          'HAZOP and LOPA',
          'Relief systems (API 520/521)',
          'Management of change',
          'Incident investigation',
        ],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Aspen Plus', 'Aspen HYSYS', 'PI ProcessBook', 'Minitab', 'Python'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Plant Safety Excellence Award',
        date: '2023',
        awarder: 'Ravenwood Chemical',
        summary: 'Recognized the startup-procedure rewrite that ended flare events on unit restarts.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Professional Engineer (Chemical), Louisiana',
        date: '2018',
        issuer: 'Louisiana Professional Engineering and Land Surveying Board',
        url: '',
      },
      { id: 'c2', name: 'HAZOP Leadership and Facilitation', date: '2021', issuer: 'AIChE', url: '' },
      { id: 'c3', name: 'OSHA 30-Hour General Industry', date: '2021', issuer: 'OSHA Training Institute', url: '' },
    ],
  }),
}

export default sample
