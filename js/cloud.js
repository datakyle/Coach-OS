/* Shared play library on Firestore, behind a team code. Talks to the plain REST
   APIs so there is no SDK to download.

   Signing in is Firebase Auth with email + password, where the "password" is the
   code people type and the email is fixed in firebase-config.js. There are two
   accounts:

     team   the code you give players. Can see shared plays and nothing else.
     coach  the code for you and your staff. Can also upload and delete.

   Nothing in this file decides who can see what. firestore.rules does, by
   checking which of those two accounts signed in. A stranger with the site URL
   and no code gets nothing back. */
window.Cloud = (function () {
  "use strict";

  var cfg = window.FIREBASE || {};
  var SKEY = "cc.session";
  var session = loadSession();   /* { role, refresh, token, exp } */
  var refreshing = null;

  function ready() {
    return !!(cfg.projectId && cfg.apiKey && cfg.teamEmail && cfg.coachEmail &&
      cfg.projectId.indexOf("YOUR_") !== 0 && cfg.apiKey.indexOf("YOUR_") !== 0);
  }
  function base() {
    return "https://firestore.googleapis.com/v1/projects/" + cfg.projectId +
           "/databases/(default)/documents";
  }

  /* ---------- session ---------- */
  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch (e) { return null; }
  }
  function saveSession() {
    try {
      if (session) localStorage.setItem(SKEY, JSON.stringify(session));
      else localStorage.removeItem(SKEY);
    } catch (e) {}
  }
  function role() { return session ? session.role : ""; }
  function isCoach() { return role() === "coach"; }

  function authError(j) {
    var m = (j && j.error && j.error.message) || "";
    var e;
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m)) {
      e = new Error("That code was not recognized."); e.badCode = true;
    } else if (/TOO_MANY_ATTEMPTS/.test(m)) {
      e = new Error("Too many tries. Wait a few minutes and try again.");
    } else if (/USER_DISABLED/.test(m)) {
      e = new Error("That code has been switched off.");
    } else if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(m)) {
      e = new Error("The team code changed. Enter the new one."); e.signedOut = true;
    } else {
      e = new Error("Sign in failed" + (m ? " (" + m + ")." : "."));
    }
    return e;
  }

  function post(url, body, form) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
      body: form ? body : JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw authError(j);
        return j;
      });
    });
  }

  function trySignIn(asRole, code) {
    var email = asRole === "coach" ? cfg.coachEmail : cfg.teamEmail;
    return post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + cfg.apiKey,
      { email: email, password: code, returnSecureToken: true })
      .then(function (j) {
        session = { role: asRole, refresh: j.refreshToken, token: j.idToken,
                    exp: Date.now() + (+j.expiresIn - 60) * 1000 };
        saveSession();
        return asRole;
      });
  }

  /* Players are the common case, so the team account is tried first. */
  function signIn(code) {
    if (!ready()) return Promise.reject(new Error("Cloud is not set up yet."));
    code = (code || "").trim();
    if (code.length < 6) return Promise.reject(new Error("Codes are at least 6 characters."));
    return trySignIn("team", code).catch(function (err) {
      if (!err.badCode) throw err;
      return trySignIn("coach", code);
    });
  }

  function signOut() { session = null; saveSession(); }

  /* ID tokens last an hour. Swap the long-lived refresh token for a new one
     when it runs out. Changing a code in the Firebase console kills every
     refresh token for that account, which is how you sign everyone out. */
  function token() {
    if (!session) return Promise.reject(new Error("Enter the team code first."));
    if (session.token && Date.now() < session.exp) return Promise.resolve(session.token);
    if (refreshing) return refreshing;
    refreshing = post("https://securetoken.googleapis.com/v1/token?key=" + cfg.apiKey,
      "grant_type=refresh_token&refresh_token=" + encodeURIComponent(session.refresh), true)
      .then(function (j) {
        session.token = j.id_token;
        session.refresh = j.refresh_token;
        session.exp = Date.now() + (+j.expires_in - 60) * 1000;
        saveSession();
        return session.token;
      }, function (err) {
        if (err.signedOut) signOut();
        throw err;
      });
    refreshing.then(done, done);
    function done() { refreshing = null; }
    return refreshing;
  }

  function call(method, path, body) {
    return token().then(function (t) {
      var opts = { method: method, headers: { Authorization: "Bearer " + t }, cache: "no-cache" };
      if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
      return fetch(base() + path + (path.indexOf("?") < 0 ? "?" : "&") + "key=" + cfg.apiKey, opts);
    });
  }

  /* ---------- plays ---------- */
  function slug(s) {
    return (s || "play").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "play";
  }

  function decode(doc) {
    var f = doc.fields || {}, play = null;
    try { play = JSON.parse(f.data.stringValue); } catch (e) {}
    return {
      id: doc.name.split("/").pop(),
      name: f.name ? f.name.stringValue : "",
      updated: f.updated ? +f.updated.integerValue : 0,
      play: play
    };
  }

  function list() {
    return call("GET", "/plays?pageSize=300").then(function (r) {
      if (r.status === 403) throw new Error("This code cannot see team plays. Check firestore.rules.");
      if (!r.ok) throw new Error("Could not load team plays (" + r.status + ").");
      return r.json();
    }).then(function (j) {
      var out = (j.documents || []).map(decode).filter(function (d) { return d.play; });
      out.sort(function (a, b) { return b.updated - a.updated; });
      return out;
    });
  }

  function upload(play) {
    if (!isCoach()) return Promise.reject(new Error("Only the coach code can upload."));
    var body = { fields: {
      name:    { stringValue: play.name || "Untitled" },
      data:    { stringValue: JSON.stringify(play) },
      updated: { integerValue: String(Date.now()) }
    } };
    return call("PATCH", "/plays/" + encodeURIComponent(slug(play.name)), body).then(function (r) {
      if (r.ok) return true;
      if (r.status === 403) throw new Error("Upload was refused. Only the coach code can upload.");
      throw new Error("Upload failed (" + r.status + ").");
    });
  }

  function remove(id) {
    if (!isCoach()) return Promise.reject(new Error("Only the coach code can delete."));
    return call("DELETE", "/plays/" + encodeURIComponent(id)).then(function (r) {
      if (r.ok) return true;
      throw new Error("Delete failed (" + r.status + ").");
    });
  }

  return {
    ready: ready,
    role: role, isCoach: isCoach,
    signIn: signIn, signOut: signOut,
    list: list, upload: upload, remove: remove
  };
})();
