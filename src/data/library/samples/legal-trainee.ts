import type { LibrarySample } from '../types'
import { content } from '../types'
import { portrait } from '../avatar'

/**
 * The first year of practice, where there is no deal sheet yet. Moot results,
 * the assessment internship and the precedent bank do the work a track record
 * would do later — each one written as an outcome, not a duty.
 */
export const sample: LibrarySample = {
  slug: 'legal-trainee',
  role: 'Legal Trainee',
  category: 'legal',
  seniority: 'entry',
  region: 'india',
  template: 'sapphire',
  blurb:
    'A first-year corporate trainee’s résumé, where moots, the assessment internship and drafted documents carry the weight.',
  keywords: [
    'legal trainee',
    'junior advocate',
    'fresher law graduate resume',
    'corporate law internship',
    'AIBE',
    'BA LLB resume',
  ],
  content: content({
    basics: {
      name: 'Tanvi Raikar',
      label: 'Legal Trainee, Corporate Advisory',
      image: portrait('Tanvi Raikar'),
      email: 'tanvi.raikar@example.com',
      phone: '+91 12345 84937',
      url: '',
      summary:
        'Law graduate in the first year of corporate practice, enrolled with the Bar Council of Delhi in 2025 after five internships across disputes, policy and in-house teams. Drafted the subscription and shareholders’ documents for a ₹6 crore seed round that signed three weeks after the term sheet.',
      location: { city: 'New Delhi', region: 'Delhi', countryCode: 'IN' },
      profiles: [{ network: 'LinkedIn', username: 'tanviraikar', url: 'https://linkedin.com/in/tanviraikar' }],
    },
    work: [
      {
        id: 'w1',
        name: 'Bhandari Kaul & Co., Advocates',
        position: 'Legal Trainee, Corporate Advisory',
        location: 'New Delhi',
        url: '',
        startDate: '2025-07',
        endDate: '',
        summary: 'Six-lawyer corporate team advising early-stage companies and family-owned businesses.',
        highlights: [
          'Drafted the share subscription and shareholders’ agreements for a ₹6 crore seed round that signed three weeks after the term sheet.',
          'Completed secretarial and litigation due diligence on 14 targets, flagging three unregistered charges that changed the indemnity position.',
          'Maintains the team’s precedent bank and has added 22 clause variants drawn from closed transactions.',
          'Writes the weekly note on Companies Act and SEBI circulars, now circulated to 40 retainer clients.',
        ],
      },
      {
        id: 'w2',
        name: 'Marwah Chopra Legal',
        position: 'Assessment Intern, then Legal Trainee',
        location: 'New Delhi',
        url: '',
        startDate: '2024-12',
        endDate: '2025-06',
        summary: '',
        highlights: [
          'Reviewed 180 vendor contracts for a logistics client against a six-point risk checklist and escalated 27 carrying uncapped liability.',
          'Prepared first drafts of nine legal notices and four replies under the Consumer Protection Act, 2019, all issued with minor edits.',
          'Compiled the documentary evidence index in a ₹2.4 crore commercial suit, admitted by the court without objection.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Gujarat National Law University, Gandhinagar',
        area: 'Law (Corporate Law honours)',
        studyType: 'B.A. LL.B. (Hons.)',
        location: 'Gandhinagar, Gujarat',
        startDate: '2020-07',
        endDate: '2025-05',
        score: 'CGPA 8.2/10',
        url: '',
        summary:
          'Associate editor of the student journal on commercial law; convenor of the moot court society in the final year.',
        courses: ['Company Law', 'Securities Regulation', 'Arbitration', 'Contract Drafting'],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Saksham Legal Literacy Collective',
        position: 'Volunteer',
        url: '',
        startDate: '2022-08',
        endDate: '2025-04',
        summary: '',
        highlights: [
          'Ran 18 awareness sessions on maintenance and succession rights for about 600 women across four districts of Gujarat.',
          'Translated the collective’s rights handbook into Hindi, taking it from 300 printed copies a year to 2,400.',
        ],
      },
    ],
    awards: [
      {
        id: 'a1',
        title: 'Runner-up, National Corporate Law Moot Court Competition',
        date: '2024',
        awarder: 'Institute of Law, Nirma University',
        summary: 'Best Memorial (Respondent) among 42 teams.',
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Corporate advisory',
        level: '',
        keywords: [
          'Companies Act compliance',
          'Due diligence',
          'Shareholders agreements',
          'Board resolutions',
          'Charge filings',
        ],
      },
      {
        id: 's2',
        name: 'Drafting',
        level: '',
        keywords: [
          'Commercial contracts',
          'Term sheets',
          'Legal notices',
          'Non-disclosure agreements',
          'Research memoranda',
        ],
      },
      {
        id: 's3',
        name: 'Research',
        level: '',
        keywords: ['SCC Online', 'Manupatra', 'MCA21 filings', 'SEBI circulars', 'Case digests'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'All India Bar Examination', date: '2025', issuer: 'Bar Council of India', url: '' },
      { id: 'c2', name: 'Enrolled Advocate', date: '2025', issuer: 'Bar Council of Delhi', url: '' },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Hindi', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Konkani', fluency: 'Fluent', rating: 4 },
    ],
  }),
}

export default sample
