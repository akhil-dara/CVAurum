import { describe, expect, it } from 'vitest'
import { detectGutter, type Item } from './layoutGraph'

/**
 * A one-column page with every date set flush right is not two columns.
 *
 * Measured on the import gate's rich document in the larger signature designs
 * (2026-09-27): the last page held only certificates, awards and a
 * publication - short title lines on the left, a year each on the right - and
 * the scan found a clean gutter between them. The years were read as a
 * sidebar and handed to the volunteer section; every one of those entries
 * came back without its date.
 */
const item = (str: string, x: number, top: number, width: number): Item => ({
  str,
  x,
  top,
  width,
  height: 10,
  bold: false,
  page: 1,
  col: 0,
  aside: false,
})

const WIDTH = 595

/** Short entry lines down the left margin. */
const leftLines = (n: number) =>
  Array.from({ length: n }, (_, i) => item(`Entry title number ${i} of the page`, 40, 60 + i * 20, 220))

describe('detectGutter', () => {
  it('does not take a rail of dates for a column', () => {
    const dates = Array.from({ length: 12 }, (_, i) =>
      i % 3 === 0 ? item('2022', 500, 60 + i * 20, 24) : item(i % 3 === 1 ? 'Mar 2021' : 'Present', 470, 60 + i * 20, 50)
    )
    expect(detectGutter([...leftLines(24), ...dates], WIDTH)).toBeNull()
  })

  it('even with the odd word on the rail beside its dates', () => {
    const dates = Array.from({ length: 12 }, (_, i) => item(i === 5 ? 'GPA' : '2022', 500, 60 + i * 20, 24))
    expect(detectGutter([...leftLines(24), ...dates], WIDTH)).toBeNull()
  })

  it('still finds a real sidebar, whose words are not dates', () => {
    const side = Array.from({ length: 14 }, (_, i) => item(['TypeScript', 'Kubernetes', 'English', 'Leadership'][i % 4], 430, 60 + i * 20, 70))
    expect(detectGutter([...leftLines(24), ...side], WIDTH)).not.toBeNull()
  })
})
