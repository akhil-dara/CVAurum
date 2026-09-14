import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * FMCG brand management, where the proof is share and distribution rather than
 * impressions. The graduate scheme is kept short and the current role carries
 * the weight, which is the right shape for six years in.
 */
export const sample: LibrarySample = {
  slug: 'brand-manager',
  role: 'Brand Manager',
  category: 'marketing',
  seniority: 'mid',
  region: 'uk',
  template: 'terrace',
  blurb:
    'Six years in FMCG brand management, argued in value share, distribution and awareness rather than impressions.',
  keywords: [
    'brand manager',
    'FMCG marketing',
    'assistant brand manager',
    'brand strategy',
    'market share',
    'campaign management',
    'shopper marketing',
  ],
  content: content({
    basics: {
      name: 'Oliver Brathwaite',
      label: 'Brand Manager',
      image: '',
      email: 'oliver.brathwaite@example.com',
      phone: '+44 7700 900100',
      url: 'https://oliverbrathwaite.example.com',
      summary:
        'Brand manager with six years in soft drinks and ambient food, owning a £46M sparkling water range end to end. Repositioned it from a diet product to a grown-up soft drink, taking value share from 4.1% to 6.3% in two years.',
      location: { city: 'London', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'oliverbrathwaite', url: 'https://linkedin.com/in/oliverbrathwaite' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Kingsmere Beverages',
        logo: monogram('K', '#0e7490'),
        position: 'Brand Manager',
        location: 'London',
        url: '',
        startDate: '2022-04',
        endDate: '',
        summary: 'Owns a £46M sparkling water range of four SKUs, its P&L, its agency roster and two direct reports.',
        highlights: [
          'Grew value share from 4.1% to 6.3% in 24 months while three own-label ranges entered the category, holding price at a 14% premium.',
          'Led the 2024 repositioning from “no sugar” to “a grown-up soft drink”, lifting unprompted awareness from 19% to 31%.',
          'Ran the brand’s first television and video-on-demand burst on a £2.1M budget; measured sales uplift paid it back 1.7 times inside the year.',
          'Won listings in two of the four major multiples by rebuilding the category story around the 16–24 shopper, adding £5.8M of annual retail sales.',
          'Redesigned the pack after 12 shopper sessions; the time taken to find the range on shelf in eye-tracking tests fell from 4.4 to 2.9 seconds.',
        ],
      },
      {
        id: 'w2',
        name: 'Coldbrook Foods',
        logo: monogram('C', '#b45309'),
        position: 'Assistant Brand Manager',
        location: 'Reading',
        url: '',
        startDate: '2020-01',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Ran the £900k relaunch of a biscuit range; distribution rose from 41% to 68% of stores and the range returned to growth after three declining years.',
          'Analysed 18 months of panel data to delist two SKUs and back a third, taking £310k of trade spend off products that would never repay it.',
          'Organised sampling at 22 summer events, reaching 140,000 people at 19p a contact against a 34p benchmark.',
        ],
      },
      {
        id: 'w3',
        name: 'Windlow Home',
        logo: monogram('W', '#3f3f46'),
        position: 'Marketing Executive, Graduate Programme',
        location: 'Reading',
        url: '',
        startDate: '2018-09',
        endDate: '2019-12',
        summary: '',
        highlights: [
          'Rotated through insight, trade marketing and new product development; built the shopper segmentation still used to brief the design agency.',
          'Coordinated Christmas point-of-sale across 600 stores, delivered on time and 12% under budget.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Exeter',
        area: 'Business Management',
        studyType: 'BA (Hons)',
        location: 'Exeter',
        startDate: '2015-09',
        endDate: '2018-06',
        score: '2:1',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Brand',
        level: '',
        keywords: ['Positioning', 'Pack design', 'Annual planning', 'Portfolio architecture', 'Pricing'],
      },
      {
        id: 's2',
        name: 'Commercial',
        level: '',
        keywords: ['P&L ownership', 'Trade spend', 'Promotional evaluation', 'Category selling stories', 'Forecasting'],
      },
      {
        id: 's3',
        name: 'Insight',
        level: '',
        keywords: [
          'Retail panel data',
          'Brand tracking',
          'Qualitative groups',
          'Concept testing',
          'Econometrics briefs',
        ],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Level 6 Diploma in Professional Marketing',
        date: '2021',
        issuer: 'Chartered Institute of Marketing',
        url: '',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Relaunch of the Year, internal marketing awards',
        date: '2024',
        awarder: 'Kingsmere Beverages',
        summary: '',
      },
    ],
  }),
}

export default sample
