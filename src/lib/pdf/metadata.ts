/**
 * PDF document metadata — the Info dictionary, the XMP packet, and the
 * accessibility keys every exported résumé carries.
 *
 * 2026-08-19 user report: our exports advertised
 * `pdf-lib (https://github.com/Hopding/pdf-lib)` as both Creator and Producer
 * and set NOTHING else — no Title, no Author, no language — while a
 * competitor's export (inspected byte-for-byte) carried Title/Creator/Producer
 * plus `/Lang (en-US)`. A résumé is a document about a PERSON: the file's own
 * properties are read by ATS pipelines, document managers, and screen readers,
 * and "pdf-lib" in the Producer field tells a recruiter which npm package
 * built the file instead of who the file is about.
 *
 * Everything here is a PURE function of the document plus an injected clock,
 * so the exact bytes are unit-assertable without a browser (metadata.test.ts).
 * `applyPdfMetadata` is the only part that touches pdf-lib.
 */
import { PDFDocument, PDFName } from 'pdf-lib'
import type { ResumeDocument } from '@/types/document'

/** What the file says produced it. Never the PDF library's own name. */
export const PDF_CREATOR = 'CVAurum'
export const PDF_PRODUCER = 'CVAurum (https://cvaurum.com)'
/** Keyword ceiling — metadata is for identification, not keyword stuffing. */
const MAX_KEYWORDS = 32
/** Résumés we render are English-language documents unless one says otherwise. */
const DEFAULT_LANGUAGE = 'en-US'

export interface DocInfo {
  title: string
  author: string
  subject: string
  keywords: string[]
  creator: string
  producer: string
  created: Date
  modified: Date
  language: string
}

const clean = (s?: string): string => (s ?? '').replace(/\s+/g, ' ').trim()

/** Info-dictionary + XMP values for a document, as a pure function. */
export function buildDocInfo(doc: ResumeDocument, now: Date = new Date()): DocInfo {
  const basics = doc.content?.basics ?? ({} as ResumeDocument['content']['basics'])
  const name = clean(basics.name)
  const label = clean(basics.label)
  const docTitle = clean(doc.title)

  const title = name ? `${name} — ${label || 'Resume'}` : docTitle || 'Resume'
  const subject = label ? `Resume — ${label}` : 'Resume'

  const keywords: string[] = []
  const seen = new Set<string>()
  for (const group of doc.content?.skills ?? []) {
    for (const raw of [group.name, ...(group.keywords ?? [])]) {
      const k = clean(raw)
      if (!k) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      keywords.push(k)
      if (keywords.length >= MAX_KEYWORDS) return finish()
    }
  }
  function finish(): DocInfo {
    return {
      title,
      author: name,
      subject,
      keywords,
      creator: PDF_CREATOR,
      producer: PDF_PRODUCER,
      created: now,
      modified: now,
      language: DEFAULT_LANGUAGE,
    }
  }
  return finish()
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** XMP timestamps are ISO-8601 without milliseconds. */
const xmpDate = (d: Date): string => d.toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * The XMP packet embedded as the catalog's /Metadata stream — the modern
 * half of PDF metadata ("exif"). Kept uncompressed and self-describing so
 * any reader (and any future PDF/A conformance pass, which REQUIRES an
 * uncompressed XMP stream) can consume it as-is.
 */
export function buildXmpPacket(info: DocInfo): string {
  const subjects = info.keywords.map((k) => `          <rdf:li>${xmlEscape(k)}</rdf:li>`).join('\n')
  const creator = info.author
    ? `      <dc:creator>
        <rdf:Seq>
          <rdf:li>${xmlEscape(info.author)}</rdf:li>
        </rdf:Seq>
      </dc:creator>\n`
    : ''
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="${xmlEscape(PDF_CREATOR)}">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${xmlEscape(info.title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
${creator}      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${xmlEscape(info.subject)}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:language>
        <rdf:Bag>
          <rdf:li>${xmlEscape(info.language)}</rdf:li>
        </rdf:Bag>
      </dc:language>
      <dc:subject>
        <rdf:Bag>
${subjects}
        </rdf:Bag>
      </dc:subject>
      <xmp:CreatorTool>${xmlEscape(info.creator)}</xmp:CreatorTool>
      <xmp:CreateDate>${xmpDate(info.created)}</xmp:CreateDate>
      <xmp:ModifyDate>${xmpDate(info.modified)}</xmp:ModifyDate>
      <xmp:MetadataDate>${xmpDate(info.modified)}</xmp:MetadataDate>
      <pdf:Producer>${xmlEscape(info.producer)}</pdf:Producer>
      <pdf:Keywords>${xmlEscape(info.keywords.join(', '))}</pdf:Keywords>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`
}

/**
 * Writes `info` onto a pdf-lib document: the Info dictionary, the XMP
 * metadata stream, the document language, and the viewer preference that
 * makes readers show the TITLE rather than the filename (a real
 * accessibility requirement — PDF/UA 7.1, WCAG 2.4.2 "Page Titled").
 */
export function applyPdfMetadata(pdfDoc: PDFDocument, info: DocInfo): void {
  pdfDoc.setTitle(info.title, { showInWindowTitleBar: true })
  if (info.author) pdfDoc.setAuthor(info.author)
  pdfDoc.setSubject(info.subject)
  pdfDoc.setKeywords(info.keywords)
  pdfDoc.setCreator(info.creator)
  pdfDoc.setProducer(info.producer)
  pdfDoc.setCreationDate(info.created)
  pdfDoc.setModificationDate(info.modified)
  pdfDoc.setLanguage(info.language)

  // The catalog /Metadata stream. Uncompressed on purpose (see
  // buildXmpPacket) and encoded as UTF-8 BYTES, never handed over as a JS
  // string: pdf-lib writes a string stream one char code per byte, which
  // truncates every non-Latin-1 character — an em-dash (U+2014) in a title
  // landed in the packet as 0x14, and any accented name would corrupt the
  // same way. XMP is defined as UTF-8, so encode it as UTF-8.
  const packet = buildXmpPacket(info)
  const stream = pdfDoc.context.stream(new TextEncoder().encode(packet), {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  })
  pdfDoc.catalog.set(PDFName.of('Metadata'), pdfDoc.context.register(stream))
}
