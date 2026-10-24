import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * A mobile résumé that resists listing libraries: every bullet is a number the
 * product team also cared about — install size, cold start, the share of people
 * who finished the flow — and the part-time first job is labelled as one.
 */
export const sample: LibrarySample = {
  slug: 'android-engineer',
  role: 'Android Engineer',
  category: 'software',
  seniority: 'mid',
  region: 'us',
  template: 'bare',
  blurb: 'Five years of Kotlin told through install size, cold start, and the flows shoppers stopped abandoning.',
  keywords: [
    'Android engineer',
    'Kotlin developer',
    'Jetpack Compose',
    'mobile engineer',
    'app performance',
    'offline-first',
  ],
  guide: {
    why: [
      'Every bullet carries a number the product team also tracked: abandonment from 34% to 11%, app size from 61MB to 24MB, p90 cold start under 1.2s. That reads as an engineer who ships for users, not one who collects libraries.',
      'Tools appear inside results rather than in a list: the offline-first cart is built “in Room and WorkManager”, and 90 screens move to Jetpack Compose with UI code cut 38%, so each skill is shown in use.',
      'The Fernpath Media role is labelled “part-time” with its twenty hours a week stated, which keeps the five-year claim honest and still lets the Java-to-Kotlin conversion count.',
      'The Rainier Code Collective teaching, with 34 of 41 graduates in paid engineering work, adds mentoring evidence that a mid-level engineer aiming at senior roles needs.',
    ],
    faq: [
      { q: 'What should an Android developer resume include?', a: 'Kotlin and the Jetpack libraries you have shipped with (Compose, Room, WorkManager, Hilt), the size of the apps you worked on, and the performance or product numbers you moved: crash rate, cold start, app size, conversion. A Play Store or GitHub link helps if the work is public.' },
      { q: 'Should an Android resume list every library used?', a: 'No. Keep one short Android skills line with the libraries that matter for the role and let the bullets show them in use. A long list of every dependency tells a reviewer little about what you can build.' },
    ],
  },
  content: content({
    basics: {
      name: 'Jordan Feltz',
      label: 'Android Engineer',
      image: '',
      email: 'jordan.feltz@example.com',
      phone: '+1 (555) 0173',
      url: 'https://jordanfeltz.example.com',
      summary:
        'Android engineer with five years shipping consumer apps in Kotlin, most recently for a grocery chain with 2.3 million monthly shoppers. Took store pickup from a 34% abandon rate to 11% by rebuilding it around an offline-first cart, and teaches Kotlin to career changers on weeknights.',
      location: { city: 'Seattle', region: 'WA', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'jfeltz', url: 'https://github.com/jfeltz' },
        { network: 'LinkedIn', username: 'jordanfeltz', url: 'https://linkedin.com/in/jordanfeltz' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Puget Harvest Markets',
        position: 'Android Engineer',
        location: 'Seattle, WA',
        url: '',
        startDate: '2022-10',
        endDate: '',
        summary: 'Shopping and pickup in an app used by 2.3 million people a month.',
        highlights: [
          'Rebuilt store pickup around an offline-first cart in Room and WorkManager, taking abandonment from 34% to 11% in two releases.',
          'Migrated 90 screens from XML layouts to Jetpack Compose across three quarters, cutting UI code 38% and halving the time to build a new screen.',
          'Brought app size from 61MB to 24MB with dynamic feature modules, which lifted install completion 9% on prepaid devices.',
          'Set up the baseline profiles and macrobenchmark run that keep p90 cold start under 1.2s; a regression now fails the build.',
        ],
      },
      {
        id: 'w2',
        name: 'Northstack Mobile',
        position: 'Android Developer',
        location: 'Portland, OR',
        url: '',
        startDate: '2020-06',
        endDate: '2022-09',
        summary: '',
        highlights: [
          'Built the barcode-scanning inventory app used by 400 warehouse staff, retiring handheld scanners that cost $220 each to replace.',
          'Cut crashes from 2.4% to 0.3% of sessions by rewriting the fragment lifecycle handling that leaked an open camera session.',
          'Wrote the pipeline that publishes an internal test build on every merge, removing a two-day wait for testers.',
        ],
      },
      {
        id: 'w3',
        name: 'Fernpath Media',
        position: 'Android Developer (part-time)',
        location: 'Bellingham, WA',
        url: '',
        startDate: '2019-09',
        endDate: '2020-05',
        summary: 'Twenty hours a week alongside the final year of a computer science degree.',
        highlights: [
          'Shipped the podcast download queue, taking offline listening from 4% to 22% of sessions.',
          'Converted the last 30 Java classes to Kotlin, ending null-pointer crashes across the next two releases.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Western Washington University',
        area: 'Computer Science',
        studyType: 'B.S.',
        location: 'Bellingham, WA',
        startDate: '2016-09',
        endDate: '2020-05',
        score: '3.5 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Rainier Code Collective',
        position: 'Android Instructor',
        url: '',
        startDate: '2023-01',
        endDate: '',
        summary: '',
        highlights: [
          'Teaches a ten-week evening Kotlin course for career changers; 34 of the 41 graduates so far have taken paid engineering work.',
        ],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['Kotlin', 'Java', 'SQL', 'Python'] },
      {
        id: 's2',
        name: 'Android',
        level: '',
        keywords: ['Jetpack Compose', 'Coroutines', 'Room', 'Hilt', 'WorkManager', 'Espresso'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Offline-first design', 'Store releases', 'Macrobenchmark profiling', 'A/B experiments'],
      },
    ],
  }),
}

export default sample
