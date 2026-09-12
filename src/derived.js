// derived.js — everything computed from a room record. Pure; no storage, no DOM.
import { budget } from "./rules.js";

export function areaCount(room) {
  return room.areas ? room.areas.length : 0;
}

// Areas + the General Area (rulings A1, A12 — always exactly one, any budget).
export function totalExplorable(room) {
  return areaCount(room) + 1;
}

export function searchedAreas(room) {
  return (room.areas || []).filter(a => a.search).length;
}

export function generalDone(room) {
  return !!room.generalArea;
}

export function searchedTotal(room) {
  return searchedAreas(room) + (generalDone(room) ? 1 : 0);
}

// Ruling A2: one roll per Area, ever. This is the only gate on searching.
export function canSearchArea(room, areaId) {
  const area = (room.areas || []).find(a => a.id === areaId);
  return !!area && !area.search;
}

export function canSearchGeneral(room) {
  return !generalDone(room);
}

// Ruling A20/A14: complete means every Area plus the General Area has been rolled.
export function isComplete(room) {
  return areaCount(room) > 0 && searchedAreas(room) === areaCount(room) && generalDone(room);
}

// Four honest states. "described" is a real resting place, not a failure (A14).
export function searchState(room) {
  if (!room.areas || room.areas.length === 0) return "building";
  if (isComplete(room)) return "complete";
  if (searchedTotal(room) === 0) return "described";
  return "searching";
}

export const STATE_LABEL = {
  building: "Being made",
  described: "Described, not searched",
  searching: "Part searched",
  complete: "Fully explored"
};

// Where the article's procedure is up to, for the pinned primary action:
// describe → ask → search each Area → General Area → finish.
export function nextStep(room) {
  if (!room.encounter && !room.encounterSkipped) return { step: "ask" };
  const area = (room.areas || []).find(a => !a.search);
  if (area) return { step: "search", areaId: area.id, areaName: area.name };
  if (canSearchGeneral(room)) return { step: "general" };
  return { step: "finish" };
}

export function budgetInfo(room) {
  return budget(room.budget || 6);
}

// Keywords remaining is NOT derived here: the wizard owns that count and reads
// it from the record, and two paths deriving one count is how they come to
// disagree (template §10.12).

// ── Normalization / migration ────────────────────────────────────────────────
// Runs on every load. Back-fills defaults so old records never crash, and is the
// pass that would reset any spent once-per-X flag that should not have survived.
export function normalizeRoom(room) {
  const r = { ...room };
  r.id = r.id || "";
  r.crawlId = r.crawlId || null;
  r.createdAt = r.createdAt || Date.now();
  r.budget = r.budget === 3 ? 3 : 6;
  r.context = {
    label: "", roomType: "", houseAidType: false, multiRoomNote: "",
    ...(r.context || {})
  };
  delete r.context.genreNote;   // never had a control; removed (audit A-18)
  r.keywords = Array.isArray(r.keywords) ? r.keywords : [];
  r.areas = (Array.isArray(r.areas) ? r.areas : []).map((a, i) => ({
    id: a.id || "area_" + i,
    name: a.name || "Unnamed area",
    fromKeywords: Array.isArray(a.fromKeywords) ? a.fromKeywords : [],
    order: typeof a.order === "number" ? a.order : i,
    search: a.search || null,
    note: a.note || ""
  })).sort((a, b) => a.order - b.order);
  r.generalArea = r.generalArea || null;
  r.details = Array.isArray(r.details) ? r.details : [];
  r.encounter = r.encounter || null;
  r.hidden = (Array.isArray(r.hidden) ? r.hidden : []).map(h => ({
    question: h.question || "Is something hidden found?",
    answer: h.answer || "",
    answerName: h.answerName || h.answer || "",
    answerBlurb: h.answerBlurb || null,
    odds: h.odds || null, oddsName: h.oddsName || null, roll: h.roll || null,
    event: h.event || null, note: h.note || "", ts: h.ts || 0
  }));
  if (r.encounter) {
    r.encounter = {
      odds: null, oddsName: null, roll: null, answerBlurb: null, event: null,
      note: "", ...r.encounter
    };
  }
  // Free yes/no questions asked of the GM about this room (Mythic, R38).
  r.questions = (Array.isArray(r.questions) ? r.questions : []).map(q => ({
    question: q.question || "", answer: q.answer || "", answerName: q.answerName || "",
    answerBlurb: q.answerBlurb || null, odds: q.odds || null, oddsName: q.oddsName || null,
    roll: q.roll || null, event: q.event || null, note: q.note || "", ts: q.ts || 0
  }));
  // The encounter question may be passed over (a permission, not a gate).
  r.encounterSkipped = !!r.encounterSkipped;
  r.description = r.description || "";
  r.notes = r.notes || "";
  // Derived-but-stored, for list rendering. Always recomputed, never trusted.
  r.state = { complete: isComplete(r) };
  return r;
}

export function normalizeCrawl(crawl) {
  return {
    id: crawl.id || "",
    name: crawl.name || "Untitled crawl",
    createdAt: crawl.createdAt || Date.now(),
    lastOpenedAt: crawl.lastOpenedAt || crawl.createdAt || Date.now(),
    rooms: Array.isArray(crawl.rooms) ? crawl.rooms.filter(Boolean) : []
  };
}
