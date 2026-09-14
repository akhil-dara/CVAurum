import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Entry level, India. The shape a good two-year analyst résumé takes: a short
 * history carried by what the analysis changed, a final-year project that is
 * allowed to count, and a statistics degree doing the work a long skills list
 * would otherwise be asked to do.
 */
export const sample: LibrarySample = {
  slug: 'business-analyst',
  role: 'Business Analyst',
  category: 'business',
  seniority: 'entry',
  region: 'india',
  template: 'crest',
  blurb:
    'Two years in lending analytics, with every bullet tied to a number that moved: recoveries, defects, hours saved.',
  keywords: [
    'business analyst',
    'entry level business analyst',
    'fintech analyst',
    'requirements gathering',
    'SQL and Power BI',
    'collections analytics',
  ],
  content: content({
    basics: {
      name: 'Ananya Deshpande',
      label: 'Business Analyst',
      image: '',
      email: 'ananya.deshpande@example.com',
      phone: '+91 12345 60418',
      url: 'https://ananyadeshpande.example.com',
      summary:
        'Business analyst two years into consumer lending, sitting between branch collections teams and the engineers who build their tools. Replaced a six-hour manual delinquency pack with a dashboard that puts the same numbers in front of 40 branch managers before 8 a.m.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'ananyadeshpande', url: 'https://linkedin.com/in/ananyadeshpande' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Sanchay Credit',
        position: 'Business Analyst',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-07',
        endDate: '',
        summary:
          'Collections technology group. Works between 40 branch operations teams and a six-engineer platform squad.',
        highlights: [
          'Replaced a six-hour manual delinquency pack with a SQL-backed dashboard, giving 40 branch managers their bucket-wise numbers by 8 a.m. instead of mid-afternoon.',
          'Analysed 180,000 repayment records to show that reminder calls placed before 11 a.m. recovered 23% more than evening calls, which redrew the calling roster across every branch.',
          'Wrote 34 requirements for a field-collections mobile app and ran the UAT that caught 19 defects before launch; four surfaced after release.',
          'Maintains the requirement traceability matrix for the group, taking scope disputes at sign-off from a weekly argument to two in six months.',
        ],
      },
      {
        id: 'w2',
        name: 'Tarangi Retail',
        position: 'Associate Analyst, Merchandising',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2023-06',
        endDate: '2024-06',
        summary: '',
        highlights: [
          'Built the weekly stock-cover report for 62 stores, replacing three regional spreadsheets that had each counted cover differently.',
          'Traced ₹18 lakh of annual markdown loss to two slow-moving categories; the reorder rule written in response cut it by 61% in two quarters.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Fergusson College, Pune',
        area: 'Statistics',
        studyType: 'B.Sc.',
        location: 'Pune, Maharashtra',
        startDate: '2020-06',
        endDate: '2023-04',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        courses: ['Regression Analysis', 'Sampling Theory', 'Operations Research', 'Database Systems'],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Repayment Propensity Model',
        description:
          'A final-year logistic model over 40,000 anonymised loan records, scoring accounts into five risk bands.',
        url: '',
        startDate: '2022-09',
        endDate: '2023-03',
        highlights: [
          'The top band captured 68% of eventual defaults; placed second of 46 projects at the college industry review.',
        ],
        keywords: ['Python', 'scikit-learn', 'SQL'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: ['SQL', 'Power BI', 'Excel modelling', 'Python (pandas)', 'Cohort analysis'],
      },
      {
        id: 's2',
        name: 'Business',
        level: '',
        keywords: ['Requirements gathering', 'Process mapping', 'UAT planning', 'Stakeholder workshops', 'BRD writing'],
      },
      {
        id: 's3',
        name: 'Domain',
        level: '',
        keywords: ['Consumer lending', 'Collections', 'Retail merchandising', 'Credit bureau data'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Microsoft Certified: Power BI Data Analyst Associate',
        date: '2024',
        issuer: 'Microsoft',
        url: '',
      },
      { id: 'c2', name: 'Tableau Desktop Specialist', date: '2023', issuer: 'Tableau', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
