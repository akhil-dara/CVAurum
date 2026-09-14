import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A UK academic CV trimmed to two pages for a readable application: teaching
 * load, grant income and supervision completions in the roles, with a short
 * selected-publications list rather than all 34.
 */
export const sample: LibrarySample = {
  slug: 'university-lecturer',
  role: 'University Lecturer',
  category: 'education',
  seniority: 'senior',
  region: 'uk',
  template: 'aurum-editorial',
  blurb:
    'A senior lecturer in two pages: teaching load, grant income and supervision record, each with the figure behind it.',
  keywords: [
    'university lecturer',
    'senior lecturer',
    'academic CV',
    'higher education teaching',
    'research grants',
    'PhD supervision',
  ],
  content: content({
    basics: {
      name: 'Dr Iona Greaves',
      label: 'Senior Lecturer in Environmental Science',
      image: '',
      email: 'iona.greaves@example.com',
      phone: '+44 7700 900240',
      url: 'https://ionagreaves.example.com',
      summary:
        'Environmental scientist with twelve years in UK higher education, working on carbon and water fluxes in upland catchments. Holds £1.2m in current grant income, convenes three modules for 420 students, and has supervised nine PhD students to completion.',
      location: { city: 'Bristol', countryCode: 'GB' },
      profiles: [
        { network: 'ORCID', username: '0000-0001-7742-9065', url: 'https://orcid.org/0000-0001-7742-9065' },
        { network: 'LinkedIn', username: 'ionagreaves', url: 'https://linkedin.com/in/ionagreaves' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Calderwell University',
        position: 'Senior Lecturer in Environmental Science',
        location: 'Bristol',
        url: '',
        startDate: '2019-09',
        endDate: '',
        summary:
          'School of Environmental Sciences. Leads a group of three postdoctoral researchers and five doctoral students.',
        highlights: [
          'Convenes three modules for 420 students across all three undergraduate years, including the second-year residential field course in mid Wales.',
          'Holds £1.2m of current grant income across four awards, including a £780k NERC standard grant on peatland carbon flux.',
          'Rebuilt the second-year statistics module around live data from the group field sensors; module evaluation rose from 3.4 to 4.5 of 5 and resits halved.',
          'Supervised nine doctoral students to completion, seven within four years, and chairs the faculty postgraduate research committee.',
          'Chairs the school Athena Swan self-assessment team; the share of women on shortlists for academic posts rose from 22% to 41% over three rounds.',
        ],
      },
      {
        id: 'w2',
        name: 'Calderwell University',
        position: 'Lecturer in Environmental Science',
        location: 'Bristol',
        url: '',
        startDate: '2014-09',
        endDate: '2019-08',
        summary: '',
        highlights: [
          'Designed and launched the MSc in Catchment Science, which recruited 28 students at first intake and has run at capacity every year since.',
          'Won a £310k fellowship to build the river-monitoring network that now feeds three modules and two doctoral projects.',
          'Raised first-year field skills pass rates from 79% to 94% by replacing the end-of-course report with weekly assessed field notebooks.',
          'Organised the annual catchment science summer school, 60 places a year, funded by three industry partners.',
        ],
      },
      {
        id: 'w3',
        name: 'Ardenfield University',
        position: 'Postdoctoral Research Associate',
        location: 'Norwich',
        url: '',
        startDate: '2011-10',
        endDate: '2014-08',
        summary: '',
        highlights: [
          'Modelled peatland carbon release under repeated drought for a four-country consortium; the resulting paper has been cited 340 times.',
          'Taught 120 hours a year of undergraduate GIS practicals and trained 14 research students in flux tower calibration.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of East Anglia',
        area: 'Environmental Sciences',
        studyType: 'PhD',
        location: 'Norwich',
        startDate: '2007-10',
        endDate: '2011-09',
        score: '',
        url: '',
        summary: 'Thesis on dissolved organic carbon export from blanket peat under changing storm frequency.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Edinburgh',
        area: 'Hydrology and Earth Observation',
        studyType: 'MSc',
        location: 'Edinburgh',
        startDate: '2006-09',
        endDate: '2007-09',
        score: 'Distinction',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e3',
        institution: 'University of Leeds',
        area: 'Geography',
        studyType: 'BSc (Hons)',
        location: 'Leeds',
        startDate: '2003-09',
        endDate: '2006-07',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Peatland carbon flux under repeated summer drought: a four-catchment synthesis',
        publisher: 'Global Change Biology',
        releaseDate: '2024-06',
        url: '',
        summary: 'First author. 148 citations.',
      },
      {
        id: 'pb2',
        name: 'Storm-driven dissolved organic carbon export from upland headwaters',
        publisher: 'Journal of Hydrology',
        releaseDate: '2022-03',
        url: '',
        summary: 'Corresponding author, with two supervised doctoral students.',
      },
      {
        id: 'pb3',
        name: 'A low-cost open sensor network for continuous catchment monitoring',
        publisher: 'Biogeosciences',
        releaseDate: '2020-11',
        url: '',
        summary: 'Hardware design since adopted by 22 monitoring groups in seven countries.',
      },
      {
        id: 'pb4',
        name: 'Teaching quantitative skills through live field data',
        publisher: 'Journal of Geography in Higher Education',
        releaseDate: '2019-02',
        url: '',
        summary: 'Pedagogy paper reporting the statistics module redesign. Selected publications from 34 in total.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Research',
        level: '',
        keywords: [
          'Catchment hydrology',
          'Eddy covariance',
          'Bayesian modelling',
          'R and Python',
          'Field instrumentation',
        ],
      },
      {
        id: 's2',
        name: 'Teaching',
        level: '',
        keywords: [
          'Module convening',
          'Field course leadership',
          'Doctoral supervision',
          'Assessment design',
          'Curriculum review',
        ],
      },
      {
        id: 's3',
        name: 'Academic service',
        level: '',
        keywords: [
          'Grant peer review',
          'REF output selection',
          'External examining',
          'Editorial board',
          'Programme validation',
        ],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Vice-Chancellor Award for Teaching Excellence',
        date: '2023',
        awarder: 'Calderwell University',
        summary: 'Awarded for the second-year statistics module redesign.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Senior Fellow of the Higher Education Academy (SFHEA)',
        date: '2021',
        issuer: 'Advance HE',
        url: '',
      },
    ],
  }),
}

export default sample
