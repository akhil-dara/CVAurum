import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * Lead level, India. Fourteen years fits on two comfortable pages because the
 * older roles shrink: five bullets now, three at the last job, two at the
 * first. The unit of measure never changes — cost per delivered order — so a
 * reader can follow one number down the whole page.
 */
export const sample: LibrarySample = {
  slug: 'head-of-operations',
  role: 'Head of Operations',
  category: 'operations',
  seniority: 'lead',
  region: 'india',
  template: 'initials',
  blurb: 'Fourteen years from a freight branch to a 1,100-person operation, priced per delivered order at every step.',
  keywords: [
    'head of operations',
    'operations manager',
    'last mile delivery',
    'e-commerce fulfilment',
    'cost per order',
    'operations leadership',
    'supply chain director',
  ],
  content: content({
    basics: {
      name: 'Sanjana Iyer',
      label: 'Head of Operations',
      image: '',
      email: 'sanjana.iyer@example.com',
      phone: '+91 12345 88204',
      url: '',
      summary:
        'Operations leader with fourteen years in freight, fulfilment and last-mile delivery, now running a 1,100-person function across nine cities. Took cost per delivered order from ₹94 to ₹58 in three years while on-time delivery rose to 97.4%.',
      location: { city: 'Bengaluru', region: 'Karnataka', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'sanjanaiyer', url: 'https://linkedin.com/in/sanjanaiyer' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Saffronway Commerce',
        logo: brandmark('Saffronway Commerce'),
        position: 'Head of Operations',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2021-02',
        endDate: '',
        summary:
          'Owns fulfilment, last mile and customer operations: 1,100 people, nine cities, 9.4 lakh orders a month.',
        highlights: [
          'Took cost per delivered order from ₹94 to ₹58 in three years by bringing 62% of last mile in-house and rebuilding rider payout around drops per hour.',
          'Lifted on-time delivery from 88.6% to 97.4% across nine cities while monthly order volume grew 2.7 times.',
          'Opened four dark stores and two sortation centres, each reaching planned throughput within six weeks of first dispatch.',
          'Cut customer contact rate from 11.2% of orders to 4.3% by fixing the three failure modes behind 70% of complaints.',
          'Promoted six of the nine city managers from inside the floor; attrition in that group is 4% against a 22% market rate.',
        ],
      },
      {
        id: 'w2',
        name: 'Palladane Retail Services',
        logo: brandmark('Palladane Retail Services'),
        position: 'Senior Manager, Fulfilment Operations',
        location: 'Hyderabad, Telangana',
        url: '',
        startDate: '2017-04',
        endDate: '2021-01',
        summary: '',
        highlights: [
          'Ran three fulfilment centres dispatching 2.6 lakh units a month, taking cost per unit shipped down 29% over four years.',
          'Led the peak plan that absorbed a 4.1x festive spike at 99.2% shipped-on-time with no unplanned agency spend.',
          'Cut returns processing from nine days to 36 hours, putting ₹6.8 crore of saleable stock back on sale each year.',
        ],
      },
      {
        id: 'w3',
        name: 'Meridian Cargo Networks',
        logo: brandmark('Meridian Cargo Networks'),
        position: 'Regional Operations Manager',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2013-06',
        endDate: '2017-03',
        summary: '',
        highlights: [
          'Managed 14 branches and 380 staff across Tamil Nadu, growing consignment volume 46% with headcount flat.',
          'Brought vehicle utilisation from 64% to 89% by pooling line-haul across branches and re-cutting departure times.',
        ],
      },
      {
        id: 'w4',
        name: 'Ashvale Freight',
        logo: brandmark('Ashvale Freight'),
        position: 'Operations Executive',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2011-07',
        endDate: '2013-05',
        summary: '',
        highlights: ['Scheduled 60 daily line-haul trips and cut empty running from 21% to 12% in eighteen months.'],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Indian Institute of Management Kozhikode',
        area: 'Operations Management',
        studyType: 'MBA',
        location: 'Kozhikode, Kerala',
        startDate: '2009-06',
        endDate: '2011-04',
        score: '7.9 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Anna University',
        area: 'Industrial Engineering',
        studyType: 'B.E.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2005-07',
        endDate: '2009-05',
        score: '78%',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Operations leadership',
        level: '',
        keywords: ['P&L ownership', 'Network design', 'Capacity planning', 'Peak-season planning', 'Vendor management'],
      },
      {
        id: 's2',
        name: 'Last mile',
        level: '',
        keywords: ['Rider payout models', 'Route density', 'Dark stores', 'Sortation', 'Reverse logistics'],
      },
      {
        id: 's3',
        name: 'Organisation',
        level: '',
        keywords: [
          'Org design',
          'Manager development',
          'Succession planning',
          'Frontline attrition',
          'Union and contractor relations',
        ],
      },
      {
        id: 's4',
        name: 'Measures',
        level: '',
        keywords: [
          'Cost per delivered order',
          'On-time delivery',
          'Contact rate',
          'Units per hour',
          'Vehicle utilisation',
        ],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Project Management Professional (PMP)', date: '2019', issuer: 'PMI', url: '' },
      { id: 'c2', name: 'Certified Six Sigma Black Belt', date: '2016', issuer: 'ASQ', url: '' },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Operations Leader of the Year',
        date: '2023',
        awarder: 'Saffronway Commerce',
        summary:
          'Awarded across an 1,100-person function for the last-mile in-housing programme and its effect on cost per order.',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Professional', rating: 4 },
      { id: 'l4', language: 'Kannada', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
