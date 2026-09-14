import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A final-year M.Tech applying for posts that begin on graduation, which is
 * when these applications really go out. A hiring PI reads for technique,
 * sample counts and which part of each paper was this person's, so the page
 * gives all three and skips everything else.
 */
export const sample: LibrarySample = {
  slug: 'postgraduate-research-associate',
  role: 'Research Associate',
  category: 'student',
  seniority: 'student',
  region: 'india',
  template: 'plainsong',
  blurb:
    'A final-year M.Tech seeking a first funded research post: two papers, 96 column runs, and a Rs 2,800 logger accurate to 6%.',
  keywords: [
    'research associate resume',
    'M.Tech fresher resume',
    'JRF application CV',
    'environmental engineering research',
    'academic resume India',
    'water quality research',
  ],
  content: content({
    basics: {
      name: 'Ankit Barman',
      label: 'Final-Year M.Tech, Environmental Engineering',
      image: '',
      email: 'ankit.barman@example.com',
      phone: '+91 12345 43907',
      url: '',
      summary:
        'Final-year M.Tech student at IIT Roorkee, applying for a funded research post in drinking-water quality to start on graduation in June 2027. First author on an arsenic-removal paper built from 96 column runs, and designed a Rs 2,800 turbidity logger that tracked a lab nephelometer within 6% over 90 days in the field.',
      location: { city: 'Guwahati', region: 'Assam', countryCode: 'IN' },
      profiles: [
        { network: 'ORCID', username: '0009-0007-4421-6605', url: 'https://orcid.org/0009-0007-4421-6605' },
        { network: 'LinkedIn', username: 'ankitbarman', url: 'https://linkedin.com/in/ankitbarman' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'Indian Institute of Technology Roorkee',
        area: 'Environmental Engineering',
        studyType: 'M.Tech',
        location: 'Roorkee, Uttarakhand',
        startDate: '2024-07',
        endDate: '2027-06',
        score: '9.1 CGPA',
        url: '',
        summary: 'Thesis under way on laterite-modified biochar for arsenic removal from floodplain groundwater.',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Physico-Chemical Treatment',
          'Environmental Chemistry',
          'Groundwater Hydrology',
          'Design of Experiments',
        ],
      },
      {
        id: 'e2',
        institution: 'Assam Engineering College',
        area: 'Civil Engineering',
        studyType: 'B.E.',
        location: 'Guwahati, Assam',
        startDate: '2020-08',
        endDate: '2024-05',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        status: 'completed',
        level: 'degree',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Department of Civil Engineering, IIT Roorkee',
        position: 'Research Assistant, Water Quality Laboratory',
        location: 'Roorkee, Uttarakhand',
        url: '',
        startDate: '2024-08',
        endDate: '',
        summary: 'Funded project on arsenic and fluoride in Brahmaputra valley groundwater.',
        highlights: [
          'Ran 96 fixed-bed column experiments across four flow rates, producing the breakthrough curves and isotherm fits behind the 2026 paper.',
          'Sampled 42 community wells across Kamrup district over three seasons, writing the field QA protocol the group still uses.',
          'Rebuilt the ICP-MS digestion routine after 14% of samples failed spike recovery; the failure rate fell to under 2% within a month.',
          'Supervised three B.Tech project students through their column studies, two of whom presented at a national conference.',
        ],
      },
      {
        id: 'w2',
        name: 'Brahmaputra Water Services',
        rail: { word: 'Internship' },
        position: 'Site Engineering Intern',
        location: 'Guwahati, Assam',
        url: '',
        startDate: '2023-05',
        endDate: '2023-07',
        summary: '',
        highlights: [
          'Commissioned the chlorine dosing at a 4 MLD treatment plant, holding residual chlorine inside the 0.2 to 1.0 mg/L band across eight weeks.',
          'Mapped 31 km of distribution main in QGIS from field notes the utility had kept only on paper.',
        ],
      },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Laterite-modified biochar for arsenic removal from Brahmaputra floodplain groundwater',
        publisher: 'Journal of Water Process Engineering',
        releaseDate: '2026-05',
        url: '',
        summary:
          'First author. Designed and ran all 96 column experiments, the isotherm fitting and the cost analysis.',
      },
      {
        id: 'pb2',
        name: 'Seasonal variation in fluoride loading across 42 community wells in Kamrup district',
        publisher: 'Environmental Monitoring and Assessment',
        releaseDate: '2025-11',
        url: '',
        summary: 'Second author. Set the sampling schedule and wrote the field quality-assurance protocol.',
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Low-cost turbidity logger',
        description: 'An open-hardware logger for village water tanks.',
        url: '',
        startDate: '2025-09',
        endDate: '2026-02',
        highlights: [
          'Built a Rs 2,800 logger from an infrared pair and a microcontroller; it tracked a lab nephelometer within 6% over 90 days in a village tank.',
        ],
        keywords: ['Arduino', 'Sensor calibration', 'Field deployment'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'GATE 2024: All India Rank 312, Civil Engineering',
        date: '2024',
        awarder: 'Graduate Aptitude Test in Engineering',
        summary: '',
      },
      {
        id: 'a2',
        title: 'Best Poster, National Conference on Water Quality Management',
        date: '2025',
        awarder: 'Indian Water Works Association',
        summary: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Laboratory',
        level: '',
        keywords: [
          'ICP-MS',
          'Ion chromatography',
          'UV-Vis spectrophotometry',
          'BOD and COD assays',
          'Fixed-bed column studies',
        ],
      },
      {
        id: 's2',
        name: 'Modelling and analysis',
        level: '',
        keywords: ['MATLAB', 'Python', 'EPANET', 'QGIS', 'Design of experiments'],
      },
      {
        id: 's3',
        name: 'Field',
        level: '',
        keywords: ['Groundwater sampling', 'Chain-of-custody protocols', 'Sensor deployment', 'Household surveys'],
      },
    ],
    languages: [
      { id: 'l1', language: 'Assamese', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 4 },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'publications', 'projects', 'awards', 'skills', 'languages']
    m.layout.headings = { ...m.layout.headings, work: 'Research Experience' }
  },
}

export default sample
