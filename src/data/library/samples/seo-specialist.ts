import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Organic search written for a hiring manager rather than a crawler: sessions,
 * indexed pages, crawl budget and page speed, each attached to the change that
 * moved it. The side project is the interview question, and it is deliberate.
 */
export const sample: LibrarySample = {
  slug: 'seo-specialist',
  role: 'SEO Specialist',
  category: 'marketing',
  seniority: 'mid',
  region: 'uk',
  template: 'cobalt',
  blurb: 'Five years of technical and editorial SEO, measured in organic sessions, indexed pages and page speed.',
  keywords: [
    'SEO specialist',
    'technical SEO',
    'organic growth',
    'search engine optimisation',
    'Core Web Vitals',
    'content strategy',
    'SEO executive',
  ],
  content: content({
    basics: {
      name: 'Imogen Farrar',
      label: 'SEO Specialist',
      image: '',
      email: 'imogen.farrar@example.com',
      phone: '+44 7700 900233',
      url: 'https://imogenfarrar.example.com',
      summary:
        'Search specialist with five years on an agency bench and in-house at a travel marketplace, at home in a log file and in a content brief. Grew non-brand organic sessions from 310,000 to 1.1 million a month by rebuilding how one site links to itself.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [{ network: 'LinkedIn', username: 'imogenfarrar', url: 'https://linkedin.com/in/imogenfarrar' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Wrenmoor Travel',
        position: 'Senior SEO Executive',
        location: 'Manchester',
        url: '',
        startDate: '2022-09',
        endDate: '',
        summary: 'Owns organic search for a holiday-let marketplace listing 90,000 properties across 40 countries.',
        highlights: [
          'Grew non-brand organic sessions from 310,000 to 1.1 million a month by rebuilding the destination templates around a single internal-linking hub.',
          'Recovered 44% of the traffic lost to a core update within nine weeks, by consolidating 1,900 thin city pages into 240 substantial ones.',
          'Cut median largest contentful paint from 4.1s to 1.6s alongside the front-end team; organic conversion on mobile rose 18%.',
          'Analysed six months of server logs and found 61% of crawl budget going to filtered URLs; blocking them lifted indexed pages from 38,000 to 71,000.',
          'Writes the brief every freelance writer works from, which cut the edit rounds on a commissioned article from three to one.',
        ],
      },
      {
        id: 'w2',
        name: 'Halcombe Digital',
        position: 'SEO Executive',
        location: 'Leeds',
        url: '',
        startDate: '2020-06',
        endDate: '2022-08',
        summary: '',
        highlights: [
          'Ran organic search for nine retail clients; six finished the year with organic ahead of paid on revenue for the first time.',
          'Wrote the technical audit template the agency still sells as a fixed-price product at £2,400, bought 70 times in two years.',
          'Took a furniture client from 1,400 to 9,800 monthly organic sessions in eleven months with a 60-page buying-guide programme.',
        ],
      },
      {
        id: 'w3',
        name: 'Thistlebank Drinks',
        position: 'Marketing Assistant',
        location: 'Leeds',
        url: '',
        startDate: '2019-07',
        endDate: '2020-05',
        summary: '',
        highlights: [
          'Rewrote 220 product descriptions to a structured brief; the range’s organic sessions rose 52% over the following two quarters.',
          'Set up the first Search Console and analytics properties the brand had, giving the team weekly numbers in place of quarterly guesses.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Leeds',
        area: 'Geography',
        studyType: 'BSc (Hons)',
        location: 'Leeds',
        startDate: '2016-09',
        endDate: '2019-06',
        score: '2:1',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Peak Routes',
        description:
          'A walking-route site for the Peak District, built and written alone as a place to test search ideas before running them at work.',
        url: 'https://peakroutes.example.com',
        startDate: '2020-02',
        endDate: '',
        highlights: [
          '41,000 sessions a month and first position for 30 route queries, on 180 pages and no link building beyond two walking clubs.',
        ],
        keywords: ['Astro', 'Schema markup', 'Internal linking'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Technical',
        level: '',
        keywords: [
          'Log file analysis',
          'Crawl budget',
          'Core Web Vitals',
          'Structured data',
          'Internationalisation',
          'JavaScript rendering',
        ],
      },
      {
        id: 's2',
        name: 'Editorial',
        level: '',
        keywords: ['Keyword research', 'Content briefs', 'Topic clusters', 'Digital PR', 'Content pruning'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Screaming Frog', 'Ahrefs', 'Semrush', 'Google Search Console', 'BigQuery', 'Looker Studio'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'French', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
