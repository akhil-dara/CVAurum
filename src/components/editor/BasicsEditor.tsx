import { useState } from 'react'
import { Plus, Trash2, Camera, ImagePlus, X } from 'lucide-react'
import { useResumeStore } from '@/store/useResumeStore'
import { uid } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'
import { TextField, Row, Labeled } from './fields/Inputs'
import { CONTACT_ICON_CHOICES } from '@/templates/_shared/atoms'
import { ImageCropper } from './ImageCropper'

export function BasicsEditor({ doc }: { doc: ResumeDocument }) {
  const update = useResumeStore((s) => s.updateContent)
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const b = doc.content.basics
  const showPhoto = doc.metadata.layout.showPhoto
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // Picking a file opens the cropper; saving the crop sets the image + shows it.
  const onPhoto = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onCropSave = (url: string) => {
    updateDoc((d) => {
      d.content.basics.image = url
      d.metadata.layout.showPhoto = true
    })
    setCropSrc(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div>
          <PhotoPicker
            image={b.image}
            onPick={onPhoto}
            onClear={() =>
              update((c) => {
                c.basics.image = ''
              })
            }
          />
          {b.image && (
            <button
              type="button"
              className="mt-1 block w-full text-center text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() =>
                updateDoc((d) => {
                  d.metadata.layout.showPhoto = !d.metadata.layout.showPhoto
                })
              }
            >
              {showPhoto ? 'Hide on resume' : 'Show on resume'}
            </button>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <TextField
            label="Full name"
            value={b.name}
            onChange={(v) =>
              update((c) => {
                c.basics.name = v
              })
            }
            placeholder="Alex Morgan"
          />
          <TextField
            label="Headline / title"
            value={b.label ?? ''}
            onChange={(v) =>
              update((c) => {
                c.basics.label = v
              })
            }
            placeholder="Senior Software Engineer"
          />
        </div>
      </div>

      <Row>
        <TextField
          label="Email"
          value={b.email ?? ''}
          onChange={(v) =>
            update((c) => {
              c.basics.email = v
            })
          }
          placeholder="you@email.com"
        />
        <TextField
          label="Phone"
          value={b.phone ?? ''}
          onChange={(v) =>
            update((c) => {
              c.basics.phone = v
            })
          }
          placeholder="(555) 123-4567"
        />
      </Row>
      <Row>
        <TextField
          label="City"
          value={b.location?.city ?? ''}
          onChange={(v) =>
            update((c) => {
              c.basics.location = { ...c.basics.location, city: v }
            })
          }
          placeholder="San Francisco"
        />
        <TextField
          label="Region / State"
          value={b.location?.region ?? ''}
          onChange={(v) =>
            update((c) => {
              c.basics.location = { ...c.basics.location, region: v }
            })
          }
          placeholder="CA"
        />
      </Row>
      <TextField
        label="Website"
        value={b.url ?? ''}
        onChange={(v) =>
          update((c) => {
            c.basics.url = v
          })
        }
        placeholder="https://yoursite.com"
      />
      <div>
        <label className="label">Website icon</label>
        <select
          className="input w-full"
          value={b.urlIcon ?? ''}
          aria-label="Website icon"
          onChange={(e) =>
            update((c) => {
              c.basics.urlIcon = e.target.value
            })
          }
        >
          {CONTACT_ICON_CHOICES.map((o) => (
            <option key={o.v || 'auto'} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <TextField
        label="Website shown as"
        value={b.urlLabel ?? ''}
        onChange={(v) =>
          update((c) => {
            c.basics.urlLabel = v
          })
        }
        placeholder="Leave empty to show the address"
      />

      <Profiles doc={doc} />

      {cropSrc && <ImageCropper src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </div>
  )
}

function PhotoPicker({ image, onPick, onClear }: { image?: string; onPick: (f?: File) => void; onClear: () => void }) {
  return (
    <div className="relative shrink-0">
      <label
        className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-input bg-muted text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        title="Upload a profile photo"
      >
        {image ? (
          <>
            <img src={image} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-all group-hover:bg-black/45 group-hover:text-white">
              <Camera className="h-5 w-5" />
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px] font-medium">Add photo</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
      {image && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow ring-2 ring-surface"
          aria-label="Remove photo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

const COMMON_NETWORKS = [
  'LinkedIn',
  'GitHub',
  'Portfolio',
  'Twitter',
  'X',
  'Dribbble',
  'Behance',
  'Medium',
  'Dev.to',
  'Stack Overflow',
  'GitLab',
  'YouTube',
  'Instagram',
  'Google Scholar',
  'ORCID',
]

function Profiles({ doc }: { doc: ResumeDocument }) {
  const update = useResumeStore((s) => s.updateContent)
  const profiles = doc.content.basics.profiles ?? []
  return (
    <Labeled label="Profiles & links">
      {/* The canvas has a richer icon picker, but a phone never shows the
          canvas in edit mode - it edits through this panel - so the choice has
          to exist here too or it does not exist for those readers at all. */}
      <datalist id="rm-networks">
        {COMMON_NETWORKS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="space-y-2">
        {profiles.map((p, i) => (
          <div key={p.id ?? i} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                className="input w-28"
                list="rm-networks"
                value={p.network}
                placeholder="LinkedIn"
                title="Pick a network or type your own"
                onChange={(e) =>
                  update((c) => {
                    c.basics.profiles![i].network = e.target.value
                  })
                }
              />
              <select
                className="input w-24 shrink-0"
                value={p.icon ?? ''}
                title="Icon shown beside this link"
                aria-label="Icon"
                onChange={(e) =>
                  update((c) => {
                    c.basics.profiles![i].icon = e.target.value
                  })
                }
              >
                {CONTACT_ICON_CHOICES.map((o) => (
                  <option key={o.v || 'auto'} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground/60 hover:bg-danger/10 hover:text-danger"
                onClick={() =>
                  update((c) => {
                    c.basics.profiles = profiles.filter((_, j) => j !== i)
                  })
                }
                aria-label="Remove profile"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {/* Adding the icon chooser to the row above squeezed this one until
                its own placeholder read "Shown" - the same crowding that had
                made the address unreadable. Three short controls share the top
                row; the two long values each get a line. */}
            {/* The same two words the link card uses - Shown as, Goes to - so
                the panel and the popover describe a link in one vocabulary.
                Bare placeholder-only inputs here read as mystery fields. */}
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Shown as</span>
              <input
                className="input w-full"
                value={p.label ?? ''}
                placeholder="Leave empty to show the address"
                onChange={(e) =>
                  update((c) => {
                    c.basics.profiles![i].label = e.target.value
                  })
                }
              />
            </label>
            {/* The ADDRESS gets a line to itself. It is far the longest value
                here, and sharing a row with the other two left it about three
                characters wide - unreadable, and reported as such. The two
                SHORT values pair off above it instead. */}
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Goes to</span>
              <input
                className="input w-full"
                value={p.url || p.username}
                placeholder="https://linkedin.com/in/yourname"
                onChange={(e) =>
                  update((c) => {
                    const val = e.target.value
                    if (/^https?:\/\//.test(val)) c.basics.profiles![i].url = val
                    else c.basics.profiles![i].username = val
                  })
                }
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost btn-sm text-primary hover:bg-primary/10"
          onClick={() =>
            update((c) => {
              c.basics.profiles = [...profiles, { id: uid(), network: '', username: '', url: '' }]
            })
          }
        >
          <Plus className="h-4 w-4" /> Add profile
        </button>
      </div>
    </Labeled>
  )
}
