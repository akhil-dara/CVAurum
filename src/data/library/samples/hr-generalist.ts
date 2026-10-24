import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A returner. The sixteen-month family care break is stated in the summary and
 * covered by a dated volunteer entry, so the reader never has to do the
 * arithmetic and never wonders. The work either side is measured the same way.
 */
export const sample: LibrarySample = {
  slug: 'hr-generalist',
  role: 'HR Generalist',
  category: 'operations',
  seniority: 'mid',
  region: 'us',
  template: 'aside',
  blurb:
    'Seven years of generalist HR either side of a family care break, measured in turnover, cases closed and audits passed.',
  keywords: [
    'HR generalist',
    'human resources',
    'employee relations',
    'turnover reduction',
    'SHRM-CP',
    'benefits administration',
    'return to work after career break',
  ],
  guide: {
    why: [
      'Turnover is the headline: voluntary turnover from 29% to 17% at Sandera Health Partners, with the method, a 30-60-90 onboarding plan and stay interviews at month four.',
      'The sixteen-month family care break is stated in the summary, and the volunteer role during it, training 24 volunteers on a helpline, shows skills kept in use.',
      'Employee relations is counted rather than described: 34 cases closed at an average 11-day cycle time, none advancing past agency intake.',
      'Compliance results such as OSHA recordable incidents from 14 a year to five and a third-party audit sample of 120 files cleared in full show the risk side of generalist work.',
    ],
    faq: [
      {
        q: 'What should an HR generalist resume include?',
        a: 'Results across the HR lifecycle: hiring and retention, employee relations cases, benefits and payroll accuracy, and compliance. Add SHRM-CP or PHR in a certifications section and name the HRIS you used.',
      },
      {
        q: 'How do you show a career break on an HR resume?',
        a: 'Name it once with dates, in the summary or as a short entry, and add any volunteer or study work from that time. Then let the role that followed show results since your return.',
      },
      {
        q: 'Is SHRM-CP or PHR better on an HR generalist resume?',
        a: 'Either is recognised by US employers, and listing both is fine if you hold both. Check the job ad, as some name one in particular.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Renata Silva',
      label: 'HR Generalist',
      image: '',
      email: 'renata.silva@example.com',
      phone: '+1 (555) 0193',
      url: '',
      summary:
        'HR generalist with seven years across manufacturing and clinical services, running a 480-person employer from onboarding through investigations single-handed. Returned from a sixteen-month family care break in 2022 and has cut voluntary turnover from 29% to 17% since.',
      location: { city: 'Phoenix', region: 'AZ', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'renatasilvahr', url: 'https://linkedin.com/in/renatasilvahr' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Sandera Health Partners',
        logo: brandmark('Sandera Health Partners'),
        position: 'HR Generalist',
        location: 'Phoenix, AZ',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary: 'Sole HR generalist for a 480-person clinical services employer across six sites.',
        highlights: [
          'Cut voluntary turnover from 29% to 17% over two years by rebuilding onboarding into a 30-60-90 plan and adding stay interviews at month four.',
          'Closed 34 employee relations cases at an average 11-day cycle time, with no matter advancing beyond an agency intake.',
          'Rewrote 22 job descriptions and the pay bands behind them, ending a $4,800 average gap between new hires and tenured staff in the same role.',
          'Runs open enrollment for 480 employees; election errors fell from 61 to seven after the move to one portal with a guided checklist.',
        ],
      },
      {
        id: 'w2',
        name: 'Ironvale Manufacturing',
        logo: brandmark('Ironvale Manufacturing'),
        position: 'HR Generalist',
        location: 'Tempe, AZ',
        url: '',
        startDate: '2018-05',
        endDate: '2021-03',
        summary: '',
        highlights: [
          'Staffed a second-shift launch, filling 64 production roles in eleven weeks with 92% still employed at 90 days.',
          'Brought OSHA recordable incidents from 14 a year to five by pairing a structured return-to-work program with monthly supervisor briefings.',
          'Replaced paper time cards with a badge clock, removing 11 hours of weekly payroll correction and $37k of annual overpayment.',
        ],
      },
      {
        id: 'w3',
        name: 'Pennant Logistics',
        logo: brandmark('Pennant Logistics'),
        position: 'HR Assistant',
        location: 'Mesa, AZ',
        url: '',
        startDate: '2016-08',
        endDate: '2018-04',
        summary: '',
        highlights: [
          'Processed payroll for 210 hourly employees at a 0.3% error rate across 20 months.',
          'Built the I-9 audit process that cleared every record in a third-party sample of 120 files.',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Maricopa Family Resource Network',
        position: 'Volunteer Intake Coordinator',
        url: '',
        startDate: '2021-07',
        endDate: '2022-08',
        summary: 'Held during a family care break.',
        highlights: [
          'Scheduled and trained 24 volunteers on a caregiver helpline that answered 3,100 calls in a year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Arizona State University',
        area: 'Human Resources Management',
        studyType: 'B.S.',
        location: 'Tempe, AZ',
        startDate: '2012-08',
        endDate: '2016-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'HR operations',
        level: '',
        keywords: [
          'Onboarding',
          'Benefits administration',
          'Open enrollment',
          'Payroll coordination',
          'HRIS data hygiene',
        ],
      },
      {
        id: 's2',
        name: 'Employee relations',
        level: '',
        keywords: [
          'Workplace investigations',
          'Performance management',
          'Policy writing',
          'Leave administration',
          'Exit and stay interviews',
        ],
      },
      {
        id: 's3',
        name: 'Compliance',
        level: '',
        keywords: ['FLSA classification', 'FMLA and ADA', 'I-9 and E-Verify', 'OSHA recordkeeping', 'EEO-1 reporting'],
      },
      {
        id: 's4',
        name: 'Systems',
        level: '',
        keywords: ['Workday', 'ADP Workforce Now', 'Greenhouse', 'Excel'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'SHRM Certified Professional (SHRM-CP)', date: '2019', issuer: 'SHRM', url: '' },
      { id: 'c2', name: 'Professional in Human Resources (PHR)', date: '2023', issuer: 'HRCI', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Portuguese', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
