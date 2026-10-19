import type { Localized } from '@/lib/i18n'

/**
 * SAMPLE CONTENT: prototype certificate records (PRD Phase 2, UC-04).
 *
 * These are NOT certificates. They show how issued certificates will be listed, previewed and
 * verified once issuance exists. Every preview is marked "Prototype — not a valid certificate",
 * carries no signature, seal or university crest, and the verification codes resolve only
 * inside this prototype.
 *
 * Each record is self-contained (title and date of the event it recognises), as an issued
 * document would be; `eventSlug` links to the event page when one exists.
 */

export type CertificateKind = 'participation' | 'completion'
export type CertificateStatus = 'valid' | 'pending' | 'revoked'

export interface Certificate {
  id: string
  sample: true
  /** Member id from content/platform/members.ts. */
  member: string
  kind: CertificateKind
  event: Localized
  eventDate: string
  eventSlug?: string
  /** Activity the event belongs to (content/activities.ts). */
  activity?: string
  issued: string
  code: string
  status: CertificateStatus
}

const c = (
  id: string,
  member: string,
  kind: CertificateKind,
  event: Localized,
  eventDate: string,
  issued: string,
  code: string,
  status: CertificateStatus,
  links: { eventSlug?: string; activity?: string } = {},
): Certificate => ({ id, sample: true, member, kind, event, eventDate, issued, code, status, ...links })

export const CERTIFICATES: Certificate[] = [
  c('c-2025-0142', 'm-07', 'participation', { en: '3D Modelling Workshop', ar: 'ورشة النمذجة ثلاثية الأبعاد' }, '2025-02-04', '2025-02-11', 'ES-25-0142-K7QD', 'valid', { activity: 'graduate-workshops' }),
  c('c-2025-0318', 'm-07', 'participation', { en: 'Reservoir Simulation Modelling', ar: 'نمذجة محاكاة المكامن' }, '2025-02-18', '2025-02-25', 'ES-25-0318-M2HX', 'valid', { activity: 'programme' }),
  c('c-2026-0021', 'm-07', 'completion', { en: 'Lab Safety Essentials', ar: 'أساسيات السلامة في المختبر' }, '2026-02-17', '2026-02-24', 'ES-26-0021-T9LB', 'valid', { eventSlug: 'lab-safety-essentials', activity: 'programme' }),
  c('c-2026-0107', 'm-07', 'participation', { en: 'Engineering Gathering Exhibition', ar: 'معرض الملتقى الهندسي' }, '2026-03-10', '2026-03-17', 'ES-26-0107-R4WE', 'valid', { eventSlug: 'gathering-exhibition-2026', activity: 'gathering' }),
  c('c-2026-0188', 'm-07', 'participation', { en: 'Engineering Leadership Evening', ar: 'أمسية القيادة الهندسية' }, '2026-05-12', '2026-05-19', 'ES-26-0188-P6NA', 'valid', { eventSlug: 'leadership-evening-2026', activity: 'evenings' }),
  c('c-2026-0240', 'm-07', 'participation', { en: 'From Campus to Career', ar: 'من الجامعة إلى سوق العمل' }, '2026-06-02', '2026-06-09', 'ES-26-0240-H3VC', 'pending', { eventSlug: 'campus-to-career-2026', activity: 'graduate-workshops' }),
  // Other members' records, for the verification look-up.
  c('c-2026-0109', 'm-03', 'participation', { en: 'Engineering Gathering Exhibition', ar: 'معرض االملتقى الهندسي' }, '2026-03-10', '2026-03-17', 'ES-26-0109-B8JF', 'valid', { eventSlug: 'gathering-exhibition-2026', activity: 'gathering' }),
  c('c-2026-0133', 'm-02', 'completion', { en: 'Bridge Design Challenge', ar: 'تحدي تصميم الجسور' }, '2026-04-22', '2026-04-29', 'ES-26-0133-C5ZK', 'valid', { eventSlug: 'bridge-design-challenge', activity: 'competitions' }),
  c('c-2025-0077', 'm-14', 'participation', { en: 'Engineering Gathering 2025', ar: 'الملتقى الهندسي 2025' }, '2025-01-20', '2025-01-27', 'ES-25-0077-F1QS', 'revoked', { activity: 'gathering' }),
]
