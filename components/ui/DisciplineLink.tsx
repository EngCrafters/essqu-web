import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { DisciplineId } from '@/content/disciplines'
import { routes } from '@/lib/routes'

/**
 * A discipline's name, wherever it appears, opens that discipline's section of /disciplines
 * (which turns its exhibit to face the visitor). It keeps the look of the text around it; pass
 * a class (a chip, say) to style it as something else.
 */
export function DisciplineLink({
  id,
  children,
  className,
  style,
}: {
  id: DisciplineId
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <Link href={routes.discipline(id)} className={['discipline-link', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </Link>
  )
}
