import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import { visibleDocument, visibleSectionKeys } from './atsScope'
import { analyzeResume, extractResumeText } from './ats'
import { simulateAts } from './atsSimulate'
import { analyzeWriting } from './writing'
import { collectResumeLines } from './semantic'
import { resumeToAtsText } from './atsText'

/**
 * One invariant, stated six ways: the analysis describes the résumé the page
 * draws, and nothing else.
 *
 * The defect these cover was not a wrong rule, it was a wrong input. Every
 * scorer read `doc.content` whole while the page read `resolveOrder`, so a
 * section the author hid went on raising the word count, satisfying a job
 * description's keywords, and supplying bullets for the writing coach to
 * quote. Measured on a library example before the fix: hiding Skills and
 * Projects moved the exported text by 1001 characters and moved the score,
 * the word count, the JD match rate and the coach's bullet count by zero.
 *
 * The strongest form of the invariant is the one asserted most often here:
 * HIDING a section must produce the same analysis as DELETING it. If those
 * two ever disagree, some scorer is reading content the reader cannot see.
 */

/** The sample document, with `keys` pulled out of the page the way the
 *  section's own hide control pulls them out: off the columns, onto `hidden`. */
function hide(keys: string[]): ResumeDocument {
  const d = createDocument({ sample: true })
  const l = d.metadata.layout
  for (const k of keys) {
    l.main = l.main.filter((x) => x !== k)
    l.aside = l.aside.filter((x) => x !== k)
    l.footer = (l.footer ?? []).filter((x) => x !== k)
    if (!l.hidden.includes(k)) l.hidden.push(k)
  }
  return d
}

/** The same document with that content DELETED outright, for the comparison. */
function drop(keys: string[]): ResumeDocument {
  const d = createDocument({ sample: true })
  for (const k of keys) {
    if (k === 'summary') d.content.basics.summary = ''
    else if (k in d.content) (d.content as unknown as Record<string, unknown[]>)[k] = []
  }
  return d
}

const sample = () => createDocument({ sample: true })

/**
 * A skill keyword that appears ONLY in the skills section.
 *
 * The sample's first keyword is "TypeScript", which is also named in a work
 * bullet - so it rightly survives that section being hidden, and asserting on
 * it would test the fixture rather than the rule. This picks a term whose one
 * and only home is the section under test.
 */
function skillOnlyTerm(): string {
  const d = sample()
  const elsewhere = extractResumeText(hide(['skills'])).toLowerCase()
  const term = d.content.skills
    .flatMap((s) => s.keywords ?? [])
    .filter(Boolean)
    .find((k) => !elsewhere.includes(k.toLowerCase()))
  if (!term) throw new Error('the sample has no skill keyword unique to its skills section')
  return term
}

describe('visibleDocument', () => {
  it('keeps every section the page draws', () => {
    const d = sample()
    const keys = visibleSectionKeys(d)
    expect(keys.size).toBeGreaterThan(2)
    expect(keys.has('work')).toBe(true)
    expect(visibleDocument(d).content.work).toEqual(d.content.work)
  })

  it('empties a section the author hid, and leaves the rest alone', () => {
    const d = hide(['skills'])
    expect(d.content.skills.length).toBeGreaterThan(0) // still in the store
    const v = visibleDocument(d)
    expect(v.content.skills).toEqual([]) // gone from the analysis
    expect(v.content.work).toEqual(d.content.work)
  })

  it('drops the summary with its section, and keeps the header regardless', () => {
    const d = hide(['summary'])
    expect(d.content.basics.summary).toBeTruthy()
    const v = visibleDocument(d)
    expect(v.content.basics.summary).toBe('')
    // A name, a title and the contact line are drawn by the header, which no
    // section list governs - hiding a body section must never take them.
    expect(v.content.basics.name).toBe(d.content.basics.name)
    expect(v.content.basics.email).toBe(d.content.basics.email)
  })

  it('leaves metadata, template and job description untouched', () => {
    const d = hide(['skills'])
    d.jobDescription = 'python and sql'
    const v = visibleDocument(d)
    expect(v.metadata).toBe(d.metadata)
    expect(v.jobDescription).toBe('python and sql')
    expect(v.id).toBe(d.id)
  })

  it('is idempotent — narrowing an already-narrow document changes nothing', () => {
    const once = visibleDocument(hide(['skills', 'projects']))
    expect(visibleDocument(once).content).toEqual(once.content)
  })
})

describe('a hidden section contributes nothing', () => {
  it('…to the résumé text the analysis reads', () => {
    const term = skillOnlyTerm().toLowerCase()
    expect(extractResumeText(sample()).toLowerCase()).toContain(term)
    expect(extractResumeText(hide(['skills'])).toLowerCase()).not.toContain(term)
  })

  it('…to the score, the word count or the section checks', () => {
    const hidden = analyzeResume(hide(['skills']))
    const deleted = analyzeResume(drop(['skills']))
    expect(hidden.score).toBe(deleted.score)
    expect(hidden.wordCount).toBe(deleted.wordCount)
    expect(hidden.checks.find((c) => c.id === 'skills')?.status).toBe('warn')
  })

  it('…to the job-description keyword match', () => {
    const term = skillOnlyTerm()
    const jd = `We need deep hands-on ${term} experience for this role, plus strong collaboration.`

    const shown = sample()
    shown.jobDescription = jd
    expect(analyzeResume(shown).jd?.matched.map((t) => t.toLowerCase())).toContain(term.toLowerCase())

    const gone = hide(['skills'])
    gone.jobDescription = jd
    expect(analyzeResume(gone).jd?.matched.map((t) => t.toLowerCase())).not.toContain(term.toLowerCase())
  })

  it('…to the per-system simulation', () => {
    const shown = simulateAts(sample())[0].extracted
    const hidden = simulateAts(hide(['skills']))[0].extracted
    const deleted = simulateAts(drop(['skills']))[0].extracted
    expect(shown.skills).toBeGreaterThan(0)
    expect(hidden.skills).toBe(0)
    expect(hidden.skills).toBe(deleted.skills)
  })

  it('…to the writing coach, which must not quote what the page does not show', () => {
    const d = sample()
    const quoted = d.content.work[0]?.highlights?.[0]
    expect(quoted).toBeTruthy()

    const hidden = analyzeWriting(hide(['work']))
    const deleted = analyzeWriting(drop(['work']))
    expect(hidden.bulletCount).toBe(deleted.bulletCount)
    expect(hidden.issues.some((b) => b.section === 'Experience')).toBe(false)
    expect(analyzeWriting(d).bulletCount).toBeGreaterThan(hidden.bulletCount)
  })

  it('…to the semantic matcher’s pool of résumé lines', () => {
    const shown = collectResumeLines(sample())
    const hidden = collectResumeLines(hide(['work']))
    expect(shown.length).toBeGreaterThan(hidden.length)
    // The employer's name lives only in the work section - unlike the job
    // title, which the header prints again as the document's label.
    const employer = sample().content.work[0].name
    expect(shown.some((l) => l.includes(employer))).toBe(true)
    expect(hidden.some((l) => l.includes(employer))).toBe(false)
  })
})

describe('the analysis input is the text the export produces', () => {
  /**
   * The "what an ATS sees" view is already gated against the real PDF by the
   * export-parity gate, so it is the right yardstick: every word the analysis
   * counts has to be a word that view prints. This does not compare the two
   * strings - they are serialized for different jobs, one with headings and
   * date lines - it compares their VOCABULARY, which is what a keyword
   * matcher and a word count actually consume.
   */
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9+#./\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    )

  for (const hiddenKeys of [[], ['skills'], ['projects', 'education'], ['summary']]) {
    it(`holds with ${hiddenKeys.length ? hiddenKeys.join('+') + ' hidden' : 'nothing hidden'}`, () => {
      const d = hide(hiddenKeys)
      const analysed = words(extractResumeText(d))
      const exported = words(resumeToAtsText(d))
      // Every word the analysis scores must appear in the exported text. The
      // reverse does not hold: the export prints headings and date lines the
      // analysis has no business counting as the author's own words.
      const leaked = [...analysed].filter((w) => !exported.has(w))
      expect(leaked).toEqual([])
    })
  }

  it('catches the original defect — a hidden section leaking words into the score', () => {
    const term = skillOnlyTerm().toLowerCase()
    expect(words(resumeToAtsText(sample())).has(term)).toBe(true)

    const d = hide(['skills'])
    expect(words(resumeToAtsText(d)).has(term)).toBe(false)
    expect(words(extractResumeText(d)).has(term)).toBe(false)
  })
})
