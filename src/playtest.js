// playtest.js — the hidden playtest mode (P19). A dev aid for the owner, not a
// rules surface: it walks docs/PLAYTEST.md step by step, records what the owner
// allows on its consent screen, and builds one .zip report to upload for
// analysis. Nothing leaves the device unless the owner shares that file.
//
// Hidden: seven taps on the version line in Settings → About open a passcode
// prompt (set on first use, asked once per browser session after that). Off,
// the mode installs no listeners and draws nothing.
import { el, add, clear, CACHE_VERSION } from "./core.js";
import { modal, closeModal, showToast, confirmModal, actionBar } from "./ui.js";
import { PLAYTEST_STEPS } from "../data-playtest.js";
import * as store from "./store.js";

const KEY = "rc.playtest";            // passcode hash, consent, the session
const UNLOCK = "rc.pt.unlocked";      // sessionStorage: unlocked for this browser session
const TRAIL_CAP = 3000, ERROR_CAP = 200;
export const CONSENT = [
  { id: "steps", label: "Step results and notes", hint: "Pass / Issue / Skip per step, your note, and the time spent on it." },
  { id: "trail", label: "Tap trail", hint: "Every tap and screen change: the control's label, the screen, the time and where on screen. Never anything you type." },
  { id: "errors", label: "Errors and device", hint: "Script errors, screen size, theme, text size, browser and app version." },
  { id: "snapshot", label: "App data snapshot", hint: "Your crawls, rooms and roll log at the moment the report is built — the same as Export JSON." },
  { id: "shots", label: "Screenshots", hint: "Only the ones you take with 📷 or attach with 📎. Never automatic." }
];

// ── State ────────────────────────────────────────────────────────────────────
function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* full: the trail is trimmed below */ }
}
function patch(fn) { const s = read(); fn(s); write(s); return s; }
export function isUnlocked() {
  try { return sessionStorage.getItem(UNLOCK) === "1"; } catch { return false; }
}
function setUnlocked(on) {
  try { on ? sessionStorage.setItem(UNLOCK, "1") : sessionStorage.removeItem(UNLOCK); } catch { /* private mode */ }
}
export function isActive() { const s = read(); return !!(s.session && s.session.active); }
function consent() {
  const c = read().consent || {};
  return Object.fromEntries(CONSENT.map(x => [x.id, c[x.id] !== false]));
}

// ── Passcode ─────────────────────────────────────────────────────────────────
async function digest(salt, code) {
  const data = new TextEncoder().encode(salt + ":" + code);
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }
  // No subtle crypto (an insecure origin): a plain FNV hash still keeps the code out of storage.
  let h = 2166136261;
  for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return "fnv" + h.toString(16);
}
const validCode = c => /^\d{4,8}$/.test(c);

// Seven taps within four seconds on `node` open the lock (P19).
export function armVersionTaps(node) {
  let taps = [];
  node.addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter(t => now - t < 4000).concat(now);
    if (taps.length >= 7) { taps = []; openLock(); }
  });
  return node;
}

export function openLock() {
  if (isUnlocked()) { location.hash = "#/playtest"; return; }
  const s = read();
  const first = !s.hash;
  const input = el("input", { class: "field", type: "password", id: "pt-code", inputmode: "numeric",
    autocomplete: "off", pattern: "[0-9]*", maxlength: "8" });
  const again = first ? el("input", { class: "field", type: "password", id: "pt-code2", inputmode: "numeric",
    autocomplete: "off", pattern: "[0-9]*", maxlength: "8" }) : null;
  const msg = el("p", { class: "hint", role: "alert" });
  const body = el("div", {},
    el("label", { class: "field-label", for: "pt-code", text: first ? "Set a passcode (4–8 digits)" : "Passcode" }), input,
    first ? el("label", { class: "field-label", for: "pt-code2", text: "Again" }) : null, again, msg);
  const submit = async () => {
    const code = input.value.trim();
    if (!validCode(code)) { msg.textContent = "4 to 8 digits."; return true; }
    if (first) {
      if (again.value.trim() !== code) { msg.textContent = "The two don't match."; return true; }
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, "0")).join("");
      const hash = await digest(salt, code);
      patch(st => { st.salt = salt; st.hash = hash; });
    } else if (await digest(s.salt, code) !== s.hash) {
      msg.textContent = "Not that one."; input.value = ""; return true;
    }
    setUnlocked(true);
    closeModal();
    location.hash = "#/playtest";
    return true;
  };
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
  if (again) again.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
  modal({ title: "Playtest mode", body, actions: [
    { label: first ? "Set and open" : "Open", onClick: () => { submit(); return true; } },
    { label: "Cancel" }
  ] });
}

// ── The session ──────────────────────────────────────────────────────────────
function newSession() {
  return { active: true, id: "pt-" + Date.now().toString(36), startedAt: Date.now(), step: 1,
    stepSince: Date.now(), results: {}, trail: [], errors: [], shots: [] };
}
function session() { return read().session || null; }
function updateSession(fn) { return patch(s => { if (s.session) fn(s.session); }).session; }

function stepByN(n) { return PLAYTEST_STEPS.find(s => s.n === n) || PLAYTEST_STEPS[0]; }

// Time on a step accrues while it is the current one.
function bankTime(ss) {
  const r = ss.results[ss.step] || (ss.results[ss.step] = { status: null, note: "", ms: 0 });
  r.ms += Math.max(0, Date.now() - (ss.stepSince || Date.now()));
  ss.stepSince = Date.now();
}
function goStep(n) {
  updateSession(ss => {
    bankTime(ss);
    ss.step = Math.max(1, Math.min(PLAYTEST_STEPS.length, n));
    trailPush(ss, { kind: "step", step: ss.step });
  });
  drawOverlay();
}
function setResult(status) {
  updateSession(ss => {
    bankTime(ss);
    const r = ss.results[ss.step];
    r.status = r.status === status ? null : status;
    r.at = Date.now();
  });
  const ss = session();
  if (ss && ss.results[ss.step] && ss.results[ss.step].status && ss.results[ss.step].status !== "issue") goStep(ss.step + 1);
  else drawOverlay();
}
function setNote(text) {
  updateSession(ss => {
    const r = ss.results[ss.step] || (ss.results[ss.step] = { status: null, note: "", ms: 0 });
    r.note = text;
  });
}

// ── Recording (only what consent allows) ─────────────────────────────────────
function trailPush(ss, ev) {
  if (!consent().trail) return;
  ss.trail.push({ t: Date.now(), route: location.hash || "#/", ...ev });
  if (ss.trail.length > TRAIL_CAP) ss.trail.splice(0, ss.trail.length - TRAIL_CAP);
}
function controlOf(target) {
  return target.closest && target.closest("button, a, summary, label, input, select, textarea, [role=button], [role=radio], [data-area]");
}
function labelOf(node) {
  if (!node) return "";
  if (node.matches("input, textarea, select")) return (node.getAttribute("aria-label") || node.id || node.name || node.tagName.toLowerCase()) + " [field]";
  const t = node.getAttribute("aria-label") || node.textContent || "";
  return t.replace(/\s+/g, " ").trim().slice(0, 60);
}
const onTap = e => {
  if (e.target.closest && e.target.closest("[data-pt-ignore]")) return;
  const c = controlOf(e.target);
  const ss = session();
  if (!ss) return;
  updateSession(s => trailPush(s, c
    ? { kind: "tap", label: labelOf(c), tag: c.tagName.toLowerCase(), x: Math.round(e.clientX), y: Math.round(e.clientY) }
    // A tap on something that does nothing: kept by class, never by its text.
    : { kind: "dead-tap", tag: e.target.tagName ? e.target.tagName.toLowerCase() : "?",
        cls: String(e.target.className && e.target.className.baseVal !== undefined ? e.target.className.baseVal : e.target.className || "").slice(0, 60),
        x: Math.round(e.clientX), y: Math.round(e.clientY) }));
};
const onRoute = () => updateSession(s => trailPush(s, { kind: "screen", scrollY: Math.round(window.scrollY) }));
function errorPush(entry) {
  if (!consent().errors) return;
  updateSession(s => { s.errors.push({ t: Date.now(), route: location.hash, ...entry }); if (s.errors.length > ERROR_CAP) s.errors.shift(); });
}
const onError = e => errorPush({ kind: "error", message: String(e.message || e.error || "error"), where: (e.filename || "") + ":" + (e.lineno || "") });
const onRejection = e => errorPush({ kind: "rejection", message: String(e.reason && (e.reason.message || e.reason)) });
let origConsoleError = null;

let listening = false;
function listen(on) {
  if (on === listening) return;
  listening = on;
  const m = on ? "addEventListener" : "removeEventListener";
  document[m]("click", onTap, true);
  window[m]("hashchange", onRoute);
  window[m]("error", onError);
  window[m]("unhandledrejection", onRejection);
  if (on) {
    origConsoleError = console.error;
    console.error = (...a) => { errorPush({ kind: "console", message: a.map(String).join(" ").slice(0, 500) }); origConsoleError.apply(console, a); };
  } else if (origConsoleError) { console.error = origConsoleError; origConsoleError = null; }
  window.__ptListening = on;
}

// ── Files: screenshots live in IndexedDB (too big for localStorage) ──────────
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("rc-playtest", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction("files", mode);
    const out = fn(tx.objectStore("files"));
    tx.oncomplete = () => { d.close(); res(out && out.result !== undefined ? out.result : out); };
    tx.onerror = () => { d.close(); rej(tx.error); };
  });
}
const putFile = (name, blob) => idb("readwrite", s => s.put(blob, name));
const getFile = name => idb("readonly", s => s.get(name));
const clearFiles = () => idb("readwrite", s => s.clear());

async function keepShot(blob, kind, ext) {
  const ss = session();
  if (!ss) return;
  const n = ss.shots.filter(x => x.step === ss.step).length + 1;
  const name = "screenshots/step-" + String(ss.step).padStart(2, "0") + "-" + n + "-" + kind + "." + ext;
  await putFile(name, blob);
  updateSession(s => s.shots.push({ name, step: s.step, kind, t: Date.now(), route: location.hash, bytes: blob.size }));
  drawOverlay();
  showToast("Kept " + name.split("/")[1]);
}

// ── In-app capture: the page as an SVG image, then a PNG ─────────────────────
// No library and no network: the live DOM is cloned into an SVG foreignObject
// with the app's own stylesheet and the resolved theme, drawn to a canvas.
// Where a browser will not let a canvas read that image, the SVG itself is kept.
let fontData = null;
async function fontURL() {
  if (fontData) return fontData;
  try {
    const buf = await (await fetch("./fonts/source-serif-4.woff2")).arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    fontData = "data:font/woff2;base64," + btoa(bin);
  } catch { fontData = ""; }
  return fontData;
}
async function cssText() {
  let css = "";
  try { css = await (await fetch("./styles.css")).text(); } catch { /* offline and uncached */ }
  const font = await fontURL();
  if (font) css = css.replace(/url\(["']?\.\/fonts\/source-serif-4\.woff2["']?\)/g, 'url("' + font + '")');
  // :root and body live on the wrapper and the body copy.
  return css.replace(/:root/g, ".pt-root").replace(/(^|[\s,{}>+~(])html(?=[\s.,:{[#>])/g, "$1.pt-root")
    .replace(/(^|[\s,{}>+~(])body(?=[\s.,:{[#>])/g, "$1.pt-body") +
    "\n*{animation:none!important;transition:none!important;caret-color:transparent!important}" +
    "\n[data-pt-ignore]{display:none!important}";
}
function rootVars(css) {
  const names = new Set(css.match(/--[a-z0-9-]+(?=\s*:)/gi) || []);
  const cs = getComputedStyle(document.documentElement);
  return Array.from(names).map(n => n + ":" + cs.getPropertyValue(n).trim()).filter(x => !/:$/.test(x)).join(";");
}
function cloneForShot(w, h) {
  const body = document.body;
  const copy = body.cloneNode(true);
  // Form state lives in properties, not attributes.
  const live = body.querySelectorAll("input, textarea, select, details");
  const dup = copy.querySelectorAll("input, textarea, select, details");
  live.forEach((n, i) => {
    const c = dup[i];
    if (!c) return;
    if (n.tagName === "TEXTAREA") c.textContent = n.value;
    else if (n.tagName === "SELECT") Array.from(c.options).forEach((o, j) => { if (j === n.selectedIndex) o.setAttribute("selected", ""); });
    else if (n.tagName === "DETAILS") { if (n.open) c.setAttribute("open", ""); }
    else if (n.type === "checkbox" || n.type === "radio") { if (n.checked) c.setAttribute("checked", ""); }
    else c.setAttribute("value", n.value);
  });
  // Sticky things are pinned where they sit now; a placeholder keeps the flow.
  const all = body.querySelectorAll("*"), cAll = copy.querySelectorAll("*");
  all.forEach((n, i) => {
    const c = cAll[i];
    if (!c || !(c instanceof Element)) return;
    const cs = getComputedStyle(n);
    if (cs.position === "sticky") {
      const r = n.getBoundingClientRect();
      const ph = document.createElement("div");
      ph.style.height = r.height + "px";
      c.before(ph);
      c.style.cssText += ";position:fixed;top:" + r.top + "px;left:" + r.left + "px;width:" + r.width + "px;margin:0";
    }
    if (n.scrollTop > 0 && n !== document.documentElement && n.firstElementChild && c.firstElementChild) {
      c.firstElementChild.style.marginTop = "-" + n.scrollTop + "px";
    }
  });
  copy.querySelectorAll("script, [data-pt-ignore]").forEach(n => n.remove());
  const wrapBody = document.createElement("div");
  wrapBody.className = "pt-body " + body.className;
  wrapBody.setAttribute("style", "margin-top:-" + Math.round(window.scrollY) + "px;min-height:" + h + "px;");
  while (copy.firstChild) wrapBody.appendChild(copy.firstChild);
  return wrapBody;
}
export async function captureScreen() {
  const w = window.innerWidth, h = window.innerHeight;
  const css = await cssText();
  const root = document.documentElement;
  const vars = rootVars(css);
  const wrap = document.createElement("div");
  wrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrap.className = "pt-root";
  if (root.dataset.theme) wrap.setAttribute("data-theme", root.dataset.theme);
  wrap.setAttribute("style", vars + ";" + (root.getAttribute("style") || "") + ";width:" + w + "px;height:" + h + "px;overflow:hidden;position:relative;font-size:" + getComputedStyle(root).fontSize);
  const style = document.createElement("style");
  style.textContent = css;
  wrap.appendChild(style);
  wrap.appendChild(cloneForShot(w, h));
  const xhtml = new XMLSerializer().serializeToString(wrap);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
    '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + "</foreignObject></svg>";
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    const png = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob")), "image/png"));
    return { blob: png, ext: "png" };
  } catch {
    return { blob: svgBlob, ext: "svg" };
  }
}

// ── The zip (store only, no compression: screenshots are already compressed) ─
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zip(files) {   // files: [{ name, bytes: Uint8Array }]
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.bytes), size = f.bytes.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, f.bytes);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

// ── The report ───────────────────────────────────────────────────────────────
function device() {
  const root = document.documentElement;
  return {
    app: CACHE_VERSION, userAgent: navigator.userAgent,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    theme: root.dataset.theme || "system", prefersDark: !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches),
    textScale: root.style.getPropertyValue("--text-scale") || "1",
    standalone: !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches),
    reducedMotion: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)
  };
}
const fmtMs = ms => { const s = Math.round((ms || 0) / 1000); return Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s"; };

export function reportMarkdown(ss, c, dev) {
  const lines = [];
  const res = n => ss.results[n] || {};
  const count = st => PLAYTEST_STEPS.filter(s => res(s.n).status === st).length;
  lines.push("# Room Crafter — playtest report", "",
    "- Session: " + ss.id + " · started " + new Date(ss.startedAt).toISOString() + " · built " + new Date().toISOString(),
    "- App: " + CACHE_VERSION + (dev ? " · " + dev.viewport.w + "×" + dev.viewport.h + " @" + dev.viewport.dpr + "x · theme " + dev.theme + " · text " + dev.textScale : ""),
    "- Recorded (consent): " + CONSENT.filter(x => c[x.id]).map(x => x.label).join(", "), "");
  if (c.steps) {
    lines.push("## Summary", "",
      "| Pass | Issue | Skip | Not marked |", "|---|---|---|---|",
      "| " + count("pass") + " | " + count("issue") + " | " + count("skip") + " | " + PLAYTEST_STEPS.filter(s => !res(s.n).status).length + " |", "");
    const issues = PLAYTEST_STEPS.filter(s => res(s.n).status === "issue" || (res(s.n).note || "").trim());
    if (issues.length) {
      lines.push("## Issues and notes", "");
      for (const s of issues) {
        const r = res(s.n);
        lines.push("### #" + s.n + " · " + (r.status || "note") + " · " + fmtMs(r.ms), "",
          "> " + s.do.replace(/\n/g, "\n> "), "", (r.note || "(no note)").trim(), "");
        const shots = (ss.shots || []).filter(x => x.step === s.n);
        if (shots.length) lines.push(shots.map(x => "![" + x.name + "](" + x.name + ")").join("\n"), "");
      }
    }
    lines.push("## Every step", "", "| # | Part | Status | Time | Shots | Note |", "|---|---|---|---|---|---|");
    for (const s of PLAYTEST_STEPS) {
      const r = res(s.n);
      lines.push("| " + s.n + " | " + s.part.replace(/^Part /, "") + " | " + (r.status || "—") + " | " + fmtMs(r.ms) + " | " +
        (ss.shots || []).filter(x => x.step === s.n).length + " | " + (r.note || "").replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 120) + " |");
    }
    lines.push("");
  }
  if (c.trail) {
    const dead = ss.trail.filter(x => x.kind === "dead-tap");
    const screens = {};
    let prev = null;
    for (const ev of ss.trail) {
      if (prev) { const k = (prev.route || "#/").replace(/\/(room|crawl|wizard|journal|print)_[a-z0-9]+/g, "/$1:id").replace(/(room|crawl):id\/[a-z0-9_]+/g, "$1:id"); screens[k] = (screens[k] || 0) + (ev.t - prev.t); }
      prev = ev;
    }
    lines.push("## Tap trail", "", "- Events: " + ss.trail.length + " · taps " + ss.trail.filter(x => x.kind === "tap").length + " · dead taps " + dead.length, "",
      "Time by screen:", "", ...Object.entries(screens).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => "- " + k + " — " + fmtMs(v)), "");
  }
  if (c.errors) {
    lines.push("## Errors", "", ss.errors.length ? ss.errors.map(e => "- " + new Date(e.t).toISOString() + " " + e.kind + " " + e.route + " — " + e.message).join("\n") : "None recorded.", "");
  }
  lines.push("_Raw data: data.json. Screenshots: screenshots/._", "");
  return lines.join("\n");
}

export async function buildReport() {
  const ss = session();
  if (!ss) return null;
  updateSession(bankTime);
  const fresh = session();
  const c = consent();
  const dev = c.errors ? device() : null;
  const data = {
    format: "room-crafter-playtest/1", app: CACHE_VERSION, consent: c, device: dev,
    session: { id: fresh.id, startedAt: fresh.startedAt, builtAt: Date.now(), currentStep: fresh.step },
    steps: c.steps ? PLAYTEST_STEPS.map(s => ({ n: s.n, part: s.part, section: s.section, ...(fresh.results[s.n] || {}) })) : null,
    trail: c.trail ? fresh.trail : null,
    errors: c.errors ? fresh.errors : null,
    shots: c.shots ? fresh.shots : null,
    snapshot: c.snapshot ? JSON.parse(store.exportJSON()) : null
  };
  const enc = new TextEncoder();
  const files = [
    { name: "report.md", bytes: enc.encode(reportMarkdown(fresh, c, dev)) },
    { name: "data.json", bytes: enc.encode(JSON.stringify(data, null, 1)) }
  ];
  if (c.shots) {
    for (const s of fresh.shots) {
      const blob = await getFile(s.name).catch(() => null);
      if (blob) files.push({ name: s.name, bytes: new Uint8Array(await blob.arrayBuffer()) });
    }
  }
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new File([zip(files)], "room-crafter-playtest-" + stamp + ".zip", { type: "application/zip" });
}

async function shareReport() {
  showToast("Building the report…");
  const file = await buildReport();
  if (!file) return;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Room Crafter playtest" }); return; } catch { /* cancelled: fall back to a download */ }
  }
  const a = el("a", { href: URL.createObjectURL(file), download: file.name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  showToast("Saved " + file.name);
}

// ── The floating panel (only while a session is on) ──────────────────────────
let open = false;
function rich(text) {   // **bold** and line breaks, nothing else
  const p = el("div", { class: "pt-rich" });
  for (const [i, line] of text.split("\n").entries()) {
    if (i) add(p, el("br"));
    line.split(/\*\*(.+?)\*\*/).forEach((bit, j) => add(p, j % 2 ? el("b", { text: bit }) : bit));
  }
  return p;
}
export function drawOverlay() {
  let host = document.getElementById("pt-overlay");
  const ss = session();
  if (!ss || !ss.active) { if (host) host.remove(); return; }
  if (!host) { host = el("div", { id: "pt-overlay", "data-pt-ignore": "" }); document.body.appendChild(host); }
  clear(host);
  const step = stepByN(ss.step);
  const r = ss.results[ss.step] || {};
  const done = PLAYTEST_STEPS.filter(s => (ss.results[s.n] || {}).status).length;
  if (!open) {
    add(host, el("button", { class: "pt-pill", type: "button", "aria-label": "Playtest: step " + ss.step + ". Open the panel", onclick: () => { open = true; drawOverlay(); } },
      el("span", { class: "pt-dot" + (r.status ? " pt-" + r.status : "") }), "#" + ss.step));
    return;
  }
  const note = el("textarea", { class: "field pt-note", rows: 2, placeholder: "What happened? What did you expect?", "aria-label": "Note for this step" });
  note.value = r.note || "";
  note.addEventListener("input", () => setNote(note.value));
  const attach = el("input", { type: "file", accept: "image/*", multiple: "", hidden: "", id: "pt-attach",
    onchange: async e => { for (const f of e.target.files) await keepShot(f, "attached", (f.name.split(".").pop() || "png").toLowerCase()); e.target.value = ""; } });
  const btn = (label, cls, fn, aria) => el("button", { class: "pt-btn " + cls, type: "button", onclick: fn, "aria-label": aria || label }, label);
  const shots = (ss.shots || []).filter(x => x.step === ss.step).length;
  add(host, el("div", { class: "pt-panel", role: "region", "aria-label": "Playtest" },
    el("div", { class: "pt-top" },
      el("span", { class: "pt-step", text: "Step " + ss.step + " / " + PLAYTEST_STEPS.length + " · " + done + " marked" }),
      btn("‹", "pt-nav", () => goStep(ss.step - 1), "Previous step"),
      btn("›", "pt-nav", () => goStep(ss.step + 1), "Next step"),
      btn("–", "pt-nav", () => { open = false; drawOverlay(); }, "Fold the panel")),
    el("p", { class: "pt-part", text: step.part + (step.section ? " · " + step.section : "") }),
    el("div", { class: "pt-body-scroll" }, rich(step.do), step.check ? el("div", { class: "pt-check" }, rich(step.check)) : null),
    el("div", { class: "pt-marks" },
      btn("Pass", "pt-pass" + (r.status === "pass" ? " on" : ""), () => setResult("pass")),
      btn("Issue", "pt-issue" + (r.status === "issue" ? " on" : ""), () => setResult("issue")),
      btn("Skip", "pt-skip" + (r.status === "skip" ? " on" : ""), () => setResult("skip"))),
    note,
    el("div", { class: "pt-tools" },
      consent().shots ? btn("📷 Capture", "", async () => {
        const shot = await captureScreen();
        await keepShot(shot.blob, "capture", shot.ext);
      }, "Capture this screen") : null,
      consent().shots ? btn("📎 Attach", "", () => attach.click(), "Attach a screenshot") : null,
      el("span", { class: "pt-count", text: shots ? shots + " 🖼" : "" }),
      el("a", { class: "pt-btn", href: "#/playtest", text: "Report" })),
    attach));
}

// ── The hidden screen (#/playtest) ───────────────────────────────────────────
export function render() {
  const content = el("div", { class: "pt-screen" });
  const s = read();
  const ss = s.session;
  const c = consent();
  add(content, el("h1", { class: "screen-title", text: "Playtest mode" }),
    el("p", { class: "prose", text: "Walks the play-through script one step at a time, and records only what is switched on below. Nothing leaves this device until you share the report." }));

  const box = el("section", { class: "block panel" }, el("h2", { class: "block-title", text: "What may be recorded" }));
  for (const x of CONSENT) {
    const cb = el("input", { type: "checkbox", id: "pt-c-" + x.id, onchange: e => { patch(st => { st.consent = { ...(st.consent || {}), [x.id]: e.target.checked }; }); } });
    cb.checked = c[x.id];
    add(box, el("label", { class: "toggle", for: "pt-c-" + x.id }, cb,
      el("span", { class: "toggle-text" }, el("span", { class: "toggle-main", text: x.label }), el("span", { class: "toggle-hint", text: x.hint }))));
  }
  add(content, box);

  if (ss) {
    const marked = PLAYTEST_STEPS.filter(x => (ss.results[x.n] || {}).status).length;
    const list = el("ol", { class: "pt-steps" });
    for (const st of PLAYTEST_STEPS) {
      const r = ss.results[st.n] || {};
      add(list, el("li", { class: (r.status ? "pt-" + r.status : "") + (st.n === ss.step ? " pt-current" : "") },
        el("button", { type: "button", class: "pt-step-link", onclick: () => { goStep(st.n); open = true; drawOverlay(); render2(); } },
          el("b", { text: "#" + st.n + " " }), st.do.split("\n")[0].replace(/\*\*/g, "").slice(0, 70))));
    }
    add(content, el("section", { class: "block" },
      el("h2", { class: "block-title", text: "This session" }),
      el("p", { class: "meta", text: marked + " of " + PLAYTEST_STEPS.length + " steps marked · " + (ss.shots || []).length + " screenshots · " +
        (ss.trail || []).length + " trail events · " + (ss.errors || []).length + " errors" }),
      el("details", { class: "fold" }, el("summary", { text: "Steps" }), list)));
  }

  add(content, el("section", { class: "block" },
    el("h2", { class: "block-title", text: "Lock" }),
    el("div", { class: "stack" },
      el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => { setUnlocked(false); location.hash = "#/settings"; } }, "Lock and leave"),
      el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => {
        patch(st => { delete st.hash; delete st.salt; });
        setUnlocked(false);
        showToast("Passcode cleared. Seven taps sets a new one.");
        location.hash = "#/settings";
      } }, "Forget the passcode"))));

  const actions = [];
  if (!ss) {
    actions.push(el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
      patch(st => { st.session = newSession(); });
      start();
      open = true;
      location.hash = "#/crawls";
      drawOverlay();
    } }, "Start the playtest"));
  } else {
    actions.push(el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: shareReport }, "Build the report (.zip)"));
    actions.push(el("div", { class: "bar-row pt-bar-row" },
      el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
        updateSession(x => { x.active = !x.active; x.stepSince = Date.now(); });
        start(); render2();
      } }, ss.active ? "Pause" : "Resume"),
      el("button", { class: "btn btn-danger", type: "button", onclick: () => confirmModal({
        title: "End and delete this session?",
        message: "Deletes this session's step results, notes, tap trail, errors and " + (ss.shots || []).length + " screenshots from this device. Build the report first if you want them. Your crawls and rooms are untouched.",
        confirmLabel: "End and delete",
        onConfirm: async () => { patch(st => { delete st.session; }); await clearFiles().catch(() => {}); start(); render2(); }
      }) }, "End session")));
  }
  const [bar, spacer] = actionBar(el("div", { class: "stack pt-actions" }, ...actions));
  add(content, spacer);
  return { title: "Playtest", content, bar };
}
let render2 = () => {};
export function setRerender(fn) { render2 = fn; }

// Boot, and after every change of state: listen and draw only while a session is on.
export function start() {
  const on = isActive();
  listen(on);
  drawOverlay();
}
