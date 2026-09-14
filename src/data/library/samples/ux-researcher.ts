import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Research is the one design discipline whose output is a decision, so every
 * bullet here names the decision rather than the method: what was built, what
 * was stopped, what the number did afterwards.
 */
export const sample: LibrarySample = {
  slug: 'ux-researcher',
  role: 'UX Researcher',
  category: 'design',
  seniority: 'senior',
  region: 'us',
  template: 'marquee',
  blurb:
    'Nine years of research told as decisions changed: a $2.1M rebuild stopped, a nurse handoff cut to 2.8 minutes.',
  keywords: [
    'UX researcher',
    'senior user researcher',
    'mixed methods research',
    'contextual inquiry',
    'healthcare UX',
    'research operations',
    'usability testing',
  ],
  content: content({
    basics: {
      name: 'Imani Sowande',
      label: 'Senior UX Researcher',
      image: '',
      email: 'imani.sowande@example.com',
      phone: '+1 (555) 0164',
      url: 'https://imanisowande.example.com',
      urlLabel: 'Portfolio',
      summary:
        'UX researcher with nine years in enterprise and healthcare software, five of them building the research function for teams that had none. Ran the discovery that stopped a $2.1M scheduling rebuild and sent the budget to the intake queue instead. Now leads research for a clinical workflow group of sixty.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'imanisowande', url: 'https://linkedin.com/in/imanisowande' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Harrowgate Software',
        position: 'Senior UX Researcher',
        location: 'Chicago, IL',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary:
          'Research lead for the clinical workflow group; two researchers and a research operations contractor report in.',
        highlights: [
          'Ran the discovery that stopped a $2.1M scheduling rebuild: 19 site visits showed clinics were working around the old tool on purpose, and the budget moved to the intake queue.',
          'Cut median time to complete a nurse handoff from 6.4 minutes to 2.8 by pairing contextual inquiry with a one-page task analysis the design team could act on directly.',
          'Built a standing panel of 340 clinicians, taking recruitment for a study from three weeks to four days and ending $96k a year of panel-vendor spend.',
          'Runs a monthly readout that product, support and sales all attend; 21 of last year’s roadmap items cite a study by name in their brief.',
        ],
      },
      {
        id: 'w2',
        name: 'Larkspur Systems',
        position: 'UX Researcher',
        location: 'Chicago, IL',
        url: '',
        startDate: '2019-04',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Established the company’s first research repository; 140 tagged studies replaced a shared drive nobody could search, and reuse of past findings tripled within a year.',
          'Ran a 900-response survey and 24 follow-up interviews that reordered the top three roadmap requests and retired a feature used by 0.3% of accounts.',
          'Trained 30 designers and product managers to moderate their own usability sessions, taking the company from 8 sessions a quarter to 55.',
        ],
      },
      {
        id: 'w3',
        name: 'Verity Field Research',
        position: 'Research Consultant',
        location: 'Chicago, IL',
        url: '',
        startDate: '2017-06',
        endDate: '2019-03',
        summary: '',
        highlights: [
          'Delivered 14 studies for clients in insurance, logistics and higher education, each inside a four-week engagement.',
          'Designed the diary-study protocol the firm still sells as a fixed-price package.',
        ],
      },
      {
        id: 'w4',
        name: 'Northshore Analytics',
        position: 'Research Associate',
        location: 'Evanston, IL',
        url: '',
        startDate: '2016-07',
        endDate: '2017-05',
        summary: '',
        highlights: [
          'Coded and analyzed 1,200 open-ended responses for a statewide transit study, producing the rider segmentation the client used for the next two years.',
          'Moved the team from paper consent to a digital flow, cutting session setup from 12 minutes to three.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'DePaul University',
        area: 'Human-Computer Interaction',
        studyType: 'M.S.',
        location: 'Chicago, IL',
        startDate: '2014-09',
        endDate: '2016-06',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Illinois Urbana-Champaign',
        area: 'Psychology',
        studyType: 'B.A.',
        location: 'Urbana, IL',
        startDate: '2010-08',
        endDate: '2014-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'What Clinicians Do When the Software Says No',
        publisher: 'Journal of Usability Studies',
        releaseDate: '2023-05',
        url: '',
        summary: 'A field study of 19 clinics and the workarounds that outlive every tool meant to replace them.',
      },
      {
        id: 'pub2',
        name: 'Recruiting Clinical Participants Without a Panel Vendor',
        publisher: 'UXPA International Conference',
        releaseDate: '2022-06',
        url: '',
        summary: 'Conference talk on building and maintaining an in-house participant panel under HIPAA constraints.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Human Subjects Research, Social and Behavioral',
        date: '2022',
        issuer: 'CITI Program',
        url: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Qualitative',
        level: '',
        keywords: [
          'Contextual inquiry',
          'Moderated usability testing',
          'Diary studies',
          'Interview protocol design',
          'Thematic analysis',
        ],
      },
      {
        id: 's2',
        name: 'Quantitative',
        level: '',
        keywords: [
          'Survey design',
          'MaxDiff and conjoint',
          'Benchmark and SUS studies',
          'Log and funnel analysis',
          'Sample sizing',
        ],
      },
      {
        id: 's3',
        name: 'Research operations',
        level: '',
        keywords: [
          'Participant panels',
          'Consent and privacy review',
          'Research repositories',
          'Study intake and triage',
        ],
      },
      {
        id: 's4',
        name: 'Tools',
        level: '',
        keywords: ['Dovetail', 'Qualtrics', 'UserTesting', 'R', 'Figma'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
