const root = document.documentElement;
const queryTheme = new URLSearchParams(location.search).get("theme");
const storedTheme = localStorage.getItem("rowly-mockup-theme");
const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function setTheme(theme, remember = false) {
  root.dataset.theme = theme;
  if (remember) localStorage.setItem("rowly-mockup-theme", theme);
  document.querySelectorAll("[data-theme-label]").forEach((label) => {
    label.textContent = theme === "dark" ? "Use light theme" : "Use dark theme";
  });
}

setTheme(queryTheme === "dark" || queryTheme === "light" ? queryTheme : storedTheme || systemTheme);

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });
});

const menuButton = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
menuButton?.addEventListener("click", () => {
  const open = mobileNav?.dataset.open !== "true";
  if (mobileNav) mobileNav.dataset.open = String(open);
  menuButton.setAttribute("aria-expanded", String(open));
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.dataset.open = "false";
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

const platform = /Mac/i.test(navigator.platform)
  ? "macOS"
  : /Win/i.test(navigator.platform)
    ? "Windows"
    : /Linux/i.test(navigator.platform)
      ? "Linux"
      : null;

document.querySelectorAll("[data-download-label]").forEach((label) => {
  const language = document.documentElement.lang;
  label.textContent = platform
    ? language === "es" ? `Descargar para ${platform}` : `Download for ${platform}`
    : language === "es" ? "Ver descargas" : "View downloads";
});

document.querySelectorAll("[data-workspace-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("aria-controls");
    document.querySelectorAll("[data-workspace-tab]").forEach((item) => {
      item.setAttribute("aria-selected", String(item === tab));
    });
    document.querySelectorAll("[data-workspace-panel]").forEach((panel) => {
      panel.hidden = panel.id !== target;
    });
  });
});

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

const enToEsArea = { ideas: "ideas", feedback: "feedback", bugs: "errores", questions: "preguntas" };
const esToEnArea = { ideas: "ideas", feedback: "feedback", errores: "bugs", preguntas: "questions" };
const pathParts = location.pathname.split("/").filter(Boolean);
const currentArea = pathParts.at(-1) === "index.html" ? pathParts.at(-2) : pathParts.at(-1);
if (document.documentElement.lang === "en" && currentArea in enToEsArea) {
  document.querySelectorAll('a[lang="es"]').forEach((link) => {
    link.href = `../../es/comunidad/${enToEsArea[currentArea]}/`;
  });
}
if (document.documentElement.lang === "es" && currentArea in esToEnArea) {
  document.querySelectorAll('a[lang="en"]').forEach((link) => {
    link.href = `../../../community/${esToEnArea[currentArea]}/`;
  });
}
