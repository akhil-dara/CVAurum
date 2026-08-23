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
import { buildStructure, type TagSink, type TaggedMark } from './tagging'
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
      })
      return { marked: true } satisfies MarkToken
    },
    end(page: unknown) {
      push(page, [PDFOperator.of(PDFOperatorNames.EndMarkedContent, [])])
    },
  }
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
    context.assign(ref, context.obj(dict as never))
    for (const m of mcids) if (parentsByPage[pageIndex]) parentsByPage[pageIndex][m] = ref
    return ref
  }

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
    kids.push(addElement(node.role, node.pageIndex, node.mcids, documentRef, [], node.alt))
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
  const parentTreeRef = context.nextRef()
  context.assign(parentTreeRef, context.obj({ Nums: context.obj(numsArray as never) } as never))

  context.assign(
    structTreeRef,
    context.obj({
      Type: PDFName.of('StructTreeRoot'),
      ...(namespaceRef ? { Namespaces: context.obj([namespaceRef] as never) } : {}),
      K: context.obj([documentRef] as never),
      ParentTree: parentTreeRef,
      ParentTreeNextKey: PDFNumber.of(pages.length),
    } as never)
  )

  pdfDoc.catalog.set(PDFName.of('StructTreeRoot'), structTreeRef)
  pdfDoc.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true } as never))
  return true
}
