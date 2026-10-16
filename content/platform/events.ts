import type { DrawingId } from '@/components/ui/drawings'
import type { ActivityId } from '@/content/activities'
import type { DisciplineId } from '@/content/disciplines'
import { EVENTS } from '@/content/events'
import type { MediaImage } from '@/content/media'
import type { Localized } from '@/lib/i18n'

/**
 * SAMPLE CONTENT: the event catalogue behind /events and /events/[slug].
 *
 * No events have been published through the platform yet. These records show how published
 * events will look once the events module (PRD UC-02) is connected: every one is `sample: true`
 * and the pages carry a platform-preview notice. The first three reuse the homepage's sample
 * events (content/events.ts), which stay exactly as the homepage shows them.
 *
 * Registration here is a prototype: `registration` is the event's state, and a visitor's own
 * registration is held only in the browser session (components/platform/DemoSession.tsx).
 * Capacities, registration counts and attendance are illustrative, not records.
 *
 * Photographs: only the Engineering Gathering exhibition carries one, of the gathering's own
 * hall. The other sample events keep their drawings rather than borrow photographs of other
 * occasions.
 */

export type PlatformEventType = 'workshop' | 'talk' | 'site-visit' | 'competition' | 'seminar' | 'exhibition'

/** The event's own state. "Registered" and "Completed" are derived (visitor state, date). */
export type EventRegistration = 'open' | 'waitlist' | 'full' | 'closed'

export interface ScheduleItem {
  /** 'HH:MM', Oman time. */
  time: string
  title: Localized
}

export interface PlatformEvent {
  slug: string
  sample: true
  title: Localized
  type: PlatformEventType
  /** ISO 8601 with the Oman offset. */
  start: string
  end: string
  location: Localized
  summary: Localized
  /** Longer description, as paragraphs. */
  about: Localized[]
  disciplines: DisciplineId[]
  activity?: ActivityId
  /** A committee id from content/structure.ts. */
  organizer: string
  capacity: number
  registered: number
  waitlist?: number
  registration: EventRegistration
  /** Past events only: how many attended (illustrative). */
  attended?: number
  schedule: ScheduleItem[]
  drawing: DrawingId
  image?: MediaImage
  featured?: boolean
}

const home = (id: string) => {
  const e = EVENTS.find((x) => x.id === id)
  if (!e) throw new Error(`Missing homepage event ${id}`)
  return { slug: e.id, title: e.title, start: e.start, end: e.end, location: e.location, summary: e.description, drawing: e.drawing }
}

const photo = (src: string, width: number, height: number, alt: Localized, focus?: string): MediaImage => ({ src, width, height, alt, focus })

export const EVENT_CATALOGUE: PlatformEvent[] = [
  {
    ...home('intro-robotics-workshop'),
    sample: true,
    type: 'workshop',
    featured: true,
    about: [
      {
        en: 'Teams of three build a small two-wheeled robot over one evening: a distance sensor, a motor driver and a microcontroller, programmed to follow a line and stop before an obstacle.',
        ar: 'تبني فرق من ثلاثة طلاب روبوتًا صغيرًا بعجلتين خلال أمسية واحدة: مستشعر مسافة ومشغّل محركات ومتحكّم دقيق، يُبرمج ليتبع خطًا ويتوقف قبل العائق.',
      },
      {
        en: 'No experience is needed. Components are provided and stay with the society’s kit library for the next workshop.',
        ar: 'لا تُشترط خبرة سابقة. توفّر الجماعة المكونات، وتعود بعد الورشة إلى مكتبة العدد للورشة التالية.',
      },
    ],
    disciplines: ['mechatronics', 'electrical'],
    activity: 'programme',
    organizer: 'activities',
    capacity: 40,
    registered: 31,
    registration: 'open',
    schedule: [
      { time: '16:00', title: { en: 'Welcome and safety briefing', ar: 'الترحيب وتعليمات السلامة' } },
      { time: '16:20', title: { en: 'Wiring the sensor and motor driver', ar: 'توصيل المستشعر ومشغّل المحركات' } },
      { time: '17:05', title: { en: 'Programming the line follower', ar: 'برمجة تتبّع الخط' } },
      { time: '17:40', title: { en: 'Test track and show-and-tell', ar: 'مسار الاختبار وعرض النتائج' } },
    ],
  },
  {
    slug: 'solidworks-bootcamp',
    sample: true,
    title: { en: 'SolidWorks Fundamentals Bootcamp', ar: 'معسكر أساسيات SolidWorks' },
    type: 'workshop',
    start: '2026-10-21T15:30:00+04:00',
    end: '2026-10-21T18:30:00+04:00',
    location: { en: 'Design studio, College of Engineering', ar: 'استوديو التصميم، كلية الهندسة' },
    summary: {
      en: 'From sketch to assembly in one afternoon: constraints, features and a three-part assembly with a drawing sheet.',
      ar: 'من الرسم إلى التجميع في ظهيرة واحدة: القيود والميزات وتجميع من ثلاثة أجزاء مع لوحة رسم هندسي.',
    },
    about: [
      {
        en: 'Bring a laptop with the student licence installed. We model a small bracket, a shaft and a bearing housing, then assemble them and produce a dimensioned drawing.',
        ar: 'أحضر حاسوبًا محمولًا مثبّتًا عليه ترخيص الطالب. سنصمّم حاملًا صغيرًا وعمود دوران وغلاف محمل، ثم نجمّعها ونُخرج رسمًا هندسيًا بالأبعاد.',
      },
    ],
    disciplines: ['mechanical', 'industrial'],
    activity: 'graduate-workshops',
    organizer: 'members-graduates',
    capacity: 30,
    registered: 12,
    registration: 'open',
    schedule: [
      { time: '15:30', title: { en: 'Sketches and constraints', ar: 'الرسومات والقيود' } },
      { time: '16:30', title: { en: 'Features and parts', ar: 'الميزات والأجزاء' } },
      { time: '17:30', title: { en: 'Assembly and drawing sheet', ar: 'التجميع ولوحة الرسم' } },
    ],
    drawing: 'shelter',
  },
  {
    slug: 'reservoir-seminar',
    sample: true,
    title: { en: 'Reservoir Characterisation Seminar', ar: 'ندوة توصيف المكامن' },
    type: 'seminar',
    start: '2026-10-28T18:00:00+04:00',
    end: '2026-10-28T19:30:00+04:00',
    location: { en: 'Lecture theatre, College of Engineering', ar: 'المدرج، كلية الهندسة' },
    summary: {
      en: 'How core samples, well logs and simulation come together to describe what lies kilometres below the surface.',
      ar: 'كيف تتكامل العيّنات اللبّية وسجلات الآبار والمحاكاة لوصف ما يقع على عمق كيلومترات تحت السطح.',
    },
    about: [
      {
        en: 'A talk followed by questions, aimed at second-year students and above. Recommended for anyone considering petroleum or chemical engineering electives.',
        ar: 'محاضرة يتبعها نقاش، موجّهة لطلاب السنة الثانية فما فوق، ويُنصح بها لمن يفكّر في مقررات اختيارية في هندسة النفط أو الهندسة الكيميائية.',
      },
    ],
    disciplines: ['petroleum', 'chemical'],
    activity: 'programme',
    organizer: 'activities',
    capacity: 120,
    registered: 64,
    registration: 'open',
    schedule: [
      { time: '18:00', title: { en: 'From core to model', ar: 'من العيّنة إلى النموذج' } },
      { time: '18:50', title: { en: 'Questions and discussion', ar: 'أسئلة ونقاش' } },
    ],
    drawing: 'water-bench',
  },
  {
    ...home('engineering-careers-panel'),
    sample: true,
    type: 'talk',
    about: [
      {
        en: 'Five graduates from different disciplines describe their first roles and answer questions. Seats fill quickly; join the waitlist and you will be offered any place that frees up.',
        ar: 'خمسة خريجين من تخصصات مختلفة يتحدثون عن وظائفهم الأولى ويجيبون عن الأسئلة. تمتلئ المقاعد سريعًا؛ انضم إلى قائمة الانتظار وسيُعرض عليك أي مقعد يتوفّر.',
      },
    ],
    disciplines: ['mechanical', 'electrical', 'civil', 'petroleum', 'chemical', 'mechatronics', 'industrial'],
    activity: 'evenings',
    organizer: 'members-graduates',
    capacity: 180,
    registered: 180,
    waitlist: 12,
    registration: 'waitlist',
    schedule: [
      { time: '18:30', title: { en: 'Panel introductions', ar: 'تعريف بأعضاء الندوة' } },
      { time: '18:45', title: { en: 'First roles, first lessons', ar: 'الوظائف الأولى والدروس الأولى' } },
      { time: '19:30', title: { en: 'Open questions', ar: 'أسئلة مفتوحة' } },
    ],
  },
  {
    ...home('sustainable-infrastructure-visit'),
    sample: true,
    type: 'site-visit',
    about: [
      {
        en: 'A guided visit with the site engineer, limited by the site’s safety rules. Transport leaves campus at 08:00; safety boots are required.',
        ar: 'زيارة بصحبة مهندس الموقع، يحدّ عددها نظام السلامة في الموقع. تنطلق الحافلة من الحرم الجامعي الساعة 08:00، ويلزم ارتداء أحذية السلامة.',
      },
    ],
    disciplines: ['civil'],
    activity: 'programme',
    organizer: 'relations',
    capacity: 25,
    registered: 25,
    registration: 'full',
    schedule: [
      { time: '08:30', title: { en: 'Site induction', ar: 'تعريف بالموقع' } },
      { time: '09:00', title: { en: 'Foundations and structure', ar: 'الأساسات والهيكل' } },
      { time: '10:30', title: { en: 'Finishing works', ar: 'أعمال التشطيب' } },
    ],
  },
  {
    slug: 'smart-campus-hackathon',
    sample: true,
    title: { en: 'Smart Campus Hackathon', ar: 'هاكاثون الحرم الذكي' },
    type: 'competition',
    start: '2026-12-06T09:00:00+04:00',
    end: '2026-12-06T21:00:00+04:00',
    location: { en: 'Innovation hall, College of Engineering', ar: 'قاعة الابتكار، كلية الهندسة' },
    summary: {
      en: 'Twelve hours to prototype a sensor, a dashboard or a mechanism that makes the campus work better.',
      ar: 'اثنتا عشرة ساعة لبناء نموذج أولي لمستشعر أو لوحة بيانات أو آلية تجعل الحرم الجامعي يعمل بشكل أفضل.',
    },
    about: [
      {
        en: 'Register individually; teams of three to four form on the day. Judging looks at the problem chosen, the working prototype and how clearly it is explained.',
        ar: 'التسجيل فردي، وتتشكّل الفرق من ثلاثة إلى أربعة أعضاء يوم الفعالية. يُقيّم اختيار المشكلة والنموذج العامل ووضوح عرضه.',
      },
    ],
    disciplines: ['electrical', 'mechatronics', 'industrial'],
    activity: 'competitions',
    organizer: 'projects',
    capacity: 60,
    registered: 18,
    registration: 'open',
    schedule: [
      { time: '09:00', title: { en: 'Challenge briefs and team forming', ar: 'عرض التحديات وتكوين الفرق' } },
      { time: '10:00', title: { en: 'Build', ar: 'البناء' } },
      { time: '18:00', title: { en: 'Demos to the judges', ar: 'العروض أمام لجنة التحكيم' } },
      { time: '20:30', title: { en: 'Results', ar: 'إعلان النتائج' } },
    ],
    drawing: 'sensor-node',
  },
  {
    slug: 'process-plant-visit',
    sample: true,
    title: { en: 'Process Plant Visit', ar: 'زيارة مصنع للعمليات' },
    type: 'site-visit',
    start: '2026-12-14T08:00:00+04:00',
    end: '2026-12-14T13:00:00+04:00',
    location: { en: 'Industrial area, Sohar', ar: 'المنطقة الصناعية، صحار' },
    summary: {
      en: 'Separation, heat exchange and control rooms seen working at full scale.',
      ar: 'الفصل والتبادل الحراري وغرف التحكم وهي تعمل بالحجم الكامل.',
    },
    about: [
      {
        en: 'Registration closed once the host confirmed its visitor list for security clearance.',
        ar: 'أُغلق التسجيل بعد أن أكّد المصنع قائمة الزوار لإجراءات التصريح الأمني.',
      },
    ],
    disciplines: ['chemical', 'petroleum'],
    activity: 'programme',
    organizer: 'relations',
    capacity: 20,
    registered: 20,
    registration: 'closed',
    schedule: [
      { time: '08:00', title: { en: 'Departure from campus', ar: 'الانطلاق من الحرم الجامعي' } },
      { time: '10:00', title: { en: 'Plant tour', ar: 'جولة في المصنع' } },
      { time: '12:00', title: { en: 'Control room and questions', ar: 'غرفة التحكم والأسئلة' } },
    ],
    drawing: 'water-bench',
  },
  // ---- Past events (before the demo date) ----
  {
    slug: 'gathering-exhibition-2026',
    sample: true,
    title: { en: 'Engineering Gathering Exhibition', ar: 'معرض التجمع الهندسي' },
    type: 'exhibition',
    start: '2026-03-10T10:00:00+04:00',
    end: '2026-03-10T20:00:00+04:00',
    location: { en: 'Main hall, Sultan Qaboos University', ar: 'القاعة الرئيسية، جامعة السلطان قابوس' },
    summary: {
      en: 'Every discipline under one roof: student projects, society stands and a day of demonstrations.',
      ar: 'جميع التخصصات تحت سقف واحد: مشاريع الطلبة وأجنحة الجماعات ويوم من العروض.',
    },
    about: [
      {
        en: 'The exhibition hall opened to the campus and visitors, with stands from each engineering society around a central installation.',
        ar: 'فُتحت قاعة المعرض للحرم الجامعي وزوّاره، مع أجنحة لكل جماعة هندسية حول مجسّم مركزي.',
      },
    ],
    disciplines: ['mechanical', 'electrical', 'civil', 'petroleum', 'chemical', 'mechatronics', 'industrial'],
    activity: 'gathering',
    organizer: 'exhibition',
    capacity: 3000,
    registered: 2400,
    attended: 2180,
    registration: 'closed',
    schedule: [
      { time: '10:00', title: { en: 'Opening', ar: 'الافتتاح' } },
      { time: '12:00', title: { en: 'Project demonstrations', ar: 'عروض المشاريع' } },
      { time: '17:00', title: { en: 'Awards', ar: 'الجوائز' } },
    ],
    drawing: 'truss',
    image: photo('/images/activities/gathering.jpg', 1170, 762, {
      en: 'An exhibition hall: visitors walk between lit display panels around a glowing geometric sculpture.',
      ar: 'قاعة معرض: زوّار يتجولون بين لوحات عرض مضيئة حول مجسّم هندسي متوهّج.',
    }, '50% 40%'),
  },
  {
    slug: 'bridge-design-challenge',
    sample: true,
    title: { en: 'Bridge Design Challenge', ar: 'تحدي تصميم الجسور' },
    type: 'competition',
    start: '2026-04-22T16:00:00+04:00',
    end: '2026-04-22T19:00:00+04:00',
    location: { en: 'Structures laboratory', ar: 'مختبر المنشآت' },
    summary: {
      en: 'Balsa bridges loaded to failure: the best strength-to-weight ratio wins.',
      ar: 'جسور من خشب البلسا تُحمّل حتى الانهيار، والفائز صاحب أفضل نسبة بين المتانة والوزن.',
    },
    about: [
      {
        en: 'Teams submitted their bridges a week ahead; each was weighed, then loaded at mid-span until it failed.',
        ar: 'سلّمت الفرق جسورها قبل أسبوع، ووُزن كل جسر ثم حُمّل في منتصف بحره حتى انهار.',
      },
    ],
    disciplines: ['civil', 'mechanical'],
    activity: 'competitions',
    organizer: 'projects',
    capacity: 24,
    registered: 24,
    attended: 22,
    registration: 'closed',
    schedule: [
      { time: '16:00', title: { en: 'Weigh-in', ar: 'الوزن' } },
      { time: '16:30', title: { en: 'Load tests', ar: 'اختبارات التحميل' } },
      { time: '18:30', title: { en: 'Results', ar: 'النتائج' } },
    ],
    drawing: 'truss',
  },
  {
    slug: 'leadership-evening-2026',
    sample: true,
    title: { en: 'Engineering Leadership Evening', ar: 'أمسية القيادة الهندسية' },
    type: 'talk',
    start: '2026-05-12T19:00:00+04:00',
    end: '2026-05-12T21:00:00+04:00',
    location: { en: 'Grand hall', ar: 'القاعة الكبرى' },
    summary: {
      en: 'An evening of talks on leading engineering teams, from project sites to boardrooms.',
      ar: 'أمسية من المحاضرات عن قيادة الفرق الهندسية، من مواقع المشاريع إلى قاعات الإدارة.',
    },
    about: [
      {
        en: 'Three speakers and an open conversation with the audience, closing the academic year’s evening series.',
        ar: 'ثلاثة متحدثين وحوار مفتوح مع الجمهور، في ختام سلسلة أمسيات العام الأكاديمي.',
      },
    ],
    disciplines: ['mechanical', 'electrical', 'civil', 'petroleum', 'chemical', 'mechatronics', 'industrial'],
    activity: 'evenings',
    organizer: 'activities',
    capacity: 450,
    registered: 430,
    attended: 396,
    registration: 'closed',
    schedule: [
      { time: '19:00', title: { en: 'Talks', ar: 'المحاضرات' } },
      { time: '20:15', title: { en: 'Open conversation', ar: 'حوار مفتوح' } },
    ],
    drawing: 'careers-panel',
  },
  {
    slug: 'lab-safety-essentials',
    sample: true,
    title: { en: 'Lab Safety Essentials', ar: 'أساسيات السلامة في المختبر' },
    type: 'workshop',
    start: '2026-02-17T14:00:00+04:00',
    end: '2026-02-17T16:00:00+04:00',
    location: { en: 'Engineering laboratories', ar: 'المختبرات الهندسية' },
    summary: {
      en: 'Hazard spotting, safe tool use and what to do when something goes wrong, before the semester’s lab work starts.',
      ar: 'رصد المخاطر والاستخدام الآمن للأدوات وما يجب فعله عند وقوع خطأ، قبل بدء العمل المخبري في الفصل.',
    },
    about: [
      {
        en: 'A practical session in small groups, rotating through four stations.',
        ar: 'جلسة تطبيقية في مجموعات صغيرة تتنقل بين أربع محطات.',
      },
    ],
    disciplines: ['chemical', 'mechanical', 'electrical'],
    activity: 'programme',
    organizer: 'support',
    capacity: 60,
    registered: 58,
    attended: 51,
    registration: 'closed',
    schedule: [
      { time: '14:00', title: { en: 'Hazard spotting', ar: 'رصد المخاطر' } },
      { time: '14:45', title: { en: 'Station rotation', ar: 'التنقل بين المحطات' } },
    ],
    drawing: 'robotics-workshop',
  },
  {
    slug: 'campus-to-career-2026',
    sample: true,
    title: { en: 'From Campus to Career', ar: 'من الجامعة إلى سوق العمل' },
    type: 'workshop',
    start: '2026-06-02T17:00:00+04:00',
    end: '2026-06-02T19:00:00+04:00',
    location: { en: 'Seminar room 2', ar: 'قاعة الندوات 2' },
    summary: {
      en: 'Graduates review CVs and run mock interviews with final-year students.',
      ar: 'خريجون يراجعون السير الذاتية ويجرون مقابلات تجريبية مع طلاب السنة الأخيرة.',
    },
    about: [
      {
        en: 'Part of the Graduate Workshops programme: one graduate for every four students.',
        ar: 'ضمن برنامج ورش الخريجين: خريج واحد لكل أربعة طلاب.',
      },
    ],
    disciplines: ['mechanical', 'electrical', 'civil', 'industrial'],
    activity: 'graduate-workshops',
    organizer: 'members-graduates',
    capacity: 48,
    registered: 48,
    attended: 44,
    registration: 'closed',
    schedule: [
      { time: '17:00', title: { en: 'CV review', ar: 'مراجعة السيرة الذاتية' } },
      { time: '18:00', title: { en: 'Mock interviews', ar: 'مقابلات تجريبية' } },
    ],
    drawing: 'careers-panel',
  },
]
