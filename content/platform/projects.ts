import type { DrawingId } from '@/components/ui/drawings'
import type { DisciplineId } from '@/content/disciplines'
import { PROJECTS } from '@/content/projects'
import type { Localized } from '@/lib/i18n'
import type { ProjectTypeId, TechnologyId } from './taxonomy'

/**
 * SAMPLE CONTENT: the project archive behind /projects and /projects/[slug].
 *
 * The project and magazine archive is PRD Phase 3 (UC-05/UC-06). These records show how
 * archived work will be told: challenge, approach, solution, the team and the parts list. They
 * are illustrative: no achievement, award or result here is a society record. The first five
 * reuse the homepage's sample projects (content/projects.ts), which stay unchanged there.
 *
 * `model` picks the procedural 3D model shown in the laboratory scene
 * (components/three/models); `parts` is the exploded-view / bill-of-materials list.
 */

export type ProjectModel = 'rover' | 'sensor-node' | 'truss' | 'shelter' | 'reactor' | 'arm' | 'conveyor' | 'gearbox' | 'derrick'

/** Where a project stands. Independent of any competition result. */
export type ProjectStage = 'idea' | 'research' | 'development' | 'prototype' | 'testing' | 'competition-ready' | 'completed'
export const PROJECT_STAGES: ProjectStage[] = ['idea', 'research', 'development', 'prototype', 'testing', 'competition-ready', 'completed']

export type AchievementResult = 'winner' | 'first' | 'second' | 'third' | 'finalist' | 'special' | 'participant'

/** A competition result. Record only results the society can verify. */
export interface Achievement {
  competition: Localized
  result: AchievementResult
  year: number
  /** The competition's own results page, when there is one. */
  href?: string
  /** A sample entry for the prototype, not a real result. */
  sample: boolean
}

export type ProjectMediaKind = 'model' | 'photo' | 'video' | 'render' | 'diagram'

/** One item in a project's media viewer. */
export interface ProjectMedia {
  kind: ProjectMediaKind
  caption: Localized
  /** Photo, render or video file under /public. */
  src?: string
  /** Video poster frame. */
  poster?: string
  width?: number
  height?: number
  alt?: Localized
  /** Diagram: one of the drawing sheets. */
  drawing?: DrawingId
  /** Model: the project's model has a genuine exploded view. */
  exploded?: boolean
  /** An illustrative image from the society's library, not a photograph of this project. */
  illustrative?: boolean
}

/** A measured or tested result. Never filled in without the team's own data. */
export interface ValidationResult {
  measure: Localized
  result: Localized
}

export interface ProjectPart {
  name: Localized
  /** Quantity in the bill of materials. */
  qty: number
}

export interface Project {
  slug: string
  sample: true
  title: Localized
  discipline: DisciplineId
  /** Other disciplines involved. */
  alsoDisciplines?: DisciplineId[]
  year: number
  type: ProjectTypeId
  technologies: TechnologyId[]
  /** Member ids from content/platform/members.ts (first names only on public pages). */
  contributors: string[]
  /** One line: what the project is for. */
  summary: Localized
  stage: ProjectStage
  achievements: Achievement[]
  /** The real problem being addressed. */
  problem: Localized
  /** What is being designed or built. */
  solution: Localized
  technicalApproach: {
    overview: Localized
    /** Design decisions, one sentence each. */
    decisions: Localized[]
  }
  /** Milestones already completed, oldest first. */
  development: Localized[]
  /** Test results, only when measured. */
  validation: ValidationResult[]
  nextSteps: Localized
  collaboration: {
    /** What the team would welcome from partners. */
    seeking: Localized
    application?: Localized
  }
  parts: ProjectPart[]
  drawing: DrawingId
  model: ProjectModel
  media: ProjectMedia[]
  featured?: boolean
}

const home = (id: string) => {
  const p = PROJECTS.find((x) => x.id === id)
  if (!p) throw new Error(`Missing homepage project ${id}`)
  return { slug: p.id, title: p.title, discipline: p.discipline, summary: p.summary, drawing: p.drawing }
}

const part = (en: string, ar: string, qty = 1): ProjectPart => ({ name: { en, ar }, qty })
const t = (en: string, ar: string): Localized => ({ en, ar })

/** The interactive 3D model, with an exploded view only where the project genuinely has one. */
const model3d = (exploded: boolean): ProjectMedia => ({ kind: 'model', exploded, caption: t('Interactive 3D model', 'نموذج ثلاثي الأبعاد تفاعلي') })
const sheet = (drawing: DrawingId): ProjectMedia => ({ kind: 'diagram', drawing, caption: t('General arrangement drawing', 'رسم الترتيب العام') })
const library = (src: string, width: number, height: number, caption: Localized, alt: Localized): ProjectMedia => ({
  kind: 'photo',
  src,
  width,
  height,
  caption,
  alt,
  illustrative: true,
})
const turntable = (slug: string, caption: Localized): ProjectMedia => ({
  kind: 'video',
  src: `/media/projects/${slug}-turntable.webm`,
  poster: `/media/projects/${slug}-turntable.webp`,
  width: 960,
  height: 600,
  caption,
})

export const PROJECT_CATALOGUE: Project[] = [
  {
    ...home('line-following-rover'),
    sample: true,
    featured: true,
    alsoDisciplines: ['electrical'],
    year: 2026,
    type: 'competition',
    technologies: ['arduino', 'sensors', 'printing', 'python'],
    contributors: ['m-07', 'm-03', 'm-12', 'm-18', 'm-21'],
    problem: {
      en: 'Follow a taped line through tight curves at speed without overshooting, on a course the team sees only on the day.',
      ar: 'تتبّع خط مرسوم عبر منعطفات حادة بسرعة دون تجاوزه، على مسار لا يراه الفريق إلا يوم المسابقة.',
    },
    technicalApproach: {
      overview: { en: 'An infrared sensor bar reads the line eight times per centimetre; a PID loop steers two geared motors, tuned on a test track built to the competition rules.', ar: 'شريط مستشعرات بالأشعة تحت الحمراء يقرأ الخط ثماني مرات في كل سنتيمتر، وحلقة تحكم PID توجّه محركين مسنّنين، ضُبطت على مسار اختبار بُني وفق قواعد المسابقة.' },
      decisions: [
        t('The battery sits low, between the axles, to keep the rover stable through fast curves.', 'وُضعت البطارية منخفضة بين المحورين لتبقى المركبة ثابتة في المنعطفات السريعة.'),
        t('The sensor bar is mounted ahead of the axle so curves are seen before the wheels reach them.', 'ثُبّت شريط المستشعرات أمام المحور ليرصد المنعطفات قبل أن تصلها العجلات.'),
      ],
    },
    stage: 'competition-ready',
    achievements: [{ competition: t('Society Robotics Challenge', 'تحدي الروبوتات في الجماعة'), result: 'first', year: 2025, sample: true }],
    development: [t('Chassis printed and assembled', 'طباعة الهيكل وتركيبه'), t('Steering loop tuned on a full-size test track', 'ضبط حلقة التوجيه على مسار اختبار بالحجم الكامل')],
    validation: [],
    nextSteps: t('Timed trials on new course layouts before the next competition.', 'تجارب موقوتة على مسارات جديدة قبل المسابقة القادمة.'),
    collaboration: {
      seeking: t('A larger test floor and feedback from control engineers.', 'أرضية اختبار أوسع، وملاحظات من مهندسي التحكم.'),
      application: t('A teaching platform for control and embedded-systems courses.', 'منصة تعليمية لمقررات التحكم والأنظمة المدمجة.'),
    },
    solution: {
      en: 'A printed chassis carries a low battery pack for stability. Every wiring diagram, tuning log and line of code is archived so next year’s team starts from a working rover.',
      ar: 'هيكل مطبوع يحمل حزمة بطاريات منخفضة لزيادة الثبات، وكل مخطط توصيل وسجل ضبط وسطر برمجي مؤرشف ليبدأ فريق العام القادم من مركبة تعمل.',
    },
    parts: [
      part('Printed chassis', 'هيكل مطبوع'),
      part('Geared DC motors', 'محركات تيار مستمر مسنّنة', 2),
      part('Wheels', 'عجلات', 2),
      part('Infrared sensor bar', 'شريط مستشعرات بالأشعة تحت الحمراء'),
      part('Microcontroller board', 'لوحة متحكّم دقيق'),
      part('Battery pack', 'حزمة بطاريات'),
    ],
    model: 'rover',
    media: [model3d(true), turntable('line-following-rover', t('Turntable render', 'عرض دوّار للنموذج')), sheet('rover'), library('/images/activities/competitions.jpg', 2400, 1603, t('A society competition day', 'يوم مسابقة في الجماعة'), t('Two students inspect entries laid out on a display table in a large auditorium.', 'طالبان يتفقّدان أعمالًا معروضة على طاولة في قاعة كبيرة.'))],
  },
  {
    ...home('water-quality-node'),
    sample: true,
    alsoDisciplines: ['chemical'],
    year: 2025,
    type: 'research',
    technologies: ['esp32', 'lora', 'sensors', 'python'],
    contributors: ['m-05', 'm-16', 'm-22'],
    problem: {
      en: 'Monitor a water channel for weeks without mains power or mobile coverage.',
      ar: 'مراقبة قناة مائية لأسابيع دون كهرباء أو تغطية للهاتف المحمول.',
    },
    technicalApproach: {
      overview: { en: 'A sleep-first firmware wakes every ten minutes, samples turbidity and temperature, and sends a compact packet over LoRa to a gateway two kilometres away.', ar: 'برنامج ثابت يبدأ بالسكون ويستيقظ كل عشر دقائق ليقيس العكارة ودرجة الحرارة، ويرسل حزمة صغيرة عبر LoRa إلى بوابة على بعد كيلومترين.' },
      decisions: [
        t('Sleep-first firmware: the node is awake only long enough to measure and send.', 'برنامج ثابت يبدأ بالسكون: لا تستيقظ الوحدة إلا بقدر ما تقيس وترسل.'),
        t('LoRa instead of mobile data, for channels far from coverage.', 'اتصال LoRa بدل بيانات الهاتف، للقنوات البعيدة عن التغطية.'),
      ],
    },
    stage: 'testing',
    achievements: [],
    development: [t('Enclosure and solar supply built', 'بناء الغلاف ومصدر الطاقة الشمسية'), t('Gateway link checked across campus', 'التحقق من الاتصال بالبوابة عبر الحرم')],
    validation: [],
    nextSteps: t('A month-long deployment on a monitored channel.', 'تشغيل لمدة شهر على قناة خاضعة للرصد.'),
    collaboration: {
      seeking: t('A partner site with a water channel and reference measurements.', 'موقع شريك به قناة مائية وقياسات مرجعية.'),
      application: t('Low-cost monitoring for irrigation and water utilities.', 'رصد منخفض الكلفة للري ومرافق المياه.'),
    },
    solution: {
      en: 'A sealed enclosure with a small solar panel, designed to run unattended; the readings feed a simple dashboard for the team.',
      ar: 'غلاف محكم بلوح شمسي صغير صُمّم ليعمل دون إشراف، وتغذّي القراءات لوحة بيانات بسيطة للفريق.',
    },
    parts: [
      part('ESP32 board', 'لوحة ESP32'),
      part('Turbidity probe', 'مسبار العكارة'),
      part('Temperature probe', 'مسبار الحرارة'),
      part('LoRa radio', 'وحدة LoRa'),
      part('Solar panel', 'لوح شمسي'),
      part('Sealed enclosure', 'غلاف محكم'),
    ],
    model: 'sensor-node',
    media: [model3d(true), sheet('sensor-node')],
  },
  {
    ...home('seismic-truss-model'),
    sample: true,
    year: 2024,
    type: 'course',
    technologies: ['ansys', 'autocad', 'sensors'],
    contributors: ['m-02', 'm-09', 'm-14', 'm-19', 'm-23', 'm-11'],
    problem: {
      en: 'Which bracing layout keeps a light truss stiffest under side-to-side shaking?',
      ar: 'أي نمط تدعيم يُبقي الجملون الخفيف أكثر صلابة تحت الاهتزاز الجانبي؟',
    },
    technicalApproach: {
      overview: { en: 'Three bracing layouts were modelled in ANSYS, then built at 1:20 and tested on a shake table with accelerometers on each deck.', ar: 'نُمذجت ثلاثة أنماط تدعيم في ANSYS، ثم بُنيت بمقياس 1:20 واختُبرت على طاولة اهتزاز مع مقاييس تسارع على كل طابق.' },
      decisions: [
        t('All three layouts share one frame, so only the bracing changes between tests.', 'تشترك الأنماط الثلاثة في هيكل واحد، فلا يتغير بين الاختبارات سوى التدعيم.'),
        t('An accelerometer on every deck allows a direct comparison of response.', 'مقياس تسارع على كل طابق يتيح مقارنة مباشرة للاستجابة.'),
      ],
    },
    stage: 'completed',
    achievements: [],
    development: [t('Layouts modelled in ANSYS', 'نمذجة الأنماط في ANSYS'), t('Models built and shake-table tests run', 'بناء النماذج وإجراء اختبارات طاولة الاهتزاز')],
    validation: [],
    nextSteps: t('Hand the test method to the next cohort for a timber version.', 'تسليم طريقة الاختبار للدفعة التالية لنسخة خشبية.'),
    collaboration: {
      seeking: t('Shake-table time and review from structural engineers.', 'وقت على طاولة اهتزاز، ومراجعة من مهندسين إنشائيين.'),
    },
    solution: {
      en: 'Three 1:20 trusses with different bracing, a shake-table test plan, and a report comparing the layouts.',
      ar: 'ثلاثة جملونات بمقياس 1:20 بأنماط تدعيم مختلفة، وخطة اختبار على طاولة الاهتزاز، وتقرير يقارن الأنماط.',
    },
    parts: [
      part('Chords', 'أوتار علوية وسفلية', 4),
      part('Diagonal braces', 'دعامات قطرية', 12),
      part('Gusset plates', 'ألواح وصل', 16),
      part('Accelerometers', 'مقاييس تسارع', 3),
    ],
    model: 'truss',
    media: [model3d(false), sheet('truss')],
  },
  {
    ...home('shelter-cooling-study'),
    sample: true,
    alsoDisciplines: ['civil'],
    year: 2025,
    type: 'research',
    technologies: ['sensors', 'python', 'solidworks'],
    contributors: ['m-01', 'm-10', 'm-17', 'm-24'],
    problem: {
      en: 'Campus shelters trap heat by midday. Can shape and shade do the work of air conditioning?',
      ar: 'تحتجز مظلات الحرم الحرارة عند الظهيرة. هل يمكن للشكل والظل أن يقوما بعمل التكييف؟',
    },
    technicalApproach: {
      overview: { en: 'Temperature and airflow loggers recorded four existing shelters for a month; a scale model then tested a raised, vented roof.', ar: 'سجّلت أجهزة لرصد الحرارة وحركة الهواء أربع مظلات قائمة لمدة شهر، ثم اختبر نموذج مصغّر سقفًا مرتفعًا ذا فتحات تهوية.' },
      decisions: [
        t('Monitor the existing shelters first, then propose changes.', 'رصد المظلات القائمة أولًا، ثم اقتراح التغييرات.'),
        t('Passive cooling only: shape, shade and airflow, no machinery.', 'تبريد سلبي فقط: الشكل والظل وحركة الهواء، دون آلات.'),
      ],
    },
    stage: 'research',
    achievements: [],
    development: [t('A month of temperature and airflow logging', 'شهر من رصد الحرارة وحركة الهواء'), t('Scale model of a raised, vented roof built', 'بناء نموذج مصغّر لسقف مرتفع مهوّى')],
    validation: [],
    nextSteps: t('Build a full-size roof section for a summer comparison.', 'بناء جزء من السقف بالحجم الكامل لمقارنة صيفية.'),
    collaboration: {
      seeking: t('Campus estates support for a full-size trial.', 'دعم إدارة مرافق الحرم لتجربة بالحجم الكامل.'),
      application: t('Shaded outdoor spaces in hot climates.', 'المساحات الخارجية المظللة في المناخات الحارة.'),
    },
    solution: {
      en: 'A double roof with a ventilated gap, drawn and built at model scale to compare with the existing design.',
      ar: 'سقف مزدوج بفجوة مهوّاة، رُسم وبُني بمقياس مصغّر لمقارنته بالتصميم القائم.',
    },
    parts: [
      part('Steel frame', 'هيكل فولاذي'),
      part('Upper roof sheet', 'لوح السقف العلوي'),
      part('Lower roof sheet', 'لوح السقف السفلي'),
      part('Data loggers', 'أجهزة رصد', 4),
    ],
    model: 'shelter',
    media: [model3d(true), sheet('shelter')],
  },
  {
    ...home('produced-water-bench'),
    sample: true,
    alsoDisciplines: ['petroleum'],
    year: 2024,
    type: 'capstone',
    technologies: ['aspen', 'matlab'],
    contributors: ['m-04', 'm-13', 'm-20', 'm-15'],
    problem: {
      en: 'Water produced with oil is costly to dispose of. How much could be treated for reuse?',
      ar: 'التخلص من المياه المصاحبة لإنتاج النفط مكلف. ما الكمية التي يمكن معالجتها لإعادة استخدامها؟',
    },
    technicalApproach: {
      overview: { en: 'A bench-scale separator and filter train were simulated in Aspen HYSYS, then built and run on prepared samples.', ar: 'مُحاكاة فاصل على نطاق مخبري وسلسلة ترشيح في Aspen HYSYS، ثم بناؤهما وتشغيلهما على عيّنات محضّرة.' },
      decisions: [
        t('Simulate first, then build only the units the simulation favoured.', 'المحاكاة أولًا، ثم بناء الوحدات التي رجّحتها المحاكاة فقط.'),
      ],
    },
    stage: 'completed',
    achievements: [],
    development: [t('Process simulated in Aspen HYSYS', 'محاكاة العملية في Aspen HYSYS'), t('Bench separator and filters built and run', 'بناء الفاصل والمرشحات المخبرية وتشغيلها')],
    validation: [],
    nextSteps: t('Outline a field-scale pilot with an operator partner.', 'وضع تصور لتجربة بحجم الحقل مع شريك مشغّل.'),
    collaboration: {
      seeking: t('Field samples and guidance from produced-water specialists.', 'عيّنات من الحقل، وتوجيه من مختصين في المياه المصاحبة.'),
      application: t('Water reuse in oil and gas operations.', 'إعادة استخدام المياه في عمليات النفط والغاز.'),
    },
    solution: {
      en: 'A bench-scale separator and filter train, and a report setting out what a field-scale unit would need.',
      ar: 'فاصل وسلسلة ترشيح على نطاق مخبري، وتقرير يحدد ما تحتاجه وحدة بحجم الحقل.',
    },
    parts: [
      part('Separator vessel', 'وعاء الفصل'),
      part('Agitator', 'خلّاط'),
      part('Filter columns', 'أعمدة ترشيح', 2),
      part('Dosing pump', 'مضخة جرعات'),
    ],
    model: 'reactor',
    media: [model3d(false), sheet('water-bench')],
  },
  {
    slug: 'vision-sorting-arm',
    sample: true,
    title: { en: 'Vision-guided sorting arm', ar: 'ذراع فرز موجّهة بالرؤية' },
    discipline: 'mechatronics',
    alsoDisciplines: ['industrial'],
    year: 2026,
    type: 'capstone',
    technologies: ['raspberrypi', 'vision', 'python', 'printing'],
    contributors: ['m-03', 'm-08', 'm-12', 'm-21'],
    summary: {
      en: 'A four-axis arm that sees parts on a tray, picks them and sorts them by colour and shape.',
      ar: 'ذراع رباعية المحاور ترى القطع على صينية، فتلتقطها وتفرزها حسب اللون والشكل.',
    },
    problem: {
      en: 'Pick small parts reliably when they arrive in any orientation.',
      ar: 'التقاط القطع الصغيرة بثبات مهما كان اتجاه وصولها.',
    },
    technicalApproach: {
      overview: { en: 'A camera above the tray finds each part’s outline; inverse kinematics plans the reach and the gripper closes on the narrowest side.', ar: 'تحدد كاميرا فوق الصينية حدود كل قطعة، وتخطط الحركة العكسية للوصول، ثم يُغلق الملقط على أضيق جانب.' },
      decisions: [
        t('Printed links keep the arm light and cheap to repair.', 'الروابط المطبوعة تُبقي الذراع خفيفة ورخيصة الإصلاح.'),
        t('The gripper closes on each part’s narrowest side, so orientation matters less.', 'يُغلق الملقط على أضيق جانب في كل قطعة، فيقلّ أثر اتجاهها.'),
      ],
    },
    stage: 'development',
    achievements: [],
    development: [t('Arm assembled with four servo joints', 'تركيب الذراع بأربعة مفاصل مؤازرة'), t('Camera calibration routine written', 'كتابة روتين معايرة الكاميرا')],
    validation: [],
    nextSteps: t('Close the loop between vision and grip, then test on mixed trays.', 'ربط الرؤية بالالتقاط في حلقة مغلقة، ثم الاختبار على صوانٍ مختلطة.'),
    collaboration: {
      seeking: t('Advice on industrial vision lighting and gripper design.', 'استشارة في إضاءة الرؤية الصناعية وتصميم الملاقط.'),
      application: t('Small-batch sorting and inspection.', 'الفرز والفحص للدفعات الصغيرة.'),
    },
    solution: {
      en: 'A light, printed four-axis arm with a camera above the tray; the sorting logic and calibration routine are documented for reuse.',
      ar: 'ذراع رباعية المحاور خفيفة ومطبوعة مع كاميرا فوق الصينية، ومنطق الفرز وروتين المعايرة موثّقان لإعادة الاستخدام.',
    },
    parts: [
      part('Base and turntable', 'القاعدة والقرص الدوّار'),
      part('Arm links', 'روابط الذراع', 3),
      part('Servo motors', 'محركات مؤازرة', 4),
      part('Gripper', 'ملقط'),
      part('Camera', 'كاميرا'),
    ],
    drawing: 'robotics-workshop',
    model: 'arm',
    media: [model3d(false), turntable('vision-sorting-arm', t('Turntable render', 'عرض دوّار للنموذج')), sheet('robotics-workshop'), library('/images/activities/graduate-workshops.jpg', 1600, 2400, t('A society workshop session', 'جلسة ورشة في الجماعة'), t('Students working at computers in a lab; in the foreground, one models a 3D shape on a laptop.', 'طلاب يعملون على الحواسيب في مختبر، وفي المقدمة طالب يصمّم مجسّمًا ثلاثي الأبعاد على حاسوبه المحمول.'))],
  },
  {
    slug: 'lean-conveyor-line',
    sample: true,
    title: { en: 'Lean conveyor line study', ar: 'دراسة خط نقل رشيق' },
    discipline: 'industrial',
    year: 2025,
    type: 'course',
    technologies: ['plc', 'sensors', 'python'],
    contributors: ['m-06', 'm-15', 'm-24'],
    summary: {
      en: 'A desktop conveyor line used to measure how buffer size and station timing change throughput.',
      ar: 'خط نقل مكتبي لقياس أثر حجم المخزون الوسيط وتوقيت المحطات على معدل الإنتاج.',
    },
    problem: {
      en: 'Find the bottleneck on a line before buying more equipment.',
      ar: 'اكتشاف عنق الزجاجة في الخط قبل شراء معدات إضافية.',
    },
    technicalApproach: {
      overview: { en: 'Three PLC-controlled stations with sensors logged every part; the team varied one setting at a time.', ar: 'ثلاث محطات يتحكم بها متحكّم منطقي مع مستشعرات سجّلت كل قطعة، وغيّر الفريق إعدادًا واحدًا في كل مرة.' },
      decisions: [
        t('Change one setting at a time to isolate its effect on throughput.', 'تغيير إعداد واحد في كل مرة لعزل أثره على معدل الإنتاج.'),
      ],
    },
    stage: 'completed',
    achievements: [],
    development: [t('Three-station PLC line built', 'بناء خط بثلاث محطات يتحكم به متحكّم منطقي'), t('Throughput logged for each configuration', 'تسجيل معدل الإنتاج لكل إعداد')],
    validation: [],
    nextSteps: t('Package the rig and its exercises for teaching.', 'تجهيز النموذج وتمارينه للتدريس.'),
    collaboration: {
      seeking: t('Realistic line scenarios from manufacturing engineers.', 'سيناريوهات خطوط واقعية من مهندسي التصنيع.'),
      application: t('Teaching lean production.', 'تدريس الإنتاج الرشيق.'),
    },
    solution: {
      en: 'A three-station desktop line that changes one setting at a time, documented for use as a teaching aid.',
      ar: 'خط مكتبي بثلاث محطات يغيّر إعدادًا واحدًا في كل مرة، موثّق لاستخدامه وسيلةً تعليمية.',
    },
    parts: [
      part('Belt conveyor', 'سير ناقل'),
      part('Stations', 'محطات', 3),
      part('PLC', 'متحكّم منطقي'),
      part('Photoelectric sensors', 'مستشعرات ضوئية', 6),
    ],
    drawing: 'sensor-node',
    model: 'conveyor',
    media: [model3d(false), sheet('sensor-node')],
  },
  {
    slug: 'gearbox-test-rig',
    sample: true,
    title: { en: 'Gearbox efficiency test rig', ar: 'منصة اختبار كفاءة صندوق التروس' },
    discipline: 'mechanical',
    year: 2026,
    type: 'research',
    technologies: ['matlab', 'sensors', 'solidworks'],
    contributors: ['m-01', 'm-09', 'm-17'],
    summary: {
      en: 'A rig that measures input and output torque to map a small gearbox’s efficiency across speeds.',
      ar: 'منصة تقيس عزم الدخل والخرج لرسم خريطة كفاءة صندوق تروس صغير عبر السرعات.',
    },
    problem: {
      en: 'Measure small losses accurately enough to compare two lubricants.',
      ar: 'قياس الفواقد الصغيرة بدقة كافية للمقارنة بين نوعين من مواد التشحيم.',
    },
    technicalApproach: {
      overview: { en: 'Torque sensors on both shafts and a controlled motor sweep the speed range while a load brake holds torque steady.', ar: 'مستشعرات عزم على العمودين ومحرك متحكّم به يمسحان نطاق السرعات بينما يثبّت مكبح التحميل العزم.' },
      decisions: [
        t('Torque is measured on both shafts, not estimated from the motor.', 'يُقاس العزم على العمودين ولا يُقدّر من المحرك.'),
        t('A load brake holds torque steady through the speed sweep.', 'يثبّت مكبح التحميل العزم أثناء مسح السرعات.'),
      ],
    },
    stage: 'prototype',
    achievements: [],
    development: [t('Rig designed in SolidWorks and built', 'تصميم المنصة في SolidWorks وبناؤها'), t('Torque sensors calibrated', 'معايرة مستشعرات العزم')],
    validation: [],
    nextSteps: t('Compare two lubricants across the speed range.', 'المقارنة بين مادتي تشحيم عبر نطاق السرعات.'),
    collaboration: {
      seeking: t('Lubricant samples and a reference gearbox from industry.', 'عيّنات مواد تشحيم وصندوق تروس مرجعي من القطاع الصناعي.'),
      application: t('Efficiency testing for small drives.', 'اختبار كفاءة المحركات الصغيرة.'),
    },
    solution: {
      en: 'A test rig with torque sensing on both shafts, with its drawings and calibration notes archived.',
      ar: 'منصة اختبار تقيس العزم على العمودين، ورسوماتها وملاحظات معايرتها مؤرشفة.',
    },
    parts: [
      part('Gear pair', 'زوج تروس', 2),
      part('Shafts', 'أعمدة', 2),
      part('Torque sensors', 'مستشعرات عزم', 2),
      part('Load brake', 'مكبح تحميل'),
    ],
    drawing: 'shelter',
    model: 'gearbox',
    media: [model3d(true), sheet('shelter')],
  },
  {
    slug: 'well-integrity-monitor',
    sample: true,
    title: { en: 'Well-integrity monitoring model', ar: 'نموذج مراقبة سلامة الآبار' },
    discipline: 'petroleum',
    year: 2025,
    type: 'research',
    technologies: ['matlab', 'sensors', 'python'],
    contributors: ['m-04', 'm-13', 'm-20'],
    summary: {
      en: 'A scale well model with pressure sensing that flags a casing leak before it grows.',
      ar: 'نموذج بئر مصغّر مزوّد باستشعار الضغط ينبّه إلى تسرّب الغلاف قبل أن يتفاقم.',
    },
    problem: {
      en: 'Detect a small leak in a sealed annulus from surface measurements alone.',
      ar: 'اكتشاف تسرّب صغير في حيز حلقي محكم من قياسات السطح وحدها.',
    },
    technicalApproach: {
      overview: { en: 'Pressure in each annulus was logged while leaks of known size were introduced; a simple model learned the pressure signature.', ar: 'سُجّل الضغط في كل حيز حلقي أثناء إحداث تسرّبات معلومة الحجم، وتعلّم نموذج بسيط بصمة الضغط.' },
      decisions: [
        t('Surface pressure only, to match what operators can measure in the field.', 'ضغط السطح فقط، ليطابق ما يستطيع المشغّلون قياسه في الحقل.'),
        t('Leaks of known size are introduced to build a labelled dataset.', 'تُحدث تسرّبات معلومة الحجم لبناء بيانات مصنّفة.'),
      ],
    },
    stage: 'research',
    achievements: [],
    development: [t('Scale well with three annuli built', 'بناء بئر مصغّرة بثلاثة أحياز حلقية'), t('Pressure logging set up', 'تجهيز رصد الضغط')],
    validation: [],
    nextSteps: t('Test the detection model on leak sizes it has not seen.', 'اختبار نموذج الكشف على أحجام تسرّب لم يرها.'),
    collaboration: {
      seeking: t('Review by well-integrity engineers.', 'مراجعة من مهندسي سلامة الآبار.'),
      application: t('Early warning of casing leaks.', 'إنذار مبكر بتسرّبات الغلاف.'),
    },
    solution: {
      en: 'A scale well with pressure sensing in each annulus and a detection model, written up for the next team.',
      ar: 'بئر مصغّرة مع استشعار للضغط في كل حيز حلقي ونموذج للكشف، موثّقة للفريق التالي.',
    },
    parts: [
      part('Derrick frame', 'هيكل البرج'),
      part('Casing strings', 'سلاسل الغلاف', 2),
      part('Pressure sensors', 'مستشعرات ضغط', 3),
      part('Data logger', 'جهاز رصد'),
    ],
    drawing: 'site-visit',
    model: 'derrick',
    media: [model3d(false), sheet('site-visit')],
  },
  {
    slug: 'campus-microgrid',
    sample: true,
    title: { en: 'Campus solar microgrid controller', ar: 'متحكّم شبكة شمسية مصغّرة للحرم' },
    discipline: 'electrical',
    alsoDisciplines: ['industrial'],
    year: 2026,
    type: 'competition',
    technologies: ['esp32', 'python', 'sensors'],
    contributors: ['m-05', 'm-16', 'm-22', 'm-08'],
    summary: {
      en: 'A controller that decides when a small solar array charges batteries, powers loads or rests.',
      ar: 'متحكّم يقرّر متى تشحن مصفوفة شمسية صغيرة البطاريات أو تغذّي الأحمال أو تتوقف.',
    },
    problem: {
      en: 'Keep a building’s critical loads running through the evening peak from solar energy stored by day.',
      ar: 'إبقاء الأحمال الحرجة لمبنى تعمل خلال ذروة المساء من طاقة شمسية مخزّنة نهارًا.',
    },
    technicalApproach: {
      overview: { en: 'A scheduling routine weighs forecast sun, battery state and load priority every minute.', ar: 'روتين جدولة يوازن كل دقيقة بين توقعات الشمس وحالة البطارية وأولوية الأحمال.' },
      decisions: [
        t('Critical loads are ranked ahead of battery charging.', 'تتقدّم الأحمال الحرجة على شحن البطاريات.'),
        t('Every decision is re-evaluated each minute.', 'يُعاد تقييم كل قرار كل دقيقة.'),
      ],
    },
    stage: 'prototype',
    achievements: [{ competition: t('Student Projects Challenge', 'تحدي مشاريع الطلبة'), result: 'finalist', year: 2025, sample: true }],
    development: [t('Controller board and current sensing built', 'بناء لوحة التحكم واستشعار التيار'), t('Scheduling routine running on the bench model', 'تشغيل روتين الجدولة على النموذج المخبري')],
    validation: [],
    nextSteps: t('Prepare a pilot proposal for one campus building.', 'إعداد مقترح تجريبي لمبنى واحد في الحرم.'),
    collaboration: {
      seeking: t('A pilot site and support from the campus estates team.', 'موقع تجريبي ودعم من فريق مرافق الحرم.'),
      application: t('Small solar installations on campus buildings.', 'المنظومات الشمسية الصغيرة على مباني الحرم.'),
    },
    solution: {
      en: 'A bench model of the controller and its scheduling routine, with the documentation for a pilot proposal.',
      ar: 'نموذج مخبري للمتحكم وروتين الجدولة، مع وثائق مقترح تجريبي.',
    },
    parts: [
      part('Controller board', 'لوحة التحكم'),
      part('Current sensors', 'مستشعرات تيار', 4),
      part('Relay bank', 'مجموعة مرحّلات'),
      part('Battery interface', 'واجهة البطارية'),
    ],
    drawing: 'sensor-node',
    model: 'sensor-node',
    media: [model3d(false), sheet('sensor-node')],
  },
]
