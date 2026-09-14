import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A graduate with no paid job to list. There is no work section at all, and
 * the page does not pretend otherwise: the capstone, the student-run fund and
 * a tax-clinic season carry it, each with a number a recruiter can ask about.
 */
export const sample: LibrarySample = {
  slug: 'new-graduate-business-analyst',
  role: 'Entry-Level Business Analyst',
  category: 'student',
  seniority: 'entry',
  region: 'us',
  template: 'minimal',
  blurb:
    'A 2026 economics graduate with no paid work history, carried by a capstone, a student-run fund and a tax clinic.',
  keywords: [
    'new graduate resume',
    'no work experience resume',
    'entry level business analyst',
    'economics graduate',
    'first job after college',
    'recent college graduate',
  ],
  content: content({
    basics: {
      name: 'Nadia Herrera',
      label: 'Economics Graduate',
      image: '',
      email: 'nadia.herrera@example.com',
      phone: '+1 (555) 0173',
      url: '',
      summary:
        'Economics graduate with a data science certificate, looking for a first analyst role. Built the county rent-burden index a Madison housing committee cited in its 2026 affordability brief, and spent two years running research for a student-managed $140,000 equity fund.',
      location: { city: 'Madison', region: 'WI', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'nadiaherrera', url: 'https://linkedin.com/in/nadiaherrera' },
        { network: 'GitHub', username: 'nherrera', url: 'https://github.com/nherrera' },
      ],
    },
    education: [
      {
        id: 'e1',
        institution: 'University of Wisconsin-Madison',
        area: 'Economics, with a certificate in Data Science',
        studyType: 'B.A.',
        location: 'Madison, WI',
        startDate: '2022-08',
        endDate: '2026-05',
        score: '3.74 GPA',
        url: '',
        summary: 'Half of tuition covered by a merit scholarship held all four years.',
        status: 'completed',
        level: 'degree',
        courses: [
          'Econometrics',
          'Applied Regression Analysis',
          'Industrial Organization',
          'Financial Markets',
          'Database Management',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Wisconsin Rent Burden Index',
        description: 'Senior capstone: a county-level measure of how much of a household income goes to rent.',
        url: 'https://github.com/nherrera/rent-burden',
        startDate: '2025-09',
        endDate: '2026-04',
        highlights: [
          'Merged nine years of Census and county assessor records across 72 counties, reconciling three incompatible parcel-ID schemes by hand.',
          'Presented the findings to a city housing committee, which cited the index in its 2026 affordability brief.',
        ],
        keywords: ['Python', 'pandas', 'SQL', 'Tableau'],
      },
      {
        id: 'p2',
        name: 'Asymmetric price pass-through in dairy',
        description: 'Econometrics term paper on how fast wholesale milk prices reach the shelf.',
        url: '',
        startDate: '2025-02',
        endDate: '2025-05',
        highlights: [
          'Estimated a six-week lag on price increases against eleven weeks on decreases, across 18 months of scanner data for 340 stores.',
        ],
        keywords: ['R', 'Panel data', 'Fixed effects'],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Lakeshore Investment Society',
        position: 'Research Director',
        url: '',
        startDate: '2024-09',
        endDate: '2026-05',
        summary: 'Student-managed equity fund of $140,000, 34 members.',
        highlights: [
          'Led an eight-person research team; the fund returned 11.4% over two years against a 9.1% benchmark.',
          'Rewrote the pitch template around a mandatory written downside case, after four of the prior year eleven picks were bought on upside alone.',
          'Ran a six-week valuation workshop that took 40 first-years from no modeling experience to a complete three-statement model.',
        ],
      },
      {
        id: 'v2',
        organization: 'Volunteer Income Tax Assistance (VITA)',
        position: 'IRS-Certified Volunteer Preparer',
        url: '',
        startDate: '2025-01',
        endDate: '2025-04',
        summary: '',
        highlights: [
          'Prepared 96 returns for households under $60,000 in income across one filing season, none of which were rejected on quality review.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: [
          'Econometrics',
          'Regression modeling',
          'Cost-benefit analysis',
          'Survey design',
          'Financial modeling',
        ],
      },
      { id: 's2', name: 'Tools', level: '', keywords: ['Python', 'R', 'SQL', 'Excel', 'Tableau', 'Git'] },
      {
        id: 's3',
        name: 'Communication',
        level: '',
        keywords: ['Written briefs', 'Committee presentations', 'Workshop facilitation', 'Stakeholder interviews'],
      },
    ],
    certificates: [{ id: 'c1', name: 'Google Data Analytics Certificate', date: '2025', issuer: 'Google', url: '' }],
    awards: [
      {
        id: 'a1',
        title: "Dean's List",
        date: '2026',
        awarder: 'University of Wisconsin-Madison',
        summary: 'Six semesters of eight.',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Professional', rating: 4 },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'projects', 'volunteer', 'skills', 'certificates', 'awards', 'languages']
    m.layout.headings = { ...m.layout.headings, volunteer: 'Leadership and Volunteering' }
    m.layout.sectionSettings = {
      ...m.layout.sectionSettings,
      projects: { ...(m.layout.sectionSettings?.projects ?? {}), showKeywords: true },
    }
  },
}

export default sample
