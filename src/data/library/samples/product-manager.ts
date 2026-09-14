import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Mid level, US, and a career changer: support operations into product. The
 * pivot is the point, so the support role keeps its bullets instead of being
 * buried, and every product launch traces back to something the queue proved.
 */
export const sample: LibrarySample = {
  slug: 'product-manager',
  role: 'Product Manager',
  category: 'business',
  seniority: 'mid',
  region: 'us',
  template: 'ribbon',
  blurb:
    'A support lead turned product manager, with the pivot visible in the work: every launch traces back to a ticket queue.',
  keywords: [
    'product manager',
    'SaaS product manager',
    'billing and subscriptions',
    'product discovery',
    'career change into product',
    'roadmap and pricing',
  ],
  content: content({
    basics: {
      name: 'Nia Okonkwo',
      label: 'Product Manager, Billing',
      image: '',
      email: 'nia.okonkwo@example.com',
      phone: '+1 (555) 0173',
      url: 'https://niaokonkwo.example.com',
      summary:
        'Product manager with four years on billing and subscription tooling, after three years running the support queue those tools kept breaking. Shipped the self-serve plan changes that now carry 71% of upgrades without a support agent touching them.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'niaokonkwo', url: 'https://linkedin.com/in/niaokonkwo' },
        { network: 'Website', username: 'niaokonkwo', url: 'https://niaokonkwo.example.com', label: 'Product writing' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Trellisway Software',
        logo: monogram('T', '#7c3aed'),
        position: 'Product Manager, Billing',
        location: 'Chicago, IL',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary: 'Owns billing, subscriptions and the self-serve upgrade path for 9,000 business customers.',
        highlights: [
          'Shipped self-serve plan changes with proration, which now carry 71% of upgrades that used to need an agent and took billing tickets from 340 a month to 96.',
          'Rebuilt dunning around retry timing and in-app notices, recovering $1.4M of annual revenue previously written off to failed cards.',
          'Ran the discovery that killed a planned usage-based tier: 22 of 30 customer interviews said it made budgeting impossible, saving a two-quarter build.',
          'Writes the weekly release note that finance, support and sales all read; it replaced three separate status emails and a standing meeting.',
        ],
      },
      {
        id: 'w2',
        name: 'Fernhill Health',
        logo: monogram('F', '#0e7490'),
        position: 'Product Manager, Patient Billing',
        location: 'Chicago, IL',
        url: '',
        startDate: '2021-01',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Launched itemized digital statements for 210,000 patients, cutting billing-explanation calls 44% in the first quarter.',
          'Sequenced a payment-plan feature ahead of a larger redesign after finding 38% of unpaid balances came from patients who had asked to pay over time.',
          'Started the weekly triage between billing, compliance and engineering that took average defect age from 26 days to 9.',
        ],
      },
      {
        id: 'w3',
        name: 'Fernhill Health',
        logo: monogram('F', '#0e7490'),
        position: 'Support Operations Lead',
        location: 'Chicago, IL',
        url: '',
        startDate: '2018-07',
        endDate: '2020-12',
        summary: '',
        highlights: [
          'Sorted 14,000 tickets into nine root causes and took the top two to engineering; the fixes removed 31% of monthly contact volume.',
          'Scheduled and coached a nine-person queue, holding first response under 20 minutes through a year when volume doubled.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Illinois Urbana-Champaign',
        area: 'Communication',
        studyType: 'B.A.',
        location: 'Urbana, IL',
        startDate: '2014-08',
        endDate: '2018-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Northside Literacy Project',
        position: 'Medical Billing Coach',
        url: '',
        startDate: '2021-02',
        endDate: '',
        summary: '',
        highlights: [
          'Runs a monthly clinic on disputing medical bills; 90 households have been through it since 2021.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Product',
        level: '',
        keywords: ['Customer discovery', 'Roadmapping', 'Pricing and packaging', 'Spec writing', 'A/B testing'],
      },
      {
        id: 's2',
        name: 'Data',
        level: '',
        keywords: ['SQL', 'Amplitude', 'Looker', 'Funnel analysis', 'Cohort retention'],
      },
      {
        id: 's3',
        name: 'Domain',
        level: '',
        keywords: ['Subscription billing', 'Dunning and recovery', 'Payments', 'Healthcare revenue cycle'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Scrum Product Owner (CSPO)', date: '2021', issuer: 'Scrum Alliance', url: '' },
    ],
  }),
}

export default sample
