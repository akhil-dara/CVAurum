import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * An executive résumé that still reads as operations: access times, agency
 * spend, case cancellations and survey findings, each attached to the change
 * that produced it rather than to a scope statement.
 */
export const sample: LibrarySample = {
  slug: 'healthcare-administrator',
  role: 'Healthcare Administrator (VP, Ambulatory Operations)',
  category: 'healthcare',
  seniority: 'lead',
  region: 'us',
  template: 'mercury',
  blurb:
    'Eighteen years from analyst to vice president, kept operational: access times, agency spend and survey findings, not scope.',
  keywords: [
    'healthcare administrator resume',
    'hospital administrator',
    'VP clinical operations',
    'ambulatory operations',
    'FACHE',
    'perioperative services',
    'MHA',
  ],
  content: content({
    basics: {
      name: 'Terrence Vaughn',
      label: 'Vice President, Ambulatory Operations',
      image: '',
      email: 'terrence.vaughn@example.com',
      phone: '+1 (555) 0109',
      url: 'https://terrencevaughn.example.com',
      summary:
        'Healthcare operations executive with eighteen years across ambulatory, perioperative and practice management, now running 31 clinics and 1,100 staff on a $210M budget. Moved third-next-available appointment time from 24 days to 9 across the whole ambulatory network in under two years.',
      location: { city: 'Columbus', region: 'OH', countryCode: 'US' },
      profiles: [
        { network: 'LinkedIn', username: 'terrencevaughnfache', url: 'https://linkedin.com/in/terrencevaughnfache' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Northgate Health Alliance',
        logo: brandmark('Northgate Health Alliance'),
        position: 'Vice President, Ambulatory Operations',
        location: 'Columbus, OH',
        url: '',
        startDate: '2021-05',
        endDate: '',
        summary: '31 clinics across four counties, 1,100 staff, six direct reports and a $210M operating budget.',
        highlights: [
          'Took third-next-available appointment time from 24 days to 9 across 31 clinics by moving to pooled scheduling and one centralized referral desk.',
          'Opened four clinics in 19 months, each reaching break-even inside three quarters against a five-quarter plan.',
          'Cut annual agency staffing spend from $8.4M to $2.1M by standing up an internal float pool of 74 nurses and medical assistants.',
          'Rebuilt the complaint loop so every patient complaint reaches a named manager within 24 hours; grievances escalating to the state fell from 31 a year to 6.',
          'Led the network through a Joint Commission ambulatory survey that closed with two findings, both resolved inside the 45-day window.',
        ],
      },
      {
        id: 'w2',
        name: 'Kettle Run Health System',
        logo: brandmark('Kettle Run Health System'),
        position: 'Director, Perioperative Services',
        location: 'Indianapolis, IN',
        url: '',
        startDate: '2016-09',
        endDate: '2021-04',
        summary: '18 operating rooms and 340 staff across two campuses.',
        highlights: [
          'Directed a two-campus service-line consolidation that raised on-time first-case starts from 54% to 86% without adding a room.',
          'Renegotiated three implant contracts and took $4.7M out of annual supply cost, leaving surgeon preference lists untouched.',
          'Cut surgical case cancellations from 9.2% to 3.4% by opening a pre-admission testing clinic that saw 90 patients a week.',
        ],
      },
      {
        id: 'w3',
        name: 'Pinecrest Community Hospital',
        logo: brandmark('Pinecrest Community Hospital'),
        position: 'Administrator, Surgical Specialties',
        location: 'Dayton, OH',
        url: '',
        startDate: '2011-06',
        endDate: '2016-08',
        summary: 'Six surgical specialty practices, 44 physicians.',
        highlights: [
          'Raised collections per work RVU by 18% across 44 physicians after a coding education program and a monthly denial review.',
          'Moved six practices onto one scheduling template, adding 3,100 visit slots a year in the same rooms.',
        ],
      },
      {
        id: 'w4',
        name: 'Blue Larkspur Medical Group',
        logo: brandmark('Blue Larkspur Medical Group'),
        position: 'Operations Analyst',
        location: 'Cincinnati, OH',
        url: '',
        startDate: '2008-07',
        endDate: '2011-05',
        summary: '',
        highlights: [
          'Built the monthly productivity reporting that replaced four separate spreadsheets; 22 practice managers still work from it.',
          'Modeled the staffing case for a second infusion suite, which opened on schedule and ran at 81% chair utilization in its first year.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'The Ohio State University',
        area: 'Health Administration',
        studyType: 'M.H.A.',
        location: 'Columbus, OH',
        startDate: '2009-08',
        endDate: '2011-05',
        score: '',
        url: '',
        summary: 'Completed part time while working as an operations analyst.',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Miami University',
        area: 'Business Administration',
        studyType: 'B.S.',
        location: 'Oxford, OH',
        startDate: '2004-08',
        endDate: '2008-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    certificates: [
      {
        id: 'c1',
        name: 'FACHE, Board Certified in Healthcare Management',
        date: '2018',
        issuer: 'American College of Healthcare Executives',
        url: '',
      },
      { id: 'c2', name: 'Lean Six Sigma Black Belt', date: '2015', issuer: 'American Society for Quality', url: '' },
      {
        id: 'c3',
        name: 'Certified Medical Practice Executive (CMPE)',
        date: '2013',
        issuer: 'Medical Group Management Association',
        url: '',
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Regent Award, Ohio',
        date: '2019',
        awarder: 'American College of Healthcare Executives',
        summary: 'For the perioperative consolidation and its on-time start results.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Operations',
        level: '',
        keywords: [
          'Multi-site clinic operations',
          'Perioperative services',
          'Access and scheduling design',
          'Capacity planning',
          'Service line growth',
          'New site openings',
        ],
      },
      {
        id: 's2',
        name: 'Finance',
        level: '',
        keywords: [
          'Operating and capital budgets',
          'Payer contracting',
          'Supply chain negotiation',
          'RVU and productivity analysis',
          'Break-even modeling',
        ],
      },
      {
        id: 's3',
        name: 'Quality and compliance',
        level: '',
        keywords: [
          'Joint Commission readiness',
          'CMS conditions of participation',
          'Patient grievance process',
          'Lean Six Sigma',
          'Serious event review',
        ],
      },
      {
        id: 's4',
        name: 'People',
        level: '',
        keywords: [
          'Leading through managers',
          'Float pool design',
          'Physician relations',
          'Union-environment staffing',
          'Succession planning',
        ],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Scioto Bend Free Clinic',
        position: 'Board Treasurer',
        url: '',
        startDate: '2019-01',
        endDate: '',
        summary: '',
        highlights: [
          'Chairs the finance committee; the clinic has closed three consecutive years with a surplus and opened a second dental chair in 2024.',
        ],
      },
    ],
    languages: [{ id: 'l1', language: 'English', fluency: 'Native', rating: 5 }],
  }),
}

export default sample
