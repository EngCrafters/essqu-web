import type { DisciplineId } from '@/content/disciplines'
import type { Localized } from '@/lib/i18n'
import type { SkillId } from './taxonomy'

/**
 * SAMPLE CONTENT: fictional members for the directory, profiles and attendance history.
 *
 * These are not real people. Names are a first name and an initial only, and no student ID,
 * email or phone number exists anywhere in the public data: the platform will expose personal
 * details only to authorised roles (PRD NFR-04). Projects and certificates are linked from
 * their own records (projects.ts `contributors`, certificates.ts `member`), not duplicated here.
 */

export type AttendanceStatus = 'registered' | 'attended' | 'absent' | 'pending'

export interface AttendanceRecord {
  /** An event slug from content/platform/events.ts. */
  event: string
  status: AttendanceStatus
}

export interface Member {
  id: string
  sample: true
  name: Localized
  discipline: DisciplineId
  /** Academic year, 1–5. */
  year: number
  /** 'YYYY-MM' */
  joined: string
  expectedGraduation: number
  interests: SkillId[]
  headline: Localized
  attendance: AttendanceRecord[]
}

const m = (
  id: string,
  en: string,
  ar: string,
  discipline: DisciplineId,
  year: number,
  joined: string,
  interests: SkillId[],
  headline: Localized,
  attendance: AttendanceRecord[] = [],
): Member => ({
  id,
  sample: true,
  name: { en, ar },
  discipline,
  year,
  joined,
  // A five-year programme: in the 2026–27 academic year, a fourth-year member graduates in 2028.
  expectedGraduation: 2027 + (5 - year),
  interests,
  headline,
  attendance,
})

const a = (event: string, status: AttendanceStatus): AttendanceRecord => ({ event, status })

export const MEMBERS: Member[] = [
  m('m-01', 'Ahmed K.', 'أحمد ك.', 'mechanical', 4, '2023-09', ['cad', 'simulation', 'sustainability'], { en: 'Thermal comfort and test rigs', ar: 'الراحة الحرارية ومنصات الاختبار' }, [a('lab-safety-essentials', 'attended'), a('gathering-exhibition-2026', 'attended'), a('solidworks-bootcamp', 'registered')]),
  m('m-02', 'Maryam A.', 'مريم ع.', 'civil', 3, '2024-09', ['structures', 'cad'], { en: 'Bridges, models and shake tables', ar: 'الجسور والنماذج وطاولات الاهتزاز' }, [a('bridge-design-challenge', 'attended'), a('sustainable-infrastructure-visit', 'registered')]),
  m('m-03', 'Yousuf H.', 'يوسف ح.', 'mechatronics', 4, '2023-09', ['robotics', 'embedded', 'programming'], { en: 'Control loops that behave', ar: 'حلقات تحكّم منضبطة' }, [a('gathering-exhibition-2026', 'attended'), a('intro-robotics-workshop', 'registered')]),
  m('m-04', 'Salma R.', 'سلمى ر.', 'petroleum', 4, '2023-09', ['reservoir', 'data', 'hse'], { en: 'Wells, pressure and data', ar: 'الآبار والضغط والبيانات' }, [a('reservoir-seminar', 'registered'), a('lab-safety-essentials', 'attended')]),
  m('m-05', 'Khalid N.', 'خالد ن.', 'electrical', 3, '2024-09', ['embedded', 'power', 'programming'], { en: 'Low-power sensing in the field', ar: 'الاستشعار منخفض الطاقة في الميدان' }, [a('smart-campus-hackathon', 'registered')]),
  m('m-06', 'Noor B.', 'نور ب.', 'industrial', 2, '2025-09', ['quality', 'data', 'management'], { en: 'Finding the bottleneck', ar: 'البحث عن عنق الزجاجة' }, [a('solidworks-bootcamp', 'registered')]),
  m('m-07', 'Huda S.', 'هدى س.', 'mechatronics', 4, '2023-09', ['robotics', 'cad', 'programming', 'management'], { en: 'Robots that sort, steer and follow lines', ar: 'روبوتات تفرز وتوجّه وتتبع الخطوط' }, [
    a('lab-safety-essentials', 'attended'),
    a('gathering-exhibition-2026', 'attended'),
    a('bridge-design-challenge', 'absent'),
    a('leadership-evening-2026', 'attended'),
    a('campus-to-career-2026', 'pending'),
    a('intro-robotics-workshop', 'registered'),
    a('smart-campus-hackathon', 'registered'),
  ]),
  m('m-08', 'Faisal M.', 'فيصل م.', 'electrical', 4, '2023-09', ['power', 'programming', 'data'], { en: 'Microgrids and scheduling', ar: 'الشبكات المصغّرة والجدولة' }, [a('leadership-evening-2026', 'attended')]),
  m('m-09', 'Aisha D.', 'عائشة د.', 'mechanical', 3, '2024-09', ['simulation', 'cad'], { en: 'Measuring what others estimate', ar: 'قياس ما يقدّره الآخرون' }, [a('solidworks-bootcamp', 'registered'), a('bridge-design-challenge', 'attended')]),
  m('m-10', 'Omar J.', 'عمر ج.', 'civil', 4, '2023-09', ['structures', 'sustainability'], { en: 'Shade, airflow and comfort', ar: 'الظل وحركة الهواء والراحة' }, [a('gathering-exhibition-2026', 'attended')]),
  m('m-11', 'Zainab T.', 'زينب ت.', 'chemical', 2, '2025-09', ['process', 'hse'], { en: 'Process safety first', ar: 'سلامة العمليات أولًا' }, [a('lab-safety-essentials', 'attended'), a('process-plant-visit', 'registered')]),
  m('m-12', 'Hamed Q.', 'حامد ق.', 'mechatronics', 3, '2024-09', ['robotics', 'programming'], { en: 'Vision for small robots', ar: 'الرؤية للروبوتات الصغيرة' }, [a('intro-robotics-workshop', 'registered')]),
  m('m-13', 'Reem L.', 'ريم ل.', 'petroleum', 3, '2024-09', ['reservoir', 'simulation'], { en: 'Reading the subsurface', ar: 'قراءة ما تحت السطح' }, [a('reservoir-seminar', 'registered')]),
  m('m-14', 'Said W.', 'سعيد و.', 'civil', 4, '2023-09', ['structures', 'management'], { en: 'Site work and steel', ar: 'أعمال الموقع والفولاذ' }, [a('sustainable-infrastructure-visit', 'registered'), a('bridge-design-challenge', 'attended')]),
  m('m-15', 'Muna F.', 'منى ف.', 'industrial', 4, '2023-09', ['quality', 'process', 'data'], { en: 'Lean lines and clean data', ar: 'خطوط رشيقة وبيانات نظيفة' }, [a('campus-to-career-2026', 'attended')]),
  m('m-16', 'Talal Y.', 'طلال ي.', 'electrical', 2, '2025-09', ['embedded', 'programming'], { en: 'First radio, first network', ar: 'أول جهاز لاسلكي وأول شبكة' }, [a('smart-campus-hackathon', 'registered')]),
  m('m-17', 'Shamsa K.', 'شمسة ك.', 'mechanical', 4, '2023-09', ['cad', 'simulation', 'quality'], { en: 'Gears, losses and lubricants', ar: 'التروس والفواقد ومواد التشحيم' }, [a('leadership-evening-2026', 'attended'), a('solidworks-bootcamp', 'registered')]),
  m('m-18', 'Ibrahim A.', 'إبراهيم ع.', 'electrical', 1, '2026-09', ['programming'], { en: 'New to the society', ar: 'عضو جديد في الجماعة' }, [a('intro-robotics-workshop', 'registered')]),
  m('m-19', 'Laila G.', 'ليلى غ.', 'civil', 3, '2024-09', ['structures', 'cad', 'sustainability'], { en: 'Lightweight structures', ar: 'المنشآت الخفيفة' }, [a('bridge-design-challenge', 'attended')]),
  m('m-20', 'Majid S.', 'ماجد ص.', 'chemical', 4, '2023-09', ['process', 'simulation'], { en: 'Separation, step by step', ar: 'الفصل خطوة بخطوة' }, [a('process-plant-visit', 'registered'), a('lab-safety-essentials', 'attended')]),
  m('m-21', 'Asma H.', 'أسماء ح.', 'mechatronics', 2, '2025-09', ['robotics', 'cad'], { en: 'Grippers and linkages', ar: 'الملاقط والروابط الميكانيكية' }, [a('intro-robotics-workshop', 'registered')]),
  m('m-22', 'Nasser O.', 'ناصر ع.', 'electrical', 4, '2023-09', ['power', 'embedded', 'data'], { en: 'Energy you can measure', ar: 'طاقة يمكن قياسها' }, [a('gathering-exhibition-2026', 'attended')]),
  m('m-23', 'Rawan M.', 'روان م.', 'civil', 1, '2026-09', ['cad'], { en: 'Drawing her first section', ar: 'ترسم أول مقطع لها' }, [a('sustainable-infrastructure-visit', 'registered')]),
  m('m-24', 'Sultan B.', 'سلطان ب.', 'industrial', 3, '2024-09', ['quality', 'management'], { en: 'Timing every station', ar: 'توقيت كل محطة' }, [a('campus-to-career-2026', 'attended')]),
]

/** The member the prototype treats as "signed in" for /profile, /profile/events and /certificates. */
export const DEMO_MEMBER_ID = 'm-07'
