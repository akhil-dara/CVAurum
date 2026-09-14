import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Senior, UK, buy side. A quant page is read for two things: whether the
 * research survives contact with live trading, and whether anyone else can
 * reproduce it. Both are stated as numbers rather than as adjectives.
 */
export const sample: LibrarySample = {
  slug: 'quantitative-analyst',
  role: 'Quantitative Analyst',
  category: 'data',
  seniority: 'senior',
  region: 'uk',
  template: 'minimal',
  blurb:
    'Nine years of quant research across market risk, equity and credit, with the backtest-versus-live gap stated as a number.',
  keywords: [
    'quantitative analyst',
    'quant researcher',
    'factor models',
    'systematic credit',
    'CFA',
    'Python',
    'market risk',
  ],
  content: content({
    basics: {
      name: 'Tobias Renshaw',
      label: 'Senior Quantitative Analyst',
      image: '',
      email: 'tobias.renshaw@example.com',
      phone: '+44 7700 900205',
      url: '',
      summary:
        "Quantitative analyst with nine years across market risk, systematic equity and systematic credit. Rebuilt a credit desk's transaction-cost model so that backtested and live returns now differ by 35 basis points a year rather than 180. CFA charterholder, and author of the research replication standard the quant team works to.",
      location: { city: 'London', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'tobiasrenshaw', url: 'https://linkedin.com/in/tobiasrenshaw' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Ferngate Capital',
        position: 'Senior Quantitative Analyst',
        location: 'London',
        url: '',
        startDate: '2022-05',
        endDate: '',
        summary:
          'Systematic credit desk. Research team of five, working alongside two portfolio managers and the execution desk.',
        highlights: [
          "Researches and maintains three of the nine live signals on a systematic credit book, together carrying about 40% of the strategy's risk budget.",
          'Rebuilt the transaction-cost model from quoted spreads to realised fills, narrowing the gap between backtested and live returns from 180 to 35 basis points a year.',
          'Built the intraday liquidity screen that stopped the desk trading 140 bonds it could not exit within a day; turnover fell 9% and slippage 22%.',
          'Wrote the replication standard now used across the quant team: every backtest reproduces from one command against pinned data and a pinned environment.',
        ],
      },
      {
        id: 'w2',
        name: 'Brightmoor Asset Management',
        position: 'Quantitative Analyst',
        location: 'London',
        url: '',
        startDate: '2019-02',
        endDate: '2022-04',
        summary: '',
        highlights: [
          'Designed the multi-factor equity model behind a £780m fund, adding 1.4% annualised over the scorecard it replaced across four years of live trading.',
          'Cut the nightly risk run from six hours to 40 minutes by vectorising covariance estimation and caching factor exposures between portfolios.',
          'Found a look-ahead bias in the earnings-revision factor that had flattered five years of research, retiring two proposed strategies before launch.',
        ],
      },
      {
        id: 'w3',
        name: 'Castlereagh Bank',
        position: 'Quantitative Analyst, Market Risk',
        location: 'London',
        url: '',
        startDate: '2017-07',
        endDate: '2019-01',
        summary: '',
        highlights: [
          'Built the value-at-risk backtesting programme that cleared the 2018 internal model review with no findings raised.',
          'Automated daily stress testing across 12 portfolios, replacing a four-hour manual spreadsheet routine with a 15-minute scheduled run.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Oxford',
        area: 'Statistical Science',
        studyType: 'MSc',
        location: 'Oxford',
        startDate: '2016-10',
        endDate: '2017-06',
        score: 'Distinction',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Warwick',
        area: 'Mathematics',
        studyType: 'BSc',
        location: 'Coventry',
        startDate: '2013-09',
        endDate: '2016-06',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Quantitative methods',
        level: '',
        keywords: [
          'Factor modelling',
          'Time series',
          'Portfolio optimisation',
          'Transaction cost analysis',
          'Bayesian shrinkage',
        ],
      },
      { id: 's2', name: 'Programming', level: '', keywords: ['Python', 'C++', 'kdb+/q', 'SQL', 'pandas', 'NumPy'] },
      {
        id: 's3',
        name: 'Markets',
        level: '',
        keywords: ['Corporate credit', 'Equity factors', 'Market risk', 'Execution', 'Regulatory capital'],
      },
      {
        id: 's4',
        name: 'Infrastructure',
        level: '',
        keywords: ['Reproducible research', 'Backtesting frameworks', 'Git', 'Airflow', 'Containerised environments'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Chartered Financial Analyst (CFA)', date: '2021', issuer: 'CFA Institute', url: '' },
      { id: 'c2', name: 'Financial Risk Manager (FRM)', date: '2019', issuer: 'GARP', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'German', fluency: 'Professional', rating: 3 },
    ],
  }),
}

export default sample
