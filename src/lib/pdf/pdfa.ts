/**
 * PDF/A-2B conformance (2026-08-19 user request: "fully accessible pdf/a
 * compliant").
 *
 * PDF/A is the ISO archival profile: a file that carries everything needed to
 * reproduce itself years from now — embedded fonts, a defined output colour
 * space, and machine-readable metadata. We target part 2, level B
 * (visual reproducibility). NOT part 1: PDF/A-1 forbids transparency and the
 * painter uses alpha (`opacity`), which part 2 explicitly allows. Level A
 * (accessibility) additionally requires a full structure tree — that is the
 * tagged-PDF workstream, not this file.
 *
 * What conformance needs beyond a normal export, and where it lives:
 *  - an OutputIntent naming the destination colour space, with the ICC
 *    profile itself embedded            -> `applyPdfAConformance` (here)
 *  - `pdfaid:part` / `pdfaid:conformance` in the XMP packet, consistent with
 *    the Info dictionary                -> `buildXmpPacket` (metadata.ts)
 *  - a trailer `/ID`                    -> here
 *  - a transparency group with an explicit blending colour space on any page
 *    that uses alpha                    -> here
 *  - every font embedded and subset     -> already true (fonts.ts)
 *  - no encryption, no external references, uncompressed XMP
 *                                       -> already true
 *
 * The profile is `sRGB2014.icc` from the ICC's own registry
 * (registry.color.org) — ICC v2, display class, freely redistributable —
 * served from our own origin like every font, so an export still makes zero
 * external requests.
 */
import { PDFDocument, PDFName, PDFNumber, PDFString, PDFArray, PDFHexString } from 'pdf-lib'

/** PDF/A part this build targets, mirrored into the XMP packet.
 *
 *  Part 4 (ISO 19005-4:2020) is the PDF 2.0 generation of PDF/A and is what
 *  "latest" means here: parts 1-3 are defined against PDF 1.7 and cannot be
 *  claimed by a PDF 2.0 file at all. Part 4 also drops the a/b/u conformance
 *  LEVELS — it requires Unicode-mappable text outright, and accessibility
 *  moved to its own standard (PDF/UA-2), so a part-4 claim carries a
 *  revision year instead of a level letter. */
export const PDFA_PART = '4'
export const PDFA_REV = '2020'
/** PDF/UA (accessibility) part and revision the tagged output claims —
 *  PDF/UA-2 is ISO 14289-2:2024, the accessibility standard for PDF 2.0. */
export const PDFUA_PART = '2'
export const PDFUA_REV = '2024'
/** The PDF version the file declares, in the header and the catalog. */
export const PDF_VERSION: [number, number] = [2, 0]
/** Same-origin path — served by us, exactly like `/fonts-pdf/*`. */
export const SRGB_PROFILE_URL = '/color/sRGB2014.icc'
/** What the OutputIntent advertises as its destination condition. */
export const OUTPUT_CONDITION = 'sRGB IEC61966-2.1'

let profilePromise: Promise<Uint8Array | null> | null = null

/**
 * Fetches (once per session) the embedded sRGB profile. Returns null rather
 * than throwing if it is unavailable: a résumé that exports without an
 * OutputIntent is a normal, readable PDF that simply is not PDF/A — far
 * better than an export that fails outright over a colour profile.
 */
export function loadSrgbProfile(): Promise<Uint8Array | null> {
  if (!profilePromise) {
    profilePromise = fetch(SRGB_PROFILE_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b) => new Uint8Array(b))
      .catch((e) => {
        if (import.meta.env.DEV) console.warn('[pdf] sRGB profile unavailable; export will not be PDF/A', e)
        return null
      })
  }
  return profilePromise
}

/**
 * Declares the document as PDF 2.0 — in the file header (what a parser reads
 * first) and in the catalog's /Version (which overrides the header for
 * incrementally-updated files). Both, because readers disagree about which
 * one wins.
 */
export function setPdfVersion(pdfDoc: PDFDocument, [major, minor]: [number, number] = PDF_VERSION): void {
  pdfDoc.catalog.set(PDFName.of('Version'), PDFName.of(`${major}.${minor}`))
}

/**
 * Rewrites the file header to the target version.
 *
 * pdf-lib's writer HARDCODES `PDFHeader.forVersion(1, 7)` and ignores
 * `context.header`, so the version cannot be set through the document API —
 * it has to be stamped on the saved bytes. That is safe here and only here
 * because `%PDF-1.7` and `%PDF-2.0` are the same LENGTH: every byte offset in
 * the file, including the xref table's, is untouched. The guard below refuses
 * to patch anything that is not the exact header pdf-lib writes, so a future
 * pdf-lib change can never turn this into a silent corruption.
 */
export function stampPdfVersion(bytes: Uint8Array, [major, minor]: [number, number] = PDF_VERSION): Uint8Array {
  const target = `%PDF-${major}.${minor}`
  const expected = '%PDF-1.7'
  if (target.length !== expected.length) return bytes
  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected.charCodeAt(i)) return bytes // not the header we know: leave it alone
  }
  for (let i = 0; i < target.length; i++) bytes[i] = target.charCodeAt(i)
  return bytes
}

/** True when the bytes are a structurally plausible ICC profile: the header
 *  declares its own length and carries the 'acsp' signature at offset 36. */
export function isIccProfile(bytes: Uint8Array): boolean {
  if (bytes.length < 132) return false
  const declared = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
  if (declared !== bytes.length) return false
  return String.fromCharCode(bytes[36], bytes[37], bytes[38], bytes[39]) === 'acsp'
}

/**
 * Adds the OutputIntent, the trailer /ID, and per-page transparency groups.
 * No-ops (leaving a perfectly valid non-PDF/A file) when the profile is
 * missing or unusable.
 */
export function applyPdfAConformance(pdfDoc: PDFDocument, icc: Uint8Array | null, idSeed: string): boolean {
  if (!icc || !isIccProfile(icc)) return false

  const profileStream = pdfDoc.context.stream(icc, {
    // Component count of the profile's colour space — sRGB is 3-component.
    N: PDFNumber.of(3),
  })
  const intent = pdfDoc.context.obj({
    Type: PDFName.of('OutputIntent'),
    // The subtype key stayed GTS_PDFA1 in parts 2 and 3; it is not a
    // part-1-only marker.
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: PDFString.of(OUTPUT_CONDITION),
    Info: PDFString.of(OUTPUT_CONDITION),
    RegistryName: PDFString.of('http://www.color.org'),
    DestOutputProfile: pdfDoc.context.register(profileStream),
  })
  const intents = pdfDoc.context.obj([intent]) as PDFArray
  pdfDoc.catalog.set(PDFName.of('OutputIntents'), intents)

  // Pages that use alpha need a transparency group with an explicit blending
  // colour space; setting it unconditionally is valid and keeps every page
  // uniform.
  for (const page of pdfDoc.getPages()) {
    page.node.set(
      PDFName.of('Group'),
      pdfDoc.context.obj({
        Type: PDFName.of('Group'),
        S: PDFName.of('Transparency'),
        CS: PDFName.of('DeviceRGB'),
      })
    )
  }

  // A file identifier is required. Derived from the document's own metadata
  // so the same résumé rendered twice in the same second is stable, and no
  // randomness sneaks into the output.
  const id = PDFHexString.of(fileIdHex(idSeed))
  pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([id, id])
  return true
}

/** 32 hex chars (16 bytes) derived from `seed` — a plain FNV-1a-based
 *  expansion, since a file identifier only has to be unique-ish and stable,
 *  never cryptographic. */
export function fileIdHex(seed: string): string {
  let out = ''
  for (let block = 0; block < 4; block++) {
    let h = 0x811c9dc5 ^ block
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    out += h.toString(16).padStart(8, '0')
  }
  return out.toUpperCase()
}
