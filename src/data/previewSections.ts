import type { ResumeContent } from '@/types/document'
import { SAMPLE_CONTENT } from './sample'

/**
 * Sample content used by the "Add a section" gallery so every section card can
 * render a realistic preview in the user's actual template. Builds on the demo
 * resume and fills in the sections it doesn't include.
 */
export const PREVIEW_CONTENT: ResumeContent = {
  ...SAMPLE_CONTENT,
  volunteer: [
    {
      id: 'pv1',
      organization: 'Code for Good',
      position: 'Volunteer Mentor',
      url: '',
      startDate: '2021',
      endDate: '',
      summary: '',
      highlights: ['Mentored 12 students building their first full-stack apps.'],
    },
  ],
  publications: [
    {
      id: 'pp1',
      name: 'Scaling Event-Driven Systems',
      publisher: 'ACM Queue',
      releaseDate: '2023',
      url: '',
      summary: 'A practical guide to back-pressure and idempotency at scale.',
    },
  ],
  interests: [
    { id: 'pi1', name: 'Photography', keywords: ['Film', 'Street'] },
    { id: 'pi2', name: 'Trail running', keywords: [] },
    { id: 'pi3', name: 'Open source', keywords: [] },
  ],
  references: [
    { id: 'pr1', name: 'Dr. Jordan Lee', reference: 'VP Engineering, Vertex Labs — available on request.' },
  ],
}
