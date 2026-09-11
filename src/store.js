// store.js — all persistence. localStorage only; no backend, no keys, no network.
// Plain JSON throughout so the data outlives the app (template §5.1).
import { uid } from "./core.js";
import { normalizeRoom, normalizeCrawl, isComplete } from "./derived.js";
import { ROLL_LOG_CAP, UNDO_CAP } from "../data.js";
import { all as allSettings, replaceAll as replaceSettings } from "./settings.js";

const K = {
  crawls: "rc.crawls",
  rooms: "rc.rooms",
  log: "rc.rollLog",
  undo: "rc.undo",
  current: "rc.current"
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(); }

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// ── Crawls ───────────────────────────────────────────────────────────────────
export function crawls() {
  return read(K.crawls, []).map(normalizeCrawl)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}
export function crawl(id) {
  const c = read(K.crawls, []).find(x => x.id === id);
  return c ? normalizeCrawl(c) : null;
}
export function createCrawl(name) {
  snapshot("Create crawl");
  const c = normalizeCrawl({ id: uid("crawl"), name: name || "Untitled crawl", createdAt: Date.now() });
  write(K.crawls, [...read(K.crawls, []), c]);
  setCurrent({ crawlId: c.id, roomId: null });
  emit();
  return c;
}
export function updateCrawl(id, patch) {
  const list = read(K.crawls, []);
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return null;
  list[i] = normalizeCrawl({ ...list[i], ...patch });
  write(K.crawls, list);
  emit();
  return list[i];
}
export function touchCrawl(id) {
  const list = read(K.crawls, []);
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], lastOpenedAt: Date.now() };
  write(K.crawls, list);
}
export function deleteCrawl(id) {
  snapshot("Delete crawl");
  write(K.crawls, read(K.crawls, []).filter(c => c.id !== id));
  write(K.rooms, read(K.rooms, []).filter(r => r.crawlId !== id));
  const cur = current();
  if (cur.crawlId === id) setCurrent({ crawlId: null, roomId: null });
  emit();
}

// ── Rooms ────────────────────────────────────────────────────────────────────
export function rooms(crawlId) {
  const all = read(K.rooms, []).map(normalizeRoom);
  if (!crawlId) return all;
  const order = (crawl(crawlId) || { rooms: [] }).rooms;
  const mine = all.filter(r => r.crawlId === crawlId);
  return mine.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
export function room(id) {
  const r = read(K.rooms, []).find(x => x.id === id);
  return r ? normalizeRoom(r) : null;
}
export function saveRoom(rm) {
  const list = read(K.rooms, []);
  const next = normalizeRoom(rm);
  next.state = { complete: isComplete(next) };
  const i = list.findIndex(r => r.id === next.id);
  if (i < 0) list.push(next); else list[i] = next;
  write(K.rooms, list);
  emit();
  return next;
}
export function createRoom(crawlId, context, budget) {
  snapshot("Start room");
  const rm = normalizeRoom({
    id: uid("room"), crawlId, budget, context, createdAt: Date.now()
  });
  const list = read(K.rooms, []);
  list.push(rm);
  write(K.rooms, list);
  const c = crawl(crawlId);
  if (c) updateCrawl(crawlId, { rooms: [...c.rooms, rm.id], lastOpenedAt: Date.now() });
  setCurrent({ crawlId, roomId: rm.id });
  emit();
  return rm;
}
export function deleteRoom(id) {
  snapshot("Delete room");
  const rm = room(id);
  write(K.rooms, read(K.rooms, []).filter(r => r.id !== id));
  if (rm && rm.crawlId) {
    const c = crawl(rm.crawlId);
    if (c) updateCrawl(rm.crawlId, { rooms: c.rooms.filter(x => x !== id) });
  }
  const cur = current();
  if (cur.roomId === id) setCurrent({ ...cur, roomId: null });
  emit();
}

// ── Current context ──────────────────────────────────────────────────────────
export function current() {
  return read(K.current, { crawlId: null, roomId: null });
}
export function setCurrent(next) {
  write(K.current, next);
  emit();
}

// ── Roll log ─────────────────────────────────────────────────────────────────
// Written at the moment of the roll, by the roller, and never anywhere else:
// one action produces exactly one entry (template §5.1, "never re-roll silently").
export function logRoll(entry) {
  const list = read(K.log, []);
  list.unshift({ id: uid("roll"), ts: Date.now(), ...entry });
  write(K.log, list.slice(0, ROLL_LOG_CAP));
  emit();
}
export function rollLog() { return read(K.log, []); }
export function clearRollLog() {
  snapshot("Clear roll log");
  write(K.log, []);
  emit();
}
export function distribution() {
  const counts = new Array(101).fill(0);
  let total = 0;
  for (const r of read(K.log, [])) {
    if (typeof r.roll === "number" && r.roll >= 1 && r.roll <= 100) { counts[r.roll]++; total++; }
  }
  return { counts, total };
}

// ── Undo ─────────────────────────────────────────────────────────────────────
// One stack. Any mutating action pushes (§14.1.2) — so ending a crawl is as
// recoverable as ending a room, which is the whole point.
function stateBlob() {
  return {
    crawls: read(K.crawls, []),
    rooms: read(K.rooms, []),
    log: read(K.log, []),
    current: read(K.current, { crawlId: null, roomId: null })
  };
}
export function snapshot(label) {
  const stack = read(K.undo, []);
  stack.unshift({ label, ts: Date.now(), blob: stateBlob() });
  write(K.undo, stack.slice(0, UNDO_CAP));
}
export function lastUndo() {
  return read(K.undo, [])[0] || null;
}
export function undo() {
  const stack = read(K.undo, []);
  const top = stack.shift();
  if (!top) return null;
  write(K.crawls, top.blob.crawls);
  write(K.rooms, top.blob.rooms);
  write(K.log, top.blob.log);
  write(K.current, top.blob.current);
  write(K.undo, stack);
  emit();
  return top.label;
}

// ── Export / import ──────────────────────────────────────────────────────────
export const EXPORT_VERSION = 1;

export function exportJSON() {
  return JSON.stringify({
    app: "room-crafter",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: allSettings(),
    crawls: read(K.crawls, []),
    rooms: read(K.rooms, []),
    rollLog: read(K.log, [])
  }, null, 2);
}

export function importJSON(text, { merge = false } = {}) {
  let data;
  try { data = JSON.parse(text); }
  catch { return { ok: false, error: "That file is not valid JSON." }; }
  if (!data || data.app !== "room-crafter") {
    return { ok: false, error: "That file was not exported by Room Crafter." };
  }
  snapshot("Import data");
  const inCrawls = (data.crawls || []).map(normalizeCrawl);
  const inRooms = (data.rooms || []).map(normalizeRoom);
  if (merge) {
    const haveC = new Set(read(K.crawls, []).map(c => c.id));
    const haveR = new Set(read(K.rooms, []).map(r => r.id));
    write(K.crawls, [...read(K.crawls, []), ...inCrawls.filter(c => !haveC.has(c.id))]);
    write(K.rooms, [...read(K.rooms, []), ...inRooms.filter(r => !haveR.has(r.id))]);
  } else {
    write(K.crawls, inCrawls);
    write(K.rooms, inRooms);
    write(K.log, (data.rollLog || []).slice(0, ROLL_LOG_CAP));
    if (data.settings) replaceSettings(data.settings);
  }
  emit();
  return { ok: true, crawls: inCrawls.length, rooms: inRooms.length };
}

// Read-aloud export: the room as plain text for the table (§14.1.7).
export function roomAsText(rm) {
  const L = [];
  const ctx = rm.context || {};
  L.push(ctx.label || "Untitled room");
  if (ctx.roomType) L.push("(" + ctx.roomType + ")");
  L.push("");
  if (rm.description) { L.push(rm.description, ""); }
  if (rm.encounter) {
    const e = rm.encounter;
    L.push("Encounter: " + e.answerName + (e.oddsName ? " (" + e.oddsName + ", rolled " + e.roll + ")" : "") +
      (e.note ? " — " + e.note : ""));
    if (e.event) L.push("  Random Event: " + e.event.words.join(" / "));
    L.push("");
  }
  L.push("Areas:");
  for (const a of rm.areas || []) {
    const words = (a.fromKeywords || []).map(n => {
      const k = (rm.keywords || []).find(x => x.n === n);
      return k ? k.word : null;
    }).filter(Boolean).join(" + ");
    L.push("  - " + a.name + (words ? "  [" + words + "]" : ""));
    if (a.search) L.push("      " + describeFind(a.search));
    for (const d of (rm.details || []).filter(x => x.areaId === a.id)) {
      L.push("      detail: " + d.words.join(" / ") + " [" + d.tableName + "]");
    }
    if (a.note) L.push("      " + a.note);
  }
  L.push("");
  L.push("General Area (the room itself):");
  L.push("  " + (rm.generalArea ? describeFind(rm.generalArea) : "not searched"));
  for (const d of (rm.details || []).filter(x => x.areaId === null)) {
    L.push("      detail: " + d.words.join(" / ") + " [" + d.tableName + "]");
  }
  if ((rm.hidden || []).length) {
    L.push("", "Hidden searches:");
    for (const h of rm.hidden) {
      L.push("  - " + h.question + " -> " + (h.answerName || h.answer) +
        (h.oddsName ? " (" + h.oddsName + ", rolled " + h.roll + ")" : "") +
        (h.note ? " — " + h.note : ""));
      if (h.event) L.push("      Random Event: " + h.event.words.join(" / "));
    }
  }
  if (rm.notes) L.push("", "Notes:", rm.notes);
  return L.join("\n");
}

export function describeFind(find) {
  if (!find) return "not searched";
  const bits = [find.elementName + " (" + find.roll + ")"];
  for (const s of find.sub || []) bits.push(s.elementName + " (" + s.roll + ")");
  if (find.meaning) bits.push(find.meaning.words.join(" / ") + " [" + find.meaning.tableName + "]");
  let out = bits.join(" + ");
  if (find.note) out += " — " + find.note;
  return out;
}

export function wipeAll() {
  snapshot("Erase everything");
  write(K.crawls, []); write(K.rooms, []); write(K.log, []);
  write(K.current, { crawlId: null, roomId: null });
  emit();
}

// Data-integrity action (§14.1.9): run normalization and report what it changed.
export function checkData() {
  const beforeRooms = JSON.stringify(read(K.rooms, []));
  const beforeCrawls = JSON.stringify(read(K.crawls, []));
  const nRooms = read(K.rooms, []).map(normalizeRoom);
  const nCrawls = read(K.crawls, []).map(normalizeCrawl);
  const roomIds = new Set(nRooms.map(r => r.id));
  const repairs = [];
  for (const c of nCrawls) {
    const before = c.rooms.length;
    c.rooms = c.rooms.filter(id => roomIds.has(id));
    if (c.rooms.length !== before) repairs.push(c.name + ": dropped " + (before - c.rooms.length) + " missing room reference(s)");
  }
  for (const r of nRooms) {
    if (r.crawlId && !nCrawls.some(c => c.id === r.crawlId)) {
      repairs.push((r.context.label || "A room") + ": belongs to a crawl that no longer exists");
    }
  }
  if (JSON.stringify(nRooms) !== beforeRooms) repairs.push("Room records back-filled to the current shape");
  if (JSON.stringify(nCrawls) !== beforeCrawls) repairs.push("Crawl records back-filled to the current shape");
  write(K.rooms, nRooms);
  write(K.crawls, nCrawls);
  emit();
  return repairs;
}
