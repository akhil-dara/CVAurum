import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A career changer: two years on a newspaper business desk, then content
 * marketing. The reporting years are kept because they are the reason the
 * writing works, and each one is measured in readers rather than clippings.
 */
export const sample: LibrarySample = {
  slug: 'content-marketing-specialist',
  role: 'Content Marketing Specialist',
  category: 'marketing',
  seniority: 'entry',
  region: 'india',
  template: 'polished',
  blurb:
    'A business reporter turned B2B content marketer, with the traffic and pipeline numbers to show the switch worked.',
  keywords: [
    'content marketing',
    'content writer',
    'B2B SaaS content',
    'organic traffic',
    'career change to marketing',
    'editorial',
    'blog strategy',
  ],
  content: content({
    basics: {
      name: 'Meghna Bhattacharya',
      label: 'Content Marketing Specialist',
      image: '',
      email: 'meghna.bhattacharya@example.com',
      phone: '+91 12345 60118',
      url: 'https://meghnawrites.example.com',
      summary:
        'Content marketer with three years of professional writing, two of them on a business news desk. Took a B2B software blog from 4,200 to 26,000 organic sessions a month in 14 months; organic now sources a third of demo requests.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'meghnabhattacharya', url: 'https://linkedin.com/in/meghnabhattacharya' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Tathya Analytics',
        position: 'Content Marketing Associate',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2024-02',
        endDate: '',
        summary: 'Sole writer on a four-person marketing team at a supply-chain software company.',
        highlights: [
          'Writes the weekly product blog; organic sessions grew from 4,200 to 26,000 a month in 14 months, and organic now sources 31% of demo requests.',
          'Built a 40-article cluster on inventory forecasting that ranks on page one for 17 of its 22 target keywords.',
          'Turned six customer interviews into case studies that sales attaches to 60% of enterprise proposals; win rate on those deals rose nine points.',
          'Started the monthly newsletter, now 11,400 subscribers at a 42% open rate, built entirely from blog readers rather than paid lists.',
        ],
      },
      {
        id: 'w2',
        name: 'Alaap Media',
        position: 'Reporter, Business Desk',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2022-07',
        endDate: '2024-01',
        summary: '',
        highlights: [
          'Filed 140 business stories in 18 months, including a four-part series on small-town logistics that ran as the Sunday lead.',
          'Organised the desk’s first reader survey, 2,900 responses, and reshaped the Monday business page around it; page views rose 38%.',
          'Sub-edited copy for three reporters against a 6pm deadline, cutting corrections printed the next day from 11 a month to 2.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Christ University',
        area: 'Journalism, Psychology and English',
        studyType: 'B.A. (Hons)',
        location: 'Bengaluru, Karnataka',
        startDate: '2019-06',
        endDate: '2022-04',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Shelf Life',
        description:
          'A fortnightly newsletter on how Indian consumer brands are actually built, written since journalism school.',
        url: 'https://shelflife.example.com',
        startDate: '2021-11',
        endDate: '',
        highlights: [
          '3,100 subscribers with no paid promotion; two issues were reprinted by a national business weekly.',
        ],
        keywords: ['Newsletter', 'Long-form', 'Consumer brands'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Writing',
        level: '',
        keywords: ['Long-form editorial', 'Case studies', 'Newsletters', 'Landing page copy', 'Interviewing'],
      },
      {
        id: 's2',
        name: 'Search',
        level: '',
        keywords: ['Keyword research', 'Topic clusters', 'On-page optimisation', 'Internal linking', 'Content audits'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Google Search Console', 'Ahrefs', 'GA4', 'Webflow', 'HubSpot', 'Figma'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Content Marketing Certification', date: '2024', issuer: 'HubSpot Academy', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Bengali', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
