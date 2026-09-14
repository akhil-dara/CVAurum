import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * Broadcast promos, then three years of contract work, then in-house product
 * motion. The freelance stretch is a role with numbers on it rather than a
 * hole in the timeline, which is what makes a mixed history read well.
 */
export const sample: LibrarySample = {
  slug: 'motion-designer',
  role: 'Motion Designer',
  category: 'design',
  seniority: 'mid',
  region: 'us',
  template: 'creative',
  blurb: 'Broadcast promos into product motion, with churn, render hours and first-cut acceptance doing the talking.',
  keywords: [
    'motion designer',
    'motion graphics',
    'After Effects',
    'UI animation',
    'freelance motion design',
    'brand video',
  ],
  content: content({
    basics: {
      name: 'Theo Marchetti',
      label: 'Motion Designer',
      image: portrait('Theo Marchetti'),
      email: 'theo.marchetti@example.com',
      phone: '+1 (555) 0173',
      url: 'https://theomarchetti.example.com',
      urlLabel: 'Reel',
      summary:
        'Motion designer with eight years across broadcast promos and product marketing, three of them freelance across 19 clients. Built the animated onboarding sequence that cut first-week churn on a fitness app from 34% to 21%. Now directs a two-person animation team and the motion system the product engineers apply themselves.',
      location: { city: 'Brooklyn', region: 'NY', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'theomarchetti', url: 'https://linkedin.com/in/theomarchetti' },
        { network: 'YouTube', username: 'marchettimotion', url: 'https://youtube.com/@marchettimotion' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Halyard Fitness',
        position: 'Motion Designer',
        location: 'Brooklyn, NY',
        url: '',
        startDate: '2023-05',
        endDate: '',
        summary: 'Brand studio of seven inside a subscription fitness product.',
        highlights: [
          'Built the animated onboarding sequence that replaced four static tutorial screens, cutting first-week churn from 34% to 21% across 260,000 new members.',
          'Set the motion system of six easing curves and three durations that product engineers now apply themselves, ending the inconsistent-transition bugs that had run at nine a quarter.',
          'Cut render time on the weekly social set from nine hours to 40 minutes by templating the sequences and rendering through a queue script.',
          'Directs two animators and an outside illustrator on every campaign; the last four launched on the date first promised.',
        ],
      },
      {
        id: 'w2',
        name: 'Independent',
        position: 'Freelance Motion Designer',
        location: 'Brooklyn, NY',
        url: '',
        startDate: '2020-02',
        endDate: '2023-04',
        summary: 'Contract motion design for agencies, two streaming networks and three software companies.',
        highlights: [
          'Delivered 60 spots and title sequences across 19 clients, 94% of them accepted on the first or second cut.',
          'Animated a six-part claims explainer for an insurer whose support team credits it with a 28% drop in calls about eligibility.',
          'Ran the whole pipeline alone, from bid and storyboard through animation, sound and delivery, on budgets from $3,000 to $70,000.',
        ],
      },
      {
        id: 'w3',
        name: 'Crestline Broadcast Group',
        position: 'Promo Editor and Animator',
        location: 'Newark, NJ',
        url: '',
        startDate: '2018-07',
        endDate: '2020-01',
        summary: '',
        highlights: [
          'Cut 300 on-air promos a year for four cable networks, turning a same-day brief into a delivered spot in under three hours.',
          'Rebuilt the network ident package in 3D; the brand team kept it on air for the following four seasons.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'New York University',
        area: 'Film and Television, Tisch School of the Arts',
        studyType: 'B.F.A.',
        location: 'New York, NY',
        startDate: '2014-09',
        endDate: '2018-05',
        score: '',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Kinetic Kit',
        description:
          'A free pack of 40 After Effects expressions for interface motion, each with a one-page rule sheet.',
        url: 'https://kinetickit.example.com',
        startDate: '2022-01',
        endDate: '',
        highlights: ['Downloaded 11,000 times; three studios list it in their onboarding documents for new animators.'],
        keywords: ['After Effects', 'UI motion', 'Expressions'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Motion',
        level: '',
        keywords: [
          '2D animation',
          'Title sequences',
          'UI motion systems',
          'Storyboarding',
          'Cel animation',
          'Sound design',
        ],
      },
      {
        id: 's2',
        name: '3D and finishing',
        level: '',
        keywords: ['Cinema 4D', 'Redshift', 'Rotoscoping', 'Camera tracking', 'Color grading'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['After Effects', 'Premiere Pro', 'Cinema 4D', 'DaVinci Resolve', 'Figma', 'Lottie'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Italian', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
