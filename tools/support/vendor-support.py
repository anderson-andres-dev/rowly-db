#!/usr/bin/env python3
"""Genera app/src/lib/engines/vendorSupport.json con las fechas de fin de
soporte de cada version, desde endoflife.date (SQL_ENGINE.md §5.2). Se corre
al preparar cada release; nunca se editan las fechas a mano."""
import json
import pathlib
import urllib.request

PRODUCTS = {"mysql": "mysql", "mariadb": "mariadb", "postgres": "postgresql"}
OUT = pathlib.Path(__file__).resolve().parents[2] / "app/src/lib/engines/vendorSupport.json"

data = {}
for engine, product in PRODUCTS.items():
    request = urllib.request.Request(f"https://endoflife.date/api/{product}.json", headers={"User-Agent": "rowly-db"})
    releases = json.load(urllib.request.urlopen(request))
    data[engine] = [
        {"release": r["cycle"], "lts": bool(r.get("lts")) or engine == "postgres", "eol": r["eol"]}
        for r in releases
        if isinstance(r.get("eol"), str)
    ]
OUT.write_text(json.dumps(data, indent=2) + "\n")
print(f"{OUT}: " + ", ".join(f"{e} {len(v)}" for e, v in data.items()))
