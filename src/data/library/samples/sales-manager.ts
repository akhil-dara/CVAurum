import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * Senior, India. A sales manager is judged on two things at once — the number
 * and the team that has to hit it — so both are on the page, including the
 * attrition figure most sales résumés leave off.
 */
export const sample: LibrarySample = {
  slug: 'sales-manager',
  role: 'Sales Manager',
  category: 'business',
  seniority: 'senior',
  region: 'india',
  template: 'emblem',
  blurb:
    'A field sales leader measured on both halves of the job: territory revenue and the team that has to deliver it.',
  keywords: [
    'sales manager',
    'regional sales manager',
    'field sales leadership',
    'channel and distributor sales',
    'territory growth',
    'payments and fintech sales',
  ],
  content: content({
    basics: {
      name: 'Harpreet Sandhu',
      label: 'Regional Sales Manager, North',
      image: '',
      email: 'harpreet.sandhu@example.com',
      phone: '+91 12345 48930',
      url: '',
      summary:
        'Sales manager running a 17-person field and partner team selling payment terminals and software to retail chains across north India. Grew territory revenue from ₹41 crore to ₹78 crore in three years while cutting representative attrition from 38% to 11%.',
      location: { city: 'Gurugram', region: 'Haryana', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'harpreetsandhu', url: 'https://linkedin.com/in/harpreetsandhu' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ravira Payments',
        logo: brandmark('Ravira Payments'),
        position: 'Regional Sales Manager, North',
        location: 'Gurugram, Haryana',
        url: '',
        startDate: '2022-05',
        endDate: '',
        summary:
          'Leads 14 field sales executives and 3 partner managers across Delhi NCR, Punjab, Haryana and Uttar Pradesh.',
        highlights: [
          'Grew territory revenue from ₹41 crore to ₹78 crore in three years, adding 2,300 merchant outlets and two national retail chains.',
          'Cut representative attrition from 38% to 11% by replacing a pure-commission plan with base-plus-accelerator pay and a 60-day ramp curriculum.',
          'Introduced a weekly pipeline review with a three-stage qualification rule, moving forecast accuracy from plus or minus 34% to plus or minus 9%.',
          'Opened Punjab from zero to ₹11 crore in 18 months through four distributor partnerships.',
          'Built the key-account track five executives have moved into; three of them now carry the ten largest merchant relationships.',
        ],
      },
      {
        id: 'w2',
        name: 'Ravira Payments',
        logo: brandmark('Ravira Payments'),
        position: 'Area Sales Manager',
        location: 'New Delhi',
        url: '',
        startDate: '2020-03',
        endDate: '2022-04',
        summary: '',
        highlights: [
          'Managed six executives across Delhi NCR and closed two consecutive years at 121% and 116% of target.',
          'Won the first modern-trade account in the region, a 190-store grocery group that still contributes ₹6 crore a year.',
        ],
      },
      {
        id: 'w3',
        name: 'Anvira Health Networks',
        logo: brandmark('Anvira Health Networks'),
        position: 'Senior Sales Executive',
        location: 'New Delhi',
        url: '',
        startDate: '2017-06',
        endDate: '2020-02',
        summary: '',
        highlights: [
          'Sold diagnostic packages to 140 corporate accounts, closing ₹9.2 crore against a ₹7.5 crore cumulative target over three years.',
          'Designed the renewal calling process that took corporate contract renewals from 61% to 84%.',
        ],
      },
      {
        id: 'w4',
        name: 'Tamarind Consumer Products',
        logo: brandmark('Tamarind Consumer Products'),
        position: 'Sales Officer',
        location: 'Jaipur, Rajasthan',
        url: '',
        startDate: '2015-07',
        endDate: '2017-05',
        summary: '',
        highlights: [
          'Covered 180 retail outlets across two districts and raised secondary sales 34% by rebuilding a beat plan with six dead days a month in it.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Institute of Management Technology, Ghaziabad',
        area: 'Marketing',
        studyType: 'MBA',
        location: 'Ghaziabad, Uttar Pradesh',
        startDate: '2013-06',
        endDate: '2015-05',
        score: '7.9 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Hansraj College, University of Delhi',
        area: 'Commerce',
        studyType: 'B.Com. (Hons.)',
        location: 'New Delhi',
        startDate: '2010-07',
        endDate: '2013-05',
        score: '68%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Sales Manager of the Year',
        date: '2024',
        awarder: 'Ravira Payments',
        summary: 'First of seven regional managers on revenue growth and team retention.',
      },
      {
        id: 'a2',
        title: 'Top 1% of Field Sales',
        date: '2019',
        awarder: 'Anvira Health Networks',
        summary: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Leadership',
        level: '',
        keywords: [
          'Hiring and ramp',
          'Territory design',
          'Incentive planning',
          'Coaching cadence',
          'Performance management',
        ],
      },
      {
        id: 's2',
        name: 'Selling',
        level: '',
        keywords: [
          'Modern trade accounts',
          'Distributor networks',
          'Pricing negotiation',
          'Forecasting',
          'Channel conflict',
        ],
      },
      { id: 's3', name: 'Systems', level: '', keywords: ['Salesforce', 'Zoho CRM', 'Power BI', 'Excel dashboards'] },
    ],
    languages: [
      { id: 'l1', language: 'Punjabi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'English', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
