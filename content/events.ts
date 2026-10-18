import type { DrawingId } from '@/components/ui/drawings'
import type { Localized } from '@/lib/i18n'
import type { MediaImage } from './media'

/**
 * SAMPLE CONTENT. No events have been published through the platform yet (PRD UC-02 is
 * Phase 1). These entries carry over Draft 1's preview events so the layout can be
 * reviewed; every one is rendered with a visible "Sample" label and a preview-only
 * registration action. Replace with published events once the events module exists.
 * Type and registration labels are interface copy: `t.events.types` / `t.events.registration`.
 *
 * The events module now exists: with the Core API configured (lib/core-api), the homepage shows
 * the events published through the platform and these entries are not used. They remain the
 * homepage's "sample" mode for local development and design review.
 */

export type EventType = 'workshop' | 'talk' | 'site-visit' | 'competition'

/** `preview` = the platform cannot take registrations yet (the only honest state today). */
export type RegistrationStatus = 'open' | 'waitlist' | 'closed' | 'preview'

export interface SocietyEvent {
  id: string
  sample: boolean
  title: Localized
  type: EventType
  /** ISO 8601 with the Oman offset so <time> is unambiguous. */
  start: string
  end: string
  location: Localized
  description: Localized
  registration: RegistrationStatus
  drawing: DrawingId
  /** An authentic event photograph, when the society supplies one; replaces the drawing. */
  image?: MediaImage
}

/**
 * What the homepage's events section renders: a sample entry above, or an event published through
 * the Core platform (lib/core-api/adapter.ts), which has no type or end time and may have no
 * location yet. The section leaves out whatever an event doesn't have.
 */
export type HomeEvent = Omit<SocietyEvent, 'type' | 'end' | 'location'> & {
  type?: EventType
  end?: string
  location: Localized | null
}

export const EVENTS: SocietyEvent[] = [
  {
    id: 'intro-robotics-workshop',
    sample: true,
    title: { en: 'Intro to Robotics Workshop', ar: 'ورشة مدخل إلى الروبوتات' },
    type: 'workshop',
    start: '2026-10-12T16:00:00+04:00',
    end: '2026-10-12T18:00:00+04:00',
    location: { en: 'College of Engineering, on campus', ar: 'كلية الهندسة، داخل الحرم الجامعي' },
    description: {
      en: 'A hands-on build session for first-time robotics students: wire a sensor, program a microcontroller and leave with a prototype that moves.',
      ar: 'جلسة بناء تطبيقية للمبتدئين في الروبوتات: صِل مستشعرًا، وبرمج متحكّمًا دقيقًا، وغادر ومعك نموذج أولي يتحرك.',
    },
    registration: 'preview',
    drawing: 'robotics-workshop',
  },
  {
    id: 'engineering-careers-panel',
    sample: true,
    title: { en: 'Engineering Careers Panel', ar: 'ندوة المسارات المهنية الهندسية' },
    type: 'talk',
    start: '2026-11-03T18:30:00+04:00',
    end: '2026-11-03T20:00:00+04:00',
    location: { en: 'On campus', ar: 'داخل الحرم الجامعي' },
    description: {
      en: 'Graduates from across the disciplines on life after SQU: first roles, graduate study and what they wish they had started sooner.',
      ar: 'خريجون من مختلف التخصصات يتحدثون عن الحياة بعد الجامعة: الوظائف الأولى، والدراسات العليا، وما تمنّوا لو بدؤوه مبكرًا.',
    },
    registration: 'preview',
    drawing: 'careers-panel',
  },
  {
    id: 'sustainable-infrastructure-visit',
    sample: true,
    title: { en: 'Sustainable Infrastructure Site Visit', ar: 'زيارة ميدانية لمشروع بنية تحتية مستدامة' },
    type: 'site-visit',
    start: '2026-11-19T08:30:00+04:00',
    end: '2026-11-19T12:00:00+04:00',
    location: { en: 'Off-campus site, Muscat', ar: 'موقع خارج الحرم الجامعي، مسقط' },
    description: {
      en: 'A guided look inside a civil project in Muscat, from foundations to finishing works.',
      ar: 'جولة بصحبة مرشد داخل مشروع إنشائي في مسقط، من الأساسات حتى أعمال التشطيب.',
    },
    registration: 'preview',
    drawing: 'site-visit',
  },
]
