# ESSQU Landing — Engineering Society, Sultan Qaboos University

Independent public Landing, imported with source history from `s3q/ESWebsite` at `17bdcc4`.
The original teammate checkout is unchanged. This repository is maintained separately from Core.

Published events and registration use Core API v1. Set the variables in `.env.example` through
Vercel or a private `.env.local`; see [`lib/core-api/README.md`](lib/core-api/README.md).
`CORE_EVENTS_API_KEY` is server-only. The public URL variable contains no secret.
No database credentials, service-role key or Core admin credentials belong here.

Current pre-domain API: `https://engsoc-platform.vercel.app/v1`. Custom domains are deferred;
later switching both API URL variables to `https://api.essqu.com/v1` requires a rebuild.
Actual Landing deployment and live staging/production evidence are release-operator records;
this source alone does not establish production API activation.

Run `npm test` for hermetic contract tests and `npm run test:e2e` for desktop/mobile browser
tests against a synthetic local HTTP Core fixture. No production registration test data is written.
`/events` has upcoming/past cursor pages and `/events/[eventId]` has the registration form.
Empty/unavailable API responses never fall back to sample events. Clearly labelled project and
activity design galleries remain editorial demonstrations, separate from live event records.

Landing site for the Engineering Society, built with Next.js (App Router, TypeScript), GSAP and
React Three Fiber, in English and Arabic. Earlier drafts are kept:

- **Draft 1** (Vite): the sibling folder `../ES`, untouched.
- **Draft 2 / Draft 3** (Next.js): `drafts/draft-2-source.zip`, `drafts/draft-3-source.zip`.
- **Draft 4 onward:** this repository's git history.

Product scope comes from `PRD.pdf` (Idea & Requirements Document v1.0). This is the public
site only: event and registration authority is the separately deployed Core API; no local authentication or admin tools.

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

- `/` — hero, society figures, overview, `#events`, `#activities`, `#projects`, `#disciplines`,
  `#leadership`, `#join` and the footer.
- `/about` — overview, the society's facts, and the full structure (`#structure`).
- `/activities` — the archive of previous activities, filterable by programme and year.

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
| Archive | Empty until editions are documented. | `content/activities.ts` → `ACTIVITY_EDITIONS` |
| Leadership & structure | One President and three Vice Presidents, **all vacant**; no term, chairs or deputies. فريق التصوير is listed once (the brief listed it twice). | `content/structure.ts` |
| Events | Live Core API listings, detail and registration; unavailable/empty states never substitute sample data. | `lib/core-api/` |
| Projects | **Sample archive entries**. The discipline filter really filters them. | `content/projects.ts` |
| Disciplines | The seven disciplines from Draft 1's content, not an official SQU list. | `content/disciplines.ts` |
| Membership | No registration flow yet. "Join the Society" opens a preview dialog. | `content/site.ts` → `membershipUrl` |
| Social accounts | **No verified URLs.** Instagram and LinkedIn show in the footer, unlinked and marked "Link to come". Other platforms appear only once given a URL. | `content/social.ts` |

Social URLs are validated: https, on the platform's own domain, pointing to a profile path.

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
app/                 layout (language, fonts), /, /about, /activities, dev-only /dev/emblem
components/
  hero/              Hero, HeroArt (loader, stills, fallbacks), emblem/ (R3F scene)
  i18n/              I18nProvider (client language context), LanguageSwitch
  layout/            SiteHeader (glass navbar), SiteFooter (incl. Follow the Society)
  sections/          StatsStrip, Overview (+ OverviewBackdrop, OverviewLights), Events, Projects,
                     Disciplines, Activities (+ ActivityGalleries, Slideshow), Leadership
                     (+ LeadershipTree), Structure, Archive*, JoinInvitation, PageIntro
  motion/            ScrollReveals, InViewMarker
  ui/                drawings, Plate, Portrait, PhotoPlaceholder, StatIcon, SocialIcon, icons…
content/             data and bilingual content
lib/i18n/            config, dictionaries (en, ar), server helper, plurals
lib/                 motion constants, formatting, media-query + WebGL helpers
public/images/       the society's photographs (resized, metadata stripped)
styles/              tokens.css, globals.css
```

## Design skills

Installed at project scope in `.claude/skills` (see `skills-lock.json`): Emil Kowalski's skills,
Hallmark, and UI UX Pro Max. The stamp at the top of `styles/tokens.css` and
`.hallmark/log.json` record the design choices.
