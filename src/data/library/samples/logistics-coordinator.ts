import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'
import { portrait } from '../avatar'

/**
 * Entry level, India. Two years is not much history, so the sample earns its
 * page on lane-level detail: hours removed from a milk run, rupees off a
 * shipment, exceptions closed. Nothing here is a duty; everything is a change.
 */
export const sample: LibrarySample = {
  slug: 'logistics-coordinator',
  role: 'Logistics Coordinator',
  category: 'operations',
  seniority: 'entry',
  region: 'india',
  template: 'cascade',
  blurb:
    'Two years of first-mile and line-haul scheduling, written as lanes re-cut, hours removed and rupees saved per shipment.',
  keywords: [
    'logistics coordinator',
    'supply chain fresher',
    'freight operations',
    'last mile delivery',
    '3PL coordination',
    'on-time delivery',
    'logistics resume India',
  ],
  content: content({
    basics: {
      name: 'Rhea Kulkarni',
      label: 'Logistics Coordinator',
      image: portrait('Rhea Kulkarni'),
      email: 'rhea.kulkarni@example.com',
      phone: '+91 12345 60418',
      url: '',
      summary:
        'Logistics coordinator with two years scheduling first-mile pickups and line-haul for an e-commerce network. Handles 180 to 220 shipments a day across 14 pin-code clusters, and re-cut the Pune–Nagpur milk run to take 27 hours out of average delivery time.',
      location: { city: 'Pune', region: 'Maharashtra', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'rheakulkarni', url: 'https://linkedin.com/in/rheakulkarni' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Kestrel Freightways',
        logo: brandmark('Kestrel Freightways'),
        position: 'Logistics Coordinator',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2024-04',
        endDate: '',
        summary: 'Regional hub dispatching 4,500 outbound shipments a week for three e-commerce sellers.',
        highlights: [
          'Re-sequenced the Pune–Nagpur milk run around actual pickup windows, cutting average dispatch-to-delivery from 71 hours to 44 and lifting on-time delivery from 86% to 96%.',
          'Runs the daily dock schedule for 22 vehicles; idle dock time per truck fell from 48 minutes to 19 after appointments moved to 30-minute bands.',
          'Cut return-to-origin volume by 31% with a pre-dispatch address check that caught 1,900 incomplete addresses in six months.',
          'Negotiated part-load rates with two regional carriers, taking cost per shipment on short lanes from ₹96 to ₹74.',
        ],
      },
      {
        id: 'w2',
        name: 'Tarasan Supply Co.',
        logo: brandmark('Tarasan Supply Co.'),
        position: 'Logistics Executive',
        location: 'Pune, Maharashtra',
        url: '',
        startDate: '2023-06',
        endDate: '2024-03',
        summary: '',
        highlights: [
          'Reconciled 1,200 monthly consignments across four 3PL partners and closed a 9% gap between billed and actual freight weight, recovering ₹3.1 lakh in a year.',
          'Built the delivery-exception tracker the branch still runs on; exceptions open past 48 hours fell from 140 to under 20.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Savitribai Phule Pune University',
        area: 'Commerce',
        studyType: 'B.Com',
        location: 'Pune, Maharashtra',
        startDate: '2020-07',
        endDate: '2023-05',
        score: '8.1 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Logistics',
        level: '',
        keywords: [
          'Route planning',
          'Milk-run scheduling',
          'Freight rate negotiation',
          '3PL coordination',
          'Reverse logistics',
        ],
      },
      {
        id: 's2',
        name: 'Systems',
        level: '',
        keywords: ['SAP MM', 'Advanced Excel', 'Power Query', 'TMS dashboards', 'Basic SQL'],
      },
      {
        id: 's3',
        name: 'Measures',
        level: '',
        keywords: ['On-time delivery', 'Cost per shipment', 'RTO rate', 'Dock turnaround', 'Fill rate'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Certified in Logistics, Transportation and Distribution (CLTD)',
        date: '2025',
        issuer: 'ASCM',
        url: '',
      },
      { id: 'c2', name: 'Certified Six Sigma Green Belt', date: '2024', issuer: 'ASQ', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 4 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Marathi', fluency: 'Native', rating: 5 },
    ],
  }),
}

export default sample
