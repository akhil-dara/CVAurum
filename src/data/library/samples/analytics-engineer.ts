import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Mid level, US. The analytics-engineering career as it usually happens:
 * marketing reporting first, then product analytics, then owning the models
 * everyone else queries. One of the three samples in this set that carries
 * employer monograms, and it carries one on every entry.
 */
export const sample: LibrarySample = {
  slug: 'analytics-engineer',
  role: 'Analytics Engineer',
  category: 'data',
  seniority: 'mid',
  region: 'us',
  template: 'margin',
  blurb:
    'Modern analytics stack work told in outcomes: 480 tested models, 38% less warehouse spend, one agreed definition of on-time.',
  keywords: ['analytics engineer', 'dbt', 'Snowflake', 'data modeling', 'semantic layer', 'SQL', 'data warehouse'],
  content: content({
    basics: {
      name: 'Ruben Ortega',
      label: 'Analytics Engineer',
      image: '',
      email: 'ruben.ortega@example.com',
      phone: '+1 (555) 0126',
      url: 'https://rubenortega.example.com',
      summary:
        'Analytics engineer with seven years turning operational data into models other teams trust without checking. Runs the 480-model dbt project behind shipment, billing and customer reporting at a logistics company, and cut warehouse spend 38% in the same year daily volume grew by half.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'rortega', url: 'https://github.com/rortega' },
        { network: 'LinkedIn', username: 'rubenortega', url: 'https://linkedin.com/in/rubenortega' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Fernwood Logistics',
        logo: monogram('F', '#15803d'),
        position: 'Analytics Engineer',
        location: 'Chicago, IL',
        url: '',
        startDate: '2023-04',
        endDate: '',
        summary: 'Data team of seven. Owns the warehouse models behind shipment, billing and customer reporting.',
        highlights: [
          'Owns a dbt project of 480 models and 1,900 tests covering shipments, invoices and accounts; a full refresh runs in 22 minutes.',
          'Cut warehouse spend 38%, about $214,000 a year, by re-clustering the four largest fact tables and moving 60 dashboards off raw event scans.',
          'Introduced source contract tests, taking silent schema breaks from roughly two a month to none across the last three quarters.',
          'Wrote the semantic layer that gave finance and operations one definition of on-time delivery, retiring nine conflicting spreadsheets.',
          'Runs the weekly model review; time to add a governed metric fell from two days to two hours.',
        ],
      },
      {
        id: 'w2',
        name: 'Cobalt Meadow Software',
        logo: monogram('C', '#0f766e'),
        position: 'Data Analyst',
        location: 'Chicago, IL',
        url: '',
        startDate: '2021-01',
        endDate: '2023-03',
        summary: '',
        highlights: [
          'Modeled the subscription funnel end to end and showed that 31% of trials never reached the first integration step, which drove an onboarding rewrite.',
          'Replaced 60 hand-maintained SQL views with a tested dbt project, ending a standing Monday ritual of patching broken reports.',
          'Built the churn scorecard customer success still works from; accounts in its top decile churned at six times the base rate.',
        ],
      },
      {
        id: 'w3',
        name: 'Larkspur Media',
        logo: monogram('L', '#b45309'),
        position: 'Marketing Analyst',
        location: 'Chicago, IL',
        url: '',
        startDate: '2019-07',
        endDate: '2020-12',
        summary: '',
        highlights: [
          'Automated weekly campaign reporting across six channels, returning about 15 hours a month to the media team.',
          'Moved attribution from last click to a position-based model, reallocating $180,000 of quarterly spend toward two undercredited channels.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Illinois Urbana-Champaign',
        area: 'Industrial Engineering',
        studyType: 'B.S.',
        location: 'Urbana, IL',
        startDate: '2015-08',
        endDate: '2019-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Modeling',
        level: '',
        keywords: ['dbt', 'Dimensional modeling', 'Semantic layers', 'Data contracts', 'SQL'],
      },
      {
        id: 's2',
        name: 'Platform',
        level: '',
        keywords: ['Snowflake', 'BigQuery', 'Airflow', 'Fivetran', 'Terraform', 'Git'],
      },
      { id: 's3', name: 'Analysis', level: '', keywords: ['Python', 'Looker', 'Tableau', 'Experiment design'] },
      {
        id: 's4',
        name: 'Practice',
        level: '',
        keywords: ['Code review', 'Metric governance', 'Cost tuning', 'Documentation'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'dbt Analytics Engineering Certification', date: '2024', issuer: 'dbt Labs', url: '' },
      { id: 'c2', name: 'SnowPro Core Certification', date: '2023', issuer: 'Snowflake', url: '' },
    ],
  }),
}

export default sample
