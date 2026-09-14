import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * A paid-media résumé that survives a numbers-first interview: budget held,
 * cost per acquisition moved, and the incrementality work that proved the
 * platform numbers were wrong before anyone was asked to trust them.
 */
export const sample: LibrarySample = {
  slug: 'performance-marketing-manager',
  role: 'Performance Marketing Manager',
  category: 'marketing',
  seniority: 'senior',
  region: 'india',
  template: 'sienna',
  blurb: 'Nine years of paid acquisition across fintech and D2C, told through budget held, CAC moved and tests run.',
  keywords: [
    'performance marketing',
    'paid media manager',
    'Google Ads',
    'Meta Ads',
    'customer acquisition cost',
    'ROAS',
    'app install campaigns',
  ],
  content: content({
    basics: {
      name: 'Karthik Vaidyanathan',
      label: 'Senior Performance Marketing Manager',
      image: '',
      email: 'karthik.vaidyanathan@example.com',
      phone: '+91 12345 70452',
      url: 'https://karthikv.example.com',
      summary:
        'Performance marketer with nine years buying media for consumer fintech and D2C brands, now running a ₹22 crore annual budget and a team of six. Cut blended acquisition cost from ₹740 to ₹410 while monthly installs grew 2.4 times.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'karthikvaidyanathan', url: 'https://linkedin.com/in/karthikvaidyanathan' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Arthway Finance',
        logo: monogram('A', '#1d4ed8'),
        position: 'Senior Performance Marketing Manager',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2021-11',
        endDate: '',
        summary: 'Owns paid acquisition for a consumer lending app with 6.1 million registered users. Team of six.',
        highlights: [
          'Runs a ₹22 crore annual media budget across search, social and three demand-side platforms; blended acquisition cost fell from ₹740 to ₹410 while monthly installs grew 2.4 times.',
          'Replaced last-click reporting with a geo holdout programme; the first four tests showed brand search was 62% incremental rather than 98%, freeing ₹3.1 crore for prospecting.',
          'Built a creative pipeline that ships 40 new variants a month, which took cost per funded account on paid social down 34% in two quarters.',
          'Cut fraudulent installs from 11% to 1.4% by moving to deferred deep-link attribution and blocking 130 sub-publishers.',
          'Hired and now mentors six marketers across app, paid social and affiliates; three were promoted within two years.',
        ],
      },
      {
        id: 'w2',
        name: 'Kaarigar Living',
        logo: monogram('K', '#b91c1c'),
        position: 'Performance Marketing Lead',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2019-04',
        endDate: '2021-10',
        summary: '',
        highlights: [
          'Scaled paid spend from ₹18 lakh to ₹1.4 crore a month at a steady 3.8 return on ad spend, as the brand opened in eight new cities.',
          'Launched a WhatsApp retargeting programme that recovered 12% of abandoned carts at a third of the cost of the paid social it replaced.',
          'Rebuilt the product feed, taking disapproved items from 31% to under 2% and adding ₹60 lakh of monthly shopping revenue.',
        ],
      },
      {
        id: 'w3',
        name: 'Vriksha Organics',
        logo: monogram('V', '#15803d'),
        position: 'Digital Marketing Executive',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2016-07',
        endDate: '2019-03',
        summary: '',
        highlights: [
          'Lifted return on ad spend from 2.1 to 4.4 on a ₹9 lakh monthly search budget by rebuilding the account around single-theme ad groups.',
          'Set up server-side conversion tracking that ended a six-month disagreement between platform-reported orders and the finance team’s count.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'College of Engineering, Guindy, Anna University',
        area: 'Electronics and Communication Engineering',
        studyType: 'B.E.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2012-08',
        endDate: '2016-05',
        score: '8.1 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Buying',
        level: '',
        keywords: ['Google Ads', 'Meta Ads', 'Apple Search Ads', 'Programmatic', 'App campaigns', 'Affiliate networks'],
      },
      {
        id: 's2',
        name: 'Measurement',
        level: '',
        keywords: [
          'Geo holdout tests',
          'Incrementality',
          'Media mix modelling',
          'Mobile attribution',
          'Server-side tracking',
        ],
      },
      {
        id: 's3',
        name: 'Analysis',
        level: '',
        keywords: ['SQL', 'Cohort LTV', 'Looker Studio', 'BigQuery', 'Unit economics'],
      },
      {
        id: 's4',
        name: 'Creative',
        level: '',
        keywords: ['Concept testing', 'Hook libraries', 'Static and video variants', 'Landing page testing'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Google Ads Search Certification', date: '2025', issuer: 'Google Skillshop', url: '' },
      { id: 'c2', name: 'Meta Certified Media Buying Professional', date: '2023', issuer: 'Meta', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
