import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ResumeContentSchema } from '@/types/document'
import { TEMPLATES } from '@/templates/registry'
import { LIBRARY, allSampleSlugs, getSample } from './index'
import { SAMPLE_COUNT } from './count'
import { LIBRARY_CATEGORIES, REGIONS, SENIORITIES, type LibrarySample } from './types'

/**
 * The library is public, indexed, and offered to a stranger as a model of how
 * their own résumé should read. A sample that is merely present fails at that:
 * a bullet with no number in it, a summary written in the first person, a
 * phone number that could ring a real person, an employer that is a real
 * company's name beside an invented employee.
 *
 * So every rule a good sample has to meet is checked here rather than trusted,
 * and the failure names the sample and the offending text.
 */

const SAMPLES_DIR = join(__dirname, 'samples')

/** Prose as a reader sees it: rich-text fields carry sanitized HTML. */
const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/** Every string a reader actually reads, with a path to say where it came from. */
function prose(s: LibrarySample): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = []
  const add = (where: string, text: string | undefined) => {
    if (text && text.trim()) out.push({ where, text: plain(text) })
  }
  const c = s.content
  add('basics.summary', c.basics.summary)
  c.work.forEach((w, i) => {
    add(`work[${i}].summary`, w.summary)
    w.highlights?.forEach((h, j) => add(`work[${i}].highlights[${j}]`, h))
  })
  c.projects.forEach((p, i) => {
    add(`projects[${i}].description`, p.description)
    p.highlights?.forEach((h, j) => add(`projects[${i}].highlights[${j}]`, h))
  })
  c.volunteer.forEach((v, i) => {
    add(`volunteer[${i}].summary`, v.summary)
    v.highlights?.forEach((h, j) => add(`volunteer[${i}].highlights[${j}]`, h))
  })
  c.education.forEach((e, i) => add(`education[${i}].summary`, e.summary))
  c.awards.forEach((a, i) => add(`awards[${i}].summary`, a.summary))
  c.publications.forEach((p, i) => add(`publications[${i}].summary`, p.summary))
  return out
}

/** Every bullet, which is where the writing rules bite hardest. */
function bullets(s: LibrarySample): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = []
  s.content.work.forEach((w, i) => w.highlights?.forEach((h, j) => out.push({ where: `work[${i}].highlights[${j}]`, text: plain(h) })))
  s.content.projects.forEach((p, i) => p.highlights?.forEach((h, j) => out.push({ where: `projects[${i}].highlights[${j}]`, text: plain(h) })))
  s.content.volunteer.forEach((v, i) => v.highlights?.forEach((h, j) => out.push({ where: `volunteer[${i}].highlights[${j}]`, text: plain(h) })))
  return out
}

const each = (fn: (s: LibrarySample) => void) => {
  for (const s of LIBRARY) fn(s)
}

/** Collects failures so one run reports every offender, not just the first. */
function collect(fn: (s: LibrarySample, fail: (msg: string) => void) => void): string[] {
  const bad: string[] = []
  each((s) => fn(s, (msg) => bad.push(`${s.slug}: ${msg}`)))
  return bad
}

describe('the sample library is complete', () => {
  it('indexes every file under samples/, and nothing else', () => {
    const onDisk = readdirSync(SAMPLES_DIR)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
      .sort()
    // Run `node scripts/make-library-index.cjs` when this fails.
    expect(allSampleSlugs().slice().sort()).toEqual(onDisk)
  })

  it('keeps the generated count in step with the collection', () => {
    // The landing page reads this literal so it does not have to import the
    // library; a stale one would put a wrong number in front of every visitor.
    expect(SAMPLE_COUNT).toBe(LIBRARY.length)
  })

  it('gives every sample a unique slug that matches its filename', () => {
    expect(new Set(allSampleSlugs()).size).toBe(LIBRARY.length)
    each((s) => expect(getSample(s.slug)).toBe(s))
  })

  it('holds at least a hundred samples, spread over every shelf', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(100)
    for (const category of LIBRARY_CATEGORIES) {
      expect(LIBRARY.filter((s) => s.category === category).length, `category ${category}`).toBeGreaterThanOrEqual(5)
    }
    for (const region of REGIONS) {
      expect(LIBRARY.filter((s) => s.region === region).length, `region ${region}`).toBeGreaterThanOrEqual(15)
    }
    for (const seniority of SENIORITIES) {
      expect(LIBRARY.filter((s) => s.seniority === seniority).length, `seniority ${seniority}`).toBeGreaterThanOrEqual(8)
    }
    // A library that showed one design would not show the designs off.
    expect(new Set(LIBRARY.map((s) => s.template)).size).toBeGreaterThanOrEqual(20)
  })

  it('names a real design, a real shelf and a real region for each', () => {
    const ids = new Set(TEMPLATES.map((t) => t.id))
    expect(
      collect((s, fail) => {
        if (!ids.has(s.template)) fail(`template "${s.template}" does not exist`)
        if (!LIBRARY_CATEGORIES.includes(s.category)) fail(`category "${s.category}"`)
        if (!SENIORITIES.includes(s.seniority)) fail(`seniority "${s.seniority}"`)
        if (!REGIONS.includes(s.region)) fail(`region "${s.region}"`)
      })
    ).toEqual([])
  })

  it('parses as résumé content, with nothing the schema would drop', () => {
    expect(
      collect((s, fail) => {
        const parsed = ResumeContentSchema.safeParse(s.content)
        if (!parsed.success) fail(`content invalid — ${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`)
      })
    ).toEqual([])
  })

  it('carries a card that reads on its own', () => {
    expect(
      collect((s, fail) => {
        if (s.role.length < 3 || s.role.length > 64) fail(`role length ${s.role.length}`)
        if (s.blurb.length < 40 || s.blurb.length > 150) fail(`blurb length ${s.blurb.length}: ${s.blurb}`)
        if (s.keywords.length < 3 || s.keywords.length > 10) fail(`${s.keywords.length} keywords`)
        // Two characters is a real search term when the skill is named Go or R.
        if (s.keywords.some((k) => k.length < 2 || k.length > 60)) fail('a keyword is too short or too long')
        if (new Set(s.keywords.map((k) => k.toLowerCase())).size !== s.keywords.length) fail('duplicate keywords')
      })
    ).toEqual([])
  })
})

describe('nothing in the library can reach a real person', () => {
  it('uses only addresses reserved for documentation', () => {
    expect(
      collect((s, fail) => {
        const email = s.content.basics.email ?? ''
        if (!/^[a-z0-9._%+-]+@example\.com$/i.test(email)) fail(`email "${email}"`)
      })
    ).toEqual([])
  })

  it('uses only phone ranges reserved for fiction', () => {
    // US 555-01xx (NANPA), UK 07700 900xxx (the range Ofcom reserves for
    // drama), and an Indian 12345 prefix, which is not a valid mobile series.
    const FICTION = [/^\+1 \(555\) 01\d{2}$/, /^\+44 7700 900\d{3}$/, /^\+91 12345 \d{5}$/]
    expect(
      collect((s, fail) => {
        const phone = (s.content.basics.phone ?? '').trim()
        if (!phone) return
        if (!FICTION.some((re) => re.test(phone))) fail(`phone "${phone}"`)
      })
    ).toEqual([])
  })

  it('sends every link either to example.com or to a profile on a real network', () => {
    const NETWORKS = new Set([
      'github.com', 'gitlab.com', 'linkedin.com', 'dribbble.com', 'behance.net', 'medium.com',
      'orcid.org', 'scholar.google.com', 'researchgate.net', 'stackoverflow.com', 'x.com',
      'twitter.com', 'instagram.com', 'youtube.com', 'substack.com', 'notion.site',
      // Where these jobs actually keep a portfolio: CAD models and video.
      'grabcad.com', 'tiktok.com', 'vimeo.com',
    ])
    const ok = (url: string): boolean => {
      if (!url.trim()) return true
      let host: string
      try {
        host = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return false
      }
      return host === 'example.com' || host.endsWith('.example.com') || NETWORKS.has(host)
    }
    expect(
      collect((s, fail) => {
        const c = s.content
        const urls: [string, string][] = [['basics.url', c.basics.url ?? '']]
        c.basics.profiles?.forEach((p, i) => urls.push([`profiles[${i}]`, p.url ?? '']))
        c.work.forEach((w, i) => urls.push([`work[${i}]`, w.url ?? '']))
        c.projects.forEach((p, i) => urls.push([`projects[${i}]`, p.url ?? '']))
        c.education.forEach((e, i) => urls.push([`education[${i}]`, e.url ?? '']))
        c.certificates.forEach((x, i) => urls.push([`certificates[${i}]`, x.url ?? '']))
        c.publications.forEach((x, i) => urls.push([`publications[${i}]`, x.url ?? '']))
        for (const [where, url] of urls) if (!ok(url)) fail(`${where} points at ${url}`)
      })
    ).toEqual([])
  })

  it('embeds every image rather than fetching one', () => {
    expect(
      collect((s, fail) => {
        const imgs = [
          s.content.basics.image ?? '',
          ...s.content.work.map((w) => w.logo ?? ''),
          ...s.content.education.map((e) => e.logo ?? ''),
          ...s.content.volunteer.map((v) => v.logo ?? ''),
          ...s.content.certificates.map((c) => c.logo ?? ''),
        ]
        for (const src of imgs) if (src && !src.startsWith('data:')) fail(`image is a remote URL: ${src.slice(0, 60)}`)
      })
    ).toEqual([])
  })
})

describe('every sample is written the way it tells the reader to write', () => {
  it('never speaks in the first person', () => {
    const PRONOUN = /(^|[^A-Za-z])(my|mine|we|our|ours)([^A-Za-z]|$)/i
    // A lone capital I is a pronoun far less often than it is a numeral or a
    // label: "Title I school", "Classes I to XII", "Form I-9", "Phase I". So
    // it is matched only where none of those readings is open.
    const LONE_I = /(^|[^A-Za-z])I([^A-Za-z]|$)/
    const ENUMERATOR = /\b(title|class|classes|grade|part|phase|type|tier|level|stage|group|section|appendix|volume|chapter|form|division|band|war)\s+$/i
    expect(
      collect((s, fail) => {
        for (const { where, text } of prose(s)) {
          const m = text.match(PRONOUN)
          if (m) fail(`${where} says "${m[2]}" — ${text.slice(0, 90)}`)
          for (const hit of text.matchAll(new RegExp(LONE_I, 'g'))) {
            const before = text.slice(0, hit.index + hit[1].length)
            const after = text.slice(hit.index + hit[0].length - hit[2].length)
            if (ENUMERATOR.test(before)) continue
            if (hit[2] === '-' || /^[IVX]/.test(after.trim())) continue
            fail(`${where} says "I" — ${text.slice(0, 90)}`)
          }
        }
      })
    ).toEqual([])
  })

  it('never opens a bullet with filler', () => {
    const FILLER = /^(responsible for|helped|assisted with|worked on|tasked with|duties included|utilized|leveraged|spearheaded)\b/i
    expect(
      collect((s, fail) => {
        for (const { where, text } of bullets(s)) {
          if (FILLER.test(text)) fail(`${where} opens with filler — ${text.slice(0, 80)}`)
        }
      })
    ).toEqual([])
  })

  it('keeps a bullet to a readable length', () => {
    expect(
      collect((s, fail) => {
        for (const { where, text } of bullets(s)) {
          if (text.length > 235) fail(`${where} is ${text.length} characters`)
          if (text.length < 30) fail(`${where} is only ${text.length} characters — "${text}"`)
        }
      })
    ).toEqual([])
  })

  it('backs the work history with numbers', () => {
    // Not every bullet needs a figure, but a résumé with none anywhere is the
    // "responsible for" résumé this library exists to argue against.
    expect(
      collect((s, fail) => {
        const withNumbers = bullets(s).filter((b) => /\d/.test(b.text)).length
        const total = bullets(s).length
        if (total === 0) return
        if (withNumbers / total < 0.4) fail(`only ${withNumbers} of ${total} bullets carry a number`)
      })
    ).toEqual([])
  })

  it('gives each role the right number of bullets', () => {
    // A career break or a parental leave is on the page to explain a gap, not
    // to be sold; it needs no bullets at all. And an old role legitimately
    // runs to one line - weight belongs on the recent ones - so only the two
    // most recent entries have to carry a pair.
    const isBreak = (position: string) => /\b(break|leave|carer|caregiving|sabbatical)\b/i.test(position)
    expect(
      collect((s, fail) => {
        s.content.work.forEach((w, i) => {
          const n = w.highlights?.length ?? 0
          const floor = isBreak(w.position ?? '') ? 0 : i < 2 ? 2 : 1
          if (n < floor) fail(`work[${i}] (${w.position}) has ${n} bullets, needs ${floor}`)
          if (n > 6) fail(`work[${i}] (${w.position}) has ${n} bullets`)
        })
      })
    ).toEqual([])
  })

  it('writes a summary that says something', () => {
    expect(
      collect((s, fail) => {
        const summary = plain(s.content.basics.summary ?? '')
        if (summary.length < 80) fail(`summary is ${summary.length} characters`)
        if (summary.length > 460) fail(`summary is ${summary.length} characters`)
      })
    ).toEqual([])
  })

  it('groups its skills instead of listing thirty words', () => {
    expect(
      collect((s, fail) => {
        const groups = s.content.skills
        if (!groups.length) return // a sample may legitimately lead on something else
        if (groups.length > 6) fail(`${groups.length} skill groups`)
        groups.forEach((g, i) => {
          if (!g.name?.trim()) fail(`skills[${i}] has no group name`)
          const n = g.keywords?.length ?? 0
          if (n < 2 || n > 12) fail(`skills[${i}] (${g.name}) holds ${n} keywords`)
        })
      })
    ).toEqual([])
  })

  it('dates every role, in order, in the format the editor writes', () => {
    const DATE = /^\d{4}(-\d{2})?$/
    expect(
      collect((s, fail) => {
        s.content.work.forEach((w, i) => {
          const start = w.startDate ?? ''
          const end = w.endDate ?? ''
          if (!DATE.test(start)) fail(`work[${i}] starts "${start}"`)
          if (end && !DATE.test(end)) fail(`work[${i}] ends "${end}"`)
          if (end && end < start) fail(`work[${i}] ends ${end} before it starts ${start}`)
        })
        s.content.education.forEach((e, i) => {
          const start = e.startDate ?? ''
          const end = e.endDate ?? ''
          if (start && !DATE.test(start)) fail(`education[${i}] starts "${start}"`)
          if (end && !DATE.test(end)) fail(`education[${i}] ends "${end}"`)
        })
      })
    ).toEqual([])
  })

  it('gives the person a name and a job title', () => {
    expect(
      collect((s, fail) => {
        const name = (s.content.basics.name ?? '').trim()
        if (name.split(/\s+/).length < 2) fail(`name "${name}"`)
        if (!(s.content.basics.label ?? '').trim()) fail('no label under the name')
        if (!s.content.basics.location?.city) fail('no city')
      })
    ).toEqual([])
  })

  it('has a history to show, sized to the seniority it claims', () => {
    expect(
      collect((s, fail) => {
        const roles = s.content.work.length
        if (s.seniority === 'student' || s.seniority === 'entry') {
          // A new graduate applying for a first job has no work history, and
          // the sample's job is to show what stands in for one.
          if (!s.content.education.length) fail(`a ${s.seniority} sample with no education`)
          if (!roles && !s.content.projects.length && !s.content.volunteer.length) {
            fail('no work, no projects and no volunteering - nothing to read')
          }
        } else if (roles === 0) {
          fail(`a ${s.seniority} sample with no work history`)
        }
        if (s.seniority === 'senior' || s.seniority === 'lead') {
          if (roles < 2) fail(`a ${s.seniority} sample with ${roles} role(s)`)
        }
      })
    ).toEqual([])
  })
})
