// Landing de Rowly DB. Todo lo de aquí es una mejora: sin JavaScript los
// enlaces de descarga y los comandos se ven igual.

// --- Sistema sugerido -------------------------------------------------------
// Solo sugiere el sistema; la arquitectura no se adivina y ningún paquete se
// presenta como preferido. En móviles o si no está claro, los botones siguen
// diciendo "Download".
function detectPlatform() {
  const ua = navigator.userAgent;
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
  if (navigator.maxTouchPoints > 1 && /Mac/i.test(platform)) return null; // iPadOS
  if (/Win/i.test(platform)) return "windows";
  if (/Mac/i.test(platform)) return "macos";
  if (/Linux/i.test(platform) && !/CrOS/i.test(ua)) return "linux";
  return null;
}

const detected = detectPlatform();

if (detected) {
  const key = `label${detected[0].toUpperCase()}${detected.slice(1)}`;
  document.querySelectorAll("[data-cta]").forEach((cta) => {
    if (cta.dataset[key]) cta.querySelector("[data-cta-label]").textContent = cta.dataset[key];
  });
  document.querySelector(`[data-platform="${detected}"]`)?.classList.add("is-suggested");
}

// --- Pestañas accesibles ----------------------------------------------------
// Las de la terminal. Flechas, Inicio y Fin mueven el foco y activan la pestaña
// (patrón WAI-ARIA).
function setupTabs(list) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

  function select(index, focus) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i, false));
    tab.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: last }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next < 0 ? last : next > last ? 0 : next, true);
    });
  });

  select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true")), false);
}

document.querySelectorAll('[role="tablist"]').forEach(setupTabs);

// --- Copiar comandos --------------------------------------------------------
const live = document.querySelector(".live");

document.querySelectorAll("[data-copy]").forEach((button) => {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    const text = button.parentElement.querySelector("pre").textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = button.dataset.done || "Copied";
      if (live) live.textContent = live.dataset.copied;
    } catch {
      if (live) live.textContent = live.dataset.failed;
    }
    setTimeout(() => {
      button.textContent = label;
    }, 2000);
  });
});

// --- Menú móvil -------------------------------------------------------------
// Al elegir un enlace el menú se cierra; Escape también.
const menu = document.querySelector(".menu");
if (menu) {
  menu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
}
