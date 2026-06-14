import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, ExternalLink, Trash2, MapPin, DollarSign, GripVertical, X, ArrowLeft } from 'lucide-react'
import type { JobApplication, JobStatus } from '@/types/tracker'
import { JOB_STATUSES } from '@/types/tracker'
import { loadTracker, saveTracker } from '@/lib/storage'
import { uid, debounce, cn, safeHref } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useTitle } from '@/lib/useTitle'

export function Tracker() {
  useTitle('Job Application Tracker · CVAurum')
  const [apps, setApps] = useState<JobApplication[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const saveRef = useRef(debounce((a: JobApplication[]) => saveTracker(a), 500))
  const appsRef = useRef(apps)
  appsRef.current = apps

  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
    loadTracker().then((a) => {
      setApps(a)
      setLoaded(true)
    })
    // Persist any pending change on unmount.
    return () => saveRef.current.flush(appsRef.current)
  }, [])

  const commit = (next: JobApplication[]) => {
    setApps(next)
    saveRef.current(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)
    if (activeIdStr === overIdStr) return
    commit(moveCard(apps, activeIdStr, overIdStr))
  }

  const addCard = (status: JobStatus) => {
    const now = Date.now()
    const card: JobApplication = { id: uid('job'), company: '', role: '', status, createdAt: now, updatedAt: now }
    commit([...apps, card])
    setEditing(card)
  }
  const saveCard = (card: JobApplication) => {
    commit(apps.map((a) => (a.id === card.id ? { ...card, updatedAt: Date.now() } : a)))
    setEditing(null)
  }
  const deleteCard = (id: string) => {
    commit(apps.filter((a) => a.id !== id))
    setEditing(null)
  }

  const activeCard = activeId ? apps.find((a) => a.id === activeId) : null

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link to="/app" className="btn-ghost btn-sm" title="Back to resumes">
          <ArrowLeft className="h-4 w-4" /> Resumes
        </Link>
        <div className="mx-1 h-6 w-px bg-border" />
        <Logo compact />
        <span className="text-sm font-semibold">Job Tracker</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{apps.length} application{apps.length === 1 ? '' : 's'}</span>
          <ThemeToggle />
        </div>
      </header>

      {!loaded ? null : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto p-4">
            {JOB_STATUSES.map((col) => (
              <Column
                key={col.id}
                status={col.id}
                label={col.label}
                color={col.color}
                cards={apps.filter((a) => a.status === col.id)}
                onAdd={() => addCard(col.id)}
                onEdit={setEditing}
              />
            ))}
          </div>
          <DragOverlay>{activeCard ? <Card card={activeCard} overlay /> : null}</DragOverlay>
        </DndContext>
      )}

      {editing && <EditModal card={editing} onSave={saveCard} onDelete={deleteCard} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Column({
  status,
  label,
  color,
  cards,
  onAdd,
  onEdit,
}: {
  status: JobStatus
  label: string
  color: string
  cards: JobApplication[]
  onAdd: () => void
  onEdit: (c: JobApplication) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{cards.length}</span>
        <button className="btn-icon ml-auto h-7 w-7" onClick={onAdd} aria-label={`Add to ${label}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-surface-muted/30'
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onEdit={() => onEdit(c)} />
          ))}
        </SortableContext>
        {cards.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">Drop here or click +</p>}
      </div>
    </div>
  )
}

function SortableCard({ card, onEdit }: { card: JobApplication; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <Card
        card={card}
        onEdit={onEdit}
        handle={{ attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as Record<string, unknown> | undefined }}
      />
    </div>
  )
}

function Card({
  card,
  onEdit,
  handle,
  overlay,
}: {
  card: JobApplication
  onEdit?: () => void
  handle?: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }
  overlay?: boolean
}) {
  return (
    <div className={cn('group rounded-lg border border-border bg-surface p-2.5 shadow-soft', overlay && 'shadow-float')}>
      <div className="flex items-start gap-1.5">
        {handle && (
          <button className="mt-0.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing" {...(handle.attributes as object)} {...(handle.listeners as object)} aria-label="Drag">
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
          <p className="truncate text-sm font-semibold">{card.company || 'Untitled company'}</p>
          <p className="truncate text-xs text-muted-foreground">{card.role || 'Role'}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {card.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{card.location}</span>}
            {card.salary && <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{card.salary}</span>}
          </div>
        </button>
        {safeHref(card.url) && (
          <a href={safeHref(card.url)} target="_blank" rel="noopener noreferrer" className="btn-icon h-6 w-6" onClick={(e) => e.stopPropagation()} title="Open posting">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function EditModal({ card, onSave, onDelete, onClose }: { card: JobApplication; onSave: (c: JobApplication) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(card)
  const set = (k: keyof JobApplication) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-4 shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Application</h2>
          <button className="btn-icon" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <input className="input" value={draft.company} onChange={set('company')} autoFocus />
            </div>
            <div>
              <label className="label">Role</label>
              <input className="input" value={draft.role} onChange={set('role')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <input className="input" value={draft.location ?? ''} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Salary</label>
              <input className="input" value={draft.salary ?? ''} onChange={set('salary')} />
            </div>
          </div>
          <div>
            <label className="label">Posting URL</label>
            <input className="input" value={draft.url ?? ''} onChange={set('url')} placeholder="https://…" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={draft.status} onChange={set('status')}>
              {JOB_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="textarea" value={draft.notes ?? ''} onChange={set('notes')} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button className="btn-ghost text-danger hover:bg-danger/10" onClick={() => onDelete(card.id)}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => onSave(draft)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Move a card to the column/position implied by the drop target. */
function moveCard(apps: JobApplication[], activeId: string, overId: string): JobApplication[] {
  const active = apps.find((a) => a.id === activeId)
  if (!active) return apps
  const rest = apps.filter((a) => a.id !== activeId)

  if (overId.startsWith('col:')) {
    const status = overId.slice(4) as JobStatus
    let lastIdx = -1
    rest.forEach((a, i) => { if (a.status === status) lastIdx = i })
    const updated = { ...active, status, updatedAt: Date.now() }
    rest.splice(lastIdx + 1, 0, updated)
    return rest
  }

  // Insert relative to the over-card, accounting for drag direction so a card
  // can be dropped into the last slot of a column (and downward drops don't
  // land one position too high).
  const activeIndexOrig = apps.findIndex((a) => a.id === activeId)
  const overIndexOrig = apps.findIndex((a) => a.id === overId)
  if (overIndexOrig < 0) return apps
  const overIndexInRest = rest.findIndex((a) => a.id === overId)
  const insertAt = activeIndexOrig < overIndexOrig ? overIndexInRest + 1 : overIndexInRest
  const status = apps[overIndexOrig].status
  const updated = { ...active, status, updatedAt: Date.now() }
  rest.splice(insertAt, 0, updated)
  return rest
}
