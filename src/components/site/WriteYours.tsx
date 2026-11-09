import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import type { GuideLink } from '@/data/guideHub'
import { cn } from '@/lib/utils'

/**
 * "Write yours:" and the guides, tool pages and hub link on a design or an
 * example page. The same links as the pre-rendered HTML (guideLinksHtml in
 * seoLibrary), from the same list (data/pageLinks).
 */
export function WriteYours({ links, className }: { links: readonly GuideLink[]; className?: string }) {
  return (
    <p className={cn('text-sm leading-relaxed text-muted-foreground', className)}>
      Write yours:{' '}
      {links.map((l, i) => (
        <Fragment key={l.href}>
          {i > 0 && ' · '}
          <Link className="text-primary hover:underline" to={l.href}>
            {l.label}
          </Link>
        </Fragment>
      ))}
    </p>
  )
}
