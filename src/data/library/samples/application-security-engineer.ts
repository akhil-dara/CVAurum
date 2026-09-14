import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Consultancy testing turned in-house defence. Security bullets tempt a writer
 * into naming tools; these name the thing that was stopped, how fast, and what
 * changed so the same class of finding cannot come back.
 */
export const sample: LibrarySample = {
  slug: 'application-security-engineer',
  role: 'Application Security Engineer',
  category: 'software',
  seniority: 'senior',
  region: 'uk',
  template: 'plainsong',
  blurb:
    'Eight years of security work, each finding written as the thing it stopped rather than the tool that found it.',
  keywords: [
    'application security engineer',
    'AppSec',
    'penetration testing',
    'threat modelling',
    'OWASP',
    'security engineer UK',
    'secure code review',
  ],
  content: content({
    basics: {
      name: 'Rhys Calderwood',
      label: 'Application Security Engineer',
      image: '',
      email: 'rhys.calderwood@example.com',
      phone: '+44 7700 900167',
      url: 'https://rhyscalderwood.example.com',
      summary:
        'Application security engineer with eight years, split between consultancy penetration testing and building security into an insurer engineering programme. Closed an authentication bypass on 240,000 policy accounts within 36 hours of disclosure, and took critical findings at release from 11 to under one.',
      location: { city: 'Bristol', countryCode: 'GB' },
      profiles: [
        { network: 'GitHub', username: 'rcalderwood', url: 'https://github.com/rcalderwood' },
        { network: 'LinkedIn', username: 'rhyscalderwood', url: 'https://linkedin.com/in/rhyscalderwood' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Cleeve Mutual',
        position: 'Senior Application Security Engineer',
        location: 'Bristol',
        url: '',
        startDate: '2021-02',
        endDate: '',
        summary: 'Product security for an insurer with 240,000 online policy accounts and 140 repositories.',
        highlights: [
          'Closed an authentication bypass in the broker portal 36 hours after disclosure, then proved against 14 months of logs that no account had been reached.',
          'Built the threat-modelling programme now run on every new service; critical findings at release fell from 11 to under one.',
          'Rewrote authorisation around per-object checks, retiring the role-only model behind six of the nine findings in the last external audit.',
          'Introduced dependency and secret scanning across 140 repositories, clearing 38 live credentials in the first fortnight.',
        ],
      },
      {
        id: 'w2',
        name: 'Bramwell Security Labs',
        position: 'Security Consultant',
        location: 'Bristol',
        url: '',
        startDate: '2018-06',
        endDate: '2021-01',
        summary: '',
        highlights: [
          'Led 40 web and API penetration tests for finance and health clients, two of them under intelligence-led red-team rules.',
          'Reported three vulnerabilities in widely used open-source libraries, each assigned a CVE and fixed upstream within a month.',
          'Designed the retest process that replaced a full re-engagement, cutting client cost by a third and closing findings a fortnight sooner.',
        ],
      },
      {
        id: 'w3',
        name: 'Tollgate Digital',
        position: 'Software Engineer',
        location: 'Cardiff',
        url: '',
        startDate: '2016-09',
        endDate: '2018-05',
        summary: '',
        highlights: [
          'Built the payment integration for a ticketing platform taking 70,000 transactions a month, which passed PCI DSS assessment first time.',
          'Parameterised queries across 60 endpoints after an injection finding, closing the whole class rather than the single report.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Cardiff University',
        area: 'Computer Science',
        studyType: 'BSc',
        location: 'Cardiff',
        startDate: '2013-09',
        endDate: '2016-06',
        score: 'First Class Honours',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Security',
        level: '',
        keywords: ['Threat modelling', 'Penetration testing', 'Secure code review', 'OWASP ASVS', 'Incident response'],
      },
      {
        id: 's2',
        name: 'Tooling',
        level: '',
        keywords: ['Burp Suite', 'Semgrep', 'Nuclei', 'Trivy', 'HashiCorp Vault'],
      },
      {
        id: 's3',
        name: 'Engineering',
        level: '',
        keywords: ['Python', 'Go', 'TypeScript', 'AWS', 'Terraform', 'Kubernetes'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'Offensive Security Certified Professional', date: '2019', issuer: 'OffSec', url: '' },
      { id: 'c2', name: 'CREST Registered Penetration Tester', date: '2020', issuer: 'CREST', url: '' },
    ],
    publications: [
      {
        id: 'pb1',
        name: 'Authorisation flaws in insurance broker portals',
        publisher: 'OWASP Bristol Chapter',
        releaseDate: '2023-04',
        url: '',
        summary:
          'Talk given to 120 attendees on a per-object authorisation pattern, published afterwards as a written guide.',
      },
      {
        id: 'pb2',
        name: 'A practical threat-modelling template for small teams',
        publisher: 'Chartered Institute of Information Security',
        releaseDate: '2022-09',
        url: '',
        summary: 'Two-page template taken up by 30 organisations in the year after publication.',
      },
    ],
  }),
}

export default sample
