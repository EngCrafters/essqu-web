import type { Localized } from '@/lib/i18n'
import type { MediaImage } from './media'

/**
 * The society's six activities. Each one is shown on the homepage as an automatic slideshow
 * of its photographs (components/sections/ActivityGalleries.tsx), and each of its editions is a
 * record in the archive (/activities). Dated, upcoming events live in content/events.ts.
 *
 * EDITORIAL STATUS
 * - `nameAr` / `nameEn` are the society's official names for each activity.
 * - `description`: as supplied by the society. أستوديو الخريجين's description is still to come.
 * - `editions`: the society's own photographs, grouped by the edition their file names give
 *   (for example "الملتقى الهندسي 16 _ 2026"). Titles and dates come from those names, only as
 *   precisely as they state them; a photograph supplied without an edition or a date is filed
 *   under its activity, undated. Nothing here is invented: no attendance figures were supplied,
 *   so none are shown.
 *
 * To add an edition: give it an id, its title, its date ('YYYY', 'YYYY-MM' or 'YYYY-MM-DD',
 * as precise as is known), its photographs (each slides on the homepage), and, if known, its
 * attendance.
 */

export type ActivityId = 'gathering' | 'programme' | 'graduate-workshops' | 'graduate-studio' | 'evenings' | 'competitions'

export interface ActivityEdition {
  id: string
  title: Localized
  /** 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'; left out when the source gives no date. */
  date?: string
  attendance?: { count: number; kind: 'attendees' | 'visitors' }
  /** The edition's photographs, the first one leading. */
  photos: MediaImage[]
}

export interface Activity {
  id: ActivityId
  nameAr: string
  nameEn: string
  description: Localized
  descriptionStatus: 'confirmed' | 'needs-input'
  editions: ActivityEdition[]
}

/** One slide of an activity's slideshow: a photograph and the edition it belongs to. */
export interface GallerySlide {
  id: string
  title: Localized
  date?: string
  attendance?: ActivityEdition['attendance']
  image: MediaImage
}

/**
 * The society's own photographs: web copies of the files in /photos (long edge at most
 * 2400px, metadata removed), in public/images/activities.
 */
const PHOTO = {
  gathering16: { src: '/images/activities/gathering-16-2026.jpg', width: 2400, height: 1600 },
  gathering: { src: '/images/activities/gathering.jpg', width: 1170, height: 762 },
  programme2025a: { src: '/images/activities/programme-2025-1.jpg', width: 2400, height: 1350 },
  programme2025b: { src: '/images/activities/programme-2025-2.jpg', width: 1347, height: 2400 },
  programme: { src: '/images/activities/programme.jpg', width: 2400, height: 1600 },
  workshops: { src: '/images/activities/graduate-workshops.jpg', width: 1600, height: 2400 },
  studio2025a: { src: '/images/activities/graduate-studio-2025-1.jpg', width: 2400, height: 1600 },
  studio2025b: { src: '/images/activities/graduate-studio-2025-2.jpg', width: 2400, height: 1600 },
  studio2025c: { src: '/images/activities/graduate-studio-2025-3.jpg', width: 2400, height: 1600 },
  studio: { src: '/images/activities/graduate-studio.jpg', width: 2400, height: 1600 },
  closing2026a: { src: '/images/activities/closing-evening-2026-hall.jpg', width: 1409, height: 730 },
  closing2026b: { src: '/images/activities/closing-evening-2026-desk.jpg', width: 2400, height: 1601 },
  evenings: { src: '/images/activities/evenings.jpg', width: 1170, height: 652 },
  competitions: { src: '/images/activities/competitions.jpg', width: 2400, height: 1603 },
} as const

const ALT: Record<keyof typeof PHOTO, Localized> = {
  gathering16: {
    en: 'Students talk beside lit project posters at Engineering Gathering 16.',
    ar: 'طلاب يتحاورون بجانب ملصقات مشاريع مضيئة في الملتقى الهندسي 16.',
  },
  gathering: {
    en: 'An exhibition hall: visitors walk between lit display panels around a glowing geometric sculpture.',
    ar: 'قاعة معرض: زوّار يتجولون بين لوحات عرض مضيئة حول مجسّم هندسي متوهّج.',
  },
  programme2025a: {
    en: 'A speaker presents to a full lecture theatre of students, a question slide with a QR code behind her.',
    ar: 'متحدثة تقدّم عرضًا أمام قاعة محاضرات ممتلئة بالطلاب، وخلفها شريحة أسئلة برمز QR.',
  },
  programme2025b: {
    en: 'A speaker with a microphone presents a map of Oman’s concession areas to the audience.',
    ar: 'متحدث يحمل الميكروفون يعرض خريطة مناطق الامتياز في سلطنة عُمان على الحضور.',
  },
  programme: {
    en: 'A student presents “Reservoir Simulation Modelling” to classmates seated in a lecture room.',
    ar: 'طالب يقدّم عرضًا بعنوان «نمذجة محاكاة المكامن» أمام زملائه في قاعة محاضرات.',
  },
  workshops: {
    en: 'Students working at computers in a lab; in the foreground, one models a 3D shape on a laptop.',
    ar: 'طلاب يعملون على الحواسيب في مختبر، وفي المقدمة طالب يصمّم مجسّمًا ثلاثي الأبعاد على حاسوبه المحمول.',
  },
  studio2025a: {
    en: 'Eleven graduates in white dishdashas and graduation bishts pose together for a studio portrait.',
    ar: 'أحد عشر خريجًا بالدشداشة البيضاء وبشوت التخرج في صورة جماعية داخل الأستوديو.',
  },
  studio2025b: {
    en: 'A friend adjusts the cap of a graduate in a purple gown, in a softly lit studio set.',
    ar: 'صديقة تعدّل قبعة التخرج لخرّيجة ترتدي ثوبًا بنفسجيًا في ركن أستوديو بإضاءة هادئة.',
  },
  studio2025c: {
    en: 'Two graduates embrace in front of a gilded sofa and a framed painting.',
    ar: 'خرّيجان يتعانقان أمام أريكة مذهّبة ولوحة بإطار ذهبي.',
  },
  studio: {
    en: 'A graduate in a bisht poses in a decorated photo corner, his reflection caught in a standing mirror.',
    ar: 'خرّيج يرتدي البشت في ركن تصوير مزيّن، وتنعكس صورته في مرآة قائمة.',
  },
  closing2026a: {
    en: 'A full auditorium under blue light faces the stage at the closing evening.',
    ar: 'قاعة ممتلئة تحت إضاءة زرقاء تتجه نحو المسرح في الأمسية الختامية.',
  },
  closing2026b: {
    en: 'The closing evening seen from the control desk: a dark hall, the audience and the lit stage screen.',
    ar: 'الأمسية الختامية من منصة التحكم: قاعة معتمة والجمهور وشاشة المسرح المضيئة.',
  },
  evenings: {
    en: 'A speaker stands on stage facing an audience holding up phone lights in a darkened hall.',
    ar: 'متحدّث يقف على المسرح أمام جمهور يرفع أضواء هواتفه في قاعة معتمة.',
  },
  competitions: {
    en: 'Two students inspect entries laid out on a display table in a large auditorium.',
    ar: 'طالبان يتفقّدان أعمالًا معروضة على طاولة في قاعة كبيرة.',
  },
}

/** A society photograph with its description and a crop that keeps its subject in frame. */
const photo = (key: keyof typeof PHOTO, focus?: string): MediaImage => ({ ...PHOTO[key], alt: ALT[key], focus })

export const ACTIVITIES: Activity[] = [
  {
    id: 'gathering',
    nameAr: 'التجمع الهندسي',
    nameEn: 'Engineering Gathering',
    description: {
      en: 'A gathering that brings students from across the engineering disciplines together in one place.',
      ar: 'تجمّع يلتقي فيه طلاب التخصصات الهندسية المختلفة في مكان واحد.',
    },
    descriptionStatus: 'confirmed',
    editions: [
      {
        id: 'gathering-16',
        title: { en: 'Engineering Gathering 16', ar: 'الملتقى الهندسي 16' },
        date: '2026',
        photos: [photo('gathering16', '50% 42%'), photo('gathering', '50% 40%')],
      },
    ],
  },
  {
    id: 'programme',
    nameAr: 'البرنامج الهندسي',
    nameEn: 'Engineering Programme',
    description: {
      en: 'A structured programme of engineering activities for students across the college.',
      ar: 'برنامج منظّم من الأنشطة الهندسية لطلاب الكلية من مختلف التخصصات.',
    },
    descriptionStatus: 'confirmed',
    editions: [
      {
        id: 'programme-2025',
        title: { en: 'Engineering Programme', ar: 'البرنامج الهندسي' },
        date: '2025-02',
        photos: [photo('programme2025a', '64% 50%'), photo('programme2025b', '50% 40%')],
      },
      {
        id: 'reservoir-simulation',
        // The talk's title is on its own slide in the photograph; the source gives no date.
        title: { en: 'Reservoir Simulation Modelling', ar: 'نمذجة محاكاة المكامن' },
        photos: [photo('programme', '58% 45%')],
      },
    ],
  },
  {
    id: 'graduate-workshops',
    nameAr: 'ورش الخريجين',
    nameEn: 'Graduate Workshops',
    description: {
      en: 'Workshops that connect current students with the society’s graduates.',
      ar: 'ورش عمل تصل الطلاب الحاليين بخريجي الجماعة.',
    },
    descriptionStatus: 'confirmed',
    editions: [
      {
        id: 'graduate-workshops',
        title: { en: 'Graduate Workshops', ar: 'ورش الخريجين' },
        photos: [photo('workshops', '50% 66%')],
      },
    ],
  },
  {
    id: 'graduate-studio',
    nameAr: 'أستوديو الخريجين',
    nameEn: 'Graduate Studio',
    // Needs the society's own description: the name alone does not say what the programme does.
    description: {
      en: 'A description of this programme will be added by the society.',
      ar: 'ستضيف الجماعة وصفًا لهذا البرنامج.',
    },
    descriptionStatus: 'needs-input',
    editions: [
      {
        id: 'graduate-studio-2025',
        title: { en: 'Graduate Studio', ar: 'أستوديو الخريجين' },
        date: '2025',
        photos: [photo('studio2025a', '50% 46%'), photo('studio2025c', '50% 40%'), photo('studio2025b', '52% 38%')],
      },
      {
        id: 'graduate-studio',
        title: { en: 'Graduate Studio', ar: 'أستوديو الخريجين' },
        photos: [photo('studio', '62% 40%')],
      },
    ],
  },
  {
    id: 'evenings',
    nameAr: 'الأمسيات',
    nameEn: 'Evenings',
    description: {
      en: 'Evening sessions that bring the society’s members together.',
      ar: 'أمسيات تجمع أعضاء الجماعة.',
    },
    descriptionStatus: 'confirmed',
    editions: [
      {
        id: 'closing-evening-2026',
        title: { en: 'Closing Evening', ar: 'الأمسية الختامية' },
        date: '2026',
        photos: [photo('closing2026a', '50% 46%'), photo('closing2026b', '56% 46%')],
      },
      {
        id: 'evenings',
        title: { en: 'Evenings', ar: 'الأمسيات' },
        photos: [photo('evenings', '50% 30%')],
      },
    ],
  },
  {
    id: 'competitions',
    nameAr: 'المسابقات',
    nameEn: 'Competitions',
    description: {
      en: 'Competitions that invite students to put their engineering skills to the test.',
      ar: 'مسابقات تدعو الطلاب إلى اختبار مهاراتهم الهندسية.',
    },
    descriptionStatus: 'confirmed',
    editions: [
      {
        id: 'competitions',
        title: { en: 'Competitions', ar: 'المسابقات' },
        photos: [photo('competitions', '55% 50%')],
      },
    ],
  },
]

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<ActivityId, Activity>

/** An activity's slides: every photograph of every edition, newest edition first. */
export const slidesOf = (activity: Activity): GallerySlide[] =>
  activity.editions.flatMap((e) =>
    e.photos.map((image, i) => ({ id: `${e.id}-${i + 1}`, title: e.title, date: e.date, attendance: e.attendance, image })),
  )

/** The photograph that represents an activity (its newest edition's lead photograph). */
export const leadPhoto = (activity: Activity): MediaImage | undefined => activity.editions[0]?.photos[0]
