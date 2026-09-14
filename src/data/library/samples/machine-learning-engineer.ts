import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * Mid level, UK. British spelling throughout, and every model on the page is
 * judged by what it did once it was serving traffic rather than by its
 * offline score. Carries employer monograms on every work entry.
 */
export const sample: LibrarySample = {
  slug: 'machine-learning-engineer',
  role: 'Machine Learning Engineer',
  category: 'data',
  seniority: 'mid',
  region: 'uk',
  template: 'mono',
  blurb:
    'Machine learning that actually reached production in healthcare and retail, judged on live metrics rather than offline scores.',
  keywords: [
    'machine learning engineer',
    'MLOps',
    'PyTorch',
    'model deployment',
    'feature store',
    'recommender systems',
  ],
  content: content({
    basics: {
      name: 'Samir Qureshi',
      label: 'Machine Learning Engineer',
      image: '',
      email: 'samir.qureshi@example.com',
      phone: '+44 7700 900170',
      url: 'https://samirqureshi.example.com',
      summary:
        'Machine learning engineer with seven years putting models into production in healthcare and retail. Owns the referral triage model at a health technology company, where urgent cases now reach a clinician in a median of 40 minutes rather than six hours.',
      location: { city: 'London', countryCode: 'GB' },
      profiles: [
        { network: 'GitHub', username: 'squreshi', url: 'https://github.com/squreshi' },
        { network: 'LinkedIn', username: 'samirqureshi', url: 'https://linkedin.com/in/samirqureshi' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Lumenstack Health',
        logo: monogram('L', '#1d4ed8'),
        position: 'Machine Learning Engineer',
        location: 'London',
        url: '',
        startDate: '2023-06',
        endDate: '',
        summary:
          'Clinical models team of six. Owns triage ranking, the feature store and the release pipeline behind both.',
        highlights: [
          'Owns the triage model that orders 9,000 daily clinical referrals; urgent cases now reach a clinician in a median of 40 minutes rather than six hours.',
          'Built the offline and online parity checks that took training-serving skew from 4.1% of predictions to 0.3%.',
          'Cut inference cost 64% by distilling a 340M-parameter classifier into a 22M student with no measurable loss of recall at the operating threshold.',
          'Set up the shadow-deployment pipeline every release now passes through; it caught two models regressing on under-18 referrals before any patient saw them.',
        ],
      },
      {
        id: 'w2',
        name: 'Bramblewick Retail Group',
        logo: monogram('B', '#9333ea'),
        position: 'Machine Learning Engineer',
        location: 'Manchester',
        url: '',
        startDate: '2021-03',
        endDate: '2023-05',
        summary: '',
        highlights: [
          'Rebuilt size recommendation across a catalogue of 1.4 million items, cutting fit-related returns from 23% to 16% and saving £2.1m a year in handling.',
          'Replaced a nightly batch scorer with a streaming pipeline, so the first three clicks of a visit changed what a shopper was shown in the same session.',
          'Wrote the drift monitoring that flagged a broken colour taxonomy four days before it would have shown up in sales.',
        ],
      },
      {
        id: 'w3',
        name: 'Wrenfield Insight',
        logo: monogram('W', '#0f766e'),
        position: 'Data Scientist',
        location: 'Leeds',
        url: '',
        startDate: '2019-09',
        endDate: '2021-02',
        summary: '',
        highlights: [
          'Built the churn model for a subscription business; its top decile took a retention offer at 3.4 times the control rate.',
          'Automated the weekly modelling refresh, turning a two-day manual routine into 20 minutes and freeing an analyst for experiment design.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Manchester',
        area: 'Computer Science',
        studyType: 'MEng',
        location: 'Manchester',
        startDate: '2015-09',
        endDate: '2019-06',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Driftgauge',
        description: 'An open-source feature-drift monitor for scikit-learn and PyTorch serving pipelines.',
        url: 'https://github.com/squreshi/driftgauge',
        startDate: '2022-01',
        endDate: '',
        highlights: [
          '1,900 stars and 24 contributors; ships a Kubernetes chart and exports drift statistics straight to Prometheus.',
        ],
        keywords: ['Python', 'Prometheus', 'Kubernetes'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Modelling',
        level: '',
        keywords: ['PyTorch', 'scikit-learn', 'XGBoost', 'Distillation', 'Calibration'],
      },
      {
        id: 's2',
        name: 'Production',
        level: '',
        keywords: ['Kubernetes', 'MLflow', 'Feature stores', 'Ray Serve', 'Shadow deployment'],
      },
      { id: 's3', name: 'Data', level: '', keywords: ['Python', 'SQL', 'Spark', 'Airflow', 'Snowflake'] },
      {
        id: 's4',
        name: 'Practice',
        level: '',
        keywords: ['Drift monitoring', 'Experiment design', 'Clinical safety review', 'Code review'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Urdu', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
