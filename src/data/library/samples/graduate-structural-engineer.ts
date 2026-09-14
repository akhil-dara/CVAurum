import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * The UK graduate route: a placement year inside the degree, a design office
 * afterwards, and everything written so an IStructE supervising engineer can
 * see the competences forming. British spelling throughout, degree class on
 * the education entry, and the chartership progress stated rather than implied.
 */
export const sample: LibrarySample = {
  slug: 'graduate-structural-engineer',
  role: 'Graduate Structural Engineer',
  category: 'engineering',
  seniority: 'entry',
  region: 'uk',
  template: 'cambridge',
  blurb:
    'A graduate two years into the IStructE route, with placement and design work told through the buildings it produced.',
  keywords: [
    'graduate structural engineer',
    'IStructE chartership',
    'Eurocodes',
    'Tekla Structural Designer',
    'civil engineering graduate',
    'Revit',
  ],
  content: content({
    basics: {
      name: 'Isla Fairbairn',
      label: 'Graduate Structural Engineer',
      image: '',
      email: 'isla.fairbairn@example.com',
      phone: '+44 7700 900135',
      url: 'https://islafairbairn.example.com',
      summary:
        'Structural engineer two years into the graduate route to IStructE chartership, designing steel and reinforced-concrete frames for schools and residential blocks. Took a 1,400 m² teaching block from concept to construction issue, reworking the bracing to save 31 tonnes of steel against the tender scheme. Designs to the Eurocodes in Tekla Structural Designer and Revit.',
      location: { city: 'Leeds', region: 'West Yorkshire', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'islafairbairn', url: 'https://linkedin.com/in/islafairbairn' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Marlow Fenn Partnership',
        position: 'Graduate Structural Engineer',
        location: 'Leeds',
        url: '',
        startDate: '2024-09',
        endDate: '',
        summary: 'Buildings team of fourteen, working on education and residential schemes between £2m and £18m.',
        highlights: [
          'Designed the steel frame for a 1,400 m² teaching block from concept to construction issue, saving 31 tonnes of steel against the tender bracing layout.',
          'Modelled and checked 60 reinforced-concrete transfer beams for a nine-storey residential scheme, clearing every one through internal review without a resubmission.',
          'Set up the practice-wide Tekla-to-Revit export template, removing roughly six hours of manual remodelling per project.',
          'Carried out 22 inspections on a live school extension and logged four setting-out errors before concrete was poured.',
        ],
      },
      {
        id: 'w2',
        name: 'Halden Rowe Consulting',
        position: 'Placement Engineer',
        location: 'Sheffield',
        url: '',
        startDate: '2022-07',
        endDate: '2023-07',
        summary: 'Twelve-month industrial placement within the MEng programme.',
        highlights: [
          'Produced temporary-works designs for 14 excavation and propping schemes, all approved by the checking engineer first time.',
          'Rebuilt the standard connection-design spreadsheets to BS EN 1993-1-8, replacing a set last revised under BS 5950.',
          'Surveyed and assessed 31 masonry lintels on a Victorian mill conversion, of which 9 were found to need replacement.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Sheffield',
        area: 'Civil and Structural Engineering',
        studyType: 'MEng',
        location: 'Sheffield',
        startDate: '2019-09',
        endDate: '2024-06',
        score: 'First Class Honours',
        url: '',
        summary: 'Five-year accredited programme including a year in industry.',
        courses: [
          'Advanced Concrete Design',
          'Structural Dynamics',
          'Geotechnical Engineering',
          'Structural Stability',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Post-tensioned timber connections (MEng research project)',
        description: 'Cyclic testing of post-tensioned laminated veneer lumber beam-column joints.',
        url: '',
        startDate: '2023-09',
        endDate: '2024-05',
        highlights: [
          'Tested nine full-scale specimens to failure and measured 8% residual drift after twelve cycles, against the 15% assumed by the design guidance.',
        ],
        keywords: ['Structural testing', 'Timber', 'Abaqus'],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'STEM Learning',
        position: 'STEM Ambassador',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary: '',
        highlights: ['Runs a bridge-building workshop at four Leeds schools, reaching about 230 pupils a year.'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design codes',
        level: '',
        keywords: [
          'BS EN 1990 & 1991',
          'BS EN 1992 (concrete)',
          'BS EN 1993 (steel)',
          'BS EN 1996 (masonry)',
          'BS 5975 temporary works',
        ],
      },
      {
        id: 's2',
        name: 'Software',
        level: '',
        keywords: ['Tekla Structural Designer', 'Revit', 'AutoCAD', 'Robot Structural Analysis', 'MathCAD'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: [
          'Steel and RC frame design',
          'Temporary works',
          'Site inspection',
          'Existing-structure appraisal',
          'Contractor queries',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Graduate Member (GMIStructE)',
        date: '2024',
        issuer: 'Institution of Structural Engineers',
        url: '',
      },
      { id: 'c2', name: 'CSCS Academically Qualified Person card', date: '2022', issuer: 'CITB', url: '' },
      { id: 'c3', name: 'Temporary Works Coordinator', date: '2025', issuer: 'CITB', url: '' },
    ],
  }),
}

export default sample
