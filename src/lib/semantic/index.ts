/**
 * On-device semantic JD matching (opt-in) — public API.
 *
 * Keyword matching answers "is the word there?"; this answers "is the MEANING
 * there?" using MiniLM sentence embeddings computed entirely in the browser
 * (see ./worker.ts). Strictly opt-in: the ~34 MB engine (onnx runtime wasm +
 * quantized model, all self-hosted under /semantic/) downloads only after the
 * user explicitly enables the feature, and is cached for offline reuse.
 */
import type { ResumeDocument } from '@/types/document'
import { htmlToText } from '@/lib/utils'

const ENABLE_KEY = 'cvaurum:semantic:v1'

export function isSemanticEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLE_KEY) === '1'
  } catch {
    return false
  }
}
export function setSemanticEnabled(v: boolean): void {
  try {
    if (v) localStorage.setItem(ENABLE_KEY, '1')
    else localStorage.removeItem(ENABLE_KEY)
  } catch {
    /* private mode — session-only */
  }
}

export interface SemanticProgress {
  /** engine download/init progress: file being fetched + 0..100 */
  status?: string
  file?: string
  progress?: number
}

/* ------------------------------------------------------------ worker plumbing */

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: { data: Float32Array; dims: number[] }) => void; reject: (e: Error) => void }>()
const progressListeners = new Set<(p: SemanticProgress) => void>()

export function onSemanticProgress(fn: (p: SemanticProgress) => void): () => void {
  progressListeners.add(fn)
  return () => progressListeners.delete(fn)
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./semantic.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const m = e.data
      if (m?.type === 'progress') {
        for (const fn of progressListeners) fn(m)
        return
      }
      const p = pending.get(m?.id)
      if (!p) return
      pending.delete(m.id)
      if (m.ok) p.resolve({ data: m.data, dims: m.dims })
      else p.reject(new Error(m.error || 'embedding failed'))
    }
    worker.onerror = (e) => {
      const err = new Error(e.message || 'semantic worker crashed')
      for (const [, p] of pending) p.reject(err)
      pending.clear()
      worker?.terminate()
      worker = null
    }
  }
  return worker
}

/** Embed texts → row-major [n × dim] normalized vectors. */
async function embed(texts: string[]): Promise<{ data: Float32Array; dim: number }> {
  const id = nextId++
  const w = getWorker()
  return new Promise((resolve, reject) => {
    // A wedged engine must never hang the panel — generous, then honest failure.
    const t = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Semantic engine timed out — reload and try again.'))
    }, 300_000)
    pending.set(id, {
      resolve: (v) => { clearTimeout(t); resolve({ data: v.data, dim: v.dims[v.dims.length - 1] }) },
      reject: (e) => { clearTimeout(t); reject(e) },
    })
    w.postMessage({ id, texts })
  })
}

/* --------------------------------------------------------------- text prep */

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/** The résumé as a list of meaning-bearing lines (what a reader would take in). */
export function collectResumeLines(doc: ResumeDocument): string[] {
  const c = doc.content
  const lines: string[] = []
  const push = (s?: string) => {
    const t = clean(htmlToText(s || ''))
    if (t.length >= 8) lines.push(t)
  }
  if (c.basics.label) push(c.basics.label)
  for (const s of htmlToText(c.basics.summary || '').split(/(?<=[.!?])\s+/)) push(s)
  for (const w of c.work) {
    push([w.position, w.name].filter(Boolean).join(' at '))
    push(w.summary)
    for (const h of w.highlights || []) push(h)
  }
  for (const p of c.projects) {
    push([p.name, htmlToText(p.description || '')].filter(Boolean).join(' — '))
    for (const h of p.highlights || []) push(h)
  }
  for (const g of c.skills) {
    const kw = (g.keywords || []).filter(Boolean)
    if (kw.length) push(`${g.name ? g.name + ': ' : ''}${kw.join(', ')}`)
  }
  for (const e of c.education) push([[e.studyType, e.area].filter(Boolean).join(', '), e.institution].filter(Boolean).join(' — '))
  for (const cert of c.certificates) push(cert.name)
  return [...new Set(lines)].slice(0, 140)
}

/** The JD as a list of individual requirements/statements. */
export function collectJdLines(jd: string): string[] {
  const out: string[] = []
  for (const rawLine of jd.split(/\r?\n/)) {
    const line = clean(rawLine.replace(/^[\s•·▪◦*+-]+/, ''))
    if (!line) continue
    // long paragraphs → sentences, so each requirement scores on its own
    const parts = line.length > 220 ? line.split(/(?<=[.!?])\s+(?=[A-Z(])/) : [line]
    for (const p of parts) {
      const t = clean(p)
      if (t.length < 20 || t.length > 300) continue
      if (/^[A-Z\s&/:-]{3,32}$/.test(t)) continue // ALL-CAPS section heading
      out.push(t)
    }
  }
  return [...new Set(out)].slice(0, 60)
}

/* ---------------------------------------------------------------- matching */

export type CoverageBucket = 'strong' | 'partial' | 'gap'

export interface SemanticItem {
  jd: string
  best: string
  sim: number
  bucket: CoverageBucket
}

export interface SemanticReport {
  /** 0–100: how much of the JD's meaning the résumé covers */
  score: number
  items: SemanticItem[]
  strong: number
  partial: number
  gaps: number
  resumeLineCount: number
}

// MiniLM cosine landscape (calibrated on real JD/resume pairs in the probe):
// clearly-related statements land ≥ ~0.60, loosely related ~0.45–0.6,
// unrelated < ~0.40.
const STRONG = 0.6
const PARTIAL = 0.44

export async function analyzeSemanticMatch(doc: ResumeDocument, jd: string): Promise<SemanticReport | null> {
  const resume = collectResumeLines(doc)
  const reqs = collectJdLines(jd)
  if (!resume.length || !reqs.length) return null

  // One batched call: [resume… , jd…] — a single trip through the model.
  const { data, dim } = await embed([...resume, ...reqs])
  const vec = (i: number) => data.subarray(i * dim, (i + 1) * dim)

  const items: SemanticItem[] = reqs.map((jdLine, j) => {
    const q = vec(resume.length + j)
    let best = 0
    let bestIdx = 0
    for (let r = 0; r < resume.length; r++) {
      const v = vec(r)
      let dot = 0
      for (let k = 0; k < dim; k++) dot += q[k] * v[k]
      if (dot > best) {
        best = dot
        bestIdx = r
      }
    }
    const bucket: CoverageBucket = best >= STRONG ? 'strong' : best >= PARTIAL ? 'partial' : 'gap'
    return { jd: jdLine, best: resume[bestIdx], sim: Math.round(best * 100) / 100, bucket }
  })

  const strong = items.filter((i) => i.bucket === 'strong').length
  const partial = items.filter((i) => i.bucket === 'partial').length
  const gaps = items.length - strong - partial
  return {
    score: Math.round((100 * (strong + 0.5 * partial)) / items.length),
    items: items.sort((a, b) => a.sim - b.sim), // weakest (most actionable) first
    strong,
    partial,
    gaps,
    resumeLineCount: resume.length,
  }
}

/** Free the engine (worker + wasm heap). The model stays cached on disk. */
export function disposeSemantic(): void {
  worker?.terminate()
  worker = null
  pending.clear()
}
