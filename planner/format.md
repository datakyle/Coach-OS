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

## The shape

1. **Circle Up, 5:** champion asks his question; the focus; two
   non-negotiables; winners run is on; split Team 1 / Team 2 and station
   groups (Returners and New guys, or Advanced and New guys).
2. **Game Warmup, 10:** same every day, ending in a team race for the
   Victory Lap.
3. **Syracuse, 15:** alternate Sets 1 and 2 with Sets 3 and 4.
4. **Teach, 10 to 12:** "X minutes on the board, Y on the floor." Walk it,
   then speed. Freeze and ask.
5. **Split stations, 12 to 15:** Returners at the main basket, New guys at the
   far basket, both run themselves. Horn at the end.
6. **Install or reps, 12 to 16:** dummy first, then live against coaches.
7. **Game, 12 to 17:** everyone together, scored to reward today's focus.
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

`num`, `tagline`, `extras` and `announce` are optional. Always set `updated` to
the current time in milliseconds: a repo copy only replaces the one on Coach's
devices when its `updated` is newer, so a revised draft needs a fresh stamp.
