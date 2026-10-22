import { pluralAr, pluralEn } from '../../plural'

/**
 * /about and /leadership. Every fact here comes from content/overview.ts, content/stats.ts or
 * content/structure.ts (the society's own overview and structure); the rest is interface copy.
 */
export const aboutEn = {
  metaTitle: 'About · Engineering Society',
  metaDescription: 'A student-run society at Sultan Qaboos University’s College of Engineering, and the umbrella for its seven engineering societies.',
  eyebrow: 'About the society',
  title: 'Seven engineering societies. One umbrella.',
  lead: 'A student-run organisation at the College of Engineering, and the umbrella for the college’s seven engineering societies.',
  convergenceLabel: 'Seven discipline symbols converge on the society’s emblem',
  emblemCaption: 'Engineering Society',
  scrollCue: 'Scroll to assemble',

  purposeEyebrow: 'Purpose',
  purposeTitle: 'A community built around engineering.',


  activitiesEyebrow: 'What it runs',
  activitiesTitle: 'Six activities through the year.',
  activitiesLead: 'Each activity has its own archive of past editions.',
  descriptionToCome: 'Description to come from the society.',
  openArchive: (name: string) => `Open the ${name} archive`,
  viewArchive: 'View archive',

  milestonesEyebrow: 'The record',
  milestonesTitle: 'What the record shows.',
  recordLead: 'The society’s activities and projects each year, from its founding to today.',
  activities: 'Activities',
  projects: 'Projects',
  toDate: 'to date',
  recordLabel: (year: number, activities: number, projects: number) =>
    `${year}: ${pluralEn(activities, 'activity', 'activities')}, ${pluralEn(projects, 'project', 'projects')}`,
  recordYear: 'Year',
  recordHint: 'Point at a year, or drag across the chart, to read it.',
  recordTable: 'Activities and projects by year',
  sampleFigures: 'Sample figures',
  sampleNote: 'Illustrative until the society publishes its yearly records.',
  founded: 'Established',
  foundedYear: '2000–01',
  onRecord: 'On record',
  recordsNote:
    'Counts from the society’s own overview. The date they were reported is not stated, so they may not be current totals.',

  structureEyebrow: 'How it is led',
  structureTitle: 'One President, three Vice Presidents, eight committees.',
  structureLead: 'Senior leadership sets the direction; committees and their teams carry the work.',
  leadersLabel: 'The society’s senior leadership',
  committeesLabel: (n: number) => `${n} committees`,
  structureLink: 'See the full structure',

  closingTitle: 'Become part of the society.',
  closingBody: 'Membership opens the society’s workshops, visits, competitions and exhibitions to you.',
  closingJoin: 'Join the Society',
  closingEvents: 'Upcoming events',
}

export type AboutCopy = typeof aboutEn

export const aboutAr: AboutCopy = {
  metaTitle: 'عن الجماعة · الجماعة الهندسية',
  metaDescription: 'منظمة طلابية في كلية الهندسة بجامعة السلطان قابوس، وهي المظلة الجامعة للجمعيات الهندسية السبع في الكلية.',
  eyebrow: 'عن الجماعة',
  title: 'سبع جمعيات هندسية. مظلة واحدة.',
  lead: 'منظمة طلابية يديرها الطلاب في كلية الهندسة، وهي المظلة الجامعة للجمعيات الهندسية السبع في الكلية.',
  convergenceLabel: 'رموز التخصصات السبعة تلتقي عند شعار الجماعة',
  emblemCaption: 'الجماعة الهندسية',
  scrollCue: 'مرّر لتكتمل الصورة',

  purposeEyebrow: 'الغاية',
  purposeTitle: 'مجتمعٌ تجمعه الهندسة.',


  activitiesEyebrow: 'ما تنظّمه',
  activitiesTitle: 'ستة أنشطة على مدار العام.',
  activitiesLead: 'لكل نشاط أرشيفه الخاص من نسخه السابقة.',
  descriptionToCome: 'الوصف قادم من الجماعة.',
  openArchive: (name: string) => `افتح أرشيف ${name}`,
  viewArchive: 'عرض الأرشيف',

  milestonesEyebrow: 'السجل',
  milestonesTitle: 'ما يُظهره السجل.',
  recordLead: 'أنشطة الجماعة ومشاريعها في كل عام، منذ تأسيسها حتى اليوم.',
  activities: 'الأنشطة',
  projects: 'المشاريع',
  toDate: 'حتى الآن',
  recordLabel: (year: number, activities: number, projects: number) =>
    `${year}: ${pluralAr(activities, {
      zero: () => 'لا أنشطة',
      one: () => 'نشاط واحد',
      two: () => 'نشاطان',
      few: (c) => `${c} أنشطة`,
      many: (c) => `${c} نشاطًا`,
      other: (c) => `${c} نشاط`,
    })}، ${pluralAr(projects, {
      zero: () => 'لا مشاريع',
      one: () => 'مشروع واحد',
      two: () => 'مشروعان',
      few: (c) => `${c} مشاريع`,
      many: (c) => `${c} مشروعًا`,
      other: (c) => `${c} مشروع`,
    })}`,
  recordYear: 'السنة',
  recordHint: 'أشر إلى عام، أو اسحب عبر المخطط، لقراءته.',
  recordTable: 'الأنشطة والمشاريع حسب السنة',
  sampleFigures: 'أرقام توضيحية',
  sampleNote: 'توضيحية إلى أن تنشر الجماعة سجلاتها السنوية.',
  founded: 'التأسيس',
  foundedYear: '2000–2001',
  onRecord: 'موثّق',
  recordsNote: 'أعداد من نبذة الجماعة عن نفسها. لم يُذكر تاريخ رصدها، لذا قد لا تمثّل المجموع الحالي.',

  structureEyebrow: 'كيف تُدار',
  structureTitle: 'رئيس، وثلاثة نواب، وثماني لجان.',
  structureLead: 'تحدد الإدارة العليا الاتجاه، وتنهض اللجان وفرقها بالعمل.',
  leadersLabel: 'الإدارة العليا للجماعة',
  committeesLabel: (n: number) => `${n} لجان`,
  structureLink: 'اعرض الهيكل كاملًا',

  closingTitle: 'كن جزءًا من الجماعة.',
  closingBody: 'تفتح لك العضوية ورش الجماعة وزياراتها ومسابقاتها ومعارضها.',
  closingJoin: 'انضم إلى الجماعة',
  closingEvents: 'الفعاليات القادمة',
}

export const leadershipEn = {
  metaTitle: 'Leadership · Engineering Society',
  metaDescription: 'How the Engineering Society is organised: senior leadership, committees and teams.',
  eyebrow: 'Leadership',
  title: 'The structure that carries the society.',
  lead: 'Senior leadership sets the direction. Eight committees, and the teams within them, carry the work.',
  rosterStrong: 'Roster to be announced.',
  rosterBody: 'Every seat below is shown vacant until the society confirms who holds it. No names or portraits are guessed.',
  rosterPartialStrong: 'Committee roster to be announced.',
  rosterPartialBody: 'The President and Vice Presidents are shown; committee seats stay vacant until the society confirms who holds them.',
  trussLabel: 'The society’s structure, drawn as a truss',
  president: 'President',
  vicePresident: 'Vice President',
  vacant: 'Name to be announced',
  committee: 'Committee',
  teams: (n: number) => pluralEn(n, 'team', 'teams'),
  noTeams: 'No teams listed',
  officialName: 'Official name',
  readingTitle: 'Reading the drawing',
  readingApex: 'The apex: the President',
  readingChord: 'The upper chord: the Vice Presidents',
  readingDeck: 'The deck: the eight committees, with their teams hanging beneath',
  readingNote: 'Members show the society’s tiers, not who reports to whom. Reporting lines will be added with the roster.',
  seatsTitle: 'Seats in the structure',
  seats: {
    senior: 'Senior leadership seats',
    committees: 'Committees',
    teams: 'Teams',
    filled: 'Seats confirmed',
  },
  seatsNote: 'Counts come from the structure itself; they change as the society updates it.',
  directoryTitle: 'Committees and their teams',
  closingTitle: 'Want to serve on a committee?',
  closingBody: 'Committee places open with each new term. Join the society to hear when they do.',
  closingJoin: 'Join the Society',
  closingAbout: 'About the society',
}

export type LeadershipCopy = typeof leadershipEn

export const leadershipAr: LeadershipCopy = {
  metaTitle: 'القيادة · الجماعة الهندسية',
  metaDescription: 'كيف تُنظَّم الجماعة الهندسية: الإدارة العليا واللجان والفرق.',
  eyebrow: 'القيادة',
  title: 'الهيكل الذي يحمل الجماعة.',
  lead: 'تحدد الإدارة العليا الاتجاه، وتنهض ثماني لجان، والفرق التي تضمها، بالعمل.',
  rosterStrong: 'سيُعلن عن الأعضاء لاحقًا.',
  rosterBody: 'كل مقعد أدناه يظهر شاغرًا حتى تؤكد الجماعة من يشغله. لا أسماء ولا صور مُخمَّنة.',
  rosterPartialStrong: 'سيُعلن عن أعضاء اللجان لاحقًا.',
  rosterPartialBody: 'يظهر الرئيس ونوابه، وتبقى مقاعد اللجان شاغرة حتى تؤكد الجماعة من يشغلها.',
  trussLabel: 'هيكل الجماعة مرسومًا على هيئة جملون',
  president: 'الرئيس',
  vicePresident: 'نائب الرئيس',
  vacant: 'سيُعلن الاسم لاحقًا',
  committee: 'لجنة',
  teams: (n: number) =>
    pluralAr(n, {
      zero: () => 'لا فرق',
      one: () => 'فريق واحد',
      two: () => 'فريقان',
      few: (c) => `${c} فرق`,
      many: (c) => `${c} فريقًا`,
      other: (c) => `${c} فريق`,
    }),
  noTeams: 'لا فرق مدرجة',
  officialName: 'الاسم الرسمي',
  readingTitle: 'كيف تقرأ الرسم',
  readingApex: 'القمة: الرئيس',
  readingChord: 'الوتر العلوي: نواب الرئيس',
  readingDeck: 'السطح: اللجان الثماني، وتتدلى منها فرقها',
  readingNote: 'تُظهر العناصر مستويات الجماعة، لا من يتبع من. ستُضاف خطوط التبعية مع قائمة الأعضاء.',
  seatsTitle: 'المقاعد في الهيكل',
  seats: {
    senior: 'مقاعد الإدارة العليا',
    committees: 'اللجان',
    teams: 'الفرق',
    filled: 'مقاعد مؤكدة',
  },
  seatsNote: 'الأعداد مأخوذة من الهيكل نفسه، وتتغير حين تحدّثه الجماعة.',
  directoryTitle: 'اللجان وفرقها',
  closingTitle: 'هل تودّ الانضمام إلى لجنة؟',
  closingBody: 'تُفتح مقاعد اللجان مع كل دورة جديدة. انضم إلى الجماعة لتعرف حين تُفتح.',
  closingJoin: 'انضم إلى الجماعة',
  closingAbout: 'عن الجماعة',
}
