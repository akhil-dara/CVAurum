import type { LibrarySample } from '../types'
import { content } from '../types'
import { brandmark } from '../brandmark'
import { portrait } from '../avatar'

/**
 * Two years in. The trap for a visual designer this early is a résumé that
 * lists software; this one answers "what changed on the screen, and what
 * happened afterwards" for every line, and keeps the craft in the projects.
 */
export const sample: LibrarySample = {
  slug: 'ui-visual-designer',
  role: 'UI and Visual Designer',
  category: 'design',
  seniority: 'entry',
  region: 'india',
  template: 'opal',
  blurb:
    'Two years in, with every choice carrying a number: lesson completion, a type-scale cleanup, dual-script line length.',
  keywords: [
    'UI designer',
    'visual designer',
    'entry level designer',
    'typography',
    'design systems',
    'Figma portfolio',
  ],
  content: content({
    basics: {
      name: 'Kavya Iyer',
      label: 'UI and Visual Designer',
      image: portrait('Kavya Iyer'),
      email: 'kavya.iyer@example.com',
      phone: '+91 12345 70914',
      url: 'https://kavyaiyer.example.com',
      urlLabel: 'Portfolio',
      summary:
        'UI and visual designer two years into consumer software, working from type, grid and colour before pixels. Rebuilt a learning app’s lesson screen and took the share of sessions that finish a lesson from 47% to 71%. Draws and ships Tamil and English interfaces that stay readable in both scripts.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'kavyaiyerdesign', url: 'https://linkedin.com/in/kavyaiyerdesign' },
        { network: 'Behance', username: 'kavyaiyer', url: 'https://behance.net/kavyaiyer' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Thendral Learning',
        logo: brandmark('Thendral Learning'),
        position: 'UI Designer',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2025-02',
        endDate: '',
        summary: 'One of two designers on a 40-person learning app used across Tamil Nadu and Kerala.',
        highlights: [
          'Rebuilt the lesson screen around a single primary action and a visible progress rail, raising the share of sessions that finish a lesson from 47% to 71%.',
          'Set the type scale and eight-point spacing grid, replacing 31 one-off text sizes with six and ending the weekly argument over which grey belonged where.',
          'Designed the Tamil and English dual-script layout that holds a readable line length in both, after the first version broke onto three lines on five-inch screens.',
          'Draws the weekly illustration set for in-app announcements; those cards are opened by 38% of users against 21% for the plain ones they replaced.',
        ],
      },
      {
        id: 'w2',
        name: 'Curveline Studio',
        logo: brandmark('Curveline Studio'),
        position: 'Design Intern',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2024-06',
        endDate: '2025-01',
        summary: '',
        highlights: [
          'Produced the identity and a 24-screen UI kit for a clinic booking app, delivered to the client eight weeks after the brief.',
          'Redrew 60 icons onto one 24-pixel grid at a single 1.5-pixel stroke, ending the mismatched-weight rejections the client had sent back twice.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'Srishti Manipal Institute of Art, Design and Technology',
        area: 'Communication Design',
        studyType: 'B.Des.',
        location: 'Bengaluru, Karnataka',
        startDate: '2020-08',
        endDate: '2024-05',
        score: '8.6 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Kolam Type',
        description:
          'A free Tamil and Latin display typeface drawn to one x-height, released under the SIL Open Font License.',
        url: 'https://kolamtype.example.com',
        startDate: '2024-09',
        endDate: '2025-04',
        highlights: ['Downloaded 5,800 times and set on two regional news sites; 412 glyphs across three weights.'],
        keywords: ['Type design', 'Tamil script', 'Glyphs'],
      },
      {
        id: 'p2',
        name: 'Chennai Signboards',
        description:
          'A photographic archive of 400 hand-painted shop signs, each broken down into its palette and lettering.',
        url: 'https://signboards.example.com',
        startDate: '2023-01',
        endDate: '',
        highlights: ['Turned into a 12-swatch palette pack that 1,200 designers have downloaded.'],
        keywords: ['Colour', 'Lettering', 'Photography'],
      },
    ],
    skills: [
      {
        id: 's1',
        name: 'Visual',
        level: '',
        keywords: ['Typography', 'Grid systems', 'Colour and contrast', 'Iconography', 'Illustration'],
      },
      {
        id: 's2',
        name: 'Interface',
        level: '',
        keywords: ['UI design', 'Design systems', 'Responsive layout', 'Prototyping', 'Motion basics'],
      },
      {
        id: 's3',
        name: 'Tools',
        level: '',
        keywords: ['Figma', 'Illustrator', 'After Effects', 'Glyphs', 'Blender'],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Fluent', rating: 5 },
      { id: 'l2', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
