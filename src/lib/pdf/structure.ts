/**
 * Writes the tagged-PDF structure tree (2026-08-19 "fully accessible").
 *
 * `createTagSink` is handed to the painter, which calls it around every op:
 * real content opens `/H2 <</MCID n>> BDC … EMC`, decoration opens
 * `/Artifact BDC … EMC`. The sink records what it marked; `writeStructTree`
 * then builds the objects a reader needs:
 *
 *   Catalog
 *     /MarkInfo << /Marked true >>          "this file is tagged"
 *     /StructTreeRoot
 *       /K        -> Document -> H1 | H2 | P | L(LI…) | Figure
 *       /ParentTree  number tree: page's /StructParents -> [element per MCID]
 *       /RoleMap     (empty: we only emit standard types)
 *   Page
 *     /StructParents  index into the ParentTree
 *
 * Every element names its page (/Pg) and its marked-content ids (/K), which
 * is what lets a screen reader jump from a heading in the tree to the exact
 * glyphs on the page — and back.
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  PDFPage,
  PDFRef,
  PDFString,
} from 'pdf-lib'
import type { DrawOp } from './types'
import { buildStructure, type StructNode, type TagSink, type TaggedMark } from './tagging'
import { STRUCT_NAMESPACE } from './pdfa'

interface MarkToken {
  marked: boolean
}

export interface TagCollector extends TagSink {
  marks: TaggedMark[]
}

/**
 * Creates the painter-facing sink. Artifacts are marked but never recorded
 * (they must not appear in the tree); content gets a per-PAGE MCID, which is
 * what the ParentTree indexes by.
 */
export function createTagSink(): TagCollector {
  const marks: TaggedMark[] = []
  let pageIndex = 0
  let nextMcid = 0

  const push = (page: unknown, ops: PDFOperator[]) => (page as PDFPage).pushOperators(...ops)

  return {
    marks,
    startPage(i: number) {
      pageIndex = i
      nextMcid = 0 // MCIDs restart on every page: they index that page's ParentTree row
    },
    begin(page: unknown, opUnknown: unknown): object | null {
      const op = opUnknown as DrawOp
      const role = op.kind === 'text' ? (op.role ?? 'P') : 'Artifact'
      if (role === 'Artifact') {
        // BMC, not BDC: an artifact carries no property list and is
        // explicitly OUTSIDE the structure tree.
        push(page, [PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Artifact')])])
        return { marked: true } satisfies MarkToken
      }
      // The property list is written inline (`<</MCID n>>`), the form a
      // content stream expects; pdf-lib passes a string operand through
      // verbatim.
      const mcid = nextMcid++
      push(page, [PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of(role), `<</MCID ${mcid}>>`])])
      marks.push({
        pageIndex,
        mcid,
        role,
        column: op.kind === 'text' ? op.column : undefined,
        blockId: op.kind === 'text' ? op.blockId : undefined,
        linkUrl: op.kind === 'text' ? op.linkUrl : undefined,
        // Headings feed the document outline (0007): capture their visible
        // text. Only H1/H2/H3 — paragraphs and list items never become
        // bookmarks.
        text:
          op.kind === 'text' && (role === 'H1' || role === 'H2' || role === 'H3')
            ? op.run.text
            : undefined,
      })
      return { marked: true } satisfies MarkToken
    },
    end(page: unknown) {
      push(page, [PDFOperator.of(PDFOperatorNames.EndMarkedContent, [])])
    },
  }
}

/**
 * Document outline (bookmarks) from the heading structure (0007).
 *
 * A ten-heading résumé with no outline gives a keyboard/screen-reader user
 * no way to jump between sections — the navigation gap behind the
 * "Document settings" / "2.4 Navigable" findings. The outline mirrors the
 * H1/H2/H3 hierarchy already in the structure tree, each item pointing at
 * its heading's page. Titles come from the heading marks' own text, so the
 * outline can never disagree with what the page shows.
 *
 * No-op when there are no headings: a file without sections gets no outline
 * rather than an empty one.
 */
function writeOutlines(pdfDoc: PDFDocument, pages: PDFPage[], nodes: StructNode[]): void {
  interface OutlineNode {
    title: string
    pageIndex: number
    level: number
    children: OutlineNode[]
  }
  const headings = nodes.filter(
    (n) =>
      (n.role === 'H1' || n.role === 'H2' || n.role === 'H3') && n.title !== undefined && n.title.trim().length > 0
  )
  if (!headings.length) return

  const root: OutlineNode[] = []
  const stack: OutlineNode[] = []
  for (const h of headings) {
    const level = h.role === 'H1' ? 1 : h.role === 'H2' ? 2 : 3
    const node: OutlineNode = { title: h.title!.trim(), pageIndex: h.pageIndex, level, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
    if (stack.length > 0) stack[stack.length - 1].children.push(node)
    else root.push(node)
    stack.push(node)
  }
  if (!root.length) return

  const context = pdfDoc.context
  const outlinesRef = context.nextRef()

  const descendants = (n: OutlineNode): number =>
    n.children.reduce((sum, c) => sum + 1 + descendants(c), 0)

  // Pre-allocate every ref on a level first so Next can point forward.
  const createLevel = (
    list: OutlineNode[],
    parentRef: PDFRef
  ): { first: PDFRef; last: PDFRef; count: number } => {
    const refs = list.map(() => context.nextRef())
    let first: PDFRef | null = null
    let prev: PDFRef | null = null
    let count = 0
    list.forEach((node, i) => {
      const ref = refs[i]
      if (!first) first = ref
      const dict: Record<string, unknown> = {
        Title: PDFString.of(node.title),
        Parent: parentRef,
        Dest: context.obj([pages[node.pageIndex].ref, PDFName.of('Fit')] as never),
      }
      if (prev) dict.Prev = prev
      if (i < list.length - 1) dict.Next = refs[i + 1]
      if (node.children.length > 0) {
        const sub = createLevel(node.children, ref)
        dict.First = sub.first
        dict.Last = sub.last
        dict.Count = PDFNumber.of(sub.count)
      }
      context.assign(ref, context.obj(dict as never))
      prev = ref
      count += 1 + descendants(node)
    })
    return { first: first!, last: prev!, count }
  }

  const { first, last, count } = createLevel(root, outlinesRef)
  context.assign(
    outlinesRef,
    context.obj({
      Type: PDFName.of('Outlines'),
      First: first,
      Last: last,
      Count: PDFNumber.of(count),
    } as never)
  )
  pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesRef)
}

/**
 * Builds and attaches the structure tree. Returns false (leaving an untagged
 * but perfectly valid file) when there is nothing to tag — never claims
 * `/Marked true` over an empty or missing tree, which is exactly the false
 * accessibility claim this work exists to avoid.
 */
export function writeStructTree(pdfDoc: PDFDocument, marks: TaggedMark[]): boolean {
  const nodes = buildStructure(marks)
  if (!nodes.length) return false

  const context = pdfDoc.context
  const pages = pdfDoc.getPages()
  const structTreeRef = context.nextRef()
  const documentRef = context.nextRef()

  // Structure namespace — a PDF 2.0 concept. PDF/UA-2 requires every element
  // to declare it explicitly (an absent one means "the legacy 1.7
  // namespace"); PDF 1.7 targets have no such key at all, so this is null
  // there and every `NS` entry below is simply omitted.
  let namespaceRef: PDFRef | null = null
  if (STRUCT_NAMESPACE) {
    namespaceRef = context.nextRef()
    context.assign(
      namespaceRef,
      context.obj({ Type: PDFName.of('Namespace'), NS: PDFString.of(STRUCT_NAMESPACE) } as never)
    )
  }
  const ns = (dict: Record<string, unknown>): Record<string, unknown> =>
    namespaceRef ? { ...dict, NS: namespaceRef } : dict

  // Per page: the element that owns each MCID, indexed BY MCID.
  const parentsByPage: PDFRef[][] = pages.map(() => [])
  const kids: PDFRef[] = []

  const addElement = (
    role: string,
    pageIndex: number,
    mcids: number[],
    parent: PDFRef,
    childRefs: PDFRef[] = [],
    alt?: string
  ): PDFRef => {
    const ref = context.nextRef()
    const page = pages[pageIndex]
    const dict: Record<string, unknown> = ns({
      Type: PDFName.of('StructElem'),
      S: PDFName.of(role),
      P: parent,
    })
    if (page) dict.Pg = page.ref
    const k: unknown[] = [...mcids.map((m) => PDFNumber.of(m)), ...childRefs]
    dict.K = k.length === 1 ? k[0] : context.obj(k as never)
    if (alt) dict.Alt = PDFHexString.fromText(alt)
    if (role === 'Link') {
      // 0009: Link is an innately inline-level structure element, but this
      // generator emits /Link elements as block-level children of /Document
      // (one per link, holding the link's text MCID(s) plus its annotation
      // OBJR — both call sites below pass documentRef as the parent). Without
      // an explicit placement declaration, PAC/axesCheck raise "Possibly
      // inappropriate use of a \"Link\" structure element"
      // (LinkTag-PossibleInappropriateUseParagraph) on every such element.
      // The documented remediation is axesPDF's "Fix Placement": the Layout
      // attribute /Placement /Block (ISO 32000-1, Table 344).
      dict.A = context.obj({
        O: PDFName.of('Layout'),
        Placement: PDFName.of('Block'),
      } as never)
    }
    context.assign(ref, context.obj(dict as never))
    for (const m of mcids) if (parentsByPage[pageIndex]) parentsByPage[pageIndex][m] = ref
    return ref
  }

  // /Link elements created for link TEXT (0008): the annotation loop below
  // pairs each Link annotation's OBJR into the element whose text carries
  // the same URL, instead of minting separate textless elements.
  const linkElements: Array<{ pageIndex: number; linkUrl?: string; ref: PDFRef; objrs: PDFRef[] }> = []

  for (const node of nodes) {
    if (node.children?.length) {
      // A list: create it first so its items can name it as their parent.
      const listRef = context.nextRef()
      const itemRefs = node.children.map((child) => {
        // LI wraps an LBody, which is what actually owns the marks — the
        // shape readers expect for list content.
        const liRef = context.nextRef()
        const bodyRef = addElement('LBody', child.pageIndex, child.mcids, liRef)
        context.assign(
          liRef,
          context.obj(
            ns({
              Type: PDFName.of('StructElem'),
              S: PDFName.of('LI'),
              P: listRef,
              K: bodyRef,
            }) as never
          )
        )
        return liRef
      })
      context.assign(
        listRef,
        context.obj(
          ns({
            Type: PDFName.of('StructElem'),
            S: PDFName.of('L'),
            P: documentRef,
            K: context.obj(itemRefs as never),
          }) as never
        )
      )
      kids.push(listRef)
      continue
    }
    const nodeRef = addElement(node.role, node.pageIndex, node.mcids, documentRef, [], node.alt)
    kids.push(nodeRef)
    if (node.role === 'Link') linkElements.push({ pageIndex: node.pageIndex, linkUrl: node.linkUrl, ref: nodeRef, objrs: [] })
  }

  // Reads the URL paint.ts stored on a Link annotation: the URI action's
  // target first, falling back to /Contents (patch 0003 wrote the URL
  // there). Both carry the same linkTarget-normalized value the link's
  // text marks carry as linkUrl, which is what the pairing matches on.
  const annotationUrl = (annot: PDFDict): string | undefined => {
    const action = context.lookup(annot.get(PDFName.of('A')))
    if (action instanceof PDFDict) {
      const uri = action.get(PDFName.of('URI'))
      if (uri instanceof PDFString || uri instanceof PDFHexString) return uri.decodeText()
    }
    const contents = annot.get(PDFName.of('Contents'))
    if (contents instanceof PDFString || contents instanceof PDFHexString) return contents.decodeText()
    return undefined
  }

  // PDF/UA-1 §7.18.1: annotations are content and must be represented in the
  // structure tree. Each Link annotation gets a /StructParent key and a
  // ParentTree entry — the same back-pointer pattern the MCID half uses —
  // pointing at a /Link structure element. (Patch 0003 gave the annotations
  // their /Contents alternate text; 0005 added the structural half.)
  //
  // 0008: the /Link element is the one holding the link's VISIBLE TEXT
  // (tagged with role 'Link' by walk.ts), and the annotation's OBJR is
  // appended to that same element's /K — text object(s) plus Link-OBJR as
  // children of one Link tag, which is the pairing validators require.
  // Matching is by (page, normalized URL). A link wrapped across lines has
  // one text element but one annotation per line, so once a group is
  // exhausted further annotations append to that group's last element; a
  // link whose text was never tagged (decorative, or untagged export path)
  // keeps a standalone OBJR-only element, the 0005 behavior.
  const annotParentEntries: Array<{ key: number; linkRef: PDFRef }> = []
  let nextParentKey = pages.length
  const groupCursor = new Map<string, number>()
  pages.forEach((page, pageIndex) => {
    const annots = page.node.get(PDFName.of('Annots'))
    if (!(annots instanceof PDFArray)) return
    for (const annotRef of annots.asArray()) {
      const annot = context.lookup(annotRef)
      if (!(annot instanceof PDFDict)) continue
      if (annot.get(PDFName.of('Subtype')) !== PDFName.of('Link')) continue
      if (annot.get(PDFName.of('StructParent')) instanceof PDFNumber) continue
      const key = nextParentKey++
      annot.set(PDFName.of('StructParent'), PDFNumber.of(key))
      const objrRef = context.nextRef()
      context.assign(
        objrRef,
        context.obj({ Type: PDFName.of('OBJR'), Obj: annotRef, Pg: page.ref } as never)
      )
      const url = annotationUrl(annot)
      const group = linkElements.filter(
        (e) => e.pageIndex === pageIndex && (e.linkUrl ?? '') === (url ?? '')
      )
      let linkRef: PDFRef
      if (group.length > 0) {
        const groupKey = `${pageIndex}|${url ?? ''}`
        const idx = Math.min(groupCursor.get(groupKey) ?? 0, group.length - 1)
        groupCursor.set(groupKey, idx + 1)
        const target = group[idx]
        target.objrs.push(objrRef)
        linkRef = target.ref
      } else {
        linkRef = addElement('Link', pageIndex, [], documentRef, [objrRef])
        kids.push(linkRef)
      }
      annotParentEntries.push({ key, linkRef })
    }
  })
  // The paired OBJRs land after the text MCIDs in each /Link element's /K.
  for (const el of linkElements) {
    if (el.objrs.length === 0) continue
    const dict = context.lookup(el.ref)
    if (!(dict instanceof PDFDict)) continue
    const k = dict.get(PDFName.of('K'))
    const kidsArr: unknown[] = k instanceof PDFArray ? [...k.asArray()] : k !== undefined ? [k] : []
    for (const r of el.objrs) kidsArr.push(r)
    dict.set(PDFName.of('K'), context.obj(kidsArr as never))
  }

  context.assign(
    documentRef,
    context.obj(
      ns({
        Type: PDFName.of('StructElem'),
        S: PDFName.of('Document'),
        P: structTreeRef,
        K: context.obj(kids as never),
      }) as never
    )
  )

  // ParentTree: a number tree whose keys are each page's /StructParents.
  const numsArray: unknown[] = []
  pages.forEach((page, i) => {
    page.node.set(PDFName.of('StructParents'), PDFNumber.of(i))
    const row = parentsByPage[i] ?? []
    // Holes would break the mapping, so fill any gap with the Document.
    const dense = Array.from({ length: row.length }, (_, mcid) => row[mcid] ?? documentRef)
    numsArray.push(PDFNumber.of(i), context.obj(dense as never))
  })
  // Annotation entries follow the page rows: each /StructParent key maps to
  // its /Link structure element (whose /K holds the OBJR to the annotation).
  for (const { key, linkRef } of annotParentEntries) {
    numsArray.push(PDFNumber.of(key), linkRef)
  }
  const parentTreeRef = context.nextRef()
  context.assign(parentTreeRef, context.obj({ Nums: context.obj(numsArray as never) } as never))

  context.assign(
    structTreeRef,
    context.obj({
      Type: PDFName.of('StructTreeRoot'),
      ...(namespaceRef ? { Namespaces: context.obj([namespaceRef] as never) } : {}),
      K: context.obj([documentRef] as never),
      ParentTree: parentTreeRef,
      ParentTreeNextKey: PDFNumber.of(nextParentKey),
    } as never)
  )

  pdfDoc.catalog.set(PDFName.of('StructTreeRoot'), structTreeRef)
  pdfDoc.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true } as never))
  // WCAG 2.4.3 (Focus Order): with link annotations on the page the keyboard
  // tab order must be defined; /S follows the structure order of the tree
  // just written, which is the logical reading order.
  for (const page of pages) page.node.set(PDFName.of('Tabs'), PDFName.of('S'))
  // Document outline from the headings (0007): the section-jump navigation
  // a ten-heading document otherwise lacks.
  writeOutlines(pdfDoc, pages, nodes)
  return true
}
