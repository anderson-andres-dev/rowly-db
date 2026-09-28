// Landing de Rowly DB: celdas del fondo, el pájaro en píxeles, la
// instalación con los archivos de la última release y los temas (T).
// Sin JavaScript la página se lee entera y los enlaces llevan a releases.

const REPO = "anderson-andres-dev/rowly-db";
const CACHE_KEY = "rowly:latest-release";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Temas: los mismos que trae la app -----------------------------------
const THEMES = [
  { name: "rowly", accent: "#2eb8aa", soft: "#7fe3d6", ink: "#04191d", swatches: ["#34d1bf", "#b8dd7f", "#ff8f7a", "#6cc2ff", "#ff8ac8", "#f5c66e", "#b69cff"] },
  { name: "dracula", accent: "#bd93f9", soft: "#d6bcfa", ink: "#1e1b2e", swatches: ["#ff79c6", "#50fa7b", "#ffb86c", "#8be9fd", "#bd93f9", "#f1fa8c", "#ff5555"] },
  { name: "gruvbox", accent: "#fe8019", soft: "#fabd2f", ink: "#1d2021", swatches: ["#fb4934", "#b8bb26", "#fabd2f", "#83a598", "#d3869b", "#8ec07c", "#fe8019"] },
  { name: "nord", accent: "#88c0d0", soft: "#b5dbe5", ink: "#1c222b", swatches: ["#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#88c0d0", "#d08770"] },
  { name: "one dark", accent: "#61afef", soft: "#9ccbf5", ink: "#12151a", swatches: ["#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#d19a66"] },
  { name: "solarized", accent: "#2aa198", soft: "#6fc7bf", ink: "#00212b", swatches: ["#dc322f", "#859900", "#b58900", "#268bd2", "#d33682", "#2aa198", "#cb4b16"] },
];

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

let theme = THEMES[0];

function applyTheme(index) {
  theme = THEMES[index];
  const root = document.documentElement.style;
  root.setProperty("--accent", theme.accent);
  root.setProperty("--accent-soft", theme.soft);
  root.setProperty("--accent-ink", theme.ink);
  root.setProperty("--accent-rgb", hexToRgb(theme.accent).join(", "));
  for (const [i, swatch] of document.querySelectorAll(".swatches i").entries()) {
    swatch.style.background = theme.swatches[i % theme.swatches.length];
  }
  const name = document.querySelector("[data-theme-name]");
  if (name) name.textContent = theme.name;
  try {
    localStorage.setItem("rowly:site-theme", String(index));
  } catch {
    // Sin almacenamiento, el tema dura lo que la visita.
  }
}

function nextTheme() {
  applyTheme((THEMES.indexOf(theme) + 1) % THEMES.length);
}

let savedTheme = 0;
try {
  savedTheme = Number(localStorage.getItem("rowly:site-theme")) || 0;
} catch {
  savedTheme = 0;
}
applyTheme(savedTheme % THEMES.length);

document.addEventListener("keydown", (event) => {
  if (event.key !== "t" && event.key !== "T") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return;
  nextTheme();
});
document.querySelector("[data-theme-toggle]")?.addEventListener("click", nextTheme);

// --- Celdas del fondo -----------------------------------------------------
// Como las celdas de una grilla de resultados: más densas en los bordes y
// casi vacías al centro, para no competir con el texto.
function startField() {
  const canvas = document.getElementById("field");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const pitch = 18;
  const size = 9;
  let columns = 0;
  let rows = 0;
  let cells = new Float32Array(0);
  let targets = new Float32Array(0);
  let weight = new Float32Array(0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.ceil(window.innerWidth * dpr);
    canvas.height = Math.ceil(window.innerHeight * dpr);
    columns = Math.ceil(window.innerWidth / pitch);
    rows = Math.ceil(window.innerHeight / pitch);
    cells = new Float32Array(columns * rows);
    targets = new Float32Array(columns * rows);
    weight = new Float32Array(columns * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const dx = (x / columns - 0.5) * 2;
        const dy = (y / rows - 0.42) * 2;
        const distance = Math.min(1, Math.hypot(dx * 0.9, dy * 0.75));
        weight[y * columns + x] = Math.pow(distance, 2.4);
      }
    }
    for (let i = 0; i < cells.length; i += 1) {
      if (Math.random() < weight[i] * 0.22) cells[i] = targets[i] = 0.08 + Math.random() * 0.32;
    }
  }

  function draw() {
    const [r, g, b] = hexToRgb(theme.accent);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const alpha = cells[y * columns + x];
        if (alpha < 0.01) continue;
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        context.fillRect(x * pitch + 4, y * pitch + 4, size, size);
      }
    }
  }

  function step() {
    const changes = Math.max(4, Math.floor(cells.length / 260));
    for (let n = 0; n < changes; n += 1) {
      const i = Math.floor(Math.random() * cells.length);
      targets[i] = Math.random() < weight[i] * 0.3 ? 0.08 + Math.random() * 0.4 : 0;
    }
    for (let i = 0; i < cells.length; i += 1) cells[i] += (targets[i] - cells[i]) * 0.06;
    draw();
    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    draw();
  });
  if (reducedMotion) draw();
  else requestAnimationFrame(step);
}

// --- El pájaro, hecho de celdas ---------------------------------------------
function startBird() {
  const canvas = document.getElementById("bird");
  if (!canvas) return;
  const source = new Image();
  source.src = canvas.dataset.src;
  source.onload = () => {
    const grid = 32;
    const sampler = document.createElement("canvas");
    sampler.width = sampler.height = grid;
    const sample = sampler.getContext("2d", { willReadFrequently: true });
    sample.drawImage(source, 0, 0, grid, grid);
    const data = sample.getImageData(0, 0, grid, grid).data;
    const points = [];
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const i = (y * grid + x) * 4;
        if (data[i + 3] < 110) continue;
        // Claro (el cuerpo) o del color del tema (las alas).
        const light = data[i] > 200 && data[i + 1] > 200;
        points.push({ x, y, light, phase: Math.random() * Math.PI * 2 });
      }
    }
    const context = canvas.getContext("2d");
    const scale = canvas.width / grid;
    const start = performance.now();

    function frame(now) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const [r, g, b] = hexToRgb(theme.accent);
      const time = (now - start) / 1000;
      for (const point of points) {
        // Entra fila por fila, como un resultado que carga.
        const appear = reducedMotion ? 1 : Math.min(1, Math.max(0, time * 2.2 - point.y / 18));
        const twinkle = reducedMotion ? 1 : 0.78 + 0.22 * Math.sin(time * 2 + point.phase);
        const alpha = appear * twinkle;
        context.fillStyle = point.light ? `rgba(232, 239, 240, ${alpha})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        context.fillRect(point.x * scale + 1, point.y * scale + 1, scale - 2, scale - 2);
      }
      if (!reducedMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
}

// --- Instalación -------------------------------------------------------------
const PATTERNS = {
  deb: /amd64\.deb$/,
  rpm: /\.rpm$/,
  arch: /\.pkg\.tar\.zst$/,
  appimage: /\.AppImage$/,
  "mac-arm": /aarch64\.dmg$/,
  "mac-intel": /x64\.dmg$/,
  exe: /x64-setup\.exe$/,
  msi: /\.msi$/,
};

function detectTab() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return null;
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("mac os")) return "macos";
  if (ua.includes("fedora")) return "fedora";
  if (ua.includes("ubuntu") || ua.includes("debian")) return "debian";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return null;
}

function selectTab(id) {
  for (const tab of document.querySelectorAll(".tab")) {
    const selected = tab.dataset.tab === id;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of document.querySelectorAll(".panel")) panel.hidden = panel.dataset.panel !== id;
}

function setupTabs(detected) {
  const tabs = [...document.querySelectorAll(".tab")];
  for (const tab of tabs) {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const index = tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1);
      const next = tabs[(index + tabs.length) % tabs.length];
      next.focus();
      selectTab(next.dataset.tab);
    });
  }
  // Linux sin distro conocida: la primera pestaña de Linux.
  const initial = detected === "linux" ? "debian" : detected;
  selectTab(initial && document.querySelector(`[data-tab="${initial}"]`) ? initial : tabs[0].dataset.tab);

  const primary = document.querySelector("[data-primary]");
  if (primary && detected) {
    const os = detected === "windows" || detected === "macos" ? detected : "linux";
    const label = primary.dataset[`label${os[0].toUpperCase()}${os.slice(1)}`];
    if (label) primary.querySelector("[data-primary-label]").textContent = label;
  }
}

function setupCopy() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const block = button.closest(".cmd");
      const text = [...block.querySelectorAll(".line")].map((line) => line.textContent.replace(/^\$\s*/, "")).join("\n");
      const done = button.dataset.done;
      const idle = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = done;
      } catch {
        const range = document.createRange();
        range.selectNodeContents(block);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setTimeout(() => (button.textContent = idle), 1600);
    });
  }
}

async function latestRelease() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Sin almacenamiento se pide cada vez.
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const release = {
      version: data.tag_name,
      assets: (data.assets || [])
        .filter((asset) => !asset.name.endsWith(".sig"))
        .map((asset) => ({ name: asset.name, url: asset.browser_download_url })),
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(release));
    } catch {
      // Igual que arriba.
    }
    return release;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Los comandos y enlaces vienen escritos para la versión con que se publicó
// la página; si hay una más nueva, se reemplazan.
function applyRelease(release) {
  if (!release) return;
  for (const element of document.querySelectorAll("[data-version]")) element.textContent = release.version.replace(/^v/, "");
  for (const [key, pattern] of Object.entries(PATTERNS)) {
    const asset = release.assets.find((candidate) => pattern.test(candidate.name));
    if (!asset) continue;
    for (const element of document.querySelectorAll(`[data-url="${key}"]`)) {
      if (element.tagName === "A") element.href = asset.url;
      else element.textContent = asset.url;
    }
    for (const element of document.querySelectorAll(`[data-file="${key}"]`)) element.textContent = asset.name;
  }
}

startField();
startBird();
setupTabs(detectTab());
setupCopy();
latestRelease().then(applyRelease);
