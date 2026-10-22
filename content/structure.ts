import type { Localized } from '@/lib/i18n'
import type { MediaImage } from './media'

/**
 * The society's organisation, as structured data. Both the homepage leadership tree and the
 * About page chart render from here; nothing is positioned by hand.
 *
 * ROSTER STATUS: the President and the three Vice Presidents are named from the society's own
 * portrait files (/photos: "<name> رئيس الجماعة", "<name> نائب/نائبة رئيس الجماعة"). Their Arabic
 * names are as written there; the English spellings are transliterations for the society to
 * confirm. No term, responsibilities or committee roster has been supplied, so the term stays
 * hidden and every committee seat is vacant (`holder: null`) as an intentional placeholder.
 *
 * HIERARCHY NOTES
 * - Senior leadership is one President and three Vice Presidents (the homepage requirement).
 * - The supplied brief listed فريق التصوير twice. It appears once here, under اللجنة الإعلامية,
 *   until the society confirms whether a second team was intended and where it belongs.
 * - Committee chairs and deputies are added to `roles` only when the actual roster specifies
 *   them. No committee is assumed to have a particular number of deputies.
 * - Arabic names (`name.ar`) are the society's own; English names are working labels.
 */

export interface Person {
  name: Localized
  portrait: MediaImage | null
  /** CSS object-position for consistent head-and-shoulders crops, e.g. '50% 28%'. */
  portraitFocus?: string
}

export interface Position {
  id: string
  title: Localized
  holder: Person | null
  /** Optional subtitle, shown only when supplied. */
  responsibility?: Localized | null
}

export interface Team {
  id: string
  name: Localized
}

export interface CommitteeRole {
  title: Localized
  holder: Person | null
}

export interface Committee {
  id: string
  name: Localized
  roles: CommitteeRole[]
  teams: Team[]
}

export const SENIOR_LEADERSHIP: Localized = { en: 'Senior leadership', ar: 'الإدارة العليا' }

const PRESIDENT: Localized = { en: 'President', ar: 'الرئيس' }
const VICE_PRESIDENT: Localized = { en: 'Vice President', ar: 'نائب الرئيس' }
/** The Arabic title agrees with the holder: نائبة for a woman. */
const VICE_PRESIDENT_F: Localized = { en: 'Vice President', ar: 'نائبة الرئيس' }

/**
 * A leader with their portrait: a head-and-shoulders square cut from the society's own
 * photograph. `role` words the portrait's description ("President of …" / "رئيس …").
 */
const leader = (file: string, name: Localized, role: Localized): Person => ({
  name,
  portrait: {
    src: `/images/leadership/${file}.jpg`,
    width: 900,
    height: 900,
    alt: { en: `${name.en}, ${role.en} of the Engineering Society`, ar: `${name.ar}، ${role.ar} الجماعة الهندسية` },
  },
  portraitFocus: '50% 45%',
})

export const LEADERSHIP: {
  /** e.g. { en: '2026–27 academic year', ar: 'العام الأكاديمي 2026–2027' }. Hidden while null. */
  term: Localized | null
  president: Position
  vicePresidents: Position[]
} = {
  term: null,
  president: { id: 'president', title: PRESIDENT, holder: leader('saif-al-marjabi', { ar: 'سيف المرجبي', en: 'Saif Al Marjabi' }, { en: 'President', ar: 'رئيس' }) },
  vicePresidents: [
    {
      id: 'vice-president-1',
      title: VICE_PRESIDENT,
      holder: leader('abdulrahman-al-qurri', { ar: 'عبدالرحمن القري', en: 'Abdulrahman Al Qurri' }, { en: 'Vice President', ar: 'نائب رئيس' }),
    },
    {
      id: 'vice-president-2',
      title: VICE_PRESIDENT_F,
      holder: leader('kawthar-abdwani', { ar: 'كوثر عبدواني', en: 'Kawthar Abdwani' }, { en: 'Vice President', ar: 'نائبة رئيس' }),
    },
    {
      id: 'vice-president-3',
      title: VICE_PRESIDENT_F,
      holder: leader('haya-al-zadjali', { ar: 'هيا الزدجالي', en: 'Haya Al Zadjali' }, { en: 'Vice President', ar: 'نائبة رئيس' }),
    },
  ],
}

export const COMMITTEES: Committee[] = [
  { id: 'finance', name: { ar: 'اللجنة المالية', en: 'Finance Committee' }, roles: [], teams: [] },
  {
    id: 'media',
    name: { ar: 'اللجنة الإعلامية', en: 'Media Committee' },
    roles: [],
    teams: [
      { id: 'photography', name: { ar: 'فريق التصوير', en: 'Photography Team' } },
      { id: 'marketing', name: { ar: 'فريق التسويق', en: 'Marketing Team' } },
    ],
  },
  {
    id: 'support',
    name: { ar: 'لجنة الدعم والإسناد', en: 'Support Committee' },
    roles: [],
    teams: [{ id: 'technical', name: { ar: 'الفريق التقني', en: 'Technical Team' } }],
  },
  {
    id: 'relations',
    name: { ar: 'لجنة العلاقات', en: 'Relations Committee' },
    roles: [],
    teams: [
      { id: 'external-relations', name: { ar: 'فريق العلاقات الخارجية', en: 'External Relations Team' } },
      { id: 'public-relations', name: { ar: 'فريق العلاقات العامة', en: 'Public Relations Team' } },
    ],
  },
  {
    id: 'members-graduates',
    name: { ar: 'لجنة شؤون الأعضاء والخريجين', en: 'Members & Graduates Committee' },
    roles: [],
    teams: [],
  },
  { id: 'activities', name: { ar: 'لجنة الأنشطة', en: 'Activities Committee' }, roles: [], teams: [] },
  { id: 'projects', name: { ar: 'لجنة المشاريع', en: 'Projects Committee' }, roles: [], teams: [] },
  { id: 'exhibition', name: { ar: 'لجنة المعرض', en: 'Exhibition Committee' }, roles: [], teams: [] },
]
