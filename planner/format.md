# Plan format

Learned from 18 past plans, mostly this season's (#4 to #8). Every draft
follows these rules unless Coach says otherwise.

## Where it goes

Coach OS, Practice Plan page: https://datakyle.github.io/Coach-OS/#plan.
Claude adds the plan to `data/plans.json`; Coach opens it, publishes, and
downloads the PDF.

## The header

- **Date**, **Practice Plan #N 26-27 season**, **Practice Time**
- **Start:** Sunday 4:00 PM (`"16:00"`). Tuesday and Thursday 6:00 PM (`"18:00"`).
- **Length:** 90 minutes, items add up exactly. Break the huddle at :30.
- **Focus:** what today is about ("Man to Man Reps and Half Court Spacing").
- **Tagline:** three short punches ("Touch the paint. Kick it out. Talk on defense.").

## When Coach says "next practice"

Draft the next practice on the calendar and deliver two things:

1. **The plan**, added to `data/plans.json` (it shows up on the Practice Plan
   page).
2. **Drill visuals**: every drill gets a `visual` (court diagram plus what each
   coach does), rendered with `python3 planner/visuals.py <date> <out.pdf>` and
   sent to Coach.

## Coach's standing rules (from his markup, Oct 21)

- **Circle Up:** no "champion asks his question" line.
- **Game Warmup:** dynamic warmup only. No shooting, no layups, no race, no
  Victory Lap. Shooting goes in its own block when it fits the day.
- **Syracuse:** a conditioning drill. Only include it when the team needs
  conditioning that day.
- **The last game:** give two options, a scored game or a scrimmage that grades
  only two or three things we worked on that practice.
- **Keep:** pressure free throws and the extras at the bottom.

## The shape

1. **Circle Up, 5:** champion asks his question; the focus; two
   non-negotiables; winners run is on; split Team 1 / Team 2 and station
   groups (Returners and New guys, or Advanced and New guys).
2. **Game Warmup, 10:** dynamic warmup only, captains lead.
3. **Syracuse, 15, only when we need conditioning:** alternate Sets 1 and 2
   with Sets 3 and 4.
4. **Teach, 10 to 12:** "X minutes on the board, Y on the floor." Walk it,
   then speed. Freeze and ask.
5. **Split stations, 12 to 15:** Returners at the main basket, New guys at the
   far basket, both run themselves. Horn at the end.
6. **Install or reps, 12 to 16:** dummy first, then live against coaches.
7. **Game or scrimmage, 12 to 17:** Option A a game scored to reward today's
   focus; Option B a scrimmage graded on two or three things from today.
8. **Pressure Free Throws, 5 to 10:** count the tally, champion picks the next
   question, break the huddle.
9. **Team 1 / Team 2** tally line.
10. **Extras, 2:** short games if we finish early (Knockout, Hot Shot, Rim War,
    Full Court Layup Competition).
11. **Announcements:** the month's theme and what tallies are live.

## Notes

- Write them like Coach does: 3 to 6 short sentences. Setup, the rule, how it's
  scored, who runs the Victory Lap. Quote the cues exactly ("silent pass is a
  redo").
- Every drill ties to today's focus or a top-3 team need.
- Teach before live. One new install per practice.
- Plan for the real roster count at practice (7 means 4v3 with the odd man
  rotating in every 3 possessions). Coaches fill in for 5 on 5.
- Practice before a game: lighter, walk-throughs, shooting, free throws.
- Defense is pack line: Ball, Gap, Help, force middle. Never "deny" or "no middle".
- No player names in the repo.

## Fields

```json
{ "id": "YYYY-MM-DD", "date": "YYYY-MM-DD", "start": "18:00", "num": "9",
  "focus": "…", "tagline": "…",
  "items": [ { "mins": 5, "title": "Circle Up", "note": "…" } ],
  "extras": [ { "title": "Rim War", "note": "…" } ],
  "announce": "…", "updated": 1761091200000 }
```

Each item can also carry `visual` (see the top of `planner/visuals.py` for the
fields). Coach OS ignores it; `visuals.py` draws it.

`num`, `tagline`, `extras` and `announce` are optional. Always set `updated` to
the current time in milliseconds: a repo copy only replaces the one on Coach's
devices when its `updated` is newer, so a revised draft needs a fresh stamp.
