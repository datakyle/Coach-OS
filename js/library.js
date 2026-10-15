/* Play Library: every play in one list. Pick one and it runs in the viewer.
   Edit sends it to Play Creator. Team plays come from Firebase once someone
   signs in with a code; My plays live in this browser. */
window.Library = (function () {
"use strict";

var $ = function (id) { return document.getElementById(id); };
var view = Court.mount($("viewCourt"), "Selected play");
var teamPlays = [];
var teamError = "";
var sel = null;          /* { src: "mine" | "team", name, id } */

function toast(m) { window.CC.toast(m); }
function make(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function steps(play) { var n = play.steps.length; return n + (n === 1 ? " step" : " steps"); }

/* ---------------- list ---------------- */
function row(play, src, id) {
  var on = sel && sel.src === src && sel.name === play.name;
  var b = make("button", "playrow" + (on ? " on" : ""));
  b.appendChild(make("span", "pn", play.name));
  b.appendChild(make("span", "ps", steps(play)));
  b.onclick = function () { select({ src: src, name: play.name, id: id }); };
  return b;
}

function renderList() {
  var mine = $("libMine"), team = $("libTeam");
  mine.textContent = ""; team.textContent = "";

  var lib = Store.plays.list();
  if (!lib.length) mine.appendChild(make("p", "empty", "Nothing saved yet. Build one in Play Creator."));
  lib.forEach(function (p) { mine.appendChild(row(p, "mine")); });

  var cloud = window.Cloud;
  if (!cloud.ready()) { $("teamSection").hidden = true; return; }
  $("teamSection").hidden = false;
  if (!cloud.role()) {
    var p = make("p", "empty", "Sign in to see the team's plays. ");
    var a = make("button", "linkbtn", "Sign in");
    a.onclick = function () { window.CC.signIn(); };
    p.appendChild(a);
    team.appendChild(p);
    return;
  }
  if (teamError) { team.appendChild(make("p", "empty", teamError)); return; }
  if (!teamPlays.length) {
    team.appendChild(make("p", "empty", cloud.isCoach()
      ? "Nothing shared yet. Pick one of your plays and hit Share with team."
      : "Nothing shared yet."));
  }
  teamPlays.forEach(function (t) { team.appendChild(row(t.data, "team", t.id)); });
}

/* ---------------- viewer ---------------- */
function current() {
  if (!sel) return null;
  if (sel.src === "mine") return Store.plays.find(sel.name);
  for (var i = 0; i < teamPlays.length; i++) if (teamPlays[i].id === sel.id) return teamPlays[i].data;
  return null;
}

function select(s) {
  sel = s;
  var play = current();
  if (!play) { sel = null; }
  $("viewEmpty").hidden = !!sel;
  $("viewBody").hidden = !sel;
  document.querySelector(".libwrap").classList.toggle("viewing", !!sel);
  if (!sel) { setFull(false); view.show(null); renderList(); return; }

  $("viewName").textContent = play.name;
  $("viewSrc").textContent = sel.src === "team" ? "Team play" : "My play";
  view.showAll = $("vAll").checked;
  view.show(JSON.parse(JSON.stringify(play)));
  renderActions(play);
  renderList();
}

function renderCtl() {
  var n = view.play ? view.play.steps.length : 0;
  $("vPlay").textContent = view.running ? "Stop" : (view.finished ? "Replay" : "Play");
  $("vStepLbl").textContent = view.cur === 0 ? "Start \u00b7 " + n + (n === 1 ? " step" : " steps") : "Step " + view.cur + " of " + n;
}
view.onChange = renderCtl;

function renderActions(play) {
  var box = $("viewAct"), coach = window.Cloud.isCoach();
  box.textContent = "";
  var btn = function (label, cls, fn) { var b = make("button", "btn " + (cls || ""), label); b.onclick = fn; box.appendChild(b); return b; };

  btn("Edit", "primary", function () {
    view.stop();
    window.Creator.open(play);
    window.CC.go("create");
  });

  if (sel.src === "mine") {
    if (coach) btn("Share with team", "", function () {
      this.disabled = true;
      var b = this;
      window.Cloud.plays.upload(play).then(function () {
        toast("Shared " + play.name + " with the team."); loadTeam();
      }, function (err) { toast(err.message); }).then(function () { b.disabled = false; });
    });
    btn("Delete", "danger", function () {
      if (!confirm("Delete " + play.name + " from this device?")) return;
      Store.plays.remove(play.name);
      select(null);
      toast("Deleted " + play.name + ".");
    });
  } else {
    btn("Save to my plays", "", function () {
      var had = !!Store.plays.find(play.name);
      if (had && !confirm("You already have a play called " + play.name + ". Replace it with the team's version?")) return;
      Store.plays.put(play);
      toast("Saved " + play.name + " to My plays.");
    });
    if (coach) btn("Remove from team", "danger", function () {
      if (!confirm("Remove " + play.name + " from the team library? Players will stop seeing it.")) return;
      window.Cloud.plays.remove(sel.id).then(function () {
        toast("Removed " + play.name + " from the team."); select(null); loadTeam();
      }, function (err) { toast(err.message); });
    });
  }
}

$("vPlay").onclick = function () {
  if (view.running) { view.stop(); view.draw(); renderCtl(); return; }
  if (!view.playAll()) toast("This play has no steps yet.");
};
$("vStep").onclick = function () { view.stepForward(); };
$("vReset").onclick = function () { view.go(0); };
$("vAll").onchange = function () { view.showAll = this.checked; view.draw(); };
[].slice.call(document.querySelectorAll("#vSpeed [data-speed]")).forEach(function (b, _, all) {
  b.onclick = function () {
    view.speed = parseInt(b.getAttribute("data-speed"), 10);
    all.forEach(function (o) { o.classList.toggle("on", o === b); });
  };
});
$("viewBack").onclick = function () { view.stop(); setFull(false); select(null); };

/* ---------------- full screen ----------------
   Real full screen where the browser allows it. iPhone Safari only allows
   that for video, so there the viewer just covers the whole page. Either way
   the .fs class does the layout. */
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function setFull(on) {
  var v = $("viewer");
  if (on === v.classList.contains("fs")) return;
  v.classList.toggle("fs", on);
  document.documentElement.classList.toggle("noscroll", on);
  $("vFull").setAttribute("aria-pressed", on ? "true" : "false");
  $("vFullLbl").textContent = on ? "Exit" : "Full screen";
  if (on) {
    var req = v.requestFullscreen || v.webkitRequestFullscreen;
    if (req) { try { var r = req.call(v); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
  } else if (fsElement()) {
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    try { var x = exit.call(document); if (x && x.catch) x.catch(function () {}); } catch (e) {}
  }
}
$("vFull").onclick = function () { setFull(!$("viewer").classList.contains("fs")); };
function fsChanged() { if (!fsElement()) setFull(false); }
document.addEventListener("fullscreenchange", fsChanged);
document.addEventListener("webkitfullscreenchange", fsChanged);
document.addEventListener("keydown", function (e) { if (e.key === "Escape") setFull(false); });
$("btnLibNew").onclick = function () {
  window.Creator.open(Court.blankPlay("New play"));
  window.CC.go("create");
};

/* ---------------- backup ---------------- */
$("btnExport").onclick = function () {
  var ta = $("io");
  ta.value = JSON.stringify(Store.plays.list());
  ta.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ta.value).then(function () { toast("Copied. Paste it somewhere safe."); },
      function () { toast("Select the text and copy it."); });
  } else toast("Select the text and copy it.");
};
$("btnImport").onclick = function () {
  try {
    var arr = JSON.parse($("io").value);
    if (!Array.isArray(arr)) throw new Error("not a list");
    Store.plays.replaceAll(arr);
    toast("Loaded " + arr.length + " plays.");
  } catch (e) { toast("That text is not a play library."); }
};

/* ---------------- team ---------------- */
function loadTeam() {
  var cloud = window.Cloud;
  if (!cloud.ready() || !cloud.role()) { teamPlays = []; teamError = ""; refresh(); return; }
  cloud.plays.list().then(function (rows) {
    teamPlays = rows; teamError = ""; refresh();
  }, function (err) {
    teamPlays = []; teamError = err.message; refresh();
  });
}

/* Redraw after anything changes. The selected play stays selected if it still
   exists; its action buttons follow who is signed in. */
function refresh() {
  if (sel && !current()) { select(null); return; }
  if (sel && !view.running) { select(sel); return; }
  renderList();
}

Store.plays.subscribe(refresh);

return { init: function () { renderList(); }, loadTeam: loadTeam, refresh: refresh, stop: function () { view.stop(); setFull(false); } };
})();
