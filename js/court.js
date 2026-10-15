/* The court: formations, replaying a play's steps, and drawing it into an SVG.
   Play Creator and the Play Library viewer each mount their own court, so this
   file holds no page state of its own. */
window.Court = (function () {
"use strict";
var NS = "http://www.w3.org/2000/svg";

var RIM = { x: 280, y: 93 };
var BOUNDS = { x0: 30, y0: 40, x1: 530, y1: 400 };

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
function stateAt(play, n) {
  var pos = {}, id;
  for (id in play.players) if (play.players.hasOwnProperty(id)) pos[id] = { x: play.players[id].x, y: play.players[id].y };
  var ball = play.ball, shot = false;
  for (var i = 0; i < n && i < play.steps.length; i++) {
    var acts = play.steps[i].actions;
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
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* ---------------- a mounted court ---------------- */
var uid = 0;
function marker(id, color, size) {
  return '<marker id="' + id + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="' + size +
    '" markerHeight="' + size + '" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' + color + '"/></marker>';
}

/* Marker ids are unique per court: two courts on one page sharing ids would
   make arrows vanish whenever the first court is hidden. */
function mount(host, label) {
  var id = "ct" + (++uid);
  host.innerHTML =
    '<svg class="court" viewBox="0 0 560 440" role="img" aria-label="' + (label || "Half court") + '">' +
      "<defs>" + marker(id + "-move", "var(--move)", 4.6) + marker(id + "-ball", "var(--ball)", 4.6) + marker(id + "-def", "var(--def)", 4.4) + "</defs>" +
      '<rect class="court-bg" x="30" y="40" width="500" height="360" rx="2"/>' +
      '<rect class="court-line" x="30" y="40" width="500" height="360"/>' +
      '<rect class="court-line" x="220" y="40" width="120" height="190"/>' +
      '<circle class="court-line" cx="280" cy="230" r="60"/>' +
      '<path class="court-line" d="M 89.7 40 A 197.5 197.5 0 1 0 470.3 40"/>' +
      '<line class="court-line" x1="250" y1="80" x2="310" y2="80"/>' +
      '<circle class="hoop" cx="280" cy="93" r="9"/>' +
      '<circle class="rimflash" cx="280" cy="93" r="26"/>' +
      '<g class="lg"></g><g class="lp"></g><g class="lt"></g>' +
      '<circle class="ball" cx="-99" cy="-99" r="8.5"/>' +
    "</svg>";
  var svg = host.firstChild;
  var LG = svg.querySelector(".lg"), LP = svg.querySelector(".lp"), LT = svg.querySelector(".lt");
  var ballTok = svg.querySelector(".ball");

  var v = {
    svg: svg,
    play: null,
    cur: 0,            /* 0 = Start, k = step k with its arrows */
    showAll: false,
    selected: null,
    speed: 1100,
    running: false,
    finished: false,
    onChange: function () {}
  };
  var anim = { raf: null, timer: null };

  function drawAction(layer, play, stepIdx, a, from, klass) {
    var g = el("g", {}), pad = 23, to = a.to;
    if (a.type === "pass" && !to) {
      var tp = stateAt(play, stepIdx + 1).pos[a.target] || from;
      to = { x: tp.x, y: tp.y };
    }
    if (a.type === "pass") {
      var p = trim(from, to, pad, pad);
      g.appendChild(el("path", { d: "M " + p[0].x + " " + p[0].y + " L " + p[1].x + " " + p[1].y, "class": "pth pass " + klass, "marker-end": "url(#" + id + "-ball)" }));
    } else if (a.type === "dribble") {
      var q = trim(from, to, pad, 4);
      g.appendChild(el("path", { d: wavy(q[0], q[1]), "class": "pth dribble " + klass, "marker-end": "url(#" + id + "-ball)" }));
    } else if (a.type === "shot") {
      var s = trim(from, RIM, pad, 14);
      g.appendChild(el("path", { d: "M " + s[0].x + " " + s[0].y + " L " + s[1].x + " " + s[1].y, "class": "pth shot " + klass, "marker-end": "url(#" + id + "-ball)" }));
    } else if (a.type === "screen") {
      var r = trim(from, to, pad, 0);
      g.appendChild(el("path", { d: "M " + r[0].x + " " + r[0].y + " L " + r[1].x + " " + r[1].y, "class": "pth screen " + klass }));
      var dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L * 12, ny = dx / L * 12;
      g.appendChild(el("line", { x1: to.x - nx, y1: to.y - ny, x2: to.x + nx, y2: to.y + ny, "class": "scrbar " + klass }));
    } else {
      var m = trim(from, to, pad, 4);
      var def = a.type === "dmove";
      g.appendChild(el("path", { d: "M " + m[0].x + " " + m[0].y + " L " + m[1].x + " " + m[1].y, "class": (def ? "pth dmove " : "pth move ") + klass, "marker-end": "url(#" + id + (def ? "-def)" : "-move)") }));
    }
    layer.appendChild(g);
  }

  function drawStepArrows(layer, idx, base, klass) {
    var acts = v.play.steps[idx].actions;
    for (var k = 0; k < acts.length; k++) {
      if (base[acts[k].player]) drawAction(layer, v.play, idx, acts[k], base[acts[k].player], klass);
    }
  }

  function drawTokens(pos) {
    LT.textContent = "";
    var order = ["d1", "d2", "d3", "d4", "d5", "o1", "o2", "o3", "o4", "o5"];
    for (var n = 0; n < order.length; n++) {
      var pid = order[n], p = v.play.players[pid];
      if (!p) continue;
      if (p.team === "d" && !v.play.defOn) continue;
      var at = pos[pid] || p;
      var g = el("g", { "class": "tok " + p.team + (v.selected === pid ? " sel" : ""), "data-id": pid, transform: "translate(" + at.x.toFixed(1) + "," + at.y.toFixed(1) + ")" });
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
  }

  function placeBall(xy) { ballTok.setAttribute("cx", xy.x); ballTok.setAttribute("cy", xy.y); }

  function draw() {
    LP.textContent = ""; LG.textContent = ""; LT.textContent = "";
    svg.classList.remove("scored");
    if (!v.play) { placeBall({ x: -99, y: -99 }); return; }
    var snap = stateAt(v.play, v.cur === 0 ? 0 : v.cur - 1);
    if (v.showAll) {
      for (var i = 0; i < v.play.steps.length; i++) {
        drawStepArrows(i === v.cur - 1 ? LP : LG, i, stateAt(v.play, i).pos, i === v.cur - 1 ? "" : "ghost");
      }
    } else if (v.cur > 0 && v.play.steps[v.cur - 1]) {
      drawStepArrows(LP, v.cur - 1, snap.pos, "");
    }
    drawTokens(snap.pos);
    placeBall(ballXY(snap.pos, snap.ball, snap.shot));
  }

  function stop() {
    if (anim.raf) cancelAnimationFrame(anim.raf);
    if (anim.timer) clearTimeout(anim.timer);
    anim.raf = null; anim.timer = null;
    if (v.running) { v.running = false; v.onChange(); }
  }

  function runStep(idx, done) {
    var play = v.play;
    var before = stateAt(play, idx), after = stateAt(play, idx + 1);
    v.cur = idx + 1;
    LP.textContent = ""; LG.textContent = "";
    drawStepArrows(LP, idx, before.pos, "");
    drawTokens(before.pos);
    svg.classList.remove("scored");
    v.onChange();

    var nodes = {};
    [].slice.call(LT.querySelectorAll(".tok")).forEach(function (n) { nodes[n.getAttribute("data-id")] = n; });
    var tweens = [];
    for (var pid in before.pos) {
      if (!before.pos.hasOwnProperty(pid) || !after.pos[pid]) continue;
      var a = before.pos[pid], b = after.pos[pid];
      if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) tweens.push({ id: pid, a: a, b: b });
    }
    var b0 = ballXY(before.pos, before.ball, before.shot), b1 = ballXY(after.pos, after.ball, after.shot);
    placeBall(b0);

    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / v.speed), e = ease(p);
      for (var i = 0; i < tweens.length; i++) {
        var tw = tweens[i], n = nodes[tw.id];
        if (n) n.setAttribute("transform", "translate(" + (tw.a.x + (tw.b.x - tw.a.x) * e).toFixed(1) + "," + (tw.a.y + (tw.b.y - tw.a.y) * e).toFixed(1) + ")");
      }
      placeBall({ x: (b0.x + (b1.x - b0.x) * e).toFixed(1), y: (b0.y + (b1.y - b0.y) * e).toFixed(1) });
      if (p < 1) { anim.raf = requestAnimationFrame(frame); return; }
      anim.raf = null;
      if (after.shot) svg.classList.add("scored");
      done(idx + 1 >= play.steps.length);
    }
    anim.raf = requestAnimationFrame(frame);
  }

  /* Run every step from the start. Returns false when there is nothing to run. */
  v.playAll = function () {
    if (!v.play || !v.play.steps.length) return false;
    stop();
    v.cur = 0; v.finished = false; draw();
    v.running = true; v.onChange();
    var i = 0;
    (function go() {
      if (!v.running) return;
      runStep(i, function (last) {
        if (!v.running) return;
        if (last) { v.running = false; v.finished = true; v.onChange(); return; }
        i++; anim.timer = setTimeout(go, 320);
      });
    })();
    return true;
  };

  /* Animate just the next step; from the last step, go back to Start. */
  v.stepForward = function () {
    if (!v.play) return;
    stop();
    if (v.cur >= v.play.steps.length) { v.cur = 0; v.finished = false; draw(); v.onChange(); return; }
    v.running = true; v.onChange();
    runStep(v.cur, function () { v.running = false; v.onChange(); });
  };

  v.show = function (play) { stop(); v.play = play; v.cur = 0; v.finished = false; v.selected = null; draw(); v.onChange(); };
  v.go = function (n) { stop(); v.cur = n; v.finished = false; draw(); v.onChange(); };
  v.draw = draw;
  v.stop = stop;

  /* Pointer position in court units, kept inside the lines. */
  v.point = function (evt) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var r = pt.matrixTransform(m.inverse());
    return { x: Math.max(BOUNDS.x0 + 6, Math.min(BOUNDS.x1 - 6, r.x)), y: Math.max(BOUNDS.y0 + 6, Math.min(BOUNDS.y1 - 6, r.y)) };
  };

  return v;
}

return {
  OFF: OFF, DEF: DEF,
  blankPlay: blankPlay, applyOff: applyOff, applyDef: applyDef,
  stateAt: stateAt, mount: mount
};
})();
