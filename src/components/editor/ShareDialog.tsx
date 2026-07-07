/**
 * Share a résumé privately. Two ways, both serverless:
 *  • Private link — rides in the URL fragment (never sent to a server).
 *  • Encrypted file — AES-256-GCM sealed with a passphrase, full fidelity
 *    (images + logos), shareable as a WhatsApp/anywhere attachment.
 * Opens on the `cvaurum:open-share` event (top-bar button / command palette).
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, Copy, Check, Share2, Lock, Download, X, ShieldCheck, MessageCircle } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { buildShareLink, encryptDoc, type ShareLink } from '@/lib/share'
import { resumeFileBase } from '@/lib/utils'

function download(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function ShareDialog({ doc }: { doc: ResumeDocument }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileMsg, setFileMsg] = useState('')

  useEffect(() => {
    const onOpen = () => { setOpen(true); setCopied(false); setFileMsg('') }
    window.addEventListener('cvaurum:open-share', onOpen)
    return () => window.removeEventListener('cvaurum:open-share', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    // Always share the freshest doc from the store.
    const d = useResumeStore.getState().doc ?? doc
    buildShareLink(d, window.location.origin).then(setLink)
  }, [open, doc])

  if (!open) return null
  const base = resumeFileBase(doc.content.basics.name, doc.title)

  const copy = async () => {
    if (!link) return
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  const shareLink = async () => {
    if (!link) return
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> }
    if (nav.share) { try { await nav.share({ title: `${doc.content.basics.name || 'My'} résumé`, text: 'Here is my résumé:', url: link.url }) } catch { /* cancelled */ } }
    else copy()
  }
  const whatsapp = () => {
    if (!link) return
    const text = encodeURIComponent(`Here is my résumé: ${link.url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  const makeFile = async (): Promise<Uint8Array | null> => {
    if (pass.length < 6) { setFileMsg('Use a passphrase of at least 6 characters.'); return null }
    setBusy(true)
    try {
      const d = useResumeStore.getState().doc ?? doc
      return await encryptDoc(d, pass)
    } finally { setBusy(false) }
  }
  const downloadEncrypted = async () => {
    const bytes = await makeFile()
    if (bytes) { download(bytes, `${base}.cvaurum`); setFileMsg('Encrypted file downloaded. Share the passphrase separately.') }
  }
  const shareEncrypted = async () => {
    const bytes = await makeFile()
    if (!bytes) return
    const file = new File([bytes as unknown as BlobPart], `${base}.cvaurum`, { type: 'application/octet-stream' })
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void>; canShare?: (d: unknown) => boolean }
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try { await nav.share({ files: [file], title: `${base}.cvaurum`, text: 'Encrypted résumé (passphrase shared separately)' }); setFileMsg('Shared. Send the passphrase separately.') } catch { /* cancelled */ }
    } else { download(bytes, `${base}.cvaurum`); setFileMsg('This browser can’t share files directly — downloaded instead.') }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2 text-base font-semibold"><Share2 className="h-4 w-4 text-primary" /> Share privately</div>
          <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-emerald-500/10 p-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Nothing is uploaded. A link travels inside the URL itself; a file is encrypted on your device. CVAurum never sees your résumé.
          </p>

          {/* Private link */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-primary" /> Private link</div>
            <p className="mb-2 text-xs text-muted-foreground">
              Anyone with the link can open it — great for a quick send. {link?.strippedImages && <span className="text-warning">Photos/logos were removed to keep the link short; use the encrypted file below to include them.</span>}
            </p>
            <div className="flex items-center gap-1.5">
              <input readOnly value={link?.url ?? 'Preparing…'} className="input h-9 flex-1 text-xs" onFocus={(e) => e.target.select()} />
              <button className="btn-outline btn-sm shrink-0" onClick={copy} disabled={!link}>{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={shareLink} disabled={!link}><Share2 className="h-3.5 w-3.5" /> Share…</button>
              <button className="btn-outline btn-sm" onClick={whatsapp} disabled={!link}><MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp</button>
            </div>
          </div>

          <div className="my-4 border-t border-border" />

          {/* Encrypted file */}
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-primary" /> Encrypted file <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">AES-256</span></div>
            <p className="mb-2 text-xs text-muted-foreground">Full fidelity, including images. Sealed with your passphrase — uncrackable without it. Share the file over WhatsApp/email; send the passphrase through a different channel.</p>
            <input
              type="text"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setFileMsg('') }}
              placeholder="Choose a passphrase (min 6 chars)"
              className="input h-9 w-full text-sm"
              autoComplete="off"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={downloadEncrypted} disabled={busy}><Download className="h-3.5 w-3.5" /> Download .cvaurum</button>
              <button className="btn-outline btn-sm" onClick={shareEncrypted} disabled={busy}><Share2 className="h-3.5 w-3.5" /> Share file…</button>
            </div>
            {fileMsg && <p className="mt-2 text-xs text-muted-foreground">{fileMsg}</p>}
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">The recipient opens it in CVAurum (Open file → enter passphrase). It never leaves their device either.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
