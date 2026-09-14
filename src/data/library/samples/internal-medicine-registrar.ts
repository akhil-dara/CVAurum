import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A UK doctor mid-way through specialty training: registration and membership
 * stated plainly, audits written as the measure that shifted between cycles,
 * and a publications section that is the two things actually presented.
 */
export const sample: LibrarySample = {
  slug: 'internal-medicine-registrar',
  role: 'Internal Medicine Registrar (Respiratory)',
  category: 'healthcare',
  seniority: 'mid',
  region: 'uk',
  template: 'elegant',
  blurb:
    'Six years post-graduation, MRCP complete, with audits and teaching written as the numbers they changed rather than as duties.',
  keywords: [
    'medical registrar CV',
    'specialty registrar',
    'internal medicine trainee',
    'respiratory medicine',
    'MRCP',
    'GMC registered doctor',
    'NHS doctor CV',
  ],
  content: content({
    basics: {
      name: 'Rhiannon Kelsall',
      label: 'Specialty Registrar (ST4), Respiratory Medicine',
      image: '',
      email: 'rhiannon.kelsall@example.com',
      phone: '+44 7700 900156',
      url: 'https://rkelsall.example.com',
      summary:
        'Respiratory registrar six years out of medical school, fully GMC registered and MRCP(UK) complete, now in specialty training in the North West. Redesigned the trust escalation form for non-invasive ventilation, which took median time from blood gas to NIV from 4 hours 10 minutes to 96 minutes.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'rhiannonkelsall', url: 'https://linkedin.com/in/rhiannonkelsall' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Brackenmere NHS Foundation Trust',
        position: 'Specialty Registrar (ST4), Respiratory Medicine',
        location: 'Manchester',
        url: '',
        startDate: '2025-08',
        endDate: '',
        summary: 'Tertiary respiratory unit. Registrar-of-the-week rota, bronchoscopy list and the pleural service.',
        highlights: [
          'Redesigned the non-invasive ventilation escalation form after a 120-patient audit; median time from blood gas to NIV fell from 4 hours 10 minutes to 96 minutes.',
          'Holds the pleural list, performing about 90 ultrasound-guided aspirations and 30 indwelling catheter insertions a year.',
          'Organised the twice-weekly registrar teaching programme for 14 internal medicine trainees; attendance rose from 40% to 88% over two rotations.',
          'Rewrote the breathlessness pathway with the respiratory consultants, and it now runs unchanged at the three district sites in the network.',
        ],
      },
      {
        id: 'w2',
        name: 'Redhollow Teaching Hospitals NHS Trust',
        position: 'Internal Medicine Trainee (IMT1 to IMT3)',
        location: 'Leeds',
        url: '',
        startDate: '2022-08',
        endDate: '2025-08',
        summary: 'Rotations in acute medicine, cardiology, gastroenterology, intensive care and care of the elderly.',
        highlights: [
          'Held the medical registrar bleep on nights through IMT3, taking referrals for a 640-bed site with consultant cover by telephone.',
          'Cut the weekend discharge summary backlog from 61 outstanding to under 5 by moving the post-take round onto a structured proforma.',
          'Completed 34 supervised ascitic drains and 22 lumbar punctures, closing the full procedural portfolio a rotation ahead of schedule.',
        ],
      },
      {
        id: 'w3',
        name: 'Elmsworth General Hospital',
        position: 'Foundation Doctor (FY1 and FY2)',
        location: 'Sheffield',
        url: '',
        startDate: '2020-08',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Introduced a weekend handover checklist on the surgical ward after an incident review; overnight jobs missed at handover fell from 14 a weekend to 3.',
          'Audited venous thromboembolism prophylaxis across 200 admissions and took prescribing compliance from 74% to 96% after a drug-chart redesign.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Birmingham',
        area: 'Medicine',
        studyType: 'MBChB',
        location: 'Birmingham',
        startDate: '2014-09',
        endDate: '2020-07',
        score: 'Distinction in Clinical Practice',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Birmingham',
        area: 'Respiratory Science (intercalated)',
        studyType: 'BSc (Hons)',
        location: 'Birmingham',
        startDate: '2017-09',
        endDate: '2018-06',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'GMC registered, full licence to practise (registration number on request)',
        date: 'Since 2020',
        issuer: 'General Medical Council',
        url: '',
      },
      {
        id: 'c2',
        name: 'MRCP(UK), all three parts',
        date: '2024',
        issuer: 'Federation of the Royal Colleges of Physicians',
        url: '',
      },
      { id: 'c3', name: 'Advanced Life Support Provider', date: '2025', issuer: 'Resuscitation Council UK', url: '' },
      { id: 'c4', name: 'Good Clinical Practice', date: '2024', issuer: 'NIHR Clinical Research Network', url: '' },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Time to non-invasive ventilation in acute hypercapnic respiratory failure: a two-cycle audit',
        publisher: 'Clinical Medicine (abstract supplement)',
        releaseDate: '2025-11',
        url: '',
        summary: 'First author. 120 admissions, with an escalation-form redesign between cycles.',
      },
      {
        id: 'pb2',
        name: 'Complication rates on a consultant-supervised pleural procedure list',
        publisher: 'British Thoracic Society Winter Meeting',
        releaseDate: '2026-02',
        url: '',
        summary: 'Presenting author. 310 consecutive procedures reviewed.',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Trainee Audit Prize',
        date: '2025',
        awarder: 'North West School of Medicine',
        summary: 'For the two-cycle non-invasive ventilation audit.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Clinical',
        level: '',
        keywords: [
          'Acute medical take',
          'Non-invasive ventilation',
          'Pleural disease',
          'Bronchoscopy (supervised)',
          'Home oxygen assessment',
          'End-of-life care',
        ],
      },
      {
        id: 's2',
        name: 'Procedural',
        level: '',
        keywords: [
          'Ultrasound-guided thoracocentesis',
          'Chest drain insertion',
          'Ascitic drainage',
          'Lumbar puncture',
          'Central venous access',
        ],
      },
      {
        id: 's3',
        name: 'Beyond the ward',
        level: '',
        keywords: [
          'Clinical audit',
          'Quality improvement (PDSA)',
          'Undergraduate teaching',
          'Rota organisation',
          'Serious incident review',
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Welsh', fluency: 'Conversational', rating: 2 },
    ],
  }),
}

export default sample
