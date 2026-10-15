/* Shared play library on Firestore, behind one password. Talks to the plain
   REST APIs so there is no SDK to download.

   Signing in is Firebase Auth with email + password. There is one account; its
   email is fixed in firebase-config.js and people only ever type the password.
   Anyone with the password can see, share and remove team plays and practices.

   Nothing in this file decides who can see what. firestore.rules does, by
   checking that exact account signed in. A stranger with the site URL and no
   password gets nothing back. */
window.Cloud = (function () {
  "use strict";

  var cfg = window.FIREBASE || {};
  var SKEY = "cc.session";
  var session = loadSession();   /* { role, refresh, token, exp } */
  var refreshing = null;

  function ready() {
    return !!(cfg.projectId && cfg.apiKey && cfg.coachEmail &&
      cfg.projectId.indexOf("YOUR_") !== 0 && cfg.apiKey.indexOf("YOUR_") !== 0);
  }
  function base() {
    return "https://firestore.googleapis.com/v1/projects/" + cfg.projectId +
           "/databases/(default)/documents";
  }

  /* ---------- session ---------- */
  /* Sessions from the old view-only team account are dropped, so those devices
     ask once for the one password. */
  function loadSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY));
      return s && s.role === "coach" ? s : null;
    } catch (e) { return null; }
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
      e = new Error("That password is not right."); e.badCode = true;
    } else if (/TOO_MANY_ATTEMPTS/.test(m)) {
      e = new Error("Too many tries. Wait a few minutes and try again.");
    } else if (/USER_DISABLED/.test(m)) {
      e = new Error("That code has been switched off.");
    } else if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(m)) {
      e = new Error("The password changed. Enter the new one."); e.signedOut = true;
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
    var email = cfg.coachEmail;
    return post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + cfg.apiKey,
      { email: email, password: code, returnSecureToken: true })
      .then(function (j) {
        session = { role: asRole, refresh: j.refreshToken, token: j.idToken,
                    exp: Date.now() + (+j.expiresIn - 60) * 1000 };
        saveSession();
        return asRole;
      });
  }

  function signIn(code) {
    if (!ready()) return Promise.reject(new Error("Cloud is not set up yet."));
    code = (code || "").trim();
    if (code.length < 6) return Promise.reject(new Error("The password is at least 6 characters."));
    return trySignIn("coach", code);
  }

  function signOut() { session = null; saveSession(); }

  /* ID tokens last an hour. Swap the long-lived refresh token for a new one
     when it runs out. Changing a code in the Firebase console kills every
     refresh token for that account, which is how you sign everyone out. */
  function token() {
    if (!session) return Promise.reject(new Error("Sign in first."));
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

  /* ---------- shared documents ----------
     Plays and published practices are stored the same way: one document each,
     with the record itself kept as a JSON string. */
  function slug(s) {
    return (s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
  }

  function decode(doc) {
    var f = doc.fields || {}, data = null;
    try { data = JSON.parse(f.data.stringValue); } catch (e) {}
    return {
      id: doc.name.split("/").pop(),
      name: f.name ? f.name.stringValue : "",
      updated: f.updated ? +f.updated.integerValue : 0,
      data: data
    };
  }

  function list(coll) {
    return call("GET", "/" + coll + "?pageSize=300").then(function (r) {
      if (r.status === 403) throw new Error("This code cannot see the team library. Check firestore.rules.");
      if (!r.ok) throw new Error("Could not load the team library (" + r.status + ").");
      return r.json();
    }).then(function (j) {
      var out = (j.documents || []).map(decode).filter(function (d) { return d.data; });
      out.sort(function (a, b) { return b.updated - a.updated; });
      return out;
    });
  }

  function put(coll, id, name, data) {
    if (!isCoach()) return Promise.reject(new Error("Sign in first."));
    var body = { fields: {
      name:    { stringValue: name || "Untitled" },
      data:    { stringValue: JSON.stringify(data) },
      updated: { integerValue: String(Date.now()) }
    } };
    return call("PATCH", "/" + coll + "/" + encodeURIComponent(id), body).then(function (r) {
      if (r.ok) return true;
      if (r.status === 403) throw new Error("Refused. Sign out and sign in again.");
      throw new Error("Sharing failed (" + r.status + ").");
    });
  }

  function remove(coll, id) {
    if (!isCoach()) return Promise.reject(new Error("Sign in first."));
    return call("DELETE", "/" + coll + "/" + encodeURIComponent(id)).then(function (r) {
      if (r.ok) return true;
      throw new Error("Remove failed (" + r.status + ").");
    });
  }

  var plays = {
    list: function () { return list("plays"); },
    upload: function (play) { return put("plays", slug(play.name), play.name, play); },
    remove: function (id) { return remove("plays", id); }
  };
  /* Published practices are keyed by date, so republishing a day replaces it. */
  var practices = {
    list: function () { return list("practices"); },
    publish: function (plan) { return put("practices", plan.date, plan.focus || plan.date, plan); },
    remove: function (id) { return remove("practices", id); }
  };

  return {
    ready: ready,
    role: role, isCoach: isCoach,
    signIn: signIn, signOut: signOut,
    plays: plays, practices: practices
  };
})();
