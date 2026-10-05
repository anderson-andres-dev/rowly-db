#!/usr/bin/env python3
"""Tamano del frontend compilado (app/build): JS que se carga al abrir la app
y totales.

  bundle.py app/build --label <etiqueta> --out <dir>/bundle.json

"JS inicial" es el cierre de imports estaticos de entry/start, entry/app, el
layout (nodes/0) y la pagina de la ruta "/" (la que abre la app). Los modulos
cargados despues con import() no cuentan.
"""

import argparse
import gzip
import json
import re
from pathlib import Path

STATIC_IMPORT = re.compile(r'(?:\bfrom\s*|\bimport\s*)"(\.{1,2}/[^"]+\.js)"')


def closure(start: list[Path]) -> set[Path]:
    seen: set[Path] = set()
    stack = list(start)
    while stack:
        path = stack.pop().resolve()
        if path in seen or not path.exists():
            continue
        seen.add(path)
        text = path.read_text(encoding="utf-8", errors="replace")
        stack += [path.parent / match for match in STATIC_IMPORT.findall(text)]
    return seen


def sizes(paths) -> dict:
    raw = sum(p.stat().st_size for p in paths)
    gz = sum(len(gzip.compress(p.read_bytes(), 9)) for p in paths)
    return {"files": len(list(paths)), "kb": round(raw / 1024, 1), "gzip_kb": round(gz / 1024, 1)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("build")
    parser.add_argument("--label")
    parser.add_argument("--out")
    args = parser.parse_args()
    root = Path(args.build) / "_app" / "immutable"
    index = (Path(args.build) / "index.html").read_text()
    entries = [Path(args.build) / m.lstrip("/") for m in re.findall(r'import\("([^"]+)"\)', index)]
    app = next(p for p in entries if p.name.startswith("app."))
    page = re.search(r'"/":\s*\[\s*(\d+)', app.read_text())
    nodes = [root / "nodes" / "0.js"] + ([root / "nodes" / f"{page.group(1)}.js"] if page else [])
    # Los nodos llevan hash en el nombre: se buscan por prefijo.
    nodes = [next(iter(sorted((root / "nodes").glob(f"{n.stem}.*.js"))), n) for n in nodes]
    initial = closure(entries + nodes)
    result = {
        "format": 1,
        "scenario": "bundle",
        "label": args.label,
        "initialJs": sizes(initial),
        "allJs": sizes(list(root.rglob("*.js"))),
        "allCss": sizes(list(root.rglob("*.css"))),
    }
    text = json.dumps(result, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text)
    print(text, end="")


if __name__ == "__main__":
    main()
