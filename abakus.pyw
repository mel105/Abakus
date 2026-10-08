# -*- coding: utf-8 -*-
"""Abakus - spustac. Len standardna kniznica Pythonu 3.
Dvojklik: spusti maly server na 127.0.0.1:8770 a otvori prehliadac.
Ak uz bezi rovnaka verzia, len otvori prehliadac. Stara verzia sa vypne a nahradi.
Server robi dve veci: podava abakus.html a nacitava kurzy CNB (/api/kurzy)."""
import json, os, sys, threading, time, urllib.request, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERZIA = "1.0"
PORT = 8770
ADRESA = "http://127.0.0.1:%d/" % PORT
TU = os.path.dirname(os.path.abspath(__file__))
CNB = "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt"
_kurzy = {"cas": 0.0, "data": None}


def log(text):
    try:
        with open(os.path.join(TU, "server.log"), "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + text + "\n")
    except OSError:
        pass


def nacitaj_kurzy():
    """Kurzovy listok CNB -> {"date": "RRRR-MM-DD", "rates": {"EUR": CZK za 1 EUR, ...}}. Drzi sa 30 minut."""
    if _kurzy["data"] and time.time() - _kurzy["cas"] < 1800:
        return _kurzy["data"]
    req = urllib.request.Request(CNB, headers={"User-Agent": "Abakus/" + VERZIA})
    with urllib.request.urlopen(req, timeout=10) as r:
        riadky = r.read().decode("utf-8").splitlines()
    d, m, rok = riadky[0].split()[0].split(".")
    kurzy = {}
    for riadok in riadky[2:]:
        p = riadok.split("|")
        if len(p) == 5:
            kurzy[p[3]] = float(p[4].replace(",", ".")) / float(p[2].replace(",", "."))
    if not kurzy:
        raise ValueError("prazdny kurzovy listok")
    _kurzy["data"] = {"date": "%s-%s-%s" % (rok, m, d), "rates": kurzy}
    _kurzy["cas"] = time.time()
    return _kurzy["data"]


class Obsluha(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def posli(self, kod, telo, typ="application/json; charset=utf-8"):
        if not isinstance(telo, bytes):
            telo = json.dumps(telo, ensure_ascii=False).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(telo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(telo)

    def do_GET(self):
        cesta = self.path.split("?")[0]
        if cesta in ("/", "/abakus.html"):
            with open(os.path.join(TU, "abakus.html"), "rb") as f:
                self.posli(200, f.read(), "text/html; charset=utf-8")
        elif cesta == "/api/ping":
            self.posli(200, {"app": "abakus", "verzia": VERZIA})
        elif cesta == "/api/kurzy":
            try:
                self.posli(200, nacitaj_kurzy())
            except Exception as e:  # bez internetu, proxy, zmena formatu
                log("kurzy: %r" % e)
                self.posli(502, {"chyba": str(e)})
        else:
            self.posli(404, {"chyba": "nenajdene"})

    def do_POST(self):
        if self.path == "/api/vypnut" and self.headers.get("Host", "").startswith("127.0.0.1"):
            self.posli(200, {"ok": True})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        else:
            self.posli(404, {"chyba": "nenajdene"})


def bezi():
    """Vrati verziu beziaceho Abakusu, alebo None."""
    try:
        with urllib.request.urlopen(ADRESA + "api/ping", timeout=1.5) as r:
            d = json.loads(r.read().decode("utf-8"))
            return d.get("verzia") if d.get("app") == "abakus" else None
    except Exception:
        return None


def main():
    otvor = "--bez-prehliadaca" not in sys.argv
    v = bezi()
    if v == VERZIA:
        if otvor:
            webbrowser.open(ADRESA)
        return
    if v is not None:  # stara verzia: vypnut a pockat na uvolnenie portu
        try:
            urllib.request.urlopen(urllib.request.Request(ADRESA + "api/vypnut", data=b"", method="POST"), timeout=3).read()
        except Exception:
            pass
        time.sleep(1.0)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Obsluha)
    except OSError as e:
        log("port %d je obsadeny: %r" % (PORT, e))
        if otvor:  # aspon otvor subor priamo, vsetko okrem kurzov CNB funguje aj tak
            webbrowser.open("file:///" + os.path.join(TU, "abakus.html").replace("\\", "/"))
        return
    if otvor:
        threading.Timer(0.4, lambda: webbrowser.open(ADRESA)).start()
    server.serve_forever()


if __name__ == "__main__":
    main()
