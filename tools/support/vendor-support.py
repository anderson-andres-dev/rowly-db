#!/usr/bin/env python3
"""Genera tools/support/vendor-support.json para SQL_ENGINE.md §5.2.

endoflife.date aporta el listado; los avisos oficiales del fabricante tienen
prioridad cuando discrepan. Se corre al preparar cada release.
"""
import json
import pathlib
import urllib.request

PRODUCTS = {"mysql": "mysql", "mariadb": "mariadb", "postgres": "postgresql"}
OUT = pathlib.Path(__file__).resolve().parents[2] / "tools/support/vendor-support.json"

# MySQL 8.0 paso a Sustaining Support el 2026-04-21: desde entonces no hay
# parches nuevos. https://www.mysql.com/support/eol-notice.html
OFFICIAL_EOL = {("mysql", "8.0"): "2026-04-21"}

data = {}
for engine, product in PRODUCTS.items():
    request = urllib.request.Request(f"https://endoflife.date/api/{product}.json", headers={"User-Agent": "rowly-db"})
    releases = json.load(urllib.request.urlopen(request))
    data[engine] = [
        {
            "release": r["cycle"],
            "lts": bool(r.get("lts")) or engine == "postgres",
            "eol": OFFICIAL_EOL.get((engine, r["cycle"]), r["eol"]),
        }
        for r in releases
        if isinstance(r.get("eol"), str)
    ]
OUT.write_text(json.dumps(data, indent=2) + "\n")
print(f"{OUT}: " + ", ".join(f"{e} {len(v)}" for e, v in data.items()))
