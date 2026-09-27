import { describe, expect, it } from 'vitest'
import { pickMonthYear } from './monthYear'

/**
 * The month select sits on the left, so people pick it first. With the year
 * still empty the pickers threw the month away (usability test 2026-09-26:
 * three of five people lost a month this way, and an internship printed as
 * "2025").
 */
describe('pickMonthYear', () => {
  it('holds a month picked before the year, and writes nothing yet', () => {
    expect(pickMonthYear('', '', { month: '5' })).toEqual({ value: '', pendingMonth: '5' })
  })

  it('uses the held month when the year arrives', () => {
    expect(pickMonthYear('', '5', { year: '2025' })).toEqual({ value: '2025-05', pendingMonth: '' })
  })

  it('writes year and month together when the year is already there', () => {
    expect(pickMonthYear('2024', '', { month: '11' })).toEqual({ value: '2024-11', pendingMonth: '' })
    expect(pickMonthYear('2024-03', '', { year: '2021' })).toEqual({ value: '2021-03', pendingMonth: '' })
  })

  it('a year on its own is a year', () => {
    expect(pickMonthYear('', '', { year: '2019' })).toEqual({ value: '2019', pendingMonth: '' })
  })

  it('clearing the month keeps the year', () => {
    expect(pickMonthYear('2024-03', '', { month: '' })).toEqual({ value: '2024', pendingMonth: '' })
  })

  it('clearing the year empties the date but keeps the month in hand', () => {
    expect(pickMonthYear('2024-03', '', { year: '' })).toEqual({ value: '', pendingMonth: '3' })
  })
})
