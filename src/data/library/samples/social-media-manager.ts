import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * Early-career social, where the temptation is to list platforms. This one
 * lists outcomes instead — followers earned, engagement against a benchmark,
 * and the product the comment section asked for — and keeps the part-time
 * agency contract that paid for the degree.
 */
export const sample: LibrarySample = {
  slug: 'social-media-manager',
  role: 'Social Media Manager',
  category: 'marketing',
  seniority: 'entry',
  region: 'us',
  template: 'halcyon',
  blurb:
    'Two years of hands-on social for a coffee brand and an agency, counted in followers earned and engagement held.',
  keywords: [
    'social media manager',
    'social media coordinator',
    'TikTok marketing',
    'Instagram growth',
    'content calendar',
    'community management',
    'short-form video',
  ],
  content: content({
    basics: {
      name: 'Camila Restrepo',
      label: 'Social Media Manager',
      image: portrait('Camila Restrepo'),
      email: 'camila.restrepo@example.com',
      phone: '+1 (555) 0198',
      url: 'https://camilarestrepo.example.com',
      summary:
        'Social media marketer who shoots, edits and writes every post published, with two years across a coffee brand and a seven-client agency. Grew a brand TikTok from 3,000 to 141,000 followers in ten months with no paid promotion.',
      location: { city: 'Nashville', region: 'TN', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'camilarestrepo', url: 'https://linkedin.com/in/camilarestrepo' },
        { network: 'Instagram', username: 'camshootsit', url: 'https://instagram.com/camshootsit' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Quarrystone Coffee',
        position: 'Social Media Coordinator',
        location: 'Nashville, TN',
        url: '',
        startDate: '2024-03',
        endDate: '',
        summary: 'Sole owner of organic social for a regional roaster with 11 cafés.',
        highlights: [
          'Grew the TikTok account from 3,000 to 141,000 followers in ten months; the 14 videos past 100,000 views were shot on a phone with no paid promotion.',
          'Publishes 22 posts a week across four platforms and holds a 6.8% average engagement rate against a 2.1% category benchmark.',
          'Turned a recurring comment-section request into a product: the pecan cold brew sold 19,000 units in its first month.',
          'Cut video turnaround from six days to one by editing in-house, which let the brand join three trends in the week they peaked.',
        ],
      },
      {
        id: 'w2',
        name: 'Beacondale Creative',
        position: 'Social Media Assistant (part-time, contract)',
        location: 'Nashville, TN',
        url: '',
        startDate: '2022-09',
        endDate: '2024-02',
        summary: '',
        highlights: [
          'Wrote and scheduled 1,800 posts for seven restaurant clients while finishing a degree, with same-day turnaround on approvals.',
          'Grew a bakery client from 900 to 12,400 Instagram followers in seven months; the owner credited two catering contracts to it.',
          'Built the monthly client report in Looker Studio, replacing a four-hour manual deck; the agency rolled it out to all 20 accounts.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Middle Tennessee State University',
        area: 'Media and Entertainment',
        studyType: 'B.S.',
        location: 'Murfreesboro, TN',
        startDate: '2020-08',
        endDate: '2023-12',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Cumberland Paws Rescue',
        position: 'Social Media Volunteer',
        url: '',
        startDate: '2021-05',
        endDate: '',
        summary: '',
        highlights: [
          'Runs the shelter’s Instagram and posts every adoptable dog; the 2024 adopt-a-thon raised $14,000, three times the previous year.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Second Rack',
        description: 'A personal TikTok account on thrifting and mending clothes, run since sophomore year.',
        url: 'https://tiktok.com/@secondrack',
        startDate: '2021-09',
        endDate: '',
        highlights: ['38,000 followers and four paid brand partnerships, each negotiated and invoiced independently.'],
        keywords: ['Short-form video', 'Editing', 'Brand partnerships'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Platforms',
        level: '',
        keywords: ['TikTok', 'Instagram', 'YouTube Shorts', 'Pinterest', 'Threads'],
      },
      {
        id: 's2',
        name: 'Production',
        level: '',
        keywords: ['Phone videography', 'CapCut', 'Adobe Premiere Pro', 'Canva', 'Lightroom', 'Copywriting'],
      },
      {
        id: 's3',
        name: 'Running the channel',
        level: '',
        keywords: ['Content calendars', 'Community management', 'Creator briefs', 'Paid boosting', 'Native analytics'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Hootsuite Social Marketing Certification',
        date: '2023',
        issuer: 'Hootsuite Academy',
        url: '',
      },
    ],
  }),
}

export default sample
