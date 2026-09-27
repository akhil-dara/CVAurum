import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument } from '@/data/defaults'
import { useResumeStore } from './useResumeStore'
import { useAppStore } from './useAppStore'
import { deleteItem, itemName } from './deleteItem'

/**
 * One tap on a trash icon removed a whole job with its bullets, with no
 * dialog and no way back but a second, hidden Undo (usability test,
 * 2026-09-26). A delete now says what went and offers Undo right there.
 */
describe('deleteItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useResumeStore.getState().load(createDocument({ sample: true }))
    useResumeStore.temporal.getState().clear()
    useAppStore.setState({ toasts: [] })
    vi.advanceTimersByTime(2000)
  })
  const work = () => useResumeStore.getState().doc!.content.work
  const lastToast = () => useAppStore.getState().toasts.at(-1)!

  it('names what it deleted and offers Undo, which brings it back', () => {
    const job = work()[0]
    deleteItem('work', job.id!)
    expect(work().some((w) => w.id === job.id)).toBe(false)
    expect(lastToast().message).toBe(`Deleted “${itemName(job)}”`)
    lastToast().action!.run()
    expect(work()[0].id).toBe(job.id)
  })

  it('is its own undo step even straight after typing', () => {
    useResumeStore.getState().updateContent((c) => {
      c.basics.name = 'Typed Just Now'
    })
    vi.advanceTimersByTime(100)
    const job = work()[0]
    deleteItem('work', job.id!)
    useResumeStore.temporal.getState().undo()
    expect(work()[0].id).toBe(job.id)
    expect(useResumeStore.getState().doc!.content.basics.name).toBe('Typed Just Now')
  })

  it('puts the item back where it was even after other edits', () => {
    const job = work()[1]
    deleteItem('work', job.id!)
    vi.advanceTimersByTime(2000)
    useResumeStore.getState().updateContent((c) => {
      c.basics.label = 'Edited after'
    })
    lastToast().action!.run()
    expect(work()[1].id).toBe(job.id)
    expect(useResumeStore.getState().doc!.content.basics.label).toBe('Edited after')
  })
})
