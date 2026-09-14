import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * The reference sample. Everything else in the library is written to this bar:
 * every bullet names a thing that happened and what it changed, no bullet runs
 * past two lines, no sentence contains a pronoun, and the numbers are specific
 * enough to be asked about in an interview.
 */
export const sample: LibrarySample = {
  slug: 'senior-backend-engineer',
  role: 'Senior Backend Engineer',
  category: 'software',
  seniority: 'senior',
  region: 'us',
  template: 'plainsong',
  blurb:
    'Eight years of distributed systems work, told through what each system did for the business rather than what it was built with.',
  keywords: ['backend engineer', 'distributed systems', 'Go', 'Kubernetes', 'payments', 'senior software engineer'],
  content: content({
    basics: {
      name: 'Marcus Whitfield',
      label: 'Senior Backend Engineer',
      image: '',
      email: 'marcus.whitfield@example.com',
      phone: '+1 (555) 0142',
      url: 'https://marcuswhitfield.example.com',
      summary:
        'Backend engineer with eight years on payment and messaging systems that cannot go down. Took a checkout service from 1.2% failed transactions to 0.08%, and now leads the three-person group that owns it.',
      location: { city: 'Austin', region: 'TX', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'mwhitfield', url: 'https://github.com/mwhitfield' },
        { network: 'LinkedIn', username: 'marcuswhitfield', url: 'https://linkedin.com/in/marcuswhitfield' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Northbank Payments',
        logo: brandmark('Northbank Payments'),
        position: 'Senior Backend Engineer',
        location: 'Austin, TX',
        url: '',
        startDate: '2022-03',
        endDate: '',
        summary: 'Payments platform group of nine. Owns authorization, settlement and the merchant ledger.',
        highlights: [
          'Rebuilt the authorization path around an idempotency ledger, taking failed transactions from 1.2% to 0.08% and ending a class of duplicate-charge refunds worth about $340k a year.',
          'Cut p99 settlement latency from 2.4s to 310ms by replacing nightly batch reconciliation with an event-sourced ledger in Go.',
          'Led the migration of 40 services to a shared gRPC contract, retiring 11k lines of per-service HTTP glue.',
          'Wrote the on-call runbook the team still uses; paging volume fell by half in the quarter after it landed.',
        ],
      },
      {
        id: 'w2',
        name: 'Cedarline Systems',
        logo: brandmark('Cedarline Systems'),
        position: 'Backend Engineer',
        location: 'Denver, CO',
        url: '',
        startDate: '2019-06',
        endDate: '2022-02',
        summary: '',
        highlights: [
          'Designed the message bus behind a fleet-tracking product serving 18,000 vehicles, sustaining 90k events a minute on three nodes.',
          'Moved the deploy pipeline from hand-run scripts to GitOps, taking a release from 40 minutes of supervision to four.',
          'Found and fixed a connection-pool leak that had caused six months of Monday-morning outages.',
        ],
      },
      {
        id: 'w3',
        name: 'Aperture Retail',
        position: 'Software Engineer',
        location: 'Denver, CO',
        url: '',
        startDate: '2017-08',
        endDate: '2019-05',
        summary: '',
        highlights: [
          'Built the inventory sync between five warehouses and the storefront, cutting oversold orders by 71%.',
          'Added the integration test suite the team had gone two years without; it caught 23 regressions in its first quarter.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Colorado Boulder',
        area: 'Computer Science',
        studyType: 'B.S.',
        location: 'Boulder, CO',
        startDate: '2013-08',
        endDate: '2017-05',
        score: '3.6 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Ledgerkit',
        description: 'An open-source double-entry ledger for Go, used by four payment startups.',
        url: 'https://github.com/mwhitfield/ledgerkit',
        startDate: '2021-02',
        endDate: '',
        highlights: ['1,400 stars and 31 contributors; ships a property-test suite for balance invariants.'],
        keywords: ['Go', 'PostgreSQL', 'event sourcing'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Go', 'Python', 'TypeScript', 'SQL', 'Rust'] },
      {
        id: 's2',
        name: 'Systems',
        level: '',
        keywords: ['Kubernetes', 'gRPC', 'Kafka', 'PostgreSQL', 'Redis', 'Terraform'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Event sourcing', 'Distributed tracing', 'Load testing', 'Incident review'],
      },
    ],
    certificates: [{ id: 'c1', name: 'Certified Kubernetes Administrator', date: '2023', issuer: 'CNCF', url: '' }],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Professional', rating: 3 },
    ],
  }),
}

export default sample
