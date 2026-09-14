import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A patent attorney who started as a hardware engineer and now runs the
 * function. Two pages earned: the portfolio numbers, the PTAB and ITC
 * outcomes, and the licensing line the work turned into.
 */
export const sample: LibrarySample = {
  slug: 'head-of-intellectual-property',
  role: 'Head of Intellectual Property',
  category: 'legal',
  seniority: 'lead',
  region: 'us',
  template: 'obsidian',
  blurb:
    'An IP function lead, written as portfolio growth, litigation outcomes and the licensing revenue the patents produced.',
  keywords: [
    'head of intellectual property',
    'patent attorney',
    'IP counsel',
    'inter partes review',
    'patent portfolio strategy',
    'associate general counsel IP',
  ],
  content: content({
    basics: {
      name: 'Hannah Lindqvist',
      label: 'Associate General Counsel, Intellectual Property',
      image: '',
      email: 'hannah.lindqvist@example.com',
      phone: '+1 (555) 0189',
      url: 'https://hannahlindqvist.example.com',
      summary:
        'Patent attorney with fifteen years across private practice and in-house, now leading a six-person IP function for a robotics manufacturer. Grew the portfolio from 140 to 480 issued patents with outside counsel spend held flat, and turned defensive cross-licensing into a $14M annual revenue line.',
      location: { city: 'Seattle', region: 'WA', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'hannahlindqvist', url: 'https://linkedin.com/in/hannahlindqvist' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Halcyon Robotics',
        logo: brandmark('Halcyon Robotics'),
        position: 'Associate General Counsel, Intellectual Property',
        location: 'Seattle, WA',
        url: '',
        startDate: '2020-02',
        endDate: '',
        summary:
          'Leads a team of six: three patent attorneys, a trademark counsel and two IP paralegals. Reports to the General Counsel.',
        highlights: [
          'Grew the portfolio from 140 to 480 issued patents while holding outside counsel spend flat, by moving 70% of drafting to a fixed-fee panel.',
          'Ended a non-practicing entity campaign across four district court cases by filing three inter partes reviews; the board instituted on all three and the plaintiff dismissed for no payment.',
          'Built a $14M annual licensing line from nine cross-license agreements, two with the company’s closest hardware rivals.',
          'Rebuilt the trade secret program after a researcher departure, tightening access control and exit interviews across 900 R&D staff with no misappropriation claim since.',
          'Chairs the invention review board; disclosures rose from 0.4 to 1.3 per engineer per year once a filing bonus was tied to the review.',
        ],
      },
      {
        id: 'w2',
        name: 'Aveline Semiconductor',
        logo: brandmark('Aveline Semiconductor'),
        position: 'Senior Patent Counsel',
        location: 'San Jose, CA',
        url: '',
        startDate: '2015-06',
        endDate: '2020-01',
        summary: '',
        highlights: [
          'Managed the Section 337 investigation before the International Trade Commission that closed in a consent order protecting $90M of annual US sales.',
          'Prosecuted 210 applications in power management and RF circuits at a 78% allowance rate, 14 points above the art unit average.',
          'Cut average filing cost by 28% by rewriting the outside-counsel drafting template and moving foreign coverage to a PCT-first strategy.',
        ],
      },
      {
        id: 'w3',
        name: 'Kellerman Pike LLP',
        logo: brandmark('Kellerman Pike LLP'),
        position: 'Patent Associate',
        location: 'San Francisco, CA',
        url: '',
        startDate: '2011-10',
        endDate: '2015-05',
        summary: '',
        highlights: [
          'Drafted and prosecuted 130 applications for semiconductor and medical device clients while recording 1,900 chargeable hours a year.',
          'Ran freedom-to-operate studies for two product launches, clearing both after designing around nine blocking claims.',
        ],
      },
      {
        id: 'w4',
        name: 'Wrenfield Instruments',
        logo: brandmark('Wrenfield Instruments'),
        position: 'Hardware Design Engineer',
        location: 'Portland, OR',
        url: '',
        startDate: '2006-07',
        endDate: '2008-06',
        summary: '',
        highlights: [
          'Designed the analog front-end boards for a benchtop test instrument that shipped 4,000 units, and is named as an inventor on two resulting patents.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of California, Berkeley, School of Law',
        area: 'Law',
        studyType: 'J.D.',
        location: 'Berkeley, CA',
        startDate: '2008-08',
        endDate: '2011-05',
        score: '',
        url: '',
        summary:
          'Berkeley Technology Law Journal, Senior Articles Editor. Samuelson Law, Technology and Public Policy Clinic.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Purdue University',
        area: 'Electrical Engineering',
        studyType: 'B.S.',
        location: 'West Lafayette, IN',
        startDate: '2002-08',
        endDate: '2006-05',
        score: '3.50 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    publications: [
      {
        id: 'pub1',
        name: 'Designing Around: What Freedom-to-Operate Owes the Engineer',
        publisher: 'Landslide, ABA Section of Intellectual Property Law',
        releaseDate: '2023-05',
        url: '',
        summary:
          'How claim charts written for lawyers fail the design teams that have to act on them, and what to hand an engineer instead.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Patent practice',
        level: '',
        keywords: [
          'Prosecution',
          'Portfolio strategy',
          'Freedom to operate',
          'Invention harvesting',
          'PCT and foreign filing',
        ],
      },
      {
        id: 's2',
        name: 'Disputes',
        level: '',
        keywords: [
          'Inter partes review',
          'ITC Section 337',
          'District court litigation',
          'Claim construction',
          'Settlement negotiation',
        ],
      },
      {
        id: 's3',
        name: 'Commercial IP',
        level: '',
        keywords: [
          'Cross-licensing',
          'Trade secrets',
          'Trademark portfolios',
          'Open-source review',
          'IP diligence in M&A',
        ],
      },
      {
        id: 's4',
        name: 'Technical',
        level: '',
        keywords: ['Robotics and controls', 'Power electronics', 'RF circuits', 'Embedded software', 'Computer vision'],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'Registered Patent Attorney',
        date: '2012',
        issuer: 'U.S. Patent and Trademark Office',
        url: '',
      },
      {
        id: 'c2',
        name: 'Admitted to the State Bar of California',
        date: '2011',
        issuer: 'State Bar of California',
        url: '',
      },
      {
        id: 'c3',
        name: 'Admitted to the Washington State Bar',
        date: '2020',
        issuer: 'Washington State Bar Association',
        url: '',
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
      { id: 'l2', language: 'Swedish', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
