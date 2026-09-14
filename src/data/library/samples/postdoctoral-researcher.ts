import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * An academic CV cut to résumé length: papers and funding stay, but so does
 * the teaching load, because the jobs this is sent to ask what has actually
 * been taught and to how many students.
 */
export const sample: LibrarySample = {
  slug: 'postdoctoral-researcher',
  role: 'Postdoctoral Research Associate',
  category: 'education',
  seniority: 'mid',
  region: 'us',
  template: 'atelier',
  blurb:
    'A postdoc CV that shows the papers, the fellowship and the real teaching load rather than a list of techniques.',
  keywords: [
    'postdoctoral researcher',
    'postdoc resume',
    'neuroscience research',
    'academic CV',
    'research associate',
    'faculty job application',
  ],
  content: content({
    basics: {
      name: 'Elena Márquez, PhD',
      label: 'Postdoctoral Research Associate, Systems Neuroscience',
      image: '',
      email: 'elena.marquez@example.com',
      phone: '+1 (555) 0164',
      url: 'https://marquezlab.example.com',
      summary:
        'Systems neuroscientist four years into a postdoc studying how cortical circuits hold information across delays. Twelve peer-reviewed papers, five as first author, and an NIH F32 fellowship funding the current project. Has taught 210 undergraduates as instructor of record.',
      location: { city: 'Madison', region: 'WI', countryCode: 'US' },
      profiles: [
        { network: 'ORCID', username: '0000-0002-8814-2213', url: 'https://orcid.org/0000-0002-8814-2213' },
        { network: 'GitHub', username: 'emarquez-lab', url: 'https://github.com/emarquez-lab' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Lakeshore Institute for Neuroscience',
        position: 'Postdoctoral Research Associate',
        location: 'Madison, WI',
        url: '',
        startDate: '2022-08',
        endDate: '',
        summary: 'Independent research institute; circuits and behavior group of 11.',
        highlights: [
          'Runs a two-photon imaging project on delay-period activity in mouse parietal cortex, now at 38 animals and three first-author papers.',
          'Won an NIH F32 fellowship worth $186k after a first submission scored in the 8th percentile, funding the project through 2027.',
          'Built the analysis pipeline the group standardized on, which cut the time from a finished imaging session to plotted results from two days to 40 minutes.',
          'Mentors four undergraduates and one rotation student; three are authors on submitted manuscripts and two entered PhD programs.',
          'Gave 11 invited talks and conference presentations, including a selected talk at the 2025 Society for Neuroscience meeting.',
        ],
      },
      {
        id: 'w2',
        name: 'Two Rivers Community College',
        position: 'Adjunct Instructor, Biology (part-time)',
        location: 'Madison, WI',
        url: '',
        startDate: '2023-01',
        endDate: '2025-05',
        summary: '',
        highlights: [
          'Taught Introduction to Neuroscience as instructor of record for three spring semesters, 210 students in total, with course evaluations of 4.6 to 4.8 out of 5.',
          'Replaced the term paper with a five-stage scaffolded assignment; the share of students submitting a complete final draft rose from 71% to 94%.',
          'Wrote an open lab manual of eight data-analysis exercises, now used by two other sections of the course.',
        ],
      },
      {
        id: 'w3',
        name: 'Alderpoint Biomedical Research Center',
        position: 'Research Technician',
        location: 'Rochester, MN',
        url: '',
        startDate: '2014-07',
        endDate: '2016-06',
        summary: '',
        highlights: [
          'Maintained a 400-cage transgenic mouse colony and rebuilt the genotyping workflow, cutting turnaround from nine days to three.',
          'Contributed histology and imaging to two papers, earning second authorship on one.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Wisconsin-Madison',
        area: 'Neuroscience',
        studyType: 'PhD',
        location: 'Madison, WI',
        startDate: '2016-08',
        endDate: '2022-05',
        score: '',
        url: '',
        summary:
          'Dissertation on cortical population codes for working memory. Taught 14 sections of undergraduate laboratory courses as a teaching assistant across five semesters.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Minnesota Twin Cities',
        area: 'Biochemistry',
        studyType: 'B.S.',
        location: 'Minneapolis, MN',
        startDate: '2010-09',
        endDate: '2014-05',
        score: '3.8 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Stable delay-period codes survive large-scale turnover of parietal neurons',
        publisher: 'Neuron',
        releaseDate: '2025-04',
        url: '',
        summary: 'First author. 64 citations and an accompanying preview article.',
      },
      {
        id: 'pb2',
        name: 'Task structure, not reward, organizes sequence activity in mouse parietal cortex',
        publisher: 'Nature Neuroscience',
        releaseDate: '2024-01',
        url: '',
        summary: 'First author, with two mentored undergraduates as co-authors.',
      },
      {
        id: 'pb3',
        name: 'A fast, open pipeline for calcium imaging segmentation and drift correction',
        publisher: 'Journal of Neuroscience Methods',
        releaseDate: '2023-06',
        url: '',
        summary: 'First author. Describes the pipeline released as CalciumTrace below.',
      },
      {
        id: 'pb4',
        name: 'Working memory without persistent activity: a review of the evidence',
        publisher: 'Annual Review of Neuroscience',
        releaseDate: '2022-07',
        url: '',
        summary: 'Co-first author. 310 citations.',
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'CalciumTrace',
        description:
          'An open-source Python package for two-photon calcium imaging analysis, from raw frames to spike-rate estimates.',
        url: 'https://github.com/emarquez-lab/calciumtrace',
        startDate: '2021-05',
        endDate: '',
        highlights: ['Used by 19 labs across six countries; ships regression tests against three published datasets.'],
        keywords: ['Python', 'Image registration', 'Spike inference'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Experimental',
        level: '',
        keywords: [
          'Two-photon imaging',
          'In vivo electrophysiology',
          'Optogenetics',
          'Head-fixed behavior',
          'Immunohistochemistry',
        ],
      },
      {
        id: 's2',
        name: 'Computational',
        level: '',
        keywords: ['Python', 'MATLAB', 'R', 'Spike sorting', 'State-space models', 'Statistical modeling'],
      },
      {
        id: 's3',
        name: 'Teaching and service',
        level: '',
        keywords: [
          'Instructor of record',
          'Lecture design',
          'Undergraduate mentoring',
          'Grant writing',
          'Journal peer review',
        ],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Ruth L. Kirschstein Postdoctoral Fellowship (F32)',
        date: '2023',
        awarder: 'National Institute of Neurological Disorders and Stroke',
        summary: '$186k over three years, scored in the 8th percentile on first submission.',
      },
      {
        id: 'a2',
        title: 'Graduate Teaching Excellence Award',
        date: '2021',
        awarder: 'University of Wisconsin-Madison',
        summary: 'One of four given across the biological sciences that year.',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Native', rating: 5 },
    ],
  }),
}

export default sample
