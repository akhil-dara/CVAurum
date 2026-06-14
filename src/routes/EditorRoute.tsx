import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadDoc } from '@/lib/storage'
import { useResumeStore } from '@/store/useResumeStore'
import { useAutosave } from '@/hooks/useAutosave'
import { Editor } from '@/components/editor/Editor'
import { useTitle } from '@/lib/useTitle'

export function EditorRoute() {
  useTitle('Resume Editor · CVAurum')
  const { id } = useParams<{ id: string }>()
  const load = useResumeStore((s) => s.load)
  const close = useResumeStore((s) => s.close)
  const doc = useResumeStore((s) => s.doc)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  useAutosave()

  useEffect(() => {
    if (!id) return
    let active = true
    setStatus('loading')
    loadDoc(id).then((d) => {
      if (!active) return
      if (d) {
        load(d)
        // Reset undo history so it never crosses documents.
        useResumeStore.temporal.getState().clear()
        setStatus('ready')
      } else {
        setStatus('missing')
      }
    })
    return () => {
      active = false
      close()
    }
  }, [id, load, close])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }
  if (status === 'missing' || !doc) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-lg font-medium">Resume not found</p>
        <Link to="/app" className="btn-primary">
          Back to dashboard
        </Link>
      </div>
    )
  }
  return <Editor doc={doc} />
}
