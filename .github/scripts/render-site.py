#!/usr/bin/env python3
"""Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y {{date}}.

La versión y la URL se escriben en un solo lugar: aquí. En GitHub Actions,
VERSION es el tag de la última release publicada y SITE_URL es la variable
del repositorio (sin ella, la dirección de GitHub Pages). Con un dominio
propio también se escribe CNAME.

Uso local:  python3 .github/scripts/render-site.py _site && python3 -m http.server -d _site
"""

import datetime
import json
import os
import pathlib
import re
import shutil
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "site"
TEXT = {".html", ".xml", ".txt"}
DEFAULT_SITE = "https://anderson-andres-dev.github.io/rowly-db/"


def app_version() -> str:
    conf = json.loads((ROOT / "app/src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
    return conf["version"]


def main() -> None:
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    version = (os.environ.get("VERSION") or app_version()).removeprefix("v")
    site = os.environ.get("SITE_URL") or DEFAULT_SITE
    if not site.endswith("/"):
        site += "/"
    url = urlparse(site)
    if url.scheme != "https" or not url.netloc:
        sys.exit(f"SITE_URL tiene que ser una URL https completa: {site}")
    values = {
        "version": version,
        "site": site,
        "base": url.path or "/",
        "date": datetime.date.today().isoformat(),
    }

    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(SOURCE, out)

    for path in out.rglob("*"):
        if path.suffix not in TEXT:
            continue
        text = path.read_text(encoding="utf-8")
        for key, value in values.items():
            text = text.replace("{{" + key + "}}", value)
        left = re.findall(r"\{\{\w+\}\}", text)
        if left:
            sys.exit(f"{path.relative_to(out)}: quedan marcadores sin valor {sorted(set(left))}")
        path.write_text(text, encoding="utf-8")

    if not url.netloc.endswith(".github.io"):
        (out / "CNAME").write_text(url.netloc + "\n", encoding="utf-8")

    print(f"Sitio en {out} · versión {version} · {site}")


if __name__ == "__main__":
    main()
