import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Mid level, US. An analyst's résumé fails when it lists tools, so every line
 * here names the planning decision the analysis changed and what the number
 * moved to. The side project is the one place a tool is allowed to be the point.
 */
export const sample: LibrarySample = {
  slug: 'supply-chain-analyst',
  role: 'Supply Chain Analyst',
  category: 'operations',
  seniority: 'mid',
  region: 'us',
  template: 'deedy',
  blurb:
    'Five years of demand planning shown as forecast error removed, working capital released and freight taken out.',
  keywords: [
    'supply chain analyst',
    'demand planning',
    'forecast accuracy',
    'inventory optimization',
    'S&OP',
    'SAP IBP',
    'logistics analytics',
  ],
  content: content({
    basics: {
      name: 'Jordan Okafor',
      label: 'Supply Chain Analyst',
      image: '',
      email: 'jordan.okafor@example.com',
      phone: '+1 (555) 0126',
      url: 'https://jordanokafor.example.com',
      summary:
        'Supply chain analyst with five years in consumer-goods planning. Owns forecasting and inventory policy for a 640-SKU portfolio, where forecast error fell from 31% to 18% and $2.4m of working capital came out of safety stock without moving fill rate.',
      location: { city: 'Columbus', region: 'OH', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'jordanokafor', url: 'https://linkedin.com/in/jordanokafor' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ambervale Brands',
        position: 'Senior Supply Chain Analyst',
        location: 'Columbus, OH',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary:
          'Demand and inventory planning for a 640-SKU household goods portfolio across four distribution centers.',
        highlights: [
          'Cut weighted forecast error from 31% to 18% by rebuilding the statistical baseline in Python and holding a weekly consensus review with sales.',
          'Released $2.4m of working capital by resetting safety stock to service-level targets by SKU class, with fill rate steady at 98.2%.',
          'Built the S&OP dashboard the monthly meeting now runs on, replacing nine hand-cut spreadsheets and four days of prep with a two-hour refresh.',
          'Found $780k of annual freight savings by consolidating 11 LTL lanes into weekly truckloads; nine lanes went live inside the year.',
        ],
      },
      {
        id: 'w2',
        name: 'Foxglove Naturals',
        position: 'Supply Chain Analyst',
        location: 'Cincinnati, OH',
        url: '',
        startDate: '2021-03',
        endDate: '2022-12',
        summary: '',
        highlights: [
          'Took expedited freight from 14% of outbound cost to 5% by moving replenishment from monthly to weekly buckets.',
          'Cleaned 4,100 item master records, closing a six-point gap between system and physical on-hand that had caused 200 short-ships a quarter.',
          'Modeled the network case for a fifth distribution center; the chosen site cut average outbound miles per order by 22%.',
        ],
      },
      {
        id: 'w3',
        name: 'Halloway Paper Co.',
        position: 'Inventory Analyst',
        location: 'Dayton, OH',
        url: '',
        startDate: '2019-07',
        endDate: '2021-02',
        summary: '',
        highlights: [
          'Ran cycle counts across 12,000 bin locations, lifting inventory record accuracy from 91% to 99.1% in eleven months.',
          'Automated the weekly slow-mover report in SQL, freeing six hours a week and surfacing $310k of obsolete stock for markdown.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Ohio State University',
        area: 'Operations Management',
        studyType: 'B.S.',
        location: 'Columbus, OH',
        startDate: '2015-08',
        endDate: '2019-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Lane Cost Explorer',
        description:
          'A planning tool that prices any origin–destination pair across parcel, LTL and truckload from the carrier rate tables.',
        url: '',
        startDate: '2023-06',
        endDate: '',
        highlights: [
          'Used by 30 planners in two divisions; its consolidation cases are now the standard input to the annual carrier bid.',
        ],
        keywords: ['Python', 'pandas', 'Streamlit'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Planning',
        level: '',
        keywords: ['Demand forecasting', 'S&OP', 'Safety stock modeling', 'Inventory policy', 'MRP', 'Network design'],
      },
      {
        id: 's2',
        name: 'Analysis',
        level: '',
        keywords: ['SQL', 'Python', 'Power BI', 'Excel modeling', 'Statistical forecasting'],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['SAP IBP', 'SAP ECC', 'Kinaxis', 'Snowflake'],
      },
      {
        id: 's4',
        name: 'Measures',
        level: '',
        keywords: ['Forecast accuracy', 'Fill rate', 'Days of supply', 'OTIF', 'Cost per case'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Supply Chain Professional (CSCP)', date: '2023', issuer: 'ASCM', url: '' },
      { id: 'c2', name: 'Certified Six Sigma Green Belt', date: '2021', issuer: 'ASQ', url: '' },
    ],
  }),
}

export default sample
