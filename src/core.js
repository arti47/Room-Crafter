// core.js — constants, DOM/util helpers, the dice. No imports.

// ── Dice ─────────────────────────────────────────────────────────────────────
// Cryptographic, not Math.random (template §5.1): a table asks, and there has to
// be an answer. Rejection sampling keeps the distribution flat.
export function d100() {
  const limit = 256 - (256 % 100); // 200; discard 200-255
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return (buf[0] % 100) + 1;
  }
}

export function uid(prefix = "id") {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return prefix + "_" + Array.from(buf, b => b.toString(16).padStart(2, "0")).join("");
}

// ── DOM ──────────────────────────────────────────────────────────────────────
// Null-safe by construction: nullish children are skipped, so `el("p", {}, maybe)`
// can never render the text "null" (defect D-1).
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  add(node, ...children);
  return node;
}

// Use this for every append of a value that can be null.
export function add(parent, ...children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === "") continue;
    parent.append(c.nodeType ? c : String(c));
  }
  return parent;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// ── Formatting ───────────────────────────────────────────────────────────────
export function when(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = Date.now();
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  if (mins < 60 * 24) return Math.floor(mins / 60) + "h ago";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function plural(n, one, many) {
  return n + " " + (n === 1 ? one : (many || one + "s"));
}

export const CACHE_VERSION = "rc-v1";
