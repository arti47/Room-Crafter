// journal.js — the crawl as a story (P16). One page per crawl: each room is a
// chapter, each roll a line in the order it was made, with the sentence you
// wrote for it. The rolls are the record; the sentences are yours. Nothing
// here rolls, and nothing here edits a roll — only the line beside it.
import { el, add } from "./core.js";
import { explain, crumb, emptyState, promptModal, houseAidBadge, icon } from "./ui.js";
import { EXPLAIN } from "../data.js";
import { GOAL_PROGRESS } from "../data-house-roomtypes.js";
import * as store from "./store.js";
import * as lifecycle from "./lifecycle.js";
import { roomPlan, elementGlyph, findTone, illustration } from "./graphics.js";
import { isWalkDone, roomHref, searchState, STATE_LABEL, areaWords } from "./derived.js";

export function render(params) {
  const c = store.crawl(params.crawlId);
  if (!c) return { title: "Journal", content: emptyState("That crawl is gone.", "Back to crawls", "#/crawls", illustration("map")) };
  const rooms = store.rooms(c.id);
  const content = el("div", { class: "journal" });
  add(content,
    crumb("#/crawl/" + c.id, c.name),
    el("h1", { class: "screen-title", text: c.name }),
    explain(EXPLAIN.journal));
  if (c.explorer || c.goal) {
    add(content, el("p", { class: "journal-quest" },
      c.explorer ? el("b", { text: c.explorer }) : null,
      c.explorer && c.goal ? " — " : null,
      c.goal ? el("span", { text: c.goal }) : null, houseAidBadge("house rule")));
  }
  if (!rooms.length) {
    add(content, emptyState("No rooms yet. Start the first one — six keywords, or three if you are making a lot of them.", "Back to the crawl", "#/crawl/" + c.id, illustration("plan")));
    return { title: "Journal", content };
  }
  rooms.forEach((rm, i) => add(content, chapter(rm, i + 1)));
  return { title: "Journal · " + c.name, content };
}

function chapter(rm, n) {
  const st = isWalkDone(rm) ? searchState(rm) : "building";
  const box = el("section", { class: "chapter" });
  add(box, el("header", { class: "chapter-head" },
    (rm.areas || []).length ? el("span", { class: "chapter-plan", "aria-hidden": "true" }, roomPlan(rm)) : null,
    el("div", {},
      el("p", { class: "eyebrow", text: "Room " + n + (rm.context.roomType ? " · " + rm.context.roomType : "") }),
      el("h2", { class: "chapter-title" }, el("a", { href: roomHref(rm) }, rm.context.label || "Untitled room")),
      el("span", { class: "res-chip res-" + st, text: STATE_LABEL[st] }))));
  if (rm.description) add(box, el("p", { class: "prose prose-read chapter-desc", text: rm.description }));

  const ol = el("ol", { class: "journal-lines" });
  const kws = (rm.keywords || []).map(k => k.word);
  if (kws.length) add(ol, el("li", { class: "jl jl-keywords" },
    el("span", { class: "jl-mark", "aria-hidden": "true" }, icon("grid")),
    el("div", {}, el("p", { class: "jl-title", text: "Keywords" }), el("p", { class: "jl-result", text: kws.join(" · ") }))));
  for (const e of events(rm)) add(ol, line(rm, e));
  add(box, ol);

  if (rm.notes) add(box, el("p", { class: "prose prose-read chapter-notes", text: rm.notes }));
  if (rm.progress) {
    const g = GOAL_PROGRESS.find(x => x.id === rm.progress);
    add(box, el("p", { class: "chapter-progress progress-" + rm.progress }, icon("flag"), " " + (g ? g.name : ""), houseAidBadge("house rule")));
  }
  return box;
}

// Every roll the room holds, in the order it was made.
function events(rm) {
  const out = [];
  if (rm.encounter) out.push({ ts: rm.encounter.ts, kind: "answer", rec: rm.encounter, title: "Is there an encounter?", icon: "eye" });
  else if (rm.encounterSkipped) out.push({ ts: 0, kind: "skip", title: "Is there an encounter?", result: "Not asked", icon: "eye" });
  for (const a of rm.areas || []) {
    if (a.search) out.push({ ts: a.search.ts || 0, kind: "find", rec: a.search, title: a.name, sub: areaWords(rm, a).join(" + "), icon: "search" });
  }
  if (rm.generalArea) out.push({ ts: rm.generalArea.ts || 0, kind: "find", rec: rm.generalArea, title: "The General Area", icon: "frame" });
  for (const d of rm.details || []) {
    const a = (rm.areas || []).find(x => x.id === d.areaId);
    out.push({ ts: d.ts || 0, kind: "detail", rec: d, title: "Detail · " + (a ? a.name : "The General Area"), icon: "quill" });
  }
  for (const h of rm.hidden || []) out.push({ ts: h.ts || 0, kind: "answer", rec: h, title: h.question, icon: "search" });
  for (const q of rm.questions || []) out.push({ ts: q.ts || 0, kind: "answer", rec: q, title: q.question, icon: "ask" });
  return out.map((e, i) => ({ ...e, i })).sort((a, b) => (a.ts - b.ts) || (a.i - b.i));
}

function line(rm, e) {
  const li = el("li", { class: "jl jl-" + e.kind + (e.kind === "find" ? " " + findTone(e.rec) : "") });
  const dice = e.rec && e.rec.roll ? [e.rec.roll] : e.rec && e.rec.rolls ? e.rec.rolls : [];
  add(li, el("span", { class: "jl-mark", "aria-hidden": "true" }, icon(e.icon)));
  const body = el("div", {});
  add(body, el("p", { class: "jl-title" }, e.title, e.sub ? el("span", { class: "meta", text: "  [" + e.sub + "]" }) : null));
  const res = el("p", { class: "jl-result" });
  for (const d of dice) add(res, el("span", { class: "die die-sm", text: String(d) }));
  if (e.kind === "find") {
    add(res, elementGlyph(e.rec.elementId), el("b", { text: e.rec.elementName }));
    for (const s of e.rec.sub || []) add(res, el("span", { text: " + " + s.elementName }));
    if (e.rec.meaning) add(res, el("span", { class: "jl-words", text: e.rec.meaning.words.join(" / ") }));
  } else if (e.kind === "answer") {
    add(res, el("b", { text: e.rec.answerName || e.rec.answer }), e.rec.oddsName ? el("span", { class: "meta", text: " at " + e.rec.oddsName }) : null);
    if (e.rec.event) add(res, el("span", { class: "jl-words", text: "Random Event: " + e.rec.event.words.join(" / ") }));
  } else if (e.kind === "detail") {
    add(res, el("b", { text: e.rec.words.join(" / ") }), el("span", { class: "meta", text: " " + e.rec.tableName }));
  } else {
    add(res, el("span", { text: e.result }));
  }
  add(body, res);
  // Your line: what the roll meant. Tap to write or change it.
  if (e.kind === "find" || e.kind === "answer") {
    const text = e.rec.note || "";
    add(body, el("button", { class: "jl-line" + (text ? "" : " jl-empty"), type: "button", onclick: () => {
      promptModal({ title: e.title, label: "What is it?", value: text, multiline: true, confirmLabel: "Save",
        onConfirm: v => { lifecycle.setLine(rm, e.rec, v); rerender(); } });
    } }, text ? el("span", { class: "jl-said", text }) : el("span", { text: "What is it?" })));
  }
  add(li, body);
  return li;
}

let rerender = () => {};
export function setRerender(fn) { rerender = fn; }
