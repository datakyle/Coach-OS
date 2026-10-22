# Plan format

Learned from the practices already saved in `data/plans.json` (Sept 27, Oct 11,
Oct 13). Every draft follows these rules unless Coach says otherwise.

- **Length:** 90 minutes. Items add up to 90 exactly.
- **Start time:** Sunday 4:00 PM (`"16:00"`). Tuesday and Thursday 6:00 PM (`"18:00"`).
- **Focus line:** one short line, what today is about. Example: "Zone offense
  install vs the 2-3".
- **Every item:** minutes, a drill name, and one or two sentences in Coach's
  voice: short, direct, a rule or a score. Example: "Silent pass is a redo."
- **Opening, every practice:**
  1. Circle Up, 5 min: question of the day, the focus, non-negotiables.
  2. Game Warmup, 10 min: dynamic warmup, partner passing, full-speed layups.
  3. Syracuse, 15 min: name the sets (Set 1 to 4), team vs team.
- **Middle:** teach block (board, then floor), split stations, install
  (dummy reps first, then live against coaches).
- **Finish:** something live and scored, then pressure free throws.
- **Rules of thumb:** teach before live; one new install per practice; the day
  before a game is lighter (walk-throughs, shooting, free throws).

## Output

Saved to `data/plans.json` as:

```json
{ "id": "YYYY-MM-DD", "date": "YYYY-MM-DD", "start": "16:00",
  "focus": "…", "items": [ { "mins": 5, "title": "Circle Up", "note": "…" } ] }
```

<!-- Coach: anything else you need in the output? An Excel tab, a text for the
assistant coaches, a Spond post? -->
