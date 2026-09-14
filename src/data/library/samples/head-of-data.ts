import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Lead, India, and the longest page in this set. A leadership resume has to
 * carry two kinds of number: what the business got, and what changed for the
 * people doing the work. Both are here, and neither is a headcount alone.
 * Carries employer monograms on every work entry.
 */
export const sample: LibrarySample = {
  slug: 'head-of-data',
  role: 'Head of Data',
  category: 'data',
  seniority: 'lead',
  region: 'india',
  template: 'console',
  blurb:
    "A data leader's two pages: team size, platform cost, margin points, and what changed for the people doing the work.",
  keywords: [
    'head of data',
    'director of data',
    'data leadership',
    'data platform',
    'analytics leader',
    'data strategy',
    'India',
  ],
  content: content({
    basics: {
      name: 'Meera Raghavan',
      label: 'Head of Data',
      image: '',
      email: 'meera.raghavan@example.com',
      phone: '+91 12345 88604',
      url: 'https://meeraraghavan.example.com',
      summary:
        'Data leader with fourteen years, now running a 34-person data organisation across platform, analytics and science at an e-commerce group. Cut platform cost 41% in a year when daily event volume doubled, and shipped the pricing model that added 1.9 points of gross margin on 70,000 products.',
      location: { city: 'Hyderabad', region: 'Telangana', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'meeraraghavan', url: 'https://linkedin.com/in/meeraraghavan' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Harbourline Commerce',
        logo: monogram('H', '#1d4ed8'),
        position: 'Head of Data',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2022-08',
        endDate: '',
        summary: 'Data organisation of 34 across platform, analytics and data science, reporting to the CTO.',
        highlights: [
          'Leads 34 people across three functions supporting 900 employees and a business of ₹4,200 crore in annual merchandise value.',
          'Cut platform cost 41%, about ₹6.8 crore a year, in a year when daily event volume doubled, by moving from always-on clusters to usage-billed compute.',
          'Replaced 300 hand-built dashboards with 40 governed data products and a self-serve metric layer; weekly report users rose from 180 to 610.',
          'Shipped the pricing-elasticity model that now sets markdowns on 70,000 products, lifting gross margin 1.9 points in its first full year.',
          'Built the levelling and review framework the team runs on; regretted attrition fell from 26% to 9% over two years.',
        ],
      },
      {
        id: 'w2',
        name: 'Turnstone Mobility',
        logo: monogram('T', '#0f766e'),
        position: 'Head of Data Engineering',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2019-04',
        endDate: '2022-07',
        summary: '',
        highlights: [
          'Grew data engineering from four people to seventeen and delivered the platform behind a fleet product tracking 120,000 vehicles.',
          'Moved the company off a nightly warehouse onto streaming ingestion, taking dashboard freshness from 18 hours to under five minutes.',
          'Consolidated three regional warehouses into one, retiring ₹2.3 crore of duplicate tooling and ending a standing argument over which revenue number was correct.',
          'Introduced an on-call rota and incident reviews for data; pipeline incidents lasting over an hour fell from nine a quarter to one.',
        ],
      },
      {
        id: 'w3',
        name: 'Marigold Insight',
        logo: monogram('M', '#b45309'),
        position: 'Analytics Manager',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2016-01',
        endDate: '2019-03',
        summary: '',
        highlights: [
          'Ran a nine-person analytics team across three media clients; renewal rates rose from 60% to 100% over two contract cycles.',
          'Built the measurement framework for a ₹90 crore annual advertising budget, reallocating 14% of spend after a geo-holdout test.',
          'Hired and trained six analysts, four of whom now lead teams of their own.',
        ],
      },
      {
        id: 'w4',
        name: 'Pinewick Systems',
        logo: monogram('P', '#9333ea'),
        position: 'Data Analyst, then Senior Data Analyst',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2012-07',
        endDate: '2015-12',
        summary: '',
        highlights: [
          'Automated the monthly regulatory reporting pack, cutting five analyst-days a month to half a day.',
          'Built the first companywide sales dashboard, replacing 22 spreadsheets that branch managers had been emailing in.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Anna University',
        area: 'Electronics and Communication Engineering',
        studyType: 'B.Tech.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2008-07',
        endDate: '2012-05',
        score: '8.2 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Leadership',
        level: '',
        keywords: ['Org design', 'Hiring and levelling', 'Roadmap and budget', 'Vendor negotiation', 'Coaching'],
      },
      {
        id: 's2',
        name: 'Platform',
        level: '',
        keywords: ['Lakehouse architecture', 'Streaming ingestion', 'Cost governance', 'Data contracts', 'Airflow'],
      },
      {
        id: 's3',
        name: 'Analytics and science',
        level: '',
        keywords: ['Metric layers', 'Pricing models', 'Experimentation', 'Forecasting', 'Power BI'],
      },
      {
        id: 's4',
        name: 'Governance',
        level: '',
        keywords: ['DPDP Act readiness', 'Access review', 'Incident review', 'Board reporting'],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Harbourline Founders Award',
        date: '2024',
        awarder: 'Harbourline Commerce',
        summary: 'For the platform migration that cut data cost 41% in a year of doubled volume.',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Telugu', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Tamil', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
