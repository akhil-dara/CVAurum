import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument } from '@/data/defaults'
import { useResumeStore } from './useResumeStore'

/**
 * One Undo reverses one visible action (usability test, 2026-09-26: the
 * first Undo "did nothing" after a delete and on a freshly opened page).
 * The history tracks `{ doc }`, and every store update builds that object
 * anew - so saving, which touches only `dirty` and `lastSavedAt`, recorded a
 * step whose document was the very same one.
 */
describe('undo steps', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useResumeStore.getState().load(createDocument({ sample: true }))
    useResumeStore.temporal.getState().clear()
    vi.advanceTimersByTime(2000)
  })

  const past = () => useResumeStore.temporal.getState().pastStates.length

  it('saving is not a step', () => {
    useResumeStore.getState().markSaved(Date.now())
    vi.advanceTimersByTime(1000)
    useResumeStore.getState().markSaved(Date.now() + 1)
    vi.advanceTimersByTime(1000)
    expect(past()).toBe(0)
  })

  it('an edit is one step, and one Undo reverses it', () => {
    const before = useResumeStore.getState().doc!.content.basics.name
    useResumeStore.getState().updateContent((c) => {
      c.basics.name = 'Someone Else'
    })
    vi.advanceTimersByTime(1000)
    useResumeStore.getState().markSaved(Date.now())
    vi.advanceTimersByTime(1000)
    expect(past()).toBe(1)
    useResumeStore.temporal.getState().undo()
    expect(useResumeStore.getState().doc!.content.basics.name).toBe(before)
  })

  it('a burst of typing is one step, and the next burst after a pause is another', () => {
    for (const ch of 'Priya') {
      useResumeStore.getState().updateContent((c) => {
        c.basics.name += ch
      })
      vi.advanceTimersByTime(150)
    }
    vi.advanceTimersByTime(2000)
    useResumeStore.getState().updateContent((c) => {
      c.basics.label = 'Engineer'
    })
    expect(past()).toBe(2)
    useResumeStore.temporal.getState().undo()
    useResumeStore.temporal.getState().undo()
    expect(useResumeStore.getState().doc!.content.basics.name).toBe('Alex Morgan')
    expect(useResumeStore.temporal.getState().futureStates.length).toBe(2)
  })

  it('an update that changes nothing is not a step', () => {
    useResumeStore.getState().updateMetadata(() => {})
    vi.advanceTimersByTime(1000)
    expect(past()).toBe(0)
  })
})
