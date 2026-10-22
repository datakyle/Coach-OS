# Practice Planner

Goal: Coach never builds a practice plan from scratch again. Claude drafts each
practice before it happens, Coach changes it in plain English, and the final
plan shows up in Coach OS under **Practice Plan**, ready to publish and print.

## How it works (once it's running)

1. **Before every practice**, Claude reads the files in this folder and drafts
   the plan: same format as the practices already in `data/plans.json`.
2. **Coach reads the draft** and replies in plain English: "Swap Syracuse for
   shell, cut install to 12 minutes, add a note about talking on defense."
3. **Claude makes the changes** and adds the plan to `data/plans.json`. It
   appears in Coach OS. Coach hits **Publish** and **Download PDF**.
4. **After practice**, Coach answers two questions in one line each: what
   worked, what didn't. That goes into `log.md` and shapes the next draft.

## Setup, one step at a time

| Step | What happens | Who | Time |
|---|---|---|---|
| 1 | Fill in the four files below (Claude asks one question at a time) | Coach + Claude | 20 min |
| 2 | Claude drafts one practice; Coach marks it up until the format is right | Coach + Claude | 15 min |
| 3 | Dry run: Claude drafts the next real practice, Coach uses it | Coach + Claude | 10 min |
| 4 | Turn on the scheduled draft before every practice day | Claude | 5 min |
| 5 | Weekly check-in every Sunday: update the install plan and needs | Coach + Claude | 10 min |

Don't skip ahead. Each step only works if the one before it is done.

## The files

| File | What's in it | Changes how often |
|---|---|---|
| `season.md` | Practice days and times, games, the tournament, days off | When the schedule changes |
| `curriculum.md` | The season plan: phases, weekly installs, can-do checks, the four numbers | Every Sunday check-in |
| `install.md` | What the team already knows | After each install |
| `team-needs.md` | What we need to work on as a team, ranked | Every Sunday check-in |
| `drills.md` | Every drill we run, what it's for, how long, notes in Coach's words | When we add a drill |
| `format.md` | The rules every plan follows | Rarely |
| `log.md` | One line after each practice: worked, didn't | Every practice |

## Privacy

This repo is public. Write about the **team**, not individual players: no
names, no player evaluations. "Guards don't talk on ball screens" is fine.
"Jake can't guard" is not.
