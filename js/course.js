/* Player Course: weekly lessons for the players. Content lives in
   js/course-data.js; this file only draws it. Every court here is a
   Court.mount(), the same renderer Play Creator and the Play Library use.
   Progress, quiz answers and 17s times are saved in this browser. */
window.Course = (function () {
"use strict";

var $ = function (id) { return document.getElementById(id); };
var KEY = "cc.course.v1", KEY17 = "cc.course.17s";
var RIM = { x: 280, y: 93 };

function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function make(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function svgEl(tag, attrs) {
  var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
  return e;
}
function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

var st = get(KEY, {}) || {};
st.done = st.done || {}; st.quiz = st.quiz || {};
function save() { set(KEY, st); }

var week = window.CourseData.weeks[0];
var lessons = week.lessons;
var live = [];        /* mounted courts and timers on the open lesson, stopped on leave */

/* ---------------- play format: data file -> Court play ---------------- */
function toPlay(name, d) {
  var p = { name: name, players: {}, ball: "o" + d.ball, defOn: !!d.d, steps: [] };
  Object.keys(d.o).forEach(function (n) { p.players["o" + n] = { id: "o" + n, team: "o", label: n, x: d.o[n][0], y: d.o[n][1] }; });
  Object.keys(d.d || {}).forEach(function (n) { p.players["d" + n] = { id: "d" + n, team: "d", label: "x" + n, x: d.d[n][0], y: d.d[n][1] }; });
  p.steps = d.steps.map(function (acts) {
    return { actions: acts.map(function (a) {
      if (a[0] === "pass") return { type: "pass", player: a[1], target: a[2] };
      if (a[0] === "shot") return { type: "shot", player: a[1] };
      return { type: a[0], player: a[1], to: { x: a[2], y: a[3] } };
    }) };
  });
  return p;
}

function courtBlock(title, sub) {
  var wrap = make("section", "crvis");
  var head = make("div", "crvis-h");
  head.appendChild(make("h3", null, title));
  if (sub) head.appendChild(make("span", "crvis-sub", sub));
  wrap.appendChild(head);
  var card = make("div", "courtcard");
  wrap.appendChild(card);
  return { wrap: wrap, head: head, card: card };
}

/* ---------------- visual: animated play ---------------- */
function visPlay(vis) {
  var b = courtBlock(vis.name, "Step through it");
  var view = Court.mount(b.card, vis.name);
  live.push(view);
  var cap = make("p", "crcap"); cap.setAttribute("aria-live", "polite");
  var ctl = make("div", "viewctl");
  var bPlay = make("button", "btn primary", "Play"), bStep = make("button", "btn", "Step"), bReset = make("button", "btn", "Reset");
  var lbl = make("span", "vstep");
  [bPlay, bStep, bReset, lbl].forEach(function (x) { ctl.appendChild(x); });
  b.wrap.appendChild(cap); b.wrap.appendChild(ctl);
  var play = toPlay(vis.name, vis.play), caps = vis.play.captions || [];
  view.speed = 1500;
  view.onChange = function () {
    cap.textContent = caps[view.cur] || "";
    lbl.textContent = view.cur === 0 ? "Start" : "Step " + view.cur + " of " + play.steps.length;
    bPlay.textContent = view.running ? "Running" : "Play";
  };
  bPlay.onclick = function () { view.playAll(); };
  bStep.onclick = function () { view.stepForward(); };
  bReset.onclick = function () { view.go(0); };
  view.show(JSON.parse(JSON.stringify(play)));
  return b.wrap;
}

/* ---------------- visual: floor map ---------------- */
var SPOTS = [
  ["Top", 280, 353, "Above the 3-point arc in the middle. The point guard usually starts here."],
  ["Left slot", 178, 333, "Above the arc, between the top and the wing."],
  ["Right slot", 382, 333, "Above the arc, between the top and the wing."],
  ["Left wing", 92, 231, "On the arc, even with the free-throw line. The most common place to catch the ball."],
  ["Right wing", 468, 231, "On the arc, even with the free-throw line. The most common place to catch the ball."],
  ["Left corner", 56, 66, "On the baseline behind the arc. The hardest spot to help on: a helper in the lane can't see the ball and the corner at once."],
  ["Right corner", 504, 66, "On the baseline behind the arc. The hardest spot to help on: a helper in the lane can't see the ball and the corner at once."],
  ["Left elbow", 220, 231, "Where the free-throw line meets the lane line. A great place to catch, turn and face the rim."],
  ["Right elbow", 340, 231, "Where the free-throw line meets the lane line. A great place to catch, turn and face the rim."],
  ["High post", 280, 213, "Middle of the free-throw line. The hole in the middle of a 2-3 zone."],
  ["Left block", 208, 127, "Low post, just outside the lane. Post-ups and box-outs start here."],
  ["Right block", 352, 127, "Low post, just outside the lane. Post-ups and box-outs start here."],
  ["Left short corner", 138, 103, "On the baseline, halfway between the lane and the corner. Zone defenders have to turn their heads to see you."],
  ["Right short corner", 422, 103, "On the baseline, halfway between the lane and the corner. Zone defenders have to turn their heads to see you."],
  ["Left dunker spot", 196, 62, "On the baseline just outside the lane. Wait here for a dump-off pass when a teammate drives."],
  ["Right dunker spot", 364, 62, "On the baseline just outside the lane. Wait here for a dump-off pass when a teammate drives."]
];
function visSpots() {
  var b = courtBlock("The floor map");
  var seg = make("div", "seg sm"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Mode");
  var bLearn = make("button", "on", "Learn"), bQuiz = make("button", null, "Spot call");
  seg.appendChild(bLearn); seg.appendChild(bQuiz); b.head.appendChild(seg);
  var view = Court.mount(b.card, "Floor map with named spots");
  live.push(view);
  view.show({ name: "", players: {}, ball: null, defOn: false, steps: [] });
  var svg = view.svg;
  var dots = svgEl("g", { "class": "crspots" }), marks = svgEl("g", { "class": "crmarks" });
  svg.appendChild(dots); svg.appendChild(marks);
  SPOTS.forEach(function (s, i) {
    var g = svgEl("g", { "class": "crspot", "data-i": i });
    g.appendChild(svgEl("circle", { cx: s[1], cy: s[2], r: 18, "class": "hitc" }));
    g.appendChild(svgEl("circle", { cx: s[1], cy: s[2], r: 10, "class": "dot" }));
    var t = svgEl("text", { x: s[1], y: s[2] + (s[2] < 110 ? 26 : -16) });
    t.textContent = s[0].replace(/^(Left|Right) /, "").toUpperCase();
    g.appendChild(t);
    dots.appendChild(g);
  });
  var panel = make("div", "crpanel"); panel.setAttribute("aria-live", "polite");
  b.wrap.appendChild(panel);
  var mode = "learn", target = -1, streak = 0, best = get("cc.course.spotbest", 0), waiting = false;

  function learn(i) {
    [].slice.call(dots.querySelectorAll(".crspot")).forEach(function (g, j) { g.classList.toggle("sel", j === i); });
    panel.textContent = "";
    if (i == null) {
      panel.appendChild(make("p", null, "Tap any dot to learn the spot. When you know them, switch to Spot call and test yourself."));
      return;
    }
    panel.appendChild(make("p", "crbig", SPOTS[i][0]));
    panel.appendChild(make("p", null, SPOTS[i][3]));
  }
  function next() {
    var t; do { t = Math.floor(Math.random() * SPOTS.length); } while (t === target);
    target = t; waiting = true; marks.textContent = "";
    panel.textContent = "";
    panel.appendChild(make("p", "crkicker", "Coach calls"));
    panel.appendChild(make("p", "crbig", SPOTS[t][0] + "!"));
    panel.appendChild(make("p", "crscore", "Tap the court where you'd sprint. Streak " + streak + " · Best " + best));
  }
  function setMode(m) {
    mode = m;
    bLearn.classList.toggle("on", m === "learn"); bQuiz.classList.toggle("on", m === "quiz");
    dots.style.display = m === "quiz" ? "none" : "";
    marks.textContent = ""; streak = 0;
    if (m === "quiz") next(); else learn(null);
  }
  bLearn.onclick = function () { setMode("learn"); };
  bQuiz.onclick = function () { setMode("quiz"); };
  svg.addEventListener("click", function (e) {
    if (mode === "learn") {
      var g = e.target.closest && e.target.closest(".crspot");
      if (g) learn(+g.getAttribute("data-i"));
      return;
    }
    if (!waiting) return;
    var p = view.point(e), bi = 0, bd = 1e9;
    SPOTS.forEach(function (s, i) { var d = Math.hypot(s[1] - p.x, s[2] - p.y); if (d < bd) { bd = d; bi = i; } });
    var ok = bi === target && bd < 60, t = SPOTS[target];
    waiting = false;
    marks.textContent = "";
    marks.appendChild(svgEl("circle", { cx: t[1], cy: t[2], r: 12, "class": "right" }));
    marks.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 9, "class": ok ? "tap ok" : "tap no" }));
    if (ok) { streak++; if (streak > best) { best = streak; set("cc.course.spotbest", best); } } else streak = 0;
    panel.textContent = "";
    panel.appendChild(make("p", ok ? "crok" : "crno", ok ? "Got it." : "Not quite. The " + t[0].toLowerCase() + " is the orange ring."));
    panel.appendChild(make("p", "crscore", "Streak " + streak + " · Best " + best));
    var nb = make("button", "btn primary sm", "Next spot");
    nb.onclick = next;
    panel.appendChild(nb);
  });
  learn(null);
  return b.wrap;
}

/* ---------------- visual: shell lab (pack line, 5 players) ----------------
   Spots run left to right in passing order: corner, wing, top, wing, corner.
   One spot from the ball is GAP, two or more is HELP. The ball defender
   shades to the baseline side so the drive goes middle, into the pack. */
var SHELL = { 1: { x: 62, y: 66 }, 2: { x: 92, y: 231 }, 3: { x: 280, y: 353 }, 4: { x: 468, y: 231 }, 5: { x: 498, y: 66 } };
var SHELL_N = 5;
var SPOT_NAME = { 1: "left corner", 2: "left wing", 3: "top", 4: "right wing", 5: "right corner" };
var ROLE_TXT = {
  BALL: "Your man has the ball. Arm's length off, shaded to his baseline side. Never give up baseline. Force him middle, into the pack.",
  GAP: "One pass away. On the line between your man and the ball, inside the pack line. Don't deny. Be the first wall on a drive.",
  HELP: "Two passes away. Feet in the lane, one hand on the ball, one on your man. You're the wall at the rim."
};
function ballSpot(k) {
  var P = SHELL[k];
  if (k === 3) return lerp(P, RIM, 0.16);
  if (k === 1 || k === 5) return lerp(P, RIM, 0.17);
  return lerp(lerp(P, RIM, 0.15), SHELL[k === 2 ? 1 : 5], 0.12);
}
function shellSpots(ball) {
  var bp = SHELL[ball], out = {};
  for (var k = 1; k <= SHELL_N; k++) {
    var P = SHELL[k], d = Math.abs(k - ball), pos, role;
    if (d === 0) { pos = ballSpot(k); role = "BALL"; }
    else if (d === 1) { pos = lerp(lerp(P, bp, 0.3), RIM, 0.36); role = "GAP"; }
    else { pos = lerp(lerp(P, bp, 0.35), RIM, 0.6); role = "HELP"; }
    out[k] = { x: Math.round(pos.x), y: Math.round(pos.y), role: role };
  }
  return out;
}
var LINES = [
  ["pack", "Pack line"],
  ["side", "Ball side · help side"],
  ["tri", "Ball, you, man"],
  ["force", "Force middle"]
];
function visShell(vis) {
  vis = vis || {};
  var modes = vis.modes || ["watch", "turn"];
  var b = courtBlock(vis.title || "Shell lab", vis.sub || "");
  var bWatch = make("button", "on", "Watch"), bTurn = make("button", null, "Your turn");
  if (modes.length > 1) {
    var seg = make("div", "seg sm"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Mode");
    seg.appendChild(bWatch); seg.appendChild(bTurn); b.head.appendChild(seg);
  }
  var view = Court.mount(b.card, "Shell drill: pack line positions");
  live.push(view);
  view.speed = 900;
  var svg = view.svg, NS_LG = svg.querySelector(".lg");
  var under = svgEl("g", { "class": "crlines" }), over = svgEl("g", { "class": "crlines" });
  svg.insertBefore(under, NS_LG);
  var marks = svgEl("g", { "class": "crmarks" });
  svg.appendChild(over); svg.appendChild(marks);
  var defs = svg.querySelector("defs");
  defs.insertAdjacentHTML("beforeend", '<marker id="' + svg.querySelector("marker").id + '-force" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--ball)"/></marker>');
  var forceId = svg.querySelector("marker").id + "-force";

  /* invisible-line toggles */
  var on = {}; (vis.lines || ["pack"]).forEach(function (k) { on[k] = true; });
  var chips = make("div", "crchips");
  chips.appendChild(make("span", "crkicker", "Invisible lines"));
  LINES.forEach(function (l) {
    var c = make("button", "crchip" + (on[l[0]] ? " on" : ""), l[1]);
    c.setAttribute("aria-pressed", on[l[0]] ? "true" : "false");
    c.onclick = function () { on[l[0]] = !on[l[0]]; c.classList.toggle("on", on[l[0]]); c.setAttribute("aria-pressed", on[l[0]] ? "true" : "false"); drawLines(); };
    chips.appendChild(c);
  });
  b.wrap.appendChild(chips);

  var panel = make("div", "crpanel"); panel.setAttribute("aria-live", "polite");
  b.wrap.appendChild(panel);
  var key = make("div", "crroles");
  ["BALL", "GAP", "HELP"].forEach(function (r) {
    var d = make("div", "crrole"); d.setAttribute("data-r", r);
    d.appendChild(make("b", null, r)); d.appendChild(make("span", null, ROLE_TXT[r]));
    key.appendChild(d);
  });
  b.wrap.appendChild(key);

  var ball = vis.ball || 4, pos = shellSpots(ball), mode = "watch", me = 0, newBall = 0, waiting = false, streak = 0;

  function drawLines() {
    under.textContent = ""; over.textContent = "";
    if (view.running) return;
    if (on.pack) {
      under.appendChild(svgEl("path", { "class": "pack", d: "M 129 40 A 160 160 0 1 0 431 40" }));
      var lft = SHELL[ball].x >= 280;
      var t = svgEl("text", { "class": "packlbl", x: lft ? 40 : 520, y: 186, "text-anchor": lft ? "start" : "end" }); t.textContent = "PACK LINE";
      under.appendChild(t);
    }
    var bp = SHELL[ball];
    if (on.side) {
      under.appendChild(svgEl("line", { "class": "split", x1: 280, y1: 40, x2: 280, y2: 400 }));
      if (ball === 3) {
        var tm = svgEl("text", { "class": "sidelbl", x: 290, y: 392 }); tm.textContent = "BALL IN THE MIDDLE";
        under.appendChild(tm);
      } else {
        var right = bp.x > 280;
        var ts = svgEl("text", { "class": "sidelbl", x: right ? 520 : 40, y: 392, "text-anchor": right ? "end" : "start" }); ts.textContent = "BALL SIDE";
        var th = svgEl("text", { "class": "sidelbl help", x: right ? 40 : 520, y: 392, "text-anchor": right ? "start" : "end" }); th.textContent = "HELP SIDE";
        under.appendChild(ts); under.appendChild(th);
      }
    }
    if (on.tri) {
      for (var k = 1; k <= SHELL_N; k++) {
        if (k === ball) continue;
        var d = pos[k];
        under.appendChild(svgEl("line", { "class": "tri", x1: d.x, y1: d.y, x2: SHELL[k].x, y2: SHELL[k].y }));
        under.appendChild(svgEl("line", { "class": "tri", x1: d.x, y1: d.y, x2: bp.x, y2: bp.y }));
      }
    }
    if (on.force) {
      if (ball === 3) {
        var tf = svgEl("text", { "class": "forcelbl", x: 280, y: 296, "text-anchor": "middle" }); tf.textContent = "KEEP HIM IN FRONT";
        over.appendChild(tf);
      } else {
        var sgn = bp.x > 280 ? -1 : 1;
        var a = { x: bp.x + sgn * 26, y: bp.y + (bp.y < 100 ? 22 : 8) };
        var c = { x: 280 + -sgn * 52, y: bp.y < 100 ? 150 : 190 };
        var m = { x: (a.x + c.x) / 2, y: Math.max(a.y, c.y) + 34 };
        over.appendChild(svgEl("path", { "class": "force", d: "M " + a.x + " " + a.y + " Q " + m.x + " " + m.y + " " + c.x + " " + c.y, "marker-end": "url(#" + forceId + ")" }));
        var tl = svgEl("text", { "class": "forcelbl", x: m.x, y: m.y + 6, "text-anchor": "middle" }); tl.textContent = "FORCE MIDDLE";
        over.appendChild(tl);
        var bx = bp.x - sgn * 4, by = bp.y < 100 ? 48 : bp.y - 70;
        over.appendChild(svgEl("line", { "class": "nobase", x1: bx - 16, y1: by, x2: bx + 16, y2: by }));
        var tn = svgEl("text", { "class": "forcelbl no", x: bx, y: by + (bp.y < 100 ? 20 : -10), "text-anchor": "middle" }); tn.textContent = "NO BASELINE";
        over.appendChild(tn);
      }
    }
  }

  function labels(roles, youIdx) {
    var pl = {};
    for (var k = 1; k <= SHELL_N; k++) {
      pl["o" + k] = { id: "o" + k, team: "o", label: String(k), x: SHELL[k].x, y: SHELL[k].y };
      pl["d" + k] = { id: "d" + k, team: "d", label: k === youIdx ? "YOU" : roles[k], x: pos[k].x, y: pos[k].y };
    }
    return pl;
  }
  function roleMap(spots) { var r = {}; for (var k = 1; k <= SHELL_N; k++) r[k] = spots[k].role; return r; }
  function render(youIdx) {
    view.show({ name: "Shell", players: labels(roleMap(pos), youIdx), ball: "o" + ball, defOn: true, steps: [] });
    if (youIdx) { view.selected = "d" + youIdx; view.draw(); }
    drawLines();
  }
  function move(newB, moves, youIdx, after) {
    var spots = shellSpots(newB), acts = [];
    if (newB !== ball) acts.push({ type: "pass", player: "o" + ball, target: "o" + newB });
    moves.forEach(function (k) { acts.push({ type: "dmove", player: "d" + k, to: { x: spots[k].x, y: spots[k].y } }); });
    var roles = {};
    for (var k = 1; k <= SHELL_N; k++) roles[k] = moves.indexOf(k) >= 0 ? spots[k].role : "";
    view.show({ name: "Shell", players: labels(roles, youIdx), ball: "o" + ball, defOn: true, steps: [{ actions: acts }] });
    if (youIdx) view.selected = "d" + youIdx;
    view.onChange = function () {
      if (view.running) { under.textContent = ""; over.textContent = ""; return; }
      view.onChange = function () {};
      moves.forEach(function (k) { pos[k] = spots[k]; });
      ball = newB;
      if (after) after();
      drawLines();
    };
    view.stepForward();
  }
  function hilite(r) {
    [].slice.call(key.querySelectorAll(".crrole")).forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-r") === r); });
  }
  function watchPrompt() {
    panel.textContent = "";
    panel.appendChild(make("p", null, "Tap a numbered player to pass him the ball. Every defender moves while the ball is in the air. Read the job under each X, and turn the invisible lines on and off."));
  }
  function turn() {
    marks.textContent = "";
    do { newBall = 1 + Math.floor(Math.random() * SHELL_N); } while (newBall === ball);
    do { me = 1 + Math.floor(Math.random() * SHELL_N); } while (me === newBall && Math.random() < 0.6);
    hilite(null);
    var others = []; for (var k = 1; k <= SHELL_N; k++) if (k !== me) others.push(k);
    panel.textContent = "";
    panel.appendChild(make("p", "crkicker", "Watch the pass"));
    move(newBall, others, me, function () {
      waiting = true;
      render(me);
      panel.textContent = "";
      panel.appendChild(make("p", "crkicker", "Your turn"));
      panel.appendChild(make("p", "crbig", "Ball is in the " + SPOT_NAME[newBall] + ". You're guarding " + me + "."));
      panel.appendChild(make("p", "crscore", "You're the orange X. Tap where you should be standing. Streak " + streak));
    });
  }
  function setMode(m) {
    mode = m; waiting = false; marks.textContent = "";
    bWatch.classList.toggle("on", m === "watch"); bTurn.classList.toggle("on", m === "turn");
    pos = shellSpots(ball);
    if (m === "watch") { render(0); watchPrompt(); hilite(null); }
    else { streak = 0; render(0); turn(); }
  }
  bWatch.onclick = function () { setMode("watch"); };
  bTurn.onclick = function () { setMode("turn"); };

  svg.addEventListener("click", function (e) {
    if (view.running) return;
    if (mode === "watch") {
      var g = e.target.closest && e.target.closest(".tok.o");
      if (!g) return;
      var k = +g.getAttribute("data-id").slice(1);
      if (k === ball) return;
      move(k, [1, 2, 3, 4, 5], 0, function () { render(0); });
      return;
    }
    if (!waiting) return;
    waiting = false;
    var p = view.point(e), right = shellSpots(ball)[me];
    var ok = Math.hypot(p.x - right.x, p.y - right.y) < 42;
    marks.textContent = "";
    marks.appendChild(svgEl("circle", { cx: right.x, cy: right.y, r: 16, "class": "right" }));
    marks.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 9, "class": ok ? "tap ok" : "tap no" }));
    streak = ok ? streak + 1 : 0;
    hilite(right.role);
    panel.textContent = "";
    panel.appendChild(make("p", ok ? "crok" : "crno", (ok ? "Yes. " : "Not quite. ") + "You're " + right.role + "."));
    panel.appendChild(make("p", null, ROLE_TXT[right.role]));
    panel.appendChild(make("p", "crscore", "Streak " + streak));
    var nb = make("button", "btn primary sm", "Next pass");
    nb.onclick = turn;
    panel.appendChild(nb);
    move(ball, [me], me, function () {});
  });

  render(0);
  watchPrompt();
  return b.wrap;
}

/* ---------------- visual: warm-up routine ---------------- */
function visRoutine(vis) {
  var w = make("section", "crvis");
  var head = make("div", "crvis-h"); head.appendChild(make("h3", null, "The routine")); head.appendChild(make("span", "crvis-sub", "About 8 minutes"));
  w.appendChild(head);
  var ol = make("ol", "crroutine");
  vis.items.forEach(function (it) {
    var li = make("li");
    li.appendChild(make("b", null, it[0]));
    li.appendChild(make("span", null, it[1]));
    ol.appendChild(li);
  });
  w.appendChild(ol);
  return w;
}

/* ---------------- visual: 17s partner timer ---------------- */
function fmt(s) { return s.toFixed(1); }
function visTimer() {
  var w = make("section", "crvis");
  var head = make("div", "crvis-h"); head.appendChild(make("h3", null, "Partner timer")); head.appendChild(make("span", "crvis-sub", "Your partner runs the clock"));
  w.appendChild(head);
  var clock = make("div", "crclock", "0.0");
  var row = make("div", "row");
  var bGo = make("button", "btn primary grow", "Start"), bReset = make("button", "btn", "Reset"), bSave = make("button", "btn", "Save time");
  row.appendChild(bGo); row.appendChild(bReset); row.appendChild(bSave);
  var log = make("div", "crlog");
  w.appendChild(clock); w.appendChild(row); w.appendChild(log);

  var t0 = 0, acc = 0, timer = null;
  function now() { return acc + (timer ? (Date.now() - t0) / 1000 : 0); }
  function tick() { clock.textContent = fmt(now()); }
  function stop() { if (timer) { acc = now(); clearInterval(timer); timer = null; } bGo.textContent = acc ? "Resume" : "Start"; tick(); }
  bGo.onclick = function () {
    if (timer) { stop(); return; }
    t0 = Date.now(); timer = setInterval(tick, 100); bGo.textContent = "Stop";
  };
  bReset.onclick = function () { stop(); acc = 0; bGo.textContent = "Start"; tick(); };
  bSave.onclick = function () {
    stop();
    if (!acc) { window.CC.toast("Run the clock first."); return; }
    var times = get(KEY17, []);
    times.unshift({ t: Math.round(acc * 10) / 10, d: new Date().toISOString().slice(0, 10) });
    set(KEY17, times.slice(0, 20));
    acc = 0; bGo.textContent = "Start"; tick();
    renderLog();
    window.CC.toast("Time saved.");
  };
  function renderLog() {
    var times = get(KEY17, []);
    log.textContent = "";
    if (!times.length) { log.appendChild(make("p", "note", "No times yet. Save your first one at practice.")); return; }
    var best = Math.min.apply(null, times.map(function (x) { return x.t; }));
    var b = make("p", "crbest"); b.appendChild(make("span", null, "Your best")); b.appendChild(make("b", null, fmt(best) + " s"));
    log.appendChild(b);
    times.slice(0, 6).forEach(function (x) {
      var r = make("div", "crlogrow");
      r.appendChild(make("span", null, x.d));
      r.appendChild(make("b", null, fmt(x.t) + " s" + (x.t === best ? "  ·  best" : "")));
      log.appendChild(r);
    });
  }
  renderLog();
  live.push({ stop: function () { if (timer) stop(); } });
  return w;
}

/* ---------------- quiz ----------------
   A lesson is finished only when every answer is right. Answer order is
   shuffled on every attempt so guessing the same letter doesn't work. */
function perfect(l) {
  var a = st.quiz[l.id] || {};
  for (var i = 0; i < l.quiz.length; i++) if (a[i] !== l.quiz[i].a) return false;
  return true;
}

/* The week's secret word. It is not stored as text: it decodes from the
   answers a player actually picked, so it only reads right when every one of
   them is correct. To change the word (or after editing any quiz), run
   Course.encode("NEWWORD") in the browser console and paste the result here. */
var SECRET = [124, 119, 3, 14, 9, 27, 11, 44];
function answerKey(useCorrect) {
  return lessons.map(function (l) {
    var a = st.quiz[l.id] || {};
    return l.quiz.map(function (q, i) { return useCorrect ? q.a : a[i]; }).join("");
  }).join("");
}
function xor(codes, key) {
  return codes.map(function (c, i) { return c ^ ((key.charCodeAt(i % key.length) + i * 7) & 255); });
}
function secret() {
  if (!lessons.every(perfect)) return null;
  return String.fromCharCode.apply(null, xor(SECRET, answerKey(false)));
}
function encode(word) {
  return JSON.stringify(xor(word.split("").map(function (c) { return c.charCodeAt(0); }), answerKey(true)));
}

function shuffled(n) {
  var o = []; for (var i = 0; i < n; i++) o.push(i);
  for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), t = o[j]; o[j] = o[k]; o[k] = t; }
  return o;
}

function reveal(word) {
  var w = make("section", "crsecret");
  w.appendChild(make("p", "crkicker", "Week " + week.n + " complete · every answer right"));
  w.appendChild(make("p", "crsecret-lbl", "The secret word is"));
  w.appendChild(make("p", "crsecret-word", word));
  w.appendChild(make("p", null, "Don't share it. Tell Coach at practice."));
  return w;
}

function quiz(lesson) {
  var w = make("section", "panel crquiz");
  var h = make("h3", null, "Check yourself"); w.appendChild(h);
  var score = make("p", "crscore"); w.appendChild(score);
  var ans = st.quiz[lesson.id] || {};
  var retry = make("button", "btn sm", "Retake quiz");
  function update() {
    var n = Object.keys(ans).length, right = 0, total = lesson.quiz.length;
    Object.keys(ans).forEach(function (i) { if (ans[i] === lesson.quiz[i].a) right++; });
    retry.className = "btn sm";
    score.className = "crscore";
    if (!n) { score.textContent = total + " questions. Get every one right to finish this lesson."; return; }
    if (n < total) { score.textContent = right + " of " + n + " right so far"; return; }
    if (right === total) {
      score.textContent = "All " + total + " right. Lesson complete.";
      score.className = "crscore crok";
      if (!st.done[lesson.id]) {
        st.done[lesson.id] = true; save(); renderList();
        var word = secret();
        if (word) {
          window.CC.toast("Week " + week.n + " complete!");
          var r = reveal(word);
          $("crLesson").appendChild(r);
          r.scrollIntoView({ block: "center" });
        } else window.CC.toast("Lesson complete.");
      }
    } else {
      score.textContent = right + " of " + total + " right. You need every answer right to finish. Read the explanations, then retake it.";
      score.className = "crscore crno";
      retry.className = "btn primary sm";
    }
  }
  lesson.quiz.forEach(function (q, qi) {
    var box = make("div", "crq");
    box.appendChild(make("p", "crqt", (qi + 1) + ". " + q.q));
    var opts = make("div", "cropts"), ex = make("p", "crex"), btns = {}; ex.hidden = true;
    shuffled(q.o.length).forEach(function (oi) {
      var b = make("button", "cropt", q.o[oi]);
      b.onclick = function () {
        if (ans[qi] != null) return;
        ans[qi] = oi; st.quiz[lesson.id] = ans; save(); show(); update();
      };
      btns[oi] = b;
      opts.appendChild(b);
    });
    function show() {
      var picked = ans[qi];
      if (picked == null) return;
      Object.keys(btns).forEach(function (k) {
        var i = +k, b = btns[k];
        b.disabled = true;
        if (i === q.a) b.classList.add("right"); else if (i === picked) b.classList.add("wrong");
      });
      ex.hidden = false;
      ex.textContent = "";
      ex.appendChild(make("b", null, picked === q.a ? "Right. " : "Not this one. "));
      ex.appendChild(document.createTextNode(q.e));
    }
    box.appendChild(opts); box.appendChild(ex);
    w.appendChild(box);
    show();
  });
  retry.onclick = function () { delete st.quiz[lesson.id]; delete st.done[lesson.id]; save(); renderList(); renderLesson(); };
  w.appendChild(retry);
  update();
  return w;
}

/* ---------------- lesson list ---------------- */
function current() {
  for (var i = 0; i < lessons.length; i++) if (lessons[i].id === st.lesson) return i;
  return 0;
}
function renderList() {
  var list = $("crLessons"); list.textContent = "";
  var cur = current(), done = 0;
  lessons.forEach(function (l, i) {
    var ok = perfect(l);
    if (ok) done++;
    var b = make("button", "crrow" + (i === cur ? " on" : "") + (ok ? " done" : ""));
    b.appendChild(make("span", "crn", String(i + 1)));
    b.appendChild(make("span", "crt", l.title));
    b.appendChild(make("span", "crck"));
    if (i === cur) b.setAttribute("aria-current", "true");
    b.onclick = function () { st.lesson = l.id; save(); renderList(); renderLesson(); $("crLesson").scrollIntoView({ block: "start" }); };
    list.appendChild(b);
  });
  $("crProgTxt").textContent = done + " of " + lessons.length + " lessons done";
  $("crBar").style.width = (done / lessons.length * 100) + "%";
  var word = secret();
  $("crDone").hidden = !word;
  $("crDone").textContent = word ? "Week " + week.n + " complete. Secret word: " + word : "";
}

/* ---------------- one lesson ---------------- */
function stopAll() { live.forEach(function (v) { v.stop(); }); live = []; }

function renderLesson() {
  stopAll();
  var i = current(), l = lessons[i], host = $("crLesson");
  host.textContent = "";

  var head = make("header", "crhead");
  head.appendChild(make("p", "crkicker", "Lesson " + (i + 1) + " of " + lessons.length + " · " + l.mins + " min"));
  head.appendChild(make("h2", null, l.title));
  head.appendChild(make("p", "cridea", l.idea));
  host.appendChild(head);

  l.visuals.forEach(function (v) {
    if (v.type === "play") host.appendChild(visPlay(v));
    else if (v.type === "spots") host.appendChild(visSpots());
    else if (v.type === "shell") host.appendChild(visShell(v));
    else if (v.type === "routine") host.appendChild(visRoutine(v));
    else if (v.type === "timer") host.appendChild(visTimer());
  });

  var know = make("section", "panel");
  know.appendChild(make("h3", null, "What you need to know"));
  var ul = make("ul", "crpoints");
  l.points.forEach(function (p) { var li = make("li"); li.appendChild(make("b", null, p[0])); li.appendChild(make("span", null, p[1])); ul.appendChild(li); });
  know.appendChild(ul);
  host.appendChild(know);

  if (l.why) {
    var why = make("section", "panel");
    why.appendChild(make("h3", null, "Why we play it"));
    var wl = make("ul", "crpoints");
    l.why.forEach(function (p) { var li = make("li"); li.appendChild(make("b", null, p[0])); li.appendChild(make("span", null, p[1])); wl.appendChild(li); });
    why.appendChild(wl);
    host.appendChild(why);
  }
  if (l.checks) {
    var ck = make("section", "panel");
    ck.appendChild(make("h3", null, "What Coach is watching for"));
    var cl = make("ul", "crchecks");
    l.checks.forEach(function (c) { cl.appendChild(make("li", null, c)); });
    ck.appendChild(cl);
    host.appendChild(ck);
  }

  var cues = make("section", "crcues");
  cues.appendChild(make("p", "crkicker", "What Coach will yell"));
  var cw = make("div", "crcuewords");
  l.cues.forEach(function (c) { cw.appendChild(make("span", null, c)); });
  cues.appendChild(cw);
  host.appendChild(cues);

  var fl = make("section", "panel");
  fl.appendChild(make("h3", null, "At practice this week"));
  fl.appendChild(make("p", "crfloor", l.floor));
  host.appendChild(fl);

  host.appendChild(quiz(l));
  var sw = secret();
  if (sw && !host.querySelector(".crsecret")) host.appendChild(reveal(sw));

  var nav = make("div", "crnav");
  if (i > 0) { var p = make("button", "btn", "← " + lessons[i - 1].title); p.onclick = function () { go(i - 1); }; nav.appendChild(p); }
  if (i < lessons.length - 1) { var n = make("button", "btn primary", lessons[i + 1].title + " →"); n.onclick = function () { go(i + 1); }; nav.appendChild(n); }
  host.appendChild(nav);
}
function go(i) { st.lesson = lessons[i].id; save(); renderList(); renderLesson(); window.scrollTo(0, 0); }

function init() {
  lessons.forEach(function (l) { if (!perfect(l)) delete st.done[l.id]; });
  $("crWeekTitle").textContent = "Week " + week.n + " · " + week.title;
  $("crGoal").textContent = week.goal;
  renderList();
  renderLesson();
}

return { init: init, encode: encode, stop: function () { live.forEach(function (v) { v.stop(); }); } };
})();
