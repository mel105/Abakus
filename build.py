# -*- coding: utf-8 -*-
"""Zlozi src/ do jedneho suboru abakus.html. Spustenie: python build.py"""
import pathlib

TU = pathlib.Path(__file__).resolve().parent
S = TU / "src"


def citaj(meno):
    return (S / meno).read_text(encoding="utf-8")


html = citaj("index.html")
for znacka, subor in (("/*STYLE*/", "style.css"), ("/*GRIDS*/", "grids.js"), ("/*CORE*/", "core.js"), ("/*UI*/", "ui.js")):
    obsah = citaj(subor)
    assert "</script>" not in obsah, subor
    html = html.replace(znacka, obsah)
(TU / "abakus.html").write_text(html, encoding="utf-8")
print("abakus.html: %d B" % len(html.encode("utf-8")))
