import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A sideways move told straight: two years supervising production, then five
 * in quality. The production role stays on the page because it is the reason
 * the containment bullets are credible, and the numbers are the ones a Tier-1
 * customer quality manager already tracks — PPM, audit findings, COPQ.
 */
export const sample: LibrarySample = {
  slug: 'quality-engineer',
  role: 'Quality Engineer',
  category: 'engineering',
  seniority: 'mid',
  region: 'india',
  template: 'graphite',
  blurb:
    'A production engineer who moved into quality, told through PPM, audit findings and the cost of poor quality removed.',
  keywords: [
    'quality engineer',
    'IATF 16949',
    '8D problem solving',
    'APQP PPAP',
    'supplier quality engineer',
    'ASQ CQE',
  ],
  content: content({
    basics: {
      name: 'Divya Sundaresan',
      label: 'Senior Quality Engineer',
      image: '',
      email: 'divya.sundaresan@example.com',
      phone: '+91 12345 70246',
      url: 'https://divyasundaresan.example.com',
      summary:
        'Quality engineer with seven years in automotive castings and machined components, the first two of them supervising production. Took customer PPM at a Tier-1 machining plant from 840 to 96 in two years and closed a warranty claim that had been open since 2022. ASQ-certified quality engineer and IATF 16949 internal auditor.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'divyasundaresan', url: 'https://linkedin.com/in/divyasundaresan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Velmora Auto Components',
        position: 'Senior Quality Engineer',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2023-07',
        endDate: '',
        summary:
          'Customer quality for two machining lines shipping 2.4 million parts a year to three passenger-vehicle OEMs.',
        highlights: [
          'Reduced customer PPM from 840 to 96 over two years by moving four inspection gates upstream and adding in-process bore gauging.',
          'Closed a warranty claim open since 2022 through an 8D that traced the leak path to a deburring step, ending ₹62 lakh of annual debit notes.',
          'Carried the plant through IATF 16949 recertification with two minor findings and no majors, against eleven findings at the previous audit.',
          'Cut cost of poor quality from 2.1% to 0.9% of sales by putting containment spend on the daily plant review board.',
        ],
      },
      {
        id: 'w2',
        name: 'Riyansh Precision Castings',
        position: 'Quality Engineer',
        location: 'Hosur, Tamil Nadu',
        url: '',
        startDate: '2021-04',
        endDate: '2023-06',
        summary: '',
        highlights: [
          'Rebuilt the incoming inspection plan around risk-ranked characteristics, cutting inspection hours 38% while catching three defect modes that had previously reached assembly.',
          'Ran 23 supplier audits across nine foundries and lifted on-time PPAP submission from 54% to 91%.',
          'Introduced Gage R&R across 40 instruments; nine measured above 30% variation and were replaced or recalibrated.',
        ],
      },
      {
        id: 'w3',
        name: 'Thendral Metalworks',
        position: 'Production Engineer',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2019-07',
        endDate: '2021-03',
        summary: '',
        highlights: [
          'Supervised a 34-operator machining shift and raised schedule adherence from 78% to 94%.',
          'Cut setup rejections on a CNC turning cell 62% by introducing first-article checks at every shift change.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'PSG College of Technology, Anna University',
        area: 'Mechanical Engineering',
        studyType: 'B.E.',
        location: 'Coimbatore, Tamil Nadu',
        startDate: '2015-08',
        endDate: '2019-05',
        score: '78.4%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Quality systems',
        level: '',
        keywords: ['IATF 16949', 'ISO 9001', 'APQP', 'PPAP', 'PFMEA', 'Control plans', 'MSA'],
      },
      {
        id: 's2',
        name: 'Problem solving',
        level: '',
        keywords: ['8D', 'Why-why analysis', 'Fishbone', 'Poka-yoke', 'Layered process audits'],
      },
      {
        id: 's3',
        name: 'Measurement',
        level: '',
        keywords: ['CMM programming', 'Gage R&R', 'SPC', 'Minitab', 'Surface roughness testing', 'Leak testing'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Quality Circle Convention — Gold',
        date: '2024',
        awarder: 'Quality Circle Forum of India',
        summary: 'Team award for the deburring-process 8D, judged against 60 entries at the regional round.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified Quality Engineer (CQE)',
        date: '2023',
        issuer: 'American Society for Quality',
        url: '',
      },
      { id: 'c2', name: 'IATF 16949:2016 Internal Auditor', date: '2022', issuer: 'TÜV SÜD', url: '' },
      { id: 'c3', name: 'ISO 9001:2015 Lead Auditor', date: '2024', issuer: 'IRCA', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
