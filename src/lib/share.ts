/**
 * Private, serverless résumé sharing. Two paths, both 100% client-side — your
 * résumé never touches a server:
 *
 *  1. Private LINK — the whole document is compressed into the URL's `#fragment`,
 *     which browsers NEVER send to any server. Anyone with the link can open it,
 *     so it's for casual sharing; photos/logos are dropped when they'd bloat the
 *     link (use the encrypted file for full fidelity).
 *
 *  2. Encrypted FILE — the full document (images and all) sealed with
 *     AES-256-GCM, the key stretched from your passphrase via PBKDF2-SHA-256
 *     (210k iterations) with a random salt + IV. Uncrackable without the
 *     passphrase. Share the .cvaurum file over WhatsApp/anywhere; the recipient
 *     needs the passphrase (send it through a different channel).
 *
 * No network, no dependency — WebCrypto + the native Compression Streams API.
 */
import type { ResumeDocument } from '@/types/document'

const PBKDF2_ITERS = 210_000
// WebCrypto wants BufferSource; TS 5.7 typed-array generics need a nudge.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource
const MAGIC = 'CVA1'

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
/** A copy with every embedded image stripped — for links that must stay small. */
export function stripImages(doc: ResumeDocument): ResumeDocument {
  const d: ResumeDocument = JSON.parse(JSON.stringify(doc))
  if (d.content?.basics) d.content.basics.image = ''
  for (const list of [d.content?.work, d.content?.education, d.content?.volunteer]) {
    for (const it of (list ?? []) as { logo?: string }[]) if (it.logo) it.logo = ''
  }
  return d
}

/** Approx serialized size of a doc's embedded images, in bytes. */
export function imageBytes(doc: ResumeDocument): number {
  let n = (doc.content?.basics?.image || '').length
  for (const list of [doc.content?.work, doc.content?.education, doc.content?.volunteer]) {
    for (const it of (list ?? []) as { logo?: string }[]) n += (it.logo || '').length
  }
  return n
}

/* ------------------------------------------------------------------ link share */
/** Encode a doc into a URL-fragment payload (scheme byte + base64url). */
export async function encodeShare(doc: ResumeDocument): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(doc))
  if (hasCompression) return 'c' + toB64url(await deflate(json))
  return 'r' + toB64url(json)
}
export async function decodeShare(payload: string): Promise<ResumeDocument> {
  const scheme = payload[0]
  const bytes = fromB64url(payload.slice(1))
  const json = scheme === 'c' ? new TextDecoder().decode(await inflate(bytes)) : new TextDecoder().decode(bytes)
  return JSON.parse(json)
}

export interface ShareLink {
  url: string
  bytes: number
  strippedImages: boolean
}

/**
 * Build a shareable link. If the full document would make an unwieldy link
 * (> ~14 KB, roughly where messengers start truncating previews), images are
 * dropped and `strippedImages` is set so the UI can point to the encrypted file.
 */
export async function buildShareLink(doc: ResumeDocument, origin: string): Promise<ShareLink> {
  const LIMIT = 14_000
  let payload = await encodeShare(doc)
  let stripped = false
  if (payload.length > LIMIT && imageBytes(doc) > 0) {
    payload = await encodeShare(stripImages(doc))
    stripped = true
  }
  return { url: `${origin}/r#${payload}`, bytes: payload.length, strippedImages: stripped }
}

/* ---------------------------------------------------------------- encrypted file */
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

/** Seal a doc into an encrypted .cvaurum blob: MAGIC | salt(16) | iv(12) | AES-GCM ct. */
export async function encryptDoc(doc: ResumeDocument, passphrase: string): Promise<Uint8Array> {
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

export async function decryptDoc(bytes: Uint8Array, passphrase: string): Promise<ResumeDocument> {
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== MAGIC) throw new Error('Not a CVAurum share file.')
  const flag = bytes[4]
  const salt = bytes.slice(5, 21)
  const iv = bytes.slice(21, 33)
  const ct = bytes.slice(33)
  const key = await deriveKey(passphrase, salt)
  let body: Uint8Array
  try {
    body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(ct)))
  } catch {
    throw new Error('Wrong passphrase, or the file is corrupted.')
  }
  const json = new TextDecoder().decode(flag === 1 ? await inflate(body) : body)
  return JSON.parse(json)
}

/** Detect our encrypted container by magic bytes. */
export function isEncryptedShare(bytes: Uint8Array): boolean {
  return bytes.length > 33 && new TextDecoder().decode(bytes.slice(0, 4)) === MAGIC
}
