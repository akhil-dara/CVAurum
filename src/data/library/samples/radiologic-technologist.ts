import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A career changer: five years as a rural paramedic, then an associate degree
 * taken part time and a move into CT. The earlier career stays on the page
 * because it is the reason this technologist is trusted in a trauma bay.
 */
export const sample: LibrarySample = {
  slug: 'radiologic-technologist',
  role: 'Radiologic Technologist (CT)',
  category: 'healthcare',
  seniority: 'mid',
  region: 'us',
  template: 'double',
  blurb:
    'A paramedic who retrained into imaging, with the old career kept on the page because it is why the trauma bay trusts him.',
  keywords: [
    'radiologic technologist resume',
    'CT technologist',
    'ARRT registered',
    'radiography resume',
    'emergency imaging',
    'career change paramedic',
  ],
  content: content({
    basics: {
      name: 'Dominic Reyes',
      label: 'CT Technologist, Emergency Imaging',
      image: '',
      email: 'dominic.reyes@example.com',
      phone: '+1 (555) 0126',
      url: 'https://dominicreyes.example.com',
      summary:
        'CT technologist with five years in imaging and five before that as a rural paramedic, now covering emergency scanning at a level II trauma center. Moved scanner prep onto the trauma page rather than patient arrival, taking stroke door-to-CT from 19 minutes to 11 across 260 activations.',
      location: { city: 'San Antonio', region: 'TX', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'dominicreyesct', url: 'https://linkedin.com/in/dominicreyesct' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Arroyo Verde Regional Medical Center',
        position: 'CT Technologist, Emergency Imaging',
        location: 'San Antonio, TX',
        url: '',
        startDate: '2023-02',
        endDate: '',
        summary:
          'Level II trauma center. Scans 28 to 34 emergency studies a shift, including stroke and trauma activations against a 20-minute door-to-scan target.',
        highlights: [
          'Moved scanner prep onto the trauma page rather than patient arrival, cutting stroke door-to-CT from 19 minutes to 11 across 260 activations.',
          'Rebuilt the trauma pan-scan protocol with the lead radiologist, dropping dose-length product 27% with no repeat study attributable to the change.',
          'Trained all nine incoming technologists on power injector safety after a contrast review; extravasations fell from 11 a year to 3.',
          'Runs the quarterly contrast reaction drill with ED nursing; the last three drills hit the five-minute epinephrine target from first symptom.',
        ],
      },
      {
        id: 'w2',
        name: 'Bluestem Diagnostic Imaging',
        position: 'Radiologic Technologist',
        location: 'Austin, TX',
        url: '',
        startDate: '2021-06',
        endDate: '2023-01',
        summary: 'Two outpatient sites, 55 to 70 exams a day.',
        highlights: [
          'Brought the repeat-reject rate from 8.4% to 3.1% by starting a weekly image review with the two other technologists.',
          'Covered the second site alone through a nine-month vacancy and held walk-in wait times under 20 minutes.',
          'Built the positioning crib sheet for pediatric wrist and elbow views that the practice now hands to every new hire.',
        ],
      },
      {
        id: 'w3',
        name: 'Balcones Ridge EMS',
        position: 'Paramedic',
        location: 'Kerrville, TX',
        url: '',
        startDate: '2015-03',
        endDate: '2020-08',
        summary:
          'Rural county service with 40-minute transport times. Left to finish the radiography degree full time.',
        highlights: [
          'Ran about 1,400 emergency calls as lead medic, including 60 cardiac arrests, with the nearest receiving hospital 38 miles out.',
          'Wrote the county pediatric drug-dose card after a near-miss review; it went onto all 14 ambulances and stayed in service four years.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Austin Community College',
        area: 'Radiologic Technology',
        studyType: 'A.A.S.',
        location: 'Austin, TX',
        startDate: '2019-01',
        endDate: '2021-05',
        score: '3.8 GPA',
        url: '',
        summary:
          'Evenings and weekends while working as a paramedic, then full time for the final year and 1,860 clinical hours.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Del Mar College',
        area: 'Emergency Medical Services',
        studyType: 'Paramedic Certificate',
        location: 'Corpus Christi, TX',
        startDate: '2014-08',
        endDate: '2015-02',
        score: '',
        url: '',
        summary: '',
        courses: [],
        level: 'certificate',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'ARRT registered, Radiography (R) and Computed Tomography (CT)',
        date: 'Renewed 2026',
        issuer: 'American Registry of Radiologic Technologists',
        url: '',
      },
      {
        id: 'c2',
        name: 'Medical Radiologic Technologist License, Texas (active)',
        date: 'Renewed 2025',
        issuer: 'Texas Medical Board',
        url: '',
      },
      { id: 'c3', name: 'BLS and ACLS Provider', date: '2025', issuer: 'American Heart Association', url: '' },
      {
        id: 'c4',
        name: 'NREMT Paramedic (inactive)',
        date: '2015',
        issuer: 'National Registry of Emergency Medical Technicians',
        url: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Modalities',
        level: '',
        keywords: [
          'CT, 64- and 128-slice',
          'Digital radiography',
          'CT angiography',
          'Trauma pan-scan',
          'Portable and OR imaging',
        ],
      },
      {
        id: 's2',
        name: 'Dose and safety',
        level: '',
        keywords: [
          'ALARA dose optimization',
          'Contrast administration and reactions',
          'Pediatric dose protocols',
          'Shielding and badge monitoring',
          'MRI safety screening',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: [
          'PACS',
          'Radiology information systems',
          'Power injectors',
          '3D reconstruction workstations',
          'Protocol management',
        ],
      },
      {
        id: 's4',
        name: 'From prehospital care',
        level: '',
        keywords: [
          'IV access',
          'ACLS algorithms',
          'Rapid patient assessment',
          'Trauma team communication',
          'Spinal motion restriction',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
