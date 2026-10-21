import { pluralAr } from '../plural'
import { certificatesAr, networkAr } from './pages/vault'
import { membersAr, registerAr } from './pages/people'
import { accountAr } from './pages/account'
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

  comingSoon: {
    title: 'قريباً',
    body: 'يجري حالياً إعداد هذا الجزء من منصة الجماعة الهندسية.',
    tag: 'قريباً',
    status: 'قيد الإعداد',
    explore: 'استكشف الفعاليات',
    archive: 'تصفّح الأرشيف',
    metaTitle: (name: string) => `${name} · قريباً · الجماعة الهندسية`,
    sheetLabel: (name: string) => `لوحة رسم لوحدة ${name}، قيد الإعداد`,
    titleBlock: { module: 'الوحدة', status: 'الحالة', sheet: 'اللوحة' },
    modules: {
      projects: { name: 'المشاريع', note: 'مشاريع الجماعة بمراحلها ووسائطها وفرقها، مجموعة في كتالوج واحد.' },
      members: { name: 'الأعضاء', note: 'دليل لأعضاء الجماعة والمشاريع التي يبنونها معاً.' },
      network: { name: 'شبكة الخريجين', note: 'خريجو الجماعة، والإرشاد للأعضاء الحاليين.' },
      certificates: { name: 'الشهادات', note: 'شهادات المشاركة، ومكتب للتحقق منها.' },
      register: { name: 'العضوية', note: 'يُفتح التسجيل في الجماعة الهندسية على المنصة لاحقاً.' },
      events: { name: 'الفعاليات', note: 'ورش العمل والزيارات والمسابقات، مع التسجيل وتأكيد الحضور.' },
      profile: { name: 'ملفي', note: 'عضويتك وبياناتك والفعاليات والمشاريع التي تشارك فيها.' },
    },
    register: {
      eyebrow: 'العضوية',
      title: 'تُفتح العضوية قريباً.',
      lead: 'يجري إعداد التسجيل في الجماعة الهندسية. سيحمل كل عضو بطاقة كهذه.',
      card: 'بطاقة العضوية',
      sample: 'توضيحية',
      name: { en: 'Ahmed S.', ar: 'أحمد س.' },
      number: 'رقم العضوية',
      numberValue: 'ES-24-0142',
      year: 'السنة',
      since: 'عضو منذ',
      backTitle: 'قريباً',
      backBody: 'سيُتاح التسجيل في العضوية على المنصة لاحقاً.',
      society: 'الجماعة الهندسية',
      university: 'جامعة السلطان قابوس',
      turn: 'اقلب البطاقة',
      front: 'الوجه الأمامي للبطاقة',
      back: 'الوجه الخلفي للبطاقة',
      dimensions: 'بطاقة ID-1',
      mm: 'مم',
      sampleNote: 'بطاقة توضيحية. أحمد س. وهذه التفاصيل للعرض فقط.',
    },
  },

  disciplinesPage: disciplinesAr,
  aboutPage: aboutAr,
  leadershipPage: leadershipAr,
  activitiesPage: activitiesAr,
  eventsPage: eventsAr,
  projectsPage: projectsAr,
  registerPage: registerAr,
  accountPage: accountAr,
  membersPage: membersAr,
  certificatesPage: certificatesAr,
  networkPage: networkAr,
}
