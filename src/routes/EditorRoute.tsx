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
      // Résumés live in the browser that made them, so the usual reason is a
      // link opened somewhere else, or site data that was cleared. Say so,
      // and point at the one place that can bring it back: a backup file.
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">This résumé isn’t in this browser</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Résumés are saved only in the browser that made them. If you opened this link on another device or browser,
            or cleared this site’s data, it can’t be found here. A backup file brings it back: open your résumés and
            choose <span className="font-medium text-foreground">Restore from backup</span>.
          </p>
        </div>
        <Link to="/app" className="btn-primary">
          Open your résumés
        </Link>
      </div>
    )
  }
  return <Editor doc={doc} />
}
