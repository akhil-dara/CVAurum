import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Consulting civil engineering, where the deliverable is a permit and the
 * client is usually a public agency. The bullets are written as outcomes that
 * survive a reference check — properties out of the flood map, permits cleared
 * without a second review cycle, grant dollars won.
 */
export const sample: LibrarySample = {
  slug: 'water-resources-engineer',
  role: 'Water Resources Engineer',
  category: 'engineering',
  seniority: 'senior',
  region: 'us',
  template: 'classic',
  blurb:
    'Thirteen years of stormwater and floodplain design, told through permits granted and properties taken off the flood map.',
  keywords: [
    'water resources engineer',
    'civil engineer PE',
    'stormwater design',
    'HEC-RAS modeling',
    'floodplain management',
    'hydrology and hydraulics',
  ],
  content: content({
    basics: {
      name: 'Naomi Strandberg',
      label: 'Senior Water Resources Engineer, PE',
      image: '',
      email: 'naomi.strandberg@example.com',
      phone: '+1 (555) 0184',
      url: 'https://naomistrandberg.example.com',
      summary:
        'Civil engineer with thirteen years in hydrology, hydraulics and stormwater design across the Pacific Northwest and Intermountain West. Led a levee accreditation study that removed 1,240 properties from the FEMA special flood hazard area. Licensed PE in three states and project manager on a portfolio of about $4M in annual fees.',
      location: { city: 'Portland', region: 'OR', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'naomistrandberg', url: 'https://linkedin.com/in/naomistrandberg' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Halstead Civil Group',
        position: 'Senior Water Resources Engineer',
        location: 'Portland, OR',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary:
          'Leads the public-agency portfolio of the water resources group: six engineers, about $4M in annual fees.',
        highlights: [
          'Led a levee accreditation study through FEMA review, removing 1,240 properties from the special flood hazard area and about $1.9M a year in insurance premiums.',
          'Designed a 14-acre regional stormwater facility that let a city approve 900 housing units previously blocked by downstream capacity.',
          'Won $6.2M in state resilience grants for three clients by writing the hydraulic justification behind each application.',
          'Cut model review time 40% across 30 active projects by standardizing HEC-RAS naming conventions and QA checklists.',
        ],
      },
      {
        id: 'w2',
        name: 'Quarrybrook Engineering',
        position: 'Water Resources Engineer',
        location: 'Boise, ID',
        url: '',
        startDate: '2016-09',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Produced hydraulic designs for 21 culvert and bridge replacements, every one permitted through the Corps and state fish agencies without a second review cycle.',
          'Built a calibrated SWMM model of a 3,400-acre urban basin that identified the four pipe segments causing 80% of reported flooding.',
          'Coached four engineers to their PE and wrote the stormwater design standard the office still issues to new hires.',
        ],
      },
      {
        id: 'w3',
        name: 'Thistlewood Land Consultants',
        position: 'Civil Engineer',
        location: 'Boise, ID',
        url: '',
        startDate: '2013-07',
        endDate: '2016-08',
        summary: '',
        highlights: [
          'Designed grading, drainage and utilities for 11 subdivisions totaling 780 lots.',
          'Reduced a detention footprint 26% by substituting infiltration galleries, freeing two additional buildable lots for the client.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Colorado State University',
        area: 'Civil Engineering (Water Resources)',
        studyType: 'M.S.',
        location: 'Fort Collins, CO',
        startDate: '2011-08',
        endDate: '2013-05',
        score: '3.8 GPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Idaho',
        area: 'Civil Engineering',
        studyType: 'B.S.',
        location: 'Moscow, ID',
        startDate: '2007-08',
        endDate: '2011-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'American Society of Civil Engineers, Oregon Section',
        position: 'Younger Member Mentor',
        url: '',
        startDate: '2022-01',
        endDate: '',
        summary: '',
        highlights: ['Runs a quarterly exam study group that has taken 18 engineers through the civil PE depth exam.'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Hydrology & hydraulics',
        level: '',
        keywords: ['HEC-RAS 1D and 2D', 'HEC-HMS', 'EPA SWMM', 'XPSWMM', 'Scour and sediment transport'],
      },
      {
        id: 's2',
        name: 'Design & permitting',
        level: '',
        keywords: [
          'Stormwater facility design',
          'FEMA CLOMR and LOMR',
          'Section 404 permitting',
          'NPDES compliance',
          'Grading and drainage',
        ],
      },
      {
        id: 's3',
        name: 'Delivery',
        level: '',
        keywords: [
          'Project management',
          'Public agency coordination',
          'Grant writing',
          'QA/QC review',
          'Construction support',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Professional Engineer (Civil) — Oregon, Washington, Idaho',
        date: '2016',
        issuer: 'NCEES member boards',
        url: '',
      },
      {
        id: 'c2',
        name: 'Certified Floodplain Manager (CFM)',
        date: '2018',
        issuer: 'Association of State Floodplain Managers',
        url: '',
      },
      {
        id: 'c3',
        name: 'Envision Sustainability Professional (ENV SP)',
        date: '2022',
        issuer: 'Institute for Sustainable Infrastructure',
        url: '',
      },
    ],
  }),
}

export default sample
