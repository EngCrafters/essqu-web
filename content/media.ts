import type { Localized } from '@/lib/i18n'

/** An authentic photograph supplied by the society. When present it replaces a drawing. */
export interface MediaImage {
  src: string
  /** Describes what the photograph shows, in both languages. */
  alt: Localized
  width: number
  height: number
  /** CSS object-position that keeps the subject in frame when the photo is cropped. */
  focus?: string
}

/** A society photograph shown with a caption naming the occasion, as its file names it. */
export interface CaptionedImage extends MediaImage {
  caption: Localized
}

/**
 * Society photographs that are not one of the six activities' editions. From /photos
 * ("السبلة الهندسية _1_2025"), resized and stripped of metadata into public/images/society.
 */
export const SOCIETY_PHOTOS = {
  sablah2025: {
    src: '/images/society/engineering-sablah-2025.jpg',
    width: 2400,
    height: 1600,
    alt: {
      en: 'Students in conversation at the Engineering Sablah, beside the event’s posters.',
      ar: 'طلاب يتحاورون في السبلة الهندسية بجانب ملصقات الفعالية.',
    },
    caption: { en: 'Engineering Sablah, 2025', ar: 'السبلة الهندسية، 2025' },
    focus: '50% 26%',
  },
} satisfies Record<string, CaptionedImage>
