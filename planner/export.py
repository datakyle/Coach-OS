"""Make both PDFs for one practice, the same way every time.

    python3 planner/export.py 2026-10-25 out/

Writes:
    out/Practice YYYY-MM-DD.pdf       the Coach OS sheet (exactly what the app's
                                      Download PDF makes)
    out/Drill Visuals YYYY-MM-DD.pdf  a court diagram per drill (planner/visuals.py)

Serves the repo on a local port, opens the Practice Plan page in headless
Chromium, loads the plan, and clicks Download PDF. Needs Playwright.
"""
import functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import visuals  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def plan_pdf(date, out):
    httpd = serve()
    port = httpd.server_address[1]
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(accept_downloads=True, viewport={"width": 1280, "height": 900})
            pg = ctx.new_page()
            pg.goto(f"http://127.0.0.1:{port}/#plan")
            pg.evaluate("localStorage.clear(); localStorage.setItem('cc.planmode','edit')")
            pg.reload()
            pg.wait_for_function("document.querySelectorAll('#histList .hrow').length > 0", timeout=15000)
            pg.wait_for_timeout(800)
            label = pg.evaluate(
                "d => new Date(+d.slice(0,4), +d.slice(5,7)-1, +d.slice(8,10)).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})",
                date)
            row = pg.locator("#histList .hrow", has_text=label).first
            if not row.count():
                raise SystemExit(f"No plan for {date} in data/plans.json")
            row.click()
            pg.wait_for_timeout(300)
            pg.locator("#page-plan .seg button[data-mode=publish]").click()
            pg.wait_for_timeout(1500)
            with pg.expect_download() as d:
                pg.click("#btnPdf")
            d.value.save_as(out)
            b.close()
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    date, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    a = os.path.join(outdir, f"Practice {date}.pdf")
    v = os.path.join(outdir, f"Drill Visuals {date}.pdf")
    plan_pdf(date, a)
    visuals.build(date, v)
    print(a)
    print(v)
