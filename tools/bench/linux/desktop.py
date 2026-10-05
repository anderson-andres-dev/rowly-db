#!/usr/bin/env python3
"""Arranque, memoria y reposo de una app de escritorio en Linux/Hyprland.

Mide desde fuera, sin instrumentar la app ni enviarle teclas, para poder
comparar el binario release de una version publicada con builds posteriores
y con otros clientes (Beekeeper Studio). La app se abre en un workspace
especial *silent* de Hyprland: no aparece en pantalla ni roba el foco. Cada
corrida usa un perfil vacio y aislado (XDG_* o --user-data-dir temporales):
nunca toca las conexiones ni los datos reales del usuario.

  desktop.py startup --app rowly [--binary /usr/bin/rowly-db] --mode warm --runs 20 --out x.json
  desktop.py startup --app rowly --mode cold --runs 20 --out x.json
  desktop.py idle    --app rowly --seconds 300 --out x.json

Senales (por corrida):
  window_ms   ejecucion -> la ventana existe en Hyprland
  settle_ms   ejecucion -> el arbol de procesos queda en reposo: en el ultimo
              segundo consumio menos de SETTLE_CPU_MS de CPU (aproxima la
              "primera interaccion" sin instrumentar la app)
  pss_mb      PSS sumado del arbol de procesos 5 s despues del reposo
  rss_mb      RSS sumado (cuenta dos veces lo compartido; solo de referencia)
  remotes     extremos TCP remotos abiertos por el arbol durante la corrida

"cold" expulsa de la cache de paginas, con posix_fadvise(DONTNEED), los
archivos que mapea la app (sin root). Las bibliotecas que otro proceso
tiene mapeadas no se pueden expulsar: es un arranque frio aproximado.
"""

import argparse
import json
import os
import platform
import shutil
import signal
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CLK_TCK = os.sysconf("SC_CLK_TCK")
PAGE_KB = os.sysconf("SC_PAGE_SIZE") // 1024
SETTLE_CPU_MS = 20  # en el ultimo segundo: 2 % de un nucleo
SETTLE_TIMEOUT_S = 30
SAMPLE_S = 0.05
WORKSPACE = "special:rowlybench"


def apps(binary: str | None):
    return {
        "rowly": {
            "label": "Rowly DB",
            "binary": binary or "/usr/bin/rowly-db",
            "isolate": "xdg",
        },
        "beekeeper": {
            "label": "Beekeeper Studio",
            "binary": binary or shutil.which("beekeeper-studio") or "beekeeper-studio",
            "isolate": "user-data-dir",
        },
    }


# --- Procesos -------------------------------------------------------------


def children(pid: int) -> list[int]:
    out = []
    task = Path(f"/proc/{pid}/task")
    try:
        for tid in task.iterdir():
            try:
                out += [int(c) for c in (tid / "children").read_text().split()]
            except OSError:
                pass
    except OSError:
        pass
    return out


def tree(root: int) -> list[int]:
    seen, stack = [], [root]
    while stack:
        pid = stack.pop()
        if pid in seen or not Path(f"/proc/{pid}").exists():
            continue
        seen.append(pid)
        stack += children(pid)
    return seen


def cpu_ticks(pids: list[int]) -> int:
    total = 0
    for pid in pids:
        try:
            fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
            total += int(fields[11]) + int(fields[12])  # utime + stime
        except (OSError, IndexError):
            pass
    return total


def memory(pids: list[int]) -> dict:
    pss = rss = 0
    threads = 0
    for pid in pids:
        try:
            for line in Path(f"/proc/{pid}/smaps_rollup").read_text().splitlines():
                key, _, value = line.partition(":")
                if key == "Pss":
                    pss += int(value.split()[0])
                elif key == "Rss":
                    rss += int(value.split()[0])
            for line in Path(f"/proc/{pid}/status").read_text().splitlines():
                if line.startswith("Threads:"):
                    threads += int(line.split()[1])
        except OSError:
            pass
    return {"pss_mb": round(pss / 1024, 1), "rss_mb": round(rss / 1024, 1), "processes": len(pids), "threads": threads}


def remotes(pids: list[int]) -> set[str]:
    try:
        out = subprocess.run(["ss", "-tnpH"], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.TimeoutExpired):
        return set()
    wanted = {f"pid={pid}," for pid in pids}
    found = set()
    for line in out.splitlines():
        if any(token in line for token in wanted):
            parts = line.split()
            if len(parts) >= 5:
                found.add(parts[4])
    return found


def mapped_files(pids: list[int]) -> set[str]:
    files = set()
    for pid in pids:
        try:
            for line in Path(f"/proc/{pid}/maps").read_text().splitlines():
                parts = line.split(maxsplit=5)
                if len(parts) == 6 and parts[5].startswith("/") and not parts[5].startswith(("/dev/", "/memfd:")):
                    files.add(parts[5].replace(" (deleted)", ""))
        except OSError:
            pass
    return files


def evict(files: set[str]) -> int:
    evicted = 0
    for name in files:
        try:
            fd = os.open(name, os.O_RDONLY)
        except OSError:
            continue
        try:
            os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
            evicted += 1
        finally:
            os.close(fd)
    return evicted


# --- Hyprland ---------------------------------------------------------------


def clients() -> list[dict]:
    out = subprocess.run(["hyprctl", "clients", "-j"], capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return []


def launch(app: dict, profile: Path) -> tuple[float, str]:
    """Lanza la app en el workspace especial; devuelve el instante y una marca."""
    marker = f"rowlybench-{os.getpid()}-{time.monotonic_ns()}"
    if app["isolate"] == "xdg":
        env = (
            f"XDG_DATA_HOME={profile}/data XDG_CONFIG_HOME={profile}/config "
            f"XDG_CACHE_HOME={profile}/cache ROWLY_BENCH_MARKER={marker}"
        )
        command = f"env {env} {app['binary']}"
    else:
        command = f"env ROWLY_BENCH_MARKER={marker} {app['binary']} --user-data-dir={profile}/data"
    for sub in ("data", "config", "cache"):
        (profile / sub).mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    # Hyprland >= 0.55 despacha en Lua; las reglas van como segundo argumento.
    lua = f'hl.dsp.exec_cmd({json.dumps(command)}, {{ workspace = "{WORKSPACE} silent" }})'
    subprocess.run(["hyprctl", "dispatch", lua], capture_output=True)
    return started, marker


def find_root(marker: str, timeout: float) -> int | None:
    """El primer proceso con la marca en su entorno cuyo padre no la tiene."""
    deadline = time.monotonic() + timeout
    needle = f"ROWLY_BENCH_MARKER={marker}".encode()
    while time.monotonic() < deadline:
        marked = []
        for entry in Path("/proc").iterdir():
            if not entry.name.isdigit():
                continue
            try:
                if needle in (entry / "environ").read_bytes():
                    marked.append(int(entry.name))
            except OSError:
                pass
        for pid in sorted(marked):
            try:
                parent = int(Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[1])
                comm = Path(f"/proc/{pid}/comm").read_text().strip()
            except (OSError, IndexError):
                continue
            # `env` ejecuta (exec) la app en el mismo pid; se ignora el sh de Hyprland.
            if parent not in marked and comm not in ("sh", "bash", "env"):
                return pid
        time.sleep(0.01)
    return None


def window_of(pids: list[int]) -> dict | None:
    for client in clients():
        if client.get("pid") in pids:
            return client
    return None


def close(root: int) -> None:
    pids = tree(root)
    subprocess.run(["hyprctl", "dispatch", f'hl.dsp.window.close({{ window = "pid:{root}" }})'], capture_output=True)
    # Si el cierre amable no llega (otra version del API), SIGTERM al proceso raiz.
    time.sleep(1)
    if Path(f"/proc/{root}").exists():
        try:
            os.kill(root, signal.SIGTERM)
        except OSError:
            pass
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline and any(Path(f"/proc/{p}").exists() for p in pids):
        time.sleep(0.1)
    for pid in pids:
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
    time.sleep(1)


# --- Corridas ---------------------------------------------------------------


def one_run(app: dict, cold_files: set[str] | None) -> dict:
    with tempfile.TemporaryDirectory(prefix="rowlybench-") as tmp:
        if cold_files is not None:
            evict(cold_files)
            time.sleep(0.5)
        started, marker = launch(app, Path(tmp))
        root = find_root(marker, SETTLE_TIMEOUT_S)
        if root is None:
            raise RuntimeError(f"{app['label']}: no aparecio el proceso")
        window_ms = None
        samples: list[tuple[float, int]] = []
        seen_remotes: set[str] = set()
        settle_ms = None
        last_remote_check = 0.0
        while time.monotonic() - started < SETTLE_TIMEOUT_S:
            now = time.monotonic()
            pids = tree(root)
            if window_ms is None and window_of(pids):
                window_ms = round((now - started) * 1000)
            samples.append((now, cpu_ticks(pids)))
            if now - last_remote_check > 0.5:
                seen_remotes |= remotes(pids)
                last_remote_check = now
            if window_ms is not None:
                window_start = [s for s in samples if s[0] >= now - 1.0]
                if now - started > 1.0 and window_start:
                    used_ms = (samples[-1][1] - window_start[0][1]) * 1000 / CLK_TCK
                    if used_ms < SETTLE_CPU_MS and samples[0][0] <= now - 1.0:
                        settle_ms = round((now - 1.0 - started) * 1000)
                        break
            time.sleep(SAMPLE_S)
        time.sleep(5)
        pids = tree(root)
        mem = memory(pids)
        seen_remotes |= remotes(pids)
        files = mapped_files(pids)
        close(root)
    return {"window_ms": window_ms, "settle_ms": settle_ms, **mem, "remotes": sorted(seen_remotes), "_files": files}


def summarize(values: list[float]) -> dict:
    values = [v for v in values if v is not None]
    if not values:
        return {}
    ordered = sorted(values)
    return {
        "n": len(values),
        "median": round(statistics.median(values), 1),
        "p95": round(ordered[min(len(ordered) - 1, round(0.95 * (len(ordered) - 1)))], 1),
        "min": round(ordered[0], 1),
        "max": round(ordered[-1], 1),
        "stdev": round(statistics.stdev(values), 1) if len(values) > 1 else 0.0,
        "dispersion_pct": round(100 * statistics.stdev(values) / statistics.median(values), 1) if len(values) > 1 and statistics.median(values) else 0.0,
    }


def environment(app: dict) -> dict:
    def read(path: str) -> str | None:
        try:
            return Path(path).read_text().strip()
        except OSError:
            return None

    power = {p.name: read(f"{p}/online") or read(f"{p}/status") for p in Path("/sys/class/power_supply").glob("*")}
    gpu = subprocess.run(["sh", "-c", "lspci | grep -iE 'vga|3d'"], capture_output=True, text=True).stdout.strip()
    webkit = subprocess.run(["sh", "-c", "pacman -Q webkit2gtk-4.1 2>/dev/null"], capture_output=True, text=True).stdout.strip()
    hypr = subprocess.run(["sh", "-c", "hyprctl version -j"], capture_output=True, text=True).stdout
    try:
        hypr_version = json.loads(hypr).get("tag")
    except json.JSONDecodeError:
        hypr_version = None
    return {
        "os": read("/etc/os-release") and dict(
            line.split("=", 1) for line in read("/etc/os-release").splitlines() if "=" in line
        ).get("PRETTY_NAME", "").strip('"'),
        "kernel": platform.release(),
        "cpu": next((l.split(":", 1)[1].strip() for l in read("/proc/cpuinfo").splitlines() if l.startswith("model name")), None),
        "cores": os.cpu_count(),
        "memory_gb": round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2**30, 1),
        "governor": read("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
        "platform_profile": read("/sys/firmware/acpi/platform_profile"),
        "power_supply": power,
        "gpu": gpu,
        "nvidia_mitigation": "no aplica: sin GPU NVIDIA" if "nvidia" not in gpu.lower() else "ver /proc/<pid>/environ (WEBKIT_DISABLE_DMABUF_RENDERER)",
        "compositor": f"Hyprland {hypr_version}" if hypr_version else None,
        "session": os.environ.get("XDG_SESSION_TYPE"),
        "webkitgtk": webkit or None,
        "workspace": f"{WORKSPACE} (silent, fuera de pantalla)",
        "binary": app["binary"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("scenario", choices=["startup", "idle"])
    parser.add_argument("--app", choices=["rowly", "beekeeper"], required=True)
    parser.add_argument("--binary")
    parser.add_argument("--mode", choices=["warm", "cold"], default="warm")
    parser.add_argument("--runs", type=int, default=20)
    parser.add_argument("--seconds", type=int, default=300)
    parser.add_argument("--label", help="p. ej. v0.3.0; se guarda en el resultado")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    if not os.environ.get("HYPRLAND_INSTANCE_SIGNATURE"):
        sys.exit("Necesita una sesion de Hyprland (usa hyprctl).")
    app = apps(args.binary)[args.app]

    result = {
        "format": 1,
        "scenario": args.scenario,
        "app": app["label"],
        "label": args.label,
        "date": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "environment": environment(app),
    }

    if args.scenario == "startup":
        # Una corrida de calentamiento: llena la cache y aprende que archivos mapea.
        warmup = one_run(app, None)
        files = warmup.pop("_files")
        runs = []
        for i in range(args.runs):
            run = one_run(app, files if args.mode == "cold" else None)
            files |= run.pop("_files")
            runs.append(run)
            print(f"{args.mode} {i + 1}/{args.runs}: ventana {run['window_ms']} ms, reposo {run['settle_ms']} ms, PSS {run['pss_mb']} MB", file=sys.stderr)
        result.update(
            mode=args.mode,
            settle_rule=f"<{SETTLE_CPU_MS} ms de CPU en el ultimo segundo",
            runs=runs,
            summary={key: summarize([r[key] for r in runs]) for key in ("window_ms", "settle_ms", "pss_mb", "rss_mb", "threads")},
            remotes=sorted({r for run in runs for r in run["remotes"]}),
        )
    else:
        with tempfile.TemporaryDirectory(prefix="rowlybench-") as tmp:
            started, marker = launch(app, Path(tmp))
            root = find_root(marker, SETTLE_TIMEOUT_S)
            if root is None:
                sys.exit("no aparecio el proceso")
            time.sleep(20)  # deja terminar el arranque antes de medir el reposo
            samples = []
            seen: set[str] = set()
            t0 = time.monotonic()
            ticks0 = cpu_ticks(tree(root))
            while time.monotonic() - t0 < args.seconds:
                pids = tree(root)
                samples.append({"t_s": round(time.monotonic() - t0, 1), "cpu_ticks": cpu_ticks(pids) - ticks0, **memory(pids)})
                seen |= remotes(pids)
                time.sleep(10)
            close(root)
        cpu_s = samples[-1]["cpu_ticks"] / CLK_TCK
        n = len(samples)
        xs = [s["t_s"] for s in samples]
        ys = [s["pss_mb"] for s in samples]
        mean_x, mean_y = sum(xs) / n, sum(ys) / n
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / max(1e-9, sum((x - mean_x) ** 2 for x in xs))
        result.update(
            seconds=args.seconds,
            connection="ninguna (perfil vacio)",
            cpu_seconds=round(cpu_s, 2),
            cpu_pct_of_one_core=round(100 * cpu_s / args.seconds, 2),
            pss_slope_mb_per_min=round(slope * 60, 3),
            pss_first_last_mb=[ys[0], ys[-1]],
            remotes=sorted(seen),
            samples=samples,
        )
    Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"escrito {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
