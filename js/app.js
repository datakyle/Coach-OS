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
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderTeam() {
    var box = document.getElementById("teamBody");
    box.textContent = "";

    if (!window.Cloud.ready()) {
      var d = el("div", "setup");
      d.innerHTML = "Not set up yet. Everything else works without it." +
        "<ol><li>Make a free Firebase project with Firestore and Email/Password sign-in.</li>" +
        "<li>Put its <code>projectId</code> and <code>apiKey</code> into <code>js/firebase-config.js</code>.</li>" +
        "<li>Create the team and coach accounts, publish <code>firestore.rules</code>.</li></ol>" +
        "<p class=\"note\">Full steps are in SETUP.md in the repo.</p>";
      box.appendChild(d);
      return;
    }

    if (!window.Cloud.role()) { renderSignIn(box); return; }

    var who = el("div", "codefield");
    var label = window.Cloud.isCoach() ? "Signed in with the coach code" : "Signed in with the team code";
    who.appendChild(el("span", "who grow", label));
    var ref = el("button", "btn sm", "Refresh"); ref.onclick = loadTeam;
    var out = el("button", "btn sm", "Sign out");
    out.onclick = function () {
      window.Cloud.signOut(); teamPlays = [];
      renderTeam(); refreshLib(); toast("Signed out on this device.");
    };
    who.appendChild(ref); who.appendChild(out);
    box.appendChild(who);

    var listBox = el("div"); listBox.id = "teamList";
    box.appendChild(listBox);
    renderTeamList();
  }

  function renderSignIn(box) {
    var form = el("form", "codefield");
    var f = el("div", "field");
    var lab = el("label", null, "Team code"); lab.setAttribute("for", "teamCode");
    var inp = el("input");
    inp.type = "password"; inp.id = "teamCode"; inp.autocomplete = "current-password";
    inp.placeholder = "from your coach"; inp.spellcheck = false;
    f.appendChild(lab); f.appendChild(inp);
    var go = el("button", "btn primary sm", "Sign in"); go.type = "submit";
    form.appendChild(f); form.appendChild(go);
    form.onsubmit = function (ev) {
      ev.preventDefault();
      go.disabled = true;
      window.Cloud.signIn(inp.value).then(function (r) {
        toast(r === "coach" ? "Signed in. You can upload plays." : "Signed in. Here are the team plays.");
        renderTeam(); refreshLib(); loadTeam();
      }, function (err) {
        go.disabled = false;
        toast(err.message);
      });
    };
    box.appendChild(form);
    box.appendChild(el("p", "note", "Players use the team code to see the playbook. Coaches use the coach code to upload."));
  }

  function renderTeamList() {
    var box = document.getElementById("teamList");
    if (!box) return;
    box.textContent = "";
    if (!teamPlays.length) {
      box.appendChild(el("p", "empty", window.Cloud.isCoach()
        ? "Nothing shared yet. Upload one of yours from the list on the left."
        : "Nothing shared yet."));
      return;
    }
    teamPlays.forEach(function (t) {
      var row = el("div", "teamrow");
      row.appendChild(el("span", "tn", t.name));

      var view = el("button", "btn sm", "View");
      view.onclick = function () {
        window.Clipboard.open(t.play);
        show("clip");
        toast("Showing " + t.play.name + ". Hit Play to run it.");
      };
      row.appendChild(view);

      var pull = el("button", "btn sm", "Pull");
      pull.onclick = function () {
        var lib = window.Clipboard.getLib().slice(), at = -1;
        for (var i = 0; i < lib.length; i++) if (lib[i].name === t.play.name) at = i;
        if (at >= 0) lib[at] = t.play; else lib.push(t.play);
        window.Store.savePlays(lib);
        window.Clipboard.setLib(lib);
        toast("Pulled " + t.play.name + " into your library.");
      };
      row.appendChild(pull);

      if (window.Cloud.isCoach()) {
        var del = el("button", "btn sm danger");
        del.innerHTML = "&times;";
        del.setAttribute("aria-label", "Remove " + t.name + " from the team library");
        del.onclick = function () {
          if (!confirm("Remove " + t.name + " from the team library? Players will stop seeing it.")) return;
          window.Cloud.remove(t.id).then(function () { toast("Removed " + t.name + "."); loadTeam(); },
            function (err) { toast(err.message); });
        };
        row.appendChild(del);
      }
      box.appendChild(row);
    });
  }

  function loadTeam() {
    if (!window.Cloud.ready() || !window.Cloud.role()) return;
    window.Cloud.list().then(function (rows) {
      teamPlays = rows;
      renderTeamList();
    }, function (err) {
      toast(err.message);
      if (!window.Cloud.role()) { renderTeam(); refreshLib(); }
    });
  }

  /* Upload buttons depend on who is signed in, so redraw the library rows. */
  function refreshLib() { window.Clipboard.setLib(window.Clipboard.getLib()); }

  function decorateLibRow(row, play) {
    if (!window.Cloud.ready() || !window.Cloud.isCoach()) return;
    var up = el("button", "btn sm up", "Upload");
    up.onclick = function () {
      up.disabled = true;
      window.Cloud.upload(play).then(function () {
        up.disabled = false;
        toast("Shared " + play.name + " with the team.");
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
    loadTeam();

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
