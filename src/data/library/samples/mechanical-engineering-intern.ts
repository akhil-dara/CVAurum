import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A sophomore-to-junior applying for next summer. One prior internship, a
 * campus job that is real work, and a Formula SAE subteam where the numbers
 * are the point: kilograms removed, tests run, a finishing position.
 */
export const sample: LibrarySample = {
  slug: 'mechanical-engineering-intern',
  role: 'Mechanical Engineering Intern',
  category: 'student',
  seniority: 'student',
  region: 'us',
  template: 'clarity',
  blurb:
    'A junior applying for next summer: one manufacturing internship, a shop job, and a Formula SAE car that placed 9th of 111.',
  keywords: [
    'engineering internship resume',
    'mechanical engineering student',
    'summer internship resume',
    'Formula SAE resume',
    'college junior resume',
    'SolidWorks intern',
  ],
  content: content({
    basics: {
      name: 'Theo Brandt',
      label: 'Mechanical Engineering Student',
      image: '',
      email: 'theo.brandt@example.com',
      phone: '+1 (555) 0126',
      url: 'https://theobrandt.example.com',
      summary:
        'Third-year mechanical engineering student at the University of Michigan, seeking a summer 2027 design or manufacturing internship. Took 1.9 kg out of a Formula SAE front upright without losing stiffness, and spent last summer on a tooling floor cutting setup time on a live production cell.',
      location: { city: 'Ann Arbor', region: 'MI', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'theobrandt', url: 'https://linkedin.com/in/theobrandt' },
        { network: 'GrabCAD', username: 'tbrandt', url: 'https://grabcad.com/tbrandt' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'University of Michigan',
        area: 'Mechanical Engineering',
        studyType: 'B.S.E.',
        location: 'Ann Arbor, MI',
        startDate: '2024-08',
        endDate: '2028-04',
        score: '3.68 GPA',
        url: '',
        summary: '',
        status: 'pursuing',
        level: 'degree',
        courses: [
          'Statics and Mechanics of Materials',
          'Thermodynamics',
          'Manufacturing Processes',
          'Dynamics and Vibrations',
          'Machine Design',
        ],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Keelson Tooling',
        rail: { word: 'Internship' },
        position: 'Manufacturing Engineering Intern',
        location: 'Grand Rapids, MI',
        url: '',
        startDate: '2026-05',
        endDate: '2026-08',
        summary: 'Twelve weeks on a cell making stamped brackets for agricultural equipment.',
        highlights: [
          'Redesigned a fixture so the operator loads from one side instead of two, cutting setup time per changeover from 22 minutes to 9.',
          'Traced a 4.3% scrap rate on one bracket to a worn locating pin and wrote the inspection interval that has held scrap under 1% since.',
          'Modeled and had machined six replacement soft jaws, retiring a set of shimmed fixtures the cell had run on for three years.',
        ],
      },
      {
        id: 'w2',
        name: 'University of Michigan, Mechanical Engineering Department',
        position: 'Undergraduate Machine Shop Assistant',
        location: 'Ann Arbor, MI',
        url: '',
        startDate: '2025-01',
        endDate: '',
        summary: 'Ten hours a week alongside coursework.',
        highlights: [
          'Certifies undergraduates on the manual lathe and mill; has signed off 120 students with no recordable injury on the shift.',
          'Rebuilt the tooling checkout log as a shared sheet, cutting unreturned tools from about 30 a term to 4.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Formula SAE, suspension subteam',
        description: 'Front corner design for the 2026 car.',
        url: '',
        startDate: '2024-10',
        endDate: '',
        highlights: [
          'Cut 1.9 kg from the front uprights by re-running the FEA study at a 1.6 safety factor, holding stiffness within 3% of the previous part.',
          'Ran 14 shaker-rig tests that caught a damper valving error two weeks before competition; the car placed 9th of 111 in endurance.',
        ],
        keywords: ['SolidWorks', 'ANSYS', 'Data acquisition'],
      },
      {
        id: 'p2',
        name: 'Benchtop wind tunnel',
        description: 'An open-source tunnel for high school physics labs.',
        url: 'https://github.com/tbrandt/benchtop-tunnel',
        startDate: '2025-09',
        endDate: '2026-02',
        highlights: [
          'Designed a 0.3 m test section that builds for $840 in parts; four Detroit high schools now run a lift-and-drag lab on it.',
        ],
        keywords: ['Fusion 360', 'Load cells', 'Arduino'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: ['SolidWorks', 'Fusion 360', 'GD&T', 'Tolerance stacks', 'Design for manufacture'],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: ['ANSYS', 'Finite element analysis', 'MATLAB', 'Python', 'Data acquisition'],
      },
      {
        id: 's3',
        name: 'Shop',
        level: '',
        keywords: ['Manual lathe', 'CNC milling', 'TIG welding', 'FDM printing', 'Fixture build'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified SolidWorks Associate (CSWA)', date: '2025', issuer: 'Dassault Systemes', url: '' },
    ],
    awards: [
      {
        id: 'a1',
        title: 'James B. Angell Scholar',
        date: '2026',
        awarder: 'University of Michigan',
        summary: 'Awarded for two consecutive terms of all-A records.',
      },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'projects']
    m.layout.aside = ['skills', 'certificates', 'awards']
    m.layout.headings = { ...m.layout.headings, work: 'Experience' }
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      projects: { ...(m.layout.sectionSettings?.projects ?? {}), showKeywords: true, tagStyle: 'tags' },
    }
  },
}

export default sample
