// ui.js — themed primitives. No native alert/confirm/prompt anywhere in the app.
import { el, add, clear, $ } from "./core.js";

let openModal = null;

export function modal({ title, body, actions = [], onClose }) {
  closeModal();
  const prevFocus = document.activeElement;

  const card = el("div", { class: "modal-card", role: "dialog", "aria-modal": "true",
    "aria-label": title || "Dialog" });
  add(card, el("h2", { class: "modal-title", text: title || "" }));
  const bodyWrap = el("div", { class: "modal-body" });
  add(bodyWrap, body);
  add(card, bodyWrap);

  // Primary-first, everywhere, without exception (§6.4).
  const row = el("div", { class: "modal-actions" });
  actions.forEach((a, i) => {
    add(row, el("button", {
      class: "btn " + (i === 0 ? "btn-primary" : (a.danger ? "btn-danger" : "btn-quiet")),
      type: "button",
      onclick: () => { const keep = a.onClick && a.onClick(); if (!keep) closeModal(); }
    }, a.label));
  });
  if (actions.length) add(card, row);

  const back = el("div", { class: "modal-backdrop", onclick: e => {
    if (e.target === back) closeModal();
  } }, card);

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key !== "Tab") return;
    const f = card.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  document.addEventListener("keydown", onKey);
  document.body.append(back);
  const focusTarget = card.querySelector("input, textarea, select, button");
  if (focusTarget) focusTarget.focus();

  openModal = () => {
    document.removeEventListener("keydown", onKey);
    back.remove();
    openModal = null;
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  };
  return closeModal;
}

export function closeModal() {
  if (openModal) openModal();
}

export function confirmModal({ title, message, confirmLabel = "Do it", danger = true, onConfirm }) {
  return modal({
    title,
    body: el("p", { class: "prose", text: message }),
    actions: [
      { label: confirmLabel, danger, onClick: () => { onConfirm && onConfirm(); } },
      { label: "Cancel" }
    ]
  });
}

export function promptModal({ title, label, value = "", multiline = false, confirmLabel = "Save", onConfirm, hint }) {
  const input = multiline
    ? el("textarea", { class: "field", rows: 5, id: "prompt-field" })
    : el("input", { class: "field", type: "text", id: "prompt-field" });
  input.value = value;
  const body = el("div", {});
  add(body,
    el("label", { class: "field-label", for: "prompt-field", text: label }),
    input,
    hint ? el("p", { class: "hint", text: hint }) : null
  );
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      onConfirm && onConfirm(input.value.trim());
      closeModal();
    }
  });
  return modal({
    title, body,
    actions: [
      { label: confirmLabel, onClick: () => { onConfirm && onConfirm(input.value.trim()); } },
      { label: "Cancel" }
    ]
  });
}

let toastTimer = null;
export function showToast(message, { action } = {}) {
  const host = $("#toast-host");
  if (!host) return;
  clear(host);
  const t = el("div", { class: "toast", role: "status" }, el("span", { text: message }));
  if (action) {
    add(t, el("button", {
      class: "toast-action", type: "button",
      onclick: () => { action.onClick(); clear(host); }
    }, action.label));
  }
  add(host, t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => clear(host), action ? 9000 : 4000);
}

// The collapsible "what this does" note every screen carries (§6.6).
export function explain(text) {
  const d = el("details", { class: "explain" });
  add(d, el("summary", { text: "What this does" }), el("p", { class: "prose", text }));
  return d;
}

// Returns [bar, spacer] together so a caller cannot forget the spacer (§6.2).
export function actionBar(...children) {
  const bar = el("div", { class: "action-bar" });
  add(bar, ...children);
  const spacer = el("div", { class: "action-bar-spacer", "aria-hidden": "true" });
  return [bar, spacer];
}

export function houseAidBadge() {
  return el("span", { class: "badge badge-house", title: "Invented for this app, not from the source", text: "house aid" });
}

// Refusals explain the rule (§6.4). Never "Not allowed".
export function refuse(message, ruleId) {
  showToast(message, ruleId ? {
    action: { label: "Why", onClick: () => location.hash = "#/rules/" + ruleId }
  } : undefined);
}

export function sectionNav(items, currentId) {
  const nav = el("nav", { class: "section-nav", "aria-label": "Sections" });
  for (const it of items) {
    add(nav, el("a", {
      class: "pill" + (it.id === currentId ? " pill-on" : ""),
      href: it.href,
      "aria-current": it.id === currentId ? "page" : null
    }, it.label, it.badge ? el("span", { class: "pill-badge", text: String(it.badge) }) : null));
  }
  return nav;
}

export function emptyState(message, actionLabel, href) {
  const box = el("div", { class: "empty" });
  add(box, el("p", { class: "prose", text: message }));
  if (actionLabel && href) add(box, el("a", { class: "btn btn-primary", href }, actionLabel));
  return box;
}

// A link into the rules library from an automated surface (§6.6 layer 2).
export function ruleLink(id, label = "the rule") {
  return el("a", { class: "rule-link", href: "#/rules/" + id }, label);
}
