// router.js — hash routing, the fixed frame, section nav and live-state badges.
import { el, add, clear, $ } from "./core.js";
import { icon, emptyState } from "./ui.js";
import { illustration } from "./graphics.js";
import * as store from "./store.js";
import * as screens from "./screens.js";
import * as wizard from "./wizard.js";
import * as sheet from "./sheet.js";
import * as tutorial from "./tutorial.js";
import * as print from "./print.js";
import { searchState, areaCount, searchedAreas, isWalkDone } from "./derived.js";

const TABS = [
  { id: "crawls", label: "Crawls", href: "#/crawls", icon: "crawls" },
  { id: "room", label: "Room", href: "#/room", icon: "room" },
  { id: "log", label: "Log", href: "#/log", icon: "log" },
  { id: "learn", label: "Learn", href: "#/rules", icon: "learn" },
  { id: "settings", label: "Settings", href: "#/settings", icon: "settings" }
];

export function parse(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return { name: "crawls", params: {} };
  switch (parts[0]) {
    case "crawls": return { name: "crawls", params: {} };
    case "crawl": return { name: "crawl", params: { crawlId: parts[1] } };
    case "wizard": return { name: "wizard", params: { roomId: parts[1] } };
    case "room": return { name: "room", params: { roomId: parts[1] || null } };
    case "log": return parts[1] === "distribution"
      ? { name: "distribution", params: {} } : { name: "log", params: {} };
    case "rules": return { name: "rules", params: { ruleId: parts[1] || null } };
    case "learn": return parts[1] === "tutorial"
      ? { name: "tutorial", params: {} } : { name: "rules", params: {} };
    case "settings": return { name: "settings", params: {} };
    case "print": return { name: "print", params: { kind: parts[1] === "crawl" ? "crawl" : "room", id: parts[2] } };
    default: return { name: "crawls", params: {} };
  }
}

const TAB_OF = {
  crawls: "crawls", crawl: "crawls", wizard: "room", room: "room",
  log: "log", distribution: "log", rules: "learn", tutorial: "learn", settings: "settings", print: "crawls"
};

// The room the app is currently "in" — the header follows it (§6.2).
function contextRoom(route) {
  if (route.params && route.params.roomId) return store.room(route.params.roomId);
  const cur = store.current();
  return cur.roomId ? store.room(cur.roomId) : null;
}

// A navigation starts at the top. A refresh — the same screen redrawn after an
// in-place action like a detail roll or a rename — keeps your place and keeps
// whatever folds you had open (audit A-30).
export function render(opts = {}) {
  const keep = !!opts.keepPlace;
  const y = keep ? window.scrollY : 0;
  const openFolds = keep ? snapshotFolds() : null;
  const inner = keep ? snapshotScrollers() : null;
  const route = parse(location.hash);
  const app = $("#screen");
  const barHost = $("#action-bar-host");
  const headerHost = $("#room-header-host");
  if (!app) return;

  let view;
  switch (route.name) {
    case "crawls": view = screens.crawls(); break;
    case "crawl": view = screens.crawl(route.params); break;
    case "wizard": view = wizard.render(route.params); break;
    case "room": {
      const rm = contextRoom(route);
      if (!rm) {
        view = { title: "Room", content: noRoom() };
      } else {
        if (!route.params.roomId) { location.replace("#/room/" + rm.id); return; }
        store.setCurrent({ crawlId: rm.crawlId, roomId: rm.id });
        view = sheet.render(route.params);
      }
      break;
    }
    case "log": view = screens.log(); break;
    case "distribution": view = screens.distribution(); break;
    case "rules": view = screens.rules(route.params); break;
    case "tutorial": view = tutorial.render(); break;
    case "settings": view = screens.settingsScreen(); break;
    case "print": view = print.render(route.params); break;
    default: view = screens.crawls();
  }

  // The print view is a page of paper: no frame around it.
  document.body.classList.toggle("print-view", route.name === "print");
  clear(app);
  add(app, view.content);

  clear(barHost);
  if (view.bar) add(barHost, view.bar);

  clear(headerHost);
  const rm = contextRoom(route);
  const inPlay = route.name === "room" || route.name === "wizard";
  if (inPlay && rm) add(headerHost, sheet.header(rm));

  renderTabs(route);
  document.title = view.title ? view.title + " · Room Crafter" : "Room Crafter";
  measureFrame();
  if (keep) {
    restoreFolds(openFolds);
    restoreScrollers(inner);
    window.scrollTo(0, Math.min(y, document.documentElement.scrollHeight));
  } else {
    app.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}

// Open <details> are keyed by their summary text plus how many earlier folds
// share it, which is stable across a redraw of the same screen.
function snapshotFolds() {
  const seen = {};
  const keys = new Set();
  for (const d of document.querySelectorAll("#screen details")) {
    const sum = d.querySelector(":scope > summary");
    const t = sum ? sum.textContent.trim() : "";
    seen[t] = (seen[t] || 0) + 1;
    if (d.open) keys.add(t + "#" + seen[t]);
  }
  return keys;
}

function restoreFolds(keys) {
  if (!keys || !keys.size) return;
  const seen = {};
  for (const d of document.querySelectorAll("#screen details")) {
    const sum = d.querySelector(":scope > summary");
    const t = sum ? sum.textContent.trim() : "";
    seen[t] = (seen[t] || 0) + 1;
    if (keys.has(t + "#" + seen[t])) d.open = true;
  }
}

// A column that scrolls on its own (the tablet Areas column) keeps its place
// across a refresh the same way the page does.
function snapshotScrollers() {
  const out = {};
  for (const n of document.querySelectorAll("#screen [data-keep-scroll][id]")) out[n.id] = n.scrollTop;
  return out;
}
function restoreScrollers(map) {
  for (const id in map || {}) {
    const n = document.getElementById(id);
    if (n) n.scrollTop = map[id];
  }
}

// The frame's real heights, as CSS variables: sticky offsets and in-page jumps
// land under the headers, and the toast clears the pinned bar.
function measureFrame() {
  const root = document.documentElement;
  const h = n => (n ? n.getBoundingClientRect().height : 0);
  root.style.setProperty("--head-h", Math.round(h($(".app-header")) + h($("#room-header-host"))) + "px");
  root.style.setProperty("--bar-live", Math.round(h($("#action-bar-host"))) + "px");
}
if (typeof window !== "undefined") {
  window.addEventListener("resize", () => measureFrame());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measureFrame());
}

// What the screens call after an in-place action.
function refresh() {
  render({ keepPlace: true });
}

function noRoom() {
  const cur = store.current();
  return emptyState("No room open. Rooms live inside a crawl — open one and start a room, and it stays here while you work on it.",
    cur.crawlId ? "Back to the crawl" : "Go to crawls", cur.crawlId ? "#/crawl/" + cur.crawlId : "#/crawls", illustration("door"));
}

function renderTabs(route) {
  const host = $("#tabbar");
  if (!host) return;
  clear(host);
  const activeTab = TAB_OF[route.name] || "crawls";
  const rm = contextRoom(route);
  for (const t of TABS) {
    // Live state travels: an open room shows its search progress on the tab (§6.3.8).
    // While the room is still being made the number that matters is keyword
    // progress, as in the room header; "0/0" Areas says nothing.
    let badge = null;
    if (t.id === "room" && rm) {
      const making = !isWalkDone(rm);
      const st = searchState(rm);
      if (making) badge = (rm.keywords || []).length + "/" + rm.budget;
      else if (st !== "complete") badge = searchedAreas(rm) + "/" + areaCount(rm);
    }
    add(host, el("a", {
      class: "tab" + (t.id === activeTab ? " tab-on" : ""),
      href: t.href,
      "aria-current": t.id === activeTab ? "page" : null
    }, icon(t.icon), el("span", { class: "tab-label", text: t.label }),
       badge ? el("span", { class: "tab-badge", text: badge }) : null));
  }
}

export function start() {
  wizard.setRerender(refresh);
  sheet.setRerender(refresh);
  screens.setRerender(refresh);
  window.addEventListener("hashchange", () => render());
  store.subscribe(() => renderTabs(parse(location.hash)));
  if (!location.hash) location.replace("#/crawls");
  render();
}
