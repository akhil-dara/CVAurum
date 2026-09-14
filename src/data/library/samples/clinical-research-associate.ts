import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A site coordinator who became a monitor. The measures are the ones a sponsor
 * asks about at bid defense: time to resolution, query rate, first-patient-in,
 * and what happened at inspection.
 */
export const sample: LibrarySample = {
  slug: 'clinical-research-associate',
  role: 'Senior Clinical Research Associate',
  category: 'healthcare',
  seniority: 'senior',
  region: 'us',
  template: 'clarity',
  blurb:
    'Ten years from study coordinator to senior monitor, measured as a sponsor measures: queries, findings, days to first patient.',
  keywords: [
    'clinical research associate resume',
    'senior CRA',
    'clinical monitoring',
    'ICH-GCP',
    'oncology trials',
    'CCRA certification',
    'site management',
  ],
  content: content({
    basics: {
      name: 'Bethany Kohl',
      label: 'Senior Clinical Research Associate',
      image: '',
      email: 'bethany.kohl@example.com',
      phone: '+1 (555) 0188',
      url: 'https://bethanykohl.example.com',
      summary:
        'Clinical research professional with ten years in oncology and cardiology trials, the last five monitoring sites for a mid-size CRO. Rewrote the source-document worksheet sites complete at each visit, which took the query rate per subject from 4.8 to 1.6 across 14 sites.',
      location: { city: 'Philadelphia', region: 'PA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'bethanykohlccra', url: 'https://linkedin.com/in/bethanykohlccra' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ardenway Clinical Research',
        position: 'Senior Clinical Research Associate',
        location: 'Philadelphia, PA (remote, 60% travel)',
        url: '',
        startDate: '2022-01',
        endDate: '',
        summary:
          'Monitors 14 oncology sites on a phase III trial of 620 patients, at 18 to 20 on-site visits a quarter.',
        highlights: [
          'Closed 213 monitoring findings across 14 sites at a mean 9 days to resolution, against a study target of 21.',
          'Caught a consent version error at three sites within two weeks of activation; re-consenting 46 patients kept the study clear of a reportable deviation.',
          'Rewrote the source-document worksheet used at every visit, taking the query rate per subject from 4.8 to 1.6.',
          'Led the site readiness work that shortened first-patient-in from 94 days to 58 across the last six activations.',
          'Mentors five CRAs through co-monitoring visits; all five reached independent sign-off inside 7 months against a CRO average of 11.',
        ],
      },
      {
        id: 'w2',
        name: 'Lowell Pike Therapeutics',
        position: 'Clinical Research Associate II',
        location: 'Wayne, PA',
        url: '',
        startDate: '2019-03',
        endDate: '2021-12',
        summary: 'Sponsor-side monitoring on two phase II cardiology studies.',
        highlights: [
          'Managed nine sites and escalated four enrollment shortfalls early enough to move the targets to sites that could fill them, protecting the database lock date.',
          'Rebuilt the monitoring visit report template, which cut the sponsor review cycle from 12 days to 4.',
          'Hosted an FDA bioresearch monitoring inspection at the highest-enrolling site, closing with no Form 483 observations.',
        ],
      },
      {
        id: 'w3',
        name: 'Rittenhouse Oncology Institute',
        position: 'Clinical Research Coordinator',
        location: 'Philadelphia, PA',
        url: '',
        startDate: '2016-08',
        endDate: '2019-02',
        summary: '',
        highlights: [
          'Coordinated 11 oncology trials with 60 to 70 active patients, covering consent, visit scheduling and specimen handling.',
          'Raised screening-to-enrollment conversion from 38% to 61% by pre-screening the tumor board list the week before clinic.',
          'Kept regulatory binders for 11 studies inspection-ready through two sponsor audits, which returned three minor findings between them.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Drexel University',
        area: 'Clinical Research Organization and Management',
        studyType: 'M.S.',
        location: 'Philadelphia, PA',
        startDate: '2019-09',
        endDate: '2021-06',
        score: '3.9 GPA',
        url: '',
        summary: 'Completed part time while monitoring full time.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Rutgers University',
        area: 'Biology',
        studyType: 'B.S.',
        location: 'New Brunswick, NJ',
        startDate: '2012-09',
        endDate: '2016-05',
        score: '3.6 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'CCRA, Certified Clinical Research Associate',
        date: '2020',
        issuer: 'Association of Clinical Research Professionals',
        url: '',
      },
      {
        id: 'c2',
        name: 'ICH-GCP E6(R3) and Human Subjects Protection',
        date: 'Renewed 2026',
        issuer: 'CITI Program',
        url: '',
      },
      {
        id: 'c3',
        name: 'IATA Dangerous Goods, Category B biological specimens',
        date: '2025',
        issuer: 'International Air Transport Association',
        url: '',
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Protocol deviation patterns in decentralized oncology trial visits',
        publisher: 'Therapeutic Innovation & Regulatory Science',
        releaseDate: '2024-05',
        url: '',
        summary: 'Third author. 2,100 visits across 14 sites.',
      },
      {
        id: 'pb2',
        name: 'A source-worksheet intervention to reduce query burden at oncology sites',
        publisher: 'ACRP Annual Conference (poster)',
        releaseDate: '2023-04',
        url: '',
        summary: 'Presenting author.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Monitoring',
        level: '',
        keywords: [
          'Risk-based monitoring',
          'Source data verification',
          'Site initiation and close-out',
          'Protocol deviation management',
          'Informed consent review',
          'Co-monitoring and mentoring',
        ],
      },
      {
        id: 's2',
        name: 'Regulatory',
        level: '',
        keywords: [
          'ICH-GCP',
          '21 CFR Part 11',
          'IRB submissions',
          'Trial master file review',
          'SAE and SUSAR reporting',
          'Inspection readiness',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['Medidata Rave', 'Veeva Vault eTMF', 'CTMS', 'IRT and IWRS', 'ePRO platforms'],
      },
      {
        id: 's4',
        name: 'Therapeutic areas',
        level: '',
        keywords: ['Solid tumor oncology', 'Hematology', 'Cardiology', 'Rare disease'],
      },
    ],
    languages: [{ id: 'l1', language: 'English', fluency: 'Native', rating: 5 }],
  }),
}

export default sample
