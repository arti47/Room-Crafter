// sheet.js — the room sheet and its persistent header.
import { el, add } from "./core.js";
import {
  explain, actionBar, modal, closeModal, promptModal, confirmModal, showToast,
  refuse, ruleLink, emptyState, radioGroup, shareText
} from "./ui.js";
import { EXPLAIN, MEANING_TABLES, ENCOUNTER_ANSWERS, ROOM_ELEMENTS } from "../data.js";
import * as store from "./store.js";
import * as roller from "./roller.js";
import * as lifecycle from "./lifecycle.js";
import * as mythic from "./mythic.js";
import { Settings } from "./settings.js";
import {
  areaCount, searchedAreas, searchedTotal, totalExplorable, generalDone,
  isComplete, searchState, STATE_LABEL, canSearchGeneral, nextStep
} from "./derived.js";

// ── Persistent room header (sticky, under the app header) ────────────────────
// The two or three numbers that decide every choice stay visible while you read
// anything else (§6.2). While the room is being made, the number that matters
// is keyword progress, not search progress.
export function header(room) {
  if (!room) return null;
  const bar = el("div", { class: "res-header", "aria-label": "Room status" });
  const state = searchState(room);
  add(bar, el("span", { class: "res-name", text: room.context.label || "Untitled room" }));
  if (state === "building") {
    add(bar,
      el("span", { class: "res-stat", title: "Keywords rolled" },
        el("b", { text: (room.keywords || []).length + "/" + room.budget }),
        el("small", { text: "Keywords" })),
      el("span", { class: "res-stat", title: "Areas so far" },
        el("b", { text: String(areaCount(room)) }),
        el("small", { text: "Areas" })),
      el("span", { class: "res-chip res-" + state, text: STATE_LABEL[state] }));
    return bar;
  }
  add(bar,
    el("span", { class: "res-stat", title: "Areas plus the General Area, searched" },
      el("b", { text: searchedTotal(room) + "/" + totalExplorable(room) }),
      el("small", { text: "Explored" })),
    el("span", { class: "res-stat", title: "The General Area — the room itself" },
      el("b", { text: generalDone(room) ? "done" : "open" }),
      el("small", { text: "General" })),
    el("span", { class: "res-chip res-" + state, text: STATE_LABEL[state] })
  );
  return bar;
}

// ── Screen ───────────────────────────────────────────────────────────────────
export function render(params) {
  const room = store.room(params.roomId);
  if (!room) {
    return { title: "Room", content: emptyState("That room is gone.", "Back to crawls", "#/crawls") };
  }
  if (!isWalkDone(room)) {
    return {
      title: "Room",
      content: emptyState("This room is still being made — its keywords are not finished.",
        "Continue the keyword walk", "#/wizard/" + room.id)
    };
  }

  const content = el("div", {});
  add(content,
    el("h1", { class: "screen-title", text: room.context.label || "Untitled room" }),
    room.context.roomType ? el("p", { class: "meta", text: room.context.roomType }) : null,
    room.context.multiRoomNote
      ? el("p", { class: "meta", text: "Covers several spaces: " + room.context.multiRoomNote })
      : null,
    explain(EXPLAIN.room),
    jumpRow()
  );

  // Two columns from tablet width up (P8): the room's own matter on the left,
  // the Areas — the column you work down — on the right.
  const left = el("div", { class: "col col-room" });
  const right = el("div", { class: "col col-areas" });
  add(left, descriptionBlock(room), encounterBlock(room), generalBlock(room),
    askBlock(room), hiddenBlock(room), notesBlock(room), roomActionsBlock(room));
  add(right, areasBlock(room));
  add(content, el("div", { class: "two-col" }, left, right));

  const [bar, spacer] = actionBar(primaryAction(room));
  add(content, spacer);
  return { title: "Room", content, bar };
}

function isWalkDone(room) {
  const rolled = (room.keywords || []).length;
  const pend = (room.keywords || []).filter(k => k.use === "pending").length;
  return rolled >= (room.budget || 6) && pend === 0;
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
        el("button", { class: "btn-link", type: "button", onclick: () => { lifecycle.skipEncounter(room); rerender(); } },
          "Skip the question"));
    }
    return el("div", { class: "bar-stack" },
      el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
        const t = document.getElementById("sec-encounter");
        if (t) t.scrollIntoView({ block: "start" });
      } }, "Record: is there an encounter?"),
      el("button", { class: "btn-link", type: "button", onclick: () => { lifecycle.skipEncounter(room); rerender(); } },
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
  const nav = el("nav", { class: "section-nav", "aria-label": "Jump to a section" });
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
  add(box, el("h2", { class: "block-title", text: "The room" }));
  if (room.description) {
    add(box, el("p", { class: "prose prose-read", text: room.description }));
  } else {
    add(box, el("p", { class: "hint", text: "Not described yet. The Areas are its main features — write the room from them, and add whatever else obviously belongs." }));
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
  add(box, el("h2", { class: "block-title", text: "Is there an encounter?" }));

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

  add(box, el("p", { class: "prose" },
    "Ask it once, after describing the room and before searching — see ", ruleLink("encounter", "the rule"), "."));
  if (!room.description) {
    add(box, el("p", { class: "hint", text: "The article asks you to describe the room before you ask. You can answer now anyway — this is guidance, not a gate." }));
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
  rerender();
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
    onChange: id => { odds = id; full.setValue(id); }
  });
  const full = radioGroup({
    label: "All odds",
    options: mythic.ODDS.map(o => ({ id: o.id, label: o.name })),
    value: odds,
    compact: true,
    onChange: id => { odds = id; quick.setValue(QUICK_ODDS.includes(id) ? id : "__none"); }
  });
  const more = el("details", { class: "fold fold-tight" });
  add(more, el("summary", { text: "More odds" }), full);
  add(wrap,
    el("p", { class: "field-label", text: "How likely is a Yes?" }),
    quick, more,
    el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: () => onAsk(odds) }, buttonLabel),
    el("p", { class: "hint", text: mythic.MYTHIC_EXPLAIN.ask })
  );
  return wrap;
}

// One renderer for a Mythic answer, wherever it is shown.
function answerCard(rec) {
  const box = el("div", { class: "find" });
  add(box, el("p", { class: "find-head" },
    rec.roll ? el("span", { class: "die", text: String(rec.roll) }) : null,
    el("b", { text: rec.answerName }),
    rec.oddsName ? el("span", { class: "list-sub", text: " at " + rec.oddsName }) : null));
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
    body: answerCard(res),
    actions: [{ label: "Good", onClick: () => rerender() }]
  });
}

// Free yes/no questions about the room (R38): is the door locked, is the chest
// trapped. Mythic-gated like the rest; with it off the fold explains why it is
// not here rather than vanishing.
function askBlock(room) {
  const d = el("details", { class: "fold", id: "sec-ask" });
  const n = (room.questions || []).length;
  add(d, el("summary", { text: "Ask the GM" + (n ? " (" + n + ")" : "") }));
  add(d, el("p", { class: "prose" },
    "Any yes/no question about this room. Decide how likely a Yes is and roll it — ",
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
    rerender();
    showAnswer(res, text);
  }));
  return d;
}

function areasBlock(room) {
  const box = el("section", { class: "block", id: "sec-areas" });
  add(box, el("h2", { class: "block-title", text: "Explorable Areas" },
    el("span", { class: "count", text: searchedAreas(room) + "/" + areaCount(room) })));
  if (!areaCount(room)) {
    add(box, el("p", { class: "hint", text: "No Areas — every keyword was dropped." }));
    return box;
  }
  const list = [...room.areas].sort((a, b) => a.order - b.order);
  list.forEach((a, i) => add(box, areaCard(room, a, i, list.length)));
  return box;
}

function areaCard(room, area, index, count) {
  const done = !!area.search;
  const card = el("article", { class: "card area-card" + (done ? " card-done" : "") });
  const words = (area.fromKeywords || []).map(n => {
    const k = (room.keywords || []).find(x => x.n === n);
    return k ? k.word : null;
  }).filter(Boolean);

  const head = el("div", { class: "card-head" });
  add(head,
    el("div", { class: "card-head-text" },
      el("h3", { class: "card-title", text: area.name }),
      words.length ? el("p", { class: "meta", text: "from " + words.join(" + ") }) : null),
    el("div", { class: "card-tools" },
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
    add(card, el("p", { class: "hint" }, "Searched. One roll per Area — ", ruleLink("search", "the rule"), "."));
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
  add(box, el("h2", { class: "block-title", text: "The General Area" }));
  add(box, el("p", { class: "prose", text: "The room itself — everything not immediately noticeable. One roll, at any budget: it is what makes " +
    areaCount(room) + " Areas into " + totalExplorable(room) + " explorable places." }));
  const card = el("article", { class: "card area-card" + (generalDone(room) ? " card-done" : "") });
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
  const d = el("details", { class: "fold", id: "sec-hidden" });
  add(d, el("summary", { text: "Hidden things" + ((room.hidden || []).length ? " (" + room.hidden.length + ")" : "") }));
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
      rerender();
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
            showToast("Recorded."); rerender();
          } },
          { label: "Cancel" }
        ]
      });
    } }, "Record a hidden search"));
  }
  return d;
}

function notesBlock(room) {
  const d = el("details", { class: "fold", id: "sec-notes" });
  add(d, el("summary", { text: "Notes" }));
  add(d, room.notes ? el("p", { class: "prose prose-read", text: room.notes }) : el("p", { class: "hint", text: "Nothing yet." }));
  add(d, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
    promptModal({ title: "Notes", label: "Anything you want to keep", value: room.notes, multiline: true,
      onConfirm: v => { room.notes = v; store.saveRoom(room); rerender(); } });
  } }, "Edit notes"));
  return d;
}

// Destructive controls live at the end of the scroll, out of the thumb's arc (§6.3.11).
function roomActionsBlock(room) {
  const box = el("section", { class: "block block-end" });
  add(box, el("h2", { class: "block-title", text: "This room" }));
  add(box, el("div", { class: "stack" },
    el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => finishRoom(room) }, "Finish this room"),
    el("p", { class: "hint" }, "Searching is optional — a room you only looked at is a finished room. ", ruleLink("complete", "The rule"), "."),
    el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => readAloud(room) }, "Read-aloud text"),
    el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => nextRoomFlow(room) }, "Next room in this crawl"),
    el("a", { class: "btn btn-quiet btn-wide", href: "#/crawl/" + room.crawlId }, "Back to the crawl"),
    el("button", { class: "btn btn-danger btn-wide", type: "button", onclick: () => {
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
    } }, "Delete this room")
  ));
  return box;
}

// ── Find rendering ───────────────────────────────────────────────────────────
// A result shows the dice, what they resolved to, and what it means (§6.4).
function findBlock(room, find, { areaId }) {
  const box = el("div", { class: "find" });
  add(box, el("p", { class: "find-head" },
    el("span", { class: "die", text: String(find.roll) }),
    el("b", { text: find.elementName })));
  add(box, el("p", { class: "prose", text: elementBlurb(find.elementId) }));
  if (["expected", "enhanced", "minimized"].includes(find.elementId)) {
    add(box, el("p", { class: "hint" },
      "Read the thing at face value, not at what you were hoping for — ", ruleLink("expectations", "the rule"), "."));
  }

  for (const s of find.sub || []) {
    add(box, el("p", { class: "find-head find-sub" },
      el("span", { class: "die", text: String(s.roll) }),
      el("b", { text: s.elementName }),
      s.substituted ? el("span", { class: "list-sub", text: " (" + s.substituted + " became Expected)" }) : null));
    add(box, el("p", { class: "prose", text: elementBlurb(s.elementId) }));
  }

  if (find.meaning) {
    add(box, meaningBlock(room, find, areaId));
  } else if (roller.needsMeaning(find)) {
    add(box, el("p", { class: "prose" }, "Random: choose a Meaning table and roll a pair — ", ruleLink("random", "the rule"), "."));
    const row = el("div", { class: "choice-row choice-wrap" });
    if (Settings.useMythic()) {
      add(row, el("button", { class: "choice", type: "button", onclick: () => {
        find.meaning = mythic.discoverMeaning(room, ["action", "description"], "Random element");
        store.saveRoom(room);
        rerender();
      } }, el("span", { class: "choice-main", text: "Discover Meaning" }),
         el("span", { class: "choice-sub", text: "Action + Description" })));
    }
    for (const t of MEANING_TABLES) {
      add(row, el("button", { class: "choice", type: "button", onclick: () => {
        roller.attachMeaning(room, { find, areaId }, t.id);
        rerender();
      } }, el("span", { class: "choice-main", text: t.name })));
    }
    add(box, row);
  }

  const swingy = find.elementId === "fortunate" || find.elementId === "unfortunate" ||
    (find.sub || []).some(x => x.elementId === "fortunate" || x.elementId === "unfortunate");
  if (swingy) {
    add(box, el("p", { class: "hint", text: "Use the obvious idea if you have one." }));
    if (Settings.useMythic() && !find.meaning) {
      add(box, el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
        find.meaning = mythic.discoverMeaning(room, ["action", "description"], "Fortunate/Unfortunate");
        store.saveRoom(room);
        rerender();
      } }, "No idea — Discover Meaning"));
    } else if (!Settings.useMythic()) {
      add(box, el("p", { class: "hint", text: "Otherwise ask a Fate Question or Discover Meaning on your own tables." }));
    }
  }
  return box;
}

// One renderer for a rolled meaning, whichever table produced it.
function meaningBlock(room, find, areaId) {
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
        rerender();
      } }, el("span", { class: "choice-main", text: "+ " + c.name })));
    }
    add(box, el("p", { class: "hint" }, "Not clear yet? Roll another word — ", ruleLink("mythic-meaning", "the rule"), "."));
  } else {
    add(row, el("button", { class: "choice choice-sm", type: "button", onclick: () => {
      roller.rerollMeaning(room, find, m.tableId, areaId);
      showToast("Rolled again."); rerender();
    } }, el("span", { class: "choice-main", text: "Roll that pair again" })));
  }
  add(box, row);
  return box;
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
  add(fold, el("p", { class: "prose", text: "A keyword pair for one thing inside — the article's own use when you pick a single sock out of the drawer." }));
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
  showFind(room, r.find, area.name, areaId);
  rerender();
}

function doGeneral(room) {
  const r = roller.searchGeneralArea(room);
  if (!r.ok) return refuse(r.reason, r.ruleId);
  showFind(room, r.find, "The General Area", null);
  rerender();
}

function showFind(room, find, label, areaId) {
  modal({
    title: label,
    body: findBlock(room, find, { areaId }),
    actions: [{ label: "Good", onClick: () => { rerender(); } }]
  });
}

function finishRoom(room) {
  const lines = lifecycle.roomSummary(room);
  const body = el("div", {});
  add(body, el("ul", { class: "summary" }, lines.map(l => el("li", { text: l }))));
  if (!isComplete(room)) {
    add(body, el("p", { class: "hint", text: "Areas are still unsearched. That is a real state — the room is described rather than searched, and you can come back to it." }));
  }
  modal({
    title: "Room finished",
    body,
    actions: [
      { label: "Next room", onClick: () => { nextRoomFlow(room); return true; } },
      { label: "Read-aloud text", onClick: () => { readAloud(room); return true; } },
      { label: "Back to the crawl", onClick: () => { location.hash = "#/crawl/" + room.crawlId; } }
    ]
  });
}

function nextRoomFlow(fromRoom) {
  import("./wizard.js").then(w => {
    const form = w.newRoomForm(fromRoom.crawlId, rm => { location.hash = "#/wizard/" + rm.id; }, fromRoom);
    modal({
      title: "Next room",
      body: form.body,
      actions: [{ label: "Start the keyword walk", onClick: () => { closeModal(); form.create(); } }, { label: "Cancel" }]
    });
  });
}

function readAloud(room) {
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
    ta.select();
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast("Copied."), () => showToast("Select the text and copy."));
    else showToast("Select the text and copy.");
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
