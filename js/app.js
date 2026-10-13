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
    window.Store.fetchJSON("data/plays.json").then(function (remote) {
      if (!remote || !remote.length) return;
      var merged = window.Store.merge(window.Store.loadPlays() || [], remote, "name");
      window.Store.savePlays(merged);
      window.Clipboard.setLib(merged);
    });
  }

  var api = { toast: toast, show: show, onPlaysChanged: function () {} };
  window.CC = api;   /* available before boot, so modules can call it */

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return api;
})();
