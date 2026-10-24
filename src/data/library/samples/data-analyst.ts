import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Entry level, India. The shape a first analytics job takes: one internship,
 * one real role, and a side dashboard that people outside the company use.
 * Every dashboard on the page is followed by what changed once it existed.
 */
export const sample: LibrarySample = {
  slug: 'data-analyst',
  role: 'Data Analyst',
  category: 'data',
  seniority: 'entry',
  region: 'india',
  template: 'minimal',
  blurb:
    'A first analytics job in Indian e-commerce, written so every dashboard on it carries what changed once it existed.',
  keywords: [
    'data analyst',
    'entry level data analyst',
    'SQL',
    'Power BI',
    'e-commerce analytics',
    'fresher data analyst',
  ],
  guide: {
    why: [
      'Every dashboard is followed by what changed once it existed: the Power BI category report replaced 90 minutes of spreadsheet work with a four-minute refresh that 40 category managers read.',
      'The strongest bullet is an investigation, not a report: a 9% fall in repeat orders traced to a coupon rule, with about ₹1.4 crore of annual revenue restored. That is the analysis hiring managers want from a junior analyst.',
      'Technical care shows too: query cost on the three heaviest dashboards cut 62% by partitioning the orders table, which sets this résumé apart from report-builders.',
      'Mandi Watch, a public dashboard for 14 crops across 60 Maharashtra markets with about 3,100 monthly visitors, gives a fresher-level candidate work anyone can open.',
    ],
    faq: [
      { q: 'What should a fresher data analyst resume include in India?', a: 'SQL, Excel and one BI tool shown in use, your degree with CGPA, an internship with figures, and one or two projects with a link. Recruiters in India often screen on CGPA and certifications such as PL-300, so list them clearly.' },
      { q: 'Should a data analyst resume include a portfolio project?', a: 'Yes, especially in the first two years. Choose one that uses real data and has users or a finding, give its scale and tools, and link it. One strong live project is worth more than several course exercises.' },
    ],
  },
  content: content({
    basics: {
      name: 'Ananya Deshmukh',
      label: 'Data Analyst',
      image: '',
      email: 'ananya.deshmukh@example.com',
      phone: '+91 12345 60118',
      url: 'https://ananyadeshmukh.example.com',
      summary:
        'Data analyst two years into retail e-commerce, working in SQL, Python and Power BI. Traced a 9% fall in repeat orders to a broken coupon rule and restored about ₹1.4 crore of annual revenue, and rebuilt the weekly category report the merchandising team now plans against.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'ananyadeshmukh', url: 'https://linkedin.com/in/ananyadeshmukh' },
        { network: 'GitHub', username: 'ananyad', url: 'https://github.com/ananyad' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Gulmohar Commerce',
        position: 'Data Analyst',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-07',
        endDate: '',
        summary: 'Category analytics for a marketplace of 2.3 million customers across 11 categories.',
        highlights: [
          'Rebuilt the weekly category report in Power BI, replacing 90 minutes of manual spreadsheet assembly with a four-minute refresh that 40 category managers now read.',
          'Traced a 9% fall in repeat orders to a coupon rule that silently excluded first-time buyers; the fix restored about ₹1.4 crore of annual repeat revenue.',
          'Built the cohort retention model the merchandising team plans promotions against, covering 2.3 million customers and three years of order history.',
          'Cut query cost on the three heaviest dashboards by 62% by partitioning the orders table on order date and dropping four unused joins.',
        ],
      },
      {
        id: 'w2',
        name: 'Lumenfield Analytics',
        position: 'Data Analyst Intern',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-01',
        endDate: '2024-06',
        summary: '',
        highlights: [
          'Automated the daily stock-out check in Python, replacing a 45-minute manual routine and surfacing 210 stock-outs in the first month.',
          'Standardised five years of supplier records ahead of a warehouse migration, removing 18,000 duplicate rows and 340 mismatched tax codes.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Fergusson College, Savitribai Phule Pune University',
        area: 'Statistics',
        studyType: 'B.Sc.',
        location: 'Pune, Maharashtra',
        startDate: '2021-06',
        endDate: '2024-05',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        courses: ['Statistical Inference', 'Regression Analysis', 'Sampling Theory', 'Operations Research'],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Mandi Watch',
        description: 'A public dashboard tracking daily wholesale prices for 14 crops across 60 Maharashtra markets.',
        url: 'https://mandiwatch.example.com',
        startDate: '2023-08',
        endDate: '',
        highlights: [
          'Reads the state agriculture board open price feed nightly; about 3,100 monthly visitors, mostly farmer producer groups.',
        ],
        keywords: ['Python', 'Streamlit', 'SQLite'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: ['SQL', 'Python', 'pandas', 'Cohort analysis', 'A/B testing'],
      },
      { id: 's2', name: 'Reporting', level: '', keywords: ['Power BI', 'DAX', 'Excel', 'Looker Studio'] },
      {
        id: 's3',
        name: 'Data',
        level: '',
        keywords: ['PostgreSQL', 'BigQuery', 'dbt', 'Data modelling', 'Data cleaning'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Microsoft Certified: Power BI Data Analyst Associate (PL-300)',
        date: '2025',
        issuer: 'Microsoft',
        url: '',
      },
      { id: 'c2', name: 'Databricks Certified Data Analyst Associate', date: '2026', issuer: 'Databricks', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
