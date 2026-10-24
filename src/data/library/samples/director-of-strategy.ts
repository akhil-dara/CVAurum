import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Lead level, US. The career shape is the argument: strategy, then a two-year
 * operating stint running a real P&L, then strategy again — so the operating
 * role keeps its margin numbers rather than being compressed into one line.
 * The board seat uses a custom section, which is what they exist for.
 */
export const sample: LibrarySample = {
  slug: 'director-of-strategy',
  role: 'Director of Strategy',
  category: 'business',
  seniority: 'lead',
  region: 'us',
  template: 'pinnacle',
  blurb:
    'A strategy leader with an operating stint in the middle, and the portfolio, deal and margin numbers to show for it.',
  keywords: [
    'director of strategy',
    'corporate strategy',
    'corporate development',
    'head of strategy',
    'M&A and portfolio review',
    'strategic planning leader',
  ],
  guide: {
    why: [
      'The two-year General Manager, Aftermarket Parts role sits in the middle of a strategy career, and its bullets prove operating credibility: margin “from 11% to 17%” with flat headcount. Strategy hires with P&L time are rare and this résumé makes it visible.',
      'Deals are given a count and a value, four acquisitions worth $210M, and the largest is named for what it did: the $96M deal that opened a European service footprint.',
      'The portfolio review bullet shows the hard call: two product lines retired because they took 19% of R&D spend for 3% of gross profit. A strategy leader is hired to make that kind of decision and defend it with numbers.',
      'Three roles at Marrowstone Industrial Systems are listed separately, showing a path from corporate development to director, with the Kellogg MBA and consulting years at Thornbury & Crane as the foundation.',
    ],
    faq: [
      {
        q: 'How should a director of strategy resume show impact?',
        a: 'Tie each strategic decision to a financial result: revenue mix shifted, margin recovered, deals closed with their value, spend redirected. Planning and analysis without an outcome reads as consulting support rather than leadership.',
      },
      {
        q: 'Should a strategy resume include consulting experience?',
        a: 'Yes, but keep it short at director level. Two bullets with the number of engagements and one quantified client result are enough; the space belongs to the in-house roles where you owned the decisions.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Lena Marchetti',
      label: 'Director of Corporate Strategy',
      image: '',
      email: 'lena.marchetti@example.com',
      phone: '+1 (555) 0164',
      url: 'https://lenamarchetti.example.com',
      summary:
        'Strategy leader for a $600M industrial software business, twelve years across corporate strategy, corporate development and two years running a parts P&L. Built the three-year plan that moved 38% of revenue to subscription and closed four acquisitions worth $210M.',
      location: { city: 'Seattle', region: 'WA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'lenamarchetti', url: 'https://linkedin.com/in/lenamarchetti' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Marrowstone Industrial Systems',
        position: 'Director of Corporate Strategy',
        location: 'Seattle, WA',
        url: '',
        startDate: '2022-01',
        endDate: '',
        summary:
          'Leads a team of six. Owns the three-year plan, the acquisition pipeline and the quarterly portfolio review.',
        highlights: [
          'Built the three-year plan that moved 38% of revenue from perpetual licenses to subscription, lifting gross retention to 93% and adding $74M of recurring revenue.',
          'Sourced and closed four acquisitions worth $210M, including the $96M deal that gave the company its first European service footprint.',
          'Retired two product lines after a portfolio review showed they took 19% of R&D spend for 3% of gross profit, redirecting 34 engineers.',
          'Replaced eight bespoke unit reporting formats with one scorecard, which is now what the quarterly review runs on.',
          'Grew the team from two to six and moved three of them into operating roles in the units they had studied.',
        ],
      },
      {
        id: 'w2',
        name: 'Marrowstone Industrial Systems',
        position: 'General Manager, Aftermarket Parts',
        location: 'Portland, OR',
        url: '',
        startDate: '2020-02',
        endDate: '2021-12',
        summary: 'Two-year operating assignment running a $58M parts business of 40 people.',
        highlights: [
          'Took operating margin from 11% to 17% in under two years while holding headcount flat.',
          'Launched the online parts store that now takes 29% of orders and cut quote turnaround from two days to 20 minutes.',
          'Renegotiated seven supplier contracts covering 61% of spend, saving $3.8M a year.',
        ],
      },
      {
        id: 'w3',
        name: 'Marrowstone Industrial Systems',
        position: 'Manager, Corporate Development',
        location: 'Seattle, WA',
        url: '',
        startDate: '2018-07',
        endDate: '2020-01',
        summary: '',
        highlights: [
          'Screened 140 targets and built the diligence model still used on every deal in the pipeline.',
          'Ran integration planning for a $45M acquisition, which delivered its $6M of year-one cost savings two quarters early.',
        ],
      },
      {
        id: 'w4',
        name: 'Thornbury & Crane',
        position: 'Consultant',
        location: 'Chicago, IL',
        url: '',
        startDate: '2014-07',
        endDate: '2016-07',
        summary: '',
        highlights: [
          'Advised industrial and distribution clients on growth strategy across 14 engagements, three of which became multi-year mandates.',
          'Built the pricing model for a $900M distributor that recovered 240 basis points of gross margin in its first year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Northwestern University, Kellogg School of Management',
        area: 'Business Administration',
        studyType: 'MBA',
        location: 'Evanston, IL',
        startDate: '2016-09',
        endDate: '2018-06',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Michigan',
        area: 'Industrial and Operations Engineering',
        studyType: 'B.S.E.',
        location: 'Ann Arbor, MI',
        startDate: '2010-09',
        endDate: '2014-05',
        score: '3.8 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Strategy',
        level: '',
        keywords: [
          'Three-year planning',
          'Portfolio review',
          'Market sizing',
          'Competitive analysis',
          'Pricing strategy',
        ],
      },
      {
        id: 's2',
        name: 'Corporate development',
        level: '',
        keywords: ['Deal sourcing', 'Valuation modeling', 'Due diligence', 'Integration planning', 'Benefit tracking'],
      },
      {
        id: 's3',
        name: 'Operating',
        level: '',
        keywords: ['P&L ownership', 'Supplier negotiation', 'Board communication', 'Sales compensation design'],
      },
    ],
    custom: [
      {
        id: 'cs1',
        name: 'Board and Advisory',
        items: [
          {
            id: 'ci1',
            name: 'Puget Manufacturing Alliance',
            subtitle: 'Board Director, Workforce Committee Chair',
            date: '2023 – Present',
            location: 'Seattle, WA',
            url: '',
            summary: 'Trade association of 120 Pacific Northwest manufacturers.',
            highlights: [
              'Chairs the apprenticeship committee, which placed 210 apprentices with member firms in 2025.',
            ],
          },
        ],
      },
    ],
  }),
}

export default sample
