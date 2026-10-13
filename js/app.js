/* Tabs, shared toast, and boot. Local records load first so the app is usable
   offline; anything in data/*.json is merged in once it arrives. */
window.CC = (function () {
  "use strict";

  var toastT = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, 1900);
  }

  var teamPlays = [];

  var PANEL = { plan: "tab-plan", clip: "tab-clip", lib: "tab-lib" };

  function show(name) {
    if (!PANEL[name]) name = "plan";
    for (var k in PANEL) {
      if (!PANEL.hasOwnProperty(k)) continue;
      document.getElementById(PANEL[k]).hidden = (k !== name);
      var tb = document.getElementById("tb-" + k);
      tb.classList.toggle("on", k === name);
      tb.setAttribute("aria-selected", k === name ? "true" : "false");
    }
    try { localStorage.setItem("cc.tab", name); } catch (e) {}
    if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
  }

  function wireTabs() {
    [].slice.call(document.querySelectorAll(".tab")).forEach(function (b) {
      b.onclick = function () { show(b.getAttribute("data-tab")); };
    });
    var start = location.hash.slice(1);
    if (!PANEL[start]) { try { start = localStorage.getItem("cc.tab") || "plan"; } catch (e) { start = "plan"; } }
    show(start);
  }


  /* ---------- team library ---------- */
  function renderTeam() {
    var box = document.getElementById("teamBody");
    box.textContent = "";

    if (!window.Cloud.ready()) {
      var d = document.createElement("div");
      d.className = "setup";
      d.innerHTML = "Not set up yet. Everything else works without it." +
        "<ol><li>Make a free Firebase project and a Firestore database.</li>" +
        "<li>Put its <code>projectId</code> and <code>apiKey</code> into <code>js/firebase-config.js</code>.</li>" +
        "<li>Pick a team code, store its hash, publish <code>firestore.rules</code>.</li></ol>" +
        "<p class=\"note\">Full steps are in SETUP.md in the repo.</p>";
      box.appendChild(d);
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "codefield";
    var f = document.createElement("div"); f.className = "field";
    var lab = document.createElement("label"); lab.setAttribute("for", "teamCode"); lab.textContent = "Team code";
    var inp = document.createElement("input");
    inp.type = "text"; inp.id = "teamCode"; inp.value = window.Cloud.getCode();
    inp.placeholder = "needed to upload"; inp.spellcheck = false;
    inp.onchange = function () { window.Cloud.setCode(inp.value.trim()); toast("Code saved on this device."); };
    f.appendChild(lab); f.appendChild(inp);
    var ref = document.createElement("button");
    ref.className = "btn sm"; ref.textContent = "Refresh";
    ref.onclick = loadTeam;
    wrap.appendChild(f); wrap.appendChild(ref);
    box.appendChild(wrap);

    var listBox = document.createElement("div");
    listBox.id = "teamList";
    box.appendChild(listBox);
    renderTeamList();
  }

  function renderTeamList() {
    var box = document.getElementById("teamList");
    if (!box) return;
    box.textContent = "";
    if (!teamPlays.length) {
      var e = document.createElement("p"); e.className = "empty";
      e.textContent = "Nothing shared yet. Upload one of yours from the list on the left.";
      box.appendChild(e); return;
    }
    teamPlays.forEach(function (t) {
      var row = document.createElement("div"); row.className = "teamrow";
      var n = document.createElement("span"); n.className = "tn"; n.textContent = t.name;
      var by = document.createElement("span"); by.className = "tby"; by.textContent = t.by || "";
      var pull = document.createElement("button");
      pull.className = "btn sm"; pull.textContent = "Pull";
      pull.onclick = function () {
        var lib = window.Clipboard.getLib().slice(), at = -1;
        for (var i = 0; i < lib.length; i++) if (lib[i].name === t.play.name) at = i;
        if (at >= 0) lib[at] = t.play; else lib.push(t.play);
        window.Store.savePlays(lib);
        window.Clipboard.setLib(lib);
        toast("Pulled " + t.play.name + " into your library.");
      };
      row.appendChild(n); row.appendChild(by); row.appendChild(pull);
      box.appendChild(row);
    });
  }

  function loadTeam() {
    if (!window.Cloud.ready()) return;
    window.Cloud.list().then(function (rows) {
      teamPlays = rows;
      renderTeamList();
      toast(rows.length ? rows.length + " shared plays." : "Nothing shared yet.");
    });
  }

  function decorateLibRow(row, play) {
    if (!window.Cloud.ready()) return;
    var up = document.createElement("button");
    up.className = "btn sm up"; up.textContent = "Upload";
    up.onclick = function () {
      up.disabled = true;
      window.Cloud.upload(play, "").then(function () {
        up.disabled = false;
        toast("Shared " + play.name + ".");
        loadTeam();
      }, function (err) {
        up.disabled = false;
        toast(err.message || "Upload failed.");
      });
    };
    row.appendChild(up);
  }

  function boot() {
    wireTabs();

    var plays = window.Store.loadPlays();
    var plans = window.Store.loadPlans();
    var firstRun = !plays;

    window.Clipboard.init(plays || window.Clipboard.seed());
    if (firstRun) window.Store.savePlays(window.Clipboard.getLib());
    window.Practice.init(plans || []);

    /* Practices and plays pushed to the repo show up here without overwriting
       anything saved on this device. */
    window.Store.fetchJSON("data/plans.json").then(function (remote) {
      if (!remote || !remote.length) return;
      var merged = window.Store.merge(window.Store.loadPlans() || [], remote, "id");
      window.Store.savePlans(merged);
      window.Practice.init(merged);
    });
    renderTeam();
    if (window.Cloud.ready()) loadTeam();

    window.Store.fetchJSON("data/plays.json").then(function (remote) {
      if (!remote || !remote.length) return;
      var merged = window.Store.merge(window.Store.loadPlays() || [], remote, "name");
      window.Store.savePlays(merged);
      window.Clipboard.setLib(merged);
    });
  }

  var api = { toast: toast, show: show, onPlaysChanged: function () {}, decorateLibRow: decorateLibRow };
  window.CC = api;   /* available before boot, so modules can call it */

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return api;
})();
