import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Twelve years of retention work, shown as a line: list hygiene and subject
 * lines early, then triggered journeys, then a team of eleven and a churn
 * number. The MBA was taken part-time alongside the third role, and the dates
 * say so rather than leaving a reader to wonder.
 */
export const sample: LibrarySample = {
  slug: 'lifecycle-marketing-lead',
  role: 'Head of Lifecycle Marketing',
  category: 'marketing',
  seniority: 'lead',
  region: 'india',
  template: 'cobalt',
  blurb:
    'Twelve years of CRM and retention, from list hygiene to an eleven-person team owning a ₹19 crore repeat-revenue target.',
  keywords: [
    'lifecycle marketing',
    'CRM manager',
    'retention marketing',
    'email marketing',
    'head of CRM',
    'churn reduction',
    'marketing automation',
  ],
  content: content({
    basics: {
      name: 'Ananya Deshpande',
      label: 'Head of Lifecycle Marketing',
      image: '',
      email: 'ananya.deshpande@example.com',
      phone: '+91 12345 82207',
      url: 'https://ananyadeshpande.example.com',
      summary:
        'Retention marketer with twelve years on email, push and WhatsApp, now leading eleven people and owning repeat revenue for 4.2 million members. Cut 90-day churn from 34% to 21% by rebuilding onboarding as a branched journey.',
      location: { city: 'Mumbai', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'ananyadeshpande', url: 'https://linkedin.com/in/ananyadeshpande' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Sootra Wellness',
        position: 'Head of Lifecycle Marketing',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2021-08',
        endDate: '',
        summary:
          'Leads eleven marketers across email, push, WhatsApp and lifecycle analytics for a subscription wellness brand.',
        highlights: [
          'Owns retention for 4.2 million members and a ₹19 crore annual repeat-revenue target, delivered 106% against plan in the last two years.',
          'Cut 90-day churn from 34% to 21% by replacing one onboarding blast with an eight-branch journey keyed to the first order category.',
          'Grew WhatsApp from nothing to 28% of repeat orders at ₹0.41 a message, a ninth of the cost of the paid social it displaced.',
          'Rebuilt win-back on a propensity model; reactivation revenue rose from ₹40 lakh to ₹2.6 crore a year at nine times send cost.',
          'Consolidated six disconnected tools onto one customer data platform, taking campaign build time from nine days to two.',
        ],
      },
      {
        id: 'w2',
        name: 'Nirvaha Payments',
        position: 'Senior CRM Manager',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2018-03',
        endDate: '2021-07',
        summary: '',
        highlights: [
          'Grew email revenue 3.4 times in three years while cutting send volume 40%, by ending batch sends and moving to triggered journeys.',
          'Ran the first deliverability clean-up the company had done: inbox placement rose from 71% to 96% and the domain came off two blocklists.',
          'Launched the referral programme that still brings 14% of new customers at a third of paid acquisition cost.',
        ],
      },
      {
        id: 'w3',
        name: 'Rangmala Retail',
        position: 'Email Marketing Manager',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2015-06',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Took open rate from 11% to 26% and click rate from 0.9% to 3.1% with a subject-line test on every send and a monthly hygiene routine.',
          'Built the abandoned-browse trigger that returned ₹1.2 crore in its first year on a ₹6 lakh build.',
        ],
      },
      {
        id: 'w4',
        name: 'Chaitra Foods',
        position: 'Marketing Executive',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2013-07',
        endDate: '2015-05',
        summary: '',
        highlights: [
          'Segmented lapsed customers for the first time; a three-message reactivation series brought back 4,800 of them in one quarter.',
          'Ran the loyalty database of 90,000 customers and the monthly messaging calendar, lifting store repeat visits 12% in a year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'NMIMS Global Access School for Continuing Education',
        area: 'Marketing',
        studyType: 'MBA',
        location: 'Mumbai, Maharashtra',
        startDate: '2016-06',
        endDate: '2018-05',
        score: 'First Class',
        url: '',
        summary: 'Taken part-time alongside full-time work.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Savitribai Phule Pune University',
        area: 'Commerce',
        studyType: 'B.Com',
        location: 'Pune, Maharashtra',
        startDate: '2010-06',
        endDate: '2013-04',
        score: '72%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Lifecycle',
        level: '',
        keywords: [
          'Onboarding journeys',
          'Churn and win-back',
          'Loyalty programmes',
          'Cross-sell',
          'Subscription renewals',
        ],
      },
      {
        id: 's2',
        name: 'Channels',
        level: '',
        keywords: ['Email', 'WhatsApp', 'Push and in-app', 'SMS', 'Deliverability'],
      },
      {
        id: 's3',
        name: 'Platforms',
        level: '',
        keywords: ['Braze', 'Salesforce Marketing Cloud', 'Segment', 'Snowflake', 'Looker', 'SQL'],
      },
      {
        id: 's4',
        name: 'Leading',
        level: '',
        keywords: [
          'Team of eleven',
          'Hiring and levelling',
          'Quarterly planning',
          'Vendor selection',
          'Stakeholder reporting',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Marketing Cloud Email Specialist',
        date: '2020',
        issuer: 'Salesforce',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'Marathi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Fluent', rating: 5 },
    ],
  }),
}

export default sample
