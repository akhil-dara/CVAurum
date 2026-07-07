/**
 * Share a résumé as a SECURE link. The résumé rides inside the URL #fragment
 * (never sent to a server) and is ALWAYS AES-256-GCM encrypted — the passphrase
 * is never in the link, so even a cached/logged link is unreadable without it.
 * Opens on the `cvaurum:open-share` event.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, Copy, Check, Share2, X, ShieldCheck, MessageCircle, RefreshCw, Lock } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { buildShareLink, generatePassphrase, passphraseStrength, type ShareLink } from '@/lib/share'

const STRENGTH_COLOR = ['bg-muted', 'bg-danger', 'bg-warning', 'bg-emerald-500', 'bg-emerald-600']

export function ShareDialog({ doc }: { doc: ResumeDocument }) {
  const [open, setOpen] = useState(false)
  const [pass, setPass] = useState('')
  const [link, setLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [passCopied, setPassCopied] = useState(false)
  const [building, setBuilding] = useState(false)

  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      setCopied(false)
      setPassCopied(false)
      setLink(null)
      // Start from a strong generated passphrase; the user can replace it.
      setPass(generatePassphrase())
    }
    window.addEventListener('cvaurum:open-share', onOpen)
    return () => window.removeEventListener('cvaurum:open-share', onOpen)
  }, [])

  const strength = useMemo(() => passphraseStrength(pass), [pass])
  if (!open) return null

  const create = async () => {
    setBuilding(true)
    setCopied(false)
    try {
      const d = useResumeStore.getState().doc ?? doc
      setLink(await buildShareLink(d, window.location.origin, pass))
    } finally {
      setBuilding(false)
    }
  }
  const copyLink = async () => {
    if (!link) return
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ }
  }
  const copyPass = async () => {
    try { await navigator.clipboard.writeText(pass); setPassCopied(true); setTimeout(() => setPassCopied(false), 1500) } catch { /* blocked */ }
  }
  const nativeShare = async () => {
    if (!link) return
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> }
    if (nav.share) { try { await nav.share({ title: `${doc.content.basics.name || 'My'} résumé`, text: 'Here is my résumé (password-protected — I’ll send the passphrase separately):', url: link.url }) } catch { /* cancelled */ } }
    else copyLink()
  }
  const whatsapp = () => {
    if (!link) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`My résumé (password-protected): ${link.url}`)}`, '_blank', 'noopener')
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2 text-base font-semibold"><Lock className="h-4 w-4 text-primary" /> Share an encrypted link</div>
          <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[74vh] overflow-y-auto p-5">
          <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-emerald-500/10 p-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Your résumé is AES-256 encrypted <em>inside</em> the link and never uploaded. The passphrase is never in the link — so even if the link is cached or logged anywhere, it can’t be opened without it.
          </p>

          {/* passphrase */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passphrase</div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setLink(null) }}
              placeholder="8+ characters"
              className="input h-9 flex-1 font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn-outline btn-sm shrink-0" title="Generate a strong passphrase" onClick={() => { setPass(generatePassphrase()); setLink(null) }}><RefreshCw className="h-3.5 w-3.5" /></button>
            <button className="btn-outline btn-sm shrink-0" title="Copy passphrase" onClick={copyPass}>{passCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={`h-full transition-all ${STRENGTH_COLOR[strength.score]}`} style={{ width: `${strength.score * 25}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground">{strength.label}</span>
          </div>

          {!link ? (
            <button className="btn-primary btn-sm mt-4 w-full" onClick={create} disabled={pass.length < 8 || building}>
              {building ? 'Encrypting…' : 'Create encrypted link'}
            </button>
          ) : (
            <>
              <div className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encrypted link</div>
              <div className="flex items-center gap-1.5">
                <input readOnly value={link.url} className="input h-9 flex-1 text-xs" onFocus={(e) => e.target.select()} />
                <button className="btn-outline btn-sm shrink-0" onClick={copyLink}>{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <Link2 className="mr-1 inline h-3 w-3" />{(link.bytes / 1024).toFixed(1)} KB{link.strippedImages ? ' · photos/logos omitted to keep it short (JSON export keeps them, for trusted people)' : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" onClick={nativeShare}><Share2 className="h-3.5 w-3.5" /> Share…</button>
                <button className="btn-outline btn-sm" onClick={whatsapp}><MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp</button>
              </div>
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-primary/5 p-2.5 text-xs leading-relaxed text-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Send the passphrase through a <strong>different</strong> channel than the link (say it in person, or use another app). Never put both in the same message.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
