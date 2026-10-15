/* Shared storage. Plays and practice plans live in this browser, and anything
   pushed to data/*.json in the repo is merged in on load (local always wins). */
window.Store = (function () {
  "use strict";

  var K = { plays: "cc.plays.v1", plans: "cc.plans.v1" };

  function get(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  /* Add remote records this device has not seen. A local record with the same
     id is never overwritten, so edits made here always survive. */
  function merge(local, remote, idKey) {
    local = local || []; remote = remote || [];
    var seen = {};
    for (var i = 0; i < local.length; i++) seen[local[i][idKey]] = true;
    var out = local.slice();
    for (var j = 0; j < remote.length; j++) if (!seen[remote[j][idKey]]) out.push(remote[j]);
    return out;
  }

  function fetchJSON(url) {
    if (!window.fetch) return Promise.resolve(null);
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------- the play library: one list, keyed by name ---------- */
  var plays = null, listeners = [];
  function changed() {
    var ok = set(K.plays, plays);
    listeners.forEach(function (fn) { fn(); });
    return ok;
  }
  var Plays = {
    init: function (seed) { plays = get(K.plays, null); if (!plays) { plays = seed || []; set(K.plays, plays); } },
    list: function () { return plays || []; },
    find: function (name) {
      for (var i = 0; i < plays.length; i++) if (plays[i].name === name) return plays[i];
      return null;
    },
    /* Save by name: same name replaces, a new name is added. */
    put: function (play) {
      var copy = JSON.parse(JSON.stringify(play)), at = -1;
      for (var i = 0; i < plays.length; i++) if (plays[i].name === copy.name) at = i;
      if (at >= 0) plays[at] = copy; else plays.push(copy);
      return changed();
    },
    remove: function (name) {
      plays = plays.filter(function (p) { return p.name !== name; });
      return changed();
    },
    replaceAll: function (arr) { plays = arr; return changed(); },
    mergeIn: function (remote) { plays = merge(plays, remote, "name"); return changed(); },
    subscribe: function (fn) { listeners.push(fn); }
  };

  return {
    loadPlans: function () { return get(K.plans, null); },
    savePlans: function (a) { return set(K.plans, a); },
    merge: merge,
    fetchJSON: fetchJSON,
    plays: Plays
  };
})();
