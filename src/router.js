// router.js — hash routing, the fixed frame, section nav and live-state badges.
import { el, add, clear, $ } from "./core.js";
import * as store from "./store.js";
import * as screens from "./screens.js";
import * as wizard from "./wizard.js";
import * as sheet from "./sheet.js";
import * as tutorial from "./tutorial.js";
import { searchState, areaCount, searchedAreas } from "./derived.js";

const TABS = [
  { id: "crawls", label: "Crawls", href: "#/crawls" },
  { id: "room", label: "Room", href: "#/room" },
  { id: "log", label: "Log", href: "#/log" },
  { id: "learn", label: "Learn", href: "#/rules" },
  { id: "settings", label: "Settings", href: "#/settings" }
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
    default: return { name: "crawls", params: {} };
  }
}

const TAB_OF = {
  crawls: "crawls", crawl: "crawls", wizard: "room", room: "room",
  log: "log", distribution: "log", rules: "learn", tutorial: "learn", settings: "settings"
};

// The room the app is currently "in" — the header follows it (§6.2).
function contextRoom(route) {
  if (route.params && route.params.roomId) return store.room(route.params.roomId);
  const cur = store.current();
  return cur.roomId ? store.room(cur.roomId) : null;
}

export function render() {
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
    default: view = screens.crawls();
  }

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
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}

function noRoom() {
  const cur = store.current();
  const box = el("div", { class: "empty" });
  add(box, el("p", { class: "prose", text: "No room open. Rooms live inside a crawl — open one and start a room, and it stays here while you work on it." }));
  add(box, el("a", { class: "btn btn-primary", href: cur.crawlId ? "#/crawl/" + cur.crawlId : "#/crawls" },
    cur.crawlId ? "Back to the crawl" : "Go to crawls"));
  return box;
}

function renderTabs(route) {
  const host = $("#tabbar");
  if (!host) return;
  clear(host);
  const activeTab = TAB_OF[route.name] || "crawls";
  const rm = contextRoom(route);
  for (const t of TABS) {
    // Live state travels: an open room shows its search progress on the tab (§6.3.8).
    let badge = null;
    if (t.id === "room" && rm) {
      const st = searchState(rm);
      if (st !== "complete") badge = searchedAreas(rm) + "/" + areaCount(rm);
    }
    add(host, el("a", {
      class: "tab" + (t.id === activeTab ? " tab-on" : ""),
      href: t.href,
      "aria-current": t.id === activeTab ? "page" : null
    }, el("span", { class: "tab-label", text: t.label }),
       badge ? el("span", { class: "tab-badge", text: badge }) : null));
  }
}

export function start() {
  wizard.setRerender(render);
  sheet.setRerender(render);
  screens.setRerender(render);
  window.addEventListener("hashchange", render);
  store.subscribe(() => renderTabs(parse(location.hash)));
  if (!location.hash) location.replace("#/crawls");
  render();
}
