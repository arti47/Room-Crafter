// print.js — a finished room, or a whole crawl, as a page you can print or save
// as PDF. A record, not a screen: the same facts and wording as the read-aloud
// export (store.roomAsText), laid out for paper. No controls survive printing.
import { el, add } from "./core.js";
import { icon } from "./ui.js";
import * as store from "./store.js";
import { roomPlan, elementGlyph } from "./graphics.js";
import { searchState, STATE_LABEL, searchedTotal, totalExplorable } from "./derived.js";

function toneOf(find) {
  if (!find) return "";
  const ids = [find.elementId, ...(find.sub || []).map(x => x.elementId)];
  if (ids.includes("unfortunate")) return "tone-unfortunate";
  if (ids.includes("fortunate")) return "tone-fortunate";
  return "";
}

function walkDone(r) {
  return (r.keywords || []).length >= r.budget && !(r.keywords || []).some(k => k.use === "pending");
}

function findLine(find) {
  const p = el("div", { class: "pr-find " + toneOf(find) });
  add(p, el("span", { class: "die die-sm", text: String(find.roll) }), elementGlyph(find.elementId),
    el("b", { text: find.elementName }));
  for (const s of find.sub || []) {
    add(p, el("span", { class: "pr-plus", text: "+" }), el("span", { class: "die die-sm", text: String(s.roll) }),
      elementGlyph(s.elementId), el("b", { text: s.elementName }));
  }
  const out = [p];
  if (find.meaning) out.push(el("p", { class: "pr-sub", text: find.meaning.words.join(" / ") + " [" + find.meaning.tableName + "]" }));
  if (find.note) out.push(el("p", { class: "pr-sub", text: find.note }));
  return out;
}

function answerLine(rec, lead) {
  return el(lead ? "p" : "span", { class: lead ? "pr-line" : "pr-inline" },
    lead ? el("span", { class: "pr-k", text: lead }) : null,
    el("b", { text: rec.answerName || rec.answer }),
    rec.oddsName ? " (" + rec.oddsName + ", rolled " + rec.roll + ")" : "",
    rec.note ? " — " + rec.note : "",
    rec.event ? el("span", { class: "pr-sub pr-block", text: "Random Event: " + rec.event.words.join(" / ") }) : null);
}

// One room as a record.
export function roomRecord(rm) {
  const ctx = rm.context || {};
  const st = walkDone(rm) ? searchState(rm) : "building";
  const art = el("article", { class: "pr-room" });
  add(art, el("header", { class: "pr-head" },
    el("div", {},
      el("h2", { class: "pr-title", text: ctx.label || "Untitled room" }),
      ctx.roomType ? el("p", { class: "meta", text: "(" + ctx.roomType + ")" }) : null,
      ctx.multiRoomNote ? el("p", { class: "meta", text: "Covers several spaces: " + ctx.multiRoomNote }) : null),
    el("span", { class: "res-chip res-" + st, text: STATE_LABEL[st] })));

  const top = el("div", { class: "pr-top" });
  if ((rm.areas || []).length) add(top, el("div", { class: "pr-plan" }, roomPlan(rm, { toneOf }),
    el("p", { class: "pr-cap", text: searchedTotal(rm) + "/" + totalExplorable(rm) + " explored" })));
  const side = el("div", { class: "pr-side" });
  if (rm.description) add(side, el("p", { class: "prose prose-read", text: rm.description }));
  if (!rm.encounter && rm.encounterSkipped) add(side, el("p", { class: "pr-line" }, el("span", { class: "pr-k", text: "Encounter:" }), "not asked"));
  if (rm.encounter) add(side, answerLine(rm.encounter, "Encounter:"));
  add(top, side);
  add(art, top);

  const areas = [...(rm.areas || [])].sort((a, b) => a.order - b.order);
  add(art, el("h3", { class: "pr-h", text: "Areas:" }));
  const ol = el("ol", { class: "pr-areas" });
  areas.forEach((a, i) => {
    const words = (a.fromKeywords || []).map(n => {
      const k = (rm.keywords || []).find(x => x.n === n);
      return k ? k.word : null;
    }).filter(Boolean).join(" + ");
    const li = el("li", { class: a.search ? "done " + toneOf(a.search) : "" },
      el("span", { class: "area-num", "aria-hidden": "true", text: String(i + 1) }),
      el("div", {},
        el("p", { class: "pr-name" }, el("b", { text: a.name }), words ? el("span", { class: "meta", text: "  [" + words + "]" }) : null),
        a.search ? findLine(a.search) : el("p", { class: "pr-sub", text: "not searched" }),
        (rm.details || []).filter(x => x.areaId === a.id).map(d =>
          el("p", { class: "pr-sub", text: "detail: " + d.words.join(" / ") + " [" + d.tableName + "]" })),
        a.note ? el("p", { class: "pr-sub", text: a.note }) : null));
    add(ol, li);
  });
  add(art, ol);

  add(art, el("h3", { class: "pr-h", text: "General Area (the room itself):" }),
    el("div", { class: "pr-general" },
      rm.generalArea ? findLine(rm.generalArea) : el("p", { class: "pr-sub", text: "not searched" }),
      (rm.details || []).filter(x => x.areaId === null).map(d =>
        el("p", { class: "pr-sub", text: "detail: " + d.words.join(" / ") + " [" + d.tableName + "]" }))));

  if ((rm.hidden || []).length) {
    add(art, el("h3", { class: "pr-h", text: "Hidden searches:" }),
      el("ul", { class: "pr-list" }, rm.hidden.map(h => el("li", {}, el("span", { text: h.question + " → " }), answerLine(h)))));
  }
  if ((rm.questions || []).length) {
    add(art, el("h3", { class: "pr-h", text: "Asked the GM:" }),
      el("ul", { class: "pr-list" }, rm.questions.map(q => el("li", {}, el("span", { text: q.question + " → " }), answerLine(q)))));
  }
  if (rm.notes) add(art, el("h3", { class: "pr-h", text: "Notes:" }), el("p", { class: "prose prose-read", text: rm.notes }));
  return art;
}

// The print screen: a toolbar on screen only, then the record(s).
export function render(params) {
  const content = el("div", { class: "print-page" });
  let rooms = [], title = "Print", back = "#/crawls", heading = null;
  if (params.kind === "room") {
    const rm = store.room(params.id);
    if (rm) { rooms = [rm]; title = rm.context.label || "Room"; back = (walkDone(rm) ? "#/room/" : "#/wizard/") + rm.id; }
  } else {
    const c = store.crawl(params.id);
    if (c) {
      rooms = store.rooms(c.id); title = c.name; back = "#/crawl/" + c.id;
      heading = el("header", { class: "pr-crawl" }, el("h1", { class: "screen-title", text: c.name }),
        el("p", { class: "meta", text: rooms.length + " room(s)" }));
    }
  }
  add(content, el("div", { class: "print-bar no-print" },
    el("a", { class: "crumb", href: back }, icon("chev-l"), el("span", { text: title })),
    el("button", { class: "btn btn-primary", type: "button", onclick: () => window.print() }, "Print")));
  if (!rooms.length) {
    add(content, el("p", { class: "prose", text: "Nothing to print." }));
    return { title: "Print", content };
  }
  add(content, heading);
  rooms.forEach(r => add(content, roomRecord(r)));
  add(content, el("footer", { class: "pr-foot", text: "Room Crafter · " + new Date().toLocaleDateString() }));
  return { title: "Print · " + title, content };
}
