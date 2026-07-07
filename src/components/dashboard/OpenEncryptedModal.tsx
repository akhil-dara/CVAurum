/**
 * Opens an encrypted .cvaurum share file. Listens for `cvaurum:open-encrypted`
 * (dispatched with the file bytes when an encrypted file is selected), asks for
 * the passphrase, decrypts on-device, and saves it as a new local résumé.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Lock, X, ShieldCheck } from 'lucide-react'
import { decryptDoc } from '@/lib/share'
import { ResumeDocumentSchema } from '@/types/document'
import { sanitizeImportedImage } from '@/lib/io'
import { saveDoc } from '@/lib/storage'
import { useAppStore } from '@/store/useAppStore'
import { uid } from '@/lib/utils'

export function OpenEncryptedModal() {
  const navigate = useNavigate()
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail as Uint8Array
      setBytes(d)
      setPass('')
      setErr('')
    }
    window.addEventListener('cvaurum:open-encrypted', onOpen as EventListener)
    return () => window.removeEventListener('cvaurum:open-encrypted', onOpen as EventListener)
  }, [])

  if (!bytes) return null
  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const raw = await decryptDoc(bytes, pass)
      const parsed = ResumeDocumentSchema.safeParse(raw)
      if (!parsed.success) throw new Error('This file is not a valid résumé.')
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
      setBytes(null)
      useAppStore.getState().toast('Decrypted and saved on this device.', 'success')
      navigate(`/resume/${doc.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open the file.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBytes(null)} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2 text-base font-semibold"><Lock className="h-4 w-4 text-primary" /> Encrypted résumé</div>
          <button className="btn-icon" onClick={() => setBytes(null)} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <p className="mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Enter the passphrase the sender gave you. Decryption happens here — the file is never uploaded.
          </p>
          <input
            type="text"
            value={pass}
            autoFocus
            onChange={(e) => { setPass(e.target.value); setErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter' && pass) submit() }}
            placeholder="Passphrase"
            className="input h-9 w-full text-sm"
            autoComplete="off"
          />
          {err && <p className="mt-2 text-xs text-danger">{err}</p>}
          <button className="btn-primary btn-sm mt-3 w-full" onClick={submit} disabled={busy || !pass}>{busy ? 'Decrypting…' : 'Open résumé'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
