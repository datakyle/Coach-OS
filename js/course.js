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

/* ---------------- visual: shell lab (pack line) ---------------- */
var CORNER_L = { x: 56, y: 66 }, CORNER_R = { x: 504, y: 66 };
var SHELL = { 1: { x: 98, y: 241 }, 2: { x: 190, y: 343 }, 3: { x: 370, y: 343 }, 4: { x: 462, y: 241 } };
var ROLE_TXT = {
  BALL: "Your man has the ball. Arm's length off, shaded to his baseline side. Never give up baseline; force him middle into the pack.",
  GAP: "One pass away. On the line between your man and the ball, inside the pack line. Don't deny.",
  HELP: "Two passes away. Feet in the lane, one hand on the ball, one on your man."
};
function shellSpots(ball) {
  var bp = SHELL[ball], out = {};
  for (var k = 1; k <= 4; k++) {
    var P = SHELL[k], d = Math.abs(k - ball), pos, role;
    if (d === 0) { pos = lerp(lerp(P, RIM, 0.12), P.x < 280 ? CORNER_L : CORNER_R, 0.12); role = "BALL"; }
    else if (d === 1) { pos = lerp(lerp(P, bp, 0.3), RIM, 0.36); role = "GAP"; }
    else { pos = lerp(lerp(P, bp, 0.35), RIM, 0.6); role = "HELP"; }
    out[k] = { x: Math.round(pos.x), y: Math.round(pos.y), role: role };
  }
  return out;
}
function visShell() {
  var b = courtBlock("Shell lab");
  var seg = make("div", "seg sm"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Mode");
  var bWatch = make("button", "on", "Watch"), bTurn = make("button", null, "Your turn");
  seg.appendChild(bWatch); seg.appendChild(bTurn); b.head.appendChild(seg);
  var view = Court.mount(b.card, "Shell drill: pack line positions");
  live.push(view);
  view.speed = 900;
  var svg = view.svg;
  var pack = svgEl("g", { "class": "crpack" });
  pack.appendChild(svgEl("path", { d: "M 129 40 A 160 160 0 1 0 431 40" }));
  var pt = svgEl("text", { x: 40, y: 178 }); pt.textContent = "PACK LINE";
  pack.appendChild(pt);
  svg.insertBefore(pack, svg.querySelector(".lg"));
  var marks = svgEl("g", { "class": "crmarks" });
  svg.appendChild(marks);

  var panel = make("div", "crpanel"); panel.setAttribute("aria-live", "polite");
  b.wrap.appendChild(panel);
  var key = make("div", "crroles");
  ["BALL", "GAP", "HELP"].forEach(function (r) {
    var d = make("div", "crrole"); d.setAttribute("data-r", r);
    d.appendChild(make("b", null, r)); d.appendChild(make("span", null, ROLE_TXT[r]));
    key.appendChild(d);
  });
  b.wrap.appendChild(key);

  var ball = 4, pos = shellSpots(4), mode = "watch", me = 0, newBall = 0, waiting = false, streak = 0;
  function labels(spots, youIdx) {
    var pl = {};
    for (var k = 1; k <= 4; k++) {
      pl["o" + k] = { id: "o" + k, team: "o", label: String(k), x: SHELL[k].x, y: SHELL[k].y };
      pl["d" + k] = { id: "d" + k, team: "d", label: k === youIdx ? "YOU" : spots[k].role, x: pos[k].x, y: pos[k].y };
    }
    return pl;
  }
  function render(youIdx) {
    view.show({ name: "Shell", players: labels(pos, youIdx), ball: "o" + ball, defOn: true, steps: [] });
    if (youIdx) { view.selected = "d" + youIdx; view.draw(); }
  }
  function move(newB, moves, youIdx, after) {
    var spots = shellSpots(newB), acts = [];
    if (newB !== ball) acts.push({ type: "pass", player: "o" + ball, target: "o" + newB });
    moves.forEach(function (k) { acts.push({ type: "dmove", player: "d" + k, to: { x: spots[k].x, y: spots[k].y } }); });
    var roleSrc = {};
    for (var k = 1; k <= 4; k++) roleSrc[k] = { role: moves.indexOf(k) >= 0 || !youIdx ? spots[k].role : "" };
    var play = { name: "Shell", players: labels(roleSrc, youIdx), ball: "o" + ball, defOn: true, steps: [{ actions: acts }] };
    view.show(play);
    if (youIdx) view.selected = "d" + youIdx;
    view.onChange = function () {
      if (view.running) return;
      view.onChange = function () {};
      moves.forEach(function (k) { pos[k] = spots[k]; });
      ball = newB;
      if (after) after();
    };
    view.stepForward();
  }
  function hilite(r) {
    [].slice.call(key.querySelectorAll(".crrole")).forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-r") === r); });
  }
  function watchPrompt() {
    panel.textContent = "";
    panel.appendChild(make("p", null, "Tap a numbered player to pass him the ball. Watch every defender move while the ball is in the air, and read the job under each one."));
  }
  function turn() {
    marks.textContent = "";
    do { newBall = 1 + Math.floor(Math.random() * 4); } while (newBall === ball);
    me = 1 + Math.floor(Math.random() * 4);
    hilite(null);
    var others = [1, 2, 3, 4].filter(function (k) { return k !== me; });
    panel.textContent = "";
    panel.appendChild(make("p", "crkicker", "Watch the pass"));
    move(newBall, others, me, function () {
      waiting = true;
      render(me);
      panel.textContent = "";
      panel.appendChild(make("p", "crkicker", "Your turn"));
      panel.appendChild(make("p", "crbig", "Ball is with " + newBall + ". You're guarding " + me + "."));
      panel.appendChild(make("p", "crscore", "You're the orange X. Tap where you should be standing. Streak " + streak));
    });
  }
  function setMode(m) {
    mode = m; waiting = false; marks.textContent = "";
    bWatch.classList.toggle("on", m === "watch"); bTurn.classList.toggle("on", m === "turn");
    if (m === "watch") { pos = shellSpots(ball); render(0); watchPrompt(); hilite(null); }
    else { streak = 0; pos = shellSpots(ball); render(0); turn(); }
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
      move(k, [1, 2, 3, 4], 0, function () { render(0); });
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

/* ---------------- quiz ---------------- */
function quiz(lesson) {
  var w = make("section", "panel crquiz");
  var h = make("h3", null, "Check yourself"); w.appendChild(h);
  var score = make("p", "crscore"); w.appendChild(score);
  var ans = st.quiz[lesson.id] || {};
  function update() {
    var n = Object.keys(ans).length, right = 0;
    Object.keys(ans).forEach(function (i) { if (ans[i] === lesson.quiz[i].a) right++; });
    score.textContent = n ? right + " of " + lesson.quiz.length + " right" : lesson.quiz.length + " questions";
    if (n === lesson.quiz.length && !st.done[lesson.id]) { st.done[lesson.id] = true; save(); renderList(); window.CC.toast("Lesson complete."); }
  }
  lesson.quiz.forEach(function (q, qi) {
    var box = make("div", "crq");
    box.appendChild(make("p", "crqt", (qi + 1) + ". " + q.q));
    var opts = make("div", "cropts"), ex = make("p", "crex"); ex.hidden = true;
    q.o.forEach(function (o, oi) {
      var b = make("button", "cropt", o);
      b.onclick = function () {
        if (ans[qi] != null) return;
        ans[qi] = oi; st.quiz[lesson.id] = ans; save(); show(); update();
      };
      opts.appendChild(b);
    });
    function show() {
      var picked = ans[qi];
      if (picked == null) return;
      [].slice.call(opts.children).forEach(function (b, i) {
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
  var retry = make("button", "btn sm", "Retake quiz");
  retry.onclick = function () { delete st.quiz[lesson.id]; save(); renderLesson(); };
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
    if (st.done[l.id]) done++;
    var b = make("button", "crrow" + (i === cur ? " on" : "") + (st.done[l.id] ? " done" : ""));
    b.appendChild(make("span", "crn", String(i + 1)));
    b.appendChild(make("span", "crt", l.title));
    b.appendChild(make("span", "crck"));
    if (i === cur) b.setAttribute("aria-current", "true");
    b.onclick = function () { st.lesson = l.id; save(); renderList(); renderLesson(); $("crLesson").scrollIntoView({ block: "start" }); };
    list.appendChild(b);
  });
  $("crProgTxt").textContent = done + " of " + lessons.length + " lessons done";
  $("crBar").style.width = (done / lessons.length * 100) + "%";
  $("crDone").hidden = done < lessons.length;
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
    else if (v.type === "shell") host.appendChild(visShell());
    else if (v.type === "routine") host.appendChild(visRoutine(v));
    else if (v.type === "timer") host.appendChild(visTimer());
  });

  var know = make("section", "panel");
  know.appendChild(make("h3", null, "What you need to know"));
  var ul = make("ul", "crpoints");
  l.points.forEach(function (p) { var li = make("li"); li.appendChild(make("b", null, p[0])); li.appendChild(make("span", null, p[1])); ul.appendChild(li); });
  know.appendChild(ul);
  host.appendChild(know);

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

  var nav = make("div", "crnav");
  if (i > 0) { var p = make("button", "btn", "← " + lessons[i - 1].title); p.onclick = function () { go(i - 1); }; nav.appendChild(p); }
  if (i < lessons.length - 1) { var n = make("button", "btn primary", lessons[i + 1].title + " →"); n.onclick = function () { go(i + 1); }; nav.appendChild(n); }
  host.appendChild(nav);
}
function go(i) { st.lesson = lessons[i].id; save(); renderList(); renderLesson(); window.scrollTo(0, 0); }

function init() {
  $("crWeekTitle").textContent = "Week " + week.n + " · " + week.title;
  $("crGoal").textContent = week.goal;
  renderList();
  renderLesson();
}

return { init: init, stop: function () { live.forEach(function (v) { v.stop(); }); } };
})();
