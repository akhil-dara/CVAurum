import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * A fourteen-month career break sits in the middle of this history, listed as
 * an entry of its own with what was done in it. Naming a break plainly and
 * moving on reads far better than a date range a reader has to work out.
 */
export const sample: LibrarySample = {
  slug: 'brand-designer',
  role: 'Brand Designer',
  category: 'design',
  seniority: 'senior',
  region: 'india',
  template: 'portrait',
  blurb:
    'Ten years of identity and packaging in India, four of them running a studio, with a stated break in the middle.',
  keywords: [
    'brand designer',
    'identity design',
    'packaging design',
    'art director',
    'India brand design',
    'return to work after a career break',
    'typography',
  ],
  content: content({
    basics: {
      name: 'Meher Bhandari',
      label: 'Senior Brand Designer',
      image: portrait('Meher Bhandari'),
      email: 'meher.bhandari@example.com',
      phone: '+91 12345 80236',
      url: 'https://meherbhandari.example.com',
      urlLabel: 'Portfolio',
      summary:
        'Brand designer with ten years building identities and packaging for Indian consumer businesses, four of them running an independent studio. Rebuilt a regional dairy brand across 1,400 SKUs and 9,000 outlets, after which unaided recall in its home market moved from 22% to 47%. Draws Devanagari lettering as readily as Latin.',
      location: { city: 'Mumbai', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'meherbhandari', url: 'https://linkedin.com/in/meherbhandari' },
        { network: 'Behance', username: 'meherbhandari', url: 'https://behance.net/meherbhandari' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Margosa Consumer Brands',
        position: 'Senior Brand Designer',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2023-09',
        endDate: '',
        summary: 'Brand team of five inside a foods and personal-care group carrying eleven brands.',
        highlights: [
          'Rebuilt a regional dairy identity across 1,400 SKUs and 9,000 outlets; unaided recall in its home market moved from 22% to 47% over eighteen months.',
          'Wrote the packaging system of one shelf block, four colour families and a fixed nutrition panel, taking a new SKU from artwork brief to press-ready in five days instead of nineteen.',
          'Cut artwork rework by ₹34 lakh a year by moving eleven brands onto one master-artwork template and a two-stage approval.',
          'Runs the quarterly review with the three regional sales heads, which has ended state teams printing their own off-brand point-of-sale material.',
        ],
      },
      {
        id: 'w2',
        name: 'Kaarigar Studio',
        position: 'Founder and Brand Designer',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2019-04',
        endDate: '2023-08',
        summary: 'Independent brand studio of two designers and a rotating set of illustrators and photographers.',
        highlights: [
          'Delivered 31 identity projects for restaurants, direct-to-consumer beauty and two non-profits; twelve clients returned for a second engagement.',
          'Designed the identity and packaging for a cold-pressed oils brand that went from three stores to 260 in two years.',
          'Held a fixed-fee model with a two-round revision limit, keeping average project margin above 40% across four years.',
        ],
      },
      {
        id: 'w3',
        name: 'Career break',
        position: 'Family care',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2018-02',
        endDate: '2019-03',
        summary: 'Fourteen months away from full-time work for family care.',
        highlights: [
          'Completed a 90-hour Devanagari lettering course and began the shopfront lettering archive that later became a released typeface.',
          'Took on two identity projects towards the end of the break; both became founding clients of the studio opened in April 2019.',
        ],
      },
      {
        id: 'w4',
        name: 'Charcoal and Chalk',
        position: 'Brand Designer',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2016-06',
        endDate: '2018-01',
        summary: '',
        highlights: [
          'Designed identities and launch campaigns for nine consumer clients, including a tea brand whose packaging redesign lifted sell-through 26% in modern trade.',
          'Set up the artwork archive and its naming convention, which ended the recurring problem of superseded logos reaching print.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Sir J. J. Institute of Applied Art',
        area: 'Applied Art',
        studyType: 'B.F.A.',
        location: 'Mumbai, Maharashtra',
        startDate: '2012-07',
        endDate: '2016-05',
        score: '72%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Shopfront Lettering Archive',
        description:
          'A catalogue of 620 hand-painted Devanagari and Urdu shop signs from Mumbai and Pune, each letterform redrawn.',
        url: 'https://shopfronts.example.com',
        startDate: '2018-06',
        endDate: '',
        highlights: [
          'The redrawn set was released as a free display typeface, downloaded 9,300 times and used on two film title sequences.',
        ],
        keywords: ['Lettering', 'Devanagari', 'Type design'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Brand',
        level: '',
        keywords: [
          'Identity systems',
          'Verbal identity and naming',
          'Brand guidelines',
          'Art direction',
          'Rebrand rollout',
        ],
      },
      {
        id: 's2',
        name: 'Packaging',
        level: '',
        keywords: [
          'Shelf-block design',
          'Structural packaging',
          'Regulatory panels',
          'Master artwork systems',
          'Pre-press and print liaison',
        ],
      },
      {
        id: 's3',
        name: 'Type and craft',
        level: '',
        keywords: ['Typography', 'Devanagari lettering', 'Illustration commissioning', 'Photography direction'],
      },
      {
        id: 's4',
        name: 'Tools',
        level: '',
        keywords: ['Illustrator', 'InDesign', 'Photoshop', 'Figma', 'Esko ArtPro'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Marathi', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
