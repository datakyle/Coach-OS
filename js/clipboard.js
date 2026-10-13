window.Clipboard = (function () {
"use strict";
var NS = "http://www.w3.org/2000/svg";

/* ---------------- court geometry ---------------- */
var RIM = { x: 280, y: 93 };
var COURT = { x0: 30, y0: 40, x1: 530, y1: 400 };

/* ---------------- formations ---------------- */
var OFF = {
  "122":  { 1:[280,318], 2:[470,230], 3:[90,230],  4:[360,120], 5:[200,120] },
  "olr":  { 1:[170,300], 2:[470,230], 3:[490,72],  4:[302,222], 5:[365,78]  },
  "oll":  { 1:[390,300], 2:[90,230],  3:[70,72],   4:[258,222], 5:[195,78]  },
  "4out": { 1:[280,318], 2:[470,230], 3:[90,230],  4:[490,72],  5:[300,120] },
  "5out": { 1:[280,318], 2:[425,272], 3:[135,272], 4:[490,72],  5:[70,72]   },
  "horns":{ 1:[280,318], 2:[490,72],  3:[70,72],   4:[222,238], 5:[338,238] },
  "box":  { 1:[280,318], 2:[344,214], 3:[216,214], 4:[352,112], 5:[208,112] }
};
var DEF = {
  "23":  { 1:[228,244], 2:[332,244], 3:[162,150], 4:[398,150], 5:[280,138] },
  "32":  { 1:[280,296], 2:[396,244], 3:[164,244], 4:[344,124], 5:[216,124] },
  "131": { 1:[280,310], 2:[398,228], 3:[162,228], 4:[280,228], 5:[280,100] },
  "man": null,
  "off": null
};

/* ---------------- state ---------------- */
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
var state = null;
var tool = "arrange";
var cur = 0;             // 0 = Start, 1..n = step n
var pending = null;      // {player}
var speed = 1100;
var anim = { raf: null, timer: null, running: false, live: null };
var lib = [];

function blankPlay(name) {
  var p = { name: name || "New play", players: {}, ball: "o1", defOn: true, steps: [] };
  applyOff(p, "122"); applyDef(p, "23");
  return p;
}
function applyOff(p, key) {
  var f = OFF[key]; if (!f) return;
  for (var i = 1; i <= 5; i++) p.players["o" + i] = { id: "o" + i, team: "o", label: String(i), x: f[i][0], y: f[i][1] };
  p.ball = "o1";
}
function applyDef(p, key) {
  if (key === "off") { p.defOn = false; return; }
  p.defOn = true;
  if (key === "man") {
    for (var i = 1; i <= 5; i++) {
      var o = p.players["o" + i]; if (!o) continue;
      var dx = RIM.x - o.x, dy = RIM.y - o.y, L = Math.hypot(dx, dy) || 1;
      p.players["d" + i] = { id: "d" + i, team: "d", label: "x" + i, x: o.x + dx / L * 30, y: o.y + dy / L * 30 };
    }
    return;
  }
  var f = DEF[key]; if (!f) return;
  for (var j = 1; j <= 5; j++) p.players["d" + j] = { id: "d" + j, team: "d", label: "x" + j, x: f[j][0], y: f[j][1] };
}

/* ---------------- replay positions ---------------- */
function stateAt(n) {
  var pos = {}, id;
  for (id in state.players) if (state.players.hasOwnProperty(id)) pos[id] = { x: state.players[id].x, y: state.players[id].y };
  var ball = state.ball, shot = false;
  for (var i = 0; i < n && i < state.steps.length; i++) {
    var acts = state.steps[i].actions;
    for (var k = 0; k < acts.length; k++) {
      var a = acts[k];
      if (a.to && pos[a.player]) { pos[a.player].x = a.to.x; pos[a.player].y = a.to.y; }
      if (a.type === "pass") ball = a.target;
      else if (a.type === "dribble") ball = a.player;
      else if (a.type === "shot") { ball = a.player; shot = true; }
    }
  }
  return { pos: pos, ball: ball, shot: shot };
}
function ballXY(pos, ball, shot) {
  if (shot) return { x: RIM.x, y: RIM.y };
  var p = pos[ball];
  if (!p) return { x: -99, y: -99 };
  return { x: p.x + 20, y: p.y - 20 };
}

/* ---------------- path helpers ---------------- */
function wavy(a, b) {
  var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 26) return "M " + a.x + " " + a.y + " L " + b.x + " " + b.y;
  var ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  var tipL = Math.min(16, L * 0.22), waveL = L - tipL;
  var segs = Math.max(2, Math.round(waveL / 20));
  var d = "M " + a.x + " " + a.y, amp = 7;
  for (var i = 1; i <= segs; i++) {
    var t0 = (i - 1) / segs * waveL, t1 = i / segs * waveL, tm = (t0 + t1) / 2;
    var s = (i % 2 === 0) ? -amp : amp;
    var mx = a.x + ux * tm + nx * s, my = a.y + uy * tm + ny * s;
    var ex = a.x + ux * t1, ey = a.y + uy * t1;
    d += " Q " + mx.toFixed(1) + " " + my.toFixed(1) + " " + ex.toFixed(1) + " " + ey.toFixed(1);
  }
  return d + " L " + b.x.toFixed(1) + " " + b.y.toFixed(1);
}
function trim(a, b, padA, padB) {
  var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  var ux = dx / L, uy = dy / L;
  return [{ x: a.x + ux * padA, y: a.y + uy * padA }, { x: b.x - ux * padB, y: b.y - uy * padB }];
}
function el(tag, attrs) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
  return e;
}

/* ---------------- render ---------------- */
var svg = document.getElementById("court");
var LT = document.getElementById("layerTok");
var LP = document.getElementById("layerPath");
var LG = document.getElementById("layerGhost");
var ballTok = document.getElementById("ballTok");

function drawAction(layer, a, from, klass) {
  var g = el("g", {});
  var pad = 23;
  if (a.type === "pass") {
    var p = trim(from, a.to, pad, pad);
    g.appendChild(el("path", { d: "M " + p[0].x + " " + p[0].y + " L " + p[1].x + " " + p[1].y, "class": "pth pass " + klass, "marker-end": "url(#ah-ball)" }));
  } else if (a.type === "dribble") {
    var q = trim(from, a.to, pad, 4);
    g.appendChild(el("path", { d: wavy(q[0], q[1]), "class": "pth dribble " + klass, "marker-end": "url(#ah-ball)" }));
  } else if (a.type === "shot") {
    var s = trim(from, { x: RIM.x, y: RIM.y }, pad, 14);
    g.appendChild(el("path", { d: "M " + s[0].x + " " + s[0].y + " L " + s[1].x + " " + s[1].y, "class": "pth shot " + klass, "marker-end": "url(#ah-ball)" }));
  } else if (a.type === "screen") {
    var r = trim(from, a.to, pad, 0);
    g.appendChild(el("path", { d: "M " + r[0].x + " " + r[0].y + " L " + r[1].x + " " + r[1].y, "class": "pth screen " + klass }));
    var dx = a.to.x - from.x, dy = a.to.y - from.y, L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L * 12, ny = dx / L * 12;
    g.appendChild(el("line", { x1: a.to.x - nx, y1: a.to.y - ny, x2: a.to.x + nx, y2: a.to.y + ny, "class": "scrbar " + klass }));
  } else {
    var m = trim(from, a.to, pad, 4);
    var cls = (a.type === "dmove") ? "pth dmove " : "pth move ";
    var mk = (a.type === "dmove") ? "url(#ah-def)" : "url(#ah-move)";
    g.appendChild(el("path", { d: "M " + m[0].x + " " + m[0].y + " L " + m[1].x + " " + m[1].y, "class": cls + klass, "marker-end": mk }));
  }
  layer.appendChild(g);
}

function render() {
  var snap = stateAt(cur === 0 ? 0 : cur - 1);
  var pos = snap.pos;

  LP.textContent = ""; LG.textContent = "";
  var showAll = document.getElementById("showall").checked;

  if (showAll) {
    for (var i = 0; i < state.steps.length; i++) {
      var base = stateAt(i).pos;
      var acts = state.steps[i].actions;
      for (var k = 0; k < acts.length; k++) {
        var a = acts[k]; if (!base[a.player]) continue;
        drawAction(i === cur - 1 ? LP : LG, a, base[a.player], i === cur - 1 ? "" : "ghost");
      }
    }
  } else if (cur > 0 && state.steps[cur - 1]) {
    var cs = state.steps[cur - 1].actions;
    for (var j = 0; j < cs.length; j++) {
      var b = cs[j]; if (!pos[b.player]) continue;
      drawAction(LP, b, pos[b.player], "");
    }
  }

  LT.textContent = "";
  var order = ["d1", "d2", "d3", "d4", "d5", "o1", "o2", "o3", "o4", "o5"];
  for (var n = 0; n < order.length; n++) {
    var id = order[n], p = state.players[id];
    if (!p) continue;
    if (p.team === "d" && !state.defOn) continue;
    var at = pos[id] || p;
    var g = el("g", { "class": "tok " + p.team + (pending && pending.player === id ? " sel" : ""), "data-id": id, transform: "translate(" + at.x.toFixed(1) + "," + at.y.toFixed(1) + ")" });
    g.appendChild(el("circle", { "class": "hit", r: 24, cx: 0, cy: 0 }));
    if (p.team === "o") {
      g.appendChild(el("circle", { "class": "disc", r: 18, cx: 0, cy: 0 }));
      var t = el("text", { "class": "lbl", x: 0, y: 0 }); t.textContent = p.label; g.appendChild(t);
    } else {
      g.appendChild(el("path", { "class": "xg", d: "M -11 -11 L 11 11 M 11 -11 L -11 11" }));
      var t2 = el("text", { "class": "lbl", x: 0, y: 21 }); t2.textContent = p.label; g.appendChild(t2);
    }
    LT.appendChild(g);
  }

  var bxy = ballXY(pos, snap.ball, snap.shot);
  ballTok.setAttribute("cx", bxy.x); ballTok.setAttribute("cy", bxy.y);
  svg.classList.remove("scored");

  renderSteps(); renderChips();
}

function renderSteps() {
  var bar = document.getElementById("stepbar");
  bar.textContent = "";
  var mk = function (label, idx) {
    var b = document.createElement("button");
    b.className = "btn sm" + (cur === idx ? " on" : "");
    b.textContent = label;
    b.onclick = function () { stopAnim(); cur = idx; pending = null; render(); };
    return b;
  };
  bar.appendChild(mk("Start", 0));
  for (var i = 1; i <= state.steps.length; i++) bar.appendChild(mk(String(i), i));
  var add = document.createElement("button");
  add.className = "btn sm"; add.textContent = "+";
  add.onclick = function () { stopAnim(); state.steps.push({ actions: [] }); cur = state.steps.length; pending = null; render(); };
  bar.appendChild(add);
  if (cur > 0) {
    var del = document.createElement("button");
    del.className = "btn sm danger"; del.textContent = "Delete step";
    del.onclick = function () {
      stopAnim(); state.steps.splice(cur - 1, 1);
      cur = Math.min(cur, state.steps.length); pending = null; render();
    };
    bar.appendChild(del);
  }
}

var TAGCOLOR = { move: "var(--move)", screen: "var(--move)", dribble: "var(--ball)", pass: "var(--ball)", shot: "var(--ball)", dmove: "var(--def)" };
var TAGNAME = { move: "cut", screen: "screen", dribble: "dribble", pass: "pass", shot: "shot", dmove: "def" };

function renderChips() {
  var box = document.getElementById("chips");
  box.textContent = "";
  if (cur === 0) {
    var s = document.createElement("p"); s.className = "empty";
    s.textContent = "Starting spots. Drag players, or pick a formation below.";
    box.appendChild(s); return;
  }
  var step = state.steps[cur - 1];
  if (!step || !step.actions.length) {
    var e = document.createElement("p"); e.className = "empty";
    e.textContent = "Nothing in this step yet. Pick a tool and tap the floor.";
    box.appendChild(e); return;
  }
  step.actions.forEach(function (a, i) {
    var row = document.createElement("div"); row.className = "chip";
    var tg = document.createElement("span"); tg.className = "tag";
    tg.style.background = TAGCOLOR[a.type] || "var(--muted)";
    tg.textContent = TAGNAME[a.type] || a.type;
    var txt = document.createElement("span");
    var who = state.players[a.player] ? state.players[a.player].label : a.player;
    if (a.type === "pass") txt.textContent = who + " to " + (state.players[a.target] ? state.players[a.target].label : "?");
    else if (a.type === "shot") txt.textContent = who + " shoots";
    else if (a.type === "screen") txt.textContent = who + " screens" + (a.target && state.players[a.target] ? " " + state.players[a.target].label : "");
    else txt.textContent = who;
    var x = document.createElement("button"); x.className = "x"; x.innerHTML = "&times;";
    x.setAttribute("aria-label", "Remove");
    x.onclick = function () { stopAnim(); step.actions.splice(i, 1); render(); };
    row.appendChild(tg); row.appendChild(txt); row.appendChild(x);
    box.appendChild(row);
  });
}

/* ---------------- input ---------------- */
function svgPoint(evt) {
  var pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  var m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  var r = pt.matrixTransform(m.inverse());
  return { x: Math.max(COURT.x0 + 6, Math.min(COURT.x1 - 6, r.x)), y: Math.max(COURT.y0 + 6, Math.min(COURT.y1 - 6, r.y)) };
}
function hitToken(evt) {
  var t = evt.target.closest ? evt.target.closest(".tok") : null;
  return t ? t.getAttribute("data-id") : null;
}

var drag = null;
svg.addEventListener("pointerdown", function (evt) {
  if (anim.running) return;
  var id = hitToken(evt);
  if (tool === "arrange") {
    if (!id) return;
    if (cur !== 0) { cur = 0; render(); }
    drag = { id: id };
    svg.setPointerCapture(evt.pointerId);
    evt.preventDefault();
  }
});
svg.addEventListener("pointermove", function (evt) {
  if (!drag) return;
  var p = svgPoint(evt);
  state.players[drag.id].x = p.x; state.players[drag.id].y = p.y;
  render();
  evt.preventDefault();
});
svg.addEventListener("pointerup", function (evt) {
  if (drag) { drag = null; try { svg.releasePointerCapture(evt.pointerId); } catch (e) {} }
});
svg.addEventListener("pointercancel", function () { drag = null; });

svg.addEventListener("click", function (evt) {
  if (anim.running || drag) return;
  var id = hitToken(evt);
  if (tool === "arrange") return;

  if (tool === "ball") {
    if (id && id.charAt(0) === "o") { cur = 0; state.ball = id; pending = null; render(); }
    return;
  }

  if (cur === 0) {
    if (!state.steps.length) state.steps.push({ actions: [] });
    cur = 1;
  }
  var snap = stateAt(cur - 1);
  var step = state.steps[cur - 1];

  if (!pending) {
    if (!id) return;
    if (tool === "dmove" && id.charAt(0) !== "d") { toast("Pick a defender for that one."); return; }
    if (tool !== "dmove" && id.charAt(0) !== "o") { toast("Pick an offensive player."); return; }
    if ((tool === "pass" || tool === "dribble" || tool === "shot") && snap.ball !== id) {
      toast(state.players[id].label + " does not have the ball here."); return;
    }
    if (tool === "shot") {
      step.actions.push({ type: "shot", player: id });
      pending = null; render(); return;
    }
    pending = { player: id };
    render();
    return;
  }

  var from = snap.pos[pending.player];
  var dest = null, target = null;

  if (tool === "pass") {
    if (!id || id.charAt(0) !== "o" || id === pending.player) { toast("Tap a teammate to receive it."); return; }
    target = id;
    dest = snap.pos[id];
    step.actions.push({ type: "pass", player: pending.player, target: target, to: null });
    pending = null; render(); return;
  }

  if (tool === "screen" && id && id !== pending.player) {
    var tp = snap.pos[id];
    var dx = from.x - tp.x, dy = from.y - tp.y, L = Math.hypot(dx, dy) || 1;
    dest = { x: tp.x + dx / L * 30, y: tp.y + dy / L * 30 };
    target = id;
  } else {
    dest = svgPoint(evt);
  }

  step.actions.push({ type: tool, player: pending.player, to: { x: Math.round(dest.x), y: Math.round(dest.y) }, target: target });
  pending = null;
  render();
});

/* pass actions carry no 'to'; resolve the drawn endpoint at render time */
var _drawAction = drawAction;
drawAction = function (layer, a, from, klass) {
  if (a.type === "pass" && !a.to) {
    var snapIdx = 0;
    for (var i = 0; i < state.steps.length; i++) { if (state.steps[i].actions.indexOf(a) >= 0) { snapIdx = i; break; } }
    var after = stateAt(snapIdx + 1).pos;
    var tp = after[a.target] || from;
    return _drawAction(layer, { type: "pass", player: a.player, to: { x: tp.x, y: tp.y } }, from, klass);
  }
  return _drawAction(layer, a, from, klass);
};

/* ---------------- animation ---------------- */
function stopAnim() {
  if (anim.raf) cancelAnimationFrame(anim.raf);
  if (anim.timer) clearTimeout(anim.timer);
  anim.raf = null; anim.timer = null; anim.running = false; anim.live = null;
  document.getElementById("btnPlay").textContent = "Play";
}
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function runStep(idx, done) {
  if (idx >= state.steps.length) { done(true); return; }
  var before = stateAt(idx), after = stateAt(idx + 1);

  cur = idx + 1; renderSteps(); renderChips();

  LP.textContent = ""; LG.textContent = "";
  var acts = state.steps[idx].actions;
  for (var q = 0; q < acts.length; q++) {
    if (before.pos[acts[q].player]) drawAction(LP, acts[q], before.pos[acts[q].player], "");
  }

  var nodes = {};
  [].slice.call(LT.querySelectorAll(".tok")).forEach(function (n) { nodes[n.getAttribute("data-id")] = n; });

  var id;
  for (id in before.pos) {
    if (!before.pos.hasOwnProperty(id)) continue;
    var n0 = nodes[id];
    if (n0) n0.setAttribute("transform", "translate(" + before.pos[id].x.toFixed(1) + "," + before.pos[id].y.toFixed(1) + ")");
  }
  svg.classList.remove("scored");

  var tweens = [];
  for (id in before.pos) {
    if (!before.pos.hasOwnProperty(id)) continue;
    var a = before.pos[id], b = after.pos[id];
    if (!b) continue;
    if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) tweens.push({ id: id, a: a, b: b });
  }
  var b0 = ballXY(before.pos, before.ball, before.shot);
  var b1 = ballXY(after.pos, after.ball, after.shot);
  ballTok.setAttribute("cx", b0.x); ballTok.setAttribute("cy", b0.y);

  var t0 = null, dur = speed;
  function frame(now) {
    if (t0 === null) t0 = now;
    var p = Math.min(1, (now - t0) / dur), e = ease(p);
    for (var i = 0; i < tweens.length; i++) {
      var tw = tweens[i], n = nodes[tw.id];
      if (n) n.setAttribute("transform", "translate(" + (tw.a.x + (tw.b.x - tw.a.x) * e).toFixed(1) + "," + (tw.a.y + (tw.b.y - tw.a.y) * e).toFixed(1) + ")");
    }
    ballTok.setAttribute("cx", (b0.x + (b1.x - b0.x) * e).toFixed(1));
    ballTok.setAttribute("cy", (b0.y + (b1.y - b0.y) * e).toFixed(1));
    if (p < 1) { anim.raf = requestAnimationFrame(frame); return; }
    anim.raf = null;
    if (after.shot) svg.classList.add("scored");
    done(idx + 1 >= state.steps.length);
  }
  anim.raf = requestAnimationFrame(frame);
}

function playAll() {
  if (!state.steps.length) { toast("Add a step first."); return; }
  stopAnim();
  cur = 0; render();
  anim.running = true;
  document.getElementById("btnPlay").textContent = "Stop";
  var i = 0;
  function go() {
    if (!anim.running) return;
    runStep(i, function (last) {
      if (!anim.running) return;
      if (last) { anim.running = false; document.getElementById("btnPlay").textContent = "Replay"; return; }
      i++; anim.timer = setTimeout(go, 320);
    });
  }
  go();
}

document.getElementById("btnPlay").onclick = function () {
  if (anim.running) { stopAnim(); render(); } else playAll();
};
document.getElementById("btnStepFwd").onclick = function () {
  stopAnim();
  var idx = cur;
  if (idx >= state.steps.length) { cur = 0; render(); return; }
  anim.running = true;
  runStep(idx, function () { anim.running = false; document.getElementById("btnPlay").textContent = "Play"; });
};
document.getElementById("btnReset").onclick = function () { stopAnim(); cur = 0; pending = null; render(); };
[].slice.call(document.querySelectorAll("[data-speed]")).forEach(function (b) {
  b.onclick = function () {
    speed = parseInt(b.getAttribute("data-speed"), 10);
    [].slice.call(document.querySelectorAll("[data-speed]")).forEach(function (o) { o.classList.remove("on"); });
    b.classList.add("on");
  };
});

/* ---------------- tools ---------------- */
[].slice.call(document.querySelectorAll("#tools .btn")).forEach(function (b) {
  b.onclick = function () {
    stopAnim();
    tool = b.getAttribute("data-tool");
    [].slice.call(document.querySelectorAll("#tools .btn")).forEach(function (o) { o.classList.remove("on"); });
    b.classList.add("on");
    pending = null;
    if (tool === "arrange" || tool === "ball") cur = 0;
    document.getElementById("hint").textContent = TOOLS[tool];
    render();
  };
});
document.getElementById("hint").textContent = TOOLS.arrange;
document.getElementById("showall").onchange = render;

/* ---------------- formations ---------------- */
[].slice.call(document.querySelectorAll("#offsets .btn")).forEach(function (b) {
  b.onclick = function () { stopAnim(); applyOff(state, b.getAttribute("data-off")); state.steps = []; cur = 0; pending = null; render(); };
});
[].slice.call(document.querySelectorAll("#defsets .btn")).forEach(function (b) {
  b.onclick = function () { stopAnim(); applyDef(state, b.getAttribute("data-def")); state.steps = []; cur = 0; pending = null; render(); };
});

/* ---------------- library ---------------- */
function writeLib() {
  if (!Store.savePlays(lib)) toast("Could not save to this browser. Use Backup to copy your plays out.");
  if (window.CC && window.CC.onPlaysChanged) window.CC.onPlaysChanged();
}
function renderLib() {
  var box = document.getElementById("lib");
  box.textContent = "";
  if (!lib.length) { var e = document.createElement("p"); e.className = "empty"; e.textContent = "Nothing saved yet."; box.appendChild(e); return; }
  lib.forEach(function (p, i) {
    var row = document.createElement("div"); row.className = "libitem";
    var nm = document.createElement("span"); nm.className = "libname"; nm.textContent = p.name;
    var ld = document.createElement("button"); ld.className = "btn sm"; ld.textContent = "Open";
    ld.onclick = function () { stopAnim(); state = JSON.parse(JSON.stringify(p)); document.getElementById("playname").value = state.name; cur = 0; pending = null; render(); toast("Opened " + p.name); };
    var dl = document.createElement("button"); dl.className = "btn sm danger"; dl.innerHTML = "&times;";
    dl.setAttribute("aria-label", "Delete " + p.name);
    dl.onclick = function () { lib.splice(i, 1); writeLib(); renderLib(); };
    row.appendChild(nm); row.appendChild(ld); row.appendChild(dl);
    box.appendChild(row);
  });
}
document.getElementById("btnSave").onclick = function () {
  state.name = document.getElementById("playname").value.trim() || "Untitled";
  var copy = JSON.parse(JSON.stringify(state));
  var at = -1;
  for (var i = 0; i < lib.length; i++) if (lib[i].name === copy.name) at = i;
  if (at >= 0) lib[at] = copy; else lib.push(copy);
  writeLib(); renderLib(); toast("Saved " + copy.name);
};
document.getElementById("btnNew").onclick = function () {
  stopAnim(); state = blankPlay("New play");
  document.getElementById("playname").value = state.name;
  cur = 0; pending = null; render();
};
document.getElementById("btnExport").onclick = function () {
  var ta = document.getElementById("io");
  ta.value = JSON.stringify(lib);
  ta.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ta.value).then(function () { toast("Copied. Paste it somewhere safe."); },
      function () { toast("Select the text and copy it."); });
  } else toast("Select the text and copy it.");
};
document.getElementById("btnImport").onclick = function () {
  var ta = document.getElementById("io");
  try {
    var arr = JSON.parse(ta.value);
    if (!Array.isArray(arr)) throw new Error("not a list");
    lib = arr; writeLib(); renderLib(); toast("Loaded " + arr.length + " plays.");
  } catch (e) { toast("That text is not a play library."); }
};

var toastT = null;
function toast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  if (toastT) clearTimeout(toastT);
  toastT = setTimeout(function () { t.classList.remove("show"); }, 1900);
}

/* ---------------- seed plays ---------------- */
function seed() {
  function base(offKey) {
    var p = { name: "", players: {}, ball: "o1", defOn: true, steps: [] };
    applyOff(p, offKey); applyDef(p, "23");
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
  walker.players.o4 = { id: "o4", team: "o", label: "4", x: 360, y: 120 };
  walker.players.o5 = { id: "o5", team: "o", label: "5", x: 200, y: 120 };
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

/* ---------------- boot ---------------- */
function init(seedPlays) {
  lib = seedPlays || [];
  state = JSON.parse(JSON.stringify(lib[1] || lib[0] || blankPlay("New play")));
  document.getElementById("playname").value = state.name;
  renderLib();
  render();
}

return {
  init: init,
  seed: seed,
  getLib: function () { return lib; },
  setLib: function (a) { lib = a; renderLib(); },
  open: function (p) {
    stopAnim();
    state = JSON.parse(JSON.stringify(p));
    document.getElementById("playname").value = state.name;
    cur = 0; pending = null; render();
  },
  current: function () { return state; }
};

})();
