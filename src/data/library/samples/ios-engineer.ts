import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A career with a gap in it, written so the gap is the least interesting thing
 * on the page: the break is dated and named like any other entry, the contract
 * is labelled as a contract, and the work either side carries the numbers.
 */
export const sample: LibrarySample = {
  slug: 'ios-engineer',
  role: 'iOS Engineer',
  category: 'software',
  seniority: 'mid',
  region: 'uk',
  template: 'scribe',
  blurb: 'Seven years of Swift, a fixed-term contract and an eleven-month break, all accounted for on a single page.',
  keywords: [
    'iOS engineer',
    'Swift developer',
    'SwiftUI',
    'mobile engineer',
    'accessibility',
    'return to work after a career break',
  ],
  content: content({
    basics: {
      name: 'Freya Halloran',
      label: 'iOS Engineer',
      image: '',
      email: 'freya.halloran@example.com',
      phone: '+44 7700 900412',
      url: 'https://freyahalloran.example.com',
      summary:
        'iOS engineer with seven years in Swift, five of them on regulated banking apps. Rewrote a payments journey so it passed a full external accessibility audit, lifting the store rating from 3.4 to 4.6 over two releases. Returned from an eleven-month parental break in 2023 and now owns that journey end to end.',
      location: { city: 'Manchester', countryCode: 'GB' },
      profiles: [
        { network: 'GitHub', username: 'fhalloran', url: 'https://github.com/fhalloran' },
        { network: 'LinkedIn', username: 'freyahalloran', url: 'https://linkedin.com/in/freyahalloran' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Quillon Bank',
        position: 'iOS Engineer',
        location: 'Manchester',
        url: '',
        startDate: '2023-05',
        endDate: '',
        summary: 'Payments and card controls in an app with 1.4 million monthly users.',
        highlights: [
          'Rewrote the payments journey in SwiftUI against WCAG 2.2, clearing all 31 findings from an external audit and lifting the store rating from 3.4 to 4.6.',
          'Cut cold start from 2.9s to 900ms by deferring feature-flag fetches and removing 46 of the 71 objects built at launch.',
          'Took crash-free sessions from 99.1% to 99.87% by rebuilding the offline request queue that had been silently dropping transfers.',
          'Organised snapshot tests across the 24 card-control screens, which caught an iOS 17 layout break a fortnight before release.',
        ],
      },
      {
        id: 'w2',
        name: 'Career break',
        position: 'Parental leave',
        location: 'Manchester',
        url: '',
        startDate: '2022-06',
        endDate: '2023-04',
        summary: '',
        highlights: [
          'Maintained an open-source Swift keychain package throughout, shipping four releases including the move to structured concurrency.',
          'Answered 130 issues across two Swift packages during the break, holding median first response under three days.',
        ],
      },
      {
        id: 'w3',
        name: 'Ardwick Digital',
        position: 'iOS Developer (nine-month contract)',
        location: 'Leeds',
        url: '',
        startDate: '2021-09',
        endDate: '2022-05',
        summary: 'Fixed-term contract on a grocery retailer ordering app.',
        highlights: [
          'Delivered the substitutions screen the retailer had descoped twice, cutting order cancellations by 23% in its first month.',
          'Migrated 60 view controllers from Objective-C to Swift without a feature freeze, retiring the last of a 2014 codebase.',
        ],
      },
      {
        id: 'w4',
        name: 'Pelham Mobile',
        position: 'iOS Developer',
        location: 'Manchester',
        url: '',
        startDate: '2018-07',
        endDate: '2021-08',
        summary: '',
        highlights: [
          'Built the offline reading mode for a magazine app with 240,000 subscribers, taking average session length up 31%.',
          'Replaced hand-rolled networking with URLSession and Codable, removing 4,300 lines and a recurring class of decoding crashes.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Leeds',
        area: 'Computer Science',
        studyType: 'BSc',
        location: 'Leeds',
        startDate: '2015-09',
        endDate: '2018-06',
        score: '2:1 (Upper Second Class Honours)',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Keyring',
        description: 'An open-source Swift wrapper over the iOS keychain, with async APIs and biometric gating.',
        url: 'https://github.com/fhalloran/keyring',
        startDate: '2020-03',
        endDate: '',
        highlights: ['2,100 stars; used in three published banking apps and depended on by 40 packages.'],
        keywords: ['Swift', 'Security', 'Open source'],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Swift', 'Objective-C', 'Kotlin', 'TypeScript'] },
      {
        id: 's2',
        name: 'Platform',
        level: '',
        keywords: ['SwiftUI', 'UIKit', 'Swift Concurrency', 'Combine', 'Core Data', 'XCTest'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Accessibility audits', 'Release management', 'Snapshot testing', 'Crash triage', 'Code review'],
      },
    ],
  }),
}

export default sample
