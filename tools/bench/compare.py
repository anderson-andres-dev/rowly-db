#!/usr/bin/env python3
"""Compara una medicion con la referencia (tools/bench/baseline/<etiqueta>/).

  compare.py tools/bench/baseline/v0.3.0 <carpeta-nueva> [--threshold 5]

Para cada archivo con el mismo nombre en ambas carpetas compara las medianas
(arranque, memoria) o los percentiles (editor, catalogo) y marca REGRESION
cuando el valor nuevo supera al de referencia por mas del umbral. Una
diferencia dentro de la dispersion medida de la referencia se marca REPETIR:
la spec pide repetir antes de decidir. Sale con 1 si hay alguna regresion.
"""

import argparse
import json
import sys
from pathlib import Path


def leaves(value, prefix=""):
    """Rutas a numeros comparables: medianas, p50/p95/p99 y totales."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key in ("runs", "samples", "environment", "remotes", "date", "note", "format", "n", "min", "stdev"):
                continue
            yield from leaves(child, f"{prefix}.{key}" if prefix else key)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        yield prefix, float(value)


def dispersion(data, path):
    """dispersion_pct del resumen al que pertenece la ruta, si existe."""
    node = data
    for part in path.split(".")[:-1]:
        node = node.get(part, {}) if isinstance(node, dict) else {}
    return node.get("dispersion_pct") if isinstance(node, dict) else None


# Lo que crece es peor salvo estas claves, que son conteos de contexto.
NEUTRAL = ("tables", "lines", "bytes", "statements", "indexSteps", "corpusStatements", "seconds", "dispersion_pct", "processes", "threads", "max")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline")
    parser.add_argument("current")
    parser.add_argument("--threshold", type=float, default=5.0)
    args = parser.parse_args()
    base_dir, cur_dir = Path(args.baseline), Path(args.current)
    regressions = 0
    for base_file in sorted(base_dir.glob("*.json")):
        cur_file = cur_dir / base_file.name
        if not cur_file.exists() or base_file.name == "summary.json":
            continue
        base, cur = json.loads(base_file.read_text()), json.loads(cur_file.read_text())
        cur_values = dict(leaves(cur))
        print(f"\n{base_file.name}")
        for path, old in leaves(base):
            if path not in cur_values or path.split(".")[-1] in NEUTRAL or old == 0:
                continue
            new = cur_values[path]
            change = 100 * (new - old) / abs(old)
            spread = dispersion(base, path)
            verdict = "ok"
            if change > args.threshold:
                verdict = "REPETIR" if spread is not None and change <= spread else "REGRESION"
                regressions += verdict == "REGRESION"
            print(f"  {verdict:9} {path}: {old:g} -> {new:g} ({change:+.1f} %)")
    sys.exit(1 if regressions else 0)


if __name__ == "__main__":
    main()
