// router.js — hash routing, the fixed frame, section nav and live-state badges.
import { el, add, clear, $ } from "./core.js";
import { icon, emptyState, closeModal } from "./ui.js";
import { illustration } from "./graphics.js";
import * as store from "./store.js";
import * as screens from "./screens.js";
import * as wizard from "./wizard.js";
import * as sheet from "./sheet.js";
import * as tutorial from "./tutorial.js";
import * as print from "./print.js";
import * as journal from "./journal.js";
import * as playtest from "./playtest.js";
import { searchState, areaCount, searchedAreas, isWalkDone } from "./derived.js";

// Four tabs (§6.3.1 allows 4–6). Play holds the crawls, the open room and its
// stages; it carries the open room's live progress (§6.3.8).
const TABS = [
  { id: "play", label: "Play", href: "#/crawls", icon: "room" },
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
    case "room": return { name: "room", params: { roomId: parts[1] || null, stage: parts[2] || null } };
    case "record": return { name: "room", params: { roomId: null, stage: "record" } };
    case "log": return parts[1] === "distribution"
      ? { name: "distribution", params: {} } : { name: "log", params: {} };
    case "rules": return { name: "rules", params: { ruleId: parts[1] || null } };
    case "learn": return parts[1] === "tutorial"
      ? { name: "tutorial", params: {} } : { name: "rules", params: {} };
    case "settings": return { name: "settings", params: {} };
    case "playtest": return { name: "playtest", params: {} };
    case "journal": return { name: "journal", params: { crawlId: parts[1] || store.current().crawlId } };
    case "print": return { name: "print", params: { kind: parts[1] === "crawl" ? "crawl" : "room", id: parts[2] } };
    default: return { name: "crawls", params: {} };
  }
}

const TAB_OF = {
  crawls: "play", crawl: "play", wizard: "play", room: "play",
  log: "log", distribution: "log", rules: "learn", tutorial: "learn", settings: "settings", print: "play", journal: "play", playtest: "settings"
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
        if (!route.params.roomId) { location.replace("#/room/" + rm.id + (route.params.stage ? "/" + route.params.stage : "")); return; }
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
    case "journal": view = journal.render(route.params); break;
    // Hidden (P19): locked, the route is simply Settings.
    case "playtest":
      if (!playtest.isUnlocked()) { location.replace("#/settings"); return; }
      view = playtest.render(); break;
    default: view = screens.crawls();
  }

  // The print view is a page of paper: no frame around it.
  document.body.classList.toggle("print-view", route.name === "print");
  clear(app);
  add(app, view.content);
  titleRows(app);
  oneCoach(app);
  // A new screen arrives like a page turn; a refresh in place never moves.
  if (!keep && view.content && view.content.classList) view.content.classList.add("screen-enter");

  clear(barHost);
  if (view.bar) add(barHost, view.bar);

  clear(headerHost);
  const rm = contextRoom(route);
  const inPlay = route.name === "room" || route.name === "wizard";
  // On room screens the room bar is the header (P17): the app header steps aside.
  document.body.classList.toggle("in-room", inPlay && !!rm);
  if (inPlay && rm) add(headerHost, sheet.header(rm, route.name === "wizard" ? "keywords" : (route.params.stage || sheet.naturalStage(rm))));

  renderTabs(route);
  document.title = view.title ? view.title + " · Room Crafter" : "Room Crafter";
  measureFrame();
  if (!keep) setTimeout(spotlight, 30);
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

// Every screen's heading carries its "what this does" ⓘ beside it, not under
// it: one row, one place to look (§6.6 keeps the note, collapsed).
function titleRows(app) {
  for (const h of app.querySelectorAll(".screen-title")) {
    const next = h.nextElementSibling;
    if (h.parentElement.classList.contains("title-row") || !next || !next.matches("details.explain")) continue;
    const row = el("div", { class: "title-row" });
    h.before(row);
    row.append(h, next);
  }
}

// One coach mark at a time (P17): the first one you can see is shown in full;
// the rest wait as ⓘ until it is dismissed. The words are all still there.
function oneCoach(app) {
  const seen = Array.from(app.querySelectorAll(".coach")).filter(c => !c.closest("[hidden]") && !c.closest("details:not([open])"));
  seen.slice(1).forEach(c => {
    const d = el("details", { class: "hint-i hint-waiting" });
    const p = c.querySelector(".hint");
    add(d, el("summary", { "aria-label": "How this works" }), p);
    c.replaceWith(d);
  });
  // The one left reads as a strip at the top of its section (P18), not a box
  // between the controls it explains.
  const first = seen[0];
  const sec = first && first.closest("section.block");
  const head = sec && sec.querySelector(":scope > .block-title");
  if (head && head.nextElementSibling !== first) head.after(first);
  if (first) first.classList.add("coach-strip");
}

// A tutorial step can ask the screen it opens to point at the control it
// means: the control pulses once, then the page is ordinary again.
function spotlight() {
  let sel = null;
  try { sel = sessionStorage.getItem("rc.spot"); sessionStorage.removeItem("rc.spot"); } catch { /* private mode */ }
  if (!sel) return;
  const t = document.querySelector(sel);
  if (!t) return;
  for (let d = t.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
  t.classList.add("spot");
  if (t.scrollIntoView) t.scrollIntoView({ block: "center" });
  setTimeout(() => t.classList.remove("spot"), 2600);
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
  const activeTab = TAB_OF[route.name] || "play";
  const rm = contextRoom(route);
  for (const t of TABS) {
    // Live state travels: an open room shows its search progress on the tab (§6.3.8).
    // While the room is still being made the number that matters is keyword
    // progress, as in the room header; "0/0" Areas says nothing.
    let badge = null;
    if (t.id === "play" && rm) {
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

// Entering a room from the home or crawl screen, the plan you tapped grows
// into the room's plan (P17) — where the browser can, and never under reduced
// motion. Everything else is an ordinary page turn.
let lastRoute = null;
function navigate() {
  const next = parse(location.hash);
  const from = lastRoute;
  lastRoute = next.name;
  const vt = typeof document.startViewTransition === "function" &&
    !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (vt && (from === "crawls" || from === "crawl") && next.name === "room") document.startViewTransition(() => render());
  else render();
}

function placeOf(route) {
  const kind = route.name === "wizard" ? "room" : route.name;
  return { kind, id: route.params.roomId || route.params.crawlId || null };
}

export function start() {
  wizard.setRerender(refresh);
  sheet.setRerender(refresh);
  journal.setRerender(refresh);
  playtest.setRerender(refresh);
  screens.setRerender(refresh);
  // A sheet belongs to the screen it was opened on: leaving closes it (P18).
  // A stage step inside the same room is not leaving it.
  let place = placeOf(parse(location.hash));
  window.addEventListener("hashchange", () => {
    const now = placeOf(parse(location.hash));
    if (now.kind !== place.kind || (now.id && place.id && now.id !== place.id)) closeModal();
    place = now;
    navigate();
  });
  store.subscribe(() => renderTabs(parse(location.hash)));
  if (!location.hash) location.replace("#/crawls");
  lastRoute = parse(location.hash).name;
  render();
}
