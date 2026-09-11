// roller.js — the dice engine. Every roll in the app comes from here, is written
// to the log at the moment it happens, and is never produced twice for one action.
import { d100 } from "./core.js";
import { elementFor, elementById, keywordFor, meaningTable, meaningWordFor } from "./rules.js";
import { canSearchArea, canSearchGeneral } from "./derived.js";
import * as store from "./store.js";

function log(room, entry) {
  store.logRoll({
    crawlId: room ? room.crawlId : null,
    roomId: room ? room.id : null,
    roomName: room ? (room.context.label || "Untitled room") : null,
    ...entry
  });
}

// ── Keywords (R1) ────────────────────────────────────────────────────────────
export function rollKeyword(room, n) {
  const roll = d100();
  const word = keywordFor(roll);
  log(room, { table: "Room Descriptors", roll, result: word, areaId: null, context: "keyword " + n });
  return { n, roll, word, use: "pending" };
}

// ── Element resolution ───────────────────────────────────────────────────────
// Multi-Element (rulings A3, A4): exactly two further rolls, always. A second
// Multi-Element, or a repeat of the first, becomes Expected — so the cascade
// terminates at two every time and can never run away.
// The substitution rule on its own, so it can be checked without dice:
// a second Multi-Element, or a repeat of one already rolled, becomes Expected.
export function resolveSubBand(roll, priorIds) {
  const band = elementFor(roll);
  if (band.id === "multi" || priorIds.includes(band.id)) {
    return { band: elementById("expected"), substituted: band.name };
  }
  return { band, substituted: null };
}

function expandMultiElement(room, areaId, label) {
  const subs = [];
  for (let i = 0; i < 2; i++) {
    const roll = d100();
    const { band, substituted } = resolveSubBand(roll, subs.map(s => s.elementId));
    log(room, {
      table: "Room Elements", roll, result: band.name, areaId,
      context: label + " · multi-element " + (i + 1) + (substituted ? " (" + substituted + " became Expected)" : "")
    });
    subs.push({ roll, elementId: band.id, elementName: band.name, substituted });
  }
  return subs;
}

function rollElement(room, areaId, label) {
  const roll = d100();
  const band = elementFor(roll);
  log(room, { table: "Room Elements", roll, result: band.name, areaId, context: label });
  const find = {
    roll, elementId: band.id, elementName: band.name,
    sub: band.id === "multi" ? expandMultiElement(room, areaId, label) : [],
    meaning: null, note: "", ts: Date.now()
  };
  return find;
}

// True when the find still owes a Meaning-table pair (element Random, R17).
export function needsMeaning(find) {
  if (!find) return false;
  if (find.meaning) return false;
  if (find.elementId === "random") return true;
  return (find.sub || []).some(s => s.elementId === "random");
}

// ── Searching an Area (R11, A2) ──────────────────────────────────────────────
export function searchArea(room, areaId) {
  if (!canSearchArea(room, areaId)) {
    return { ok: false, reason: "This Area has already been searched. Room Crafter allows one roll per Area — that is the whole of it.", ruleId: "search" };
  }
  const area = room.areas.find(a => a.id === areaId);
  const find = rollElement(room, areaId, area.name);
  area.search = find;
  store.saveRoom(room);
  return { ok: true, find };
}

// ── The General Area (R19, A1, A12) ──────────────────────────────────────────
export function searchGeneralArea(room) {
  if (!canSearchGeneral(room)) {
    return { ok: false, reason: "The General Area gets one roll per room, and this room has had it.", ruleId: "general-area" };
  }
  const find = rollElement(room, null, "General Area");
  room.generalArea = find;
  store.saveRoom(room);
  return { ok: true, find };
}

// ── Meaning pairs (R17, R18, A10, A11) ───────────────────────────────────────
// Doubles are kept, not re-rolled: on a meaning table a repeated word amplifies.
export function rollMeaningPair(room, tableId, { areaId = null, label = "Random" } = {}) {
  const table = meaningTable(tableId);
  const rolls = [d100(), d100()];
  const words = rolls.map(r => meaningWordFor(table.id, r));
  log(room, {
    table: table.name, roll: rolls[0], result: words[0], areaId, context: label + " · keyword 1"
  });
  log(room, {
    table: table.name, roll: rolls[1], result: words[1], areaId, context: label + " · keyword 2"
  });
  return { tableId: table.id, tableName: table.name, rolls, words, doubled: words[0] === words[1] };
}

export function attachMeaning(room, target, tableId) {
  const areaId = target.areaId || null;
  const find = target.find;
  find.meaning = rollMeaningPair(room, tableId, { areaId, label: "Random element" });
  store.saveRoom(room);
  return find.meaning;
}

// Repeat-roll affordance (§14.1.8): a fresh, separately logged roll — never a
// silent re-roll of the same action.
export function rerollMeaning(room, find, tableId, areaId = null) {
  find.meaning = rollMeaningPair(room, tableId, { areaId, label: "Random element (rolled again)" });
  store.saveRoom(room);
  return find.meaning;
}

// A standalone detail roll on any Meaning table — the article's sock-drawer use:
// you have found the drawer, now you pick up one sock. Kept in one list on the
// room, tagged with the Area it belongs to, so there is one shape and one
// renderer for them all.
export function rollDetail(room, tableId, areaId = null) {
  const meaning = rollMeaningPair(room, tableId, { areaId, label: "Detail" });
  room.details = [...(room.details || []), { areaId, ...meaning, ts: Date.now() }];
  store.saveRoom(room);
  return meaning;
}

export function rollRoomType(room, list) {
  const roll = d100();
  const pick = list[(roll - 1) % list.length];
  log(room, { table: "Room types (house aid)", roll, result: pick, context: "room type", houseAid: true });
  return pick;
}
