/* Practice Plan: one agenda per date, times computed from the start time and
   the minutes on each item. Past practices stay in the history list.

   Two modes. Edit is the working agenda. Publish turns the same practice into
   a one-page sheet: download it as a PDF, or publish it so the
   staff and players can open it from their own devices. */
window.Practice = (function () {
  "use strict";

  var plans = [];      // newest first
  var cur = null;      // the plan on screen
  var dirty = false;
  var mode = "edit";
  var teamPlans = [];  // published practices from Firebase, newest first
  var teamError = "";
  var shown = null;    // in Publish mode: null = this practice, else a published id

  /* Look of the sheet and its PDF. Saved per device under cc.sheettheme. */
  var THEMES = {
    coachos: { brand: "Coach OS", sheetLogo: "icons/icon.svg", pdfLogo: "icons/icon-180.png", size: 22 },
    mustang: { brand: "Midland Mustangs", sheetLogo: "icons/mustang.png", pdfLogo: "icons/mustang.png", size: 40 }
  };
  var theme = "coachos";
  try { if (THEMES[localStorage.getItem("cc.sheettheme")]) theme = localStorage.getItem("cc.sheettheme"); } catch (e) {}
  function setTheme(t) {
    theme = THEMES[t] ? t : "coachos";
    try { localStorage.setItem("cc.sheettheme", theme); } catch (e) {}
    document.getElementById("planPublish").classList.toggle("th-mustang", theme === "mustang");
    document.getElementById("mustangOn").checked = theme === "mustang";
    renderPublish();
  }

  var BLOCKS = [
    { mins: 5,  title: "Circle Up",        note: "Question of the day, set the focus, split teams." },
    { mins: 10, title: "Game Warmup",      note: "Dynamic warmup into partner passing and full speed layups." },
    { mins: 15, title: "Syracuse",         note: "FL, HC, BL sequences with shuffle and back peddle. Team vs team." },
    { mins: 12, title: "Teach block",      note: "Board first, then walk it on the floor." },
    { mins: 14, title: "Split stations",   note: "Returners at the main basket, new guys at the far basket." },
    { mins: 16, title: "Install",          note: "Dummy reps first, then live against coaches." },
    { mins: 14, title: "Live",             note: "Everyone together, score it, winners run." },
    { mins: 10, title: "Free throws",      note: "Team says the shooter's name before every attempt." }
  ];

  /* ---------- helpers ---------- */
  function todayISO() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
    return m ? (+m[1]) * 60 + (+m[2]) : 16 * 60;
  }
  function fmtClock(mins) {
    var h = Math.floor(mins / 60) % 24, m = mins % 60;
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m;
  }
  function fmtClockFull(mins) {
    return fmtClock(mins) + " " + (Math.floor(mins / 60) % 24 < 12 ? "AM" : "PM");
  }
  function fmtDateLong(iso) {
    var p = (iso || "").split("-");
    if (p.length !== 3) return iso || "";
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function fmtDate(iso) {
    var p = (iso || "").split("-");
    if (p.length !== 3) return iso || "";
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function totalMins(p) {
    var t = 0;
    for (var i = 0; i < p.items.length; i++) t += (+p.items[i].mins || 0);
    return t;
  }
  function blank(date) {
    return { id: date, date: date, start: "16:00", focus: "", items: [] };
  }

  /* ---------- plan list ---------- */
  function sortPlans() { plans.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); }

  function savePlan(quiet) {
    cur.date = document.getElementById("planDate").value || todayISO();
    cur.id = cur.date;
    cur.start = document.getElementById("planStart").value || "16:00";
    cur.focus = document.getElementById("planFocus").value.trim();
    cur.updated = Date.now();
    var at = -1;
    for (var i = 0; i < plans.length; i++) if (plans[i].id === cur.id) at = i;
    if (at >= 0) plans[at] = JSON.parse(JSON.stringify(cur));
    else plans.push(JSON.parse(JSON.stringify(cur)));
    sortPlans();
    if (!window.Store.savePlans(plans)) window.CC.toast("Could not save to this browser.");
    else if (!quiet) window.CC.toast("Saved " + fmtDate(cur.date));
    dirty = false;
    renderHistory();
  }

  /* Sync brought a new list. Keep what is on screen if it has unsaved edits. */
  function setPlans(arr) {
    plans = (arr || []).slice();
    sortPlans();
    if (!dirty && cur) {
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].id === cur.id && JSON.stringify(plans[i]) !== JSON.stringify(cur)) { cur = JSON.parse(JSON.stringify(plans[i])); render(); }
      }
    }
    renderHistory();
    renderPublish();
  }
  function renderSync() {
    var p = document.getElementById("planSync");
    if (p) p.textContent = window.Sync ? window.Sync.describe(planSync) : "";
  }
  var planSync = null;

  function openPlan(p) { cur = JSON.parse(JSON.stringify(p)); dirty = false; render(); }

  /* ---------- render ---------- */
  function render() {
    document.getElementById("planDate").value = cur.date;
    document.getElementById("planStart").value = cur.start;
    document.getElementById("planFocus").value = cur.focus || "";

    var start = parseHM(cur.start), total = totalMins(cur);
    document.getElementById("planWindow").innerHTML = cur.items.length
      ? "<b>" + fmtClockFull(start) + "</b> to <b>" + fmtClockFull(start + total) + "</b> &middot; " + total + " minutes &middot; " + cur.items.length + " items"
      : "Add items and the clock fills itself in.";

    var box = document.getElementById("planRows");
    box.textContent = "";

    if (!cur.items.length) {
      var e = document.createElement("p");
      e.className = "empty";
      e.textContent = "Nothing scheduled. Add an item, drop in a block, or copy the last practice.";
      box.appendChild(e);
      return;
    }

    var head = document.createElement("div");
    head.className = "itm head";
    ["Time", "Min", "What we are doing", ""].forEach(function (h) {
      var s = document.createElement("span"); s.textContent = h; head.appendChild(s);
    });
    box.appendChild(head);

    var t = start;
    cur.items.forEach(function (it, i) {
      var row = document.createElement("div"); row.className = "itm";

      var clock = document.createElement("div"); clock.className = "clock"; clock.textContent = fmtClock(t);
      t += (+it.mins || 0);

      var mins = document.createElement("input");
      mins.className = "mins"; mins.type = "number"; mins.min = "0"; mins.max = "120"; mins.inputMode = "numeric";
      mins.value = it.mins; mins.setAttribute("aria-label", "Minutes");
      mins.oninput = function () { it.mins = Math.max(0, +mins.value || 0); dirty = true; render(); };

      var ttl = document.createElement("input");
      ttl.className = "ttl"; ttl.type = "text"; ttl.value = it.title; ttl.placeholder = "Drill";
      ttl.setAttribute("aria-label", "Drill");
      ttl.oninput = function () { it.title = ttl.value; dirty = true; };

      var ctl = document.createElement("div"); ctl.className = "ctl";
      var up = document.createElement("button"); up.innerHTML = "&uarr;"; up.title = "Move up";
      up.setAttribute("aria-label", "Move up");
      up.onclick = function () { if (i > 0) { cur.items.splice(i - 1, 0, cur.items.splice(i, 1)[0]); dirty = true; render(); } };
      var dn = document.createElement("button"); dn.innerHTML = "&darr;"; dn.title = "Move down";
      dn.setAttribute("aria-label", "Move down");
      dn.onclick = function () { if (i < cur.items.length - 1) { cur.items.splice(i + 1, 0, cur.items.splice(i, 1)[0]); dirty = true; render(); } };
      var kill = document.createElement("button"); kill.className = "kill"; kill.innerHTML = "&times;"; kill.title = "Remove";
      kill.setAttribute("aria-label", "Remove");
      kill.onclick = function () { cur.items.splice(i, 1); dirty = true; render(); };
      ctl.appendChild(up); ctl.appendChild(dn); ctl.appendChild(kill);

      var note = document.createElement("input");
      note.className = "note2"; note.type = "text"; note.value = it.note || "";
      note.placeholder = "One sentence on what we are doing";
      note.setAttribute("aria-label", "Note");
      note.oninput = function () { it.note = note.value; dirty = true; };

      row.appendChild(clock); row.appendChild(mins); row.appendChild(ttl); row.appendChild(ctl); row.appendChild(note);
      box.appendChild(row);
    });
  }

  function renderHistory() {
    var box = document.getElementById("histList");
    box.textContent = "";
    if (!plans.length) {
      var e = document.createElement("p"); e.className = "empty"; e.textContent = "No practices saved yet.";
      box.appendChild(e); return;
    }
    plans.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "hrow" + (cur && p.id === cur.id ? " on" : "");
      var d = document.createElement("span"); d.className = "hd"; d.textContent = fmtDate(p.date);
      var f = document.createElement("span"); f.className = "hf";
      f.textContent = p.focus || (p.items.length + " items");
      b.appendChild(d); b.appendChild(f);
      b.onclick = function () {
        if (dirty && !confirmLeave()) return;
        openPlan(p); renderHistory();
      };
      box.appendChild(b);
    });
  }

  function confirmLeave() { return true; }

  function renderBlocks() {
    var box = document.getElementById("blocks");
    box.textContent = "";
    BLOCKS.forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "btn sm"; btn.textContent = b.title;
      btn.onclick = function () {
        cur.items.push({ mins: b.mins, title: b.title, note: b.note });
        dirty = true; render();
      };
      box.appendChild(btn);
    });
  }

  /* ---------- publish mode ---------- */
  function setMode(m) {
    mode = m === "publish" ? "publish" : "edit";
    try { localStorage.setItem("cc.planmode", mode); } catch (e) {}
    document.getElementById("planEdit").hidden = mode !== "edit";
    document.getElementById("planPublish").hidden = mode !== "publish";
    [].slice.call(document.querySelectorAll("#page-plan .pagehead .seg button")).forEach(function (b) {
      var on = b.getAttribute("data-mode") === mode;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (mode === "publish") { shown = null; renderPublish(); preparePdf().catch(function () {}); }
  }

  function findTeam(id) {
    for (var i = 0; i < teamPlans.length; i++) if (teamPlans[i].id === id) return teamPlans[i];
    return null;
  }
  function shownPlan() {
    var t = shown && findTeam(shown);
    return t ? t.data : cur;
  }
  function sameAs(a, b) {
    var pick = function (p) { return JSON.stringify([p.date, p.start, p.focus || "", p.items]); };
    return pick(a) === pick(b);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* The one-page sheet, as it appears on screen. The PDF follows the same layout. */
  function renderSheet(p) {
    var sh = document.getElementById("sheet"), th = THEMES[theme];
    sh.textContent = "";
    sh.className = "sheet th-" + theme;
    var head = el("header", "sh-head");
    var logo = el("img"); logo.src = th.sheetLogo; logo.alt = ""; logo.width = th.size; logo.height = th.size;
    head.appendChild(logo);
    head.appendChild(el("span", "sh-brand", th.brand));
    head.appendChild(el("span", "sh-kind", "Practice plan"));
    sh.appendChild(head);

    sh.appendChild(el("h2", "sh-date", fmtDateLong(p.date)));
    if (p.focus) {
      var f = el("p", "sh-focus");
      f.appendChild(el("span", "k", "Working on "));
      f.appendChild(document.createTextNode(p.focus));
      sh.appendChild(f);
    }
    var start = parseHM(p.start), total = totalMins(p);
    sh.appendChild(el("p", "sh-window", p.items.length
      ? fmtClockFull(start) + " to " + fmtClockFull(start + total) + "  ·  " + total + " minutes  ·  " + p.items.length + " items"
      : "Nothing scheduled yet. Switch to Edit and add items."));

    if (!p.items.length) return;
    var tb = el("table", "sh-table");
    var hr = el("tr");
    ["Time", "Min", "Drill"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    var thead = el("thead"); thead.appendChild(hr); tb.appendChild(thead);
    var body = el("tbody"), t = start;
    p.items.forEach(function (it) {
      var r = el("tr");
      r.appendChild(el("td", "t", fmtClock(t)));
      r.appendChild(el("td", "m", String(+it.mins || 0)));
      var d = el("td", "d");
      d.appendChild(el("div", "dt", it.title || "Untitled"));
      if (it.note) d.appendChild(el("div", "dn", it.note));
      r.appendChild(d);
      body.appendChild(r);
      t += (+it.mins || 0);
    });
    tb.appendChild(body);
    sh.appendChild(tb);
  }

  function renderPublish() {
    if (mode !== "publish") return;
    var cloud = window.Cloud;
    if (shown && !findTeam(shown)) shown = null;
    var p = shownPlan();
    renderSheet(p);

    /* status line and the Publish button */
    var st = document.getElementById("pubStatus"), pub = document.getElementById("btnPublish");
    var live = findTeam(cur.date);
    if (shown) {
      st.textContent = "Published practice";
      st.className = "status live";
      pub.hidden = true;
    } else {
      pub.hidden = !cloud.ready();
      pub.textContent = live ? "Update published copy" : "Publish to team";
      if (!cloud.ready()) { st.textContent = "Draft"; st.className = "status"; }
      else if (!live) { st.textContent = "Draft · not published"; st.className = "status"; }
      else if (sameAs(live.data, cur)) { st.textContent = "Published"; st.className = "status live"; pub.hidden = true; }
      else { st.textContent = "Changed since you published"; st.className = "status warn"; }
    }

    /* the list on the right */
    var box = document.getElementById("pubList");
    box.textContent = "";
    var mine = el("button", "hrow" + (!shown ? " on" : ""));
    mine.appendChild(el("span", "hd", fmtDate(cur.date)));
    mine.appendChild(el("span", "hf", "This practice"));
    mine.onclick = function () { shown = null; renderPublish(); };
    box.appendChild(mine);

    if (!cloud.ready()) return;
    if (!cloud.role()) {
      var n = el("p", "empty", "Sign in to see published practices. ");
      var a = el("button", "linkbtn", "Sign in");
      a.onclick = function () { window.CC.signIn(); };
      n.appendChild(a);
      box.appendChild(n);
      return;
    }
    if (teamError) { box.appendChild(el("p", "empty", teamError)); return; }
    if (!teamPlans.length) { box.appendChild(el("p", "empty", "Nothing published yet.")); return; }
    teamPlans.forEach(function (t) {
      var b = el("button", "hrow" + (shown === t.id ? " on" : ""));
      b.appendChild(el("span", "hd", fmtDate(t.data.date)));
      b.appendChild(el("span", "hf", t.data.focus || (t.data.items.length + " items")));
      b.onclick = function () { shown = t.id; renderPublish(); };
      box.appendChild(b);
    });

    if (shown) {
      var t = findTeam(shown), acts = el("div", "row pubacts");
      var copy = el("button", "btn sm", "Copy into Edit");
      copy.onclick = function () {
        if (dirty && !confirm("Replace the practice you are editing with this one?")) return;
        openPlan(t.data); renderHistory(); setMode("edit");
        window.CC.toast("Loaded " + fmtDate(t.data.date) + ". Save it to keep a copy here.");
        dirty = true;
      };
      acts.appendChild(copy);
      if (cloud.isCoach()) {
        var rm = el("button", "btn sm danger", "Unpublish");
        rm.onclick = function () {
          if (!confirm("Unpublish " + fmtDate(t.data.date) + "? Your staff and players will stop seeing it.")) return;
          cloud.practices.remove(t.id).then(function () {
            window.CC.toast("Unpublished."); shown = null; loadTeam();
          }, function (err) { window.CC.toast(err.message); });
        };
        acts.appendChild(rm);
      }
      box.appendChild(acts);
    }
  }

  function publish() {
    var cloud = window.Cloud;
    if (!cloud.isCoach()) {
      window.CC.toast("Sign in to publish.");
      if (!cloud.role()) window.CC.signIn();
      return;
    }
    if (!cur.items.length) { window.CC.toast("Add something to the practice first."); return; }
    savePlan(true);
    var b = document.getElementById("btnPublish");
    b.disabled = true;
    cloud.practices.publish(JSON.parse(JSON.stringify(cur))).then(function () {
      window.CC.toast("Published " + fmtDate(cur.date) + " to the team.");
      loadTeam();
    }, function (err) { window.CC.toast(err.message); })
      .then(function () { b.disabled = false; });
  }

  function loadTeam() {
    var cloud = window.Cloud;
    if (!cloud.ready() || !cloud.role()) { teamPlans = []; teamError = ""; renderPublish(); return; }
    cloud.practices.list().then(function (rows) {
      teamPlans = rows.sort(function (a, b) { return a.data.date < b.data.date ? 1 : a.data.date > b.data.date ? -1 : 0; });
      teamError = ""; renderPublish();
    }, function (err) { teamPlans = []; teamError = err.message; renderPublish(); });
  }

  /* ---------- PDF ----------
     jsPDF is vendored in js/vendor and only loaded the first time someone
     downloads, so the app itself stays light. */
  var pdfLib = null;
  function loadPdf() {
    if (pdfLib) return pdfLib;
    pdfLib = new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = "js/vendor/jspdf.umd.min.js";
      s.onload = function () { window.jspdf ? ok(window.jspdf.jsPDF) : fail(new Error("no jsPDF")); };
      s.onerror = function () { pdfLib = null; fail(new Error("Could not load the PDF maker. Check your connection.")); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  /* A logo as { data, ratio } for jsPDF, or null if it will not load. */
  function loadLogo(src) {
    return fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(b); });
    }).then(function (data) {
      return new Promise(function (ok) {
        var im = new Image();
        im.onload = function () { ok({ data: data, ratio: im.naturalWidth / im.naturalHeight || 1 }); };
        im.onerror = function () { ok({ data: data, ratio: 1 }); };
        im.src = data;
      });
    }).catch(function () { return null; });
  }
  /* "#EA090A" from a CSS token, as [r, g, b]. */
  function tokenRGB(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  /* One letter page. Lay the sheet out, and if it runs long, shrink everything
     a little and try again until it fits. */
  function buildPdf(JsPDF, p, logos) {
    var mustang = theme === "mustang", logo = logos[theme];
    var doc = new JsPDF({ unit: "pt", format: "letter" });
    var W = 612, H = 792, M = 50, inner = W - 2 * M;
    var colM = M + 66, colD = M + 108, wD = W - M - colD;
    var ink = [21, 24, 29], muted = [91, 99, 112], orange = [201, 82, 26], hair = [217, 221, 227];
    var accent = mustang ? tokenRGB("--mustang", [234, 9, 10]) : orange;
    var lead = mustang ? accent : ink;   /* the heavy rule and the times */
    var start = parseHM(p.start), total = totalMins(p);

    function lay(s, draw) {
      var y = M, fs;
      var txt = function (str, x, yy, opt) { if (draw) doc.text(str, x, yy, opt); };
      var font = function (style, size, color) { doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]); };

      var lh = mustang ? 40 : 22, lw = logo ? lh * logo.ratio : 0, mid = y + lh / 2 + 4;
      if (draw && logo) doc.addImage(logo.data, "PNG", M, y, lw, lh);
      font("bold", mustang ? 13 : 11, accent); txt(THEMES[theme].brand.toUpperCase(), M + (logo ? lw + 8 : 0), mid);
      font("normal", 10, muted); txt("Practice plan", W - M, mid, { align: "right" });
      y += lh + 22;

      fs = 24 * s; font("bold", fs, ink); txt(fmtDateLong(p.date), M, y + fs * 0.78); y += fs * 1.2;
      if (p.focus) {
        fs = 13.5 * s; font("normal", fs, ink);
        var fl = doc.splitTextToSize("Working on: " + p.focus, inner);
        txt(fl, M, y + fs * 0.8, { lineHeightFactor: 1.25 }); y += fl.length * fs * 1.25 + 2 * s;
      }
      fs = 11 * s; font("normal", fs, muted);
      txt(fmtClockFull(start) + " to " + fmtClockFull(start + total) + "   ·   " + total + " minutes   ·   " + p.items.length + " items", M, y + fs * 0.8);
      y += fs * 1.5 + 6 * s;

      if (draw) { doc.setDrawColor(lead[0], lead[1], lead[2]); doc.setLineWidth(mustang ? 2 : 1.4); doc.line(M, y, W - M, y); }
      y += 16 * s;

      fs = 8.5 * s; font("bold", fs, muted);
      txt("TIME", M, y); txt("MIN", colM, y); txt("DRILL", colD, y);
      y += 10 * s;

      var t = start;
      p.items.forEach(function (it) {
        var tf = 12.5 * s, nf = 10.5 * s, pad = 9 * s;
        font("bold", tf, ink);
        var tl = doc.splitTextToSize(it.title || "Untitled", wD);
        font("normal", nf, muted);
        var nl = it.note ? doc.splitTextToSize(it.note, wD) : [];
        var h = pad + tl.length * tf * 1.2 + (nl.length ? 2 * s + nl.length * nf * 1.3 : 0) + pad;
        if (draw) {
          var base = y + pad + tf * 0.8;
          font("bold", tf, lead); doc.text(fmtClock(t), M, base);
          font("normal", tf, muted); doc.text(String(+it.mins || 0), colM, base);
          font("bold", tf, ink); doc.text(tl, colD, base, { lineHeightFactor: 1.2 });
          if (nl.length) { font("normal", nf, muted); doc.text(nl, colD, base - tf * 0.8 + tl.length * tf * 1.2 + 2 * s + nf * 0.8, { lineHeightFactor: 1.3 }); }
          doc.setDrawColor(hair[0], hair[1], hair[2]); doc.setLineWidth(0.8); doc.line(M, y + h, W - M, y + h);
        }
        y += h;
        t += (+it.mins || 0);
      });
      return y;
    }

    var s = 1;
    while (s > 0.5 && lay(s, false) > H - M) s -= 0.04;
    lay(s, true);
    return doc;
  }

  /* The PDF is built and handed over inside the tap itself. iPhone and iPad
     Safari drop a download that starts after anything asynchronous, so the
     PDF maker and logo are fetched as soon as Publish mode opens. */
  var pdfReady = null;   /* { lib, logos: { coachos, mustang } } once loaded */
  function preparePdf() {
    if (pdfReady) return Promise.resolve(pdfReady);
    return Promise.all([loadPdf(), loadLogo(THEMES.coachos.pdfLogo), loadLogo(THEMES.mustang.pdfLogo)]).then(function (r) {
      pdfReady = { lib: r[0], logos: { coachos: r[1], mustang: r[2] } };
      return pdfReady;
    });
  }

  /* Phones and tablets get the share sheet (Save to Files, Print, AirDrop);
     computers get a normal download. */
  function deliverPdf(doc, name) {
    var blob = doc.output("blob");
    var file = null;
    try { file = new File([blob], name, { type: "application/pdf" }); } catch (e) {}
    var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name }).catch(function (err) {
        if (err && err.name === "AbortError") return;   /* closed the share sheet */
        openPdf(blob);
      });
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  /* Last resort: show the PDF itself; the browser's own share button saves it. */
  function openPdf(blob) {
    var url = URL.createObjectURL(blob);
    if (!window.open(url, "_blank")) location.href = url;
  }

  function downloadPdf() {
    var p = shownPlan();
    if (!p.items.length) { window.CC.toast("Nothing to put on the sheet yet."); return; }
    var name = "Practice " + p.date + ".pdf";
    if (pdfReady) {
      try { deliverPdf(buildPdf(pdfReady.lib, p, pdfReady.logos), name); }
      catch (err) { window.CC.toast("Could not make the PDF."); }
      return;
    }
    /* Not loaded yet (slow connection): load it, then ask for one more tap. */
    var b = document.getElementById("btnPdf");
    b.disabled = true; b.textContent = "Getting PDF ready\u2026";
    preparePdf().then(function () {
      window.CC.toast("PDF is ready. Tap Download PDF again.");
    }, function (err) { window.CC.toast(err.message || "Could not load the PDF maker."); })
      .then(function () { b.disabled = false; b.textContent = "Download PDF"; });
  }

  /* ---------- wiring ---------- */
  function wire() {
    document.getElementById("planDate").onchange = function () { cur.date = this.value; cur.id = this.value; dirty = true; render(); };
    document.getElementById("planStart").onchange = function () { cur.start = this.value; dirty = true; render(); };
    document.getElementById("planFocus").oninput = function () { cur.focus = this.value; dirty = true; };

    document.getElementById("btnAddItem").onclick = function () {
      cur.items.push({ mins: 10, title: "", note: "" }); dirty = true; render();
    };
    document.getElementById("btnSavePlan").onclick = function () { savePlan(); };
    document.getElementById("btnNewPlan").onclick = function () {
      openPlan(blank(todayISO())); renderHistory();
    };
    document.getElementById("btnCopyPlan").onclick = function () {
      var last = plans[0];
      if (!last) { window.CC.toast("Nothing to copy yet."); return; }
      var copy = JSON.parse(JSON.stringify(last));
      copy.date = todayISO(); copy.id = copy.date;
      openPlan(copy); renderHistory();
      window.CC.toast("Copied " + fmtDate(last.date) + " into today.");
    };

    [].slice.call(document.querySelectorAll("#page-plan .pagehead .seg button")).forEach(function (b) {
      b.onclick = function () { setMode(b.getAttribute("data-mode")); };
    });
    document.getElementById("btnPdf").onclick = downloadPdf;
    document.getElementById("mustangOn").onchange = function () { setTheme(this.checked ? "mustang" : "coachos"); };
    document.getElementById("btnPublish").onclick = publish;
  }

  function init(seedPlans) {
    plans = seedPlans || [];
    sortPlans();
    var today = todayISO(), found = null;
    for (var i = 0; i < plans.length; i++) if (plans[i].date === today) found = plans[i];
    cur = found ? JSON.parse(JSON.stringify(found)) : (plans[0] ? JSON.parse(JSON.stringify(plans[0])) : blank(today));
    wire(); renderBlocks(); renderHistory(); render();
    setTheme(theme);
    var saved = "edit";
    try { saved = localStorage.getItem("cc.planmode") || "edit"; } catch (e) {}
    setMode(saved);
  }

  return { init: init, setPlans: setPlans, renderSync: renderSync, attachSync: function (e) { planSync = e; renderSync(); }, loadTeam: loadTeam, refresh: renderPublish, getPlans: function () { return plans; } };
})();
