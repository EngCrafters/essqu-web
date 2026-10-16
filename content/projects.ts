import type { DisciplineId } from './disciplines'
import type { DrawingId } from '@/components/ui/drawings'
import type { Localized } from '@/lib/i18n'
import type { MediaImage } from './media'

/**
 * The society's projects on the homepage: real work, from the teams' own posters and the file
 * names in /photos/proj ("المشروع الفائز بالجائزه الكبرى للملتقى", "الفائز بانجاز عمان 2026"…).
 * Latin names inside Arabic text are wrapped in directional isolates (\u2066…\u2069) so their
 * punctuation stays with them.
 *
 * Only what those files state is recorded. A project's discipline, year or team size is left
 * out where the files don't give it (the card then omits that detail), and no stage is shown,
 * because none is stated. Titles are the teams' own, shortened for the card where they are long;
 * `fullTitle` keeps the original. The Arabic text is a faithful translation of the English
 * posters, for the teams to review.
 *
 * The projects have no pages yet (the Projects module is coming soon), so `href` stays null and
 * each card says its page is on the way. Set `href` to `routes.project(id)` once a page exists.
 */

export interface ArchiveProject {
  id: string
  /** Illustrative content rather than a real project (none on the homepage today). */
  sample: boolean
  title: Localized
  /** The title as the team wrote it, when the card shows a shorter one. */
  fullTitle?: Localized
  discipline?: DisciplineId
  year?: string
  /** Number of team members; the label ("Team of 5") is interface copy. */
  teamSize?: number
  summary: Localized
  /** The recognition the project received, as the source names it. */
  award?: Localized
  /** The project's page on the platform (/projects/[slug]), once it has one. */
  href: string | null
  /** The drawing shown when the project has no photograph or print. */
  drawing?: DrawingId
  /** An authentic project photograph, shown full-bleed. */
  image?: MediaImage
  /** The team's poster or a product photograph, laid on the drawing board as a print. */
  print?: MediaImage
}

const t = (en: string, ar: string): Localized => ({ en, ar })

/** The teams' posters and product photograph: web copies in public/images/projects. */
const poster = (file: string, title: Localized): MediaImage => ({
  src: `/images/projects/${file}`,
  width: 1540,
  height: 976,
  alt: { en: `The project’s poster: “${title.en}”.`, ar: `ملصق المشروع: «${title.ar}».` },
  focus: '50% 0%',
})

const PLA_HA = t(
  'Development, Testing, and Optimization of PLA/HA Composite Materials for 3D Printed Biomedical Scaffolds',
  'تطوير مواد PLA/HA المركّبة واختبارها وتحسينها لسقالات طبية حيوية مطبوعة بالطباعة ثلاثية الأبعاد',
)
const TAMRA = t(
  'A Framework for Embodied AI and Hybrid Hardware Synthesis in Autonomous Service Robotics: T.A.M.R.A. — Task-Agnostic Modular Robotic Apparatus',
  'إطار للذكاء الاصطناعي المجسَّد وتوليف العتاد الهجين في الروبوتات الخدمية ذاتية الحركة: \u2066T.A.M.R.A.\u2069، منصة روبوتية معيارية غير مقيّدة بمهمة',
)
const PACKING = t(
  'Investigation and Mitigation of Packing Leakage in Reciprocating Gas Compressors',
  'دراسة تسرّب الحشوات في ضواغط الغاز الترددية والحدّ منه',
)

/** Newest recognition first; the first project is the section's featured piece. */
export const PROJECTS: ArchiveProject[] = [
  {
    id: 'pla-ha-bone-scaffolds',
    sample: false,
    title: t('PLA/HA composite for 3D-printed bone scaffolds', 'مركّب PLA/HA لسقالات عظمية مطبوعة ثلاثيًا'),
    fullTitle: PLA_HA,
    summary: t(
      'Biodegradable PLA reinforced with hydroxyapatite, formulated and tested for 3D-printed scaffolds in bone-tissue engineering.',
      'مادة PLA قابلة للتحلل الحيوي مدعّمة بالهيدروكسيأباتيت، طُوّرت واختُبرت لطباعة سقالات ثلاثية الأبعاد لهندسة الأنسجة العظمية.',
    ),
    award: t('Grand Prize · Engineering Gathering', 'الجائزة الكبرى · الملتقى الهندسي'),
    href: null,
    print: poster('pla-ha-scaffolds-poster.jpg', PLA_HA),
  },
  {
    id: 'hydrogenix',
    sample: false,
    title: t('HydroGenix', 'HydroGenix'),
    year: '2026',
    teamSize: 5,
    summary: t(
      'A tank for storing and transporting green liquid hydrogen, with multi-layer insulation, a pressure-balancing piston and real-time sensor monitoring.',
      'خزان لتخزين الهيدروجين الأخضر السائل ونقله، بعزل حراري متعدد الطبقات ومكبس لموازنة الضغط ومراقبة لحظية بالمستشعرات.',
    ),
    award: t('Winner · INJAZ Oman 2026', 'الفائز · إنجاز عُمان 2026'),
    href: null,
    print: {
      src: '/images/projects/hydrogenix-model.jpg',
      width: 412,
      height: 259,
      alt: t(
        'A white 3D-printed model of the HydroGenix liquid hydrogen cylinder.',
        'نموذج أبيض مطبوع بالطباعة ثلاثية الأبعاد لأسطوانة الهيدروجين السائل من HydroGenix.',
      ),
    },
  },
  {
    id: 'tamra',
    sample: false,
    title: t('T.A.M.R.A. modular service robot', '\u2066T.A.M.R.A.\u2069: روبوت خدمي معياري'),
    fullTitle: TAMRA,
    discipline: 'mechatronics',
    summary: t(
      'A modular service robot that brings embodied AI to autonomous platforms, developed first for healthcare settings.',
      'روبوت خدمي معياري يوظّف الذكاء الاصطناعي المجسَّد على المنصات ذاتية الحركة، طُوِّر أولًا لبيئات الرعاية الصحية.',
    ),
    award: t('Best project · Electrical & Mechatronics', 'أفضل مشروع · قسم الكهرباء والميكاترونكس'),
    href: null,
    print: poster('tamra-poster.jpg', TAMRA),
  },
  {
    id: 'compressor-packing-leakage',
    sample: false,
    title: t('Packing leakage in reciprocating gas compressors', 'تسرّب الحشوات في ضواغط الغاز الترددية'),
    fullTitle: PACKING,
    discipline: 'mechanical',
    summary: t(
      'A study of gas leakage through compressor packing that uses FMEA, fluid–structure interaction and CFD to guide an improved seal design.',
      'دراسة لتسرّب الغاز عبر حشوات الضواغط تستخدم تحليل أنماط الفشل (FMEA) والتفاعل بين المائع والهيكل وديناميكا الموائع الحسابية لتوجيه تصميم أفضل لمنع التسرب.',
    ),
    award: t('Best project · Mechanical & Industrial', 'أفضل مشروع · قسم الميكانيك والصناعي'),
    href: null,
    print: poster('packing-leakage-poster.jpg', PACKING),
  },
]
