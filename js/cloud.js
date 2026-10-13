/* Shared play library on Firestore, over the plain REST API so there is no SDK
   to download. Every play is stored as one document with the play itself kept as
   a JSON string, which keeps the REST payloads simple.

   Writes carry a hash of the team code. Firestore rules compare it against a
   hash kept in a document nobody can read, so only people who know the code can
   upload. Reading is open to anyone with the site URL. */
window.Cloud = (function () {
  "use strict";

  var cfg = window.FIREBASE || {};
  var CODEKEY = "cc.teamcode";

  function ready() {
    return !!(cfg.projectId && cfg.apiKey &&
      cfg.projectId.indexOf("YOUR_") !== 0 && cfg.apiKey.indexOf("YOUR_") !== 0);
  }
  function base() {
    return "https://firestore.googleapis.com/v1/projects/" + cfg.projectId +
           "/databases/(default)/documents";
  }
  function canHash() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.digest);
  }

  function getCode() { try { return localStorage.getItem(CODEKEY) || ""; } catch (e) { return ""; } }
  function setCode(c) { try { localStorage.setItem(CODEKEY, c); } catch (e) {} }

  function hash(text) {
    var bytes = new TextEncoder().encode("coaches-corner:" + text);
    return window.crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      var a = Array.prototype.slice.call(new Uint8Array(buf));
      return a.map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  function slug(s) {
    return (s || "play").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "play";
  }

  function decode(doc) {
    var f = doc.fields || {}, play = null;
    try { play = JSON.parse(f.data.stringValue); } catch (e) {}
    return {
      id: doc.name.split("/").pop(),
      name: f.name ? f.name.stringValue : "",
      by: f.by ? f.by.stringValue : "",
      updated: f.updated ? +f.updated.integerValue : 0,
      play: play
    };
  }

  function list() {
    if (!ready()) return Promise.resolve([]);
    return fetch(base() + "/plays?key=" + cfg.apiKey + "&pageSize=300", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : { documents: [] }; })
      .then(function (j) {
        var out = (j.documents || []).map(decode).filter(function (d) { return d.play; });
        out.sort(function (a, b) { return b.updated - a.updated; });
        return out;
      })
      .catch(function () { return []; });
  }

  function upload(play, by) {
    if (!ready()) return Promise.reject(new Error("Cloud is not set up yet."));
    if (!canHash()) return Promise.reject(new Error("Uploading needs the https site, not a local file."));
    var code = getCode();
    if (!code) return Promise.reject(new Error("Enter the team code first."));

    return hash(code).then(function (codeHash) {
      var body = { fields: {
        name:     { stringValue: play.name || "Untitled" },
        data:     { stringValue: JSON.stringify(play) },
        by:       { stringValue: by || "" },
        codeHash: { stringValue: codeHash },
        updated:  { integerValue: String(Date.now()) }
      } };
      var url = base() + "/plays/" + encodeURIComponent(slug(play.name)) + "?key=" + cfg.apiKey;
      return fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (r.ok) return true;
        if (r.status === 403) throw new Error("That team code was not accepted.");
        throw new Error("Upload failed (" + r.status + ").");
      });
    });
  }

  return {
    ready: ready, canHash: canHash,
    getCode: getCode, setCode: setCode,
    list: list, upload: upload
  };
})();
