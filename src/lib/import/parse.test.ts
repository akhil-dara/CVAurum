import { describe, expect, it } from 'vitest'
import { parseLayout, parseSimpleList, parseSkills, splitSections } from './parse'
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
      { ...proseLine('AM', 9.8, 40), upper: true, page: 2 },
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

// A NARROW sidebar wraps one logical chip row across many physical lines.
// Round-tripping the author's own resume through sapphire showed the cost:
// 12 groups of ~2 keywords each ("Programming & Querying:2", "?:2", "?:2",
// ...) and only 25 of 70 keywords surviving, because every physical row
// started a NEW group and the 12-group cap then dropped the rest.
// Measured on a sapphire export (pt): group names sit at x=54 h=8.2, chips
// at x=58.8 h=7.3; a new chip row is 16.9 below the last, while a chip whose
// own text WRAPPED sits only 10.2 below. Left edge + height identify a chip
// line; the vertical pitch separates "next row" from "continuation".
const sidebarName = (text: string, top: number): Line => {
  const l = line(text, false, 8.2, top)
  l.x = 54
  l.items = [{ str: text, x: 54, top, width: text.length * 4, height: 8.2, bold: false, page: 1, col: 0, aside: true }]
  return l
}
const sidebarChips = (tokens: string[], top: number): Line => {
  let x = 58.8
  const items: Item[] = tokens.map((str) => {
    const width = str.length * 4
    const it: Item = { str, x, top, width, height: 7.3, bold: false, page: 1, col: 0, aside: true }
    x += width + 12.7
    return it
  })
  return { ...line(tokens.join(' '), false, 7.3, top), x: 58.8, items, aside: true }
}

describe('parseSkills — wrapped chip rows in a narrow sidebar (2026-08-23)', () => {
  it('merges every physical chip row under one group name', () => {
    const out = parseSkills([
      sidebarName('Programming & Querying', 78.9),
      sidebarChips(['SQL', 'T-SQL'], 93.2),
      sidebarChips(['Query Optimisation', 'Python'], 110.1),
      sidebarChips(['Pandas', 'NumPy'], 127),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Programming & Querying')
    expect(out[0].keywords).toEqual(['SQL', 'T-SQL', 'Query Optimisation', 'Python', 'Pandas', 'NumPy'])
  })

  it('does not mistake a lone wrapped chip for the next group name', () => {
    // "Stored Procedures" is a single chip on its own physical row; the old
    // rule read it as a group NAME and hung the following row under it.
    const out = parseSkills([
      sidebarName('Programming & Querying', 78.9),
      sidebarChips(['SQL', 'T-SQL'], 93.2),
      sidebarChips(['Stored Procedures'], 110.1),
      sidebarChips(['Query Optimisation', 'Python'], 127),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].keywords).toEqual(['SQL', 'T-SQL', 'Stored Procedures', 'Query Optimisation', 'Python'])
  })

  it('rejoins a chip whose own text wrapped onto a second line', () => {
    // pitch 10.2 (< one row) means continuation of the chip above, not a new
    // chip: "Salesforce CRM Analytics" + "(Einstein / TCRM)".
    const out = parseSkills([
      sidebarName('BI, Reporting & Visualisation', 284),
      sidebarChips(['Power BI', 'DAX'], 298.2),
      sidebarChips(['TIBCO Spotfire'], 315.1),
      sidebarChips(['Salesforce CRM Analytics'], 332.1),
      sidebarChips(['(Einstein / TCRM)'], 342.3),
      sidebarChips(['KPI Scorecards'], 359.2),
    ])
    expect(out[0].name).toBe('BI, Reporting & Visualisation')
    expect(out[0].keywords).toEqual([
      'Power BI',
      'DAX',
      'TIBCO Spotfire',
      'Salesforce CRM Analytics (Einstein / TCRM)',
      'KPI Scorecards',
    ])
  })

  it('keeps a multi-word group name that the lexical test rejected', () => {
    // "Databases & Data Management" is 4 words, so groupNameish (<=3) failed
    // it and the name leaked into the loose pile as keywords.
    const out = parseSkills([
      sidebarName('Databases & Data Management', 181.5),
      sidebarChips(['Microsoft SQL Server', 'MySQL'], 195.7),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Databases & Data Management')
    expect(out[0].keywords).toEqual(['Microsoft SQL Server', 'MySQL'])
  })

  it('never drops keywords when a document has more groups than the cap', () => {
    const lines: Line[] = []
    for (let i = 0; i < 15; i++) {
      lines.push(sidebarName(`Group ${i}`, i * 40))
      lines.push(sidebarChips([`kw${i}a`, `kw${i}b`], i * 40 + 14))
    }
    const out = parseSkills(lines)
    const all = out.flatMap((s) => s.keywords)
    for (let i = 0; i < 15; i++) expect(all).toContain(`kw${i}b`)
  })
})

describe('splitSections — verbose heading labels in plain-heading documents (2026-08-23)', () => {
  // Sweeping the author's resume across all 52 templates found EIGHT
  // (classic, ivy, newton, cambridge, vector, technical, academic,
  // aurum-editorial) returning skills 0/70, and several of those also losing
  // a whole job and most bullets. Cause: those templates style headings only
  // by size — measured on classic, body 9.495 vs heading 10.1, under the
  // 1.14x "styled" bar — so headings are recognised by the plain-case Tier 0
  // path alone, which caps at 3 words AND demands <=6 leftover letters after
  // the matched phrase. The document's own heading, "Technical Skills & Core
  // Competencies", is 5 words with 16 leftover letters, so the section was
  // never opened and its skills bled into the section above it.
  const heading = (t: string) => proseLine(t, 10.1)
  const body = (t: string) => proseLine(t, 9.5)

  it('opens the skills section on a verbose custom label', () => {
    const secs = splitSections(
      graph([
        heading('Summary'),
        body('Analyst with four years across data and service operations.'),
        heading('Professional Experience'),
        body('Data Analyst, Tata Consultancy Services'),
        heading('Technical Skills & Core Competencies'),
        body('Programming & Querying: SQL, T-SQL, Stored Procedures'),
        heading('Education'),
        body('Master of Computer Application'),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'summary', 'work', 'skills', 'education'])
  })

  it('accepts a label whose extra words are the same section vocabulary', () => {
    const secs = splitSections(
      graph([heading('Skills & Areas of Expertise'), body('SQL, Python, Power BI')])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'skills'])
  })

  it('still rejects a body sentence that merely starts with a section word', () => {
    // The word cap is what keeps prose out; loosening it must not let a
    // sentence beginning "Experience..." open a section.
    const secs = splitSections(
      graph([heading('Summary'), heading('Experience with modern data platforms and tooling')])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'summary'])
  })
})

describe('parseBasics — name merged with the headline on one line (2026-08-23)', () => {
  // compact packs name and headline onto ONE line and renders it SMALLER
  // than body text (measured: 5.7 against a 6.46 body), so no "largest text
  // wins" heuristic reaches it. scoreName judged the whole string — long,
  // and carrying the separators — and gave it -3, below the >0 cut, so the
  // header contributed no name at all and a document-wide fallback imported
  // "Master of Computer Applications" out of the education section as the
  // candidate's name. Worst possible ATS field to get wrong.
  const hdr = (lines: Line[]): LayoutGraph => ({
    lines,
    bodySize: 6.4575,
    lineGap: 9,
    pageCount: 1,
    charCount: lines.reduce((n, l) => n + l.text.length, 0),
    twoColumn: false,
    ocrPages: [],
    ocrEngineFailed: false,
  })

  it('takes the leading name when a separator joins it to the role', () => {
    const r = parseLayout(
      hdr([
        proseLine('Gowthami Pemmadi — Data Analyst | Business Analyst | Operations', 5.7, 45),
        proseLine('gowthami.pemmadi9@gmail.com +91 93910 22393 Hyderabad, India', 6.1, 55),
        upperLine('SUMMARY', 6.1),
        proseLine('Analyst with four years across data and service operations.', 6.5, 82),
        upperLine('EDUCATION', 6.1),
        proseLine('Master of Computer Applications', 6.5, 110),
      ])
    )
    expect(r.content.basics.name).toBe('Gowthami Pemmadi')
  })

  it('keeps the role from the same line as the headline', () => {
    const r = parseLayout(
      hdr([
        proseLine('Gowthami Pemmadi — Data Analyst | Business Analyst', 5.7, 45),
        proseLine('gowthami.pemmadi9@gmail.com +91 93910 22393', 6.1, 55),
      ])
    )
    expect(r.content.basics.label).toContain('Data Analyst')
  })

  it('does not treat an ordinary sentence with a dash as a name line', () => {
    const r = parseLayout(
      hdr([
        proseLine('Alex Morgan', 9, 45),
        proseLine('alex@example.com', 6.1, 55),
        upperLine('SUMMARY', 6.1),
        proseLine('Senior engineer — builds reliable platforms at scale.', 6.5, 82),
      ])
    )
    expect(r.content.basics.name).toBe('Alex Morgan')
  })
})

describe('parseBasics — a headline is not a merged name line (2026-08-23)', () => {
  // onyx puts the name on its own line and the roles on the next one. That
  // roles line ("Data Analyst | Business Analyst | ...") has the very same
  // "capitalised words then a separator" shape as compact's merged header,
  // and when the bonus was scored positionally-blind it won, importing the
  // candidate's name as "Data Analyst".
  it('prefers the name line over a following roles line', () => {
    const r = parseLayout({
      lines: [
        upperLine('GOWTHAMI PEMMADI', 12),
        proseLine('Data Analyst | Business Analyst | Operations & Integration', 7, 20),
        proseLine('gowthami.pemmadi9@gmail.com +91 93910 22393', 6.5, 32),
      ],
      bodySize: 6.5,
      lineGap: 9,
      pageCount: 1,
      charCount: 120,
      twoColumn: false,
      ocrPages: [],
      ocrEngineFailed: false,
    })
    expect(r.content.basics.name).toBe('GOWTHAMI PEMMADI')
  })
})

describe('splitSections — a section label that wraps onto two lines (2026-08-23)', () => {
  // Side-label templates (contemporary, slate) set the section label to the
  // LEFT of the body on the same baseline, so extraction merges them. When
  // the label itself WRAPS, each half merges into a different content line:
  //   "PROFESSIONAL  T Data Analyst - Client: Nexperia  Jun 2023 - Present"
  //   "EXPERIENCE    Tata Consultancy Services (TCS)  Hyderabad, India"
  // Only the second half matches a heading, so the section opened one line
  // late and the first job's title and dates were stranded in the section
  // above — measured as work 1/2 on the author's resume.
  it('opens the section at the FIRST half of a wrapped side label', () => {
    const secs = splitSections(
      graph([
        upperLine('SUMMARY', 9.8),
        proseLine('Analyst with four years across data and service operations.', 9.3),
        proseLine('PROFESSIONAL T Data Analyst — Client: Nexperia Jun 2023 — Present', 8.4),
        proseLine('EXPERIENCE Tata Consultancy Services (TCS) Hyderabad, India', 8.4),
        proseLine('Designed and own the Operational View dashboards in Spotfire.', 8.4),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'summary', 'work'])
    const work = secs[2].lines.map((l) => l.text)
    expect(work[0]).toContain('Data Analyst')
    expect(work[0]).toContain('Jun 2023')
    expect(work[1]).toContain('Tata Consultancy Services')
  })

  // sapphire's own heading wraps as "TECHNICAL SKILLS &" / "CORE
  // COMPETENCIES" with no content merged in. Both halves match the skills
  // phrase, so the document reported TWO skills sections and the second
  // one's first chip line was read as a group name.
  it('does not open a second section on the continuation half', () => {
    const secs = splitSections(
      graph([
        upperLine('TECHNICAL SKILLS &', 9.8),
        upperLine('CORE COMPETENCIES', 9.8),
        proseLine('Programming & Querying: SQL, T-SQL', 9.3),
      ])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'skills'])
    expect(secs[1].lines.map((l) => l.text)).toEqual(['Programming & Querying: SQL, T-SQL'])
  })

  it('leaves two genuinely different headings alone', () => {
    const secs = splitSections(
      graph([upperLine('EDUCATION', 9.8), proseLine('Master of Computer Application', 9.3), upperLine('LANGUAGES', 9.8), proseLine('English, Telugu', 9.3)])
    )
    expect(secs.map((s) => s.key)).toEqual(['header', 'education', 'languages'])
  })
})

// Measured on the `aside` template: group names at x=437.4 h=8.2, chips at
// x=442.2 h=7.4, chip rows 16.0 apart, wrapped lines 10.5 apart.
const asideName = (text: string, top: number): Line => {
  const l = line(text, false, 8.2, top)
  l.x = 437.4
  l.items = [{ str: text, x: 437.4, top, width: text.length * 4, height: 8.2, bold: false, page: 1, col: 2, aside: true }]
  return l
}
const asideChips = (tokens: string[], top: number): Line => {
  let x = 442.2
  const items: Item[] = tokens.map((str) => {
    const width = str.length * 4
    const it: Item = { str, x, top, width, height: 7.4, bold: false, page: 1, col: 2, aside: true }
    x += width + 12.7
    return it
  })
  return { ...line(tokens.join(' '), false, 7.4, top), x: 442.2, items, aside: true }
}

describe('parseSkills — a group whose first chip stands alone (2026-08-23)', () => {
  it('starts the group at the chip ABOVE the first multi-chip row', () => {
    // "Microsoft SQL Server" is a chip on its own line, so no chip row began
    // there; it was read as the group NAME and the real name was discarded.
    const out = parseSkills([
      asideName('Databases & Data Management', 183.8),
      asideChips(['Microsoft SQL Server'], 207.6),
      asideChips(['MySQL', 'SSMS'], 223.6),
      asideChips(['Data Modelling', 'Data Quality'], 239.6),
      asideChips(['Data Validation'], 255.6),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Databases & Data Management')
    expect(out[0].keywords).toEqual(['Microsoft SQL Server', 'MySQL', 'SSMS', 'Data Modelling', 'Data Quality', 'Data Validation'])
  })

  it('joins a group name that wrapped onto two lines', () => {
    const out = parseSkills([
      asideName('Databases & Data', 183.8),
      asideName('Management', 194.3),
      asideChips(['Microsoft SQL Server'], 207.6),
      asideChips(['MySQL', 'SSMS'], 223.6),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Databases & Data Management')
    expect(out[0].keywords).toEqual(['Microsoft SQL Server', 'MySQL', 'SSMS'])
  })

  it('does not swallow the previous group when two groups sit back to back', () => {
    const out = parseSkills([
      asideName('Programming & Querying', 70.6),
      asideChips(['SQL', 'T-SQL'], 83.8),
      asideChips(['Stored Procedures'], 99.9),
      asideName('Databases & Data Management', 183.8),
      asideChips(['Microsoft SQL Server'], 207.6),
      asideChips(['MySQL', 'SSMS'], 223.6),
    ])
    expect(out.map((g) => g.name)).toEqual(['Programming & Querying', 'Databases & Data Management'])
    expect(out[0].keywords).toEqual(['SQL', 'T-SQL', 'Stored Procedures'])
    expect(out[1].keywords).toEqual(['Microsoft SQL Server', 'MySQL', 'SSMS'])
  })
})

describe('work entries — a date line indented past the bullets (2026-08-23)', () => {
  // Found by importing 43 REAL third-party resumes rather than our own
  // exports: 12 of them lost EVERY date. Designed resumes often put the date
  // range on its own line under the title and indent it FURTHER than the
  // bullets, and indent is the only signal the highlight test has - so the
  // date line became bullet #0 of the entry. The dates were lost and a junk
  // bullet gained: "07/2024 - Present Hyderabad,India".
  const at = (text: string, x: number, top: number, h = 8.2): Line => {
    const l = line(text, false, h, top)
    l.x = x
    l.items = [{ str: text, x, top, width: text.length * 4, height: h, bold: false, page: 1, col: 0, aside: false }]
    return l
  }
  const g = (lines: Line[]): LayoutGraph => ({
    lines,
    bodySize: 8.2,
    lineGap: 11,
    pageCount: 1,
    charCount: lines.reduce((n, l) => n + l.text.length, 0),
    twoColumn: false,
    ocrPages: [],
    ocrEngineFailed: false,
  })

  it('reads the range instead of turning it into a bullet', () => {
    const r = parseLayout(
      g([
        at('Sujay Adkesar', 40, 40, 14),
        at('sujay@example.com', 40, 56),
        { ...at('EXPERIENCE', 40, 90, 12.7), upper: true },
        at('Digital Forensic Analyst', 65, 110, 10.8),
        at('Tata Consultancy Services', 65, 124),
        at('07/2024 - Present Hyderabad,India', 77, 138, 7.6),
        at('• Led end-to-end digital forensics investigations across Windows and Linux.', 68, 158),
        at('Jr Security Analyst', 65, 190, 10.8),
        at('Agamya Cyber Tech', 65, 204),
        at('2023 - 2024 Bengaluru,India', 77, 218, 7.6),
        at('• Tuned SIEM rules and improved alert relevance for the SOC.', 68, 238),
      ])
    )
    expect(r.content.work).toHaveLength(2)
    expect(r.content.work[0].startDate).toBe('2024-07')
    expect(r.content.work[0].endDate).toBe('')
    expect(r.content.work[1].startDate).toBe('2023')
    expect(r.content.work[0].highlights.join(' ')).not.toContain('07/2024')
  })

  it('still treats a bullet that merely mentions a year range as a bullet', () => {
    // Two dated entries, so this takes the same segmentation path the real
    // document does rather than the single-entry gap-clustering fallback.
    const r = parseLayout(
      g([
        at('Alex Morgan', 40, 40, 14),
        at('alex@example.com', 40, 56),
        { ...at('EXPERIENCE', 40, 90, 12.7), upper: true },
        at('Platform Engineer', 65, 110, 10.8),
        at('Vertex Labs', 65, 124),
        at('Mar 2021 - Present San Francisco, CA', 77, 138, 7.6),
        at('• Led the 2019 - 2020 migration of the billing platform to a new provider.', 68, 158),
        at('Software Engineer', 65, 190, 10.8),
        at('Northwind Software', 65, 204),
        at('Jun 2018 - Feb 2021 Austin, TX', 77, 218, 7.6),
        at('• Built the design-system component library adopted by nine teams.', 68, 238),
      ])
    )
    expect(r.content.work).toHaveLength(2)
    expect(r.content.work[0].highlights.join(' ')).toContain('migration of the billing platform')
    expect(r.content.work[0].startDate).toBe('2021-03')
    expect(r.content.work[1].startDate).toBe('2018-06')
  })
})

describe('work entries — a short line carrying a date RANGE is a header (2026-08-24)', () => {
  const at = (text: string, x: number, top: number, h = 8.9): Line => {
    const l = line(text, false, h, top)
    l.x = x
    l.items = [{ str: text, x, top, width: text.length * 4, height: h, bold: false, page: 1, col: 0, aside: false }]
    return l
  }
  const g = (lines: Line[]): LayoutGraph => ({
    lines,
    bodySize: 8.2,
    lineGap: 11,
    pageCount: 1,
    charCount: lines.reduce((n, l) => n + l.text.length, 0),
    twoColumn: false,
    ocrPages: [],
    ocrEngineFailed: false,
  })

  // A real resume put the job title and its dates on ONE line, indented past
  // a keyword-stuffed paragraph that set the section's left margin - so the
  // header counted as "indented" and became bullet #0. The entry lost both
  // its title and its dates, and imported the keyword pile as its position.
  it('reads title and dates off one indented line', () => {
    const r = parseLayout(
      g([
        at('Madhu Baditaboyina', 29, 40, 14),
        at('madhu@example.com', 29, 56),
        { ...at('EXPERIENCE', 29, 90, 12.7), upper: true },
        at('Active Directory, Azure AD, IAM, PAM, CyberArk, SSO, MFA, Conditional Access', 29, 110),
        at('Security Analyst 05/2022 - 09/2025', 62, 130),
        at('Tata Consultancy Services Hyderabad', 62, 144),
        at('\u2022 Monitored SIEM alerts and triaged security incidents around the clock.', 70, 160),
      ])
    )
    // The keyword-stuffed line forms an entry of its own - separate problem.
    // What this pins is that the real job keeps its title AND its dates.
    const job = r.content.work.find((w) => w.startDate)
    expect(job).toBeDefined()
    expect(job!.position).toContain('Security Analyst')
    expect(job!.startDate).toBe('2022-05')
    expect(job!.endDate).toBe('2025-09')
  })

  it('leaves a wordy bullet that mentions a range as a bullet', () => {
    const r = parseLayout(
      g([
        at('Alex Morgan', 29, 40, 14),
        at('alex@example.com', 29, 56),
        { ...at('EXPERIENCE', 29, 90, 12.7), upper: true },
        at('Platform Engineer 03/2021 - Present', 62, 110),
        at('Vertex Labs', 62, 124),
        at('\u2022 Led the 2019 - 2020 migration of the billing platform to a new provider.', 70, 140),
        at('Software Engineer 06/2018 - 02/2021', 62, 180),
        at('Northwind Software', 62, 194),
        at('\u2022 Built the design-system library adopted by nine teams.', 70, 210),
      ])
    )
    expect(r.content.work).toHaveLength(2)
    expect(r.content.work[0].highlights.join(' ')).toContain('migration of the billing platform')
  })
})
