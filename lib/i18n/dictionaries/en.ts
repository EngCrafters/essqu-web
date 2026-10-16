import { pluralEn } from '../plural'
import { platformEn } from './platform-en'

/**
 * English interface copy. The Arabic dictionary has the same shape (TypeScript enforces it),
 * so a string added here must be translated before the project builds. Copy that belongs to a
 * piece of content (an event, a discipline, an activity) lives with that content instead.
 */
export const en = {
  meta: {
    title: 'Engineering Society — Sultan Qaboos University',
    description:
      'The Engineering Society at Sultan Qaboos University — discover events, share projects, preserve achievements and connect across engineering disciplines.',
    aboutTitle: 'About — Engineering Society',
    aboutDescription:
      'About the Engineering Society at Sultan Qaboos University: who we are, and how the society is organised.',
    archiveTitle: 'Previous Activities — Engineering Society',
    archiveDescription: 'Past editions of the Engineering Society’s programmes at Sultan Qaboos University.',
  },

  site: {
    name: 'Engineering Society',
    affiliation: 'Sultan Qaboos University',
    eyebrow: 'Engineering Society · Sultan Qaboos University',
  },

  common: {
    skipToContent: 'Skip to content',
    sample: 'Sample',
    preview: 'Preview',
    close: 'Close',
    opensInNewTab: '(opens in a new tab)',
    photoToCome: 'Photograph to come',
    toBeAnnounced: 'To be announced',
    /** Joins a date and a time: "Mon 12 Oct 2026, 16:00–18:00". */
    comma: ', ',
  },

  nav: {
    sectionsLabel: 'Sections',
    links: {
      events: 'Events',
      projects: 'Projects',
      disciplines: 'Disciplines',
      activities: 'Archive',
      about: 'About',
    },
    join: 'Join the Society',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    backToTop: ', back to top',
    home: ', home',
    language: 'Language',
    switchTo: 'Switch to English',
    homePage: 'Home',
    breadcrumb: 'Breadcrumb',
  },

  hero: {
    titleStart: 'Where ideas',
    titleEnd: 'take shape',
    lead: 'Meet the people, build the projects, and discover the experiences that move your engineering journey forward.',
    exploreEvents: 'Explore Events',
    discoverProjects: 'Discover Projects',
    caption: 'Different disciplines, one society.',
  },

  stats: {
    title: 'The society at a glance',
    factsTitle: 'The society in brief',
    placeholder: 'Verified figure to come',
    pendingNote: 'Figures appear here once they are confirmed from the society’s records and the site’s analytics.',
    demoTag: 'Demo figure',
    demoNote: 'Demonstration figures for preview only, not verified society statistics.',
    yearRange: (from: number, to: number) => `${from} to ${to}`,
    seeNote: (n: number) => `(see note ${n})`,
    note: (n: number) => `Note ${n}:`,
  },

  overview: {
    more: 'More about the society',
  },

  events: {
    title: 'Find your next experience.',
    sampleStrong: 'Sample listings.',
    sampleBody: 'No events have been published on the platform yet; these show how they will appear.',
    alsoComingUp: 'Also coming up',
    empty: 'No events are scheduled right now. New workshops and talks will appear here as committees publish them.',
    dateTime: 'Date and time',
    location: 'Location',
    featured: 'Featured',
    timezone: 'Oman time (UTC+4)',
    types: { workshop: 'Workshop', talk: 'Talk', 'site-visit': 'Site visit', competition: 'Competition' },
    registration: {
      open: 'Registration open',
      waitlist: 'Waitlist only',
      closed: 'Registration closed',
      preview: 'Registration opens with Phase 1',
    },
    previewRegistration: 'Preview registration',
    previewFor: (label: string, title: string) => `${label} for ${title}`,
  },

  projects: {
    title: 'Built by our community.',
    lead: 'Projects and publications, kept with their discipline, year and team so each generation can build on the last instead of starting over.',
    noteStrong: 'Award-winning work.',
    noteBody: 'Projects recognised in the society’s exhibitions and beyond. Full project pages are coming soon.',
    filterLabel: 'Filter projects by discipline',
    all: 'All',
    showingAll: (n: number) => `Showing all ${pluralEn(n, 'project', 'projects')}`,
    showingIn: (n: number, discipline: string) => `Showing ${pluralEn(n, 'project', 'projects')} in ${discipline}`,
    alsoInArchive: 'More projects',
    onlyOne: 'This is the only project in this discipline so far.',
    archiveOpens: 'Full project page coming soon',
    discipline: 'Discipline',
    year: 'Year',
    team: 'Team',
    teamOf: (n: number) => `Team of ${n}`,
  },

  disciplines: {
    title: 'Different disciplines. Shared ambition.',
    sampleProjects: 'Projects',
    sampleProjectsIn: (name: string) => `Projects in ${name}`,
  },

  activities: {
    title: 'Engineering Society Activities',
    lead: 'Explore the programmes, gatherings, and experiences that bring our community together.',
    figuresStrong: 'Programme figures to come.',
    figuresBody: 'They’ll appear with each programme once the society confirms them.',
    photosStrong: 'Photographs and figures to come.',
    photosBody: 'They’ll appear with each programme once the society supplies and confirms them.',
    explorePrevious: 'Explore Previous Activities',
    previousEditions: 'Previous editions',
    date: 'Date',
    attendance: 'Attendance',
    attendees: (n: number, shown: string) => `${shown} ${n === 1 ? 'attendee' : 'attendees'}`,
    visitors: (n: number, shown: string) => `${shown} ${n === 1 ? 'visitor' : 'visitors'}`,
    slideOf: (i: number, n: number) => `${i} of ${n}`,
    showSlide: (i: number, title: string) => `Show slide ${i}: ${title}`,
    pause: 'Pause slideshow',
    play: 'Play slideshow',
  },

  leadership: {
    title: 'Meet the Society’s Leadership',
    rosterStrong: 'Roster to be announced.',
    rosterBody: 'Names, portraits and the current term will appear here once the society confirms them.',
    viewStructure: 'View the Full Society Structure',
    seniorLeadership: 'Senior leadership',
    vicePresidents: 'Vice Presidents',
    nameToBeAnnounced: 'Name to be announced',
  },

  structure: {
    title: 'How the society is organised',
    lead: 'Senior leadership sets the direction; committees and their teams carry the society’s work.',
    rosterStrong: 'Roster to be announced.',
    rosterBody:
      'Names, portraits, committee chairs and deputies will be added once the society confirms its current roster.',
    committees: 'Committees',
    teamsIn: (committee: string) => `Teams in the ${committee}`,
  },

  join: {
    title: 'Make your next idea a shared one',
    body: 'Membership starts with one permanent profile: your events, certificates and projects in one place, carried forward every year. Member registration is part of the platform’s first release.',
    join: 'Join the Society',
    exploreEvents: 'Explore Events',
  },

  footer: {
    tagline: 'Discover events, share projects, preserve achievements.',
    studentSocietyAt: 'A student society at',
    squAlt: 'Sultan Qaboos University',
    follow: 'Follow the Society',
    linkToCome: 'Link to come',
    navLabel: 'Footer',
    copyright: (year: number, name: string, affiliation: string) => `© ${year} ${name}, ${affiliation}.`,
    previewSite: 'Preview site. Platform features arrive in phases.',
    groups: { society: 'Society', explore: 'Explore', community: 'Community' },
  },

  about: {
    title: 'About the society',
    lead: 'A student-run organisation at the College of Engineering, and the umbrella for the college’s seven engineering societies.',
  },

  archive: {
    eyebrow: 'Engineering Society Activities',
    title: 'Previous Activities',
    lead: 'A record of past editions of the society’s programmes, by programme and year.',
    regionLabel: 'Archive of previous activities',
    emptyTitle: 'No previous activities have been archived yet.',
    emptyBody:
      'As the society documents past editions of its programmes, each will be listed here by programme and year, with photographs where available.',
    back: 'Back to Activities',
    toBeArchived: 'Programmes to be archived',
    filterProgramme: 'Filter by programme',
    filterYear: 'Filter by year',
    allProgrammes: 'All programmes',
    allYears: 'All years',
    showing: (n: number) => `Showing ${pluralEn(n, 'edition', 'editions')}`,
    noMatch: 'No editions match these filters.',
    viewEdition: 'View this edition',
  },

  /** Everything beyond the homepage: see platform-en.ts. */
  platform: platformEn,
}

export type Dictionary = typeof en
