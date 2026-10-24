/**
 * Arrow-key movement inside the top bar's menus (Export, More).
 *
 * They were plain stacks of buttons: Tab walked through them, Escape left
 * them open behind an invisible backdrop that swallowed the next click, and
 * nothing said they were menus. Now each is a menu: focus enters on open,
 * arrows and Home/End move, Escape closes and hands focus back.
 */
export function nextMenuIndex(current: number, count: number, key: string): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/** keydown for a menu panel: moves focus among its enabled, visible items. */
export function onMenuKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')].filter(
    (el) => el.offsetParent !== null
  )
  const next = nextMenuIndex(items.indexOf(document.activeElement as HTMLElement), items.length, e.key)
  if (next === null) return
  e.preventDefault()
  items[next].focus()
}
