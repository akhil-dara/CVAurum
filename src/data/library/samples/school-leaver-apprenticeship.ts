import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Seventeen, no degree, and a genuinely strong page. Predicted grades and
 * GCSEs are the qualification, and the Saturday job, the club bench and the
 * school racer are the evidence. Nothing invented to fill space.
 */
export const sample: LibrarySample = {
  slug: 'school-leaver-apprenticeship',
  role: 'Engineering Apprentice',
  category: 'student',
  seniority: 'student',
  region: 'uk',
  template: 'minimal',
  blurb:
    'A Level 3 apprenticeship application: predicted A-levels, a Saturday bike workshop, and a school racer that placed 4th of 23.',
  keywords: [
    'apprenticeship CV',
    'school leaver CV',
    'engineering apprentice application',
    'A-level student CV',
    'first CV no experience',
    'Level 3 apprenticeship',
  ],
  guide: {
    why: [
      'Education leads the page with predicted grades, “Predicted A*AB” in maths, physics and design technology, which is what an apprenticeship screener checks first when there is no full-time work history to read.',
      'The Greenpower school racer is written as engineering, with a result and a measurement: the car finished 4th of 23 at the East Midlands heat and the loom lost 2.3 kg through a single fused distribution block.',
      'The Saturday job at Ashbourne Cycles reads as workshop experience, 15 to 20 bicycles a week including hydraulic brake bleeds and wheel builds, rather than as filler part-time work.',
      'The soldering safety sheet written for the youth engineering club, with no burns in the 14 months since, shows the safety habit an engineering employer looks for in a school leaver.',
    ],
    faq: [
      {
        q: 'How do you write a CV for an apprenticeship with no experience?',
        a: 'Lead with education and predicted grades, then use part-time work, school projects, clubs and volunteering as evidence. Give each a result, such as a race placing or a repair count, and keep the whole CV to one page.',
      },
      {
        q: 'Should predicted grades go on an apprenticeship CV?',
        a: 'Yes. In the UK, list predicted A-level or BTEC grades marked as predicted, with completed GCSEs below them. Bring forward the subjects the apprenticeship asks for, usually maths and a science for engineering.',
      },
      {
        q: 'How long should a school leaver CV be?',
        a: 'One page. A short personal statement, education, then experience and projects is enough. Leave out a photo, date of birth and references, which UK employers do not expect on a CV.',
      },
    ],
  },
  content: content({
    basics: {
      name: 'Callum Doherty',
      label: 'A-Level Student, Applying for a Level 3 Engineering Apprenticeship',
      image: '',
      email: 'callum.doherty@example.com',
      phone: '+44 7700 900212',
      url: '',
      summary:
        'Final-year A-level student in Derby, predicted A*AB in maths, physics and design technology, applying for a Level 3 engineering apprenticeship starting September 2027. Built the battery box and wiring loom for a school electric racer that finished 4th of 23, and has spent 18 months repairing bicycles on Saturdays.',
      location: { city: 'Derby', countryCode: 'GB' },
      profiles: [],
    },
    education: [
      {
        id: 'e1',
        institution: 'Landau Forte College Derby',
        area: 'Mathematics, Physics, Design and Technology',
        studyType: 'A-Levels',
        location: 'Derby',
        startDate: '2025-09',
        endDate: '2027-06',
        score: 'Predicted A*AB',
        url: '',
        summary: 'Design and Technology coursework is the electric racer battery enclosure described below.',
        status: 'pursuing',
        level: 'intermediate',
        courses: [],
      },
      {
        id: 'e2',
        institution: 'Landau Forte College Derby',
        area: 'Ten subjects including Mathematics, Physics, Chemistry and English Language',
        studyType: 'GCSEs',
        location: 'Derby',
        startDate: '2020-09',
        endDate: '2025-06',
        score: 'Grades 9-6, including 9 in Mathematics and 8 in Physics',
        url: '',
        summary: '',
        status: 'completed',
        level: 'secondary',
        courses: [],
      },
    ],
    work: [
      {
        id: 'w1',
        name: 'Ashbourne Cycles',
        position: 'Weekend Workshop Assistant',
        location: 'Derby',
        url: '',
        startDate: '2025-04',
        endDate: '',
        summary: 'Saturdays and school holidays in a four-person independent bike shop.',
        highlights: [
          'Services and repairs 15 to 20 bicycles a week, including hydraulic brake bleeds and wheel builds the shop previously sent out.',
          'Reorganised the spares wall by size rather than by brand, cutting the time to find a part from around four minutes to under one.',
          'Trained two new Saturday staff on the till and the workshop booking system.',
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'School electric racer, Greenpower',
        description: 'Electrical subteam on a single-seat electric car built by a six-student team.',
        url: '',
        startDate: '2025-10',
        endDate: '2026-07',
        highlights: [
          'Designed and built the battery enclosure and wiring loom; the car finished 4th of 23 at the East Midlands heat.',
          'Cut 2.3 kg from the loom and its mounts by moving to a single fused distribution block.',
        ],
        keywords: ['Fusion 360', 'Wiring looms', 'Soldering'],
      },
    ],
    volunteer: [
      {
        id: 'v1',
        organization: 'Derwent Valley Youth Engineering Club',
        position: 'Volunteer Workshop Assistant',
        url: '',
        startDate: '2024-09',
        endDate: '',
        summary: '',
        highlights: [
          'Runs the soldering bench at a Saturday club for 11- to 14-year-olds, teaching about 30 children a term.',
          'Wrote the club one-page soldering safety sheet after two burns in a term; there have been none in the 14 months since.',
        ],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Workshop',
        level: '',
        keywords: ['Bench fitting', 'Soldering', 'Hand tools', 'Torque settings', 'Bicycle mechanics'],
      },
      {
        id: 's2',
        name: 'Technical',
        level: '',
        keywords: ['Fusion 360', 'Technical drawing', 'Basic electronics', 'Multimeter testing', 'Excel'],
      },
      {
        id: 's3',
        name: 'Working with people',
        level: '',
        keywords: ['Customer service', 'Cash handling', 'Training new starters', 'Stock counts'],
      },
    ],
    certificates: [
      { id: 'c1', name: 'CREST Gold Award', date: '2026', issuer: 'British Science Association', url: '' },
    ],
    awards: [
      {
        id: 'a1',
        title: "Duke of Edinburgh's Silver Award",
        date: '2025',
        awarder: "The Duke of Edinburgh's Award",
        summary: '',
      },
    ],
  }),
  tweaks: (m) => {
    m.layout.main = ['summary', 'education', 'work', 'projects', 'volunteer', 'skills', 'certificates', 'awards']
    m.layout.headings = { ...m.layout.headings, work: 'Part-Time Work' }
  },
}

export default sample
