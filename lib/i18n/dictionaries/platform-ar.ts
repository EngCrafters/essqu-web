import { pluralAr } from '../plural'
import { certificatesAr, networkAr } from './pages/vault'
import { membersAr, registerAr } from './pages/people'
import { projectsAr } from './pages/projects'
import { activitiesAr, eventsAr } from './pages/events'
import { aboutAr, leadershipAr } from './pages/about'
import { disciplinesAr } from './pages/disciplines'
import type { PlatformDictionary } from './platform-en'

const results = (n: number) =>
  pluralAr(n, {
    zero: () => 'لا نتائج',
    one: () => 'نتيجة واحدة',
    two: () => 'نتيجتان',
    few: (c) => `${c} نتائج`,
    many: (c) => `${c} نتيجة`,
    other: (c) => `${c} نتيجة`,
  })

/** واجهة صفحات المنصة بالعربية، مطابقة لبنية platform-en.ts. */
export const platformAr: PlatformDictionary = {
  nav: {
    community: 'المجتمع',
    communityLabel: 'صفحات المجتمع',
    members: 'الأعضاء',
    membersNote: 'دليل أعضاء الجماعة',
    network: 'شبكة الخريجين',
    networkNote: 'الخريجون والإرشاد',
    leadership: 'القيادة',
    leadershipNote: 'كيف تُدار الجماعة',
    certificates: 'الشهادات',
    certificatesNote: 'شهاداتك والتحقق منها',
    profile: 'ملفي',
    profileNote: 'مسيرتك الهندسية',
    register: 'انضم إلى الجماعة',
    menuSections: 'استكشف',
  },

  sample: {
    strong: 'معاينة المنصة.',
    body: 'الأشخاص والفعاليات والمشاريع والأرقام والشهادات في هذه الصفحات بيانات تجريبية، ولا يُرسل أي شيء تفعله هنا ولا يُحفظ خارج علامة التبويب هذه.',
    tag: 'تجريبي',
  },

  filters: {
    search: 'بحث',
    filters: 'التصفية',
    clearAll: 'مسح الكل',
    all: 'الكل',
    any: 'أي',
    sort: 'الترتيب',
    close: 'إغلاق التصفية',
    apply: (n: number) => `عرض ${results(n)}`,
    results: (n: number, total: number) => (n === total ? results(n) : `${n} من ${total}`),
    active: (n: number) =>
      pluralAr(n, {
        one: () => 'تصفية واحدة مفعّلة',
        two: () => 'تصفيتان مفعّلتان',
        few: (c) => `${c} تصفيات مفعّلة`,
        many: (c) => `${c} تصفية مفعّلة`,
        other: (c) => `${c} تصفية مفعّلة`,
      }),
    remove: (label: string) => `إزالة التصفية: ${label}`,
    discipline: 'التخصص',
    year: 'السنة',
    category: 'النشاط',
    type: 'النوع',
    date: 'التاريخ',
    technology: 'التقنية',
    skills: 'المهارات',
    interests: 'الاهتمامات',
    status: 'الحالة',
    academicYear: 'السنة الدراسية',
    graduation: 'سنة التخرج',
    mentorship: 'الإرشاد',
    newest: 'الأحدث أولًا',
    oldest: 'الأقدم أولًا',
    az: 'أبجديًا',
    soonest: 'الأقرب موعدًا',
  },

  states: {
    loading: 'جارٍ التحميل',
    errorTitle: 'تعذّر التحميل',
    errorBody: 'تعذّر الوصول إلى المنصة الآن. لم يضع شيء مما اخترته، حاول مجددًا بعد قليل.',
    retry: 'حاول مجددًا',
    emptyTitle: 'لا يوجد شيء هنا بعد',
    filteredTitle: 'لا توجد نتائج تطابق هذه التصفية',
    filteredBody: 'أزل إحدى خيارات التصفية أو ابحث عن عبارة أعم.',
  },

  status: {
    open: 'التسجيل مفتوح',
    registered: 'مسجّل',
    full: 'مكتمل',
    waitlist: 'قائمة الانتظار مفتوحة',
    waitlisted: 'في قائمة الانتظار',
    closed: 'التسجيل مغلق',
    completed: 'انتهت الفعالية',
    attended: 'حضر',
    absent: 'غائب',
    pending: 'الحضور قيد التأكيد',
  },

  eventTypes: {
    workshop: 'ورشة عمل',
    talk: 'محاضرة',
    'site-visit': 'زيارة ميدانية',
    competition: 'مسابقة',
    seminar: 'ندوة',
    exhibition: 'معرض',
  },

  common: {
    back: 'رجوع',
    close: 'إغلاق',
    cancel: 'إلغاء',
    viewAll: 'عرض الكل',
    yearN: (n: number) => `السنة ${n}`,
    classOf: (n: number) => `دفعة ${n}`,
    people: (n: number) =>
      pluralAr(n, {
        one: () => 'شخص واحد',
        two: () => 'شخصان',
        few: (c) => `${c} أشخاص`,
        many: (c) => `${c} شخصًا`,
        other: (c) => `${c} شخص`,
      }),
    seatsLeft: (n: number) =>
      pluralAr(n, {
        zero: () => 'لا مقاعد متبقية',
        one: () => 'مقعد واحد متبقٍ',
        two: () => 'مقعدان متبقيان',
        few: (c) => `${c} مقاعد متبقية`,
        many: (c) => `${c} مقعدًا متبقيًا`,
        other: (c) => `${c} مقعد متبقٍ`,
      }),
    of: (a: string, b: string) => `${a} من ${b}`,
    organisedBy: 'تنظيم',
    disciplines: 'التخصصات',
    allDisciplines: 'جميع التخصصات',
    sampleRecord: 'سجل تجريبي',
  },

  notFound: {
    metaTitle: 'الصفحة غير موجودة · الجماعة الهندسية',
    code: 'خطأ 404',
    title: 'لا لوحة لهذا الرسم.',
    body: 'الصفحة التي تبعتها غير موجودة أو نُقلت. وكل ما سواها في مكانه.',
    home: 'العودة إلى الصفحة الرئيسية',
    events: 'اعرض الفعاليات القادمة',
    records: {
      event: { title: 'لا فعالية على هذا العنوان.', body: 'هذه الفعالية غير موجودة أو لم تعد مدرجة. في الخط الزمني كل الفعاليات، الماضية والقادمة.', action: 'اعرض كل الفعاليات' },
      project: { title: 'لا مشروع على هذا العنوان.', body: 'هذا المشروع غير موجود أو نُقل. يضم الكتالوج كل مشاريع الجماعة.', action: 'اعرض كل المشاريع' },
      member: { title: 'لا عضو على هذا العنوان.', body: 'هذا الملف غير موجود، أو ليس عامًا.', action: 'اعرض كل الأعضاء' },
      graduate: { title: 'لا خريج على هذا العنوان.', body: 'هذا الملف غير موجود، أو لم يعد مدرجًا في الشبكة.', action: 'اعرض شبكة الخريجين' },
      certificate: { title: 'لا شهادة بهذا الرقم.', body: 'تحقّق من الرابط، أو تحقّق من الشهادة برمزها في الخزانة.', action: 'افتح خزانة الشهادات' },
    },
  },

  disciplinesPage: disciplinesAr,
  aboutPage: aboutAr,
  leadershipPage: leadershipAr,
  activitiesPage: activitiesAr,
  eventsPage: eventsAr,
  projectsPage: projectsAr,
  registerPage: registerAr,
  membersPage: membersAr,
  certificatesPage: certificatesAr,
  networkPage: networkAr,
}
