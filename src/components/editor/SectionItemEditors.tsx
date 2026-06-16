import { useState } from 'react'
import { GripVertical, Trash2, Plus, ChevronDown } from 'lucide-react'
import { useResumeStore } from '@/store/useResumeStore'
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { cn } from '@/lib/utils'
import { newItem, ADD_LABEL } from '@/lib/sections'
import { SortableList } from './SortableList'
import { TextField, TextAreaField, DateField, TagInput, RatingField, Row, Labeled } from './fields/Inputs'
import { RichTextEditor } from './fields/RichTextEditor'
import { BulletsEditor } from './fields/BulletsEditor'

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyItem = Record<string, any>

/** Common language fluency levels (CEFR-ish), offered as a dropdown. */
const FLUENCY_LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Intermediate', 'Basic']

function itemTitle(sectionKey: string, it: AnyItem): string {
  switch (sectionKey) {
    case 'work':
      return it.position || it.name || 'New experience'
    case 'education':
      return [it.studyType, it.area].filter(Boolean).join(' ') || it.institution || 'New education'
    case 'projects':
      return it.name || 'New project'
    case 'skills':
      return it.name || 'New skill group'
    case 'languages':
      return it.language || 'New language'
    case 'certificates':
      return it.name || 'New certificate'
    case 'awards':
      return it.title || 'New award'
    case 'publications':
      return it.name || 'New publication'
    case 'volunteer':
      return it.position || it.organization || 'New role'
    case 'interests':
      return it.name || 'New interest'
    case 'references':
      return it.name || 'New reference'
    default:
      return it.name || 'New entry'
  }
}

function itemSubtitle(sectionKey: string, it: AnyItem): string {
  switch (sectionKey) {
    case 'work':
      return it.name
    case 'education':
      return it.institution
    case 'volunteer':
      return it.organization
    case 'certificates':
      return it.issuer
    case 'awards':
      return it.awarder
    default:
      return ''
  }
}

/** Returns the live items array for a section key (standard or custom). */
function getItems(content: ResumeContent, sectionKey: string): AnyItem[] {
  if (sectionKey.startsWith('custom-')) {
    const id = sectionKey.slice('custom-'.length)
    return content.custom.find((c) => c.id === id)?.items ?? []
  }
  return (content as any)[sectionKey] ?? []
}

export function SectionItemsEditor({ doc, sectionKey }: { doc: ResumeDocument; sectionKey: string }) {
  const update = useResumeStore((s) => s.updateContent)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (sectionKey === 'summary') return <SummaryEditor doc={doc} />

  const isCustom = sectionKey.startsWith('custom-')
  const customId = isCustom ? sectionKey.slice('custom-'.length) : null
  const items = getItems(doc.content, sectionKey)

  const mutate = (fn: (list: AnyItem[]) => void) =>
    update((c) => {
      const list = isCustom ? c.custom.find((x) => x.id === customId)?.items : (c as any)[sectionKey]
      if (list) fn(list as AnyItem[])
    })

  const patchById = (id: string, fn: (it: AnyItem) => void) =>
    mutate((list) => {
      const it = list.find((x) => x.id === id)
      if (it) fn(it)
    })
  const removeById = (id: string) =>
    mutate((list) => {
      const idx = list.findIndex((x) => x.id === id)
      if (idx >= 0) list.splice(idx, 1)
    })
  const reorder = (order: string[]) =>
    mutate((list) => {
      const byId = new Map(list.map((x) => [x.id, x]))
      const next = order.map((id) => byId.get(id)).filter(Boolean) as AnyItem[]
      list.length = 0
      list.push(...next)
    })
  const add = () => {
    const it = newItem(sectionKey)
    mutate((list) => list.push(it))
    setExpanded((s) => new Set(s).add(it.id))
  }

  const ids = items.map((it) => it.id as string)

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <SortableList
          ids={ids}
          onReorder={reorder}
          className="space-y-2"
          renderItem={(id, h) => {
            const it = items.find((x) => x.id === id)
            if (!it) return null
            const open = expanded.has(id)
            return (
              <div className="rounded-lg border border-border bg-surface-muted/40">
                <div className="flex items-center gap-1 px-1.5 py-1.5">
                  <button
                    type="button"
                    className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                    {...h.attributes}
                    {...h.listeners}
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted/50"
                    onClick={() =>
                      setExpanded((s) => {
                        const n = new Set(s)
                        n.has(id) ? n.delete(id) : n.add(id)
                        return n
                      })
                    }
                  >
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{itemTitle(sectionKey, it)}</span>
                      {itemSubtitle(sectionKey, it) && (
                        <span className="block truncate text-xs text-muted-foreground">{itemSubtitle(sectionKey, it)}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 hover:bg-danger/10 hover:text-danger"
                    onClick={() => removeById(id)}
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {open && (
                  <div className="space-y-3 border-t border-border p-3">
                    <ItemFields sectionKey={sectionKey} item={it} patch={(fn) => patchById(id, fn)} />
                  </div>
                )}
              </div>
            )
          }}
        />
      )}
      <button type="button" className="btn-outline btn-sm w-full" onClick={add}>
        <Plus className="h-4 w-4" /> Add {ADD_LABEL[sectionKey] ?? 'item'}
      </button>
    </div>
  )
}

function SummaryEditor({ doc }: { doc: ResumeDocument }) {
  const update = useResumeStore((s) => s.updateContent)
  return (
    <RichTextEditor
      value={doc.content.basics.summary ?? ''}
      onChange={(v) => update((c) => { c.basics.summary = v })}
      placeholder="2–3 punchy lines: who you are, your strongest skills, and the impact you bring…"
      minHeight={110}
    />
  )
}

function ItemFields({ sectionKey, item, patch }: { sectionKey: string; item: AnyItem; patch: (fn: (it: AnyItem) => void) => void }) {
  const set = (key: string) => (v: any) => patch((it) => { it[key] = v })

  switch (sectionKey) {
    case 'work':
      return (
        <>
          <Row>
            <TextField label="Job title" value={item.position} onChange={set('position')} placeholder="Senior Engineer" />
            <TextField label="Company" value={item.name} onChange={set('name')} placeholder="Vertex Labs" />
          </Row>
          <Row>
            <TextField label="Location" value={item.location} onChange={set('location')} placeholder="San Francisco, CA" />
            <div className="grid grid-cols-2 gap-2">
              <DateField label="Start" value={item.startDate} onChange={set('startDate')} />
              <DateField label="End" value={item.endDate} onChange={set('endDate')} allowPresent />
            </div>
          </Row>
          <BulletsEditor label="Achievements" items={item.highlights ?? []} onChange={set('highlights')} />
        </>
      )
    case 'education':
      return (
        <>
          <TextField label="Institution" value={item.institution} onChange={set('institution')} placeholder="UC Berkeley" />
          <Row>
            <TextField label="Degree" value={item.studyType} onChange={set('studyType')} placeholder="B.S." />
            <TextField label="Field of study" value={item.area} onChange={set('area')} placeholder="Computer Science" />
          </Row>
          <Row>
            <DateField label="Start" value={item.startDate} onChange={set('startDate')} />
            <DateField label="End" value={item.endDate} onChange={set('endDate')} allowPresent />
          </Row>
          <Row>
            <TextField label="Location" value={item.location} onChange={set('location')} placeholder="Berkeley, CA" />
            <TextField label="Grade / GPA" value={item.score} onChange={set('score')} placeholder="3.8 GPA" />
          </Row>
          <TagInput label="Relevant courses" value={item.courses ?? []} onChange={set('courses')} />
        </>
      )
    case 'projects':
      return (
        <>
          <TextField label="Project name" value={item.name} onChange={set('name')} placeholder="Pulse — Observability" />
          <TextField label="Link" value={item.url} onChange={set('url')} placeholder="https://github.com/…" />
          <Row>
            <DateField label="Start" value={item.startDate} onChange={set('startDate')} />
            <DateField label="End" value={item.endDate} onChange={set('endDate')} allowPresent />
          </Row>
          <TextField label="One-line description" value={item.description} onChange={set('description')} placeholder="What is it?" />
          <BulletsEditor label="Highlights" items={item.highlights ?? []} onChange={set('highlights')} />
          <TagInput label="Tech / keywords" value={item.keywords ?? []} onChange={set('keywords')} />
        </>
      )
    case 'skills':
      return (
        <>
          <TextField label="Category" value={item.name} onChange={set('name')} placeholder="Languages, Frontend, Cloud…" />
          <TagInput label="Skills" value={item.keywords ?? []} onChange={set('keywords')} placeholder="Add a skill and press Enter" />
          <RatingField label="Proficiency (optional, shows a meter)" value={item.rating} onChange={(v) => patch((it) => { it.rating = v || undefined })} />
        </>
      )
    case 'languages':
      return (
        <>
          <Row>
            <TextField label="Language" value={item.language} onChange={set('language')} placeholder="Spanish" />
            <Labeled label="Fluency">
              <select className="input" value={item.fluency || ''} onChange={(e) => set('fluency')(e.target.value)}>
                <option value="">Select level…</option>
                {FLUENCY_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
                {item.fluency && !FLUENCY_LEVELS.includes(item.fluency) && <option value={item.fluency}>{item.fluency}</option>}
              </select>
            </Labeled>
          </Row>
          <RatingField label="Level (optional)" value={item.rating} onChange={(v) => patch((it) => { it.rating = v || undefined })} />
        </>
      )
    case 'certificates':
      return (
        <>
          <TextField label="Certificate" value={item.name} onChange={set('name')} placeholder="AWS Solutions Architect" />
          <Row>
            <TextField label="Issuer" value={item.issuer} onChange={set('issuer')} placeholder="Amazon Web Services" />
            <DateField label="Date" value={item.date} onChange={set('date')} />
          </Row>
          <TextField label="Link" value={item.url} onChange={set('url')} placeholder="https://…" />
        </>
      )
    case 'awards':
      return (
        <>
          <TextField label="Award" value={item.title} onChange={set('title')} placeholder="Engineering Excellence Award" />
          <Row>
            <TextField label="Awarder" value={item.awarder} onChange={set('awarder')} placeholder="Vertex Labs" />
            <DateField label="Date" value={item.date} onChange={set('date')} />
          </Row>
          <Labeled label="Summary">
            <RichTextEditor value={item.summary ?? ''} onChange={set('summary')} minHeight={48} placeholder="Why you earned it…" />
          </Labeled>
        </>
      )
    case 'publications':
      return (
        <>
          <TextField label="Title" value={item.name} onChange={set('name')} />
          <Row>
            <TextField label="Publisher" value={item.publisher} onChange={set('publisher')} />
            <DateField label="Date" value={item.releaseDate} onChange={set('releaseDate')} />
          </Row>
          <TextField label="Link" value={item.url} onChange={set('url')} placeholder="https://…" />
          <Labeled label="Summary">
            <RichTextEditor value={item.summary ?? ''} onChange={set('summary')} minHeight={48} />
          </Labeled>
        </>
      )
    case 'volunteer':
      return (
        <>
          <Row>
            <TextField label="Role" value={item.position} onChange={set('position')} />
            <TextField label="Organization" value={item.organization} onChange={set('organization')} />
          </Row>
          <Row>
            <DateField label="Start" value={item.startDate} onChange={set('startDate')} />
            <DateField label="End" value={item.endDate} onChange={set('endDate')} allowPresent />
          </Row>
          <Labeled label="Summary">
            <RichTextEditor value={item.summary ?? ''} onChange={set('summary')} minHeight={48} />
          </Labeled>
          <BulletsEditor label="Highlights" items={item.highlights ?? []} onChange={set('highlights')} />
        </>
      )
    case 'interests':
      return (
        <>
          <TextField label="Interest" value={item.name} onChange={set('name')} placeholder="Open Source" />
          <TagInput label="Keywords" value={item.keywords ?? []} onChange={set('keywords')} />
        </>
      )
    case 'references':
      return (
        <>
          <TextField label="Name" value={item.name} onChange={set('name')} placeholder="Jane Doe — Manager at …" />
          <TextAreaField label="Reference" value={item.reference} onChange={set('reference')} placeholder="“Alex is…”  or  Available on request" />
        </>
      )
    default:
      // custom
      return (
        <>
          <Row>
            <TextField label="Title" value={item.name} onChange={set('name')} />
            <TextField label="Subtitle" value={item.subtitle} onChange={set('subtitle')} />
          </Row>
          <Row>
            <DateField label="Date" value={item.date} onChange={set('date')} />
            <TextField label="Location" value={item.location} onChange={set('location')} />
          </Row>
          <TextField label="Link" value={item.url} onChange={set('url')} placeholder="https://…" />
          <Labeled label="Description">
            <RichTextEditor value={item.summary ?? ''} onChange={set('summary')} minHeight={48} />
          </Labeled>
          <BulletsEditor label="Bullets" items={item.highlights ?? []} onChange={set('highlights')} />
        </>
      )
  }
}
