import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * A graduate whose history has three strands at once — a placement, a year of
 * freelance alongside the final year, and a first in-house post. Written so a
 * reader sees a continuous timeline rather than a gap that needs explaining.
 */
export const sample: LibrarySample = {
  slug: 'graphic-designer',
  role: 'Graphic Designer',
  category: 'design',
  seniority: 'entry',
  region: 'uk',
  template: 'creative',
  blurb:
    'A print-first graduate designer for charities and venues, with ticket sales, print spend and reprints as the measures.',
  keywords: [
    'graphic designer',
    'junior graphic designer',
    'print design',
    'brand identity',
    'InDesign',
    'charity design',
    'UK graduate designer',
  ],
  content: content({
    basics: {
      name: 'Freya Ashcombe',
      label: 'Graphic Designer',
      image: portrait('Freya Ashcombe'),
      email: 'freya.ashcombe@example.com',
      phone: '+44 7700 900142',
      url: 'https://freyaashcombe.example.com',
      urlLabel: 'Portfolio',
      summary:
        'Graphic designer a year out of a First Class BA, working across print and screen for charities and small cultural venues. Redesigned a theatre’s season brochure and its booking emails onto one grid and one colour system, after which advance ticket sales rose 23% on the previous season.',
      location: { city: 'Manchester', region: 'Greater Manchester', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'freyaashcombe', url: 'https://linkedin.com/in/freyaashcombe' },
        { network: 'Behance', username: 'ashcombe', url: 'https://behance.net/ashcombe' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Northlight Trust',
        position: 'Graphic Designer',
        location: 'Manchester',
        url: '',
        startDate: '2025-07',
        endDate: '',
        summary: 'Sole designer for an arts charity running a 400-seat theatre and a community print programme.',
        highlights: [
          'Redesigned the season brochure and the booking emails around one grid and one colour system; advance ticket sales rose 23% on the previous season.',
          'Wrote and drew the 14-page brand guide the four staff who make posters now follow, ending a run of off-brand flyers reprinted at the charity’s own expense.',
          'Cut annual print spend by £8,400 by standardising on three paper stocks and moving the monthly listings sheet to a single folded A3.',
          'Designs the large-print and easy-read version of every programme; requests for them have trebled since they were first offered.',
        ],
      },
      {
        id: 'w2',
        name: 'Freelance',
        position: 'Graphic Designer',
        location: 'Manchester',
        url: '',
        startDate: '2024-08',
        endDate: '2025-06',
        summary: 'Self-employed, alongside the final year of the degree.',
        highlights: [
          'Designed identities, menus and signage for six independent Manchester businesses on fees from £400 to £2,200, each delivered inside a two-week brief.',
          'Introduced a fixed three-tier pricing sheet after the first two projects overran; every job since has closed on budget.',
        ],
      },
      {
        id: 'w3',
        name: 'Copperfold Studio',
        position: 'Design Placement',
        location: 'Leeds',
        url: '',
        startDate: '2023-09',
        endDate: '2024-07',
        summary: '',
        highlights: [
          'Set 90 pages of a regional food guide to the studio grid, which the client signed off after one round of amends rather than the usual three.',
          'Rebuilt the artwork check into a 9-point pre-press list; printer queries on outgoing jobs fell from about six a month to one.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Manchester Metropolitan University',
        area: 'Graphic Design',
        studyType: 'BA (Hons)',
        location: 'Manchester',
        startDate: '2021-09',
        endDate: '2025-06',
        score: 'First Class Honours',
        url: '',
        summary:
          'Four-year programme including a year in industry. Final project: a 96-page risograph guide to the city’s disused cinemas.',
        courses: [],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Best Student Publication, Degree Show',
        date: '2025',
        awarder: 'Manchester Metropolitan University',
        summary: 'Awarded to the risograph-printed cinema guide, judged from 74 entries across the school.',
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Manchester Youth Design Club',
        position: 'Volunteer Tutor',
        url: '',
        startDate: '2024-10',
        endDate: '',
        summary: '',
        highlights: [
          'Teaches a monthly typography session to 12 sixth-formers; four of the first group have gone on to art foundation courses.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Print',
        level: '',
        keywords: [
          'Editorial layout',
          'Typesetting',
          'Pre-press artwork',
          'Risograph',
          'Paper and finish specification',
        ],
      },
      {
        id: 's2',
        name: 'Brand and digital',
        level: '',
        keywords: [
          'Identity systems',
          'Brand guidelines',
          'Email and social artwork',
          'Signage',
          'Large-print and easy-read',
        ],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['InDesign', 'Illustrator', 'Photoshop', 'Figma', 'Affinity Publisher'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'French', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
