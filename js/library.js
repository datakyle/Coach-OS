/* Play Library: every play in one list. Pick one and it runs in the viewer.
   Edit sends it to Play Creator. Plays live in this browser, and once signed
   in they sync to the account so every device has the same list (js/sync.js). */
window.Library = (function () {
"use strict";

var $ = function (id) { return document.getElementById(id); };
var view = Court.mount($("viewCourt"), "Selected play");
var sel = null;          /* { name } */

function toast(m) { window.CC.toast(m); }
function make(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function steps(play) { var n = play.steps.length; return n + (n === 1 ? " step" : " steps"); }

/* ---------------- list ---------------- */
function row(play) {
  var on = sel && sel.name === play.name;
  var b = make("button", "playrow" + (on ? " on" : ""));
  b.appendChild(make("span", "pn", play.name));
  b.appendChild(make("span", "ps", steps(play)));
  b.onclick = function () { select({ name: play.name }); };
  return b;
}

function renderList() {
  var mine = $("libMine");
  mine.textContent = "";
  var lib = Store.plays.list();
  if (!lib.length) mine.appendChild(make("p", "empty", "Nothing saved yet. Build one in Play Creator."));
  lib.forEach(function (p) { mine.appendChild(row(p)); });
  renderSync();
}

function renderSync() {
  var cloud = window.Cloud, line = $("libSync");
  $("libTitle").textContent = Sync.signedIn() ? "Plays" : "My plays";
  line.textContent = "";
  if (!cloud.ready()) return;
  if (!Sync.signedIn()) {
    line.appendChild(document.createTextNode("Saved on this device only. "));
    var a = make("button", "linkbtn", "Sign in");
    a.onclick = function () { window.CC.signIn(); };
    line.appendChild(a);
    line.appendChild(document.createTextNode(" to sync plays across your devices."));
    return;
  }
  line.textContent = Sync.describe(playSync);
}

/* ---------------- viewer ---------------- */
function current() { return sel ? Store.plays.find(sel.name) : null; }

function select(s) {
  sel = s;
  var play = current();
  if (!play) { sel = null; }
  $("viewEmpty").hidden = !!sel;
  $("viewBody").hidden = !sel;
  document.querySelector(".libwrap").classList.toggle("viewing", !!sel);
  if (!sel) { setFull(false); view.show(null); renderList(); return; }

  $("viewName").textContent = play.name;
  $("viewSrc").textContent = Sync.signedIn() ? "Synced" : "This device";
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
  var box = $("viewAct");
  box.textContent = "";
  var btn = function (label, cls, fn) { var b = make("button", "btn " + (cls || ""), label); b.onclick = fn; box.appendChild(b); return b; };

  btn("Edit", "primary", function () {
    view.stop();
    window.Creator.open(play);
    window.CC.go("create");
  });

  btn("Delete", "danger", function () {
    var where = Sync.signedIn() ? "all your devices" : "this device";
    if (!confirm("Delete " + play.name + " from " + where + "?")) return;
    Store.plays.remove(play.name);
    select(null);
    toast("Deleted " + play.name + ".");
  });
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

/* ---------------- sync ---------------- */
var playSync = Sync.engine({
  coll: "plays",
  key: function (p) { return window.Cloud.slug(p.name); },
  name: function (p) { return p.name; },
  read: function () { return Store.plays.list(); },
  write: function (arr) { Store.plays.load(arr); }
});
Store.plays.subscribe(function () { if (!playSync.writing) Sync.soon(); });
Store.plays.onRemove(function (name) { playSync.noteDelete(window.Cloud.slug(name)); });
Sync.onChange(renderSync);

/* Redraw after anything changes. The selected play stays selected if it still
   exists; its action buttons follow who is signed in. */
function refresh() {
  if (sel && !current()) { select(null); return; }
  if (sel && !view.running) { select(sel); return; }
  renderList();
}

Store.plays.subscribe(refresh);

return { init: function () { renderList(); }, refresh: refresh, stop: function () { view.stop(); setFull(false); } };
})();
