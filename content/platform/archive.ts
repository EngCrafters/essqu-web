import type { DisciplineId } from '@/content/disciplines'
import type { Localized } from '@/lib/i18n'

/**
 * SAMPLE CONTENT: archive details for the previous events shown in the homepage activity
 * galleries (content/activities.ts). Those events are demonstration content, so this archive
 * is too: it shows how documented editions will be explored by activity, year and discipline.
 * Nothing here is a record of what the society held. The homepage data is not modified; this
 * file only adds what the archive page needs, keyed by the event id.
 */

export interface ArchiveDetail {
  disciplines: DisciplineId[]
  summary: Localized
  /** Extra photographs for the gallery, by key into ARCHIVE_PHOTOS. */
  gallery: (keyof typeof ARCHIVE_PHOTOS)[]
}

/** The society's own photographs, reused across the demonstration archive. */
export const ARCHIVE_PHOTOS = {
  gathering: { src: '/images/activities/gathering.jpg', width: 1170, height: 762 },
  programme: { src: '/images/activities/programme.jpg', width: 2400, height: 1600 },
  workshops: { src: '/images/activities/graduate-workshops.jpg', width: 1600, height: 2400 },
  studio: { src: '/images/activities/graduate-studio.jpg', width: 2400, height: 1600 },
  evenings: { src: '/images/activities/evenings.jpg', width: 1170, height: 652 },
  competitions: { src: '/images/activities/competitions.jpg', width: 2400, height: 1603 },
} as const

const ALL: DisciplineId[] = ['mechanical', 'electrical', 'civil', 'petroleum', 'chemical', 'mechatronics', 'industrial']

const d = (disciplines: DisciplineId[], en: string, ar: string, gallery: ArchiveDetail['gallery']): ArchiveDetail => ({ disciplines, summary: { en, ar }, gallery })

export const ARCHIVE_DETAILS: Record<string, ArchiveDetail> = {
  'gathering-2025': d(ALL, 'The yearly gathering: every engineering society’s stand in one hall, student projects and a central installation.', 'التجمع السنوي: أجنحة الجماعات الهندسية في قاعة واحدة، مع مشاريع الطلبة ومجسّم مركزي.', ['gathering', 'competitions', 'studio']),
  'disciplines-open-day': d(ALL, 'New students tour every discipline’s laboratories before choosing a major.', 'يتجول الطلاب الجدد في مختبرات كل تخصص قبل اختيار تخصصهم.', ['competitions', 'gathering']),
  'industry-meetup': d(['petroleum', 'chemical', 'electrical', 'industrial'], 'Engineers from local industry meet students over short talks and open tables.', 'مهندسون من القطاع الصناعي المحلي يلتقون الطلاب عبر محاضرات قصيرة وطاولات مفتوحة.', ['evenings', 'gathering']),
  'reservoir-simulation': d(['petroleum', 'chemical'], 'A student-led session on building and testing a reservoir simulation model.', 'جلسة يقودها طلاب حول بناء نموذج لمحاكاة المكامن واختباره.', ['programme', 'workshops']),
  'design-fundamentals': d(['mechanical', 'industrial', 'mechatronics'], 'Design thinking and engineering drawing for first- and second-year students.', 'التفكير التصميمي والرسم الهندسي لطلاب السنتين الأولى والثانية.', ['workshops', 'programme']),
  'presentation-skills': d(ALL, 'How to present a technical project clearly, with practice rounds and feedback.', 'كيف تعرض مشروعًا تقنيًا بوضوح، مع جولات تدريب وملاحظات.', ['programme', 'studio']),
  '3d-modelling': d(['mechanical', 'mechatronics', 'civil'], 'Graduates teach parametric 3D modelling in the computer lab.', 'خريجون يعلّمون النمذجة البارامترية ثلاثية الأبعاد في مختبر الحاسوب.', ['workshops', 'programme']),
  'campus-to-career': d(ALL, 'CV clinics and mock interviews run by the society’s graduates.', 'عيادات للسير الذاتية ومقابلات تجريبية يديرها خريجو الجماعة.', ['programme', 'evenings']),
  'report-writing': d(ALL, 'Structuring technical reports: from abstract to appendices.', 'هيكلة التقارير الفنية من الملخص إلى الملاحق.', ['workshops', 'programme']),
  'graduates-corner': d(ALL, 'A photo corner and meeting point for graduating members and their families.', 'ركن للتصوير وملتقى للأعضاء المتخرجين وعائلاتهم.', ['studio', 'gathering']),
  'graduation-portraits': d(ALL, 'Portrait sessions for graduating members, organised by the media committee.', 'جلسات تصوير شخصية للأعضاء المتخرجين، تنظمها اللجنة الإعلامية.', ['studio']),
  'graduation-projects': d(ALL, 'Graduating teams show their final-year projects in an open studio.', 'تعرض فرق التخرج مشاريع السنة الأخيرة في أستوديو مفتوح.', ['gathering', 'studio', 'competitions']),
  'leadership-evening': d(ALL, 'An evening of talks on leading engineering teams.', 'أمسية من المحاضرات عن قيادة الفرق الهندسية.', ['evenings']),
  'ramadan-evening': d(ALL, 'A Ramadan gathering for members, graduates and staff.', 'لقاء رمضاني يجمع الأعضاء والخريجين والمنتسبين.', ['gathering', 'evenings']),
  'innovation-evening': d(['electrical', 'mechatronics', 'industrial'], 'Short talks on student innovation, followed by open conversation.', 'محاضرات قصيرة عن ابتكار الطلبة يتبعها حوار مفتوح.', ['evenings', 'programme']),
  'projects-challenge': d(ALL, 'Teams present working prototypes to a panel of judges.', 'تعرض الفرق نماذج عاملة أمام لجنة تحكيم.', ['competitions', 'gathering']),
  'robotics-challenge': d(['mechatronics', 'electrical', 'mechanical'], 'Autonomous robots race a course set on the day.', 'روبوتات ذاتية تتسابق على مسار يُحدّد يوم المسابقة.', ['workshops', 'competitions']),
  'innovation-pitch': d(['industrial', 'electrical', 'mechanical'], 'Three-minute pitches for an engineering idea, judged on clarity and feasibility.', 'عروض من ثلاث دقائق لفكرة هندسية، تُقيّم بحسب الوضوح وقابلية التنفيذ.', ['programme', 'competitions']),
}
