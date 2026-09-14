import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Aerospace structures, where the deliverable is evidence a regulator will
 * accept. Every bullet is written against that: findings raised, submittals
 * accepted first time, mass removed while margins held. The publications
 * section is where conference papers belong on an analyst résumé.
 */
export const sample: LibrarySample = {
  slug: 'senior-stress-engineer',
  role: 'Senior Stress Engineer',
  category: 'engineering',
  seniority: 'senior',
  region: 'us',
  template: 'executive',
  blurb:
    'Twelve years of airframe and composite analysis, told through certification evidence that was accepted the first time.',
  keywords: [
    'stress engineer',
    'aerospace structures engineer',
    'composite analysis',
    'FEA Nastran Patran',
    'FAA certification',
    'damage tolerance',
  ],
  content: content({
    basics: {
      name: 'Adrian Petrossian',
      label: 'Senior Stress Engineer',
      image: '',
      email: 'adrian.petrossian@example.com',
      phone: '+1 (555) 0166',
      url: 'https://adrianpetrossian.example.com',
      summary:
        'Stress engineer with twelve years on metallic and composite airframe structures, eight of them producing certification evidence for Part 25 programs. Owned the static and damage-tolerance substantiation for a composite wing-to-body fairing that the FAA accepted without a single finding. Appointed a Structures Designated Engineering Representative in 2024.',
      location: { city: 'Wichita', region: 'KS', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'apetrossian', url: 'https://linkedin.com/in/apetrossian' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Hollis Aerostructures',
        logo: monogram('H', '#0f172a'),
        position: 'Senior Stress Engineer',
        location: 'Wichita, KS',
        url: '',
        startDate: '2021-04',
        endDate: '',
        summary: 'Structures group of eleven; owns substantiation for composite empennage and fairing assemblies.',
        highlights: [
          'Owned static and damage-tolerance substantiation for a composite wing-to-body fairing, accepted by the FAA with no findings across 340 pages of analysis.',
          'Cut a bonded-joint margin review from six weeks to nine days by replacing hand checks with a scripted Nastran post-processor the group still runs.',
          'Traced an in-service cracking report on 62 delivered shipsets to a fastener edge-margin shortfall and wrote the repair scheme that returned all 62 to service.',
          'Removed 41 lb per aircraft from the empennage by re-laminating three skin panels while holding every margin above 0.05.',
          'Mentors four engineers on composite failure criteria; two have since signed their first certification reports.',
        ],
      },
      {
        id: 'w2',
        name: 'Whitmore Aero Systems',
        logo: monogram('W', '#7c2d12'),
        position: 'Stress Engineer',
        location: 'Everett, WA',
        url: '',
        startDate: '2017-06',
        endDate: '2021-03',
        summary: '',
        highlights: [
          'Built and correlated a 1.2 million-element finite element model of a cargo-door surround, matching full-scale strain-gauge data within 6%.',
          'Wrote 28 stress reports supporting a derivative type certificate, all accepted by the delegated authority on first submittal.',
          'Automated margin-of-safety rollups across 9,000 elements, removing about 200 engineer-hours per analysis cycle.',
        ],
      },
      {
        id: 'w3',
        name: 'Larkfield Composites',
        logo: monogram('L', '#155e75'),
        position: 'Structural Analyst',
        location: 'Salt Lake City, UT',
        url: '',
        startDate: '2014-08',
        endDate: '2017-05',
        summary: '',
        highlights: [
          'Analyzed and tested 46 composite coupon and element configurations, building the allowables database two later programs were certified against.',
          'Showed the bearing-bypass method then in use carried 22% of unnecessary conservatism, releasing capability that removed 14 fasteners per panel.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Kansas',
        area: 'Aerospace Engineering',
        studyType: 'M.S.',
        location: 'Lawrence, KS',
        startDate: '2012-08',
        endDate: '2014-05',
        score: '3.8 GPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Kansas State University',
        area: 'Mechanical Engineering',
        studyType: 'B.S.',
        location: 'Manhattan, KS',
        startDate: '2008-08',
        endDate: '2012-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: [
          'Classical hand analysis',
          'Linear and nonlinear FEA',
          'Damage tolerance',
          'Fatigue and fracture',
          'Composite failure criteria',
          'Buckling and crippling',
        ],
      },
      {
        id: 's2',
        name: 'Tools',
        level: '',
        keywords: ['MSC Nastran', 'Patran', 'Abaqus', 'HyperMesh', 'NASGRO', 'Python'],
      },
      {
        id: 's3',
        name: 'Certification',
        level: '',
        keywords: [
          'FAR Part 25 Subparts C and D',
          'AC 20-107B',
          'Static and fatigue test support',
          'Stress report authoring',
          'Repair dispositions',
        ],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'Bearing-Bypass Interaction in Thick Composite Joints at Elevated Temperature',
        publisher: 'SAMPE Technical Conference',
        releaseDate: '2019-05',
        url: '',
        summary: 'Co-authored; presents test data for 46 joint configurations between 70°F and 250°F.',
      },
      {
        id: 'pub2',
        name: 'Correlating Global Finite Element Models to Full-Scale Fatigue Test Strain Data',
        publisher: 'AIAA SciTech Forum',
        releaseDate: '2022-01',
        url: '',
        summary: 'A method for reconciling strain discrepancies under 10% without local model refinement.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Designated Engineering Representative — Structures',
        date: '2024',
        issuer: 'Federal Aviation Administration',
        url: '',
      },
      {
        id: 'c2',
        name: 'Professional Engineer (Mechanical), Kansas',
        date: '2019',
        issuer: 'Kansas Board of Technical Professions',
        url: '',
      },
    ],
  }),
}

export default sample
