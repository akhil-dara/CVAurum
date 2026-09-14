import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Three years in, and every line is a volume or a deadline: the two things a
 * litigation team actually hires a paralegal to control.
 */
export const sample: LibrarySample = {
  slug: 'litigation-paralegal',
  role: 'Litigation Paralegal',
  category: 'legal',
  seniority: 'entry',
  region: 'us',
  template: 'onyx',
  blurb:
    'An early-career paralegal résumé measured in document volumes, filing counts and deadlines held rather than duties listed.',
  keywords: [
    'litigation paralegal',
    'paralegal resume',
    'e-discovery',
    'certified paralegal CP',
    'trial preparation',
    'entry level legal support',
  ],
  content: content({
    basics: {
      name: 'Camille Okafor',
      label: 'Litigation Paralegal',
      image: '',
      email: 'camille.okafor@example.com',
      phone: '+1 (555) 0117',
      url: '',
      summary:
        'Litigation paralegal with three years supporting commercial and employment cases from complaint through trial. Manages discovery on matters running to 410,000 documents and has filed 190 times across state and federal court without a rejection or a missed deadline.',
      location: { city: 'Chicago', region: 'IL', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'camilleokafor', url: 'https://linkedin.com/in/camilleokafor' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Larkspur Reed LLP',
        position: 'Litigation Paralegal',
        location: 'Chicago, IL',
        url: '',
        startDate: '2024-03',
        endDate: '',
        summary:
          'Commercial litigation group of 14 attorneys; supports four partners across 62 active state and federal matters.',
        highlights: [
          'Runs review on a 410,000-document commercial case, narrowing the reviewable set to 38,000 with tested search terms and saving roughly 900 reviewer hours.',
          'Calendars and files across 62 matters; 190 filings to date with no rejected submissions and no missed deadlines.',
          'Assembled the exhibit set for a three-week jury trial, including an 1,100-page index the court adopted as the joint exhibit index.',
          'Built the deposition-summary template now standard in the group, taking average turnaround from four days to one.',
        ],
      },
      {
        id: 'w2',
        name: 'Ridgemont Law Group',
        position: 'Legal Assistant',
        location: 'Chicago, IL',
        url: '',
        startDate: '2022-07',
        endDate: '2024-02',
        summary: '',
        highlights: [
          'Processed 340 new client intakes and cut the conflicts-check backlog from nine days to same-day clearance.',
          'Drafted subpoenas, notices and routine motions for six attorneys, with 95% going out after a single attorney review.',
          'Reorganized a closed-file archive of 4,200 matters into a searchable index and retired two off-site storage units.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Roosevelt University',
        area: 'Paralegal Studies',
        studyType: 'Certificate',
        location: 'Chicago, IL',
        startDate: '2021-09',
        endDate: '2022-05',
        score: '',
        url: '',
        summary: 'ABA-approved program. Capstone on federal civil procedure and electronic discovery.',
        courses: [],
        level: 'certificate',
      },
      {
        id: 'e2',
        institution: 'DePaul University',
        area: 'Political Science',
        studyType: 'B.A.',
        location: 'Chicago, IL',
        startDate: '2017-08',
        endDate: '2021-05',
        score: '3.40 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Westside Tenants Advice Desk',
        position: 'Volunteer Intake Coordinator',
        url: '',
        startDate: '2022-02',
        endDate: '',
        summary: '',
        highlights: [
          'Screens 12 to 15 eviction-defense intakes a month and routes them to on-call attorneys; the desk placed 210 tenants with counsel in 2025.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Case management',
        level: '',
        keywords: [
          'Docketing and calendaring',
          'CM/ECF filing',
          'Trial preparation',
          'Deposition summaries',
          'Cite checking',
        ],
      },
      {
        id: 's2',
        name: 'Discovery',
        level: '',
        keywords: [
          'Document review',
          'Privilege logs',
          'Productions and Bates numbering',
          'Subpoenas',
          'Records requests',
        ],
      },
      { id: 's3', name: 'Systems', level: '', keywords: ['Relativity', 'PACER', 'Westlaw', 'Clio', 'Microsoft 365'] },
      {
        id: 's4',
        name: 'Matter types',
        level: '',
        keywords: ['Commercial litigation', 'Employment', 'Contract disputes', 'Insurance defense'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Paralegal (CP)', date: '2023', issuer: 'NALA — The Paralegal Association', url: '' },
      {
        id: 'c2',
        name: 'Notary Public, State of Illinois',
        date: '2022',
        issuer: 'Illinois Secretary of State',
        url: '',
      },
    ],
  }),
}

export default sample
