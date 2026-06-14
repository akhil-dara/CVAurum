import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  withLists?: boolean
  minHeight?: number
}

export function RichTextEditor({ value, onChange, placeholder, withLists = true, minHeight = 64 }: Props) {
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
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write here…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rt-content focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

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
    </div>
  )
}
