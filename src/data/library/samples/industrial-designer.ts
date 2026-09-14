import type { LibrarySample } from '../types'
import { content, monogram } from '../types'
import { portrait } from '../avatar'

/**
 * Hardware design is judged on what came off the tool and what it cost, so
 * the numbers here are unit cost, tooling spend and first-use success rather
 * than anything that happened on a screen.
 */
export const sample: LibrarySample = {
  slug: 'industrial-designer',
  role: 'Industrial Designer',
  category: 'design',
  seniority: 'mid',
  region: 'uk',
  template: 'portrait',
  blurb:
    'Appliances to medical hardware, measured in first-use success, tooling spend and deficiency-free submissions.',
  keywords: [
    'industrial designer',
    'product design engineer',
    'medical device design',
    'SolidWorks',
    'design for manufacture',
    'human factors',
    'UK industrial design',
  ],
  content: content({
    basics: {
      name: 'Nadia Farrow',
      label: 'Industrial Designer',
      image: portrait('Nadia Farrow'),
      email: 'nadia.farrow@example.com',
      phone: '+44 7700 900149',
      url: 'https://nadiafarrow.example.com',
      urlLabel: 'Portfolio',
      summary:
        'Industrial designer with seven years on consumer appliances and respiratory devices, from foam models through to tooling sign-off. Redesigned an inhaler grip that raised correct first use from 61% to 92% in a 240-patient trial. Writes the human-factors evidence that goes into the technical file rather than handing it to someone else.',
      location: { city: 'Sheffield', region: 'South Yorkshire', countryCode: 'GB' },
      profiles: [
        { network: 'LinkedIn', username: 'nadiafarrow', url: 'https://linkedin.com/in/nadiafarrow' },
        { network: 'Behance', username: 'nfarrow', url: 'https://behance.net/nfarrow' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Brackenhill Medical',
        logo: monogram('B', '#0f766e'),
        position: 'Industrial Designer',
        location: 'Sheffield',
        url: '',
        startDate: '2022-11',
        endDate: '',
        summary: 'Hardware team of twelve designing respiratory devices for the NHS and two European distributors.',
        highlights: [
          'Redesigned the inhaler grip and dose window around a one-handed action; correct first use rose from 61% to 92% across a 240-patient usability trial.',
          'Took a nebuliser housing from concept to tooling sign-off in nine months and held unit cost at £14.20 against a £16 target by consolidating seven mouldings into three.',
          'Brought weekly foam and printed models into the review cycle, cutting late tooling changes from an average of five per programme to one.',
          'Writes the human-factors evidence in the technical file; the last two submissions cleared review without a deficiency letter.',
        ],
      },
      {
        id: 'w2',
        name: 'Wrenfield Appliances',
        logo: monogram('W', '#b91c1c'),
        position: 'Product Designer',
        location: 'Leeds',
        url: '',
        startDate: '2020-03',
        endDate: '2022-10',
        summary: '',
        highlights: [
          'Designed a four-model kettle range sharing one base moulding, which cut tooling spend across the range by £180,000.',
          'Replaced a painted finish with an in-mould texture after 40 abrasion tests, removing a paint line and 11% of the unit cost.',
          'Ran a teardown programme across 22 rival products and turned it into the written brief that shaped the following year’s range.',
        ],
      },
      {
        id: 'w3',
        name: 'Gantry Design Consultancy',
        logo: monogram('G', '#334155'),
        position: 'Junior Industrial Designer',
        location: 'Manchester',
        url: '',
        startDate: '2019-07',
        endDate: '2020-02',
        summary: '',
        highlights: [
          'Modelled and rendered 30 concepts across nine client briefs; five reached production within two years.',
          'Built the material and finish library of 260 samples, which took about a week out of the specification stage of every project after it.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Loughborough University',
        area: 'Industrial Design and Technology',
        studyType: 'BSc (Hons)',
        location: 'Loughborough',
        startDate: '2015-09',
        endDate: '2019-06',
        score: 'First Class Honours',
        url: '',
        summary: 'Four-year programme including a year in industry spent in a white-goods manufacturer’s model shop.',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'UK registered design: one-handed inhaler grip and dose window',
        publisher: 'Intellectual Property Office',
        releaseDate: '2024-03',
        url: '',
        summary: 'Registered design covering the grip geometry shipped on the 2024 device.',
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'IEC 62366-1 Usability Engineering for Medical Devices',
        date: '2023',
        issuer: 'BSI',
        url: '',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Design',
        level: '',
        keywords: [
          'Concept development',
          'CMF specification',
          'Human factors',
          'Design for manufacture',
          'Sketching and rendering',
        ],
      },
      {
        id: 's2',
        name: 'Engineering',
        level: '',
        keywords: ['SolidWorks', 'Class A surfacing', 'Tolerance stack-up', 'Injection moulding', 'Tooling sign-off'],
      },
      {
        id: 's3',
        name: 'Prototyping',
        level: '',
        keywords: ['Foam and CNC models', 'SLA and FDM printing', 'Silicone moulding', 'Abrasion and drop testing'],
      },
      {
        id: 's4',
        name: 'Standards',
        level: '',
        keywords: ['IEC 62366-1', 'ISO 13485', 'ISO 14971', 'Technical file authoring'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'German', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
