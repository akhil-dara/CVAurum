import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, US, and a route into data that starts in IT support. A DBA is
 * judged on uptime, recovery time and how long the nightly batch runs, so
 * those are the numbers the page leads with rather than a list of versions.
 */
export const sample: LibrarySample = {
  slug: 'database-administrator',
  role: 'Database Administrator',
  category: 'data',
  seniority: 'mid',
  region: 'us',
  template: 'console',
  blurb:
    'A database administrator sample that leads with uptime, recovery time and batch windows rather than a list of versions.',
  keywords: [
    'database administrator',
    'DBA',
    'SQL Server',
    'PostgreSQL',
    'high availability',
    'query tuning',
    'disaster recovery',
  ],
  content: content({
    basics: {
      name: 'Dionne Baptiste',
      label: 'Database Administrator',
      image: '',
      email: 'dionne.baptiste@example.com',
      phone: '+1 (555) 0189',
      url: '',
      summary:
        'Database administrator with eight years keeping transactional systems fast and recoverable, now across 60 instances at an insurer. Cut a nightly claims batch from nearly six hours to under one, and rebuilt disaster recovery around a 15-minute recovery point that is tested every quarter.',
      location: { city: 'Atlanta', region: 'GA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'dionnebaptiste', url: 'https://linkedin.com/in/dionnebaptiste' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Stonecreek Mutual Insurance',
        position: 'Database Administrator',
        location: 'Atlanta, GA',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary: 'Runs 60 SQL Server and PostgreSQL instances behind claims, policy and billing.',
        highlights: [
          'Holds 99.98% availability across two years and 60 production instances, with no unplanned data loss and no failed quarterly restore test.',
          'Cut the nightly claims batch from 5 hours 40 minutes to 51 minutes by rewriting four cursor-driven procedures as set-based operations and re-indexing the claim-line table.',
          'Rebuilt disaster recovery around log shipping with a tested 15-minute recovery point; the failover drill now takes 22 minutes and is run by the on-call rota.',
          'Replaced shared service accounts with per-application credentials and row-level security, closing all 14 database findings from the 2023 audit.',
        ],
      },
      {
        id: 'w2',
        name: 'Crestwater Software',
        position: 'Database Administrator',
        location: 'Atlanta, GA',
        url: '',
        startDate: '2020-01',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Led an eight-month migration of a 4 TB Oracle estate to PostgreSQL, cutting licensing by $260,000 a year with 40 minutes of customer downtime.',
          'Introduced automated restore testing; its first run found three of eleven nightly backups had been failing silently for five weeks.',
          'Tuned the 20 slowest product queries, taking the reporting page from a 14-second median to 900 milliseconds.',
        ],
      },
      {
        id: 'w3',
        name: 'Calloway Technical Services',
        position: 'Systems Administrator',
        location: 'Marietta, GA',
        url: '',
        startDate: '2018-06',
        endDate: '2019-12',
        summary: '',
        highlights: [
          'Supported 400 users and 90 servers, cutting the ticket backlog from 230 to under 30 by scripting the 12 most common requests.',
          'Moved patching from a manual weekend routine to a scheduled pipeline, taking average time to patch from 38 days to six.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Georgia State University',
        area: 'Computer Information Systems',
        studyType: 'B.S.',
        location: 'Atlanta, GA',
        startDate: '2014-08',
        endDate: '2018-05',
        score: '3.3 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Databases',
        level: '',
        keywords: ['SQL Server', 'PostgreSQL', 'Oracle', 'Availability groups', 'Replication'],
      },
      {
        id: 's2',
        name: 'Performance',
        level: '',
        keywords: ['Execution plans', 'Indexing', 'Partitioning', 'Query rewriting', 'Wait statistics'],
      },
      {
        id: 's3',
        name: 'Operations',
        level: '',
        keywords: ['Backup and restore', 'Log shipping', 'Patching pipelines', 'PowerShell', 'Terraform'],
      },
      {
        id: 's4',
        name: 'Security',
        level: '',
        keywords: ['Row-level security', 'Transparent data encryption', 'Least privilege', 'Audit remediation'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Oracle Database Administration 2019 Certified Professional',
        date: '2020',
        issuer: 'Oracle',
        url: '',
      },
      {
        id: 'c2',
        name: 'Microsoft Certified: Azure Database Administrator Associate (DP-300)',
        date: '2023',
        issuer: 'Microsoft',
        url: '',
      },
    ],
  }),
}

export default sample
