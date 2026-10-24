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
  guide: {
    why: [
      'The backtest-to-live gap is stated as a number, narrowed “from 180 to 35 basis points a year”, which answers the first question any portfolio manager asks of quant research: does it survive real trading.',
      'The look-ahead bias found at Brightmoor Asset Management is credited for stopping two strategies before launch, research discipline a reader values as much as the 1.4% annualised the equity model added.',
      'Reproducibility is written as a standard others use: every backtest “reproduces from one command against pinned data”, which signals seniority on a buy-side team where research has to be audited.',
      'Credentials stay short and relevant: CFA and FRM, an Oxford MSc with Distinction and a Warwick First, listed once and without coursework, as is usual on a senior UK CV.',
    ],
    faq: [
      {
        q: 'How long should a quant CV be in the UK?',
        a: 'Two pages for a senior quant with around nine years; one page for graduates. Keep education brief once you have live trading results, and leave a full publications list off unless the role is research-led.',
      },
      {
        q: 'Should a quantitative analyst CV list programming languages?',
        a: 'Yes, in a short skills group, naming Python, C++ or kdb+/q exactly as you use them. The bullets should then show what the code did, for example cutting a nightly risk run from six hours to 40 minutes.',
      },
      {
        q: 'Does a quant analyst CV need a photo or date of birth in the UK?',
        a: 'No. UK CVs leave out photos, date of birth and marital status. Name, location, email, phone and a LinkedIn or GitHub link are enough for the header.',
      },
    ],
  },
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
