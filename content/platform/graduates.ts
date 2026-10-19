import type { DisciplineId } from '@/content/disciplines'
import type { Localized } from '@/lib/i18n'
import type { IndustryId, SkillId } from './taxonomy'

/**
 * SAMPLE CONTENT: fictional graduates for the graduate network prototype (PRD Phase 4, UC-07).
 *
 * Not real people and not real employment records. Employers are described generically
 * ("an energy operator") rather than named, so nothing here reads as a placement claim.
 * Mentorship requests are prototype state held in the browser session only.
 */

export type MentorshipAvailability = 'open' | 'limited' | 'closed'

export interface Graduate {
  id: string
  sample: true
  name: Localized
  discipline: DisciplineId
  graduated: number
  skills: SkillId[]
  industry: IndustryId
  role: Localized
  /** A generic description of the employer, never a company name. */
  employer: Localized
  location: Localized
  mentorship: MentorshipAvailability
  /** What they can help with, in their words. */
  offer: Localized
}

const g = (
  id: string,
  en: string,
  ar: string,
  discipline: DisciplineId,
  graduated: number,
  skills: SkillId[],
  industry: IndustryId,
  role: Localized,
  employer: Localized,
  location: Localized,
  mentorship: MentorshipAvailability,
  offer: Localized,
): Graduate => ({ id, sample: true, name: { en, ar }, discipline, graduated, skills, industry, role, employer, location, mentorship, offer })

const MUSCAT = { en: 'Muscat', ar: 'مسقط' }
const SOHAR = { en: 'Sohar', ar: 'صحار' }
const DUQM = { en: 'Duqm', ar: 'الدقم' }
const SALALAH = { en: 'Salalah', ar: 'صلالة' }
const NIZWA = { en: 'Nizwa', ar: 'نزوى' }

export const GRADUATES: Graduate[] = [
  g('g-01', 'Hilal A.', 'هلال ع.', 'petroleum', 2016, ['reservoir', 'data', 'management'], 'energy', { en: 'Reservoir engineer', ar: 'مهندس مكامن' }, { en: 'An energy operator', ar: 'شركة تشغيل في قطاع الطاقة' }, MUSCAT, 'open', { en: 'Choosing electives and first-year field rotations', ar: 'اختيار المقررات الاختيارية وتدوير العمل الميداني في السنة الأولى' }),
  g('g-02', 'Fatma S.', 'فاطمة س.', 'civil', 2018, ['structures', 'management', 'sustainability'], 'construction', { en: 'Structural engineer', ar: 'مهندسة إنشائية' }, { en: 'A design consultancy', ar: 'مكتب استشارات تصميم' }, MUSCAT, 'open', { en: 'Reviewing design reports and site safety', ar: 'مراجعة تقارير التصميم وسلامة المواقع' }),
  g('g-03', 'Badr K.', 'بدر ك.', 'electrical', 2014, ['power', 'management'], 'utilities', { en: 'Grid planning lead', ar: 'قائد تخطيط الشبكات' }, { en: 'A power utility', ar: 'مرفق للطاقة الكهربائية' }, MUSCAT, 'limited', { en: 'Power systems careers and graduate study', ar: 'المسارات المهنية في أنظمة القدرة والدراسات العليا' }),
  g('g-04', 'Amal H.', 'آمال ح.', 'chemical', 2019, ['process', 'hse', 'simulation'], 'manufacturing', { en: 'Process engineer', ar: 'مهندسة عمليات' }, { en: 'A petrochemical plant', ar: 'مصنع بتروكيماويات' }, SOHAR, 'open', { en: 'Process simulation and plant life', ar: 'محاكاة العمليات والعمل في المصانع' }),
  g('g-05', 'Mazin R.', 'مازن ر.', 'mechatronics', 2021, ['robotics', 'embedded', 'programming'], 'telecom', { en: 'Automation engineer', ar: 'مهندس أتمتة' }, { en: 'A technology integrator', ar: 'شركة تكامل تقني' }, MUSCAT, 'open', { en: 'Robotics projects and embedded software', ar: 'مشاريع الروبوتات والبرمجيات المدمجة' }),
  g('g-06', 'Nada F.', 'ندى ف.', 'industrial', 2017, ['quality', 'data', 'management'], 'manufacturing', { en: 'Operations manager', ar: 'مديرة عمليات' }, { en: 'A manufacturing company', ar: 'شركة تصنيع' }, SOHAR, 'limited', { en: 'Lean improvement and leading teams', ar: 'التحسين الرشيق وقيادة الفرق' }),
  g('g-07', 'Saif M.', 'سيف م.', 'mechanical', 2015, ['cad', 'simulation', 'quality'], 'energy', { en: 'Rotating equipment engineer', ar: 'مهندس معدات دوّارة' }, { en: 'An energy operator', ar: 'شركة تشغيل في قطاع الطاقة' }, DUQM, 'closed', { en: 'Pumps, compressors and maintenance', ar: 'المضخات والضواغط والصيانة' }),
  g('g-08', 'Iman B.', 'إيمان ب.', 'electrical', 2022, ['embedded', 'programming', 'data'], 'telecom', { en: 'Network engineer', ar: 'مهندسة شبكات' }, { en: 'A telecom provider', ar: 'مزوّد خدمات اتصالات' }, MUSCAT, 'open', { en: 'Interview preparation and first jobs', ar: 'الاستعداد للمقابلات والوظائف الأولى' }),
  g('g-09', 'Tariq W.', 'طارق و.', 'civil', 2012, ['structures', 'management'], 'public', { en: 'Infrastructure planner', ar: 'مخطط بنية تحتية' }, { en: 'A government authority', ar: 'جهة حكومية' }, MUSCAT, 'limited', { en: 'Public-sector engineering careers', ar: 'المسارات الهندسية في القطاع العام' }),
  g('g-10', 'Ruqaya J.', 'رقية ج.', 'chemical', 2020, ['process', 'sustainability', 'data'], 'research', { en: 'Research engineer', ar: 'مهندسة أبحاث' }, { en: 'A university research centre', ar: 'مركز أبحاث جامعي' }, MUSCAT, 'open', { en: 'Research careers and graduate applications', ar: 'المسارات البحثية وطلبات الدراسات العليا' }),
  g('g-11', 'Yaqoob N.', 'يعقوب ن.', 'petroleum', 2013, ['reservoir', 'hse'], 'energy', { en: 'Drilling superintendent', ar: 'مشرف حفر' }, { en: 'A drilling contractor', ar: 'مقاول حفر' }, SALALAH, 'closed', { en: 'Drilling operations', ar: 'عمليات الحفر' }),
  g('g-12', 'Maha Q.', 'مها ق.', 'mechanical', 2023, ['cad', 'sustainability'], 'consulting', { en: 'HVAC design engineer', ar: 'مهندسة تصميم تكييف' }, { en: 'A building services consultancy', ar: 'مكتب استشارات للخدمات الإنشائية' }, MUSCAT, 'open', { en: 'Building services and first-year projects', ar: 'خدمات المباني ومشاريع السنة الأولى' }),
  g('g-13', 'Adil T.', 'عادل ت.', 'industrial', 2024, ['data', 'quality'], 'consulting', { en: 'Supply-chain analyst', ar: 'محلل سلاسل إمداد' }, { en: 'An operations consultancy', ar: 'مكتب استشارات تشغيلية' }, MUSCAT, 'open', { en: 'Data skills that employers ask for', ar: 'مهارات البيانات التي يطلبها أصحاب العمل' }),
  g('g-14', 'Kawthar A.', 'كوثر ع.', 'mechatronics', 2025, ['robotics', 'cad'], 'manufacturing', { en: 'Graduate engineer', ar: 'مهندسة حديثة التخرج' }, { en: 'A manufacturing company', ar: 'شركة تصنيع' }, NIZWA, 'open', { en: 'Capstone projects and the first months at work', ar: 'مشاريع التخرج والأشهر الأولى في العمل' }),
  g('g-15', 'Hamood S.', 'حمود س.', 'civil', 2019, ['structures', 'sustainability', 'cad'], 'construction', { en: 'Project engineer', ar: 'مهندس مشاريع' }, { en: 'A construction contractor', ar: 'مقاول إنشاءات' }, DUQM, 'limited', { en: 'Life on large construction sites', ar: 'العمل في مواقع الإنشاءات الكبرى' }),
  g('g-16', 'Sara L.', 'سارة ل.', 'electrical', 2018, ['power', 'sustainability'], 'energy', { en: 'Renewables engineer', ar: 'مهندسة طاقة متجددة' }, { en: 'A renewable energy developer', ar: 'مطوّر مشاريع طاقة متجددة' }, MUSCAT, 'open', { en: 'Solar projects and grid connection', ar: 'مشاريع الطاقة الشمسية والربط بالشبكة' }),
  g('g-17', 'Khamis D.', 'خميس د.', 'mechanical', 2011, ['management', 'quality', 'hse'], 'manufacturing', { en: 'Plant manager', ar: 'مدير مصنع' }, { en: 'A manufacturing company', ar: 'شركة تصنيع' }, SOHAR, 'closed', { en: 'Leadership in operations', ar: 'القيادة في العمليات' }),
  g('g-18', 'Wafa O.', 'وفاء ع.', 'chemical', 2022, ['process', 'data'], 'utilities', { en: 'Water treatment engineer', ar: 'مهندسة معالجة مياه' }, { en: 'A water utility', ar: 'مرفق للمياه' }, NIZWA, 'open', { en: 'Water and environment careers', ar: 'المسارات المهنية في المياه والبيئة' }),
]
