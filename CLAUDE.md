# Coach OS

Basketball coaching web app for a high school boys varsity team (8-man roster,
undersized). Coach is newer to basketball theory: explain concepts in plain
English. Hosted on GitHub Pages from `main`.

## Rules for this repo

- Plain HTML, CSS and vanilla JS (ES5 style, IIFE modules on `window`). No build
  step, no framework, no npm dependencies. Open `index.html` to run it.
- All colors and fonts come from the tokens at the top of `css/app.css`. Support
  light and dark mode through those tokens.
- Any court drawing goes through `Court.mount()` in `js/court.js`. Court units:
  rim at (280, 93), baseline y = 40, half court y = 400, sidelines x = 30 / 530.
- Data lives in `localStorage` (keys start with `cc.`). Never break saved data:
  add new keys instead of changing the shape of old ones.
- Writing style for anything players or coaches read: short, direct sentences.
  No em dashes.
- Must work on an iPad and a phone (the sidebar becomes an icon rail under 760px).
- Every `css/` and `js/` tag in `index.html` carries `?v=YYYYMMDD` (add `-2`,
  `-3` for a second change the same day). Bump it on every change to those
  files. GitHub Pages lets phones cache files, and a device holding old JS with
  new HTML shows buttons that do nothing.
- Signed in, plays and practice history sync to Firestore through `js/sync.js`
  (newest `updated` wins, deletes carry over). Anything new that should follow
  the coach between devices goes through a `Sync.engine`, not straight to
  `localStorage`.

## Pages

| Page | Files |
|---|---|
| Practice Plan | `js/practice.js` |
| Play Creator | `js/creator.js` |
| Play Library | `js/library.js` |
| Player Course | `js/course.js` (UI), `js/course-data.js` (content) |

Navigation and boot are in `js/app.js` (`PAGES` list). A new page needs a nav
button and a `<section class="page" id="page-NAME">` in `index.html`, an entry in
`PAGES`, and a `stop()` call in `go()` if it animates.

## Practice Planner

`planner/` holds what Claude needs to draft practice plans: `README.md` (the
process), `curriculum.md` (the season plan: start here), `format.md` (rules
every plan follows), `season.md`, `install.md`,
`team-needs.md`, `drills.md`, `log.md`. To draft a practice: read all of them
plus the last three plans in `data/plans.json`, follow `format.md` exactly, use
only drills from `drills.md` unless asked, and add the plan to
`data/plans.json` with `updated` set to now (ms) so it replaces older copies on
Coach's devices. Field list is in `planner/format.md`. When Coach says "next practice", draft the plan AND give every drill a `visual`, then render the drill visuals PDF with `planner/visuals.py`. Team level only; never write player names into the repo.

## Player Course

Lessons are data, not code. The format is documented at the top of
`js/course-data.js`. Visual types: `spots`, `shell`, `play`, `routine`, `timer`.
Lesson `id`s are permanent because progress is saved by id.

A lesson counts as finished only when every quiz answer is right (answer order
shuffles on every attempt). Finishing every lesson in the week with every answer
right reveals a secret word. The word is never stored as text: `SECRET` in
`js/course.js` decodes from the answers the player picked. Editing any quiz
answer changes the key, so after quiz edits run `Course.encode("WORD")` in the
browser console and paste the result into `SECRET`. Never write the word itself
into the repo (it's public).

Season install plan the course follows (one week per entry):

1. Pack Line Defense (built): Know the Floor, then Pack Line: The Why, Ball, Gap, Help, and The Pack Line Rules. The team already has its own warm-up; Coach runs drills and plays at practice.
2. Defend and move: shell Stages 2 and 3 (help, recover, closeouts), pass-cut-fill, shot value
3. Attack: drive and kick, attacking closeouts, running the lanes, transition D
4. Zone offense I: 1-3-1 vs a 2-3, gap attack (Play A), high post flash, crashing
5. Zone offense II: overload and skip, short corner, Plays B (Iowa) and C (Walker), freeze scrimmage
6. Polish: retest 17s, free throws under fatigue, film

Team defense is pack line man-to-man where the on-ball defender **forces the
ball middle** into the pack and never gives up baseline. Keep every lesson
consistent with that.
