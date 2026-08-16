import { describe, expect, it } from 'vitest'
import { parseSimpleList, parseSkills, splitSections } from './parse'
import type { Item, LayoutGraph, Line } from './layoutGraph'

// Minimal Line factory — only the fields parseSimpleList reads (text, bold)
// carry meaning here; the geometry fields are inert placeholders.
const line = (text: string, bold: boolean, height = 12, top = 0, page = 1): Line => ({
  text,
  items: [],
  x: 0,
  right: 100,
  top,
  height,
  bold,
  upper: false,
  page,
  col: 0,
  aside: false,
})

describe('parseSimpleList certificates — name/issuer pairing (2026-08-16)', () => {
  // Our own exports (and most designed resumes) render a cert as a BOLD
  // name line followed by a muted issuer line. The importer used to turn
  // both into separate certificates ("AWS Certified..." + "Amazon Web
  // Services" imported as TWO certs — found by the multi-page round-trip
  // probe, reproduced on single-page).
  it('pairs a non-bold line after a bold name as its issuer', () => {
    const out = parseSimpleList(
      [line('AWS Certified Solutions Architect', true), line('Amazon Web Services', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('AWS Certified Solutions Architect')
    expect(out[0].issuer).toBe('Amazon Web Services')
  })

  it('keeps bold-only lines as separate certificates (designed list of many)', () => {
    const out = parseSimpleList(
      [line('Cert A', true), line('Issuer A', false), line('Cert B', true), line('Issuer B', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B'])
    expect(out.map((c) => c.issuer)).toEqual(['Issuer A', 'Issuer B'])
  })

  it('keeps the flat one-per-line behavior when the section has NO bold structure', () => {
    // Real-world plain lists (one cert per line, no styling survived
    // extraction) must not get pairwise-merged.
    const out = parseSimpleList(
      [line('CCNA', false), line('CompTIA Security+', false), line('CKA', false)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['CCNA', 'CompTIA Security+', 'CKA'])
  })

  it('a second consecutive non-bold line becomes its own cert, not a second issuer', () => {
    const out = parseSimpleList(
      [line('Cert A', true), line('Issuer A', false), line('Orphan line', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Orphan line'])
    expect(out[0].issuer).toBe('Issuer A')
  })

  it('an all-bold list stays one cert per line', () => {
    const out = parseSimpleList([line('Cert A', true), line('Cert B', true)], 'certificates') as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B'])
  })

  // Native exports carry NO weight in embedded font names (the font
  // pipeline normalizes them so static instances round-trip), so the
  // extractor's bold flag is always false on our own PDFs. The signal that
  // DOES survive is line height: the name renders larger than the muted
  // issuer line (measured 9.6 vs 8.8 on classic).
  it('pairs a SMALLER non-bold line after a larger name line as its issuer (native exports)', () => {
    const out = parseSimpleList(
      [line('AWS Certified Solutions Architect 2022', false, 9.6), line('Amazon Web Services', false, 8.8)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].issuer).toBe('Amazon Web Services')
  })

  it('keeps a flat same-height non-bold list one cert per line', () => {
    const out = parseSimpleList(
      [line('CCNA', false, 9.6), line('CompTIA Security+', false, 9.6), line('CKA', false, 9.6)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['CCNA', 'CompTIA Security+', 'CKA'])
  })

  it('ignores sub-half-px height jitter in a flat list', () => {
    const out = parseSimpleList(
      [line('Cert A', false, 9.6), line('Cert B', false, 9.35), line('Cert C', false, 9.55)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B', 'Cert C'])
  })

  // Narrow aside columns WRAP the cert name ("AWS Certified" / "Solutions
  // Architect 2022" / "Amazon Web Services") — found by the import gate on
  // double/portrait/deedy, which turned one cert into two or three. Lines
  // inside one tight gap-cluster with the SAME prominence as the first are
  // name continuations and join; flat lists cluster one line each and stay
  // separate.
  it('joins a wrapped name inside one tight cluster (narrow aside columns)', () => {
    const out = parseSimpleList(
      [
        line('AWS Certified', false, 9.6, 0),
        line('Solutions Architect 2022', false, 9.6, 12),
        line('Amazon Web Services', false, 8.8, 24),
      ],
      'certificates',
      12
    ) as { name: string; issuer: string; date: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('AWS Certified Solutions Architect')
    expect(out[0].issuer).toBe('Amazon Web Services')
    expect(out[0].date).toBe('2022')
  })

  it('keeps gap-separated same-prominence certs separate (flat list with real gaps)', () => {
    const out = parseSimpleList(
      [line('CCNA', false, 9.6, 0), line('CompTIA Security+', false, 9.6, 30), line('CKA', false, 9.6, 60)],
      'certificates',
      12
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['CCNA', 'CompTIA Security+', 'CKA'])
  })

  // Atelier renders cert name and issuer at IDENTICAL prominence (8.83px
  // both, no bold), so the prominence rule cannot pair them. In an
  // UNSTRUCTURED tight cluster the YEAR anchors the entry: a year-carrying
  // line starts a cert, yearless followers attach as its issuer. Undated
  // flat lists (CCNA-style) keep one-per-line.
  it('pairs equal-prominence name+issuer when the name carries the year (atelier)', () => {
    const out = parseSimpleList(
      [line('AWS Certified Solutions Architect 2022', false, 8.83, 0), line('Amazon Web Services', false, 8.83, 16)],
      'certificates',
      15.4
    ) as { name: string; issuer: string; date: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('AWS Certified Solutions Architect')
    expect(out[0].issuer).toBe('Amazon Web Services')
    expect(out[0].date).toBe('2022')
  })

  it('keeps a tight all-dated list one cert per line (each line anchors an entry)', () => {
    const out = parseSimpleList(
      [line('CCNA 2020', false, 9.6, 0), line('CKA 2021', false, 9.6, 12)],
      'certificates',
      12
    ) as { name: string; date: string }[]
    expect(out.map((c) => `${c.name}|${c.date}`)).toEqual(['CCNA|2020', 'CKA|2021'])
  })

  it('pulls the year merged into the FIRST wrapped fragment (right-aligned date)', () => {
    const out = parseSimpleList(
      [
        line('AWS Certified 2022', false, 9.6, 0),
        line('Solutions Architect', false, 9.6, 12),
        line('Amazon Web Services', false, 8.8, 24),
      ],
      'certificates',
      12
    ) as { name: string; issuer: string; date: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('AWS Certified Solutions Architect')
    expect(out[0].date).toBe('2022')
    expect(out[0].issuer).toBe('Amazon Web Services')
  })
})

describe('parseSimpleList awards — cluster + role assignment (2026-08-16)', () => {
  // One award used to import as THREE (title, awarder, summary each their
  // own award — live-measured on classic: title h9.6, awarder h8.83,
  // summary h9.6, so prominence ALONE cannot classify the summary line).
  // Awards therefore cluster by vertical gap first (itemGap between awards
  // is far larger than line spacing within one), then assign roles inside
  // each cluster: first line = title; a visibly less prominent short line
  // = awarder; everything else joins the summary.
  it('imports title + awarder + summary as ONE award (native heights, gap-clustered)', () => {
    const out = parseSimpleList(
      [
        line('Engineering Excellence Award 2023', false, 9.6, 0),
        line('Vertex Labs', false, 8.83, 12),
        line('Top 2% of engineering org for impact and leadership.', false, 9.6, 24),
      ],
      'awards',
      12
    ) as { title: string; awarder: string; summary: string; date: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Engineering Excellence Award')
    expect(out[0].date).toBe('2023')
    expect(out[0].awarder).toBe('Vertex Labs')
    expect(out[0].summary).toBe('Top 2% of engineering org for impact and leadership.')
  })

  it('splits two awards at the itemGap boundary', () => {
    const out = parseSimpleList(
      [
        line('Award A', false, 9.6, 0),
        line('Issuer A', false, 8.83, 12),
        line('Award B', false, 9.6, 42),
        line('Issuer B', false, 8.83, 54),
      ],
      'awards',
      12
    ) as { title: string; awarder: string }[]
    expect(out.map((a) => a.title)).toEqual(['Award A', 'Award B'])
    expect(out.map((a) => a.awarder)).toEqual(['Issuer A', 'Issuer B'])
  })

  it('keeps a flat unstyled tight list one award per line', () => {
    const out = parseSimpleList(
      [
        line("Dean's List", false, 9.6, 0),
        line('Hackathon Winner 2021', false, 9.6, 12),
        line('Best Paper Award', false, 9.6, 24),
      ],
      'awards',
      12
    ) as { title: string }[]
    expect(out.map((a) => a.title)).toEqual(["Dean's List", 'Hackathon Winner', 'Best Paper Award'])
  })

  it('bold title with same-height plain awarder and summary still groups (print-style)', () => {
    const out = parseSimpleList(
      [
        line('Award A', true, 9.6, 0),
        line('Vertex Labs', false, 9.6, 12),
        line('Recognized for sustained excellence across releases.', false, 9.6, 24),
      ],
      'awards',
      12
    ) as { title: string; awarder: string; summary: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].awarder).toBe('Vertex Labs')
    expect(out[0].summary).toBe('Recognized for sustained excellence across releases.')
  })

  it('a page break between clusters starts a new award (multi-page sections)', () => {
    const out = parseSimpleList(
      [line('Award A', false, 9.6, 900, 1), line('Award B', false, 9.6, 40, 2)],
      'awards',
      12
    ) as { title: string }[]
    expect(out.map((a) => a.title)).toEqual(['Award A', 'Award B'])
  })

  it('pulls a trailing year off the title into the date field', () => {
    const out = parseSimpleList(
      [line('Engineering Excellence Award 2023', false, 9.6, 0), line('Vertex Labs', false, 8.83, 12)],
      'awards',
      12
    ) as { title: string; date: string }[]
    expect(out[0].title).toBe('Engineering Excellence Award')
    expect(out[0].date).toBe('2023')
  })

  it('groups an equal-prominence award by its year anchor (atelier: summary is even LARGER than the title)', () => {
    const out = parseSimpleList(
      [
        line('Engineering Excellence Award 2023', false, 8.83, 0),
        line('Vertex Labs', false, 8.83, 16),
        line('Top 2% of engineering org for impact and leadership.', false, 9.6, 30),
      ],
      'awards',
      15.4
    ) as { title: string; awarder: string; date: string; summary: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Engineering Excellence Award')
    expect(out[0].date).toBe('2023')
    expect(out[0].awarder).toBe('Vertex Labs')
    expect(out[0].summary).toBe('Top 2% of engineering org for impact and leadership.')
  })

  it('joins a wrapped title across same-prominence lines (narrow columns)', () => {
    const out = parseSimpleList(
      [
        line('Engineering Excellence', false, 9.6, 0),
        line('Award 2023', false, 9.6, 12),
        line('Vertex Labs', false, 8.83, 24),
        line('Top 2% of engineering org for impact and leadership.', false, 9.6, 36),
      ],
      'awards',
      12
    ) as { title: string; awarder: string; date: string; summary: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Engineering Excellence Award')
    expect(out[0].date).toBe('2023')
    expect(out[0].awarder).toBe('Vertex Labs')
    expect(out[0].summary).toBe('Top 2% of engineering org for impact and leadership.')
  })
})

describe('parseSimpleList publications — cluster + role assignment (2026-08-16)', () => {
  // Publications were DETECTED as a section but had no parser case at all —
  // the whole section silently vanished on import. They share the awards
  // shape (prominent name line, muted publisher line, summary), so they
  // share the cluster machinery.
  it('imports name + publisher + summary as ONE publication', () => {
    const out = parseSimpleList(
      [
        line('A Study of Long Resumes 2024', false, 9.6, 0),
        line('CV Journal', false, 8.83, 12),
        line('Findings on pagination quality.', false, 9.6, 24),
      ],
      'publications',
      12
    ) as { name: string; publisher: string; releaseDate: string; summary: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('A Study of Long Resumes')
    expect(out[0].publisher).toBe('CV Journal')
    expect(out[0].releaseDate).toBe('2024')
    expect(out[0].summary).toBe('Findings on pagination quality.')
  })
})

describe('parseSimpleList languages — right-aligned fluency runs (2026-08-16)', () => {
  // Our templates render the language left and its fluency right-aligned:
  // one extracted line, TWO text runs separated by a huge gap (measured
  // x36.8..x534.2 on aurum). "English Native" used to import as the
  // language name with empty fluency.
  const twoRun = (a: string, b: string): Line => ({
    ...line(`${a} ${b}`, false, 9.8),
    items: [
      { str: a, x: 36.8, top: 0, width: 30, height: 9.8, bold: false, page: 1, col: 0, aside: false },
      { str: b, x: 534.2, top: 0, width: 24, height: 9, bold: false, page: 1, col: 0, aside: false },
    ],
  })
  it('splits a far-gap two-run line into language and fluency', () => {
    const out = parseSimpleList([twoRun('English', 'Native')], 'languages') as { language: string; fluency: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].language).toBe('English')
    expect(out[0].fluency).toBe('Native')
  })
  it('keeps comma-list and parenthesis behavior for single-run lines', () => {
    const out = parseSimpleList([proseLine('English (Native), Spanish (Professional)', 9.8)], 'languages') as {
      language: string
      fluency: string
    }[]
    expect(out.map((l) => `${l.language}|${l.fluency}`)).toEqual(['English|Native', 'Spanish|Professional'])
  })
})

// Items positioned with CHIP-row spacing: each token its own text run with
// a large inter-run gap (chip padding, measured ~13pt on aurum vs ~0 for
// style-split prose runs).
const chipItems = (tokens: string[], gap = 13): Item[] => {
  let x = 40
  return tokens.map((str) => {
    const width = str.length * 4
    const it: Item = { str, x, top: 0, width, height: 8.8, bold: false, page: 1, col: 0, aside: false }
    x += width + gap
    return it
  })
}
const chipLine = (tokens: string[], height = 8.8, top = 0): Line => ({
  ...line(tokens.join(' '), false, height, top),
  items: chipItems(tokens),
})
const proseLine = (text: string, height = 9.8, top = 0): Line => {
  // one continuous run — the common extraction shape for prose
  const l = line(text, false, height, top)
  l.items = [{ str: text, x: 40, top, width: text.length * 4, height, bold: false, page: 1, col: 0, aside: false }]
  return l
}

describe('parseSkills — chip rows and group-name pairing (2026-08-16)', () => {
  // Designed templates render skills as a group-name line over a row of
  // chips; the chips extract as ONE space-separated line that the old
  // keyword-list test rejected (no commas, >4 words), so aurum/obsidian
  // imported skills: [] while the layout graph held every chip as its own
  // text run. Chip rows are recognized by their item geometry (>=2 runs,
  // every inter-run gap >= 3pt) and keywords recovered per RUN — multi-word
  // chips survive intact.
  it('recovers a group name + chip row as one named group with per-chip keywords', () => {
    const out = parseSkills([
      proseLine('Languages', 9.8, 0),
      chipLine(['TypeScript', 'Go', 'Python', 'SQL', 'Rust'], 8.8, 12),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Languages')
    expect(out[0].keywords).toEqual(['TypeScript', 'Go', 'Python', 'SQL', 'Rust'])
  })

  it('keeps multi-word chips whole (per-run, not per-space)', () => {
    const out = parseSkills([proseLine('Cloud', 9.8, 0), chipLine(['Google Cloud', 'CI/CD', 'AWS'], 8.8, 12)])
    expect(out[0].keywords).toEqual(['Google Cloud', 'CI/CD', 'AWS'])
  })

  it('a chip row with no preceding group name becomes an unnamed group', () => {
    const out = parseSkills([chipLine(['React', 'Vue', 'Svelte'], 8.8, 0)])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('')
    expect(out[0].keywords).toEqual(['React', 'Vue', 'Svelte'])
  })

  it('still parses colon-style lines (harvard) exactly as before', () => {
    const out = parseSkills([proseLine('Languages: TypeScript, Go, Python', 9.8, 0)])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Languages')
    expect(out[0].keywords).toEqual(['TypeScript', 'Go', 'Python'])
  })

  it('does not treat a prose sentence as chips', () => {
    const out = parseSkills([proseLine('Built reliable systems for high scale platforms over eight years.', 9.8, 0)])
    expect(out).toHaveLength(0)
  })
})

const graph = (lines: Line[]): LayoutGraph => ({
  lines,
  bodySize: 9.8,
  lineGap: 12,
  pageCount: 1,
  charCount: lines.reduce((n, l) => n + l.text.length, 0),
  twoColumn: false,
  ocrPages: [],
  ocrEngineFailed: false,
})
const upperLine = (text: string, height = 9): Line => ({ ...line(text, false, height), upper: true })

describe('splitSections — plain group labels vs Tier-0 headings (2026-08-16)', () => {
  // aurum imported skills as [] and languages TWICE: the plain-case group
  // label "Languages" inside the skills section matched Tier 0 (phrase-only,
  // zero style requirement) and split the section, swallowing every chip
  // row into a bogus languages section. Once a document has shown STYLED
  // headings (caps/bold/oversize), a plain line no longer qualifies for
  // Tier 0; documents whose headings are all plain (real-world PDFs with no
  // surviving style) keep the lenient behavior.
  it('does not split a styled-heading document at a plain group label', () => {
    const secs = splitSections(
      graph([
        upperLine('SKILLS'),
        proseLine('Languages', 9.8),
        chipLine(['TypeScript', 'Go', 'Python'], 8.8),
        upperLine('LANGUAGES'),
        proseLine('English Native', 9.8),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'skills', 'languages'])
    expect(secs[1].lines.map((l) => l.text)).toEqual(['Languages', 'TypeScript Go Python'])
  })

  it('rejects a group label smaller than the established PLAIN heading height (technical)', () => {
    // technical's real headings are lowercase and unbolded, just 0.6px
    // taller than body (9.9 vs 9.3) — under the styled bar. The height of
    // accepted plain headings is the reference: the 9.3px group label
    // "Languages" no longer splits the skills section.
    const secs = splitSections(
      graph([
        proseLine('experience', 9.9),
        proseLine('Engineer at Vertex Labs doing platform work', 9.3),
        proseLine('skills', 9.9),
        proseLine('Languages', 9.3),
        chipLine(['TypeScript', 'Go', 'Python'], 9.3, 12),
        proseLine('languages', 9.9, 30),
        proseLine('English, Spanish', 9.3, 42),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'work', 'skills', 'languages'])
    expect(secs[2].lines.map((l) => l.text)).toEqual(['Languages', 'TypeScript Go Python'])
  })

  it('still accepts plain headings when the document has no styled ones', () => {
    const secs = splitSections(
      graph([
        proseLine('Experience', 9.8),
        proseLine('Engineer at Vertex Labs doing platform work', 9.8),
        proseLine('Languages', 9.8),
        proseLine('English, Spanish', 9.8),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'work', 'languages'])
  })

  // Side-label templates (atelier) put the section label LEFT of the body
  // on the SAME baseline, so extraction merges them into one line:
  // "EXPERIENCE Senior Software Engineer Mar 2021" swallowed each
  // section's first content line (work lost entry 1, languages lost
  // English, the cert name vanished leaving the issuer as the name). A
  // heading matched as a PREFIX of a longer line now splits: the phrase
  // starts the section, the remainder re-enters as its first content line
  // (items split at the phrase boundary so chip rows survive).
  it('splits a merged side-label heading from its first content line', () => {
    const merged: Line = {
      ...proseLine('EXPERIENCE Senior Software Engineer Mar 2021', 9.8),
      upper: false,
      items: [
        { str: 'EXPERIENCE', x: 40, top: 0, width: 60, height: 9.8, bold: false, page: 1, col: 0, aside: false },
        {
          str: 'Senior Software Engineer Mar 2021',
          x: 150,
          top: 0,
          width: 200,
          height: 9.8,
          bold: false,
          page: 1,
          col: 0,
          aside: false,
        },
      ],
    }
    const secs = splitSections(graph([merged, proseLine('Vertex Labs San Francisco, CA', 9.8, 12)]))
    expect(secs.map((s) => s.key)).toEqual(['header', 'work'])
    expect(secs[1].lines.map((l) => l.text)).toEqual([
      'Senior Software Engineer Mar 2021',
      'Vertex Labs San Francisco, CA',
    ])
    expect(secs[1].lines[0].items.map((i) => i.str)).toEqual(['Senior Software Engineer Mar 2021'])
  })

  it('does NOT split all-caps heading residue into fake content', () => {
    const secs = splitSections(graph([{ ...proseLine('EXPERIENCE & EMPLOYMENT HISTORY', 9.8), upper: true }]))
    expect(secs.map((s) => s.key)).toEqual(['header', 'work'])
    expect(secs[1].lines).toHaveLength(0)
  })
})

describe('parseLayout — monogram furniture (2026-08-16)', () => {
  it("drops a standalone line matching the person's initials (continuation-page monogram)", async () => {
    const { parseLayout } = await import('./parse')
    const g = graph([
      { ...proseLine('Alex Morgan', 24), x: 232 },
      { ...upperLine('VOLUNTEERING', 11) },
      { ...proseLine('AM', 9.8, 40, ), upper: true, page: 2 },
      proseLine('Mentor Jan 2022 — Jan 2023', 9.8, 52),
      proseLine('Open Source Aid', 9.2, 64),
    ])
    g.lines[2].page = 2
    const r = parseLayout(g)
    expect(r.content.basics.name).toBe('Alex Morgan')
    expect(r.content.volunteer).toHaveLength(1)
    expect(r.content.volunteer[0].organization).toBe('Open Source Aid')
    expect(r.content.volunteer[0].position).toBe('Mentor')
    const all = JSON.stringify(r.content.volunteer)
    expect(all).not.toContain('"AM"')
  })
})
