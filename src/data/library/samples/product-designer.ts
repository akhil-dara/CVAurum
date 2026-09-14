import type { LibrarySample } from '../types'
import { content, monogram } from '../types'
import { portrait } from '../avatar'

/**
 * A designer who arrived from front-end engineering. The career change is
 * told by the work history itself — same employer, engineer then designer —
 * rather than by a paragraph explaining it.
 */
export const sample: LibrarySample = {
  slug: 'product-designer',
  role: 'Product Designer',
  category: 'design',
  seniority: 'mid',
  region: 'us',
  template: 'spotlight',
  blurb:
    "A front-end engineer's move into product design, told in completion rates, support-ticket counts and conversion.",
  keywords: [
    'product designer',
    'UX design',
    'design systems',
    'Figma',
    'career change to design',
    'SaaS product design',
  ],
  content: content({
    basics: {
      name: 'Maya Thornbury',
      label: 'Product Designer',
      image: portrait('Maya Thornbury'),
      email: 'maya.thornbury@example.com',
      phone: '+1 (555) 0137',
      url: 'https://mayathornbury.example.com',
      urlLabel: 'Portfolio',
      summary:
        'Product designer with six years on subscription and healthcare products, the first two of them spent building the front end instead of drawing it. Redesigned a benefits enrollment flow that took completion from 54% to 88% and cut enrollment support calls by nearly two thirds.',
      location: { city: 'Seattle', region: 'WA', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'mayathornbury', url: 'https://linkedin.com/in/mayathornbury' },
        { network: 'Dribbble', username: 'thornbury', url: 'https://dribbble.com/thornbury' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Tidewell Health',
        logo: monogram('T', '#0d9488'),
        position: 'Product Designer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary: 'Member experience group of eleven. Owns enrollment, claim status and the member mobile app.',
        highlights: [
          'Redesigned the benefits enrollment flow around a save-and-resume model, taking completion from 54% to 88% and cutting enrollment support calls 64% in the first open season.',
          'Rebuilt claim status into one timeline after 22 usability sessions showed members could not tell a denied claim from a pending one; claim-status tickets fell from 1,900 a month to 410.',
          'Built the component library the four product teams now share, 38 components with an accessibility note on each, taking a new screen from three days of design to half a day.',
          'Runs the fortnightly critique that gives every shipped screen a named owner and a written decision; design rework after handoff has dropped from 2.8 rounds to 1.',
        ],
      },
      {
        id: 'w2',
        name: 'Kettlebrook Commerce',
        logo: monogram('K', '#b45309'),
        position: 'Product Designer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2021-03',
        endDate: '2022-12',
        summary: '',
        highlights: [
          'Reworked checkout for a 900-merchant marketplace by putting guest purchase ahead of account creation, raising mobile conversion from 1.9% to 3.1%.',
          'Replaced a 14-field seller signup with a five-step flow, taking median setup time from 26 minutes to nine and halving abandoned applications.',
          'Ran the storefront’s first accessibility audit and fixed 61 contrast and focus failures ahead of the WCAG 2.1 AA commitment made to two enterprise merchants.',
        ],
      },
      {
        id: 'w3',
        name: 'Kettlebrook Commerce',
        logo: monogram('K', '#b45309'),
        position: 'Front-End Engineer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2019-07',
        endDate: '2021-02',
        summary: '',
        highlights: [
          'Shipped the React component set behind six storefront surfaces, which the design team later took ownership of as the first version of the design system.',
          'Prototyped the seller dashboard in code rather than in mockups, shortening the build after sign-off from five weeks to two.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Washington',
        area: 'Human Centered Design and Engineering',
        studyType: 'B.S.',
        location: 'Seattle, WA',
        startDate: '2015-09',
        endDate: '2019-06',
        score: '3.7 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Formcheck',
        description: 'A free browser extension that flags form fields missing a label, an error state or a focus ring.',
        url: 'https://formcheck.example.com',
        startDate: '2022-04',
        endDate: '',
        highlights: [
          'About 4,000 installs, 96% of them still active a month later; used in two university accessibility courses.',
        ],
        keywords: ['Accessibility', 'Forms', 'Design QA'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: [
          'Interaction design',
          'Design systems',
          'Information architecture',
          'Prototyping',
          'Accessibility (WCAG 2.1 AA)',
        ],
      },
      {
        id: 's2',
        name: 'Research and measurement',
        level: '',
        keywords: ['Usability testing', 'Concept testing', 'Survey design', 'Funnel analysis', 'A/B test design'],
      },
      {
        id: 's3',
        name: 'Tools and handoff',
        level: '',
        keywords: ['Figma', 'FigJam', 'React', 'Storybook', 'Amplitude', 'Maze'],
      },
    ],
    languages: [{ id: 'l1', language: 'English', fluency: 'Native', rating: 5 }],
  }),
}

export default sample
