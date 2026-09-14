import type { LibrarySample } from '../types'
import { content, monogram } from '../types'

/**
 * The services-firm-to-product path, which a lot of Indian résumés have and
 * few show well. The first job gets two bullets about delivery, the later ones
 * get the business numbers, and the page never repeats a stack list.
 */
export const sample: LibrarySample = {
  slug: 'full-stack-engineer',
  role: 'Full-Stack Engineer',
  category: 'software',
  seniority: 'mid',
  region: 'india',
  template: 'quire',
  blurb:
    'Six years from a services firm to a product team, measured in orders that stopped failing rather than tools picked up.',
  keywords: [
    'full-stack engineer',
    'Node.js',
    'React',
    'PostgreSQL',
    'e-commerce engineer',
    'software engineer India',
    'TypeScript',
  ],
  content: content({
    basics: {
      name: 'Karthik Rajagopal',
      label: 'Full-Stack Engineer',
      image: '',
      email: 'karthik.rajagopal@example.com',
      phone: '+91 12345 70926',
      url: 'https://karthikrajagopal.example.com',
      summary:
        'Full-stack engineer with six years across Node, React and PostgreSQL, most of it on order and payment flows for Indian retail. Rebuilt a checkout that dropped 8% of orders at peak into one that has held through three festive sales without a manual intervention.',
      location: { city: 'Hyderabad', region: 'Telangana', countryCode: 'IN' },
      profiles: [
        { network: 'GitHub', username: 'krajagopal', url: 'https://github.com/krajagopal' },
        { network: 'LinkedIn', username: 'karthikrajagopal', url: 'https://linkedin.com/in/karthikrajagopal' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Kestrel Commerce',
        logo: monogram('K', '#b91c1c'),
        position: 'Full-Stack Engineer',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2022-04',
        endDate: '',
        summary: 'Order platform for a direct-to-consumer marketplace taking 2.1 lakh orders a month.',
        highlights: [
          'Rebuilt checkout on an idempotent order state machine in Node and PostgreSQL; order drop-off at peak fell from 8% to 0.05% across three festive sales.',
          'Cut the catalogue response from 780ms to 140ms by moving variant pricing into a materialised view refreshed on write.',
          'Shipped the UPI refund flow end to end — React screens, ledger entries and the nightly reconciliation job — settling 11,000 refunds a month untouched by hand.',
          'Brought two junior engineers through their first on-call rotation; both now run releases without supervision.',
        ],
      },
      {
        id: 'w2',
        name: 'Bluepine Technologies',
        logo: monogram('B', '#1d4ed8'),
        position: 'Software Engineer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2020-06',
        endDate: '2022-03',
        summary: '',
        highlights: [
          'Built the seller dashboard in React and TypeScript that replaced a nightly emailed spreadsheet for 3,400 sellers.',
          'Moved image handling to on-the-fly resizing, taking 40GB of stored derivatives down to 3GB and page weight down 62%.',
          'Wrote the zero-downtime migration that merged two user tables, reconciling 1.9 million rows over a weekend.',
        ],
      },
      {
        id: 'w3',
        name: 'Varnika Software Services',
        logo: monogram('V', '#047857'),
        position: 'Associate Software Engineer',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2019-07',
        endDate: '2020-05',
        summary: '',
        highlights: [
          'Delivered four client web applications on Django and jQuery, each accepted without a rework cycle.',
          'Replaced a hand-run deployment checklist with a scripted release, cutting a production deploy from 90 minutes to 12.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Vasavi College of Engineering',
        area: 'Computer Science and Engineering',
        studyType: 'B.E.',
        location: 'Hyderabad, Telangana',
        startDate: '2015-08',
        endDate: '2019-05',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Invoice Kit',
        description: 'An open-source Node library that generates GST-compliant invoices and e-way bill payloads.',
        url: 'https://github.com/krajagopal/invoice-kit',
        startDate: '2021-09',
        endDate: '',
        highlights: ['Used by two billing products and about 60 small businesses; 480 stars and 12 contributors.'],
        keywords: ['Node.js', 'TypeScript', 'GST'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'Go'] },
      {
        id: 's2',
        name: 'Stack',
        level: '',
        keywords: ['Node.js', 'React', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Payment integrations', 'Database migrations', 'Query tuning', 'On-call and incident review'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'AWS Certified Developer – Associate', date: '2023', issuer: 'Amazon Web Services', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Telugu', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
