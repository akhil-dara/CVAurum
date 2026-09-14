import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, India, and the sample in this set with a contract role in it.
 * A fixed-term engagement is written the same way a permanent job is: what
 * was delivered, alone or not, and what the client still runs afterwards.
 */
export const sample: LibrarySample = {
  slug: 'data-engineer',
  role: 'Data Engineer',
  category: 'data',
  seniority: 'mid',
  region: 'india',
  template: 'technical',
  blurb:
    'Six years of pipeline work in Indian fintech, including a contract stint, measured in freshness, cost and failed runs.',
  keywords: ['data engineer', 'Spark', 'Kafka', 'Airflow', 'data pipeline', 'fintech data', 'Databricks'],
  content: content({
    basics: {
      name: 'Rohit Nambiar',
      label: 'Data Engineer',
      image: '',
      email: 'rohit.nambiar@example.com',
      phone: '+91 12345 70942',
      url: '',
      summary:
        'Data engineer with six years on high-volume financial and marketplace pipelines. Runs the ingestion layer behind 2.1 billion daily transaction events, and rebuilt a ledger reconciliation that took 14 hours into a stream that settles in nine minutes.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [
        { network: 'GitHub', username: 'rnambiar', url: 'https://github.com/rnambiar' },
        { network: 'LinkedIn', username: 'rohitnambiar', url: 'https://linkedin.com/in/rohitnambiar' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Arclane Financial Technologies',
        position: 'Data Engineer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2023-02',
        endDate: '',
        summary:
          'Platform team of eleven. Owns ingestion, the lakehouse and the data-quality gate in front of reporting.',
        highlights: [
          'Owns the ingestion layer landing 2.1 billion transaction events a day; p95 freshness stayed under seven minutes through a threefold rise in volume.',
          'Replaced a nightly bulk dump with change-data capture, cutting the ledger reconciliation window from 14 hours to nine minutes.',
          'Cut cluster spend ₹48 lakh a year by moving 70 Spark jobs to autoscaling clusters and rewriting the three that shuffled 4 TB needlessly.',
          'Built the quality gate that blocks a bad partition before reporting sees it; it has caught 61 upstream schema changes in 18 months.',
        ],
      },
      {
        id: 'w2',
        name: 'Orenda Marketplace',
        position: 'Data Engineer (contract)',
        location: 'Remote',
        url: '',
        startDate: '2022-04',
        endDate: '2023-01',
        summary: 'Ten-month fixed-term contract to stand up a first data warehouse.',
        highlights: [
          'Delivered the first warehouse covering orders, payouts and sellers in nine months as the only data engineer on a four-person team.',
          'Wrote the orchestration framework the client still runs: 180 pipelines generated from YAML, with backfills that cost one command instead of a day.',
        ],
      },
      {
        id: 'w3',
        name: 'Auralite Analytics',
        position: 'Associate Data Engineer',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2020-07',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Built the nightly ETL for a media measurement product, processing 400 GB of viewership logs inside a 90-minute window.',
          'Took the nightly pipeline from one failed run in five to one in forty by making writes idempotent and retries safe to repeat.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'National Institute of Technology Karnataka, Surathkal',
        area: 'Computer Science and Engineering',
        studyType: 'B.Tech.',
        location: 'Mangaluru, Karnataka',
        startDate: '2016-07',
        endDate: '2020-05',
        score: '8.7 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Python', 'Scala', 'SQL', 'Bash'] },
      {
        id: 's2',
        name: 'Platform',
        level: '',
        keywords: ['Spark', 'Kafka', 'Databricks', 'Airflow', 'AWS', 'Delta Lake'],
      },
      {
        id: 's3',
        name: 'Pipelines',
        level: '',
        keywords: ['Change data capture', 'Debezium', 'dbt', 'Data quality gates', 'Backfills'],
      },
      { id: 's4', name: 'Practice', level: '', keywords: ['Cost tuning', 'Schema evolution', 'On-call', 'Runbooks'] },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'AWS Certified Data Engineer – Associate',
        date: '2025',
        issuer: 'Amazon Web Services',
        url: '',
      },
      {
        id: 'c2',
        name: 'Databricks Certified Data Engineer Professional',
        date: '2024',
        issuer: 'Databricks',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Malayalam', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 3 },
    ],
  }),
}

export default sample
