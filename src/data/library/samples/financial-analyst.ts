import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Two years in, and the résumé still has to earn the interview on results. Every
 * bullet here names a forecast, a reconciliation or a report that changed, and
 * the education block does the work a longer history would otherwise do.
 */
export const sample: LibrarySample = {
  slug: 'financial-analyst',
  role: 'Financial Analyst',
  category: 'finance',
  seniority: 'entry',
  region: 'us',
  template: 'harvard',
  blurb:
    'Two years of corporate FP&A written as forecast error removed, hours returned and dollars caught before close.',
  keywords: [
    'financial analyst',
    'FP&A analyst',
    'entry level finance',
    'forecasting and budgeting',
    'variance analysis',
    'CFA Level I',
    'financial modeling',
  ],
  content: content({
    basics: {
      name: 'Devin Aguilar',
      label: 'Financial Analyst',
      image: '',
      email: 'devin.aguilar@example.com',
      phone: '+1 (555) 0118',
      url: 'https://devinaguilar.example.com',
      summary:
        'Financial analyst two years into corporate FP&A, owning the monthly forecast for a $180M household care portfolio. Rebuilt that forecast as a driver-based model and took mean absolute error from 11% to 4% in three quarters.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'devinaguilar', url: 'https://linkedin.com/in/devinaguilar' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Trelane Consumer Goods',
        position: 'Financial Analyst',
        location: 'Chicago, IL',
        url: '',
        startDate: '2024-07',
        endDate: '',
        summary: 'FP&A for the household care portfolio, $180M of annual revenue across four plants.',
        highlights: [
          'Rebuilt the volume forecast as a driver-based model, cutting mean absolute forecast error on the household care line from 11% to 4% over three quarters.',
          'Automated the monthly variance pack in Power Query, replacing 14 hours of manual consolidation with a 20-minute refresh.',
          'Caught a $420k freight accrual error during the Q3 close by tying carrier invoices back to the shipment log, correcting the number before it reached the board pack.',
          'Prepares the monthly spend review for four plant managers, tracking 62 cost centers against budget and flagging overruns in the first week.',
        ],
      },
      {
        id: 'w2',
        name: 'Brackenfield Savings Bank',
        position: 'Junior Financial Analyst',
        location: 'Chicago, IL',
        url: '',
        startDate: '2023-06',
        endDate: '2024-06',
        summary: '',
        highlights: [
          'Built the branch profitability model for 28 locations, surfacing two branches whose deposit spread had gone negative and supporting a consolidation that saved $310k a year.',
          'Produced the quarterly rate sensitivity analysis used by the asset-liability committee, taking its preparation from five days to one.',
          'Corrected six years of cost center mapping in the general ledger, clearing 1,100 misclassified entries before the annual audit.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Illinois Urbana-Champaign',
        area: 'Finance',
        studyType: 'B.S.',
        location: 'Champaign, IL',
        startDate: '2019-08',
        endDate: '2023-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: ['Corporate Valuation', 'Financial Modeling', 'Intermediate Accounting', 'Econometrics'],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Cook County Budget Explorer',
        description:
          'A public dashboard that breaks 12 years of county budget data into department, fund and per-resident views.',
        url: 'https://budget.devinaguilar.example.com',
        startDate: '2024-01',
        endDate: '',
        highlights: [
          'Cited by two local newsrooms during the 2025 budget hearings and used by roughly 4,000 visitors that month.',
        ],
        keywords: ['Power BI', 'SQL', 'Public finance'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Analysis',
        level: '',
        keywords: [
          'Driver-based forecasting',
          'Variance analysis',
          'Three-statement modeling',
          'Scenario planning',
          'Working capital',
        ],
      },
      {
        id: 's2',
        name: 'Tools',
        level: '',
        keywords: ['Excel', 'Power Query', 'Power BI', 'SQL', 'NetSuite', 'Anaplan'],
      },
      {
        id: 's3',
        name: 'Reporting',
        level: '',
        keywords: ['Month-end close support', 'Board packs', 'KPI dashboards', 'Budget cycle coordination'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Passed Level I of the CFA Program', date: '2025', issuer: 'CFA Institute', url: '' },
      { id: 'c2', name: 'Bloomberg Market Concepts', date: '2023', issuer: 'Bloomberg', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Spanish', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
