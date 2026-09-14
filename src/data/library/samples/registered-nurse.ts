import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Critical care, including a year of agency contracts. The licence and the
 * certifications sit where a nurse recruiter looks for them first, and every
 * bullet names the unit measure that moved.
 */
export const sample: LibrarySample = {
  slug: 'registered-nurse',
  role: 'Registered Nurse (ICU)',
  category: 'healthcare',
  seniority: 'mid',
  region: 'us',
  template: 'clarity',
  blurb:
    'Eight years of critical care, including a year of travel contracts, written as patient outcomes rather than units worked.',
  keywords: ['registered nurse', 'ICU nurse', 'critical care nurse', 'charge nurse', 'travel nurse resume', 'BSN CCRN'],
  content: content({
    basics: {
      name: 'Alyssa Corbin',
      label: 'Registered Nurse, Medical ICU',
      image: '',
      email: 'alyssa.corbin@example.com',
      phone: '+1 (555) 0173',
      url: 'https://alyssacorbin.example.com',
      summary:
        'Critical care nurse with eight years at the bedside, the last four as a night charge nurse on a 24-bed medical ICU. Rewrote the unit sepsis huddle that took door-to-antibiotic time from 71 minutes to 38, and precepts the new-graduate residency cohort each spring.',
      location: { city: 'Portland', region: 'OR', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'alyssacorbinrn', url: 'https://linkedin.com/in/alyssacorbinrn' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Harborlight Regional Medical Center',
        logo: monogram('H', '#0e7490'),
        position: 'Charge Nurse, Medical ICU',
        location: 'Portland, OR',
        url: '',
        startDate: '2022-06',
        endDate: '',
        summary:
          'Nights on a 24-bed medical ICU. Runs the assignment board for nine nurses and carries a two-patient load.',
        highlights: [
          'Rewrote the sepsis huddle so the first antibiotic is drawn and hung at the bedside, cutting door-to-antibiotic time from 71 minutes to 38 across 240 admissions.',
          'Precepted 14 new graduate nurses through the 12-week residency; 13 were still on the unit at one year, against a house average of six in ten.',
          'Chairs the unit practice council, whose two-hour turn schedule took hospital-acquired pressure injuries from nine a year to two.',
          'Led the catheter audit that brought CAUTI from 3.1 to 0.9 per 1,000 catheter days over four quarters.',
        ],
      },
      {
        id: 'w2',
        name: 'Wayfinder Health Staffing',
        logo: monogram('W', '#b45309'),
        position: 'Travel ICU Nurse (Contract)',
        location: 'Phoenix, AZ / Sacramento, CA / Boise, ID',
        url: '',
        startDate: '2021-03',
        endDate: '2022-05',
        summary: 'Three consecutive 13-week critical care contracts.',
        highlights: [
          'Took a full two-patient ICU assignment after two days of orientation at each host hospital, across three different charting systems.',
          'Trained 22 float-pool nurses on the ventilator weaning protocol at a 400-bed host site, which kept the teaching sheet as unit standard.',
          'Joined the four-person proning team through a respiratory surge, turning up to 30 ventilated patients a week with no line dislodgements.',
        ],
      },
      {
        id: 'w3',
        name: 'Cedar Hollow Community Hospital',
        logo: monogram('C', '#4338ca'),
        position: 'Staff Nurse, Progressive Care',
        location: 'Salem, OR',
        url: '',
        startDate: '2018-08',
        endDate: '2021-02',
        summary: '',
        highlights: [
          'Caught a mislabeled batch in the pharmacy tube system before a dose reached a patient, then wrote the barcode check that four units adopted.',
          'Cut heart-failure discharge teaching from 45 minutes to 25 with a teach-back card the unit still prints; 30-day readmissions fell by a fifth.',
          'Ran float orientation for 18 nurses during a staffing shortfall, clearing the unit orientation backlog in six weeks.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Oregon Health & Science University',
        area: 'Nursing',
        studyType: 'B.S.N.',
        location: 'Portland, OR',
        startDate: '2014-09',
        endDate: '2018-06',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'RN License, Oregon (active, multistate compact)',
        date: 'Renewed 2025',
        issuer: 'Oregon State Board of Nursing',
        url: '',
      },
      {
        id: 'c2',
        name: 'CCRN, Adult Critical Care',
        date: '2021',
        issuer: 'American Association of Critical-Care Nurses',
        url: '',
      },
      { id: 'c3', name: 'ACLS and BLS Provider', date: '2025', issuer: 'American Heart Association', url: '' },
      {
        id: 'c4',
        name: 'Trauma Nursing Core Course (TNCC)',
        date: '2023',
        issuer: 'Emergency Nurses Association',
        url: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Critical care',
        level: '',
        keywords: [
          'Ventilator management',
          'Vasoactive drips',
          'CRRT',
          'Sepsis bundles',
          'Post-arrest care',
          'Prone positioning',
        ],
      },
      {
        id: 's2',
        name: 'Procedures',
        level: '',
        keywords: ['Arterial lines', 'Central line care', 'Chest tubes', 'Moderate sedation', 'Difficult IV access'],
      },
      {
        id: 's3',
        name: 'Unit practice',
        level: '',
        keywords: [
          'Charge nurse staffing',
          'Preceptorship',
          'Chart audit',
          'Rapid response',
          'Family meetings',
          'Epic documentation',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Willamette Free Clinic',
        position: 'Volunteer Nurse',
        url: '',
        startDate: '2019-04',
        endDate: '',
        summary: '',
        highlights: [
          'Runs the Saturday screening table, checking blood pressure and glucose for about 25 uninsured patients a month.',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Conversational (medical)', rating: 3 },
    ],
  }),
}

export default sample
