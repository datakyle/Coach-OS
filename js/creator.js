/* Play Creator: build a play one step at a time and run it. Saving puts it in
   the Play Library; the library's Edit button brings a play back here. */
window.Creator = (function () {
"use strict";

var TOOLS = {
  arrange: "Drag any player to set the starting spot. Formations below fill the floor for you.",
  move:    "Tap a player, then tap where he runs. Solid line.",
  dribble: "Tap the ball handler, then tap where he dribbles. Squiggly line.",
  pass:    "Tap the passer, then tap the receiver. Dotted line.",
  screen:  "Tap the screener, then tap the man he screens (or any spot). Line with a bar on the end.",
  shot:    "Tap the ball handler to put up a shot.",
  ball:    "Tap a player to give him the ball.",
  dmove:   "Tap a defender, then tap where he slides. Dashed grey line."
};
var TAGCOLOR = { move: "var(--move)", screen: "var(--move)", dribble: "var(--ball)", pass: "var(--ball)", shot: "var(--ball)", dmove: "var(--def)" };
var TAGNAME = { move: "cut", screen: "screen", dribble: "dribble", pass: "pass", shot: "shot", dmove: "def" };

var $ = function (id) { return document.getElementById(id); };
var view = Court.mount($("createCourt"), "Half court for designing plays");
var svg = view.svg;
var tool = "arrange";
var pending = null;      /* the player picked first, waiting for a target */

function toast(m) { window.CC.toast(m); }
function state() { return view.play; }

/* ---------------- render ---------------- */
function render() {
  view.selected = pending ? pending.player : null;
  view.showAll = $("showall").checked;
  view.draw();
  renderControls();
}
function renderControls() {
  renderSteps(); renderChips();
  $("btnPlay").textContent = view.running ? "Stop" : (view.finished ? "Replay" : "Play");
}
view.onChange = renderControls;

function renderSteps() {
  var bar = $("stepbar"), st = state();
  bar.textContent = "";
  var mk = function (label, idx) {
    var b = document.createElement("button");
    b.className = "btn sm" + (view.cur === idx ? " on" : "");
    b.textContent = label;
    b.onclick = function () { pending = null; view.go(idx); render(); };
    return b;
  };
  bar.appendChild(mk("Start", 0));
  for (var i = 1; i <= st.steps.length; i++) bar.appendChild(mk(String(i), i));
  var add = document.createElement("button");
  add.className = "btn sm"; add.textContent = "+";
  add.setAttribute("aria-label", "Add a step");
  add.onclick = function () { view.stop(); st.steps.push({ actions: [] }); view.cur = st.steps.length; pending = null; render(); };
  bar.appendChild(add);
  if (view.cur > 0) {
    var del = document.createElement("button");
    del.className = "btn sm danger"; del.textContent = "Delete step";
    del.onclick = function () {
      view.stop(); st.steps.splice(view.cur - 1, 1);
      view.cur = Math.min(view.cur, st.steps.length); pending = null; render();
    };
    bar.appendChild(del);
  }
}

function renderChips() {
  var box = $("chips"), st = state();
  box.textContent = "";
  var say = function (text) { var p = document.createElement("p"); p.className = "empty"; p.textContent = text; box.appendChild(p); };
  if (view.cur === 0) { say("Starting spots. Drag players, or pick a formation below."); return; }
  var step = st.steps[view.cur - 1];
  if (!step || !step.actions.length) { say("Nothing in this step yet. Pick a tool and tap the floor."); return; }
  step.actions.forEach(function (a, i) {
    var row = document.createElement("div"); row.className = "chip";
    var tg = document.createElement("span"); tg.className = "tag";
    tg.style.background = TAGCOLOR[a.type] || "var(--muted)";
    tg.textContent = TAGNAME[a.type] || a.type;
    var txt = document.createElement("span");
    var label = function (pid) { return st.players[pid] ? st.players[pid].label : "?"; };
    if (a.type === "pass") txt.textContent = label(a.player) + " to " + label(a.target);
    else if (a.type === "shot") txt.textContent = label(a.player) + " shoots";
    else if (a.type === "screen") txt.textContent = label(a.player) + " screens" + (a.target && st.players[a.target] ? " " + label(a.target) : "");
    else txt.textContent = label(a.player);
    var x = document.createElement("button"); x.className = "x"; x.innerHTML = "&times;";
    x.setAttribute("aria-label", "Remove");
    x.onclick = function () { view.stop(); step.actions.splice(i, 1); render(); };
    row.appendChild(tg); row.appendChild(txt); row.appendChild(x);
    box.appendChild(row);
  });
}

/* ---------------- input ---------------- */
function hitToken(evt) {
  var t = evt.target.closest ? evt.target.closest(".tok") : null;
  return t ? t.getAttribute("data-id") : null;
}

var drag = null;
svg.addEventListener("pointerdown", function (evt) {
  if (view.running || tool !== "arrange") return;
  var id = hitToken(evt);
  if (!id) return;
  if (view.cur !== 0) { view.cur = 0; render(); }
  drag = { id: id };
  svg.setPointerCapture(evt.pointerId);
  evt.preventDefault();
});
svg.addEventListener("pointermove", function (evt) {
  if (!drag) return;
  var p = view.point(evt);
  state().players[drag.id].x = p.x; state().players[drag.id].y = p.y;
  render();
  evt.preventDefault();
});
svg.addEventListener("pointerup", function (evt) {
  if (drag) { drag = null; try { svg.releasePointerCapture(evt.pointerId); } catch (e) {} }
});
svg.addEventListener("pointercancel", function () { drag = null; });

svg.addEventListener("click", function (evt) {
  if (view.running || drag || tool === "arrange") return;
  var st = state(), id = hitToken(evt);

  if (tool === "ball") {
    if (id && id.charAt(0) === "o") { view.cur = 0; st.ball = id; pending = null; render(); }
    return;
  }

  if (view.cur === 0) {
    if (!st.steps.length) st.steps.push({ actions: [] });
    view.cur = 1;
  }
  var snap = Court.stateAt(st, view.cur - 1);
  var step = st.steps[view.cur - 1];

  if (!pending) {
    if (!id) return;
    if (tool === "dmove" && id.charAt(0) !== "d") { toast("Pick a defender for that one."); return; }
    if (tool !== "dmove" && id.charAt(0) !== "o") { toast("Pick an offensive player."); return; }
    if ((tool === "pass" || tool === "dribble" || tool === "shot") && snap.ball !== id) {
      toast(st.players[id].label + " does not have the ball here."); return;
    }
    if (tool === "shot") { step.actions.push({ type: "shot", player: id }); render(); return; }
    pending = { player: id };
    render();
    return;
  }

  if (tool === "pass") {
    if (!id || id.charAt(0) !== "o" || id === pending.player) { toast("Tap a teammate to receive it."); return; }
    step.actions.push({ type: "pass", player: pending.player, target: id, to: null });
    pending = null; render(); return;
  }

  var from = snap.pos[pending.player], dest, target = null;
  if (tool === "screen" && id && id !== pending.player) {
    var tp = snap.pos[id];
    var dx = from.x - tp.x, dy = from.y - tp.y, L = Math.hypot(dx, dy) || 1;
    dest = { x: tp.x + dx / L * 30, y: tp.y + dy / L * 30 };
    target = id;
  } else {
    dest = view.point(evt);
  }
  step.actions.push({ type: tool, player: pending.player, to: { x: Math.round(dest.x), y: Math.round(dest.y) }, target: target });
  pending = null;
  render();
});

/* ---------------- controls ---------------- */
$("btnPlay").onclick = function () {
  if (view.running) { view.stop(); render(); return; }
  pending = null;
  if (!view.playAll()) toast("Add a step first.");
};
$("btnStepFwd").onclick = function () { pending = null; view.stepForward(); };
$("btnReset").onclick = function () { pending = null; view.go(0); render(); };
[].slice.call(document.querySelectorAll("#createSpeed [data-speed]")).forEach(function (b, _, all) {
  b.onclick = function () {
    view.speed = parseInt(b.getAttribute("data-speed"), 10);
    all.forEach(function (o) { o.classList.toggle("on", o === b); });
  };
});

[].slice.call(document.querySelectorAll("#tools .btn")).forEach(function (b, _, all) {
  b.onclick = function () {
    view.stop();
    tool = b.getAttribute("data-tool");
    all.forEach(function (o) { o.classList.toggle("on", o === b); });
    pending = null;
    if (tool === "arrange" || tool === "ball") view.cur = 0;
    $("hint").textContent = TOOLS[tool];
    render();
  };
});
$("hint").textContent = TOOLS.arrange;
$("showall").onchange = render;

[].slice.call(document.querySelectorAll("#offsets .btn")).forEach(function (b) {
  b.onclick = function () { view.stop(); Court.applyOff(state(), b.getAttribute("data-off")); state().steps = []; view.cur = 0; pending = null; render(); };
});
[].slice.call(document.querySelectorAll("#defsets .btn")).forEach(function (b) {
  b.onclick = function () { view.stop(); Court.applyDef(state(), b.getAttribute("data-def")); state().steps = []; view.cur = 0; pending = null; render(); };
});

/* ---------------- save / new ---------------- */
$("btnSave").onclick = function () {
  var st = state();
  st.name = $("playname").value.trim() || "Untitled";
  $("playname").value = st.name;
  if (!Store.plays.put(st)) toast("Could not save to this browser. Use Backup in the Play Library.");
  else toast("Saved " + st.name + " to the Play Library.");
};
$("btnNew").onclick = function () { open(Court.blankPlay("New play")); $("playname").focus(); $("playname").select(); };

/* ---------------- seed plays ---------------- */
function seed() {
  function base(offKey) {
    var p = { name: "", players: {}, ball: "o1", defOn: true, steps: [] };
    Court.applyOff(p, offKey); Court.applyDef(p, "23");
    return p;
  }
  var iowa = base("122");
  iowa.name = "Iowa";
  iowa.steps = [
    { actions: [{ type: "pass", player: "o1", target: "o2", to: null }] },
    { actions: [
      { type: "screen", player: "o5", to: { x: 352, y: 250 }, target: "o2" },
      { type: "move", player: "o1", to: { x: 90, y: 230 } },
      { type: "move", player: "o3", to: { x: 70, y: 72 } }
    ] },
    { actions: [
      { type: "dribble", player: "o2", to: { x: 300, y: 192 } },
      { type: "move", player: "o5", to: { x: 304, y: 128 } }
    ] },
    { actions: [{ type: "pass", player: "o2", target: "o1", to: null }] },
    { actions: [{ type: "pass", player: "o1", target: "o3", to: null }] },
    { actions: [{ type: "shot", player: "o3" }] }
  ];

  var walker = base("122");
  walker.name = "Walker";
  walker.steps = [
    { actions: [
      { type: "pass", player: "o1", target: "o2", to: null },
      { type: "move", player: "o1", to: { x: 490, y: 72 } }
    ] },
    { actions: [
      { type: "screen", player: "o5", to: { x: 352, y: 250 }, target: "o2" },
      { type: "move", player: "o4", to: { x: 210, y: 116 } }
    ] },
    { actions: [
      { type: "dribble", player: "o2", to: { x: 292, y: 238 } },
      { type: "move", player: "o5", to: { x: 462, y: 214 } }
    ] },
    { actions: [{ type: "pass", player: "o2", target: "o5", to: null }] },
    { actions: [{ type: "pass", player: "o5", target: "o1", to: null }] },
    { actions: [{ type: "shot", player: "o1" }] }
  ];

  var ov = base("olr");
  ov.name = "Overload right - passes";
  ov.steps = [
    { actions: [{ type: "pass", player: "o1", target: "o2", to: null }] },
    { actions: [{ type: "pass", player: "o2", target: "o3", to: null }] },
    { actions: [{ type: "pass", player: "o3", target: "o5", to: null }] },
    { actions: [{ type: "pass", player: "o5", target: "o4", to: null }] },
    { actions: [{ type: "pass", player: "o4", target: "o1", to: null }] }
  ];

  return [ov, iowa, walker];
}

/* Load a copy of a play onto the board. */
function open(play) {
  pending = null;
  view.show(JSON.parse(JSON.stringify(play)));
  $("playname").value = play.name;
  render();
}

function init() {
  var lib = Store.plays.list();
  open(lib[1] || lib[0] || Court.blankPlay("New play"));
}

return { init: init, seed: seed, open: open, stop: function () { view.stop(); } };
})();
