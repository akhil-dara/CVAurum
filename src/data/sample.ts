import type { ResumeContent } from '@/types/document'

/**
 * A rich, realistic sample resume. Shown on first run and used as the
 * "live preview" data in the template gallery so every template renders
 * against identical, believable content.
 */
export const SAMPLE_CONTENT: ResumeContent = {
  basics: {
    name: 'Alex Morgan',
    label: 'Senior Software Engineer',
    image:
      "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%23cbd5e1'/%3E%3Cstop%20offset='1'%20stop-color='%2364748b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='240'%20height='240'%20fill='url(%23g)'/%3E%3Ccircle%20cx='120'%20cy='94'%20r='40'%20fill='%23f1f5f9'/%3E%3Cpath%20d='M50%20208c0-39%2031-62%2070-62s70%2023%2070%2062z'%20fill='%23f1f5f9'/%3E%3C/svg%3E",
    email: 'alex.morgan@email.com',
    phone: '(555) 234-9981',
    url: 'https://alexmorgan.dev',
    summary:
      '<p>Senior software engineer with <strong>8+ years</strong> building reliable, high-scale web platforms. I turn ambiguous product goals into shipped features, mentor engineers, and care deeply about developer experience and clean, well-tested systems.</p>',
    location: { city: 'San Francisco', region: 'CA', countryCode: 'US' },
    profiles: [
      { network: 'LinkedIn', username: 'alexmorgan', url: 'https://linkedin.com/in/alexmorgan' },
      { network: 'GitHub', username: 'alexmorgan', url: 'https://github.com/alexmorgan' },
    ],
  },
  work: [
    {
      id: 'w1',
      name: 'Vertex Labs',
      position: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      url: 'https://vertexlabs.io',
      startDate: '2021-03',
      endDate: '',
      summary: '',
      highlights: [
        'Led the rebuild of the billing platform serving <strong>2.4M</strong> customers, cutting payment failures by <strong>38%</strong> and reclaiming $4.1M in annual revenue.',
        'Architected an event-driven services layer (Kafka + TypeScript) that reduced p95 checkout latency from 820ms to <strong>190ms</strong>.',
        'Mentored 6 engineers; introduced a code-review playbook that lifted PR throughput 27% without raising defect rate.',
      ],
    },
    {
      id: 'w2',
      name: 'Northwind Software',
      position: 'Software Engineer',
      location: 'Austin, TX',
      url: '',
      startDate: '2018-06',
      endDate: '2021-02',
      summary: '',
      highlights: [
        'Built the company’s first design-system component library (React + Storybook), adopted by 9 product teams.',
        'Shipped a real-time analytics dashboard handling <strong>40k events/sec</strong> with sub-second refresh.',
        'Reduced CI pipeline time 64% by parallelizing test suites and adding intelligent caching.',
      ],
    },
  ],
  volunteer: [],
  education: [
    {
      id: 'e1',
      institution: 'University of California, Berkeley',
      area: 'Computer Science',
      studyType: 'B.S.',
      location: 'Berkeley, CA',
      startDate: '2012-08',
      endDate: '2016-05',
      score: '3.8 GPA',
      url: '',
      summary: '',
      courses: ['Distributed Systems', 'Machine Learning', 'Databases', 'Algorithms'],
    },
  ],
  awards: [
    { id: 'a1', title: 'Engineering Excellence Award', date: '2023', awarder: 'Vertex Labs', summary: 'Top 2% of engineering org for impact and leadership.' },
  ],
  certificates: [
    { id: 'c1', name: 'AWS Certified Solutions Architect — Professional', date: '2022', issuer: 'Amazon Web Services', url: '' },
  ],
  publications: [],
  skills: [
    { id: 's1', name: 'Languages', level: '', keywords: ['TypeScript', 'Go', 'Python', 'SQL', 'Rust'] },
    { id: 's2', name: 'Frontend', level: '', keywords: ['React', 'Next.js', 'Redux', 'Tailwind', 'Vite'] },
    { id: 's3', name: 'Backend', level: '', keywords: ['Node.js', 'PostgreSQL', 'Kafka', 'gRPC', 'Redis'] },
    { id: 's4', name: 'Cloud & DevOps', level: '', keywords: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'] },
  ],
  languages: [
    { id: 'l1', language: 'English', fluency: 'Native', rating: 5 },
    { id: 'l2', language: 'Spanish', fluency: 'Professional', rating: 4 },
  ],
  interests: [],
  references: [],
  projects: [
    {
      id: 'p1',
      name: 'Pulse — Open-source observability',
      description: 'A lightweight metrics + tracing toolkit for small teams.',
      url: 'https://github.com/alexmorgan/pulse',
      startDate: '2022',
      endDate: '',
      highlights: ['3.2k GitHub stars, 40+ contributors.', 'Zero-config OpenTelemetry instrumentation for Node and Go.'],
      keywords: ['Go', 'OpenTelemetry', 'React'],
    },
  ],
  custom: [],
}

/** A blank-but-valid resume for "Start from scratch". */
export const BLANK_CONTENT: ResumeContent = {
  basics: {
    name: '',
    label: '',
    image: '',
    email: '',
    phone: '',
    url: '',
    summary: '',
    location: {},
    profiles: [],
  },
  work: [],
  volunteer: [],
  education: [],
  awards: [],
  certificates: [],
  publications: [],
  skills: [],
  languages: [],
  interests: [],
  references: [],
  projects: [],
  custom: [],
}
