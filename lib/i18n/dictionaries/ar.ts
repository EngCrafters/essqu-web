import { pluralAr } from '../plural'
import type { Dictionary } from './en'
import { platformAr } from './platform-ar'

/** واجهة الموقع بالعربية. البنية مطابقة للقاموس الإنجليزي، ويتحقق TypeScript من اكتمالها. */
export const ar: Dictionary = {
  meta: {
    title: 'الجماعة الهندسية — جامعة السلطان قابوس',
    description:
      'الجماعة الهندسية في جامعة السلطان قابوس: اكتشف الفعاليات، وشارك المشاريع، واحفظ الإنجازات، وتواصل مع زملائك عبر التخصصات الهندسية.',
    aboutTitle: 'عن الجماعة — الجماعة الهندسية',
    aboutDescription: 'تعرّف على الجماعة الهندسية في جامعة السلطان قابوس: من نحن، وكيف تُنظَّم الجماعة.',
    archiveTitle: 'الأنشطة السابقة — الجماعة الهندسية',
    archiveDescription: 'النسخ السابقة من برامج الجماعة الهندسية في جامعة السلطان قابوس.',
  },

  site: {
    name: 'الجماعة الهندسية',
    affiliation: 'جامعة السلطان قابوس',
    eyebrow: 'الجماعة الهندسية · جامعة السلطان قابوس',
  },

  common: {
    skipToContent: 'تخطَّ إلى المحتوى',
    sample: 'تجريبي',
    preview: 'معاينة',
    close: 'إغلاق',
    opensInNewTab: '(يُفتح في علامة تبويب جديدة)',
    photoToCome: 'الصورة قريبًا',
    toBeAnnounced: 'يُعلن لاحقًا',
    comma: '، ',
  },

  nav: {
    sectionsLabel: 'أقسام الموقع',
    links: {
      events: 'الفعاليات',
      projects: 'المشاريع',
      disciplines: 'التخصصات',
      activities: 'الأرشيف',
      about: 'من نحن',
    },
    join: 'انضم إلى الجماعة',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    backToTop: '، العودة إلى الأعلى',
    home: '، الصفحة الرئيسية',
    language: 'اللغة',
    switchTo: 'التبديل إلى العربية',
    homePage: 'الرئيسية',
    breadcrumb: 'مسار التنقل',
  },

  hero: {
    titleStart: 'حيث تتشكّل',
    titleEnd: 'الأفكار',
    lead: 'تعرّف على مجتمعك، وابنِ المشاريع، واكتشف التجارب التي تمضي بمسيرتك الهندسية قُدُمًا.',
    exploreEvents: 'استكشف الفعاليات',
    discoverProjects: 'اكتشف المشاريع',
    caption: 'تخصصات متعددة، وجماعة واحدة.',
  },

  stats: {
    title: 'الجماعة في أرقام',
    factsTitle: 'الجماعة في سطور',
    placeholder: 'رقم موثّق قريبًا',
    pendingNote: 'تظهر الأرقام هنا بعد تأكيدها من سجلات الجماعة وإحصاءات زيارات الموقع.',
    demoTag: 'رقم توضيحي',
    demoNote: 'أرقام توضيحية لأغراض المعاينة فقط، وليست إحصاءات موثّقة للجماعة.',
    yearRange: (from: number, to: number) => `من ${from} إلى ${to}`,
    seeNote: (n: number) => `(انظر الملاحظة ${n})`,
    note: (n: number) => `ملاحظة ${n}:`,
  },

  overview: {
    more: 'المزيد عن الجماعة',
  },

  events: {
    title: 'اكتشف تجربتك القادمة.',
    sampleStrong: 'فعاليات تجريبية.',
    sampleBody: 'لم تُنشر أي فعاليات على المنصة بعد، وهذه أمثلة توضّح طريقة ظهورها.',
    alsoComingUp: 'فعاليات قادمة أيضًا',
    empty: 'لا توجد فعاليات مجدولة حاليًا. ستظهر الورش والمحاضرات الجديدة هنا فور نشرها من اللجان.',
    dateTime: 'التاريخ والوقت',
    location: 'المكان',
    featured: 'فعالية مميّزة',
    timezone: 'بتوقيت عُمان (UTC+4)',
    types: { workshop: 'ورشة عمل', talk: 'محاضرة', 'site-visit': 'زيارة ميدانية', competition: 'مسابقة' },
    registration: {
      open: 'التسجيل مفتوح',
      waitlist: 'قائمة الانتظار فقط',
      closed: 'التسجيل مغلق',
      preview: 'يُفتح التسجيل مع المرحلة الأولى',
    },
    previewRegistration: 'معاينة التسجيل',
    previewFor: (label: string, title: string) => `${label}: ${title}`,
    actions: { open: 'سجّل', waitlist: 'انضم إلى قائمة الانتظار', closed: 'عرض الفعالية' },
    unavailable: 'تعذّر عرض الفعاليات الآن. يُرجى المحاولة بعد قليل.',
  },

  projects: {
    title: 'من صنع مجتمعنا.',
    lead: 'مشاريع ومنشورات محفوظة مع تخصصها وسنتها وفريقها، ليبني كل جيل على ما أنجزه من سبقه بدل أن يبدأ من الصفر.',
    noteStrong: 'أعمال فائزة.',
    noteBody: 'مشاريع نالت التقدير في معارض الجماعة وخارجها. صفحات المشاريع الكاملة قريبًا.',
    filterLabel: 'تصفية المشاريع حسب التخصص',
    all: 'الكل',
    showingAll: (n: number) => `عرض جميع المشاريع (${n})`,
    showingIn: (n: number, discipline: string) =>
      `عرض ${pluralAr(n, {
        one: () => 'مشروع واحد',
        two: () => 'مشروعين',
        few: (c) => `${c} مشاريع`,
        many: (c) => `${c} مشروعًا`,
        other: (c) => `${c} مشروع`,
      })} في ${discipline}`,
    alsoInArchive: 'مشاريع أخرى',
    onlyOne: 'هذا هو المشروع الوحيد في هذا التخصص حتى الآن.',
    archiveOpens: 'صفحة المشروع الكاملة قريبًا',
    discipline: 'التخصص',
    year: 'السنة',
    team: 'الفريق',
    teamOf: (n: number) =>
      pluralAr(n, {
        one: () => 'فريق من عضو واحد',
        two: () => 'فريق من عضوين',
        few: (c) => `فريق من ${c} أعضاء`,
        many: (c) => `فريق من ${c} عضوًا`,
        other: (c) => `فريق من ${c} عضو`,
      }),
  },

  disciplines: {
    title: 'تخصصات مختلفة، وطموح مشترك.',
    sampleProjects: 'المشاريع',
    sampleProjectsIn: (name: string) => `المشاريع في تخصص ${name}`,
  },

  activities: {
    title: 'أنشطة الجماعة الهندسية',
    lead: 'استكشف البرامج والملتقيات والتجارب التي تجمع مجتمعنا.',
    figuresStrong: 'أرقام البرامج قريبًا.',
    figuresBody: 'ستظهر مع كل برنامج بعد أن تؤكدها الجماعة.',
    photosStrong: 'الصور والأرقام قريبًا.',
    photosBody: 'ستظهر مع كل برنامج بعد أن توفّرها الجماعة وتؤكدها.',
    explorePrevious: 'استكشف الأنشطة السابقة',
    previousEditions: 'النسخ السابقة',
    date: 'التاريخ',
    attendance: 'الحضور',
    attendees: (n: number, shown: string) =>
      pluralAr(n, {
        one: () => 'حاضر واحد',
        two: () => 'حاضران',
        few: () => `${shown} حاضرين`,
        many: () => `${shown} حاضرًا`,
        other: () => `${shown} حاضر`,
      }),
    visitors: (n: number, shown: string) =>
      pluralAr(n, {
        one: () => 'زائر واحد',
        two: () => 'زائران',
        few: () => `${shown} زوّار`,
        many: () => `${shown} زائرًا`,
        other: () => `${shown} زائر`,
      }),
    slideOf: (i: number, n: number) => `${i} من ${n}`,
    showSlide: (i: number, title: string) => `اعرض الشريحة ${i}: ${title}`,
    pause: 'إيقاف العرض مؤقتًا',
    play: 'تشغيل العرض',
  },

  leadership: {
    title: 'تعرّف على قيادة الجماعة',
    rosterStrong: 'الأسماء قريبًا.',
    rosterBody: 'ستظهر الأسماء والصور والدورة الحالية هنا بعد أن تؤكدها الجماعة.',
    viewStructure: 'اعرض الهيكل التنظيمي الكامل',
    seniorLeadership: 'الإدارة العليا',
    vicePresidents: 'نواب الرئيس',
    nameToBeAnnounced: 'سيُعلن الاسم لاحقًا',
  },

  structure: {
    title: 'الهيكل التنظيمي للجماعة',
    lead: 'ترسم الإدارة العليا التوجّه، وتنهض اللجان وفرقها بعمل الجماعة.',
    rosterStrong: 'الأسماء قريبًا.',
    rosterBody: 'ستُضاف الأسماء والصور ورؤساء اللجان ونوابهم بعد أن تؤكد الجماعة تشكيلها الحالي.',
    committees: 'اللجان',
    teamsIn: (committee: string) => `فرق ${committee}`,
  },

  join: {
    title: 'اجعل فكرتك القادمة فكرةً مشتركة',
    body: 'تبدأ العضوية بملف شخصي دائم واحد يجمع فعالياتك وشهاداتك ومشاريعك في مكان واحد، ويرافقك عامًا بعد عام. تسجيل الأعضاء جزء من الإصدار الأول للمنصة.',
    join: 'انضم إلى الجماعة',
    exploreEvents: 'استكشف الفعاليات',
  },

  footer: {
    tagline: 'اكتشف الفعاليات، وشارك المشاريع، واحفظ الإنجازات.',
    studentSocietyAt: 'جماعة طلابية في',
    squAlt: 'جامعة السلطان قابوس',
    follow: 'تابع الجماعة',
    linkToCome: 'الرابط قريبًا',
    navLabel: 'روابط التذييل',
    copyright: (year: number, name: string, affiliation: string) => `© ${year} ${name}، ${affiliation}.`,
    previewSite: 'نسخة تجريبية من الموقع، وتصل ميزات المنصة على مراحل.',
    groups: { society: 'الجماعة', explore: 'استكشف', community: 'المجتمع' },
  },

  about: {
    title: 'عن الجماعة',
    lead: 'منظمة طلابية يديرها الطلاب في كلية الهندسة، وهي المظلة الجامعة للجمعيات الهندسية السبع في الكلية.',
  },

  archive: {
    eyebrow: 'أنشطة الجماعة الهندسية',
    title: 'الأنشطة السابقة',
    lead: 'سجلّ للنسخ السابقة من برامج الجماعة، مرتّبة حسب البرنامج والسنة.',
    regionLabel: 'أرشيف الأنشطة السابقة',
    emptyTitle: 'لم تُؤرشف أي أنشطة سابقة بعد.',
    emptyBody:
      'كلما وثّقت الجماعة نسخة سابقة من برامجها، ستُدرج هنا حسب البرنامج والسنة، مع الصور متى توفّرت.',
    back: 'العودة إلى الأنشطة',
    toBeArchived: 'برامج ستُؤرشف',
    filterProgramme: 'التصفية حسب البرنامج',
    filterYear: 'التصفية حسب السنة',
    allProgrammes: 'كل البرامج',
    allYears: 'كل السنوات',
    showing: (n: number) =>
      `عرض ${pluralAr(n, {
        zero: () => 'لا نسخ',
        one: () => 'نسخة واحدة',
        two: () => 'نسختين',
        few: (c) => `${c} نسخ`,
        many: (c) => `${c} نسخة`,
        other: (c) => `${c} نسخة`,
      })}`,
    noMatch: 'لا توجد نسخ تطابق هذه التصفية.',
    viewEdition: 'اعرض هذه النسخة',
  },

  platform: platformAr,
}
