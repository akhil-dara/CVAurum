import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Credit risk is judged on portfolio outcomes, so every bullet here carries the
 * metric the discipline actually argues about: Gini, default rate, gross NPA,
 * recovery. The articleship stays on the page because it explains where the
 * audit instinct in the later roles came from.
 */
export const sample: LibrarySample = {
  slug: 'risk-manager',
  role: 'Risk Manager',
  category: 'finance',
  seniority: 'senior',
  region: 'india',
  template: 'newton',
  blurb:
    'Credit risk across an NBFC and a bank, told in scorecard lift, default rates and the provisioning model auditors accepted.',
  keywords: [
    'credit risk manager',
    'risk management NBFC',
    'FRM certified',
    'scorecard development',
    'Ind AS 109 ECL',
    'portfolio monitoring',
    'chartered accountant risk',
  ],
  guide: {
    why: [
      'The scorecard bullet gives both the model metric and the business outcome: Gini lifted “from 0.38 to 0.56” on 240,000 accounts and 12-month default on new business from 3.1% to 1.7%.',
      'Results are set against a benchmark: gross NPA held at 2.4% through the 2020 moratorium, “against a sector average near 6%”, which lets a credit committee judge the work without extra context.',
      'The Ind AS 109 expected credit loss documentation accepted “with no model-risk observation” shows the regulatory side of the job that a senior credit risk role is measured on.',
      'The articleship at Bhide Karnik & Co. stays, with ₹4.2 crore of misclassified advances found, and CA and FRM sit in the headline, explaining the audit instinct in the later roles.',
    ],
    faq: [
      {
        q: "Should a CA's resume for a risk role include the articleship?",
        a: 'Yes, briefly. Two bullets on audits and findings show where the audit instinct comes from, and Indian employers expect to see the articleship. Keep it at the end of the work history once there are senior roles above it.',
      },
      {
        q: 'What should a credit risk manager resume include?',
        a: 'Book size, portfolio outcomes (default rates, gross NPA, recoveries), model metrics such as Gini, and the rules you worked under, such as RBI prudential norms and Ind AS 109. Certifications like FRM belong near the top.',
      },
      {
        q: 'How long should a senior risk manager resume be?',
        a: 'Two pages for eleven or more years. Give the current role up to five bullets and older roles two or three; a publication or a CA rank can stay as single lines.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Neha Bhandari',
      label: 'Senior Manager, Credit Risk | CA, FRM',
      image: '',
      email: 'neha.bhandari@example.com',
      phone: '+91 12345 38207',
      url: '',
      summary:
        'Credit risk leader with eleven years across housing finance, banking and audit, owning policy, scorecards and provisioning for an ₹8,600 crore book. Cut 12-month default on new business from 3.1% to 1.7% by rebuilding the scorecard.',
      location: { city: 'Mumbai', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'nehabhandari', url: 'https://linkedin.com/in/nehabhandari' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Aranyaka Housing Finance Limited',
        position: 'Senior Manager, Credit Risk',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2022-08',
        endDate: '',
        summary: 'Credit risk for an ₹8,600 crore affordable housing book, with a team of nine.',
        highlights: [
          'Owns credit policy, underwriting standards and the quarterly provisioning review for the full affordable housing portfolio.',
          'Rebuilt the application scorecard on 240,000 historical accounts, lifting the Gini from 0.38 to 0.56 and taking 12-month default on new business from 3.1% to 1.7%.',
          'Moved early-warning monitoring from a monthly report to a daily rules engine, giving collections a 21-day head start on accounts that later rolled past 90 days.',
          'Wrote the Ind AS 109 expected credit loss model documentation that the statutory auditors accepted with no model-risk observation.',
          'Grew the risk team from four to nine, including two analysts who now own the scorecard and the loss model outright.',
        ],
      },
      {
        id: 'w2',
        name: 'Anvesha Credit Bank Limited',
        position: 'Manager, Credit Risk',
        location: 'Mumbai, Maharashtra',
        url: '',
        startDate: '2019-04',
        endDate: '2022-07',
        summary: '',
        highlights: [
          'Held gross non-performing assets at 2.4% on a ₹3,200 crore MSME portfolio through the 2020 moratorium, against a sector average near 6%.',
          'Designed the restructuring framework applied to 1,900 accounts under the Reserve Bank of India resolution window, recovering 83% of restructured principal within two years.',
          'Cut the average credit decision from nine days to four by routing 62% of applications through a rules-based auto-decision path.',
        ],
      },
      {
        id: 'w3',
        name: 'Rasika Finance Limited',
        position: 'Credit Analyst',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2015-09',
        endDate: '2019-03',
        summary: '',
        highlights: [
          'Appraised 340 secured business loan proposals worth ₹610 crore, with two-year delinquency of 1.1% against a portfolio average of 2.8%.',
          'Closed a single sourcing channel after a sample audit found forged bank statements in 19 of 40 files pulled.',
          'Wrote the branch credit manual still used across 22 locations.',
        ],
      },
      {
        id: 'w4',
        name: 'Bhide Karnik & Co., Chartered Accountants',
        position: 'Articled Assistant',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2012-08',
        endDate: '2015-07',
        summary: '',
        highlights: [
          'Completed statutory and concurrent audits across 26 branches of two co-operative banks during the articleship.',
          'Prepared loan review memoranda identifying ₹4.2 crore of advances misclassified as standard assets.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Institute of Chartered Accountants of India',
        area: 'Chartered Accountancy',
        studyType: 'CA',
        location: 'Pune, Maharashtra',
        startDate: '2012-08',
        endDate: '2015-11',
        score: 'All India Rank 214, Final examination',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Narsee Monjee College of Commerce and Economics, University of Mumbai',
        area: 'Commerce',
        studyType: 'B.Com',
        location: 'Mumbai, Maharashtra',
        startDate: '2009-06',
        endDate: '2012-04',
        score: '78%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Credit risk',
        level: '',
        keywords: [
          'Underwriting policy',
          'Scorecard development',
          'Portfolio monitoring',
          'Early warning signals',
          'Collections strategy',
          'Restructuring frameworks',
        ],
      },
      {
        id: 's2',
        name: 'Modelling and regulation',
        level: '',
        keywords: [
          'Ind AS 109 expected credit loss',
          'RBI prudential norms',
          'Basel III',
          'Stress testing',
          'Model validation',
        ],
      },
      {
        id: 's3',
        name: 'Analytics',
        level: '',
        keywords: ['SQL', 'Python', 'SAS', 'Logistic regression', 'Power BI', 'Excel'],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'Early Warning Signals in Affordable Housing Finance',
        publisher: 'The Chartered Accountant, ICAI',
        releaseDate: '2024-07',
        url: '',
        summary:
          'A field note on moving delinquency detection from monthly reporting to daily rules, with results from one book.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Financial Risk Manager (FRM)',
        date: '2021',
        issuer: 'Global Association of Risk Professionals',
        url: '',
      },
      {
        id: 'c2',
        name: 'Certified Credit Professional',
        date: '2018',
        issuer: 'Indian Institute of Banking and Finance',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'English', fluency: 'Full professional', rating: 5 },
      { id: 'l3', language: 'Marathi', fluency: 'Professional', rating: 4 },
    ],
  }),
}

export default sample
