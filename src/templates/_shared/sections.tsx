/**
 * Section renderers shared by every template. Each section returns its BODY;
 * the <Artboard> engine wraps it with the section heading. When an `edit`
 * function is supplied (editable preview), text fields render as inline-editable
 * (<Ed>) and write straight back to the store; otherwise they render plain so
 * print/thumbnail stay clean.
 */
import { useEffect, useRef, type ReactNode, type FocusEvent } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { TemplateConfig } from '@/types/template'
import { formatDateRange, formatDate, htmlToText, safeHref } from '@/lib/utils'
import { pushNewItem, ADD_LABEL } from '@/lib/sections'
import { Chips, Dots, LevelBar, Stars, RichText, prettyUrl } from './atoms'
import { Ed, type EditFn } from './Editable'
import { CanvasDate } from './CanvasDate'

const has = (s?: string) => !!s && htmlToText(s).length > 0

/** Per-section visibility overrides (undefined = shown). */
export type SecOpts = { showBullets?: boolean; showDates?: boolean; showLocation?: boolean; showSummary?: boolean; showKeywords?: boolean }
const show = (v?: boolean) => v !== false

type Apply = (c: ResumeDocument['content'], v: string) => void
/** A date range that's click-to-edit on the canvas (and plain text in print). */
function rangeDate(edit: EditFn | undefined, visible: boolean, start: string, end: string, applyStart: Apply, applyEnd: Apply): ReactNode {
  if (!visible) return undefined
  if (!edit) return formatDateRange(start, end) || undefined
  return <CanvasDate edit={edit} range start={start} end={end} applyStart={applyStart} applyEnd={applyEnd} />
}
/** A single date that's click-to-edit on the canvas. */
function singleDate(edit: EditFn | undefined, visible: boolean, date: string, applyDate: Apply): ReactNode {
  if (!visible) return undefined
  if (!edit) return date ? formatDate(date) : undefined
  return <CanvasDate edit={edit} start={date} applyStart={applyDate} />
}

type ProfStyle = 'dots' | 'bars' | 'stars' | 'text' | 'none'

/** Render a 0–5 rating as the chosen meter (only for meter styles). */
function Proficiency({ rating, style }: { rating?: number; style: ProfStyle }) {
  if (rating == null) return null
  if (style === 'stars') return <Stars value={rating} />
  if (style === 'bars') return <LevelBar value={rating} />
  return <Dots value={rating} />
}

function Bullets({
  items,
  edit,
  setItem,
  onAdd,
  onRemove,
  onInsertAfter,
  onPruneEmpty,
}: {
  items: string[]
  edit?: EditFn
  setItem?: (c: ResumeDocument['content'], bi: number, v: string) => void
  onAdd?: () => void
  onRemove?: (bi: number) => void
  onInsertAfter?: (bi: number) => void
  onPruneEmpty?: () => void
}) {
  const ulRef = useRef<HTMLUListElement>(null)
  const pendingFocus = useRef<number | null>(null)
  const deleting = useRef(false)
  useEffect(() => {
    if (pendingFocus.current == null || !ulRef.current) return
    const eds = ulRef.current.querySelectorAll<HTMLElement>('.rm-bullet-row .rm-editable')
    eds[pendingFocus.current]?.focus()
    pendingFocus.current = null
  })

  // When focus leaves the whole list, drop any blank bullets the user added but
  // never filled — otherwise they linger as empty rows on the canvas yet vanish
  // from the printed resume (breaking WYSIWYG). Skipped mid-delete so it can't
  // re-index a splice that's already in flight.
  const onListBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!onPruneEmpty || deleting.current) return
    const next = e.relatedTarget as Node | null
    if (next && ulRef.current?.contains(next)) return
    if (items.some((h) => htmlToText(h).trim().length === 0)) onPruneEmpty()
  }

  const visible = items.filter((h) => htmlToText(h).length > 0)
  if (!edit && !visible.length) return null
  if (!edit) {
    return (
      <ul className="rm-bullets">
        {visible.map((h, i) => (
          <li key={i}>
            <RichText html={h} />
          </li>
        ))}
      </ul>
    )
  }
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()
  return (
    <ul className="rm-bullets rm-bullets-edit" ref={ulRef} onBlur={onListBlur}>
      {items.map((h, bi) => (
        <li key={bi} className="rm-bullet-row">
          <Ed
            edit={edit}
            value={h}
            rich
            onEnter={onInsertAfter ? () => { pendingFocus.current = bi + 1; onInsertAfter(bi) } : undefined}
            apply={(c, v) => setItem?.(c, bi, v)}
            placeholder="Describe an achievement, ideally with a metric…"
          />
          {onRemove && (
            <button
              type="button"
              className="rm-bullet-del no-print"
              contentEditable={false}
              onMouseDown={stop}
              onClick={() => {
                // Blur the focused bullet first: otherwise React keeps the focused
                // (index-keyed) editable's stale DOM text after the splice, so a
                // DIFFERENT bullet appears to vanish. The `deleting` guard stops the
                // resulting list-blur from also pruning (which would re-index `bi`).
                deleting.current = true
                ;(document.activeElement as HTMLElement | null)?.blur()
                onRemove(bi)
                deleting.current = false
              }}
              aria-label="Remove bullet"
              title="Remove bullet"
            >
              ×
            </button>
          )}
        </li>
      ))}
      {onAdd && (
        <li className="rm-bullet-addrow no-print" contentEditable={false}>
          <button
            type="button"
            className="rm-add-btn"
            onMouseDown={stop}
            onClick={() => { pendingFocus.current = items.length; onAdd() }}
            title="Add a bullet"
          >
            + bullet
          </button>
        </li>
      )}
    </ul>
  )
}

function ItemHead({ title, date }: { title: ReactNode; date?: ReactNode }) {
  return (
    <div className="rm-item-head">
      <div className="rm-item-title">{title}</div>
      {date ? <div className="rm-item-date">{date}</div> : null}
    </div>
  )
}

/**
 * Inline-editable keyword chips on the canvas (skills, etc.). Mirrors Bullets:
 * each chip is editable text + an × to remove, with a "+" to add, blank chips
 * pruned when focus leaves. Without `edit` it renders plain, print-clean chips.
 */
function EditableChips({
  items,
  edit,
  setItem,
  onAdd,
  onRemove,
  onPruneEmpty,
  addLabel = '+ skill',
  placeholder = 'Skill',
}: {
  items: string[]
  edit?: EditFn
  setItem?: (c: ResumeDocument['content'], ki: number, v: string) => void
  onAdd?: () => void
  onRemove?: (ki: number) => void
  onPruneEmpty?: () => void
  addLabel?: string
  placeholder?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<number | null>(null)
  const deleting = useRef(false)
  useEffect(() => {
    if (pendingFocus.current == null || !wrapRef.current) return
    const eds = wrapRef.current.querySelectorAll<HTMLElement>('.rm-chip-edit .rm-editable')
    eds[pendingFocus.current]?.focus()
    pendingFocus.current = null
  })

  const onWrapBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!onPruneEmpty || deleting.current) return
    const next = e.relatedTarget as Node | null
    if (next && wrapRef.current?.contains(next)) return
    if (items.some((k) => (k || '').trim().length === 0)) onPruneEmpty()
  }

  if (!edit) {
    const visible = items.filter((k) => (k || '').trim().length > 0)
    return visible.length ? <Chips items={visible} /> : null
  }

  const stop = (e: { preventDefault: () => void }) => e.preventDefault()
  return (
    <div className="rm-chips rm-chips-edit" ref={wrapRef} onBlur={onWrapBlur}>
      {items.map((k, ki) => (
        <span key={ki} className="rm-chip rm-chip-edit">
          <Ed
            edit={edit}
            value={k}
            apply={(c, v) => setItem?.(c, ki, v)}
            placeholder={placeholder}
            onEnter={onAdd ? () => { pendingFocus.current = items.length; onAdd() } : undefined}
          />
          {onRemove && (
            <button
              type="button"
              className="rm-chip-del no-print"
              contentEditable={false}
              onMouseDown={stop}
              onClick={() => {
                deleting.current = true
                ;(document.activeElement as HTMLElement | null)?.blur()
                onRemove(ki)
                deleting.current = false
              }}
              aria-label="Remove"
              title="Remove"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {onAdd && (
        <button
          type="button"
          className="rm-add-btn no-print"
          contentEditable={false}
          onMouseDown={stop}
          onClick={() => { pendingFocus.current = items.length; onAdd() }}
          title="Add a skill"
        >
          {addLabel}
        </button>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- renderers */

function Summary({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <Ed
      edit={edit}
      value={doc.content.basics.summary ?? ''}
      rich
      multiline
      as="div"
      className="rm-item"
      apply={(c, v) => { c.basics.summary = v }}
      placeholder="Write a short professional summary…"
    />
  )
}

function Work({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.work.map((w, i) => (
        <article className="rm-item rm-keep" key={w.id}>
          <ItemHead
            title={<Ed edit={edit} value={w.position} apply={(c, v) => { c.work[i].position = v }} placeholder="Job title" />}
            date={rangeDate(edit, show(opts?.showDates), w.startDate, w.endDate, (c, v) => { c.work[i].startDate = v }, (c, v) => { c.work[i].endDate = v })}
          />
          <div className="rm-item-sub">
            <Ed edit={edit} value={w.name} apply={(c, v) => { c.work[i].name = v }} className="rm-item-org" placeholder="Company" />
            {show(opts?.showLocation) && (edit || w.location) ? <Ed edit={edit} value={w.location} apply={(c, v) => { c.work[i].location = v }} className="rm-item-loc" placeholder="Location" /> : null}
          </div>
          {show(opts?.showSummary) && has(w.summary) ? (
            <div className="rm-item-summary">
              <Ed edit={edit} value={w.summary} rich multiline as="div" apply={(c, v) => { c.work[i].summary = v }} placeholder="" />
            </div>
          ) : null}
          {show(opts?.showBullets) ? (
            <Bullets
              items={w.highlights}
              edit={edit}
              setItem={(c, bi, v) => { c.work[i].highlights[bi] = v }}
              onAdd={edit ? () => edit((c) => { c.work[i].highlights.push('') }) : undefined}
              onRemove={edit ? (bi) => edit((c) => { c.work[i].highlights.splice(bi, 1) }) : undefined}
              onInsertAfter={edit ? (bi) => edit((c) => { c.work[i].highlights.splice(bi + 1, 0, '') }) : undefined}
              onPruneEmpty={edit ? () => edit((c) => { c.work[i].highlights = c.work[i].highlights.filter((h) => htmlToText(h).trim().length > 0) }) : undefined}
            />
          ) : null}
        </article>
      ))}
    </>
  )
}

function Education({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.education.map((e, i) => {
        const title = [e.studyType, e.area].filter(Boolean).join(', ') || e.institution
        return (
          <article className="rm-item rm-keep" key={e.id}>
            <ItemHead
              title={edit ? <Ed edit={edit} value={e.area} apply={(c, v) => { c.education[i].area = v }} placeholder="Field of study" /> : title}
              date={rangeDate(edit, show(opts?.showDates), e.startDate, e.endDate, (c, v) => { c.education[i].startDate = v }, (c, v) => { c.education[i].endDate = v })}
            />
            <div className="rm-item-sub">
              <Ed edit={edit} value={e.institution} apply={(c, v) => { c.education[i].institution = v }} className="rm-item-org" placeholder="Institution" />
              {show(opts?.showLocation) && (edit || e.location) ? <Ed edit={edit} value={e.location} apply={(c, v) => { c.education[i].location = v }} className="rm-item-loc" placeholder="Location" /> : null}
              {edit || e.score ? <Ed edit={edit} value={e.score} apply={(c, v) => { c.education[i].score = v }} placeholder="GPA" /> : null}
            </div>
            {has(e.summary) ? <RichText html={e.summary} /> : null}
            {e.courses?.length ? <div className="rm-skill-inline">{e.courses.join(' · ')}</div> : null}
          </article>
        )
      })}
    </>
  )
}

function Projects({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.projects.map((p, i) => (
        <article className="rm-item rm-keep" key={p.id}>
          <ItemHead
            title={edit ? <Ed edit={edit} value={p.name} apply={(c, v) => { c.projects[i].name = v }} placeholder="Project name" /> : safeHref(p.url) ? <a href={safeHref(p.url)}>{p.name}</a> : p.name}
            date={rangeDate(edit, show(opts?.showDates), p.startDate, p.endDate, (c, v) => { c.projects[i].startDate = v }, (c, v) => { c.projects[i].endDate = v })}
          />
          {edit ? (
            <div className="rm-item-link">
              <Ed edit={edit} value={p.url} apply={(c, v) => { c.projects[i].url = v }} placeholder="Project link (e.g. github.com/you/project)" />
            </div>
          ) : p.url ? (
            <div className="rm-item-link">{safeHref(p.url) ? <a href={safeHref(p.url)}>{prettyUrl(p.url)}</a> : prettyUrl(p.url)}</div>
          ) : null}
          {edit || p.description ? (
            <div className="rm-item-summary">
              <Ed edit={edit} value={p.description} apply={(c, v) => { c.projects[i].description = v }} placeholder="One-line description" />
            </div>
          ) : null}
          {show(opts?.showBullets) ? (
            <Bullets
              items={p.highlights}
              edit={edit}
              setItem={(c, bi, v) => { c.projects[i].highlights[bi] = v }}
              onAdd={edit ? () => edit((c) => { c.projects[i].highlights.push('') }) : undefined}
              onRemove={edit ? (bi) => edit((c) => { c.projects[i].highlights.splice(bi, 1) }) : undefined}
              onInsertAfter={edit ? (bi) => edit((c) => { c.projects[i].highlights.splice(bi + 1, 0, '') }) : undefined}
              onPruneEmpty={edit ? () => edit((c) => { c.projects[i].highlights = c.projects[i].highlights.filter((h) => htmlToText(h).trim().length > 0) }) : undefined}
            />
          ) : null}
          {show(opts?.showKeywords) ? (
            edit ? (
              <EditableChips
                items={p.keywords ?? []}
                edit={edit}
                setItem={(c, ki, v) => { (c.projects[i].keywords ??= [])[ki] = v }}
                onAdd={() => edit((c) => { (c.projects[i].keywords ??= []).push('') })}
                onRemove={(ki) => edit((c) => { c.projects[i].keywords?.splice(ki, 1) })}
                onPruneEmpty={() => edit((c) => { c.projects[i].keywords = (c.projects[i].keywords ?? []).filter((k) => (k || '').trim().length > 0) })}
                addLabel="+ tag"
                placeholder="Tech"
              />
            ) : p.keywords?.length ? <Chips items={p.keywords} /> : null
          ) : null}
        </article>
      ))}
    </>
  )
}

function Skills({ doc, config, edit }: { doc: ResumeDocument; config: TemplateConfig; edit?: EditFn }) {
  const style = config.skills
  const prof = doc.metadata.typography.proficiency as ProfStyle
  const meter = prof === 'dots' || prof === 'bars' || prof === 'stars'
  return (
    <>
      {doc.content.skills.map((s, i) => {
        const hasKeywords = s.keywords && s.keywords.length > 0
        if (!hasKeywords && typeof s.rating === 'number' && meter) {
          return (
            <div className="rm-skill-group" key={s.id}>
              <div className="rm-level">
                <span className="rm-skill-group-name" style={{ minWidth: '40%' }}>{s.name}</span>
                <Proficiency rating={s.rating} style={prof} />
              </div>
            </div>
          )
        }
        const chipStyle = style === 'chips' || style === 'grouped-chips' || style === 'bars' || style === 'dots'
        return (
          <div className="rm-skill-group" key={s.id}>
            {s.name || edit ? <Ed edit={edit} value={s.name} apply={(c, v) => { c.skills[i].name = v }} className="rm-skill-group-name" placeholder="Category" /> : null}
            {edit ? (
              // Always editable on the canvas — add/edit/remove skills inline,
              // regardless of the template's display style.
              <EditableChips
                items={s.keywords ?? []}
                edit={edit}
                setItem={(c, ki, v) => { (c.skills[i].keywords ??= [])[ki] = v }}
                onAdd={() => edit((c) => { (c.skills[i].keywords ??= []).push('') })}
                onRemove={(ki) => edit((c) => { c.skills[i].keywords?.splice(ki, 1) })}
                onPruneEmpty={() => edit((c) => { c.skills[i].keywords = (c.skills[i].keywords ?? []).filter((k) => (k || '').trim().length > 0) })}
              />
            ) : hasKeywords && chipStyle ? (
              <Chips items={s.keywords!} />
            ) : hasKeywords ? (
              <span className="rm-skill-inline">{s.name ? ': ' : ''}{s.keywords!.join(' · ')}</span>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function Languages({ doc, edit }: { doc: ResumeDocument; config: TemplateConfig; edit?: EditFn }) {
  const prof = doc.metadata.typography.proficiency as ProfStyle
  const meter = prof === 'dots' || prof === 'bars' || prof === 'stars'
  return (
    <>
      {doc.content.languages.map((l, i) => (
        <div className="rm-mini" key={l.id}>
          {meter && typeof l.rating === 'number' ? (
            <div className="rm-level">
              {edit ? (
                <Ed edit={edit} value={l.language} apply={(c, v) => { c.languages[i].language = v }} className="rm-mini-title" placeholder="Language" />
              ) : (
                <span className="rm-mini-title" style={{ minWidth: '45%' }}>{l.language}</span>
              )}
              <Proficiency rating={l.rating} style={prof} />
            </div>
          ) : (
            <div className="rm-item-head">
              <Ed edit={edit} value={l.language} apply={(c, v) => { c.languages[i].language = v }} className="rm-mini-title" placeholder="Language" />
              {prof !== 'none' && (edit || l.fluency) ? <Ed edit={edit} value={l.fluency} apply={(c, v) => { c.languages[i].fluency = v }} className="rm-mini-sub" placeholder="Fluency" /> : null}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function Certificates({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.certificates.map((cert, i) => (
        <div className="rm-mini" key={cert.id}>
          <div className="rm-item-head">
            <span className="rm-mini-title">{edit ? <Ed edit={edit} value={cert.name} apply={(c, v) => { c.certificates[i].name = v }} placeholder="Certificate" /> : safeHref(cert.url) ? <a href={safeHref(cert.url)}>{cert.name}</a> : cert.name}</span>
            {edit || cert.date ? <span className="rm-item-date">{singleDate(edit, true, cert.date, (c, v) => { c.certificates[i].date = v })}</span> : null}
          </div>
          {edit || cert.issuer ? <Ed edit={edit} value={cert.issuer} apply={(c, v) => { c.certificates[i].issuer = v }} className="rm-mini-sub" placeholder="Issuer" /> : null}
        </div>
      ))}
    </>
  )
}

function Awards({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.awards.map((a, i) => (
        <div className="rm-mini" key={a.id}>
          <div className="rm-item-head">
            <Ed edit={edit} value={a.title} apply={(c, v) => { c.awards[i].title = v }} className="rm-mini-title" placeholder="Award" />
            {edit || a.date ? <span className="rm-item-date">{singleDate(edit, true, a.date, (c, v) => { c.awards[i].date = v })}</span> : null}
          </div>
          {edit || a.awarder ? <Ed edit={edit} value={a.awarder} apply={(c, v) => { c.awards[i].awarder = v }} className="rm-mini-sub" placeholder="Awarder" /> : null}
          {has(a.summary) ? <RichText html={a.summary} /> : null}
        </div>
      ))}
    </>
  )
}

function Publications({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.publications.map((p, i) => (
        <div className="rm-mini" key={p.id}>
          <div className="rm-item-head">
            <span className="rm-mini-title">{edit ? <Ed edit={edit} value={p.name} apply={(c, v) => { c.publications[i].name = v }} placeholder="Title" /> : safeHref(p.url) ? <a href={safeHref(p.url)}>{p.name}</a> : p.name}</span>
            {edit || p.releaseDate ? <span className="rm-item-date">{singleDate(edit, true, p.releaseDate, (c, v) => { c.publications[i].releaseDate = v })}</span> : null}
          </div>
          {edit || p.publisher ? <Ed edit={edit} value={p.publisher} apply={(c, v) => { c.publications[i].publisher = v }} className="rm-mini-sub" placeholder="Publisher" /> : null}
          {has(p.summary) ? <RichText html={p.summary} /> : null}
        </div>
      ))}
    </>
  )
}

function Volunteer({ doc, edit, opts }: { doc: ResumeDocument; edit?: EditFn; opts?: SecOpts }) {
  return (
    <>
      {doc.content.volunteer.map((v, i) => (
        <article className="rm-item rm-keep" key={v.id}>
          <ItemHead
            title={<Ed edit={edit} value={v.position} apply={(c, val) => { c.volunteer[i].position = val }} placeholder="Role" />}
            date={rangeDate(edit, show(opts?.showDates), v.startDate, v.endDate, (c, val) => { c.volunteer[i].startDate = val }, (c, val) => { c.volunteer[i].endDate = val })}
          />
          {edit || v.organization ? (
            <div className="rm-item-sub">
              <Ed edit={edit} value={v.organization} apply={(c, val) => { c.volunteer[i].organization = val }} className="rm-item-org" placeholder="Organization" />
            </div>
          ) : null}
          {has(v.summary) ? <RichText html={v.summary} /> : null}
          {show(opts?.showBullets) ? (
            <Bullets
              items={v.highlights}
              edit={edit}
              setItem={(c, bi, val) => { c.volunteer[i].highlights[bi] = val }}
              onAdd={edit ? () => edit((c) => { c.volunteer[i].highlights.push('') }) : undefined}
              onRemove={edit ? (bi) => edit((c) => { c.volunteer[i].highlights.splice(bi, 1) }) : undefined}
              onInsertAfter={edit ? (bi) => edit((c) => { c.volunteer[i].highlights.splice(bi + 1, 0, '') }) : undefined}
              onPruneEmpty={edit ? () => edit((c) => { c.volunteer[i].highlights = c.volunteer[i].highlights.filter((h) => htmlToText(h).trim().length > 0) }) : undefined}
            />
          ) : null}
        </article>
      ))}
    </>
  )
}

function Interests({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.interests.map((it, i) => (
        <div className="rm-mini" key={it.id}>
          <Ed edit={edit} value={it.name} apply={(c, v) => { c.interests[i].name = v }} className="rm-mini-title" placeholder="Interest" />
          {edit ? (
            <EditableChips
              items={it.keywords ?? []}
              edit={edit}
              setItem={(c, ki, v) => { (c.interests[i].keywords ??= [])[ki] = v }}
              onAdd={() => edit((c) => { (c.interests[i].keywords ??= []).push('') })}
              onRemove={(ki) => edit((c) => { c.interests[i].keywords?.splice(ki, 1) })}
              onPruneEmpty={() => edit((c) => { c.interests[i].keywords = (c.interests[i].keywords ?? []).filter((k) => (k || '').trim().length > 0) })}
              addLabel="+ keyword"
              placeholder="Keyword"
            />
          ) : it.keywords?.length ? <span className="rm-skill-inline"> — {it.keywords.join(', ')}</span> : null}
        </div>
      ))}
    </>
  )
}

function References({ doc, edit }: { doc: ResumeDocument; edit?: EditFn }) {
  return (
    <>
      {doc.content.references.map((r, i) => (
        <div className="rm-mini" key={r.id}>
          <Ed edit={edit} value={r.name} apply={(c, v) => { c.references[i].name = v }} className="rm-mini-title" placeholder="Name" />
          {edit || r.reference ? <Ed edit={edit} value={r.reference} apply={(c, v) => { c.references[i].reference = v }} className="rm-mini-sub" placeholder="Reference / “Available on request”" /> : null}
        </div>
      ))}
    </>
  )
}

function Custom({ doc, sectionKey, edit, opts }: { doc: ResumeDocument; sectionKey: string; edit?: EditFn; opts?: SecOpts }) {
  const id = sectionKey.slice('custom-'.length)
  const secIndex = doc.content.custom.findIndex((c) => c.id === id)
  const sec = doc.content.custom[secIndex]
  if (!sec) return null
  return (
    <>
      {sec.items.map((it, i) => (
        <article className="rm-item rm-keep" key={it.id}>
          <ItemHead
            title={<Ed edit={edit} value={it.name} apply={(c, v) => { c.custom[secIndex].items[i].name = v }} placeholder="Title" />}
            date={singleDate(edit, show(opts?.showDates), it.date ?? '', (c, v) => { c.custom[secIndex].items[i].date = v })}
          />
          {edit || it.subtitle || it.location ? (
            <div className="rm-item-sub">
              <Ed edit={edit} value={it.subtitle ?? ''} apply={(c, v) => { c.custom[secIndex].items[i].subtitle = v }} className="rm-item-org" placeholder="Subtitle" />
              {show(opts?.showLocation) && (edit || it.location) ? <Ed edit={edit} value={it.location ?? ''} apply={(c, v) => { c.custom[secIndex].items[i].location = v }} className="rm-item-loc" placeholder="Location" /> : null}
            </div>
          ) : null}
          {has(it.summary) ? (
            <Ed edit={edit} value={it.summary ?? ''} rich multiline as="div" apply={(c, v) => { c.custom[secIndex].items[i].summary = v }} placeholder="Description" />
          ) : null}
          {show(opts?.showBullets) ? (
            <Bullets
              items={it.highlights ?? []}
              edit={edit}
              setItem={(c, bi, v) => { c.custom[secIndex].items[i].highlights[bi] = v }}
              onAdd={edit ? () => edit((c) => { (c.custom[secIndex].items[i].highlights ??= []).push('') }) : undefined}
              onRemove={edit ? (bi) => edit((c) => { c.custom[secIndex].items[i].highlights?.splice(bi, 1) }) : undefined}
              onInsertAfter={edit ? (bi) => edit((c) => { (c.custom[secIndex].items[i].highlights ??= []).splice(bi + 1, 0, '') }) : undefined}
              onPruneEmpty={edit ? () => edit((c) => { const a = c.custom[secIndex].items[i].highlights; if (a) c.custom[secIndex].items[i].highlights = a.filter((h) => htmlToText(h).trim().length > 0) }) : undefined}
            />
          ) : null}
        </article>
      ))}
    </>
  )
}

/** Canvas-only "+ Add <entry>" row, mirroring the Bullets add-row. Lets the user
 *  add the first/next item to a section directly on the page (never printed). */
function AddEntry({ sectionKey, edit }: { sectionKey: string; edit: EditFn }) {
  const label = ADD_LABEL[sectionKey] ?? 'entry'
  return (
    <div className="rm-add-entry-row no-print" contentEditable={false}>
      <button
        type="button"
        className="rm-add-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => edit((c) => pushNewItem(c, sectionKey))}
        title={`Add ${label}`}
      >
        + Add {label}
      </button>
    </div>
  )
}

function sectionRenderer(sectionKey: string, doc: ResumeDocument, config: TemplateConfig, edit?: EditFn, opts?: SecOpts): ReactNode {
  switch (sectionKey) {
    case 'summary':
      return <Summary doc={doc} edit={edit} />
    case 'work':
      return <Work doc={doc} edit={edit} opts={opts} />
    case 'education':
      return <Education doc={doc} edit={edit} opts={opts} />
    case 'projects':
      return <Projects doc={doc} edit={edit} opts={opts} />
    case 'skills':
      return <Skills doc={doc} config={config} edit={edit} />
    case 'languages':
      return <Languages doc={doc} config={config} edit={edit} />
    case 'certificates':
      return <Certificates doc={doc} edit={edit} />
    case 'awards':
      return <Awards doc={doc} edit={edit} />
    case 'publications':
      return <Publications doc={doc} edit={edit} />
    case 'volunteer':
      return <Volunteer doc={doc} edit={edit} opts={opts} />
    case 'interests':
      return <Interests doc={doc} edit={edit} />
    case 'references':
      return <References doc={doc} edit={edit} />
    default:
      if (sectionKey.startsWith('custom-')) return <Custom doc={doc} sectionKey={sectionKey} edit={edit} opts={opts} />
      return null
  }
}

/** Render the body of any section by key. */
export function SectionBody({ sectionKey, doc, config, edit }: { sectionKey: string; doc: ResumeDocument; config: TemplateConfig; edit?: EditFn }) {
  const opts: SecOpts = doc.metadata.layout.sectionSettings?.[sectionKey] ?? {}
  const body = sectionRenderer(sectionKey, doc, config, edit, opts)
  // Summary is a single field (always editable); every other section is a list,
  // so offer an inline "+ Add" affordance on the canvas (edit mode only).
  const canAdd = !!edit && sectionKey !== 'summary'
  if (!canAdd) return body
  return (
    <>
      {body}
      <AddEntry sectionKey={sectionKey} edit={edit} />
    </>
  )
}
