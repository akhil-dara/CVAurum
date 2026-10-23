/**
 * The first stop for a keyboard: past the navigation to what the page is for.
 *
 * Hidden until focused. By default it moves focus to the page's <main>; the
 * editor passes its own `onSkip` to land in the résumé's first field, since
 * the canvas sits behind a top bar, a rail and a panel of controls.
 */
export function SkipLink({ label = 'Skip to content', onSkip }: { label?: string; onSkip?: () => void }) {
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault()
        if (onSkip) return onSkip()
        const main = document.querySelector<HTMLElement>('main')
        if (!main) return
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
        main.focus()
      }}
    >
      {label}
    </a>
  )
}
