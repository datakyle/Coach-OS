# coaches-corner

Personal high school basketball coaching program.

## Coach Clipboard

A play designer that runs in the browser. Draw a play on a half court, animate it,
and save it to a library. Built for an iPad on the sideline.

**Live:** https://datakyle.github.io/coaches-corner/

### Using it

Pick a tool, then tap the floor.

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

Build the play one step at a time with the step buttons, then **Play** to run it.
**Show every step at once** turns the whole play into a single static diagram for
the whiteboard.

Formations: 1-2-2, Overload R/L, 4 Out, 5 Out, Horns, Box. Defense: 2-3, 3-2, 1-3-1, Man.

### Plays included

- Overload right (passes)
- Iowa
- Walker

### Where plays are stored

In the browser, via `localStorage`. No account and no server, which is what keeps
this free to host and fast to load. That also means the iPad and a laptop keep
separate libraries, and clearing site data wipes them.

Use **Backup → Copy all** to get the whole library as text, and **Paste in** to
restore it on another device. Worth doing once you have plays you care about.

### Build

There isn't one. `index.html` is a single self-contained file: no libraries, no
bundler, no dependencies. About 38KB. Open it locally or serve it anywhere static.

### Deploying

GitHub Pages, Settings → Pages → Branch `main` / root.
