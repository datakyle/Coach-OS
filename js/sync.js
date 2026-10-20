/* Keeps plays and practice history the same on every device signed in to the
   account. Each record carries `updated` (ms). A sync pulls the account's copy,
   keeps the newer side of anything on both, uploads what only this device has,
   and drops what another device deleted.

   Deletes: the ids the account held at the last sync are kept in
   cc.sync.<collection>. A record this device still has but the account no
   longer has was deleted elsewhere, so it goes here too. A record deleted here
   is queued and removed from the account on the next sync, even if this device
   was offline or signed out when it was deleted. */
window.Sync = (function () {
  "use strict";

  function get(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function signedIn() { return window.Cloud.ready() && !!window.Cloud.role(); }

  var engines = [];
  var listeners = [];
  function notify() { listeners.forEach(function (fn) { fn(); }); }

  /* o: { coll, key(rec) -> doc id, name(rec), read() -> array, write(array) } */
  function engine(o) {
    var SK = "cc.sync." + o.coll;
    var st = get(SK) || { known: [], deleted: [] };
    var e = { coll: o.coll, state: "idle", at: 0, error: "", busy: null, again: false, writing: false };

    e.noteDelete = function (id) {
      if (st.known.indexOf(id) >= 0 && st.deleted.indexOf(id) < 0) { st.deleted.push(id); set(SK, st); }
    };

    function pass() {
      var cloud = window.Cloud;
      return cloud.list(o.coll).then(function (rows) {
        var remote = {};
        rows.forEach(function (r) { remote[r.id] = r; });

        var jobs = [], dels = st.deleted.slice();
        dels.forEach(function (id) {
          if (remote[id]) { delete remote[id]; jobs.push(cloud.remove(o.coll, id)); }
        });

        var local = o.read() || [], out = [], seen = {}, ups = [];
        local.forEach(function (rec) {
          var id = o.key(rec);
          if (seen[id] || dels.indexOf(id) >= 0) return;
          seen[id] = true;
          var r = remote[id], lu = +rec.updated || 0;
          if (r) {
            if (lu > r.updated) { out.push(rec); ups.push(rec); }
            else if (r.updated > lu) { r.data.updated = r.updated; out.push(r.data); }
            else out.push(rec);
          } else if (st.known.indexOf(id) >= 0) {
            /* the account had it last time and not now: deleted on another device */
          } else {
            if (!lu) rec.updated = Date.now();
            out.push(rec); ups.push(rec);
          }
        });
        Object.keys(remote).forEach(function (id) {
          if (seen[id]) return;
          var d = remote[id].data; d.updated = remote[id].updated;
          out.push(d);
        });

        ups.forEach(function (rec) { jobs.push(cloud.put(o.coll, o.key(rec), o.name(rec), rec, rec.updated)); });
        if (ups.length || JSON.stringify(out) !== JSON.stringify(local)) {
          e.writing = true;
          try { o.write(out); } finally { e.writing = false; }
        }
        return Promise.all(jobs).then(function () {
          st.known = out.map(o.key);
          st.deleted = st.deleted.filter(function (id) { return dels.indexOf(id) < 0; });
          set(SK, st);
        });
      });
    }

    e.run = function () {
      if (!signedIn()) { e.state = "off"; e.error = ""; notify(); return Promise.resolve(); }
      if (e.busy) { e.again = true; return e.busy; }
      e.state = "syncing"; notify();
      e.busy = pass().then(function () {
        e.state = "ok"; e.at = Date.now(); e.error = "";
      }, function (err) {
        e.state = "error";
        e.error = /403|Refused|cannot see/.test(err.message || "")
          ? "The account refused this. Paste the latest firestore.rules into Firebase."
          : "Could not sync. Check your connection.";
      }).then(function () {
        e.busy = null; notify();
        if (e.again) { e.again = false; return e.run(); }
      });
      return e.busy;
    };

    engines.push(e);
    return e;
  }

  var timer = null;
  /* Sync everything shortly. Many changes in a row become one sync. */
  function soon() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; engines.forEach(function (e) { e.run(); }); }, 600);
  }

  /* Plain words for a status line. */
  function describe(e) {
    if (!window.Cloud.ready()) return "";
    if (e.state === "off" || !signedIn()) return "";
    if (e.state === "syncing") return "Syncing…";
    if (e.state === "error") return e.error;
    if (e.state === "ok") {
      var d = new Date(e.at), h = d.getHours() % 12 || 12, m = d.getMinutes();
      return "Synced to your account at " + h + ":" + (m < 10 ? "0" : "") + m + (d.getHours() < 12 ? " AM" : " PM");
    }
    return "";
  }

  document.addEventListener("visibilitychange", function () { if (!document.hidden) soon(); });
  setInterval(function () { if (!document.hidden && signedIn()) soon(); }, 120000);

  return {
    engine: engine,
    soon: soon,
    describe: describe,
    onChange: function (fn) { listeners.push(fn); },
    signedIn: signedIn
  };
})();
