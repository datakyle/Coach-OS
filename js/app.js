/* Sidebar navigation, team sign-in, the shared toast, and boot. Local records
   load first so the app works offline; data/*.json and the team library are
   merged in once they arrive. */
window.CC = (function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var toastT = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg; t.classList.add("show");
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- pages ---------- */
  var PAGES = ["plan", "create", "library"];
  var OLD = { clip: "create", lib: "library" };   /* links from before the redesign */

  function go(name) {
    name = OLD[name] || name;
    if (PAGES.indexOf(name) < 0) name = "plan";
    PAGES.forEach(function (p) { $("page-" + p).hidden = p !== name; });
    [].slice.call(document.querySelectorAll(".sidenav .nav[data-page]")).forEach(function (b) {
      var on = b.getAttribute("data-page") === name;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (name !== "create") window.Creator.stop();
    if (name !== "library") window.Library.stop();
    try { localStorage.setItem("cc.tab", name); } catch (e) {}
    if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
    window.scrollTo(0, 0);
  }

  function wireNav() {
    [].slice.call(document.querySelectorAll(".sidenav .nav[data-page]")).forEach(function (b) {
      b.onclick = function () { go(b.getAttribute("data-page")); };
    });
    document.querySelector(".sidenav .brand").onclick = function (e) { e.preventDefault(); go("plan"); };
    window.addEventListener("hashchange", function () { go(location.hash.slice(1)); });
    var start = location.hash.slice(1);
    if (PAGES.indexOf(OLD[start] || start) < 0) { try { start = localStorage.getItem("cc.tab") || "plan"; } catch (e) { start = "plan"; } }
    go(start);
  }

  /* ---------- team sign-in (sidebar footer) ---------- */
  function renderTeamNav() {
    var cloud = window.Cloud, b = $("teamNav"), lbl = $("teamLbl");
    b.hidden = !cloud.ready();
    b.classList.toggle("signed", !!cloud.role());
    lbl.textContent = cloud.role() ? "Signed in · sign out" : "Sign in";
    b.title = cloud.role() ? "Signed in on this device" : "Sign in with the Coach OS password";
  }

  function signIn() {
    var d = $("signin");
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    setTimeout(function () { $("teamCode").focus(); }, 30);
  }
  function closeSignIn() { var d = $("signin"); if (d.close) d.close(); else d.removeAttribute("open"); }

  function teamChanged() {
    renderTeamNav();
    window.Library.loadTeam();
    window.Practice.loadTeam();
  }

  function wireTeam() {
    $("teamNav").onclick = function () {
      var cloud = window.Cloud;
      if (!cloud.role()) { signIn(); return; }
      if (!confirm("Sign out of the team on this device?")) return;
      cloud.signOut();
      teamChanged();
      toast("Signed out on this device.");
    };
    $("signinCancel").onclick = function (e) { e.preventDefault(); closeSignIn(); };
    $("signinForm").onsubmit = function (e) {
      e.preventDefault();
      var go = $("signinGo");
      go.disabled = true;
      window.Cloud.signIn($("teamCode").value).then(function (role) {
        closeSignIn();
        toast("Signed in. Team plays and practices are open.");
        teamChanged();
      }, function (err) { toast(err.message); })
        .then(function () { go.disabled = false; });
    };
  }

  /* ---------- boot ---------- */
  function boot() {
    Store.plays.init(window.Creator.seed());
    window.Creator.init();
    window.Library.init();
    window.Practice.init(Store.loadPlans() || []);
    wireNav();
    wireTeam();
    teamChanged();

    /* Practices and plays pushed to the repo show up here without overwriting
       anything saved on this device. */
    Store.fetchJSON("data/plans.json").then(function (remote) {
      if (!remote || !remote.length) return;
      var merged = Store.merge(Store.loadPlans() || [], remote, "id");
      Store.savePlans(merged);
      window.Practice.init(merged);
    });
    Store.fetchJSON("data/plays.json").then(function (remote) {
      if (remote && remote.length) Store.plays.mergeIn(remote);
    });
  }

  var api = { toast: toast, go: go, signIn: signIn };
  window.CC = api;   /* available before boot, so modules can call it */

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return api;
})();
