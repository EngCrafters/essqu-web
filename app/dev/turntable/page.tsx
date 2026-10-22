import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PROJECT_CATALOGUE } from '@/content/platform/projects'
import { TurntableCapture } from './TurntableCapture'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Development-only route for rendering a project's turntable video: it shows the project's
 * 3D model at a fixed angle that a capture script steps through (window.__setAngle), then
 * encodes the frames. The videos in public/media/projects come from here. 404 in production.
 */
export default async function TurntablePage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { slug = '' } = await searchParams
  const project = PROJECT_CATALOGUE.find((item) => item.slug === slug)
  if (!project?.model) notFound()
  return <TurntableCapture model={project.model} discipline={project.discipline} />
}
