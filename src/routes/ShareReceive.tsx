/**
 * Receives a secure share LINK (/r#<payload>). The résumé rides entirely in the
 * URL fragment, which the browser never sends to a server. Encrypted links ask
 * for the passphrase and decrypt on-device; the result is saved as a new local
 * résumé. Nothing is ever uploaded.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, AlertTriangle, Lock } from 'lucide-react'
import { decodeShare, isEncryptedPayload } from '@/lib/share'
import { ResumeDocumentSchema } from '@/types/document'
import { sanitizeImportedImage } from '@/lib/io'
import { saveDoc } from '@/lib/storage'
import { useAppStore } from '@/store/useAppStore'
import { uid } from '@/lib/utils'

export function ShareReceive() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'passphrase' | 'error'>('loading')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const payloadRef = useRef('')

  const openDoc = async (payload: string, passphrase?: string) => {
    const raw = await decodeShare(payload, passphrase)
    const parsed = ResumeDocumentSchema.safeParse(raw)
    if (!parsed.success) throw new Error('This link is not a valid résumé.')
    const doc = parsed.data
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
    useAppStore.getState().toast('Shared résumé opened — saved on this device.', 'success')
    navigate(`/resume/${doc.id}`, { replace: true })
  }

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    document.getElementById('boot-splash')?.remove()
    const payload = window.location.hash.replace(/^#/, '')
    payloadRef.current = payload
    if (!payload) {
      setError('This share link is empty.')
      setPhase('error')
      return
    }
    if (isEncryptedPayload(payload)) {
      setPhase('passphrase')
      return
    }
    openDoc(payload).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not open this link.')
      setPhase('error')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await openDoc(payloadRef.current, pass)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this link.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
      {phase === 'passphrase' ? (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-float">
          <div className="mb-1 flex items-center gap-2 text-base font-semibold"><Lock className="h-4 w-4 text-primary" /> Encrypted résumé</div>
          <p className="mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Enter the passphrase the sender gave you. It’s decrypted here on your device — never uploaded.
          </p>
          <input
            type="text"
            value={pass}
            autoFocus
            onChange={(e) => { setPass(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter' && pass) submit() }}
            placeholder="Passphrase"
            className="input h-9 w-full font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <button className="btn-primary btn-sm mt-3 w-full" onClick={submit} disabled={busy || !pass}>{busy ? 'Decrypting…' : 'Open résumé'}</button>
        </div>
      ) : phase === 'error' ? (
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-3 text-sm font-medium">{error}</p>
          <button className="btn-primary btn-sm mt-4" onClick={() => navigate('/app')}>Go to my résumés</button>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Opening a private résumé — on your device, never uploaded.
          </p>
        </div>
      )}
    </div>
  )
}
