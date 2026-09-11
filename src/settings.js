// settings.js — persisted preferences. Every optional surface reads a flag here.
const KEY = "rc.settings";

const DEFAULTS = {
  theme: "system",      // system | light | dark   (P10)
  textScale: 1,         // pays back the zoom lock (§6.2)
  showHouseAids: true,  // house-aid room-type list in the wizard
  // Defaults follow the fiction: the owner supplied One-Page Mythic, and the
  // Room Crafter assumes an emulator underneath it. Off means the blocked
  // surfaces go back to prompt-and-record.
  useMythic: true,
  confirmDestructive: true
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function get(key) {
  return load()[key];
}

export function set(key, value) {
  const s = load();
  s[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
  applyTheme();
  return value;
}

export function all() {
  return { ...load() };
}

export function replaceAll(obj) {
  cache = { ...DEFAULTS, ...(obj || {}) };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  applyTheme();
}

export function applyTheme() {
  // Also called from the store on import, which the node harness exercises
  // without a DOM — there is nothing to paint there.
  if (typeof document === "undefined") return;
  const s = load();
  const root = document.documentElement;
  if (s.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", s.theme);
  root.style.setProperty("--text-scale", String(s.textScale));
}

export const Settings = {
  theme: () => get("theme"),
  textScale: () => get("textScale"),
  showHouseAids: () => !!get("showHouseAids"),
  useMythic: () => !!get("useMythic"),
  confirmDestructive: () => !!get("confirmDestructive")
};
