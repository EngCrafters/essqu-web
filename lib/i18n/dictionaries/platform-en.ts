import { pluralEn } from '../plural'
import { certificatesEn, networkEn } from './pages/vault'
import { membersEn, registerEn } from './pages/people'
import { accountEn } from './pages/account'
import { projectsEn } from './pages/projects'
import { activitiesEn, eventsEn } from './pages/events'
import { aboutEn, leadershipEn } from './pages/about'
import { disciplinesEn } from './pages/disciplines'

/**
 * Interface copy for the platform pages (everything beyond the homepage). Kept apart from the
 * homepage dictionary so the approved homepage copy never moves. platform-ar.ts is typed
 * against this file: a key added here must be translated before the project builds.
 */
export const platformEn = {
  nav: {
    community: 'Community',
    communityLabel: 'Community pages',
    members: 'Members',
    membersNote: 'The society’s member directory',
    network: 'Graduate network',
    networkNote: 'Graduates and mentorship',
    leadership: 'Leadership',
    leadershipNote: 'How the society is led',
    certificates: 'Certificates',
    certificatesNote: 'Your certificates and verification',
    profile: 'My profile',
    profileNote: 'Your engineering journey',
    register: 'Join the Society',
    menuSections: 'Explore',
  },

  sample: {
    strong: 'Platform preview.',
    body: 'People, events, projects, figures and certificates on these pages are sample data. Nothing you do here is submitted or saved beyond this browser tab.',
    tag: 'Sample',
  },

  filters: {
    search: 'Search',
    filters: 'Filters',
    clearAll: 'Clear all',
    all: 'All',
    any: 'Any',
    sort: 'Sort by',
    close: 'Close filters',
    apply: (n: number) => `Show ${pluralEn(n, 'result', 'results')}`,
    results: (n: number, total: number) => (n === total ? `${pluralEn(n, 'result', 'results')}` : `${n} of ${total}`),
    active: (n: number) => `${pluralEn(n, 'filter', 'filters')} on`,
    remove: (label: string) => `Remove filter: ${label}`,
    discipline: 'Discipline',
    year: 'Year',
    category: 'Activity',
    type: 'Type',
    date: 'Date',
    technology: 'Technology',
    skills: 'Skills',
    interests: 'Interests',
    status: 'Status',
    academicYear: 'Academic year',
    graduation: 'Graduated',
    mentorship: 'Mentorship',
    newest: 'Newest first',
    oldest: 'Oldest first',
    az: 'A–Z',
    soonest: 'Soonest first',
  },

  states: {
    loading: 'Loading',
    errorTitle: 'This didn’t load',
    errorBody: 'The platform couldn’t be reached just now. Nothing you chose is lost; try again in a moment.',
    retry: 'Try again',
    emptyTitle: 'Nothing here yet',
    filteredTitle: 'Nothing matches these filters',
    filteredBody: 'Remove a filter or search for something broader.',
  },

  status: {
    open: 'Registration open',
    registered: 'Registered',
    full: 'Full',
    waitlist: 'Waitlist open',
    waitlisted: 'On the waitlist',
    closed: 'Registration closed',
    completed: 'Event completed',
    attended: 'Attended',
    absent: 'Absent',
    pending: 'Attendance pending',
  },

  eventTypes: {
    workshop: 'Workshop',
    talk: 'Talk',
    'site-visit': 'Site visit',
    competition: 'Competition',
    seminar: 'Seminar',
    exhibition: 'Exhibition',
  },

  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    viewAll: 'View all',
    yearN: (n: number) => `Year ${n}`,
    classOf: (n: number) => `Class of ${n}`,
    people: (n: number) => pluralEn(n, 'person', 'people'),
    seatsLeft: (n: number) => `${pluralEn(n, 'seat', 'seats')} left`,
    of: (a: string, b: string) => `${a} of ${b}`,
    organisedBy: 'Organised by',
    disciplines: 'Disciplines',
    allDisciplines: 'All disciplines',
    sampleRecord: 'Sample record',
  },

  notFound: {
    metaTitle: 'Page not found · Engineering Society',
    code: 'Error 404',
    title: 'This drawing has no sheet.',
    body: 'The page you followed doesn’t exist, or it has moved. Everything else is where you left it.',
    home: 'Back to the homepage',
    events: 'See upcoming events',
    /** A record that doesn't exist: the section it belongs to explains, and leads back. */
    records: {
      event: { title: 'No event at this address.', body: 'This event doesn’t exist or is no longer listed. The timeline has every event, past and upcoming.', action: 'See all events' },
      project: { title: 'No project at this address.', body: 'This project doesn’t exist or has moved. The catalogue lists every society project.', action: 'See all projects' },
      member: { title: 'No member at this address.', body: 'This profile doesn’t exist, or it isn’t public.', action: 'See all members' },
      graduate: { title: 'No graduate at this address.', body: 'This profile doesn’t exist, or it is no longer listed in the network.', action: 'See the graduate network' },
      certificate: { title: 'No certificate with this number.', body: 'Check the link, or verify a certificate by its code in the vault.', action: 'Open the certificate vault' },
    },
  },

  /** Modules that are not open yet (content/site.ts → COMING_SOON). */
  comingSoon: {
    title: 'Coming Soon',
    body: 'This part of the Engineering Society platform is currently being prepared.',
    tag: 'Soon',
    status: 'In preparation',
    explore: 'Explore events',
    archive: 'Browse the archive',
    metaTitle: (name: string) => `${name} · Coming soon · Engineering Society`,
    sheetLabel: (name: string) => `Drawing sheet for the ${name} module, in preparation`,
    titleBlock: { module: 'Module', status: 'Status', sheet: 'Sheet' },
    modules: {
      projects: { name: 'Projects', note: 'Society projects, their stages, media and teams, gathered in one catalogue.' },
      members: { name: 'Members', note: 'A directory of the society’s members and the projects they build together.' },
      network: { name: 'Graduate network', note: 'The society’s graduates, and mentorship for current members.' },
      certificates: { name: 'Certificates', note: 'Participation certificates, and a desk to verify them.' },
      register: { name: 'Membership', note: 'Registration for the Engineering Society opens on the platform later.' },
      events: { name: 'Events', note: 'Workshops, visits and competitions, with registration and attendance.' },
      profile: { name: 'My profile', note: 'Your membership, your details and the events and projects you take part in.' },
    },
    register: {
      eyebrow: 'Membership',
      title: 'Membership opens soon.',
      lead: 'Registration for the Engineering Society is being prepared. Every member will carry a card like this one.',
      card: 'Member card',
      sample: 'Sample',
      name: { en: 'Ahmed S.', ar: 'أحمد س.' },
      number: 'Member no.',
      numberValue: 'ES-24-0142',
      year: 'Year',
      since: 'Member since',
      backTitle: 'Coming Soon',
      backBody: 'Membership registration will be available on the platform later.',
      society: 'Engineering Society',
      university: 'Sultan Qaboos University',
      turn: 'Turn the card',
      front: 'Card front',
      back: 'Card back',
      dimensions: 'ID-1 card',
      mm: 'mm',
      sampleNote: 'Sample card. Ahmed S. and these details are for demonstration only.',
    },
  },

  disciplinesPage: disciplinesEn,
  aboutPage: aboutEn,
  leadershipPage: leadershipEn,
  activitiesPage: activitiesEn,
  eventsPage: eventsEn,
  projectsPage: projectsEn,
  registerPage: registerEn,
  accountPage: accountEn,
  membersPage: membersEn,
  certificatesPage: certificatesEn,
  networkPage: networkEn,
}

export type PlatformDictionary = typeof platformEn
