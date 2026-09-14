import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Operations work is easy to write badly, because most of it is invisible when
 * it goes right. The fix here is to price it: pages that stopped firing, minutes
 * taken off recovery, dollars taken off the bill.
 */
export const sample: LibrarySample = {
  slug: 'site-reliability-engineer',
  role: 'Site Reliability Engineer',
  category: 'software',
  seniority: 'senior',
  region: 'us',
  template: 'quire',
  blurb:
    'Nine years of on-call written as pages that stopped firing, minutes off recovery, and dollars off the cloud bill.',
  keywords: [
    'site reliability engineer',
    'SRE',
    'DevOps engineer',
    'Kubernetes',
    'Terraform',
    'observability',
    'incident response',
  ],
  content: content({
    basics: {
      name: 'Nadia Belanger',
      label: 'Site Reliability Engineer',
      image: '',
      email: 'nadia.belanger@example.com',
      phone: '+1 (555) 0128',
      url: 'https://nadiabelanger.example.com',
      summary:
        'Site reliability engineer with nine years keeping high-traffic systems up, in freight logistics and healthcare claims. Took mean time to recovery across 60 services from 41 minutes to 7 by replacing host alerts with service-level objectives, and cut $1.4M a year from the cloud bill in the same period.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'nbelanger', url: 'https://github.com/nbelanger' },
        { network: 'LinkedIn', username: 'nadiabelanger', url: 'https://linkedin.com/in/nadiabelanger' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Harborlight Freight Systems',
        position: 'Senior Site Reliability Engineer',
        location: 'Chicago, IL',
        url: '',
        startDate: '2021-05',
        endDate: '',
        summary: 'Reliability for a logistics platform moving 90,000 shipments a day across 60 services.',
        highlights: [
          'Replaced 400 host-level alerts with 38 service-level objectives, taking pages from 61 a week to 9 and mean time to recovery from 41 minutes to 7.',
          'Moved 60 services onto Terraform and Argo CD, turning a three-hour change window into an 11-minute rollout with automatic rollback.',
          'Cut $1.4M a year of cloud spend by right-sizing 220 workloads and running batch reconciliation on spot capacity with checkpointing.',
          'Runs the incident review program; repeat incidents fell from 31% of all incidents to 6% over 18 months.',
        ],
      },
      {
        id: 'w2',
        name: 'Cindermill Health',
        position: 'Site Reliability Engineer',
        location: 'Chicago, IL',
        url: '',
        startDate: '2018-02',
        endDate: '2021-04',
        summary: '',
        highlights: [
          'Built multi-region failover for a claims API handling 12,000 requests a second, proven quarterly by shifting real traffic in a game day.',
          'Cut p99 latency from 3.1s to 420ms with a read-through cache and by removing an N+1 query in the eligibility service.',
          'Automated certificate rotation across 180 hosts after an expiry took the member portal down for four hours; no expiry incident since.',
        ],
      },
      {
        id: 'w3',
        name: 'Alderway Systems',
        position: 'Systems Engineer',
        location: 'Milwaukee, WI',
        url: '',
        startDate: '2016-07',
        endDate: '2018-01',
        summary: '',
        highlights: [
          'Containerized 24 legacy Java services, taking environment-specific bugs from 18 a quarter to 2.',
          'Wrote the restore verification job that found 3 of 11 database backups had been failing silently for months.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Illinois Urbana-Champaign',
        area: 'Computer Engineering',
        studyType: 'B.S.',
        location: 'Urbana, IL',
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
        name: 'Platform',
        level: '',
        keywords: ['Kubernetes', 'Terraform', 'Argo CD', 'AWS', 'Linux', 'Envoy'],
      },
      {
        id: 's2',
        name: 'Observability',
        level: '',
        keywords: ['Prometheus', 'Grafana', 'OpenTelemetry', 'Loki', 'PagerDuty'],
      },
      { id: 's3', name: 'Languages', level: '', keywords: ['Go', 'Python', 'Bash', 'SQL'] },
      {
        id: 's4',
        name: 'Practice',
        level: '',
        keywords: ['SLO design', 'Incident command', 'Game days', 'Capacity planning', 'Cost engineering'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'AWS Certified Solutions Architect – Professional',
        date: '2024',
        issuer: 'Amazon Web Services',
        url: '',
      },
      { id: 'c2', name: 'Terraform Associate', date: '2022', issuer: 'HashiCorp', url: '' },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Platform Award for the year’s largest reliability gain',
        date: '2023',
        awarder: 'Harborlight Freight Systems',
        summary: 'Given once a year across a 300-person engineering department.',
      },
    ],
  }),
}

export default sample
