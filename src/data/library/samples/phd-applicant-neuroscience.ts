import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * The academic shape: education, research, publications, presentations,
 * awards. An admissions committee reads for what was done at the bench and
 * whose hands were on which part of it, so every entry says which part.
 */
export const sample: LibrarySample = {
  slug: 'phd-applicant-neuroscience',
  role: 'PhD Applicant, Neuroscience',
  category: 'student',
  seniority: 'student',
  region: 'us',
  template: 'plainsong',
  blurb:
    'An academic CV for a graduate school application: two years at the bench, a first-author preprint, posters and teaching.',
  keywords: [
    'PhD application CV',
    'academic CV student',
    'graduate school resume',
    'neuroscience research assistant',
    'undergraduate research CV',
    'publications and posters',
  ],
  content: content({
    basics: {
      name: 'Mara Lindqvist',
      label: 'Undergraduate Researcher, Neuroscience',
      image: '',
      email: 'mara.lindqvist@example.com',
      phone: '+1 (555) 0139',
      url: 'https://maralindqvist.example.com',
      summary:
        'Fourth-year neuroscience student at UNC Chapel Hill applying to PhD programs in systems neuroscience for fall 2027. Two years of chronic two-photon imaging in mouse barrel cortex, a first-author methods preprint, and a spine-detection pipeline that cut manual scoring from nine hours a week to one.',
      location: { city: 'Chapel Hill', region: 'NC', countryCode: 'US' },
      profiles: [
        { network: 'ORCID', username: '0009-0004-7712-3318', url: 'https://orcid.org/0009-0004-7712-3318' },
        { network: 'GitHub', username: 'mlindqvist', url: 'https://github.com/mlindqvist' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'University of North Carolina at Chapel Hill',
        area: 'Neuroscience, minor in Statistics',
        studyType: 'B.S.',
        location: 'Chapel Hill, NC',
        startDate: '2023-08',
        endDate: '2027-05',
        score: '3.89 GPA',
        url: '',
        summary: 'Candidate for Highest Honors; thesis on spine turnover under partial whisker deprivation.',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Cellular Neurophysiology',
          'Systems Neuroscience',
          'Mixed-Effects Modeling',
          'Scientific Computing',
          'Experimental Design',
        ],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Synaptic Plasticity Laboratory, UNC Chapel Hill',
        position: 'Undergraduate Research Assistant',
        location: 'Chapel Hill, NC',
        url: '',
        startDate: '2024-09',
        endDate: '',
        summary: 'Chronic two-photon imaging in juvenile mouse somatosensory cortex; 15 hours a week during term.',
        highlights: [
          'Runs the imaging sessions and spine-tracking analysis for a 14-animal longitudinal study, now in revision at a physiology journal.',
          'Wrote a semi-automated spine detector on 2,400 hand-labeled images that cut manual scoring from nine hours a week to one, with 96% agreement against two blinded scorers.',
          'Designed and built a head-fixation plate for juvenile animals after the commercial part failed on three mice; the design file is now used by three other laboratories.',
          'Trains incoming undergraduates on stereotaxic surgery and perfusion; four of the five have stayed past a year.',
        ],
      },
      {
        id: 'w2',
        name: 'Ridgeline Institute for Brain Science',
        rail: { word: 'Fellowship' },
        position: 'Summer Research Fellow',
        location: 'Seattle, WA',
        url: '',
        startDate: '2025-06',
        endDate: '2025-08',
        summary: '',
        highlights: [
          'Quantified interneuron density across six cortical layers in 42 sections, reaching the lab reference values within 4% on a first attempt.',
          'Presented the ten-week project to an institute-wide audience of 90 and was one of two fellows invited back for a second summer.',
        ],
      },
      {
        id: 'w3',
        name: 'Department of Biology, UNC Chapel Hill',
        position: 'Undergraduate Teaching Assistant, Introductory Neurobiology',
        location: 'Chapel Hill, NC',
        url: '',
        startDate: '2025-08',
        endDate: '2026-05',
        summary: '',
        highlights: [
          'Led two weekly discussion sections of 24 students and held four office hours; section mean on the final sat 6 points above the course mean both terms.',
        ],
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'A printable head-fixation plate for chronic imaging in juvenile mice',
        publisher: 'bioRxiv preprint',
        releaseDate: '2026-07',
        url: '',
        summary:
          'First author. Design, validation across 22 animals, and the open hardware files, downloaded 480 times to date.',
      },
      {
        id: 'pb2',
        name: 'Dendritic spine turnover after repeated partial whisker deprivation in mouse barrel cortex',
        publisher: 'Journal of Neurophysiology',
        releaseDate: '2026-03',
        url: '',
        summary: 'Fourth author. Ran all imaging sessions and the spine-tracking analysis for the 14-animal cohort.',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Barry Goldwater Scholarship',
        date: '2026',
        awarder: 'Goldwater Scholarship Foundation',
        summary: '',
      },
      {
        id: 'a2',
        title: 'Phi Beta Kappa, junior induction',
        date: '2026',
        awarder: 'University of North Carolina at Chapel Hill',
        summary: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Laboratory',
        level: '',
        keywords: [
          'Two-photon imaging',
          'Stereotaxic surgery',
          'Immunohistochemistry',
          'Cryosectioning',
          'Mouse colony management',
        ],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: ['Python', 'MATLAB', 'R', 'ImageJ', 'Mixed-effects models', 'Bootstrap resampling'],
      },
      {
        id: 's3',
        name: 'Scholarly practice',
        level: '',
        keywords: ['Manuscript drafting', 'Animal protocol writing', 'Poster design', 'Peer mentoring'],
      },
    ],
    custom: [
      {
        id: 'cs1',
        name: 'Conference Presentations',
        items: [
          {
            id: 'ci1',
            name: 'Spine turnover tracks the deprivation schedule, not the total days deprived',
            subtitle: 'Poster, Society for Neuroscience annual meeting',
            date: '2025-11',
            location: 'Chicago, IL',
            url: '',
            summary: '',
            highlights: [],
          },
          {
            id: 'ci2',
            name: 'Automating dendritic spine detection from a 2,400-image labeled set',
            subtitle: 'Talk, UNC Undergraduate Research Symposium',
            date: '2026-04',
            location: 'Chapel Hill, NC',
            url: '',
            summary: '',
            highlights: [],
          },
        ],
      },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'publications', 'custom-cs1', 'awards', 'skills']
    m.layout.headings = { ...m.layout.headings, work: 'Research and Teaching' }
  },
}

export default sample
