'use client'

import { useI18n } from '@/components/i18n/I18nProvider'
import { ItemMedia } from '@/components/ui/Plate'
import type { Project } from '@/content/platform/projects'

/** The existing drawing-sheet frame, displaying a project's own photo when available. */
export function ProjectCover({ project, id, className }: { project: Project; id: string; className?: string }) {
  const { l } = useI18n()
  const photo = project.media.find((item) => item.kind === 'photo' && item.src)
  return (
    <ItemMedia
      id={id}
      drawing={project.drawing}
      tone="ivory"
      className={className}
      sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
      image={photo?.src ? { src: photo.src, alt: l(photo.alt ?? project.title) } : undefined}
      // Public media is checked against the current published snapshot on every request.
      unoptimized={!project.sample}
    />
  )
}
