import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * A UX designer whose constraints are the interesting part: entry-level
 * Android handsets, intermittent networks and users who do not read English.
 * Every bullet is a number the product team already tracks.
 */
export const sample: LibrarySample = {
  slug: 'ux-designer',
  role: 'UX Designer',
  category: 'design',
  seniority: 'mid',
  region: 'india',
  template: 'orchid',
  blurb:
    'Six years of consumer fintech UX for low-end Android and patchy networks, measured in failed payments and KYC drop-off.',
  keywords: [
    'UX designer',
    'product design India',
    'fintech UX',
    'usability testing',
    'UPI payments',
    'Figma',
    'mobile app design',
  ],
  content: content({
    basics: {
      name: 'Ananya Deshmukh',
      label: 'UX Designer',
      image: portrait('Ananya Deshmukh'),
      email: 'ananya.deshmukh@example.com',
      phone: '+91 12345 60148',
      url: 'https://ananyadeshmukh.example.com',
      urlLabel: 'Portfolio',
      summary:
        'UX designer with six years on consumer fintech used mostly on entry-level Android phones and unreliable networks. Redesigned a UPI payment flow for 4.2 million monthly users, taking failed first attempts from 19% to 6%. Runs research in Hindi and Kannada rather than through a translator.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'ananyadeshmukh', url: 'https://linkedin.com/in/ananyadeshmukh' },
        { network: 'Behance', username: 'adeshmukh', url: 'https://behance.net/adeshmukh' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Arkavati Payments',
        position: 'UX Designer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2023-08',
        endDate: '',
        summary: 'Payments experience team of six inside a 90-person product group.',
        highlights: [
          'Redesigned the UPI payment flow around a single confirm screen and a plain-language failure message, taking failed first attempts from 19% to 6% across 4.2 million monthly users.',
          'Cut KYC drop-off from 41% to 17% with a camera-guided document capture that tells the user what is wrong before submission rather than after it.',
          'Introduced a monthly review with eight Hindi and Kannada speakers; three wording changes from those sessions removed the top two reasons for support calls.',
          'Maintains the Android-first component kit used by four squads, which has taken a new screen from six days to two between approval and build.',
        ],
      },
      {
        id: 'w2',
        name: 'Chinar Commerce',
        position: 'UX Designer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2021-06',
        endDate: '2023-07',
        summary: '',
        highlights: [
          'Rebuilt search and filtering across a 60,000-item grocery catalogue; add-to-cart from search results rose 34% and zero-result searches fell from 12% to 4%.',
          'Designed the order-tracking screen that replaced about 3,100 order-location support chats a week with a live map and a two-line status.',
          'Ran 40 moderated sessions across three cities and turned them into a shared findings wall that product specs still cite by study number.',
        ],
      },
      {
        id: 'w3',
        name: 'Halcyon Design Studio',
        position: 'Junior UX Designer',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2020-07',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Designed screens for seven client engagements across insurance, travel and logistics; three shipped inside the engagement window.',
          'Wrote the studio’s usability-testing script template, cutting session preparation from a full day to about an hour.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'National Institute of Design, Ahmedabad',
        area: 'Interaction Design',
        studyType: 'B.Des.',
        location: 'Ahmedabad, Gujarat',
        startDate: '2016-07',
        endDate: '2020-05',
        score: '8.4 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: ['Interaction design', 'Information architecture', 'Design systems', 'Wireframing', 'Prototyping'],
      },
      {
        id: 's2',
        name: 'Research',
        level: '',
        keywords: [
          'Moderated usability testing',
          'Vernacular field research',
          'Diary studies',
          'Funnel analysis',
          'A/B test design',
        ],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Figma', 'FigJam', 'Maze', 'Mixpanel', 'Principle'],
      },
    ],
    certificates: [{ id: 'c1', name: 'UX Certification', date: '2023', issuer: 'Nielsen Norman Group', url: '' }],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Kannada', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
