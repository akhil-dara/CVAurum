/**
 * Receives a private share LINK (/r#<payload>). The résumé rides entirely in the
 * URL fragment, which the browser never sends to a server — so decoding happens
 * here, on-device, and the result is saved as a brand-new local résumé.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { decodeShare } from '@/lib/share'
import { ResumeDocumentSchema } from '@/types/document'
import { sanitizeImportedImage } from '@/lib/io'
import { saveDoc } from '@/lib/storage'
import { useAppStore } from '@/store/useAppStore'
import { uid } from '@/lib/utils'

export function ShareReceive() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    document.getElementById('boot-splash')?.remove()
    ;(async () => {
      try {
        const payload = window.location.hash.replace(/^#/, '')
        if (!payload) throw new Error('This share link is empty.')
        const raw = await decodeShare(payload)
        const parsed = ResumeDocumentSchema.safeParse(raw)
        if (!parsed.success) throw new Error('This share link is not a valid résumé.')
        const doc = parsed.data
        // Fresh identity + timestamps; sanitize any embedded images the same way
        // an imported file is sanitized (local data URIs only).
        doc.id = uid()
        doc.title = doc.title ? `${doc.title} (shared)` : 'Shared résumé'
        doc.createdAt = Date.now()
        doc.updatedAt = Date.now()
        doc.content.basics.image = await sanitizeImportedImage(doc.content.basics.image)
        for (const list of [doc.content.work, doc.content.education, doc.content.volunteer]) {
          for (const it of list as { logo?: string }[]) if (it.logo) it.logo = await sanitizeImportedImage(it.logo)
        }
        await saveDoc(doc)
        await useAppStore.getState().refreshLibrary()
        useAppStore.getState().toast('Shared résumé opened — it is now saved on this device.', 'success')
        navigate(`/resume/${doc.id}`, { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open this share link.')
      }
    })()
  }, [navigate])

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
      {error ? (
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-3 text-sm font-medium">{error}</p>
          <button className="btn-primary btn-sm mt-4" onClick={() => navigate('/app')}>Go to my résumés</button>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Opening a private résumé — decoded on your device, never uploaded.
          </p>
        </div>
      )}
    </div>
  )
}
