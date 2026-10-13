/* Practice Plan tab: one agenda per date, times computed from the start time
   and the minutes on each item. Past practices stay in the history list. */
window.Practice = (function () {
  "use strict";

  var plans = [];      // newest first
  var cur = null;      // the plan on screen
  var dirty = false;

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

  function savePlan() {
    cur.date = document.getElementById("planDate").value || todayISO();
    cur.id = cur.date;
    cur.start = document.getElementById("planStart").value || "16:00";
    cur.focus = document.getElementById("planFocus").value.trim();
    var at = -1;
    for (var i = 0; i < plans.length; i++) if (plans[i].id === cur.id) at = i;
    if (at >= 0) plans[at] = JSON.parse(JSON.stringify(cur));
    else plans.push(JSON.parse(JSON.stringify(cur)));
    sortPlans();
    if (!window.Store.savePlans(plans)) window.CC.toast("Could not save to this browser.");
    else window.CC.toast("Saved " + fmtDate(cur.date));
    dirty = false;
    renderHistory();
  }

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

  /* ---------- wiring ---------- */
  function wire() {
    document.getElementById("planDate").onchange = function () { cur.date = this.value; cur.id = this.value; dirty = true; render(); };
    document.getElementById("planStart").onchange = function () { cur.start = this.value; dirty = true; render(); };
    document.getElementById("planFocus").oninput = function () { cur.focus = this.value; dirty = true; };

    document.getElementById("btnAddItem").onclick = function () {
      cur.items.push({ mins: 10, title: "", note: "" }); dirty = true; render();
    };
    document.getElementById("btnSavePlan").onclick = savePlan;
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
    document.getElementById("btnPrint").onclick = function () { window.print(); };
  }

  function init(seedPlans) {
    plans = seedPlans || [];
    sortPlans();
    var today = todayISO(), found = null;
    for (var i = 0; i < plans.length; i++) if (plans[i].date === today) found = plans[i];
    cur = found ? JSON.parse(JSON.stringify(found)) : (plans[0] ? JSON.parse(JSON.stringify(plans[0])) : blank(today));
    wire(); renderBlocks(); renderHistory(); render();
  }

  return { init: init, getPlans: function () { return plans; } };
})();
