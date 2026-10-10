// sheet.js — the room sheet and its persistent header.
import { el, add, clear } from "./core.js";
import {
  explain, actionBar, modal, closeModal, promptModal, confirmModal, showToast,
  refuse, ruleLink, emptyState, radioGroup, shareText, iconTitle, icon, crumb, copyText, hint
} from "./ui.js";
import { roomPlan, bandStrip, elementBands, oddsBands, elementGlyph, illustration, findTone } from "./graphics.js";
import { EXPLAIN, MEANING_TABLES, ENCOUNTER_ANSWERS, ROOM_ELEMENTS } from "../data.js";
import * as store from "./store.js";
import * as roller from "./roller.js";
import * as lifecycle from "./lifecycle.js";
import * as mythic from "./mythic.js";
import { Settings } from "./settings.js";
import {
  areaCount, searchedAreas, searchedTotal, totalExplorable, generalDone,
  isComplete, searchState, STATE_LABEL, canSearchGeneral, nextStep,
  isWalkDone, roomHref, areaWords
} from "./derived.js";

// ── Persistent room header (sticky, under the app header) ────────────────────
// The two or three numbers that decide every choice stay visible while you read
// anything else (§6.2). While the room is being made, the number that matters
// is keyword progress, not search progress.
export function header(room) {
  if (!room) return null;
  // A room whose keyword walk is unfinished is still being made, whatever
  // Areas it already has.
  const state = isWalkDone(room) ? searchState(room) : "building";
  const bar = el("div", { class: "res-header", "aria-label": "Room status" });
  add(bar,
    el("span", { class: "res-name", text: room.context.label || "Untitled room" }),
    el("span", { class: "res-chip res-" + state, text: STATE_LABEL[state] }));
  if (state === "building") {
    const rolled = (room.keywords || []).length;
    add(bar, el("div", { class: "res-row" },
      el("span", { class: "res-stats" },
        el("span", { class: "res-stat", title: "Keywords rolled" },
          el("b", { text: rolled + "/" + room.budget }), el("small", { text: "Keywords" })),
        el("span", { class: "res-stat", title: "Areas so far" },
          el("b", { text: String(areaCount(room)) }), el("small", { text: "Areas" }))),
      meter(Array.from({ length: room.budget }, (_, i) => ({ on: i < rolled })))));
    return bar;
  }
  // One segment per Area in play order, then the General Area, outlined.
  const segs = [...room.areas].sort((a, b) => a.order - b.order).map(a => ({ on: !!a.search }));
  segs.push({ on: generalDone(room), gen: true });
  add(bar, el("div", { class: "res-row" },
    el("span", { class: "res-stats" },
      el("span", { class: "res-stat", title: "Areas plus the General Area, searched" },
        el("b", { text: searchedTotal(room) + "/" + totalExplorable(room) }),
        el("small", { text: "Explored" })),
      el("span", { class: "res-stat", title: "The General Area — the room itself" },
        el("b", { text: generalDone(room) ? "done" : "open" }),
        el("small", { text: "General" }))),
    meter(segs, state === "complete")));
  return bar;
}

function meter(segs, complete = false) {
  const m = el("span", { class: "meter-seg" + (complete ? " meter-complete" : ""), "aria-hidden": "true" });
  for (const sg of segs) add(m, el("i", { class: (sg.on ? "on" : "") + (sg.gen ? " gen" : "") }));
  return m;
}

// ── Screen ───────────────────────────────────────────────────────────────────
// The room is played as stages, in the article's order (R9): Keywords →
// Describe → Encounter → Search → Done, plus Record, the whole sheet at once.
// Every block is rendered on every stage and the others are hidden, so state,
// links and folds are one record; a stage only decides what you look at.
// Every stage can be opened at any time — the order is guidance, not a gate
// (R23: search all, some or none).
export const STAGES = [
  { id: "keywords", label: "Keywords", icon: "grid" },
  { id: "describe", label: "Describe", icon: "quill" },
  { id: "encounter", label: "Encounter", icon: "eye" },
  { id: "search", label: "Search", icon: "search" },
  { id: "done", label: "Done", icon: "flag" },
  { id: "record", label: "Record", icon: "learn" }
];

// Where the procedure is up to, as a stage.
export function naturalStage(room) {
  if (!isWalkDone(room)) return "keywords";
  const next = nextStep(room).step;
  if (next === "ask") return room.description ? "encounter" : "describe";
  if (next === "search" || next === "general") return "search";
  return "done";
}

function stageHref(room, id) {
  return id === "keywords" ? "#/wizard/" + room.id : "#/room/" + room.id + "/" + id;
}

// After a step of the procedure, follow it to wherever it now stands.
function toNatural(room) {
  const target = "#/room/" + room.id;
  if (location.hash !== target) location.hash = target;
  else rerender();
}

// The stepper: six stations, the current one lit, each a link.
export function stepper(room, current) {
  const done = {
    keywords: isWalkDone(room),
    describe: !!room.description,
    encounter: !!room.encounter || !!room.encounterSkipped,
    search: isComplete(room),
    done: false, record: false
  };
  const nav = el("nav", { class: "stepper", "aria-label": "Stages of the room" });
  for (const st of STAGES) {
    const on = st.id === current;
    const extra = st.id === "search" && isWalkDone(room) ? searchedTotal(room) + "/" + totalExplorable(room) : null;
    add(nav, el("a", {
      class: "step-link" + (on ? " on" : "") + (done[st.id] ? " ok" : ""),
      href: stageHref(room, st.id), "aria-current": on ? "step" : null
    }, el("span", { class: "step-ico" }, icon(st.icon)),
       el("span", { class: "step-label", text: st.label }),
       extra ? el("span", { class: "step-count", text: extra }) : null));
  }
  return nav;
}

export function render(params) {
  const room = store.room(params.roomId);
  if (!room) {
    return { title: "Room", content: emptyState("That room is gone.", "Back to crawls", "#/crawls", illustration("door")) };
  }
  if (!isWalkDone(room)) {
    return {
      title: "Room",
      content: emptyState("This room is still being made — its keywords are not finished.",
        "Continue the keyword walk", "#/wizard/" + room.id, illustration("plan"))
    };
  }
  const stage = STAGES.some(x => x.id === params.stage && x.id !== "keywords") ? params.stage : naturalStage(room);

  const content = el("div", { class: "room-screen stage-" + stage });
  const crawl = store.crawl(room.crawlId);
  add(content,
    crawl ? crumb("#/crawl/" + crawl.id, crawl.name) : null,
    stepper(room, stage),
    el("div", { class: "title-row" },
      el("h1", { class: "screen-title", text: room.context.label || "Untitled room" }),
      el("button", { class: "icon-btn room-menu-btn", type: "button", "aria-label": "Room actions",
        onclick: () => roomMenu(room) }, icon("more")),
      explain(EXPLAIN.room)),
    room.context.roomType ? el("p", { class: "meta", text: room.context.roomType }) : null,
    room.context.multiRoomNote
      ? el("p", { class: "meta", text: "Covers several spaces: " + room.context.multiRoomNote })
      : null,
    stage === "record" ? jumpRow() : null
  );

  // The article's order, top to bottom: the room, the encounter question, the
  // Areas, the General Area below them (R19), then the rarer folds. On Record
  // at tablet width (P8) the Areas and General Area are a right-hand column.
  const left = el("div", { class: "col col-room" });
  const right = el("div", { class: "col col-areas", id: "col-areas", "data-keep-scroll": "" });
  const more = el("div", { class: "col col-more" });
  add(left, show(descriptionBlock(room), stage, "describe"), show(encounterBlock(room), stage, "encounter"));
  add(right, show(areasBlock(room), stage, "search"), show(generalBlock(room), stage, "search"));
  add(more, show(askBlock(room), stage), show(hiddenBlock(room), stage), show(notesBlock(room), stage));
  add(content, el("div", { class: "two-col sheet-cols" + (stage === "record" ? "" : " one-stage") }, left, right, more));
  if (stage === "done") add(content, doneBlock(room));
  if (stage === "record") add(content, pager(room));

  if (stage !== "done" && stage !== "record") add(content, fab(room));
  const [bar, spacer] = actionBar(stage === "done" ? doneAction(room) : primaryAction(room));
  add(content, spacer);
  return { title: "Room", content, bar };
}

// A block shows on its own stage and on Record; elsewhere it stays in the
// record but out of sight.
function show(node, stage, own = null) {
  if (stage !== "record" && stage !== own) node.hidden = true;
  return node;
}

// The ⋯ menu: everything you do *to* the room rather than *in* it.
function roomMenu(room) {
  const row = (iconName, label, fn, cls = "") =>
    el("button", { class: "menu-row " + cls, type: "button", onclick: () => { closeModal(); fn(); } },
      icon(iconName), el("span", { text: label }));
  modal({
    title: room.context.label || "Untitled room",
    body: el("div", { class: "menu-list" },
      row("ask", "Read-aloud text", () => readAloud(room)),
      row("print", "Print this room", () => { location.hash = "#/print/room/" + room.id; }),
      row("door", "Next room in this crawl", () => nextRoomFlow(room)),
      row("crawls", "Back to the crawl", () => { location.hash = "#/crawl/" + room.crawlId; }),
      row("close", "Delete this room", () => deleteRoom(room), "menu-danger")),
    actions: []
  });
}

function deleteRoom(room) {
  confirmModal({
    title: "Delete this room?",
    message: "Deletes " + (room.context.label || "this room") + ", its " + areaCount(room) +
      " Areas and everything searching turned up. Its rolls stay in the log. One-step undo is offered afterwards.",
    confirmLabel: "Delete the room",
    onConfirm: () => {
      const crawlId = room.crawlId;
      store.deleteRoom(room.id);
      showToast("Room deleted.", { action: { label: "Undo", onClick: () => { store.undo(); rerender(); } } });
      location.hash = "#/crawl/" + crawlId;
    }
  });
}

// The + button: the three things you may do at any moment in a room — ask a
// question (R38), look for something hidden (R24), keep a note.
function fab(room) {
  const counts = { ask: (room.questions || []).length, hidden: (room.hidden || []).length };
  return el("button", { class: "fab", type: "button", "aria-label": "Ask, search for hidden things, or add a note",
    onclick: () => {
      const row = (iconName, label, n, build) =>
        el("button", { class: "menu-row", type: "button", onclick: () => foldSheet(room, label, build) },
          icon(iconName), el("span", { text: label }), n ? el("span", { class: "menu-count", text: String(n) }) : null);
      modal({
        title: room.context.label || "Untitled room",
        body: el("div", { class: "menu-list" },
          row("ask", "Ask the GM", counts.ask, askBody),
          row("search", "Hidden things", counts.hidden, hiddenBody),
          row("quill", "Notes", 0, notesBody)),
        actions: []
      });
    } }, icon("plus"));
}

// A fold's body in a sheet of its own, redrawn in place after each action.
function foldSheet(room, title, build) {
  const host = el("div", {});
  const redraw = () => { clear(host); add(host, build(room, redraw)); rerender(); };
  add(host, build(room, redraw));
  modal({ title, body: host, actions: [{ label: "Done", onClick: () => rerender() }] });
}

// The end of the procedure: no conclusion roll (R22), a summary, the stamp
// when the room is fully explored, and every onward route (§6.3.6).
function doneBlock(room) {
  const box = el("section", { class: "block done-block", id: "sec-done" });
  const lines = lifecycle.roomSummary(room);
  add(box,
    isComplete(room) ? el("p", { class: "stamp stamp-lg", "aria-hidden": "true", text: STATE_LABEL.complete }) : null,
    roomPlan(room),
    el("ul", { class: "summary done-summary" }, lines.map(l => el("li", { text: l }))),
    !isComplete(room) ? el("p", { class: "hint", text: "Areas are still unsearched. That is a real state — the room is described rather than searched, and you can come back to it." }) : null,
    el("p", { class: "hint" }, "Searching is optional — a room you only looked at is a finished room. ", ruleLink("complete", "The rule"), "."),
    el("div", { class: "done-actions" },
      el("button", { class: "btn btn-quiet", type: "button", onclick: () => readAloud(room) }, icon("ask"), "Read-aloud text"),
      el("a", { class: "btn btn-quiet", href: "#/print/room/" + room.id }, icon("print"), "Print this room"),
      el("a", { class: "btn btn-quiet", href: "#/crawl/" + room.crawlId }, icon("crawls"), "Back to the crawl")),
    pager(room));
  return box;
}

function doneAction(room) {
  return el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => nextRoomFlow(room) },
    "Next room in this crawl");
}

// The one control the screen exists for, always above the fold (§6.3.2), and
// it follows the article's own order: ask → search → General Area → finish.
function primaryAction(room) {
  const next = nextStep(room);
  if (next.step === "ask") {
    if (Settings.useMythic()) {
      return el("div", { class: "bar-stack" },
        el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => askEncounter(room, mythic.DEFAULT_ODDS) },
          "Ask: is there an encounter? (50/50)"),
        el("button", { class: "btn-link", type: "button", onclick: () => { lifecycle.skipEncounter(room); toNatural(room); } },
          "Skip the question"));
    }
    return el("div", { class: "bar-stack" },
      el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
        const t = document.getElementById("sec-encounter");
        if (t) t.scrollIntoView({ block: "start" });
      } }, "Record: is there an encounter?"),
      el("button", { class: "btn-link", type: "button", onclick: () => { lifecycle.skipEncounter(room); toNatural(room); } },
        "Skip the question"));
  }
  if (next.step === "search") {
    return el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => doSearch(room, next.areaId) },
      "Search: " + trim(next.areaName, 28));
  }
  if (next.step === "general") {
    return el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => doGeneral(room) },
      "Search the General Area");
  }
  return el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => finishRoom(room) },
    "Finish this room");
}

function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

// In-page jumps, not links: the app routes on the hash, so an anchor href would
// navigate instead of scrolling.
function jumpRow() {
  const targets = [
    ["The room", "sec-room"], ["Encounter", "sec-encounter"],
    ["Areas", "sec-areas"], ["General", "sec-general"], ["Ask", "sec-ask"], ["Notes", "sec-notes"]
  ];
  const nav = el("nav", { class: "section-nav jump-row", "aria-label": "Jump to a section" });
  for (const [label, id] of targets) {
    add(nav, el("button", { class: "pill", type: "button", onclick: () => {
      const t = document.getElementById(id);
      if (t) t.scrollIntoView({ block: "start", behavior: "auto" });
    } }, label));
  }
  return nav;
}

// ── Blocks ───────────────────────────────────────────────────────────────────
function descriptionBlock(room) {
  const box = el("section", { class: "block", id: "sec-room" });
  add(box, iconTitle("h2", "block-title", "door", "The room"));
  if (room.description) {
    add(box, el("p", { class: "prose prose-read", text: room.description }));
  } else {
    add(box, hint("describe", "Not described yet. The Areas are its main features — write the room from them, and add whatever else obviously belongs."));
  }
  add(box, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
    promptModal({
      title: "Describe the room",
      label: "What does it look like?",
      value: room.description,
      multiline: true,
      hint: "Extras you add here are scenery, not Areas — they cannot be searched.",
      onConfirm: v => { room.description = v; store.saveRoom(room); rerender(); }
    });
  } }, room.description ? "Edit description" : "Describe it"));
  return box;
}

function encounterBlock(room) {
  const box = el("section", { class: "block", id: "sec-encounter" });
  add(box, iconTitle("h2", "block-title", "eye", "Is there an encounter?"));

  if (room.encounter) {
    add(box, answerCard(room.encounter));
    add(box, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
      confirmModal({
        title: "Clear the encounter answer?",
        message: "This removes the recorded answer for this room, and the Random Event with it if one fired. The roll stays in the log.",
        confirmLabel: "Clear it",
        onConfirm: () => { lifecycle.clearEncounter(room); rerender(); }
      });
    } }, "Clear"));
    return box;
  }

  if (room.encounterSkipped) {
    add(box,
      el("p", { class: "prose", text: "Not asked for this room." }),
      el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
        lifecycle.clearEncounter(room); rerender();
      } }, "Ask it after all"));
    return box;
  }

  add(box, hint("encounter-when",
    "Ask it once, after describing the room and before searching — see ", ruleLink("encounter", "the rule"), "."));
  if (!room.description) {
    add(box, hint("encounter-describe-first", "The article asks you to describe the room before you ask. You can answer now anyway — this is guidance, not a gate."));
  }

  if (Settings.useMythic()) {
    add(box, oddsAsker(room, "Is there an encounter?", odds => askEncounter(room, odds)));
  } else {
    add(box, el("p", { class: "prose", text: "Mythic is switched off, so roll the question on your own tables and record what you got." }),
      el("span", { class: "badge badge-guidance", text: "not automated" }));
    const row = el("div", { class: "choice-row choice-wrap" });
    for (const a of ENCOUNTER_ANSWERS) {
      add(row, el("button", { class: "choice", type: "button", onclick: () => {
        promptModal({
          title: a.name, label: "Anything to note?", value: "",
          hint: a.blurb, confirmLabel: "Record",
          onConfirm: note => { lifecycle.recordEncounter(room, a.id, note); showToast("Recorded: " + a.name); rerender(); }
        });
      } }, el("span", { class: "choice-main", text: a.name })));
    }
    add(box, row);
  }
  return box;
}

function askEncounter(room, odds) {
  const res = mythic.ask(room, odds, "Is there an encounter?");
  lifecycle.recordEncounter(room, res.answer, "", res);
  toNatural(room);
  showAnswer(res, "Is there an encounter?");
}

// The odds picker: the three you pick nine times in ten on one row, the full
// chart behind a fold. Shared by every question the app asks (one control for
// one kind of thing). Calls back with the chosen odds id.
const QUICK_ODDS = ["unlikely", "fifty", "likely"];
function oddsAsker(room, question, onAsk, { buttonLabel = "Ask" } = {}) {
  let odds = mythic.DEFAULT_ODDS;
  const wrap = el("div", { class: "asker" });
  const quick = radioGroup({
    label: "How likely is a Yes?",
    options: QUICK_ODDS.map(id => mythic.oddsById(id)).map(o => ({ id: o.id, label: o.name })),
    value: odds,
    compact: true, wrap: false,
    onChange: id => { odds = id; full.setValue(id); drawGauge(); }
  });
  const full = radioGroup({
    label: "All odds",
    options: mythic.ODDS.map(o => ({ id: o.id, label: o.name })),
    value: odds,
    compact: true,
    onChange: id => { odds = id; quick.setValue(QUICK_ODDS.includes(id) ? id : "__none"); drawGauge(); }
  });
  const more = el("details", { class: "fold fold-tight" });
  add(more, el("summary", { text: "More odds" }), full);
  // The chosen odds row of the chart, drawn: how much of the d100 is a Yes.
  const gauge = el("div", { class: "odds-gauge" });
  const drawGauge = () => {
    gauge.replaceChildren(bandStrip(oddsBands(mythic.oddsById(odds), mythic.ANSWERS), null,
      { label: "The chart at " + mythic.oddsById(odds).name }));
  };
  drawGauge();
  add(wrap,
    el("p", { class: "field-label", text: "How likely is a Yes?" }),
    quick, gauge, more,
    el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: () => onAsk(odds) }, buttonLabel),
    hint("odds", mythic.MYTHIC_EXPLAIN.ask)
  );
  return wrap;
}

// One renderer for a Mythic answer, wherever it is shown.
function answerCard(rec, { working = false } = {}) {
  const box = el("div", { class: "find" });
  add(box, el("p", { class: "find-head" },
    rec.roll ? el("span", { class: "die", text: String(rec.roll) }) : null,
    el("b", { class: working ? "seal" : null, text: rec.answerName }),
    rec.oddsName ? el("span", { class: "list-sub", text: " at " + rec.oddsName }) : null));
  if (working && rec.roll && rec.odds) {
    const row = mythic.oddsById(rec.odds);
    add(box, workingStrip(row, r => oddsBands(r, mythic.ANSWERS), rec.roll, rec.answerName));
  }
  if (rec.answerBlurb) add(box, el("p", { class: "prose", text: rec.answerBlurb }));
  if (rec.note) add(box, el("p", { class: "prose prose-read", text: rec.note }));
  if (rec.event) {
    add(box, el("p", { class: "find-head" },
      el("span", { class: "die", text: rec.event.rolls.join(" · ") }),
      el("b", { text: "Random Event: " + rec.event.words.join(" / ") })));
    add(box, el("p", { class: "hint" },
      "A double fired an event as well as the answer — read it against what is going on now. ",
      ruleLink("mythic-event", "The rule"), "."));
  }
  return box;
}

function showAnswer(res, question) {
  modal({
    title: question || "Ask The Game Master",
    body: answerCard(res, { working: true }),
    result: true,
    actions: [{ label: "Good", onClick: () => rerender() }]
  });
}

// Free yes/no questions about the room (R38): is the door locked, is the chest
// trapped. Mythic-gated like the rest; with it off the fold explains why it is
// not here rather than vanishing.
function askBlock(room) {
  const n = (room.questions || []).length;
  return foldOf("sec-ask", "ask", "Ask the GM" + (n ? " (" + n + ")" : ""), askBody(room));
}

// One shape for the three folds: a <details> on the sheet, the same body in a
// sheet of its own from the + button.
function foldOf(id, iconName, label, body) {
  const d = el("details", { class: "fold", id });
  add(d, el("summary", { class: "has-ico" }, icon(iconName), el("span", { text: label })), body);
  return d;
}

function askBody(room, redraw = rerender) {
  const d = el("div", { class: "fold-body" });
  add(d, hint("ask-gm", "Any yes/no question about this room. Decide how likely a Yes is and roll it — ",
    ruleLink("mythic-ask", "the rule"), "."));
  for (const q of room.questions || []) {
    add(d, el("div", { class: "card" }, el("p", { class: "meta", text: q.question }), answerCard(q)));
  }
  if (!Settings.useMythic()) {
    add(d, el("p", { class: "hint", text: "One-Page Mythic is switched off in Settings; this needs its chart." }),
      el("span", { class: "badge badge-guidance", text: "not automated" }));
    return d;
  }
  const q = el("input", { class: "field", type: "text", id: "ask-q", placeholder: "Is the strongbox trapped?" });
  add(d, el("label", { class: "field-label", for: "ask-q", text: "The question" }), q);
  add(d, oddsAsker(room, "", odds => {
    const text = q.value.trim();
    if (!text) { showToast("Type the question first."); q.focus(); return; }
    const res = mythic.ask(room, odds, text);
    lifecycle.recordQuestion(room, res, "");
    redraw();
    showAnswer(res, text);
  }));
  return d;
}

// Rename and reorder (R26) are rare, so their tools sit behind one toggle
// rather than on every card. Two taps either way, and the find is never editable.
let editingAreas = false;

function areasBlock(room) {
  const box = el("section", { class: "block", id: "sec-areas" });
  add(box, iconTitle("h2", "block-title", "grid", "Explorable Areas",
    el("span", { class: "count", text: searchedAreas(room) + "/" + areaCount(room) }),
    areaCount(room) ? el("button", { class: "btn btn-quiet btn-edit", type: "button",
      "aria-pressed": editingAreas ? "true" : "false",
      onclick: () => { editingAreas = !editingAreas; rerender(); } }, editingAreas ? "Done" : "Edit") : null));
  if (!areaCount(room)) {
    add(box, el("p", { class: "hint", text: "No Areas — every keyword was dropped." }));
    return box;
  }
  const list = [...room.areas].sort((a, b) => a.order - b.order);
  // The plan is the search surface: tap an unsearched block to search it, the
  // outline for the General Area. A searched block opens its card instead —
  // one roll per Area (R11) and one for the General Area (R19), never two.
  add(box, roomPlan(room, { onPick: id => {
    if (id === "__general") {
      if (canSearchGeneral(room)) return doGeneral(room);
    } else {
      const a = room.areas.find(x => x.id === id);
      if (a && !a.search) return doSearch(room, id);
    }
    const t = document.getElementById(id === "__general" ? "sec-general" : "area-" + id);
    if (t) t.scrollIntoView({ block: "start" });
  } }));
  list.forEach((a, i) => add(box, areaCard(room, a, i, list.length)));
  return box;
}

function areaCard(room, area, index, count) {
  const done = !!area.search;
  const card = el("article", { class: "card area-card " + (done ? "card-done " + findTone(area.search) : "card-open"), id: "area-" + area.id });
  const words = areaWords(room, area);

  const head = el("div", { class: "card-head" });
  add(head,
    el("span", { class: "area-num", "aria-hidden": "true", text: String(index + 1) }),
    el("div", { class: "card-head-text" },
      el("h3", { class: "card-title", text: area.name }),
      words.length ? el("p", { class: "meta", text: "from " + words.join(" + ") }) : null),
    !editingAreas ? null : el("div", { class: "card-tools" },
      el("button", { class: "icon-btn icon-sm", type: "button", "aria-label": "Rename this Area", title: "Rename", onclick: () => {
        promptModal({ title: "Rename the Area", label: "What is it?", value: area.name, onConfirm: v => {
          if (!lifecycle.renameArea(room, area.id, v)) return showToast("Give it a name.");
          rerender();
        } });
      } }, "✎"),
      el("button", { class: "icon-btn icon-sm", type: "button", "aria-label": "Move this Area up", title: "Move up",
        disabled: index === 0 ? true : null,
        onclick: () => { lifecycle.moveArea(room, area.id, -1); rerender(); } }, "▲"),
      el("button", { class: "icon-btn icon-sm", type: "button", "aria-label": "Move this Area down", title: "Move down",
        disabled: index === count - 1 ? true : null,
        onclick: () => { lifecycle.moveArea(room, area.id, 1); rerender(); } }, "▼")));
  add(card, head);

  if (done) {
    add(card, findBlock(room, area.search, { areaId: area.id }));
    add(card, hint("search-once", "Searched. One roll per Area — ", ruleLink("search", "the rule"), "."));
    // Detail rolls and notes are things you do to something you have found.
    add(card, detailBlock(room, area.id));
    add(card, noteControl(area.note, v => { area.note = v; store.saveRoom(room); rerender(); }));
  } else {
    add(card, el("button", { class: "btn btn-secondary btn-wide", type: "button",
      onclick: () => doSearch(room, area.id) }, "Search this Area"));
  }
  return card;
}

function generalBlock(room) {
  const box = el("section", { class: "block", id: "sec-general" });
  add(box, iconTitle("h2", "block-title", "frame", "The General Area"));
  add(box, hint("general", "The room itself — everything not immediately noticeable. One roll, at any budget: it is what makes " +
    areaCount(room) + " Areas into " + totalExplorable(room) + " explorable places."));
  const card = el("article", { class: "card area-card " + (generalDone(room) ? "card-done " + findTone(room.generalArea) : "card-open") });
  if (generalDone(room)) {
    add(card, findBlock(room, room.generalArea, { areaId: null }));
    add(card, detailBlock(room, null));
  } else {
    add(card, el("button", { class: "btn btn-secondary btn-wide", type: "button",
      onclick: () => doGeneral(room) }, "Search the General Area"));
  }
  add(box, card);
  return box;
}

function hiddenBlock(room) {
  const n = (room.hidden || []).length;
  return foldOf("sec-hidden", "search", "Hidden things" + (n ? " (" + n + ")" : ""), hiddenBody(room));
}

// R24's instruction stays in full every time: the app cannot run your game's
// search mechanic, so it says so rather than folding the words away.
function hiddenBody(room, redraw = rerender) {
  const d = el("div", { class: "fold-body" });
  add(d, el("p", { class: "prose" },
    "Room Crafter reports what is apparent. For a secret door or a stash, use your own game's search mechanic first, then ask — ",
    ruleLink("hidden", "the rule"), "."));
  for (const h of room.hidden || []) {
    add(d, el("div", { class: "card" }, el("p", { class: "meta", text: h.question }), answerCard(h)));
  }

  if (Settings.useMythic()) {
    add(d, oddsAsker(room, "Is something hidden found?", odds => {
      const res = mythic.ask(room, odds, "Is something hidden found?");
      lifecycle.recordHidden(room, "Is something hidden found?", res.answer, "", res);
      redraw();
      showAnswer(res, "Is something hidden found?");
    }));
  } else {
    add(d, el("span", { class: "badge badge-guidance", text: "not automated" }));
    add(d, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
      const q = el("input", { class: "field", type: "text", id: "hid-q", value: "Is something hidden found?" });
      const ansSel = el("select", { class: "field", id: "hid-a" });
      for (const o of ["Yes", "Exceptional Yes", "No", "Exceptional No"]) add(ansSel, el("option", { value: o }, o));
      const note = el("input", { class: "field", type: "text", id: "hid-n", placeholder: "What was found?" });
      const body = el("div", {});
      add(body,
        el("label", { class: "field-label", for: "hid-q", text: "The question you asked" }), q,
        el("label", { class: "field-label", for: "hid-a", text: "Your answer" }), ansSel,
        el("label", { class: "field-label", for: "hid-n", text: "Note" }), note);
      modal({
        title: "Record a hidden search", body,
        actions: [
          { label: "Record", onClick: () => {
            lifecycle.recordHidden(room, q.value.trim(), ansSel.value, note.value.trim());
            showToast("Recorded."); redraw();
          } },
          { label: "Cancel" }
        ]
      });
    } }, "Record a hidden search"));
  }
  return d;
}

function notesBlock(room) {
  return foldOf("sec-notes", "quill", "Notes", notesBody(room));
}

function notesBody(room, redraw = rerender) {
  const d = el("div", { class: "fold-body" });
  add(d, room.notes ? el("p", { class: "prose prose-read", text: room.notes }) : el("p", { class: "hint", text: "Nothing yet." }));
  add(d, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
    promptModal({ title: "Notes", label: "Anything you want to keep", value: room.notes, multiline: true,
      onConfirm: v => { room.notes = v; store.saveRoom(room); redraw(); } });
  } }, "Edit notes"));
  return d;
}

// The rooms either side of this one in the crawl's order (R28), so a finished
// crawl reads like a book and nothing needs the crawl list in between.
function pager(room) {
  const list = store.rooms(room.crawlId);
  const i = list.findIndex(r => r.id === room.id);
  if (i < 0 || list.length < 2) return null;
  const prev = list[i - 1], next = list[i + 1];
  return el("nav", { class: "pager", "aria-label": "Rooms in this crawl" },
    prev ? el("a", { class: "pager-link pager-prev", href: roomHref(prev) },
      icon("chev-l"), el("span", {}, el("small", { text: "Earlier room" }), el("b", { text: prev.context.label || "Untitled room" }))) : el("span"),
    next ? el("a", { class: "pager-link pager-next", href: roomHref(next) },
      el("span", {}, el("small", { text: "Later room" }), el("b", { text: next.context.label || "Untitled room" })), icon("chev-r")) : el("span"));
}

// ── Find rendering ───────────────────────────────────────────────────────────
// A result shows the dice, what they resolved to, and what it means (§6.4).
function findBlock(room, find, { areaId, redraw = rerender, working = false }) {
  const box = el("div", { class: "find" });
  add(box, el("p", { class: "find-head tone-" + find.elementId },
    el("span", { class: "die", text: String(find.roll) }),
    elementGlyph(find.elementId),
    el("b", { text: find.elementName })));
  // In the result dialog, the working: where the die fell on Room Elements.
  if (working) add(box, workingStrip(ROOM_ELEMENTS, elementBands, find.roll, find.elementName));
  add(box, el("p", { class: "prose", text: elementBlurb(find.elementId) }));
  if (["expected", "enhanced", "minimized"].includes(find.elementId)) {
    add(box, el("p", { class: "hint" },
      "Read the thing at face value, not at what you were hoping for — ", ruleLink("expectations", "the rule"), "."));
  }

  for (const s of find.sub || []) {
    add(box, el("p", { class: "find-head find-sub tone-" + s.elementId },
      el("span", { class: "die", text: String(s.roll) }),
      elementGlyph(s.elementId),
      el("b", { text: s.elementName }),
      s.substituted ? el("span", { class: "list-sub", text: " (" + s.substituted + " became Expected)" }) : null));
    add(box, el("p", { class: "prose", text: elementBlurb(s.elementId) }));
  }

  if (find.meaning) {
    add(box, meaningBlock(room, find, areaId, redraw));
  } else if (roller.needsMeaning(find)) {
    add(box, el("p", { class: "prose" }, "Random: choose a Meaning table and roll a pair — ", ruleLink("random", "the rule"), "."));
    const row = el("div", { class: "choice-row choice-wrap" });
    if (Settings.useMythic()) {
      add(row, el("button", { class: "choice", type: "button", onclick: () => {
        find.meaning = mythic.discoverMeaning(room, ["action", "description"], "Random element");
        store.saveRoom(room);
        redraw();
      } }, el("span", { class: "choice-main", text: "Discover Meaning" }),
         el("span", { class: "choice-sub", text: "Action + Description" })));
    }
    for (const t of MEANING_TABLES) {
      add(row, el("button", { class: "choice", type: "button", onclick: () => {
        roller.attachMeaning(room, { find, areaId }, t.id);
        redraw();
      } }, el("span", { class: "choice-main", text: t.name })));
    }
    add(box, row);
  }

  // Fortunate and Unfortunate already say "use the obvious idea" in their own
  // blurb; what they need under it is the way out when you have none.
  const swingy = find.elementId === "fortunate" || find.elementId === "unfortunate" ||
    (find.sub || []).some(x => x.elementId === "fortunate" || x.elementId === "unfortunate");
  if (swingy && !find.meaning) {
    if (Settings.useMythic()) {
      add(box, el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: () => {
        find.meaning = mythic.discoverMeaning(room, ["action", "description"], "Fortunate/Unfortunate");
        store.saveRoom(room);
        redraw();
      } }, "No idea — Discover Meaning"));
    } else {
      add(box, el("p", { class: "hint", text: "No idea? Ask a Fate Question or Discover Meaning on your own tables." }));
    }
  }
  return box;
}

// One renderer for a rolled meaning, whichever table produced it.
function meaningBlock(room, find, areaId, redraw = rerender) {
  const m = find.meaning;
  const box = el("div", {});
  add(box, el("p", { class: "find-head" },
    el("span", { class: "die", text: m.rolls.join(" · ") }),
    el("b", { text: m.words.join(" / ") }),
    el("span", { class: "list-sub", text: " " + m.tableName +
      (m.columns ? " (" + m.columns.join(" + ") + ")" : "") })));
  if (m.doubled) {
    add(box, el("p", { class: "hint", text: "The same word twice — on a meaning table that amplifies rather than repeats." }));
  }
  const row = el("div", { class: "choice-row choice-wrap" });
  if (m.tableId === "mythic") {
    for (const c of mythic.MEANING_COLUMNS) {
      add(row, el("button", { class: "choice choice-sm", type: "button", onclick: () => {
        mythic.anotherWord(room, m, c.id);
        store.saveRoom(room);
        redraw();
      } }, el("span", { class: "choice-main", text: "+ " + c.name })));
    }
    add(box, hint("another-word", "Not clear yet? Roll another word — ", ruleLink("mythic-meaning", "the rule"), "."));
  } else {
    add(row, el("button", { class: "choice choice-sm", type: "button", onclick: () => {
      roller.rerollMeaning(room, find, m.tableId, areaId);
      showToast("Rolled again."); redraw();
    } }, el("span", { class: "choice-main", text: "Roll that pair again" })));
  }
  add(box, row);
  return box;
}

// A d100 table drawn as a strip with the roll marked, and the band's range in
// words beneath it, so the picture never carries the reading alone.
function workingStrip(table, toBands, roll, name) {
  const bands = toBands(table);
  const hit = bands.find(b => roll >= b.min && roll <= b.max);
  const wrap = el("div", { class: "working" });
  wrap.append(bandStrip(bands, roll, { label: "Rolled " + roll + " — " + name + (hit ? ", " + hit.min + "–" + hit.max : "") }));
  if (hit) wrap.append(el("p", { class: "working-cap", "aria-hidden": "true", text: hit.min + "–" + hit.max + " · " + name }));
  return wrap;
}

function elementBlurb(id) {
  const band = ROOM_ELEMENTS.find(x => x.id === id);
  return band ? band.blurb : "";
}

// One renderer for details, wherever they hang (§10.11: one record, not two).
function detailBlock(room, areaId) {
  const mine = (room.details || []).filter(d => d.areaId === areaId);
  const box = el("div", { class: "details-block" });
  for (const d of mine) {
    add(box, el("p", { class: "find-head" },
      el("span", { class: "die", text: d.rolls.join(" · ") }),
      el("b", { text: d.words.join(" / ") }),
      el("span", { class: "list-sub", text: " " + d.tableName })));
  }
  const fold = el("details", { class: "fold fold-tight" });
  add(fold, el("summary", { text: mine.length ? "Roll another detail" : "Roll a detail" }));
  add(fold, hint("detail", "A keyword pair for one thing inside — the article's own use when you pick a single sock out of the drawer."));
  const row = el("div", { class: "choice-row choice-wrap" });
  for (const t of MEANING_TABLES) {
    add(row, el("button", { class: "choice choice-sm", type: "button", onclick: () => {
      roller.rollDetail(room, t.id, areaId);
      rerender();
    } }, el("span", { class: "choice-main", text: t.name })));
  }
  add(fold, row);
  add(box, fold);
  return box;
}

function noteControl(value, onSave) {
  const d = el("details", { class: "fold fold-tight" });
  add(d, el("summary", { text: value ? "Note" : "Add a note" }));
  add(d, value ? el("p", { class: "prose prose-read", text: value }) : null);
  add(d, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
    promptModal({ title: "Note", label: "What happened here?", value, multiline: true, onConfirm: onSave });
  } }, value ? "Edit" : "Write it"));
  return d;
}

// ── Actions ──────────────────────────────────────────────────────────────────
function doSearch(room, areaId) {
  const r = roller.searchArea(room, areaId);
  if (!r.ok) return refuse(r.reason, r.ruleId);
  const area = room.areas.find(a => a.id === areaId);
  toNatural(room);
  showFind(room, r.find, area.name, areaId);
}

function doGeneral(room) {
  const r = roller.searchGeneralArea(room);
  if (!r.ok) return refuse(r.reason, r.ruleId);
  toNatural(room);
  showFind(room, r.find, "The General Area", null);
}

function showFind(room, find, label, areaId) {
  const host = el("div", {});
  const redraw = () => {
    clear(host);
    add(host, findBlock(room, find, { areaId, redraw, working: true }));
    rerender();
  };
  add(host, findBlock(room, find, { areaId, redraw, working: true }));
  modal({
    title: label,
    body: host,
    result: true,
    actions: [{ label: "Good", onClick: () => { rerender(); } }]
  });
}

// Finishing is a place, not a pop-up: the Done stage (R22, R23).
function finishRoom(room) {
  location.hash = stageHref(room, "done");
}

function nextRoomFlow(fromRoom) {
  import("./wizard.js").then(w => w.openNewRoom(fromRoom.crawlId, fromRoom));
}

export function readAloud(room) {
  const text = store.roomAsText(room);
  const ta = el("textarea", { class: "field mono", rows: 12, readonly: true, "aria-label": "Read-aloud text" });
  ta.value = text;
  const title = room.context.label || "Room";
  const actions = [];
  if (navigator.share) {
    actions.push({ label: "Share", onClick: () => {
      shareText(title, text).then(r => { if (r === "unsupported") showToast("Sharing is not available here — copy instead."); });
      return true;
    } });
  }
  actions.push({ label: "Copy", onClick: () => {
    copyText(ta, text);
    return true;
  } });
  actions.push({ label: "Close" });
  modal({
    title: "Read-aloud text",
    body: el("div", {}, ta, el("p", { class: "hint", text: navigator.share ? "Share sends it to another app; Copy puts it on the clipboard." : "Select and copy, or use the button." })),
    actions
  });
}

let rerender = () => {};
export function setRerender(fn) { rerender = fn; }
