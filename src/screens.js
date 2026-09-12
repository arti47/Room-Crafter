// screens.js — home/crawls, crawl detail, roll log, distribution, rules, settings.
import { el, add, when, plural } from "./core.js";
import { explain, actionBar, modal, closeModal, promptModal, confirmModal, showToast, emptyState, sectionNav, houseAidBadge, radioGroup, downloadText, pickFile } from "./ui.js";
import { EXPLAIN, RULES_LIBRARY, ROLL_LOG_CAP } from "../data.js";
import { MYTHIC_RULES, MYTHIC } from "../data-mythic.js";
import * as store from "./store.js";
import * as settings from "./settings.js";
import { newRoomForm } from "./wizard.js";
import { searchState, STATE_LABEL, areaCount, searchedAreas } from "./derived.js";
import { crawlSummary } from "./lifecycle.js";

// ── Crawls (home) ────────────────────────────────────────────────────────────
export function crawls() {
  const content = el("div", {});
  add(content, el("h1", { class: "screen-title", text: "Crawls" }), explain(EXPLAIN.crawls));
  const list = store.crawls();

  if (!list.length) {
    add(content, emptyState("Nothing here yet. A crawl is a run of rooms — a dungeon, a house, one evening's exploring. One room is a perfectly good crawl.", null, null));
    add(content, el("p", { class: "hint" }, "New to this? ", el("a", { class: "rule-link", href: "#/learn/tutorial" }, "Walk through a first room"), "."));
  } else {
    const ul = el("ul", { class: "list list-cards" });
    for (const c of list) {
      const s = crawlSummary(c.id);
      add(ul, el("li", {}, el("a", { class: "row-card", href: "#/crawl/" + c.id },
        el("span", { class: "row-main", text: c.name }),
        el("span", { class: "row-sub", text: plural(s.rooms, "room") + " · " + s.complete + " fully explored · " + when(c.lastOpenedAt) })
      )));
    }
    add(content, ul);
  }

  const [bar, spacer] = actionBar(
    el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: newCrawl }, "New crawl")
  );
  add(content, spacer);
  return { title: "Crawls", content, bar };
}

function newCrawl() {
  promptModal({
    title: "New crawl", label: "What are you exploring?", confirmLabel: "Create",
    hint: "The tomb under the mill. The Ashcroft house. Tuesday.",
    onConfirm: name => {
      const c = store.createCrawl(name || "Untitled crawl");
      location.hash = "#/crawl/" + c.id;
    }
  });
}

// ── One crawl ────────────────────────────────────────────────────────────────
export function crawl(params) {
  const c = store.crawl(params.crawlId);
  if (!c) return { title: "Crawl", content: emptyState("That crawl is gone.", "Back to crawls", "#/crawls") };
  store.touchCrawl(c.id);
  const rooms = store.rooms(c.id);
  const content = el("div", {});
  add(content,
    el("h1", { class: "screen-title", text: c.name }),
    explain(EXPLAIN.crawl),
    el("p", { class: "meta", text: crawlSummary(c.id).lines.join(" · ") })
  );

  if (!rooms.length) {
    add(content, emptyState("No rooms yet. Start the first one — six keywords, or three if you are making a lot of them.", null, null));
  } else {
    const ul = el("ul", { class: "list list-cards" });
    for (const r of rooms) {
      const st = searchState(r);
      const walkDone = (r.keywords || []).length >= r.budget && !(r.keywords || []).some(k => k.use === "pending");
      add(ul, el("li", {}, el("a", { class: "row-card", href: (walkDone ? "#/room/" : "#/wizard/") + r.id },
        el("span", { class: "row-main", text: r.context.label || "Untitled room" }),
        el("span", { class: "row-sub", text: (r.context.roomType ? r.context.roomType + " · " : "") +
          searchedAreas(r) + "/" + areaCount(r) + " Areas · " + STATE_LABEL[st] }),
        el("span", { class: "row-chip res-" + st, text: st === "complete" ? "done" : st === "building" ? "unfinished" : "open" })
      )));
    }
    add(content, ul);
  }

  add(content, el("section", { class: "block block-end" },
    el("h2", { class: "block-title", text: "This crawl" }),
    el("div", { class: "stack" },
      el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => {
        promptModal({ title: "Rename crawl", label: "Name", value: c.name, onConfirm: v => {
          store.updateCrawl(c.id, { name: v || c.name }); rerender();
        } });
      } }, "Rename"),
      el("button", { class: "btn btn-danger btn-wide", type: "button", onclick: () => {
        confirmModal({
          title: "Delete this crawl?",
          message: "Deletes " + c.name + " and all " + plural(rooms.length, "room") + " in it, with every Area and everything searching turned up. One-step undo is offered afterwards.",
          confirmLabel: "Delete the crawl",
          onConfirm: () => {
            store.deleteCrawl(c.id);
            showToast("Crawl deleted.", { action: { label: "Undo", onClick: () => { store.undo(); rerender(); } } });
            location.hash = "#/crawls";
          }
        });
      } }, "Delete crawl")
    )
  ));

  const [bar, spacer] = actionBar(
    el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => startRoom(c.id) },
      rooms.length ? "Next room" : "First room")
  );
  add(content, spacer);
  return { title: c.name, content, bar };
}

function startRoom(crawlId) {
  const form = newRoomForm(crawlId, rm => { location.hash = "#/wizard/" + rm.id; });
  modal({
    title: "New room", body: form.body,
    actions: [
      { label: "Start the keyword walk", onClick: () => { closeModal(); form.create(); } },
      { label: "Cancel" }
    ]
  });
}

// ── Roll log ─────────────────────────────────────────────────────────────────
const LOG_PAGE = 25;
let logShown = LOG_PAGE;
let logFilter = "all";

export function log() {
  const content = el("div", {});
  add(content,
    sectionNav([
      { id: "log", label: "Rolls", href: "#/log" },
      { id: "dist", label: "Distribution", href: "#/log/distribution" }
    ], "log"),
    el("h1", { class: "screen-title", text: "Roll log" }),
    explain(EXPLAIN.log)
  );

  const all = store.rollLog();
  const tables = Array.from(new Set(all.map(r => r.table)));
  add(content, radioGroup({
    label: "Filter by table",
    options: ["all", ...tables].map(t => ({ id: t, label: t === "all" ? "All" : t })),
    value: logFilter, compact: true,
    onChange: t => { logFilter = t; logShown = LOG_PAGE; rerender(); }
  }));

  const rows = logFilter === "all" ? all : all.filter(r => r.table === logFilter);
  if (!rows.length) {
    add(content, emptyState("No rolls yet. Everything this app rolls lands here, with the table it came from.", null, null));
    return { title: "Roll log", content };
  }

  const ul = el("ul", { class: "list", "aria-live": "polite" });
  for (const r of rows.slice(0, logShown)) {
    add(ul, el("li", { class: "list-row" },
      el("span", { class: "die die-sm", text: String(r.roll) }),
      el("span", { class: "list-main", text: r.result },
        r.houseAid ? houseAidBadge() : null,
        r.mythic && MYTHIC ? el("span", { class: "badge", title: "From One-Page Mythic, not the Room Crafter article", text: "Mythic" }) : null),
      el("span", { class: "list-sub", text: r.table + (r.roomName ? " · " + r.roomName : "") + (r.context ? " · " + r.context : "") + " · " + when(r.ts) })
    ));
  }
  add(content, ul);

  if (rows.length > logShown) {
    add(content, el("button", { class: "btn btn-quiet btn-wide", type: "button",
      onclick: () => { logShown += LOG_PAGE; rerender(); } },
      "Show " + Math.min(LOG_PAGE, rows.length - logShown) + " more (" + (rows.length - logShown) + " left)"));
  }
  add(content, el("p", { class: "hint", text: "The log keeps the last " + ROLL_LOG_CAP + " rolls." }));
  add(content, el("section", { class: "block block-end" },
    el("button", { class: "btn btn-danger btn-wide", type: "button", onclick: () => {
      confirmModal({
        title: "Clear the roll log?",
        message: "Removes all " + all.length + " logged rolls, and with them the distribution view's history. Rooms and their finds are untouched. One-step undo is offered afterwards.",
        confirmLabel: "Clear the log",
        onConfirm: () => {
          store.clearRollLog();
          showToast("Log cleared.", { action: { label: "Undo", onClick: () => { store.undo(); rerender(); } } });
          rerender();
        }
      });
    } }, "Clear the log")
  ));
  return { title: "Roll log", content };
}

export function distribution() {
  const content = el("div", {});
  add(content,
    sectionNav([
      { id: "log", label: "Rolls", href: "#/log" },
      { id: "dist", label: "Distribution", href: "#/log/distribution" }
    ], "dist"),
    el("h1", { class: "screen-title", text: "Distribution" }),
    explain(EXPLAIN.distribution)
  );
  const { counts, total } = store.distribution();
  if (!total) {
    add(content, emptyState("Nothing rolled yet. Once there is a history, every face shows up here.", null, null));
    return { title: "Distribution", content };
  }
  const buckets = [];
  for (let lo = 1; lo <= 100; lo += 10) {
    let n = 0;
    for (let i = lo; i < lo + 10; i++) n += counts[i];
    buckets.push({ label: lo + "–" + (lo + 9), n });
  }
  const max = Math.max(...buckets.map(b => b.n), 1);
  const chart = el("div", { class: "chart" });
  for (const b of buckets) {
    add(chart, el("div", { class: "chart-row" },
      el("span", { class: "chart-label", text: b.label }),
      el("span", { class: "chart-bar" }, el("span", { class: "chart-fill", style: "width:" + Math.round(b.n / max * 100) + "%" })),
      el("span", { class: "chart-val", text: String(b.n) })
    ));
  }
  add(content, chart);
  add(content, el("p", { class: "meta", text: total + " rolls · expected " + (total / 10).toFixed(1) + " per band" }));
  return { title: "Distribution", content };
}

// ── Rules library ────────────────────────────────────────────────────────────
export function rules(params) {
  const content = el("div", {});
  add(content,
    sectionNav([
      { id: "rules", label: "Rules", href: "#/rules" },
      { id: "tutorial", label: "Tutorial", href: "#/learn/tutorial" }
    ], "rules"),
    el("h1", { class: "screen-title", text: "The rules" }),
    explain(EXPLAIN.rules)
  );

  const search = el("input", { class: "field", type: "search", id: "rules-search", placeholder: "Search the rules" });
  add(content, el("label", { class: "sr-only", for: "rules-search", text: "Search the rules" }), search);

  // Mythic's own entries join the library only while its toggle is on: a rule
  // the app does not apply has no business being described as one that it does.
  const entries = settings.get("useMythic") ? [...RULES_LIBRARY, ...MYTHIC_RULES] : RULES_LIBRARY;
  const groups = [];
  for (const r of entries) {
    let g = groups.find(x => x.name === r.group);
    if (!g) { g = { name: r.group, items: [] }; groups.push(g); }
    g.items.push(r);
  }

  const host = el("div", {});
  const details = [];
  for (const g of groups) {
    add(host, el("h2", { class: "block-title", text: g.name }));
    for (const r of g.items) {
      const d = el("details", { class: "fold rule-entry", id: "rule-" + r.id });
      add(d, el("summary", { text: r.title }),
        el("p", { class: "prose", text: r.body }),
        el("p", { class: "meta", text: "Source " + r.cite }));
      if (params && params.ruleId === r.id) d.open = true;
      details.push({ d, r });
      add(host, d);
    }
  }
  add(content, host);

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    for (const { d, r } of details) {
      const hit = !q || (r.title + " " + r.body + " " + r.group).toLowerCase().includes(q);
      d.hidden = !hit;
      d.open = !!q && hit;
    }
  });

  if (params && params.ruleId) {
    setTimeout(() => {
      const target = document.getElementById("rule-" + params.ruleId);
      if (target) target.scrollIntoView({ block: "center", behavior: "auto" });
    }, 0);
  }
  return { title: "The rules", content };
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function settingsScreen() {
  const content = el("div", {});
  add(content, el("h1", { class: "screen-title", text: "Settings" }), explain(EXPLAIN.settings));

  add(content, el("section", { class: "block" },
    el("h2", { class: "block-title", text: "Appearance" }),
    choiceRow("Theme", [
      { id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }
    ], settings.get("theme"), v => { settings.set("theme", v); rerender(); }),
    choiceRow("Text size", [
      { id: "1", label: "Normal" }, { id: "1.15", label: "Larger" }, { id: "1.3", label: "Largest" }
    ], String(settings.get("textScale")), v => { settings.set("textScale", Number(v)); rerender(); })
  ));

  add(content, el("section", { class: "block" },
    el("h2", { class: "block-title", text: "Content" }),
    toggleRow("Show house-aid suggestions", "The room-type list is invented for this app — the article has no such table. Turn it off to type your own only.",
      settings.get("showHouseAids"), v => { settings.set("showHouseAids", v); rerender(); }),
    toggleRow("Use One-Page Mythic", "Answers the encounter and hidden-search questions on the Ask The Game Master chart, rolls Random Events on a double, and adds Discover Meaning to the Random element. Turn it off and those go back to recording an answer you rolled yourself.",
      settings.get("useMythic"), v => { settings.set("useMythic", v); rerender(); })
  ));

  add(content, el("section", { class: "block" },
    el("h2", { class: "block-title", text: "Your data" }),
    el("p", { class: "prose", text: "Everything lives in this browser and nowhere else. Export writes plain JSON you can read, keep and re-import." }),
    el("div", { class: "stack" },
      el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: exportFlow }, "Export JSON"),
      el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: importFlow }, "Import JSON"),
      el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => {
        const repairs = store.checkData();
        modal({
          title: "Data check",
          body: repairs.length
            ? el("ul", { class: "summary" }, repairs.map(r => el("li", { text: r })))
            : el("p", { class: "prose", text: "Nothing needed repairing." }),
          actions: [{ label: "Good" }]
        });
        rerender();
      } }, "Check my data")
    )
  ));

  const last = store.lastUndo();
  add(content, el("section", { class: "block block-end" },
    el("h2", { class: "block-title", text: "Undo and erase" }),
    el("div", { class: "stack" },
      el("button", { class: "btn btn-quiet btn-wide", type: "button", disabled: !last, onclick: () => {
        const label = store.undo();
        showToast(label ? "Undid: " + label : "Nothing to undo.");
        rerender();
      } }, last ? "Undo: " + last.label : "Nothing to undo"),
      el("button", { class: "btn btn-danger btn-wide", type: "button", onclick: () => {
        confirmModal({
          title: "Erase everything?",
          message: "Deletes every crawl, every room and the whole roll log from this browser. Export first if you want any of it. One-step undo is offered afterwards.",
          confirmLabel: "Erase everything",
          onConfirm: () => {
            store.wipeAll();
            showToast("Everything erased.", { action: { label: "Undo", onClick: () => { store.undo(); rerender(); } } });
            location.hash = "#/crawls";
          }
        });
      } }, "Erase everything")
    )
  ));

  add(content, el("section", { class: "block block-end" },
    el("h2", { class: "block-title", text: "About" }),
    el("p", { class: "prose", text: "A personal play aid for The Room Crafter, the room-exploration variation from Mythic Magazine Vol. 69, with One-Page Mythic underneath it for the questions the article defers to an emulator. Rules paraphrased; the tables belong to their publisher. Built for one person's own use from their own copies." }),
    el("p", { class: "hint" }, "The room-type list is an invented convenience ", houseAidBadge(), ", not part of the article.")
  ));

  return { title: "Settings", content };
}

function choiceRow(label, options, currentId, onPick) {
  const wrap = el("div", { class: "setting" });
  add(wrap, el("p", { class: "field-label", text: label }));
  add(wrap, radioGroup({ label, options, value: currentId, wrap: false, onChange: onPick }));
  return wrap;
}

function toggleRow(label, hint, on, onChange) {
  const id = "t_" + label.replace(/\W+/g, "");
  const input = el("input", { type: "checkbox", id, checked: on ? true : null,
    onchange: e => onChange(e.target.checked) });
  // The whole row is the tap target; the harness measures the label, not the box.
  const lab = el("label", { class: "toggle", for: id });
  add(lab, input, el("span", { class: "toggle-text" },
    el("span", { class: "toggle-main", text: label }),
    el("span", { class: "toggle-hint", text: hint })));
  return lab;
}

function exportFlow() {
  const text = store.exportJSON();
  const stamp = new Date().toISOString().slice(0, 10);
  // A file first; the textarea stays as the fallback for a browser that blocks
  // downloads, and for anyone who would rather read what they are exporting.
  if (downloadText("room-crafter-" + stamp + ".json", text)) {
    showToast("Exported room-crafter-" + stamp + ".json", {
      action: { label: "Show text", onClick: () => exportTextFlow(text) }
    });
    return;
  }
  exportTextFlow(text);
}

function exportTextFlow(text) {
  const ta = el("textarea", { class: "field mono", rows: 12, readonly: true, "aria-label": "Exported JSON" });
  ta.value = text;
  modal({
    title: "Export",
    body: el("div", {}, ta, el("p", { class: "hint", text: "Copy this and keep it somewhere. Import puts it back." })),
    actions: [
      { label: "Copy", onClick: () => {
        ta.select();
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast("Copied."), () => showToast("Select the text and copy."));
        else showToast("Select the text and copy.");
        return true;
      } },
      { label: "Close" }
    ]
  });
}

function importFlow() {
  const ta = el("textarea", { class: "field mono", rows: 8, placeholder: "…or paste an exported Room Crafter file here", "aria-label": "JSON to import" });
  const status = el("p", { class: "hint", text: "Choose the file you exported, or paste its contents." });
  const chooser = el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: () => {
    pickFile(".json,application/json", text => { ta.value = text; status.textContent = "File loaded — now Merge or Replace."; });
  } }, "Choose a file");
  const apply = merge => {
    if (!ta.value.trim()) { showToast("Nothing to import yet."); return true; }
    const r = store.importJSON(ta.value, { merge });
    showToast(r.ok ? (merge ? "Merged " : "Imported ") + r.rooms + " room(s)." : r.error);
    rerender();
  };
  modal({
    title: "Import",
    body: el("div", {}, chooser, status, ta,
      el("p", { class: "hint", text: "Replacing overwrites what is here. Merging keeps both and skips anything already present." })),
    actions: [
      { label: "Merge", onClick: () => apply(true) },
      { label: "Replace everything", danger: true, onClick: () => apply(false) },
      { label: "Cancel" }
    ]
  });
}

let rerender = () => {};
export function setRerender(fn) { rerender = fn; }
