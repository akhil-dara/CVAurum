import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Senior, US. Support résumés drown in adjectives about empathy, so this one
 * says nothing about attitude and everything about queue behaviour: response
 * time against rising volume, resolution on first contact, and what a career
 * ladder did to attrition.
 */
export const sample: LibrarySample = {
  slug: 'customer-support-lead',
  role: 'Customer Support Lead',
  category: 'operations',
  seniority: 'senior',
  region: 'us',
  template: 'compact',
  blurb:
    'Nine years of support, shown as response times, first-contact resolution and the attrition a career ladder fixed.',
  keywords: [
    'customer support lead',
    'support team manager',
    'SaaS customer support',
    'first response time',
    'CSAT',
    'Zendesk',
    'support operations',
  ],
  content: content({
    basics: {
      name: 'Adrian Voss',
      label: 'Customer Support Lead',
      image: '',
      email: 'adrian.voss@example.com',
      phone: '+1 (555) 0164',
      url: '',
      summary:
        'Support lead with nine years across business software and hardware, now running 22 agents in two time zones for 6,900 accounts. Took median first response from nine hours to 38 minutes while ticket volume doubled, holding CSAT at 4.7 of 5.',
      location: { city: 'Denver', region: 'CO', countryCode: 'US' },
      profiles: [{ network: 'LinkedIn', username: 'adrianvoss', url: 'https://linkedin.com/in/adrianvoss' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Bellrock Software',
        position: 'Customer Support Lead',
        location: 'Denver, CO',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary: 'Leads 22 agents across Denver and Dublin covering 6,900 business accounts on a 24-by-5 queue.',
        highlights: [
          'Cut median first response from nine hours to 38 minutes while monthly tickets rose from 4,100 to 8,600 and headcount grew by only six.',
          'Lifted first-contact resolution from 54% to 78% and has held CSAT at 4.7 of 5 across 31,000 rated tickets.',
          'Built the 140-article help center that now deflects 3,200 tickets a month, taking $420k a year out of cost to serve.',
          'Cut agent attrition from 41% to 14% with a three-tier career ladder and a four-week onboarding academy ending in written competency checks.',
          'Runs weekly triage with engineering; escalations open past 30 days fell from 210 to 18 in two quarters.',
        ],
      },
      {
        id: 'w2',
        name: 'Quillhart Devices',
        position: 'Support Team Manager',
        location: 'Boulder, CO',
        url: '',
        startDate: '2018-09',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Managed nine agents handling 2,400 monthly hardware returns; average turnaround fell from 12 days to five.',
          'Introduced call-quality scorecards and weekly coaching, lifting CSAT from 3.9 to 4.5 in three quarters.',
          'Took phone abandonment from 17% to 4% by rebuilding the shift schedule against hourly contact volume.',
        ],
      },
      {
        id: 'w3',
        name: 'Quillhart Devices',
        position: 'Support Specialist',
        location: 'Boulder, CO',
        url: '',
        startDate: '2016-07',
        endDate: '2018-08',
        summary: '',
        highlights: [
          'Closed 60 to 80 tickets a week at 96% SLA attainment across two years.',
          'Wrote the 40-page troubleshooting guide that halved average handle time on the five most common hardware faults.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'University of Denver',
        area: 'Communication',
        studyType: 'B.A.',
        location: 'Denver, CO',
        startDate: '2012-09',
        endDate: '2016-06',
        score: '3.3 GPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Support operations',
        level: '',
        keywords: [
          'Queue and SLA design',
          'Workforce scheduling',
          'Escalation management',
          'Knowledge base ownership',
          'Quality assurance',
        ],
      },
      {
        id: 's2',
        name: 'Leadership',
        level: '',
        keywords: [
          'Hiring and onboarding',
          'Coaching cadence',
          'Career laddering',
          'Cross-time-zone handover',
          'Performance reviews',
        ],
      },
      {
        id: 's3',
        name: 'Systems',
        level: '',
        keywords: ['Zendesk', 'Intercom', 'Jira Service Management', 'Looker', 'SQL'],
      },
      {
        id: 's4',
        name: 'Measures',
        level: '',
        keywords: ['First response time', 'First-contact resolution', 'CSAT', 'Ticket deflection', 'Cost per ticket'],
      },
    ],
    certificates: [{ id: 'c1', name: 'ITIL 4 Foundation', date: '2022', issuer: 'PeopleCert', url: '' }],
  }),
}

export default sample
