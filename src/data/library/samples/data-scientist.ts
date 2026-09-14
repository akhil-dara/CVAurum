import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Senior, US, and the sample in this set that returns from a career break.
 * The break is a dated entry like any other, said plainly and then left
 * behind: the strongest work on the page is what came after it.
 */
export const sample: LibrarySample = {
  slug: 'data-scientist',
  role: 'Data Scientist',
  category: 'data',
  seniority: 'senior',
  region: 'us',
  template: 'marker',
  blurb:
    'A senior data scientist returning from a planned career break, with the gap stated plainly and the best work after it.',
  keywords: [
    'data scientist',
    'senior data scientist',
    'forecasting',
    'career break return',
    'causal inference',
    'Python',
    'energy analytics',
  ],
  content: content({
    basics: {
      name: 'Naomi Adeyemi',
      label: 'Senior Data Scientist',
      image: '',
      email: 'naomi.adeyemi@example.com',
      phone: '+1 (555) 0154',
      url: 'https://naomiadeyemi.example.com',
      summary:
        "Data scientist with eleven years in healthcare and energy, working mostly on forecasts and risk models other teams depend on daily. Took a utility's day-ahead load forecast from 4.8% to 2.9% mean absolute percentage error, worth roughly $6.1m a year in avoided imbalance charges. Returned from a planned career break in 2023 and now sets the review standard for models that touch billing.",
      location: { city: 'Boston', region: 'MA', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'nadeyemi', url: 'https://github.com/nadeyemi' },
        { network: 'LinkedIn', username: 'naomiadeyemi', url: 'https://linkedin.com/in/naomiadeyemi' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Granite Harbor Power',
        position: 'Senior Data Scientist',
        location: 'Boston, MA',
        url: '',
        startDate: '2023-09',
        endDate: '',
        summary:
          'Forecasting and asset-risk group of eight. Returned at three days a week and moved to full time in March 2024.',
        highlights: [
          'Owns the day-ahead load forecast for 2.4 million meters; mean absolute percentage error fell from 4.8% to 2.9%, about $6.1m a year in avoided imbalance charges.',
          'Built the outage-risk model that ranks 41,000 distribution poles for inspection; crews now find a defect on one visit in three rather than one in eleven.',
          'Set the review standard for any model that touches billing: written assumptions, a fixed backtest window, and a named owner. Eight models cleared it in the first year.',
          'Rewrote the forecast backtest to respect the data available at prediction time, which revealed that two years of reported accuracy had been optimistic by 0.6 points.',
          'Mentors three analysts; two have since shipped production models of their own.',
        ],
      },
      {
        id: 'w2',
        name: 'Career break',
        position: 'Planned career break',
        location: 'Boston, MA',
        url: '',
        startDate: '2022-06',
        endDate: '2023-08',
        summary: 'Full-time family care.',
        highlights: [
          'Completed Harvard Extension School coursework in causal inference and shipped two releases of an open-source forecasting package.',
        ],
      },
      {
        id: 'w3',
        name: 'Alderbrook Health Analytics',
        position: 'Data Scientist',
        location: 'Boston, MA',
        url: '',
        startDate: '2018-03',
        endDate: '2022-05',
        summary: '',
        highlights: [
          'Built the readmission risk model used across nine hospitals; 30-day readmissions in the flagged cohort fell 18% once care management began working its daily list.',
          'Replaced a purchased scoring tool with an in-house gradient-boosted model, matching its accuracy at a twelfth of the cost and making every feature auditable.',
          'Ran the outreach experiment program: 31 tests in two years, four of which changed standing policy.',
        ],
      },
      {
        id: 'w4',
        name: 'Marlowe Insight Partners',
        position: 'Analyst, then Data Scientist',
        location: 'Providence, RI',
        url: '',
        startDate: '2015-07',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Forecast quarterly demand for 14 consumer brands, cutting overstock 27% against the planner-driven method it replaced.',
          'Automated the client reporting pack, returning about 30 analyst hours a month across the team.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Boston University',
        area: 'Statistics',
        studyType: 'M.S.',
        location: 'Boston, MA',
        startDate: '2013-09',
        endDate: '2015-05',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'University of Massachusetts Amherst',
        area: 'Mathematics',
        studyType: 'B.S.',
        location: 'Amherst, MA',
        startDate: '2009-09',
        endDate: '2013-05',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Seasoncast',
        description:
          'An open-source seasonal forecasting package for Python, built for demand and load series with holiday effects.',
        url: 'https://github.com/nadeyemi/seasoncast',
        startDate: '2020-05',
        endDate: '',
        highlights: [
          '940 stars; used in teaching on two graduate forecasting courses and downloaded about 21,000 times a month.',
        ],
        keywords: ['Python', 'Time series', 'Bayesian models'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Modeling',
        level: '',
        keywords: [
          'Time series forecasting',
          'Gradient boosting',
          'Causal inference',
          'Survival analysis',
          'Hierarchical models',
        ],
      },
      { id: 's2', name: 'Tools', level: '', keywords: ['Python', 'R', 'SQL', 'PyTorch', 'Spark', 'Airflow'] },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Backtesting', 'Model review', 'Experiment design', 'Executive briefings', 'Mentoring'],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'Recalibrating Day-Ahead Load Forecasts Under Rising Behind-the-Meter Solar',
        publisher: 'IEEE Transactions on Power Systems',
        releaseDate: '2025-04',
        url: '',
        summary:
          'Co-author. A recalibration method for load forecasts as rooftop solar share changes within a service territory.',
      },
      {
        id: 'pub2',
        name: 'What a Readmission Model Owes the Nurse Reading It',
        publisher: 'Journal of the American Medical Informatics Association',
        releaseDate: '2021-11',
        url: '',
        summary: 'On presenting risk scores in a form a care team can act on during a shift.',
      },
    ],
  }),
}

export default sample
