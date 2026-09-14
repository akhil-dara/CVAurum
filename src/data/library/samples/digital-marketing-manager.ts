import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * The generalist acquisition résumé: one person holding paid, email and site
 * conversion for a direct-to-consumer brand. Every bullet resolves to a number
 * a CFO would recognise — cost per customer, revenue share, spend.
 */
export const sample: LibrarySample = {
  slug: 'digital-marketing-manager',
  role: 'Digital Marketing Manager',
  category: 'marketing',
  seniority: 'mid',
  region: 'us',
  template: 'contemporary',
  blurb: 'Six years of direct-to-consumer acquisition, written as what each channel cost and what it returned.',
  keywords: [
    'digital marketing manager',
    'growth marketing',
    'paid social',
    'customer acquisition cost',
    'ecommerce marketing',
    'email marketing',
    'DTC',
  ],
  content: content({
    basics: {
      name: 'Nadia Okafor',
      label: 'Digital Marketing Manager',
      image: '',
      email: 'nadia.okafor@example.com',
      phone: '+1 (555) 0176',
      url: 'https://nadiaokafor.example.com',
      summary:
        'Digital marketer with six years running acquisition for direct-to-consumer brands across paid search, paid social and email. Took blended customer acquisition cost from $64 to $38 while paid spend more than doubled, and now owns an $8.6M annual budget.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'nadiaokafor', url: 'https://linkedin.com/in/nadiaokafor' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Thimble & Oak',
        logo: brandmark('Thimble & Oak'),
        position: 'Digital Marketing Manager',
        location: 'Chicago, IL',
        url: '',
        startDate: '2022-05',
        endDate: '',
        summary: 'Owns acquisition and retention channels for a $40M direct-to-consumer housewares brand.',
        highlights: [
          'Took blended customer acquisition cost from $64 to $38 over five quarters while monthly paid spend grew from $310k to $720k, by moving budget decisions onto a first-party attribution model.',
          'Rebuilt the welcome and abandoned-cart flows; email and SMS went from 9% to 21% of total revenue, worth $3.1M in the first year.',
          'Ran 34 landing page tests in one year, of which nine won; the winners moved sitewide conversion from 1.8% to 2.6%.',
          'Brought paid search in-house, ending an $18k monthly agency retainer with no drop in return on ad spend over the two quarters that followed.',
        ],
      },
      {
        id: 'w2',
        name: 'Meadowmark Retail Group',
        logo: brandmark('Meadowmark Retail Group'),
        position: 'Digital Marketing Specialist',
        location: 'Milwaukee, WI',
        url: '',
        startDate: '2019-08',
        endDate: '2022-04',
        summary: '',
        highlights: [
          'Grew the paid search account from $40k to $210k in monthly spend while holding return on ad spend at 4.1, mostly by restructuring 600 ad groups around search intent.',
          'Built the first customer segmentation in the email platform, lifting open rate from 14% to 29% and click rate from 1.1% to 3.4%.',
          'Wrote the weekly channel report that replaced three hand-built spreadsheets; it is still what the leadership team reads on Monday.',
        ],
      },
      {
        id: 'w3',
        name: 'Gildmark Paper Co.',
        logo: brandmark('Gildmark Paper Co.'),
        position: 'Marketing Coordinator',
        location: 'Milwaukee, WI',
        url: '',
        startDate: '2018-06',
        endDate: '2019-07',
        summary: '',
        highlights: [
          'Planned the launch email calendar for the 2019 catalog; launch week took $214k in orders, a record the brand held for two years.',
          'Cleaned 180,000 subscriber records of duplicates and hard bounces, taking deliverability from 82% to 97%.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Marquette University',
        area: 'Marketing',
        studyType: 'B.A.',
        location: 'Milwaukee, WI',
        startDate: '2014-08',
        endDate: '2018-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Channels',
        level: '',
        keywords: ['Paid search', 'Paid social', 'Email and SMS', 'Affiliate', 'Organic search'],
      },
      {
        id: 's2',
        name: 'Platforms',
        level: '',
        keywords: ['Google Ads', 'Meta Ads Manager', 'GA4', 'Klaviyo', 'Shopify', 'Looker Studio'],
      },
      {
        id: 's3',
        name: 'Measurement',
        level: '',
        keywords: ['Incrementality testing', 'Cohort LTV', 'A/B testing', 'Marketing mix modeling', 'SQL'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Google Ads Search Certification', date: '2024', issuer: 'Google Skillshop', url: '' },
      { id: 'c2', name: 'Meta Certified Digital Marketing Associate', date: '2022', issuer: 'Meta', url: '' },
    ],
  }),
}

export default sample
