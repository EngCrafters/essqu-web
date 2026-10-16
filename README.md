# ESWebsite — Engineering Society, Sultan Qaboos University

The Engineering Society's website, built with Next.js (App Router, TypeScript), GSAP and React
Three Fiber, in English and Arabic: the approved landing page at `/`, and a **frontend prototype
of the platform** (events, projects, members, certificates, graduates) on every other route.
Earlier drafts are kept:

- **Draft 1** (Vite): the sibling folder `../ES`, untouched.
- **Draft 2 / Draft 3** (Next.js): `drafts/draft-2-source.zip`, `drafts/draft-3-source.zip`.
- **Draft 4 onward:** this repository's git history.

Product scope comes from `PRD.pdf` (Idea & Requirements Document v1.0). There is no backend,
authentication, database, API route or admin tool: the platform pages run on local sample data,
and every action (registering, requesting mentorship, applying to join) happens in the browser
tab only. See **Platform prototype** below.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (includes type checking)
npm start          # serve the production build
npm run lint
npm run typecheck
```

**Testing on a phone:** run `npm run dev` and open the **Network** URL it prints (for example
`http://192.168.8.158:3000`) on a phone on the same Wi-Fi. Next.js blocks dev-only assets for
origins it doesn't know, so without `allowedDevOrigins` in `next.config.ts` the phone received
the HTML but the page never hydrated: no menu, no animations, no 3D. Private network ranges are
now allowed in development; production builds were never affected.

## Routes

- `/` — the approved landing page and the site's gateway: hero, society figures, overview,
  `#events`, `#activities`, `#projects`, `#disciplines`, `#leadership`, `#join`. **Locked**: its
  sections stay pixel-identical; their existing actions and cards lead to the full pages (see
  [Navigation](#navigation)).

Platform pages (`app/(platform)/`, sharing the site's navbar, footer and the demo session):

| Route | The room | Signature |
| --- | --- | --- |
| `/about` | Seven systems, one umbrella | Seven discipline symbols converge on the emblem (sticky scroll sequence): the emblem's four disciplines in front, the other three behind; the six activities as a programme board; activities and projects as a pair of columns for every year from the founding (2000) to today, with a readout you can move by pointer, drag or keyboard (sample figures), then the verified facts; the current President and Vice Presidents on the structure drawing (`#structure`) |
| `/leadership` | The structure hall | President ↓ Vice Presidents ↓ committees drawn as a truss that erects itself on scroll; every seat vacant until confirmed |
| `/disciplines` | The exhibition floor | A floor plan, then a 3D turntable of seven working machines beside scrolling chapters (each with its areas of practice); on phones and tablets the caption bar sits under the canvas; a network of the disciplines' shared projects |
| `/activities` | The archive cabinet | Six drawers (one per activity) above a year-by-year gallery of prints with a lightbox; search, activity, year and discipline filters |
| `/events`, `/events/[slug]` | The vertical timeline | One line through the year: past events above (the oldest folded away), a gold "today" marker, then upcoming events with the nearest one marked. The line fills as you read, a small light riding its front; nodes light as it reaches them. Filters by when, type and discipline. Detail: capacity dial and every registration state, with a check-in pass |
| `/projects`, `/projects/[slug]` | The laboratory | "On the bench": the project's stage, recognition and one-line purpose beside its media viewer (3D model, videos, drawings, photos), above a catalogue of drawing sheets filterable by discipline, stage, year, type and technology. Detail: everything essential on the first screen (stage, award, at a glance, media), then problem, solution, technical approach, development journey (done → now → next), validation, awards, team and collaboration |
| `/register` | Membership | Validated form beside a member card that fills as you type; error summary, duplicate-ID demo (`12345678`), success state |
| `/members`, `/members/[id]` | The community network | Members clustered by discipline and linked by shared projects, above a filterable roll. Profile: the journey Joined → Participated → Attended → Built → Earned → Graduated |
| `/profile`, `/profile/events` | Your profile | The same journey with private parts; attendance log (registered, attended, absent, pending), certificate eligibility, check-in passes |
| `/certificates`, `/certificates/[id]` | The document vault | Filed prototype certificates, a verification desk (try `ES-25-0077-F1QS`), shareable verification links; large preview with mock download |
| `/network`, `/network/[id]` | Graduates who answer back | A career map (graduation year × industry) above graduate cards; mentorship request → sent → accepted. Profile: role, what they can help with, the same mentorship request (its state shared with the network page), graduates in the same field |

Every filterable page keeps its filters in the URL (shareable, survives reload). Add
`?state=loading`, `?state=empty` or `?state=error` to any listing to review that state.

## Navigation

- **One navbar and one footer on every page**, the homepage included
  (`components/layout/`). The bar: the brand (Home), Events, Activities, Projects, Disciplines,
  About (inside the Community menu below 1280px) and a **Community** menu (Members, Leadership,
  Graduate network, My profile, Certificates). The current section is underlined: `/events/x`
  marks Events, any community page marks Community. The menu opens with a click or ↓, moves
  with ↑/↓/Home/End and closes with Escape, a click outside or focus leaving it. Phones and
  tablets get Home, the primary pages and the Community group in the menu panel. The footer maps
  the site in three groups: Society, Explore, Community.
- **Addresses** come from one helper, `lib/routes.ts` (`routes.event(slug)`,
  `routes.member(id)`, `routes.discipline(id)`…), so a record has the same URL everywhere.
  Events and projects use the same slugs on the homepage and the platform.
- **The homepage as gateway:** Explore Events → `/events`, Discover Projects → `/projects`,
  More about the society → `/about`; each event title → `/events/[slug]` and its registration
  action → the event's registration panel (`#register`); each project card → `/projects/[slug]`;
  each discipline name → its section of `/disciplines`; Explore Previous Activities → `/activities`;
  View the Full Society Structure → `/leadership`; Join the Society → `/register`; Explore Events
  → `/events`.
- **Disciplines:** wherever a discipline's name appears (project sheets and pages, member and
  graduate profiles, event pages) it links to `/disciplines#<id>` (`mechanical`, `electrical`,
  `civil`, `petroleum`, `chemical`, `mechatronics`, `industrial`, the same ids the
  `?discipline=` filters use). Arriving there turns that exhibit and brings its chapter into view.
- **Deep pages** (`/events/[slug]`, `/projects/[slug]`, `/members/[id]`, `/network/[id]`,
  `/certificates/[id]`, `/profile/events`) open with a breadcrumb (`Projects / Autonomous
  line-following rover`) whose first step leads back. An address with no record behind it gets
  a not-found page for that section, leading back to it.
- **Demo flows:** membership form → the sample profile or events; event registration → a
  check-in pass and "See it in your events" (`/profile/events`); the profile → attendance,
  certificates, its public view and its projects; a certificate → its event and holder;
  a graduate card → their profile, where the mentorship request continues.

## English | العربية

The society's Arabic name is **الجماعة الهندسية** (English: Engineering Society). The college's
seven engineering societies, which the society works with, are still written الجمعيات in
Arabic; change those too if they are also جماعات.

- **Default:** English. The navbar switch (a single ع / EN toggle on smaller screens) saves the
  choice in a cookie (`es-locale`, one year) and in localStorage.
- **No reload:** switching refreshes the current route on the server, so every string, `lang`
  and `dir` change in one commit. Scroll position, open state and the hero's 3D scene stay as
  they are.
- **No flash:** because the server reads the cookie, a returning Arabic visitor receives Arabic,
  right-to-left HTML. Pages are therefore rendered per request rather than prerendered.
- **Where the words live:**
  - Interface copy: `lib/i18n/dictionaries/en.ts` and `ar.ts`. `ar.ts` is typed against `en.ts`, so
    a string that has no translation fails the build.
  - Content: the files in `content/` carry `{ en, ar }` fields next to their data.
- **In code:**
  - Server Components call `await getI18n()` (`lib/i18n/server.ts`); Client Components call
    `useI18n()`. Both return `{ t, l, locale, dir, intl }`, where `l(value)` picks the current
    language from an `{ en, ar }` field.
- **Typography:**
  - Arabic is set in IBM Plex Sans Arabic. Latin text and digits inside Arabic fall back to the
    English faces.
  - Arabic is never letter-spaced and uses taller line heights.
  - Numbers stay in Western digits.
- **RTL:**
  - Layout uses logical CSS properties. Arrows mirror.
  - Direction-dependent motion follows the page direction: schedule rows, rule draws, the
    activity photo masks and the leadership rail.

## What is real and what is a preview

| Area | State | Where to change it |
| --- | --- | --- |
| Society figures (home) | **Members, Visitors, Projects, Events: demonstration values** (1,250 · 18,400 · 86 · 140), each tagged "Demo figure" with a note that they are not verified. They count up on arrival. Replace `value`, add `reportingPeriod` and `source`, and remove `demo: true`. Visitors need real analytics, not a hand-made counter. | `content/stats.ts` → `SOCIETY_STATS` |
| Society facts (About) | From the society's own overview: established 2000–01, 7 societies, 6 exhibitions and 6 gatherings (the last two qualified: reporting date unknown). | `content/stats.ts` → `SOCIETY_FACTS` |
| Overview | The society's own photograph (`public/images/overview.jpg`) under a blue atmosphere with layered parallax. | `content/overview.ts` |
| Activities | The six official activities (التجمع الهندسي، البرنامج الهندسي، ورش الخريجين، أستوديو الخريجين، الأمسيات، المسابقات), each an automatic slideshow of **demonstration events**: titles, dates and attendance are samples tagged "Demo". Each gallery opens on its own society photograph; the society's other photographs repeat after it. أستوديو الخريجين's description is still to come. Add real events to an activity's `events` without `demo`. | `content/activities.ts` |
| Archive (`/activities`) | The activities' **demonstration events**, with sample disciplines, summaries and galleries added for the archive. Real editions replace them as they are documented. | `content/activities.ts`, `content/platform/archive.ts` |
| Leadership & structure | One President and three Vice Presidents, **all vacant**; no term, chairs or deputies. فريق التصوير is listed once (the brief listed it twice). | `content/structure.ts` |
| Events | **Sample listings**, labelled "Sample". Each opens its platform page, where registration is a prototype; nothing is submitted. | `content/events.ts` |
| Projects | **Sample archive entries**, each opening its platform page. The discipline filter really filters them. | `content/projects.ts` |
| Disciplines | The seven disciplines from Draft 1's content, not an official SQU list. | `content/disciplines.ts` |
| Membership | "Join the Society" leads to the `/register` prototype everywhere; it stores and sends nothing, and no account is created. | `lib/routes.ts` |
| Platform records | **All sample data**: the event catalogue, projects, 24 members (first name + initial only), 18 graduates (employers described by kind, never named), certificates and the archive details. One notice per page says so; certificates carry a PROTOTYPE banner and watermark and no university marks. | `content/platform/` |
| The prototype's "today" | Fixed at 1 October 2026 so upcoming/past and certificate states are stable. | `lib/data/clock.ts` |
| Yearly record (About) | **Sample figures** for activities and projects per year from 2000 to 2026, labelled as samples on the page. Replace them with the society's records and set `sample: false`. | `content/platform/record.ts` |
| Project stage and recognition | Each project has a `stage` (idea → completed) and `achievements` (competition, result, year, optional link) that are independent of each other. The two achievements present are **sample results**, marked as such; the competitions named are the society's own sample activities. `validation` is empty for every project: no test result is invented. | `content/platform/projects.ts` |
| Project media | Each project lists its media: the interactive 3D model (with an exploded view only where it genuinely has one), drawings, the society's photographs marked "Illustrative image", and two turntable videos rendered from the projects' own 3D models. | `content/platform/projects.ts`, `public/media/projects/` |
| Social accounts | **No verified URLs.** Instagram and LinkedIn show in the footer, unlinked and marked "Link to come". Other platforms appear only once given a URL. | `content/social.ts` |

Social URLs are validated: https, on the platform's own domain, pointing to a profile path.

## Platform prototype

- **Data layer:** pages read only through the async functions in `lib/data/index.ts`
  (`getEvents()`, `getProject(slug)`, `getMemberProfile(id)`, `verifyCertificate(code)`…). They
  return the sample records today; connecting the real API means replacing those bodies.
- **Demo session:** `components/platform/DemoSession.tsx` holds what the visitor did in this tab
  (registrations, cancellations, mentorship requests, a completed membership form) in
  sessionStorage. No form data is ever stored. The sample signed-in member is Huda S. (`m-07`).
- **Shared pieces:** discovery controls (`components/discovery/`: search, chips, result bar with
  active filters, mobile filter sheet, skeletons, empty/filtered/error states) and platform
  primitives (`components/platform/`: hero, modal, status badge, monogram, gauge, title block,
  check-in pass).
- **3D:** only two pages carry a WebGL scene (Disciplines and Projects), built from procedural
  models in `components/three/` (one palette, an explode channel, motion only while in view).
  `SceneMount` loads a scene when it nears the viewport and the main thread is idle, renders on
  demand, pauses offscreen, and keeps the designed drawing underneath for no WebGL, Save-Data
  or a lost context. Reduced motion keeps the poses and drops the travel.
- **Turntable videos:** `/dev/turntable?slug=…` (development only, like `/dev/emblem`) shows a
  project's model at an angle a capture script steps through; the frames are encoded to WebM in
  the browser with MediaRecorder, with the first frame saved as the poster.
- **Copy:** platform strings live in `lib/i18n/dictionaries/platform-en.ts` / `platform-ar.ts`
  and `pages/*.ts` (each file holds both languages, the Arabic typed against the English).

## Hero sculpture

- **The scene:** a live Three.js scene (`components/hero/emblem/`) derived from the society's
  four-part logo. The official logo file itself is never altered.
- **Desktop:** a sticky, scrubbed assembly that is fully reversible, with pointer tilt capped at
  ±4°.
- **Mobile:** a compact, lighter scene.
- **Stills:** stills in `public/hero/` cover first paint on every screen size, plus reduced
  motion, Save-Data and no-WebGL:
  - `emblem-opening.webp`: desktop.
  - `emblem-stacked.webp`: phones and tablets. Before this still existed, the phone hero was
    empty until WebGL arrived.
  - `emblem-assembled.webp`: the fallback.
- **Regenerating:** run `scripts/capture-still.mjs 0|1|2` after changing the geometry.

## Motion

- **Vocabulary:** one shared set of timings and easings in `lib/motion.ts`, mirrored in
  `styles/tokens.css`. Each section gets its own recipe rather than a repeated fade
  (`components/motion/ScrollReveals.tsx`).
- **Recipes by section:**
  - **Society figures:** icons draw in and real figures count up once.
  - **Overview:**
    - The photograph, blueprint grid, light and drawn marks sit on separate depth planes that
      move at different speeds as you scroll.
    - Points of light drift on top (`OverviewLights.tsx`, one 2D canvas). Each light has a depth:
      far lights are small and slow, near lights larger, softer and quicker. They twinkle, and
      they move at depth-dependent speeds as you scroll.
    - On fine pointers the layers lean slightly toward the cursor. Phones get the same layers
      with slightly less travel.
    - The canvas only runs while the section is on screen.
  - **Activities:**
    - Each slideshow crossfades with no blank frame, on a slow zoom. A progress line is its
      clock, so pausing freezes line, zoom and timer together.
    - The six start staggered and pause while hovered, touched, keyboard-focused or off
      screen.
    - Swipe on touch screens; arrow keys and dots on all.
    - Frames unmask on arrival and carry a light parallax (phones included) and a tilt of at
      most 2° on desktop.
  - **Touch screens:** effects that waited for hover (the discipline symbols' moving detail, the
    activity accent lines) play when the element is centred in view (`InViewMarker.tsx`).
  - **Leadership:** the President appears first, then the connectors draw, then the Vice
    Presidents.
- **Reduced motion:** everything is respected, and content is visible without JavaScript.

## Structure

```
app/                 layout (language, fonts), / (landing), not-found, dev-only /dev/emblem
app/(platform)/      layout (navbar, demo session, footer), loading, not-found, and every
                     platform route (deep routes carry their own not-found)
components/
  hero/              Hero, HeroArt (loader, stills, fallbacks), emblem/ (R3F scene)
  i18n/              I18nProvider (client language context), LanguageSwitch
  layout/            SiteHeader (glass navbar, Community menu, phone panel), SiteFooter
  sections/          the landing page's sections
  motion/            ScrollReveals, InViewMarker
  ui/                drawings, Plate, Portrait, PhotoPlaceholder, StatIcon, SocialIcon, icons…
  discovery/         search, filters, result bar, filter sheet, states, URL query state
  platform/          platform primitives, Breadcrumbs, NotFoundView, DemoSession, registration
                     status, check-in pass
  three/             SceneMount, Studio, procedural models and their rig
  pages/<route>/     each platform page's own components and styles
content/             landing data and bilingual content; content/platform/ the sample records
lib/data/            the platform's async data layer and its fixed clock
lib/i18n/            config, dictionaries (en, ar, platform-*, pages/*), server helper, plurals
lib/                 routes (every internal address), motion constants, formatting,
                     media-query + WebGL helpers
public/images/       the society's photographs (resized, metadata stripped)
styles/              tokens.css, globals.css
```

## Design skills

Installed at project scope in `.claude/skills` (see `skills-lock.json`): Emil Kowalski's skills,
Hallmark, and UI UX Pro Max. The stamp at the top of `styles/tokens.css` and
`.hallmark/log.json` record the design choices.
