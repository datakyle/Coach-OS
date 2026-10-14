# Coach OS

Personal high school basketball coaching program.

**Live:** https://datakyle.github.io/coaches-corner/

Three tabs, no backend, no build step, no dependencies.

## Practice Plan

An agenda for the day. Set the start time and the minutes on each item and the
clock column fills itself in. Each row is a drill plus one sentence on what you
are doing. Every practice you save goes into History, so the season is a list you
can scroll.

- **Blocks** drops a standard item (Circle Up, Syracuse, split stations, free
  throws) straight into today.
- **Copy last practice** clones the most recent one onto today's date.
- **Print** gives you a clean sheet with the controls stripped out.

## Clipboard

A play designer. Pick a tool, tap the floor.

| Tool | What it does | How it draws |
|---|---|---|
| Place | Drag players to set the starting spots | — |
| Cut | Off ball movement | solid line |
| Drib | Dribble with the ball | squiggly line |
| Pass | Pass to a teammate | dotted line |
| Screen | Set a screen on a man or a spot | line with a bar on the end |
| Shot | Put it up | line to the rim |
| Ball | Give a player the ball | — |
| Def | Move a defender | dashed grey line |

Build the play one step at a time, then **Play** to run it. **Show every step at
once** turns the whole thing into a single static diagram for the whiteboard.

Formations: 1-2-2, Overload R/L, 4 Out, 5 Out, Horns, Box. Defense: 2-3, 3-2,
1-3-1, Man.

## Play Library

Everything you have saved, plus Backup and the shared Team library.

**Backup** is offline insurance: **Copy all** puts the library on your clipboard
as text, **Paste in** restores it on another device.

**Team** is the shared playbook on Firebase, behind a code. Players sign in
with the team code to see the plays and run them on the Clipboard. Coaches sign
in with the coach code, which also lets them upload and remove plays. With no
code, nothing is shown. It stays switched off until you fill in
`js/firebase-config.js`, and the site works fine without it. Setup is in [SETUP.md](SETUP.md).

## Where things are stored

In the browser, via `localStorage`. No account and no server, which is what keeps
this free to host and instant to load. Two consequences worth knowing: the iPad
and a laptop keep separate libraries, and clearing site data wipes them. Use
Backup now and then.

`data/plans.json` and `data/plays.json` are the shared copies in this repo.
Anything in them that your browser has not seen is merged in on load, and local
edits are never overwritten. That is how a practice plan written somewhere else
shows up on the iPad without a database.

## Layout

```
index.html        shell and tabs
css/app.css       everything visual
js/store.js       localStorage plus the repo merge
js/clipboard.js   play designer
js/practice.js    practice plan
js/app.js         tabs and boot
js/cloud.js       team sign-in and shared plays over the Firebase REST APIs
js/firebase-config.js
data/plans.json   shared practice plans
data/plays.json   shared plays
firestore.rules   security rules to paste into the Firebase console
```

Open `index.html` directly or serve the folder with any static server.
