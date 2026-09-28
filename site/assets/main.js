// Descargas: el sistema de quien visita y los instaladores de la última
// release. Sin JavaScript, o si la API de GitHub no responde, todos los
// enlaces llevan a la página de releases.

const REPO = "anderson-andres-dev/rowly-db";
const CACHE_KEY = "rowly:latest-release";

const PATTERNS = {
  "windows-exe": /x64-setup\.exe$/,
  "windows-msi": /\.msi$/,
  "macos-arm": /aarch64\.dmg$/,
  "macos-intel": /x64\.dmg$/,
  "linux-deb": /amd64\.deb$/,
  "linux-rpm": /\.rpm$/,
  "linux-arch": /\.pkg\.tar\.zst$/,
  "linux-appimage": /\.AppImage$/,
};

function detectOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return null;
  const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("mac os")) return "macos";
  if (platform.includes("linux") || ua.includes("linux") || ua.includes("x11")) return "linux";
  return null;
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

function applyOS(os) {
  const primary = document.querySelector("[data-primary]");
  if (!primary) return;
  if (!os) return;
  const label = primary.dataset[`label${os[0].toUpperCase()}${os.slice(1)}`];
  if (label) primary.querySelector("[data-primary-label]").textContent = label;
  document.querySelector(`.system[data-os="${os}"]`)?.classList.add("current");
}

function applyRelease(release, os) {
  if (!release) return;
  for (const element of document.querySelectorAll("[data-version]")) element.textContent = release.version;
  const urls = {};
  for (const [key, pattern] of Object.entries(PATTERNS)) {
    const asset = release.assets.find((candidate) => pattern.test(candidate.name));
    if (asset) urls[key] = asset.url;
  }
  for (const link of document.querySelectorAll("[data-asset]")) {
    const url = urls[link.dataset.asset];
    if (url) link.href = url;
  }
  // El botón principal baja directo el instalador del sistema; en Linux
  // lleva a la lista, porque hay varios formatos.
  const primary = document.querySelector("[data-primary]");
  const direct = { windows: urls["windows-exe"], macos: urls["macos-arm"] }[os];
  if (primary && direct) primary.href = direct;
}

const os = detectOS();
applyOS(os);
latestRelease().then((release) => applyRelease(release, os));
