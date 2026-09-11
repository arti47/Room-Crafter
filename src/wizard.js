// wizard.js — room generation: the sequential keyword walk.
// The app enforces the order, the cap and the count. The interpretation is yours
// — that is the one thing this tool exists to leave alone.
import { el, add, clear, uid } from "./core.js";
import { explain, actionBar, promptModal, showToast, refuse, ruleLink, houseAidBadge } from "./ui.js";
import { MAX_COMBINE, BUDGETS } from "../data.js";
import { ROOM_TYPES, HOUSE_AID } from "../data-house-roomtypes.js";
import * as store from "./store.js";
import * as lifecycle from "./lifecycle.js";
import * as roller from "./roller.js";
import { Settings } from "./settings.js";
import { budgetInfo } from "./derived.js";

export function pending(room) {
  return (room.keywords || []).filter(k => k.use === "pending");
}
export function rolledCount(room) {
  return (room.keywords || []).length;
}
export function stepsLeft(room) {
  return (room.budget || 6) - rolledCount(room);
}
export function canCarry(room) {
  return pending(room).length < MAX_COMBINE && stepsLeft(room) > 0;
}
export function canDrop(room) {
  // Ruling A8: only the final keyword may be dropped.
  return stepsLeft(room) === 0 && pending(room).length > 0;
}
export function isWalkDone(room) {
  return stepsLeft(room) === 0 && pending(room).length === 0;
}

// ── Engine ───────────────────────────────────────────────────────────────────
export function rollNext(room) {
  if (stepsLeft(room) <= 0) {
    return { ok: false, reason: "Every keyword for this room has been rolled.", ruleId: "generation" };
  }
  if (!canCarry(room) && pending(room).length >= MAX_COMBINE) {
    return { ok: false, reason: "Two keywords are already carried. Combining stops at two.", ruleId: "combine-cap" };
  }
  const kw = roller.rollKeyword(room, rolledCount(room) + 1);
  room.keywords = [...(room.keywords || []), kw];
  store.saveRoom(room);
  return { ok: true, keyword: kw };
}

export function makeArea(room, name) {
  const pend = pending(room);
  if (!pend.length) return { ok: false, reason: "Roll a keyword first." };
  if (!name || !name.trim()) return { ok: false, reason: "Give the Area a name — that is your interpretation." };
  const nums = pend.map(k => k.n);
  pend.forEach((k, i) => { k.use = i === pend.length - 1 ? "area" : "combined"; });
  room.areas = [...(room.areas || []), {
    id: uid("area"), name: name.trim(), fromKeywords: nums,
    order: (room.areas || []).length, search: null, note: ""
  }];
  store.saveRoom(room);
  return { ok: true };
}

export function carryForward(room) {
  if (!canCarry(room)) {
    return {
      ok: false,
      reason: pending(room).length >= MAX_COMBINE
        ? "Combining stops at two keywords. Chaining three would let six keywords make only two Areas, and the rules say three to six."
        : "There is no next keyword to combine with — this is the last one.",
      ruleId: pending(room).length >= MAX_COMBINE ? "combine-cap" : "drop-last"
    };
  }
  return rollNext(room);
}

export function dropLast(room) {
  if (!canDrop(room)) {
    return { ok: false, reason: "Only the final keyword may be dropped. Carry this one forward instead.", ruleId: "drop-last" };
  }
  pending(room).forEach(k => { k.use = "dropped"; });
  store.saveRoom(room);
  return { ok: true };
}

// ── Screen ───────────────────────────────────────────────────────────────────
export function render(params) {
  const room = store.room(params.roomId);
  if (!room) {
    return { title: "Room", content: el("p", { class: "prose", text: "That room is gone." }) };
  }
  const content = el("div", {});
  const info = budgetInfo(room);
  const pend = pending(room);

  add(content,
    el("h1", { class: "screen-title", text: room.context.label || "New room" }),
    explain(getExplain()),
    el("p", { class: "meta" },
      info.label + " · " + rolledCount(room) + " of " + room.budget + " rolled · " +
      (room.areas || []).length + " Area" + ((room.areas || []).length === 1 ? "" : "s") +
      " so far (expect " + info.areas[0] + "–" + info.areas[1] + ")")
  );

  // Progress: one dot per keyword in the budget.
  const dots = el("div", { class: "dots", "aria-label": "Keyword progress" });
  for (let i = 1; i <= room.budget; i++) {
    const kw = (room.keywords || []).find(k => k.n === i);
    const cls = !kw ? "dot" : "dot dot-" + kw.use;
    add(dots, el("span", { class: cls, title: kw ? kw.word : "not rolled yet" }));
  }
  add(content, dots);

  let bar = null;

  if (isWalkDone(room)) {
    add(content, el("div", { class: "card card-good" },
      el("h2", { text: "The keywords are done" }),
      el("p", { class: "prose", text: "You have " + (room.areas || []).length +
        " explorable Areas. Next: say what the room looks like, then ask whether anything is here." })
    ));
    const [b, spacer] = actionBar(
      el("a", { class: "btn btn-primary btn-wide", href: "#/room/" + room.id }, "Go to the room")
    );
    bar = b;
    add(content, areaList(room), keywordTrail(room), spacer);
    return { title: "Room", content, bar };
  }

  if (pend.length === 0) {
    const n = rolledCount(room) + 1;
    add(content, el("div", { class: "card" },
      el("h2", { text: "Keyword " + n + " of " + room.budget }),
      el("p", { class: "prose", text: n === 1
        ? "Roll the first keyword. If it suggests something in this room, make it an Area."
        : "Roll the next keyword and see what it gives you." })
    ));
    const [b, spacer] = actionBar(
      el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
        const r = rollNext(room);
        if (!r.ok) return refuse(r.reason, r.ruleId);
        rerender();
      } }, "Roll keyword " + n)
    );
    bar = b;
    add(content, areaList(room), keywordTrail(room), spacer);
    return { title: "Room", content, bar };
  }

  // A keyword (or a carried pair) is on the table.
  const card = el("div", { class: "card card-keyword" });
  add(card, el("p", { class: "eyebrow", text: pend.length > 1 ? "Combined" : "Keyword " + pend[0].n }));
  add(card, el("p", { class: "keyword-word" },
    pend.map(k => k.word).join(" + ")));
  add(card, el("p", { class: "meta", text: pend.map(k => "d100 " + k.roll).join(" · ") }));
  add(card, el("p", { class: "prose", text: pend.length > 1
    ? "Two words together. What is it in this room?"
    : "Does this suggest something in this room? If it does, name it. If not, carry it forward." }));
  add(content, card);

  const controls = el("div", { class: "stack" });
  add(controls, el("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
    promptModal({
      title: "Make it an Area",
      label: pend.map(k => k.word).join(" + ") + " — what is it?",
      hint: "A few words is plenty: 'a shelf of tonics', 'crates jammed by the bed'.",
      confirmLabel: "Add Area",
      onConfirm: name => {
        const r = makeArea(room, name);
        if (!r.ok) return showToast(r.reason);
        rerender();
      }
    });
  } }, "Make this an Area"));

  if (canCarry(room)) {
    add(controls, el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => {
      const r = carryForward(room);
      if (!r.ok) return refuse(r.reason, r.ruleId);
      rerender();
    } }, "Nothing yet — carry it forward"));
  } else if (pend.length >= MAX_COMBINE) {
    add(controls, el("p", { class: "hint" },
      "Combining stops at two — see ", ruleLink("combine-cap", "why"), "."));
  }

  if (canDrop(room)) {
    add(controls, el("button", { class: "btn btn-quiet btn-wide", type: "button", onclick: () => {
      const r = dropLast(room);
      if (!r.ok) return refuse(r.reason, r.ruleId);
      showToast("Dropped. Going with the Areas you have.");
      rerender();
    } }, "Drop it and finish"));
  }

  const [b2, spacer2] = actionBar(controls);
  bar = b2;
  add(content, areaList(room), keywordTrail(room), spacer2);
  return { title: "Room", content, bar };
}

function areaList(room) {
  if (!(room.areas || []).length) return null;
  const box = el("section", { class: "block" });
  add(box, el("h2", { class: "block-title", text: "Areas so far" }));
  const ul = el("ul", { class: "list" });
  for (const a of room.areas) {
    add(ul, el("li", { class: "list-row" },
      el("span", { class: "list-main", text: a.name }),
      el("span", { class: "list-sub", text: a.fromKeywords.map(n => {
        const k = room.keywords.find(x => x.n === n);
        return k ? k.word : "";
      }).filter(Boolean).join(" + ") })
    ));
  }
  add(box, ul);
  return box;
}

function keywordTrail(room) {
  if (!(room.keywords || []).length) return null;
  const d = el("details", { class: "fold" });
  add(d, el("summary", { text: "Keyword trail" }));
  const ul = el("ul", { class: "list" });
  for (const k of room.keywords) {
    add(ul, el("li", { class: "list-row" },
      el("span", { class: "list-main", text: k.n + ". " + k.word }),
      el("span", { class: "list-sub", text: "d100 " + k.roll + " · " + k.use })
    ));
  }
  add(d, ul);
  return d;
}

function getExplain() {
  return "Keywords arrive one at a time. Take one that inspires you and make it an Area; carry one that does not and combine it with the next. The app enforces the order, the two-keyword cap and the count — the interpretation is yours.";
}

// ── New-room flow ────────────────────────────────────────────────────────────
export function newRoomForm(crawlId, onCreated, fromRoom = null) {
  const label = el("input", { class: "field", type: "text", id: "nr-label", placeholder: "The lich's study" });
  const typeInput = el("input", { class: "field", type: "text", id: "nr-type", placeholder: "Bedroom, cavern, cockpit…", list: "roomtypes" });
  const dl = el("datalist", { id: "roomtypes" });
  if (Settings.showHouseAids()) for (const t of ROOM_TYPES) add(dl, el("option", { value: t }));

  let budget = fromRoom ? (fromRoom.budget || 6) : 6;
  const budgetRow = el("div", { class: "choice-row", role: "radiogroup", "aria-label": "Keyword budget" });
  const buttons = BUDGETS.map(b => {
    const btn = el("button", {
      class: "choice" + (b.keywords === budget ? " choice-on" : ""),
      type: "button", role: "radio", "aria-checked": b.keywords === budget ? "true" : "false",
      onclick: () => {
        budget = b.keywords;
        buttons.forEach((x, i) => {
          const on = BUDGETS[i].keywords === budget;
          x.className = "choice" + (on ? " choice-on" : "");
          x.setAttribute("aria-checked", on ? "true" : "false");
        });
      }
    }, el("span", { class: "choice-main", text: b.label }),
       el("span", { class: "choice-sub", text: b.areas[0] + "–" + b.areas[1] + " Areas" }));
    add(budgetRow, btn);
    return btn;
  });

  const multi = el("input", { class: "field", type: "text", id: "nr-multi",
    placeholder: "living room, kitchen, the bathroom off it" });
  const rolled = el("p", { class: "hint" });
  const rollBtn = Settings.showHouseAids()
    ? el("button", { class: "btn btn-quiet", type: "button", onclick: () => {
        const pick = roller.rollRoomType(null, ROOM_TYPES);
        typeInput.value = pick;
        clear(rolled);
        add(rolled, "Rolled: " + pick + " ", houseAidBadge());
      } }, "Roll a room type")
    : null;

  const body = el("div", {});
  add(body,
    el("label", { class: "field-label", for: "nr-label", text: "What is this room?" }), label,
    el("label", { class: "field-label", for: "nr-type", text: "Room type" }), typeInput, dl,
    rollBtn, rolled,
    Settings.showHouseAids()
      ? el("p", { class: "hint" }, "Suggestions come from an invented list ", houseAidBadge(), " — the article has no room-type table. Type anything.")
      : null,
    el("label", { class: "field-label", for: "nr-multi", text: "Does this room cover several spaces?" }), multi,
    el("p", { class: "hint", text: "A simple apartment can be one room if a thirty-second walk shows you all of it. Put the Areas wherever they fit." }),
    el("p", { class: "field-label", text: "Keyword budget" }), budgetRow,
    el("p", { class: "hint", text: "Three keywords is the crawl variant: fewer Areas, faster rooms." })
  );

  return { body, create: () => {
    const context = {
      label: label.value.trim() || "Untitled room",
      roomType: typeInput.value.trim(),
      houseAidType: HOUSE_AID && ROOM_TYPES.includes(typeInput.value.trim()),
      genreNote: "", multiRoomNote: multi.value.trim()
    };
    // Through the lifecycle boundary, never store.createRoom directly: that
    // boundary is what guarantees a new room starts with no spent search flags.
    const rm = fromRoom
      ? lifecycle.nextRoom({ ...fromRoom, budget }, context, budget)
      : lifecycle.newRoom(crawlId, context, budget);
    onCreated && onCreated(rm);
    return rm;
  } };
}

let rerender = () => {};
export function setRerender(fn) { rerender = fn; }
