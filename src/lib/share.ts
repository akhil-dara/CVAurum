/**
 * Secure, serverless résumé sharing — a link that carries the résumé INSIDE the
 * URL's #fragment, which browsers never send to any server.
 *
 * THREAT MODEL. A fragment isn't sent over the network, but it IS stored in
 * browser history, chat history, and anywhere the full link gets pasted — so it
 * can leak. To stay safe even then, the payload is ENCRYPTED with a passphrase
 * and the passphrase is NEVER in the link. A cached/logged link is therefore
 * just AES-256-GCM ciphertext: unreadable without the passphrase, which the
 * sender shares through a different channel.
 *
 * Every link is encrypted: #e<base64url(MAGIC|salt|iv|ciphertext)>. There is no
 * plaintext link — a passphrase is always required.
 *
 * Crypto: AES-256-GCM (authenticated), key from PBKDF2-SHA-256 (600k iterations,
 * well above the OWASP-2023 floor) over a random 16-byte salt, fresh 12-byte IV.
 * No network, no dependency — WebCrypto + the native Compression Streams API.
 */
import type { ResumeDocument } from '@/types/document'

const PBKDF2_ITERS = 600_000
const MAGIC = 'CVA1'
// WebCrypto wants BufferSource; TS 5.7 typed-array generics need a nudge.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource

/* ------------------------------------------------------------------ base64url */
function toB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/* --------------------------------------------------------- compression (native) */
const hasCompression = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/* --------------------------------------------------------------- doc utilities */
/** A copy with every embedded image stripped — links stay short and text-only. */
export function stripImages(doc: ResumeDocument): ResumeDocument {
  const d: ResumeDocument = JSON.parse(JSON.stringify(doc))
  if (d.content?.basics) d.content.basics.image = ''
  for (const list of [d.content?.work, d.content?.education, d.content?.volunteer]) {
    for (const it of (list ?? []) as { logo?: string }[]) if (it.logo) it.logo = ''
  }
  return d
}
export function hasImages(doc: ResumeDocument): boolean {
  if (doc.content?.basics?.image) return true
  for (const list of [doc.content?.work, doc.content?.education, doc.content?.volunteer]) {
    for (const it of (list ?? []) as { logo?: string }[]) if (it.logo) return true
  }
  return false
}

/* -------------------------------------------------------------------- crypto */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', bs(new TextEncoder().encode(passphrase)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** MAGIC | flag(1) | salt(16) | iv(12) | AES-GCM(deflate(json)). */
async function seal(doc: ResumeDocument, passphrase: string): Promise<Uint8Array> {
  const json = new TextEncoder().encode(JSON.stringify(doc))
  const body = hasCompression ? await deflate(json) : json
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(body)))
  const magic = new TextEncoder().encode(MAGIC)
  const flag = hasCompression ? 1 : 0
  const out = new Uint8Array(4 + 1 + 16 + 12 + ct.length)
  out.set(magic, 0)
  out[4] = flag
  out.set(salt, 5)
  out.set(iv, 21)
  out.set(ct, 33)
  return out
}
async function unseal(bytes: Uint8Array, passphrase: string): Promise<ResumeDocument> {
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== MAGIC) throw new Error('This is not a CVAurum secure link.')
  const flag = bytes[4]
  const key = await deriveKey(passphrase, bytes.slice(5, 21))
  let body: Uint8Array
  try {
    body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(bytes.slice(21, 33)) }, key, bs(bytes.slice(33))))
  } catch {
    throw new Error('Wrong passphrase, or the link is corrupted.')
  }
  return JSON.parse(new TextDecoder().decode(flag === 1 ? await inflate(body) : body))
}

/* --------------------------------------------------------------- share payloads */
/** Whether a fragment payload is encrypted (needs a passphrase to open). */
export function isEncryptedPayload(payload: string): boolean {
  return payload[0] === 'e'
}

/** Decode a fragment payload. Encrypted payloads require the passphrase. */
export async function decodeShare(payload: string, passphrase?: string): Promise<ResumeDocument> {
  const scheme = payload[0]
  const bytes = fromB64url(payload.slice(1))
  if (scheme === 'e') {
    if (!passphrase) throw new Error('This link is passphrase-protected.')
    return unseal(bytes, passphrase)
  }
  const json = scheme === 'c' ? new TextDecoder().decode(await inflate(bytes)) : new TextDecoder().decode(bytes)
  return JSON.parse(json)
}

export interface ShareLink {
  url: string
  bytes: number
  encrypted: boolean
  strippedImages: boolean
}

/**
 * Build a shareable link. ALWAYS encrypted — there is no plaintext link. Images
 * are stripped (they'd bloat the URL, and a link is for content sharing — use
 * JSON export for full fidelity with trusted people).
 */
export async function buildShareLink(doc: ResumeDocument, origin: string, passphrase: string): Promise<ShareLink> {
  const strippedImages = hasImages(doc)
  const light = strippedImages ? stripImages(doc) : doc
  const payload = 'e' + toB64url(await seal(light, passphrase))
  return { url: `${origin}/r#${payload}`, bytes: payload.length, encrypted: true, strippedImages }
}

/* --------------------------------------------------------- passphrase helpers */
export interface Strength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}
/** Rough passphrase strength — length-dominant with a small variety bonus. */
export function passphraseStrength(p: string): Strength {
  if (!p) return { score: 0, label: 'Enter a passphrase' }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(p)).length
  const alphabet = classes <= 1 ? 26 : classes === 2 ? 52 : classes === 3 ? 62 : 95
  const bits = p.length * Math.log2(alphabet)
  const raw = bits < 40 ? 1 : bits < 60 ? 2 : bits < 90 ? 3 : 4
  if (p.length < 8) return { score: 1, label: 'Too short — use 8+ characters' }
  return { score: raw as Strength['score'], label: (['', 'Weak', 'Fair', 'Strong', 'Very strong'][raw] as string) }
}

/** A strong, easy-to-type passphrase: 3 groups of base32 (≈60 bits). */
export function generatePassphrase(): string {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789' // no lookalikes (0/o, 1/l/i)
  const r = crypto.getRandomValues(new Uint8Array(12))
  const chars = Array.from(r, (b) => A[b % A.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`
}
