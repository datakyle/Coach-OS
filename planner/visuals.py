"""Drill visuals for one practice: a court diagram per drill plus the coach's job.

Claude runs this after drafting a plan (it is not part of the web app):

    python3 planner/visuals.py 2026-10-22 out.pdf

Reads the plan from data/plans.json. Each item may carry a `visual` object, in
Coach OS court units (rim 280,93; baseline y=40; half court y=400; sidelines
x=30 and 530):

    o       offense   {"1": [x, y]}
    d       defense   {"1": [x, y, "GAP"]}      label optional
    c       coaches   {"Head": [x, y], "A": [x, y]}
    ball    [x, y]
    pack    true      draw the pack line
    cones   [[x, y], ...]
    lines   [{"t": "cut|pass|dribble|slide|closeout", "a": [x, y], "b": [x, y]}]
    nobase  [[x1, y1], [x2, y2]]   a "no baseline" bar
    circle  [cx, cy, r, n]         players standing in a circle
    lane    true      players on the free-throw lane spots
    label   short caption under the court
    coach   what the coaches do (required)

Branding follows the coaching PDF style: white and #f5f5f7, ink #1d1d1f,
Inter 400/600, blue #0d74ce for the defense and highlights, one amber dot.
Needs Playwright with Chromium.
"""
import json, math, os, sys, html
from playwright.sync_api import sync_playwright

INK, MUTED, SURF, LINE, BLUE, AMBER = "#1d1d1f", "#6e6e73", "#f5f5f7", "#c7c7cc", "#0d74ce", "#B8906A"
F = "font-family='Inter, sans-serif' "


def shorten(a, b, pa, pb):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    return [a[0] + dx / L * pa, a[1] + dy / L * pa], [b[0] - dx / L * pb, b[1] - dy / L * pb]


def zig(a, b, amp=6, step=14):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    ux, uy, nx, ny = dx / L, dy / L, -dy / L, dx / L
    n = max(3, int(L / step))
    pts = [a]
    for i in range(1, n):
        s = amp if i % 2 else -amp
        pts.append([a[0] + ux * L * i / n + nx * s, a[1] + uy * L * i / n + ny * s])
    pts.append(b)
    return "M " + " L ".join(f"{p[0]:.1f} {p[1]:.1f}" for p in pts)


def court(v, uid):
    s = [f'<svg viewBox="20 30 520 380" xmlns="http://www.w3.org/2000/svg">',
         f'<defs><marker id="i{uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0L10 5L0 10z" fill="{INK}"/></marker>'
         f'<marker id="b{uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0L10 5L0 10z" fill="{BLUE}"/></marker></defs>',
         f'<rect x="30" y="40" width="500" height="360" fill="#fff"/><rect x="220" y="40" width="120" height="190" fill="{SURF}"/>',
         f'<g fill="none" stroke="{LINE}" stroke-width="2"><rect x="30" y="40" width="500" height="360"/><rect x="220" y="40" width="120" height="190"/>'
         f'<circle cx="280" cy="230" r="60"/><path d="M 89.7 40 A 197.5 197.5 0 1 0 470.3 40"/><line x1="250" y1="80" x2="310" y2="80"/></g>',
         f'<circle cx="280" cy="93" r="9" fill="none" stroke="{MUTED}" stroke-width="2.4"/>']
    if v.get("pack"):
        s.append(f'<path d="M 129 40 A 160 160 0 1 0 431 40" fill="none" stroke="{BLUE}" stroke-width="2.2" stroke-dasharray="5 6"/>')
    for x, y in v.get("cones", []):
        s.append(f'<path d="M {x} {y-8} L {x+7} {y+5} L {x-7} {y+5} Z" fill="{AMBER}"/>')
    if v.get("lane"):
        for x, y in [(208, 140), (352, 140), (208, 185), (352, 185), (208, 100), (352, 100)]:
            s.append(f'<circle cx="{x}" cy="{y}" r="9" fill="#fff" stroke="{MUTED}" stroke-width="2"/>')
    if v.get("circle"):
        cx, cy, r, n = v["circle"]
        for i in range(n):
            a = 2 * math.pi * i / n
            s.append(f'<circle cx="{cx + r*math.cos(a):.1f}" cy="{cy + r*math.sin(a):.1f}" r="11" fill="#fff" stroke="{INK}" stroke-width="2.2"/>')
    if v.get("nobase"):
        (x1, y1), (x2, y2) = v["nobase"]
        s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
        s.append(f'<text x="{(x1+x2)/2}" y="{min(y1,y2)-8}" text-anchor="middle" {F}font-weight="600" font-size="13" fill="{INK}">No baseline</text>')
    for ln in v.get("lines", []):
        t, a, b = ln["t"], ln["a"], ln["b"]
        a2, b2 = shorten(a, b, 16, 16)
        defense = t in ("slide", "closeout")
        col, mk = (BLUE, f"b{uid}") if defense else (INK, f"i{uid}")
        if t == "pass":
            s.append(f'<path d="M {a2[0]:.1f} {a2[1]:.1f} L {b2[0]:.1f} {b2[1]:.1f}" fill="none" stroke="{col}" stroke-width="2.4" stroke-dasharray="8 6" marker-end="url(#{mk})"/>')
        elif t == "dribble":
            s.append(f'<path d="{zig(a2, b2)}" fill="none" stroke="{col}" stroke-width="2.4" marker-end="url(#{mk})"/>')
        elif t == "closeout":
            mid = [a2[0] + (b2[0] - a2[0]) * .66, a2[1] + (b2[1] - a2[1]) * .66]
            s.append(f'<path d="M {a2[0]:.1f} {a2[1]:.1f} L {mid[0]:.1f} {mid[1]:.1f}" fill="none" stroke="{col}" stroke-width="3"/>')
            s.append(f'<path d="{zig(mid, b2, 4, 7)}" fill="none" stroke="{col}" stroke-width="2.4" marker-end="url(#{mk})"/>')
        else:
            dash = ' stroke-dasharray="3 5"' if t == "slide" else ""
            s.append(f'<path d="M {a2[0]:.1f} {a2[1]:.1f} L {b2[0]:.1f} {b2[1]:.1f}" fill="none" stroke="{col}" stroke-width="2.6"{dash} marker-end="url(#{mk})"/>')
    for k, (x, y) in v.get("o", {}).items():
        s.append(f'<g transform="translate({x},{y})"><circle r="15" fill="#fff" stroke="{INK}" stroke-width="2.4"/><text y="5.5" text-anchor="middle" {F}font-weight="600" font-size="15" fill="{INK}">{k}</text></g>')
    for k, d in v.get("d", {}).items():
        x, y = d[0], d[1]
        lab = d[2] if len(d) > 2 else ""
        s.append(f'<g transform="translate({x},{y})" stroke="{BLUE}" stroke-width="4" stroke-linecap="round"><line x1="-9" y1="-9" x2="9" y2="9"/><line x1="-9" y1="9" x2="9" y2="-9"/></g>')
        if lab:
            s.append(f'<text x="{x}" y="{y+27}" text-anchor="middle" {F}font-weight="600" font-size="12" fill="{BLUE}">{lab.title()}</text>')
    for k, (x, y) in v.get("c", {}).items():
        lab = "C" if k == "Head" else k[0]
        s.append(f'<g transform="translate({x},{y})"><rect x="-14" y="-14" width="28" height="28" rx="7" fill="{INK}"/><text y="5" text-anchor="middle" {F}font-weight="600" font-size="13" fill="#fff">{lab}</text></g>')
    if v.get("ball"):
        x, y = v["ball"]
        s.append(f'<circle cx="{x}" cy="{y}" r="6.5" fill="{INK}" stroke="#fff" stroke-width="2"/>')
    s.append("</svg>")
    return "".join(s)


def clock(m):
    h, mm = divmod(m, 60)
    return f"{(h % 12) or 12}:{mm:02d}"


def pages(cards, per=4):
    out = []
    for i in range(0, len(cards), per):
        body = '<div class="grid">' + "".join(cards[i:i + per]) + "</div></div>"
        out.append(body if i == 0 else '<div class="page">' + body)
    return "".join(out)


def build(plan_id, out):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    plans = json.load(open(os.path.join(root, "data", "plans.json")))
    p = next(x for x in plans if x["id"] == plan_id)
    h, m = map(int, p.get("start", "16:00").split(":"))
    t = h * 60 + m
    import datetime
    d = datetime.date.fromisoformat(p["date"])
    cards = []
    for i, it in enumerate(p["items"]):
        v = it.get("visual")
        start = t
        t += int(it.get("mins") or 0)
        if not v:
            continue
        cap = f'<p class="cap">{html.escape(v["label"])}</p>' if v.get("label") else ""
        cards.append(f'''<section class="card"><div class="ch"><span class="tm">{clock(start)} · {it["mins"]} min</span><h3>{html.escape(it["title"])}</h3></div>
<div class="court">{court(v, i)}</div>{cap}<p class="coach"><b>Coaches</b>{html.escape(v["coach"])}</p></section>''')
    title = d.strftime("%A, %B %-d")
    doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@page{{size:Letter;margin:0}} *{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Inter,sans-serif;color:{INK};font-size:9.5pt;line-height:1.4;background:#fff}}
.wrap{{padding:0}}
.page{{width:8.5in;height:11in;padding:.45in .5in;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}}
.page:last-child{{page-break-after:auto}}
.grid{{flex:1;align-content:start}}
.head{{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px}}
h1{{font-size:24pt;font-weight:600;letter-spacing:-.02em;line-height:1.05}}
.dot{{display:inline-block;width:.24em;height:.24em;border-radius:50%;background:{AMBER};margin-left:.08em;vertical-align:.08em}}
.sub{{color:{MUTED};font-size:10pt;text-align:right;max-width:3.4in}}
.key{{display:flex;gap:14px;flex-wrap:wrap;font-size:8.5pt;color:{MUTED};margin-bottom:12px}}
.key span{{display:inline-flex;align-items:center;gap:5px}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
.card{{background:{SURF};border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:7px;break-inside:avoid}}
.ch{{display:flex;flex-direction:column;gap:1px}} .tm{{font-size:8pt;color:{MUTED};font-weight:600;letter-spacing:.04em;text-transform:uppercase}}
h3{{font-size:12pt;font-weight:600}}
.court svg{{width:100%;display:block;border-radius:10px}}
.cap{{font-size:8.6pt;color:{MUTED}}}
.coach{{background:#fff;border-radius:10px;padding:7px 9px;font-size:8.8pt}}
.coach b{{display:block;font-size:7.5pt;letter-spacing:.06em;text-transform:uppercase;color:{BLUE};margin-bottom:1px}}
</style></head><body><div class="wrap"><div class="page">
<div class="head"><h1>Drill visuals<span class="dot"></span><br><span style="font-size:13pt;color:{MUTED}">{title} · {html.escape(p.get("focus",""))}</span></h1>
<p class="sub">Where everyone stands and what the coaches do. Pair with the practice plan.</p></div>
<div class="key"><span>○ Offense</span><span style="color:{BLUE}">✕ Defense</span><span>■ Coach (C = head, A/B = assistants)</span><span style="color:{BLUE}">- - Pack line</span><span>— Cut · ‑ ‑ Pass · ∿ Dribble</span><span style="color:{BLUE}">Blue = defense moves</span><span style="color:{AMBER}">▲ Cone</span></div>
{pages(cards)}</div></body></html>'''
    tmp = out + ".html"
    open(tmp, "w").write(doc)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page()
        pg.goto("file://" + os.path.abspath(tmp))
        pg.wait_for_timeout(300)
        pg.pdf(path=out, format="Letter", print_background=True, prefer_css_page_size=True)
        b.close()
    os.remove(tmp)


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
