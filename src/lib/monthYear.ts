/**
 * What a month/year picker writes when one of its two selects changes.
 *
 * A date is stored as "YYYY-MM" or "YYYY", so a month with no year cannot be
 * stored at all - and both pickers (the panel's DateField and the canvas's
 * MonthYear) answered a month picked first by clearing the date, so the month
 * was simply lost. The month select sits on the left and people pick it
 * first: three of five people in the usability test (2026-09-26) lost a month
 * that way. The picker now holds that month in hand until the year arrives.
 */
export function parseYM(v: string): { y: string; m: string } {
  const match = (v || '').trim().match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return { y: '', m: '' }
  return { y: match[1], m: match[2] ? String(parseInt(match[2], 10)) : '' }
}

export function pickMonthYear(
  value: string,
  pendingMonth: string,
  change: { month?: string; year?: string }
): { value: string; pendingMonth: string } {
  const { y, m } = parseYM(value)
  const month = change.month !== undefined ? change.month : m || pendingMonth
  const year = change.year !== undefined ? change.year : y
  if (!year) return { value: '', pendingMonth: month }
  return { value: month ? `${year}-${month.padStart(2, '0')}` : year, pendingMonth: '' }
}
