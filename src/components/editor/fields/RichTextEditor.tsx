import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, Link2, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  withLists?: boolean
  minHeight?: number
}

// Slash-command snippets live in a shared module so "/" works identically on
// the canvas and in this panel editor.
import { SLASH_COMMANDS, type Slash } from '@/lib/slashCommands'

export function RichTextEditor({ value, onChange, placeholder, withLists = true, minHeight = 64 }: Props) {
  // Slash menu state, mirrored into a ref so the ProseMirror keydown handler
  // (bound once at editor creation) always sees the latest values.
  const [menu, setMenu] = useState<{ open: boolean; items: Slash[]; index: number; top: number; left: number; from: number; to: number }>(
    { open: false, items: [], index: 0, top: 0, left: 0, from: 0, to: 0 },
  )
  const menuRef = useRef(menu)
  menuRef.current = menu
  const editorRef = useRef<Editor | null>(null)

  const closeMenu = () => setMenu((m) => (m.open ? { ...m, open: false } : m))
  const runSlash = (cmd: Slash) => {
    const ed = editorRef.current
    const m = menuRef.current
    if (!ed) return
    const caretMark = cmd.insert.indexOf('¦')
    const text = cmd.insert.replace('¦', '')
    ed.chain().focus().deleteRange({ from: m.from, to: m.to }).insertContent(text).run()
    if (caretMark >= 0) ed.commands.setTextSelection(m.from + caretMark)
    closeMenu()
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: withLists ? {} : false,
        orderedList: withLists ? {} : false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Only real web links — never javascript:/data: URIs (XSS vector).
        validate: (href) => /^https?:\/\//i.test(href),
        protocols: ['http', 'https'],
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write here…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'rt-content focus:outline-none' },
      // Intercept navigation keys ONLY while the slash menu is open.
      handleKeyDown: (_view, event) => {
        const m = menuRef.current
        if (!m.open) return false
        if (event.key === 'ArrowDown') { event.preventDefault(); setMenu((s) => ({ ...s, index: (s.index + 1) % s.items.length })); return true }
        if (event.key === 'ArrowUp') { event.preventDefault(); setMenu((s) => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length })); return true }
        if (event.key === 'Enter') { event.preventDefault(); runSlash(m.items[m.index]); return true }
        if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return true }
        return false
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })
  editorRef.current = editor

  // Detect a trailing "/query" at the caret → open + filter the slash menu.
  useEffect(() => {
    if (!editor) return
    const onTx = () => {
      const { from, empty } = editor.state.selection
      if (!empty) return closeMenu()
      const before = editor.state.doc.textBetween(Math.max(0, from - 30), from, '\n', '￼')
      const mt = before.match(/(?:^|\s)\/([\w-]*)$/)
      if (!mt) return closeMenu()
      const query = mt[1].toLowerCase()
      const items = SLASH_COMMANDS.filter((c) => (c.title + ' ' + c.hint).toLowerCase().includes(query))
      if (!items.length) return closeMenu()
      const slashFrom = from - query.length - 1
      let coords: { top: number; left: number; bottom: number }
      try { coords = editor.view.coordsAtPos(slashFrom) } catch { return closeMenu() }
      setMenu({ open: true, items, index: 0, top: coords.bottom + 4, left: coords.left, from: slashFrom, to: from })
    }
    editor.on('transaction', onTx)
    editor.on('blur', closeMenu)
    return () => { editor.off('transaction', onTx); editor.off('blur', closeMenu) }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes (undo/redo, template/import swaps) into the
  // editor. During normal typing `value` equals the current HTML, so this is a
  // no-op then. When it changes from OUTSIDE — even while focused — we apply it
  // and restore the caret so the update appears immediately.
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value === current) return
    const wasFocused = editor.isFocused
    const { from, to } = editor.state.selection
    editor.commands.setContent(value || '', false)
    if (wasFocused) {
      const size = editor.state.doc.content.size
      editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) })
    }
  }, [value, editor])

  return (
    <div className="rt-wrap rounded-md border border-input bg-surface focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
      {editor && <Toolbar editor={editor} withLists={withLists} />}
      <EditorContent editor={editor} style={{ minHeight }} className="px-2.5 py-2 text-sm leading-relaxed" />
      {menu.open &&
        createPortal(
          <div
            data-slash-menu
            className="fixed z-[75] w-64 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-float"
            style={{ top: menu.top, left: menu.left }}
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Insert</div>
            {menu.items.map((c, i) => (
              <button
                key={c.title}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runSlash(c) }}
                onMouseEnter={() => setMenu((s) => ({ ...s, index: i }))}
                className={cn('flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm', i === menu.index ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/60')}
              >
                <span className="truncate">{c.title}</span>
                <span className="flex items-center gap-1.5">
                  <span className="max-w-[7rem] truncate text-[11px] text-muted-foreground">{c.hint}</span>
                  {i === menu.index && <CornerDownLeft className="h-3 w-3 text-muted-foreground" />}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

function TBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
        active && 'bg-primary/10 text-primary'
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor, withLists }: { editor: Editor; withLists: boolean }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  return (
    <div className="flex items-center gap-0.5 border-b border-border px-1 py-1">
      <TBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </TBtn>
      {withLists && (
        <TBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </TBtn>
      )}
      <TBtn title="Link" active={editor.isActive('link')} onClick={setLink}>
        <Link2 className="h-3.5 w-3.5" />
      </TBtn>
      <span className="ml-auto pr-1 text-[10px] text-muted-foreground">Type <kbd className="rounded border border-border px-1">/</kbd> to insert</span>
    </div>
  )
}
