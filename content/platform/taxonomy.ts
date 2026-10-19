import type { Localized } from '@/lib/i18n'

/**
 * Shared vocabularies for the platform prototype: skills (members and graduates), project
 * technologies and types, and graduate industries. Filters are built from these, so a label
 * changes here once and everywhere.
 */

export const SKILLS = {
  cad: { en: 'CAD & 3D modelling', ar: 'التصميم بمساعدة الحاسوب' },
  simulation: { en: 'Simulation & FEA', ar: 'المحاكاة وتحليل العناصر المحدودة' },
  embedded: { en: 'Embedded systems', ar: 'الأنظمة المدمجة' },
  robotics: { en: 'Robotics & control', ar: 'الروبوتات والتحكم' },
  structures: { en: 'Structural analysis', ar: 'التحليل الإنشائي' },
  process: { en: 'Process design', ar: 'تصميم العمليات' },
  data: { en: 'Data analysis', ar: 'تحليل البيانات' },
  programming: { en: 'Programming', ar: 'البرمجة' },
  power: { en: 'Power systems', ar: 'أنظمة القدرة' },
  reservoir: { en: 'Reservoir engineering', ar: 'هندسة المكامن' },
  quality: { en: 'Quality & lean', ar: 'الجودة والإنتاج الرشيق' },
  management: { en: 'Project management', ar: 'إدارة المشاريع' },
  sustainability: { en: 'Sustainability', ar: 'الاستدامة' },
  hse: { en: 'Health & safety', ar: 'الصحة والسلامة' },
} satisfies Record<string, Localized>

export type SkillId = keyof typeof SKILLS

export const TECHNOLOGIES = {
  arduino: { en: 'Arduino', ar: 'Arduino' },
  esp32: { en: 'ESP32', ar: 'ESP32' },
  raspberrypi: { en: 'Raspberry Pi', ar: 'Raspberry Pi' },
  matlab: { en: 'MATLAB', ar: 'MATLAB' },
  python: { en: 'Python', ar: 'Python' },
  solidworks: { en: 'SolidWorks', ar: 'SolidWorks' },
  ansys: { en: 'ANSYS', ar: 'ANSYS' },
  autocad: { en: 'AutoCAD', ar: 'AutoCAD' },
  aspen: { en: 'Aspen HYSYS', ar: 'Aspen HYSYS' },
  lora: { en: 'LoRa radio', ar: 'اتصال LoRa' },
  vision: { en: 'Computer vision', ar: 'الرؤية الحاسوبية' },
  plc: { en: 'PLC', ar: 'المتحكمات المنطقية PLC' },
  printing: { en: '3D printing', ar: 'الطباعة ثلاثية الأبعاد' },
  sensors: { en: 'Sensor arrays', ar: 'مصفوفات الاستشعار' },
} satisfies Record<string, Localized>

export type TechnologyId = keyof typeof TECHNOLOGIES

export const PROJECT_TYPES = {
  capstone: { en: 'Capstone', ar: 'مشروع تخرج' },
  competition: { en: 'Competition', ar: 'مسابقة' },
  research: { en: 'Research', ar: 'بحث' },
  course: { en: 'Course project', ar: 'مشروع مقرر' },
} satisfies Record<string, Localized>

export type ProjectTypeId = keyof typeof PROJECT_TYPES

export const INDUSTRIES = {
  energy: { en: 'Energy', ar: 'الطاقة' },
  construction: { en: 'Construction', ar: 'الإنشاءات' },
  manufacturing: { en: 'Manufacturing', ar: 'التصنيع' },
  utilities: { en: 'Utilities', ar: 'المرافق' },
  telecom: { en: 'Telecom & technology', ar: 'الاتصالات والتقنية' },
  consulting: { en: 'Consulting', ar: 'الاستشارات' },
  research: { en: 'Research & academia', ar: 'البحث والأوساط الأكاديمية' },
  public: { en: 'Public sector', ar: 'القطاع العام' },
} satisfies Record<string, Localized>

export type IndustryId = keyof typeof INDUSTRIES

/** Each discipline's colour key: the logo's four quadrant colours, extended for seven. */
export const DISCIPLINE_COLOR = {
  mechanical: '#ae1806',
  electrical: '#7eba0c',
  civil: '#0066ae',
  petroleum: '#eacc2a',
  chemical: '#2a9d8f',
  mechatronics: '#234bc4',
  industrial: '#8a5a44',
} as const
