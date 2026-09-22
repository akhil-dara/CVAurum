/**
 * Structure-tree writing (patches 0005/0006/0007). These tests build a real
 * pdf-lib document, run writeStructTree over it, and assert on the resulting
 * PDF objects — not on helper return values — so they fail on the exact
 * defects the patches fix.
 */
import { describe, it, expect } from 'vitest'
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
} from 'pdf-lib'
import { writeStructTree } from './structure'
import type { TaggedMark } from './tagging'

/** A document with one page, one tagged paragraph, and `n` Link annotations
 *  shaped exactly like paint.ts's `link` case (post-0003: /Contents = URL). */
async function docWithLinks(n: number) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const ctx = pdfDoc.context
  const refs = []
  for (let i = 0; i < n; i++) {
    const annot = ctx.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [10 + i * 100, 10, 90 + i * 100, 30],
      Border: [0, 0, 0],
      F: PDFNumber.of(4),
      Contents: PDFString.of(`https://example.com/${i}`),
      A: ctx.obj({ Type: PDFName.of('Action'), S: PDFName.of('URI'), URI: PDFString.of(`https://example.com/${i}`) }),
    })
    refs.push(ctx.register(annot))
  }
  page.node.set(PDFName.of('Annots'), ctx.obj(refs))
  const marks: TaggedMark[] = [{ pageIndex: 0, mcid: 0, role: 'P' }]
  return { pdfDoc, page, marks }
}

function parentTreeMap(pdfDoc: PDFDocument): Map<number, unknown> {
  const root = pdfDoc.catalog.get(PDFName.of('StructTreeRoot'))
  const tree = pdfDoc.context.lookup(root) as PDFDict
  const pt = pdfDoc.context.lookup(tree.get(PDFName.of('ParentTree'))) as PDFDict
  const nums = pdfDoc.context.lookup(pt.get(PDFName.of('Nums'))) as PDFArray
  const map = new Map<number, unknown>()
  const arr = nums.asArray()
  for (let i = 0; i < arr.length; i += 2) {
    map.set((arr[i] as PDFNumber).asNumber(), pdfDoc.context.lookup(arr[i + 1]))
  }
  return map
}

function linkElements(pdfDoc: PDFDocument): PDFDict[] {
  const root = pdfDoc.catalog.get(PDFName.of('StructTreeRoot'))
  const tree = pdfDoc.context.lookup(root) as PDFDict
  const kids = pdfDoc.context.lookup(tree.get(PDFName.of('K'))) as PDFArray
  const docEl = pdfDoc.context.lookup(kids.get(0)) as PDFDict
  const docKids = pdfDoc.context.lookup(docEl.get(PDFName.of('K'))) as PDFArray
  return docKids
    .asArray()
    .map((r) => pdfDoc.context.lookup(r) as PDFDict)
    .filter((d) => d.get(PDFName.of('S')) === PDFName.of('Link'))
}

describe('0005: link annotations are tagged in the structure tree', () => {
  it('gives every Link annotation an integer /StructParent', async () => {
    const { pdfDoc, page, marks } = await docWithLinks(3)
    expect(writeStructTree(pdfDoc, marks)).toBe(true)
    const annots = page.node.get(PDFName.of('Annots')) as PDFArray
    const keys = annots.asArray().map((r) => {
      const a = pdfDoc.context.lookup(r) as PDFDict
      return a.get(PDFName.of('StructParent'))
    })
    expect(keys.every((k) => k instanceof PDFNumber)).toBe(true)
    const nums = keys.map((k) => (k as PDFNumber).asNumber())
    expect(new Set(nums).size).toBe(3) // unique
  })

  it('maps each /StructParent through the ParentTree to the /Link structure element', async () => {
    const { pdfDoc, page, marks } = await docWithLinks(3)
    writeStructTree(pdfDoc, marks)
    const map = parentTreeMap(pdfDoc)
    const annots = (page.node.get(PDFName.of('Annots')) as PDFArray).asArray()
    for (const annotRef of annots) {
      const annot = pdfDoc.context.lookup(annotRef) as PDFDict
      const key = (annot.get(PDFName.of('StructParent')) as PDFNumber).asNumber()
      const target = map.get(key) as PDFDict
      expect(target).toBeInstanceOf(PDFDict)
      // The ParentTree maps the annotation key to its /Link StructElem…
      expect(target.get(PDFName.of('S'))).toEqual(PDFName.of('Link'))
      // …whose /K holds the OBJR pointing back at THIS annotation…
      const objr = pdfDoc.context.lookup(target.get(PDFName.of('K'))) as PDFDict
      expect(objr.get(PDFName.of('Type'))).toEqual(PDFName.of('OBJR'))
      expect((objr.get(PDFName.of('Obj')) as unknown) === annotRef).toBe(true)
      // …and names the page it lives on.
      expect(objr.get(PDFName.of('Pg')) === page.ref).toBe(true)
    }
  })

  it('adds one /Link structure element per annotation, holding only the OBJR', async () => {
    const { pdfDoc, marks } = await docWithLinks(3)
    writeStructTree(pdfDoc, marks)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(3)
    const map = parentTreeMap(pdfDoc)
    const seen = new Set<number>()
    for (const link of links) {
      const k = pdfDoc.context.lookup(link.get(PDFName.of('K'))) as PDFDict
      expect(k.get(PDFName.of('Type'))).toEqual(PDFName.of('OBJR'))
      // The ParentTree maps each annotation key to its /Link element.
      let found = false
      for (const [key, val] of map) {
        if (val === link) {
          found = true
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
      expect(found).toBe(true)
    }
    expect(seen.size).toBe(3)
  })

  it('keeps ParentTreeNextKey above every page and annotation key', async () => {
    const { pdfDoc, marks } = await docWithLinks(3)
    writeStructTree(pdfDoc, marks)
    const root = pdfDoc.catalog.get(PDFName.of('StructTreeRoot'))
    const tree = pdfDoc.context.lookup(root) as PDFDict
    const nextKey = (tree.get(PDFName.of('ParentTreeNextKey')) as PDFNumber).asNumber()
    // Page keys are 0..pages-1; annotation keys follow. 1 page + 3 annots.
    expect(nextKey).toBe(4)
    for (const key of parentTreeMap(pdfDoc).keys()) {
      expect(key).toBeLessThan(nextKey)
    }
  })

  it('leaves /Contents (the 0003 alternate text) exactly the URL', async () => {
    const { pdfDoc, page, marks } = await docWithLinks(2)
    writeStructTree(pdfDoc, marks)
    const annots = (page.node.get(PDFName.of('Annots')) as PDFArray).asArray()
    annots.forEach((r, i) => {
      const a = pdfDoc.context.lookup(r) as PDFDict
      expect((a.get(PDFName.of('Contents')) as PDFString).decodeText()).toBe(`https://example.com/${i}`)
    })
  })

  it('leaves the existing MCID tree untouched (no duplicate/orphan entries)', async () => {
    const { pdfDoc, marks } = await docWithLinks(2)
    writeStructTree(pdfDoc, marks)
    const map = parentTreeMap(pdfDoc)
    // Key 0 is the page row: an array with the /P element for MCID 0.
    const row = map.get(0) as PDFArray
    expect(row).toBeInstanceOf(PDFArray)
    const elem = pdfDoc.context.lookup(row.get(0)) as PDFDict
    expect(elem.get(PDFName.of('S'))).toEqual(PDFName.of('P'))
  })
})

describe('0006: page tab order follows structure', () => {
  it('sets /Tabs /S on every page when the tree is written', async () => {
    const { pdfDoc, marks } = await docWithLinks(2)
    expect(writeStructTree(pdfDoc, marks)).toBe(true)
    for (const page of pdfDoc.getPages()) {
      expect(page.node.get(PDFName.of('Tabs'))).toEqual(PDFName.of('S'))
    }
  })

  it('does not set /Tabs when there is nothing to tag (no false structure claim)', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([612, 792])
    expect(writeStructTree(pdfDoc, [])).toBe(false)
    expect(pdfDoc.getPages()[0].node.get(PDFName.of('Tabs'))).toBeUndefined()
  })
})

/** Walk the /Outlines into plain {title, children} for assertions. */
function readOutline(pdfDoc: PDFDocument): Array<{ title: string; dest: unknown; children: unknown[] }> {
  const ctx = pdfDoc.context
  const outlinesRef = pdfDoc.catalog.get(PDFName.of('Outlines'))
  expect(outlinesRef).toBeDefined()
  const outlines = ctx.lookup(outlinesRef) as PDFDict
  const walk = (firstRef: unknown): Array<{ title: string; dest: unknown; children: unknown[] }> => {
    const items: Array<{ title: string; dest: unknown; children: unknown[] }> = []
    let ref = firstRef as PDFRef | undefined
    while (ref) {
      const item = ctx.lookup(ref) as PDFDict
      const first = item.get(PDFName.of('First'))
      items.push({
        title: (item.get(PDFName.of('Title')) as PDFString).decodeText(),
        dest: item.get(PDFName.of('Dest')),
        children: first ? walk(first) : [],
      })
      ref = item.get(PDFName.of('Next')) as PDFRef | undefined
    }
    return items
  }
  return walk(outlines.get(PDFName.of('First')))
}

describe('0007: document outline from headings', () => {
  const headingMarks = (): TaggedMark[] => [
    { pageIndex: 0, mcid: 0, role: 'H1', text: 'Jane Doe', blockId: 1 },
    { pageIndex: 0, mcid: 1, role: 'H2', text: 'Experience', blockId: 2 },
    { pageIndex: 0, mcid: 2, role: 'H3', text: 'Acme Corp', blockId: 3 },
    { pageIndex: 0, mcid: 3, role: 'H2', text: 'Education', blockId: 4 },
    { pageIndex: 0, mcid: 4, role: 'P', blockId: 5 },
  ]

  it('builds a nested outline mirroring the H1/H2/H3 hierarchy', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([612, 792])
    expect(writeStructTree(pdfDoc, headingMarks())).toBe(true)
    const outline = readOutline(pdfDoc)
    expect(outline.length).toBe(1)
    expect(outline[0].title).toBe('Jane Doe')
    expect(outline[0].children.length).toBe(2)
    expect((outline[0].children[0] as { title: string }).title).toBe('Experience')
    expect(((outline[0].children[0] as { children: unknown[] }).children[0] as { title: string }).title).toBe(
      'Acme Corp'
    )
    expect((outline[0].children[1] as { title: string }).title).toBe('Education')
  })

  it('points every outline item at its heading page', async () => {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    writeStructTree(pdfDoc, headingMarks())
    const outline = readOutline(pdfDoc)
    const dest = outline[0].dest as PDFArray
    // Dest is [pageRef /Fit]: the ref must be the heading's page.
    expect(dest.get(0).toString()).toBe(page.ref.toString())
    expect(dest.get(1)).toEqual(PDFName.of('Fit'))
  })

  it('joins a wrapped heading into one outline title', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([612, 792])
    const marks: TaggedMark[] = [
      { pageIndex: 0, mcid: 0, role: 'H2', text: 'Sales', blockId: 1 },
      { pageIndex: 0, mcid: 1, role: 'H2', text: 'Development', blockId: 1 },
    ]
    writeStructTree(pdfDoc, marks)
    const outline = readOutline(pdfDoc)
    expect(outline.length).toBe(1)
    expect(outline[0].title).toBe('Sales Development')
  })

  it('writes no outline when there are no headings', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([612, 792])
    writeStructTree(pdfDoc, [{ pageIndex: 0, mcid: 0, role: 'P', blockId: 1 }])
    expect(pdfDoc.catalog.get(PDFName.of('Outlines'))).toBeUndefined()
  })
})

describe('0008: link text and annotation share one /Link element', () => {
  /** A document with one page and one Link annotation per URL in `urls`,
   *  shaped like paint.ts's `link` case (post-0003: /Contents = URL). */
  async function docWithAnnotUrls(urls: string[]) {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    const ctx = pdfDoc.context
    const refs: PDFRef[] = []
    for (const [i, url] of urls.entries()) {
      const annot = ctx.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: [10 + i * 100, 10, 90 + i * 100, 30],
        Border: [0, 0, 0],
        F: PDFNumber.of(4),
        Contents: PDFString.of(url),
        A: ctx.obj({ Type: PDFName.of('Action'), S: PDFName.of('URI'), URI: PDFString.of(url) }),
      })
      refs.push(ctx.register(annot))
    }
    page.node.set(PDFName.of('Annots'), ctx.obj(refs))
    return { pdfDoc, page, refs }
  }

  /** /K kids of a /Link element, resolved: PDFNumbers for text MCIDs and
   *  OBJR dicts for annotations. */
  function linkKids(pdfDoc: PDFDocument, link: PDFDict): unknown[] {
    const k = link.get(PDFName.of('K'))
    const arr = k instanceof PDFArray ? k.asArray() : [k]
    return arr.map((x) => pdfDoc.context.lookup(x))
  }

  const CONTACT = [
    'mailto:grant.halloway@example.com',
    'tel:+15550128',
    'https://linkedin.com/in/granthalloway',
  ]

  function contactMarks(): TaggedMark[] {
    // The contact line: three links sharing one block, separators between.
    const marks: TaggedMark[] = []
    let mcid = 0
    CONTACT.forEach((linkUrl, i) => {
      if (i > 0) marks.push({ pageIndex: 0, mcid: mcid++, role: 'P', blockId: 7 })
      marks.push({ pageIndex: 0, mcid: mcid++, role: 'Link', blockId: 7, linkUrl })
    })
    return marks
  }

  it('puts each link’s text MCID and its annotation OBJR in the same /Link element', async () => {
    const { pdfDoc, page, refs } = await docWithAnnotUrls(CONTACT)
    expect(writeStructTree(pdfDoc, contactMarks())).toBe(true)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(3)
    links.forEach((link, i) => {
      const kids = linkKids(pdfDoc, link)
      // Text MCID first, then exactly one OBJR.
      expect(kids.length).toBe(2)
      expect(kids[0]).toBeInstanceOf(PDFNumber)
      const objr = kids[1] as PDFDict
      expect(objr.get(PDFName.of('Type'))).toEqual(PDFName.of('OBJR'))
      expect(objr.get(PDFName.of('Obj')) === refs[i]).toBe(true)
      expect(objr.get(PDFName.of('Pg')) === page.ref).toBe(true)
    })
  })

  it('wires each annotation’s /StructParent through the ParentTree to its text-carrying /Link element', async () => {
    const { pdfDoc, page, refs } = await docWithAnnotUrls(CONTACT)
    writeStructTree(pdfDoc, contactMarks())
    const map = parentTreeMap(pdfDoc)
    const links = linkElements(pdfDoc)
    refs.forEach((annotRef, i) => {
      const annot = pdfDoc.context.lookup(annotRef) as PDFDict
      const key = (annot.get(PDFName.of('StructParent')) as PDFNumber).asNumber()
      // The ParentTree maps the annotation key to the /Link element…
      expect(map.get(key) === links[i]).toBe(true)
      // …whose /K still holds the text MCID alongside the OBJR.
      const kids = linkKids(pdfDoc, links[i])
      expect(kids[0]).toBeInstanceOf(PDFNumber)
      expect((kids[1] as PDFDict).get(PDFName.of('Obj')) === annotRef).toBe(true)
      expect(page).toBeDefined()
    })
  })

  it('never cross-wires: each URL pairs with its own element', async () => {
    const urls = ['https://a.example/', 'https://b.example/']
    const { pdfDoc, refs } = await docWithAnnotUrls(urls)
    const marks: TaggedMark[] = urls.map((linkUrl, i) => ({ pageIndex: 0, mcid: i, role: 'Link', blockId: 3, linkUrl }))
    writeStructTree(pdfDoc, marks)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(2)
    links.forEach((link, i) => {
      const objr = linkKids(pdfDoc, link)[1] as PDFDict
      expect(objr.get(PDFName.of('Obj')) === refs[i]).toBe(true)
    })
  })

  it('a link wrapped across lines keeps one element holding every MCID and every OBJR', async () => {
    const url = 'https://wrapped.example/long'
    const { pdfDoc, refs } = await docWithAnnotUrls([url, url]) // one annotation per line
    const marks: TaggedMark[] = [
      { pageIndex: 0, mcid: 0, role: 'Link', blockId: 9, linkUrl: url },
      { pageIndex: 0, mcid: 1, role: 'Link', blockId: 9, linkUrl: url },
    ]
    writeStructTree(pdfDoc, marks)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(1)
    const kids = linkKids(pdfDoc, links[0])
    expect(kids.length).toBe(4)
    expect((kids[0] as PDFNumber).asNumber()).toBe(0)
    expect((kids[1] as PDFNumber).asNumber()).toBe(1)
    expect((kids[2] as PDFDict).get(PDFName.of('Obj')) === refs[0]).toBe(true)
    expect((kids[3] as PDFDict).get(PDFName.of('Obj')) === refs[1]).toBe(true)
  })

  it('falls back to a standalone OBJR-only /Link element when the link text was never tagged', async () => {
    const { pdfDoc } = await docWithAnnotUrls(['https://untagged.example/'])
    // No Link marks at all — e.g. decorative link text.
    writeStructTree(pdfDoc, [{ pageIndex: 0, mcid: 0, role: 'P' }])
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(1)
    const kids = linkKids(pdfDoc, links[0])
    expect(kids.length).toBe(1)
    expect((kids[0] as PDFDict).get(PDFName.of('Type'))).toEqual(PDFName.of('OBJR'))
  })

  it('keeps one MCID in exactly one element — no duplicate text ownership', async () => {
    const { pdfDoc } = await docWithAnnotUrls(CONTACT)
    writeStructTree(pdfDoc, contactMarks())
    const seen = new Map<number, number>()
    for (const link of linkElements(pdfDoc)) {
      for (const kid of linkKids(pdfDoc, link)) {
        if (kid instanceof PDFNumber) {
          const m = kid.asNumber()
          expect(seen.has(m)).toBe(false)
          seen.set(m, 1)
        }
      }
    }
    // All 5 text MCIDs (3 links + 2 separators live in P elements, not here).
    expect([...seen.keys()].sort()).toEqual([0, 2, 4])
  })
})

describe('0009: /Link elements declare block placement', () => {
  /** Resolve a structure element's /A attribute dictionary, if present. */
  function attrDict(pdfDoc: PDFDocument, el: PDFDict): PDFDict | undefined {
    const a = el.get(PDFName.of('A'))
    if (!a) return undefined
    return pdfDoc.context.lookup(a) as PDFDict
  }

  /** All direct children of the /Document element with role `role`. */
  function docKidsWithRole(pdfDoc: PDFDocument, role: string): PDFDict[] {
    const root = pdfDoc.catalog.get(PDFName.of('StructTreeRoot'))
    const tree = pdfDoc.context.lookup(root) as PDFDict
    const kids = pdfDoc.context.lookup(tree.get(PDFName.of('K'))) as PDFArray
    const docEl = pdfDoc.context.lookup(kids.get(0)) as PDFDict
    const docKids = pdfDoc.context.lookup(docEl.get(PDFName.of('K'))) as PDFArray
    return docKids
      .asArray()
      .map((r) => pdfDoc.context.lookup(r) as PDFDict)
      .filter((d) => d.get(PDFName.of('S')) === PDFName.of(role))
  }

  it('gives every OBJR-only /Link element /A << /O /Layout /Placement /Block >>', async () => {
    const { pdfDoc, marks } = await docWithLinks(3)
    writeStructTree(pdfDoc, marks)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(3)
    for (const link of links) {
      const a = attrDict(pdfDoc, link)
      expect(a).toBeInstanceOf(PDFDict)
      expect(a!.get(PDFName.of('O'))).toEqual(PDFName.of('Layout'))
      expect(a!.get(PDFName.of('Placement'))).toEqual(PDFName.of('Block'))
    }
  })

  it('also declares block placement on text-carrying /Link elements', async () => {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    const ctx = pdfDoc.context
    const url = 'https://example.com/x'
    const annotRef = ctx.register(
      ctx.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: [10, 10, 90, 30],
        Border: [0, 0, 0],
        F: PDFNumber.of(4),
        Contents: PDFString.of(url),
        A: ctx.obj({ Type: PDFName.of('Action'), S: PDFName.of('URI'), URI: PDFString.of(url) }),
      })
    )
    page.node.set(PDFName.of('Annots'), ctx.obj([annotRef]))
    const marks: TaggedMark[] = [{ pageIndex: 0, mcid: 0, role: 'Link', blockId: 1, linkUrl: url }]
    writeStructTree(pdfDoc, marks)
    const links = linkElements(pdfDoc)
    expect(links.length).toBe(1)
    const a = attrDict(pdfDoc, links[0])
    expect(a).toBeInstanceOf(PDFDict)
    expect(a!.get(PDFName.of('O'))).toEqual(PDFName.of('Layout'))
    expect(a!.get(PDFName.of('Placement'))).toEqual(PDFName.of('Block'))
  })

  it('leaves block-level elements like /P without a Placement attribute', async () => {
    const { pdfDoc, marks } = await docWithLinks(1)
    writeStructTree(pdfDoc, marks)
    const ps = docKidsWithRole(pdfDoc, 'P')
    expect(ps.length).toBe(1)
    expect(ps[0].get(PDFName.of('A'))).toBeUndefined()
  })
})
