import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'

/**
 * A career changer. The earlier career is kept — shortened to two bullets that
 * show the same habits the new job wants — and the résumé answers the question
 * a reader always asks of a switch: what has been shipped since.
 */
export const sample: LibrarySample = {
  slug: 'qa-automation-engineer',
  role: 'QA Automation Engineer',
  category: 'software',
  seniority: 'entry',
  region: 'us',
  template: 'beacon',
  blurb:
    'A lab technician turned test engineer, written around what the automation caught rather than how many tests exist.',
  keywords: [
    'QA automation engineer',
    'test automation',
    'Playwright',
    'SDET',
    'career change into QA',
    'ISTQB',
    'software tester',
  ],
  guide: {
    why: [
      'The Playwright suite is described by what it caught, not how big it is: escaped defects “from 19 a quarter to 4”, with 118 flows finishing in 9 minutes, the measure a QA lead actually reports upward.',
      'Flaky tests are dealt with head-on: the quarantine rule took suite reliability from 86% to 99.2%, a detail that shows the judgement automation engineers are hired for beyond writing scripts.',
      'The Rowan Diagnostics years are cut to two bullets that already look like QA work, CLIA protocol with an error rate below 0.3% and a Python script replacing a paper checklist, so the career change reads as continuity.',
      'The contract test that caught a field rename which would have dropped 3,000 appointments turns an abstract skill into a single, concrete save a hiring manager remembers.',
    ],
    faq: [
      {
        q: 'How do you write a QA resume when changing careers?',
        a: 'Keep the earlier job but shorten it to the bullets that show testing habits: following protocol, documenting errors, automating a manual check. Put the QA roles first and lead the summary with what your automation has shipped or caught since the switch.',
      },
      {
        q: 'Is ISTQB certification worth putting on a QA automation resume?',
        a: 'Yes for entry-level roles, since many US job posts list it as preferred. Put the ISTQB Foundation Level in a certifications section with the year; it carries more weight beside a bullet showing a working test suite.',
      },
      {
        q: 'What tools should a QA automation engineer resume list?',
        a: 'Group them: frameworks (Playwright, Cypress, pytest), API and load testing (Postman, k6), languages (TypeScript, Python) and CI. Name the frameworks the job post names, and make sure each appears in at least one bullet with a result.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Devon Castellano',
      label: 'QA Automation Engineer',
      image: '',
      email: 'devon.castellano@example.com',
      phone: '+1 (555) 0164',
      url: 'https://devoncastellano.example.com',
      summary:
        'Test engineer who moved from a hospital diagnostics bench into software testing in 2023. Built the Playwright suite that now gates every release of a scheduling product used by 1,200 clinics, taking escaped defects from 19 a quarter to 4.',
      location: { city: 'Raleigh', region: 'NC', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'dcastellano', url: 'https://github.com/dcastellano' },
        { network: 'LinkedIn', username: 'devoncastellano', url: 'https://linkedin.com/in/devoncastellano' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Verdal Health Systems',
        logo: brandmark('Verdal Health Systems'),
        position: 'QA Automation Engineer',
        location: 'Raleigh, NC',
        url: '',
        startDate: '2024-09',
        endDate: '',
        summary: 'Release quality for a scheduling product used by 1,200 clinics.',
        highlights: [
          'Built the Playwright suite that gates release, covering 118 flows and finishing in 9 minutes on four shards; escaped defects fell from 19 a quarter to 4.',
          'Replaced a six-hour manual regression pass with an automated smoke run, freeing two testers for exploratory work on the booking rewrite.',
          'Wrote the quarantine rule that pulls a test after two non-deterministic failures, taking suite reliability from 86% to 99.2%.',
          'Added contract tests between the scheduler and the billing API, catching a field rename that would have dropped 3,000 appointments.',
        ],
      },
      {
        id: 'w2',
        name: 'Foxhill Software',
        logo: brandmark('Foxhill Software'),
        position: 'QA Analyst',
        location: 'Durham, NC',
        url: '',
        startDate: '2023-03',
        endDate: '2024-08',
        summary: '',
        highlights: [
          'Wrote the first automated API checks for a claims tool, moving 240 manual cases into a nightly run that reported before standup.',
          'Rebuilt the bug template around reproduction steps and environment detail; developer requests for clarification dropped by two-thirds.',
          'Tested the record-import path against 14 malformed real-world files and found three crashes that had already reached production twice.',
        ],
      },
      {
        id: 'w3',
        name: 'Rowan Diagnostics',
        logo: brandmark('Rowan Diagnostics'),
        position: 'Clinical Laboratory Technician',
        location: 'Raleigh, NC',
        url: '',
        startDate: '2019-06',
        endDate: '2023-02',
        summary: '',
        highlights: [
          'Ran 60 specimen assays a shift under CLIA protocol, holding a documented error rate below 0.3% across four years.',
          'Automated the daily quality-control log in Python, replacing a paper checklist and cutting shift close-out from 45 minutes to 5.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of North Carolina at Chapel Hill',
        area: 'Biology',
        studyType: 'B.S.',
        location: 'Chapel Hill, NC',
        startDate: '2015-08',
        endDate: '2019-05',
        score: '3.4 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Automation',
        level: '',
        keywords: ['Playwright', 'Cypress', 'pytest', 'Postman', 'k6'],
      },
      { id: 's2', name: 'Languages', level: '', keywords: ['TypeScript', 'Python', 'SQL', 'Bash'] },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['Test strategy', 'CI gating', 'Exploratory testing', 'Accessibility checks', 'Defect triage'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Certified Tester Foundation Level', date: '2023', issuer: 'ISTQB', url: '' },
      { id: 'c2', name: 'GitHub Actions Certification', date: '2025', issuer: 'GitHub', url: '' },
    ],
  }),
}

export default sample
