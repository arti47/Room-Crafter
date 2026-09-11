// lifecycle.js — the boundaries. Room boundaries clear the once-per-X flags;
// crawl boundaries sequence rooms. Every bundle reports what it changed and can
// be undone in one step (§6.4).
import * as store from "./store.js";
import { encounterAnswer } from "./rules.js";
import { searchedAreas, areaCount, generalDone, isComplete, searchState, STATE_LABEL } from "./derived.js";

// ── The encounter check (R9, ruling A9) ──────────────────────────────────────
// Blocked B1: this build has no Fate Chart, so the app asks the question, you
// answer it from your own Mythic tables, and it holds the answer. Guidance only.
export function recordEncounter(room, answerId, note, mythicResult = null) {
  const ans = encounterAnswer(answerId);
  if (!ans) return null;
  store.snapshot("Record encounter");
  room.encounter = {
    asked: true, answer: ans.id, answerName: ans.name,
    note: note || "", ts: Date.now(),
    // Present only when Mythic answered it; absent when you rolled it yourself.
    odds: mythicResult ? mythicResult.odds : null,
    oddsName: mythicResult ? mythicResult.oddsName : null,
    roll: mythicResult ? mythicResult.roll : null,
    answerBlurb: mythicResult ? mythicResult.answerBlurb : ans.blurb,
    event: mythicResult ? mythicResult.event : null
  };
  store.saveRoom(room);
  return room.encounter;
}

export function clearEncounter(room) {
  store.snapshot("Clear encounter answer");
  room.encounter = null;
  store.saveRoom(room);
}

// ── Hidden searches (R24, §7) ────────────────────────────────────────────────
// Also blocked B1 — your game's task mechanic, then a Fate Question at whatever
// odds you set. Recorded, not automated.
export function recordHidden(room, question, answer, note, mythicResult = null) {
  store.snapshot("Record hidden search");
  room.hidden = [...(room.hidden || []), {
    question: question || "Is something hidden found?",
    answer,
    answerName: mythicResult ? mythicResult.answerName : answer,
    answerBlurb: mythicResult ? mythicResult.answerBlurb : null,
    odds: mythicResult ? mythicResult.odds : null,
    oddsName: mythicResult ? mythicResult.oddsName : null,
    roll: mythicResult ? mythicResult.roll : null,
    event: mythicResult ? mythicResult.event : null,
    note: note || "", ts: Date.now()
  }];
  store.saveRoom(room);
  return room.hidden[room.hidden.length - 1];
}

// ── Room boundary ────────────────────────────────────────────────────────────
// This is the clearer for both once-per-X flags (R12): a new room record starts
// with search: null on every Area and no General Area. Nothing else clears them,
// and nothing else should — one roll per Area means one roll for that Area's life.
export function newRoom(crawlId, context, budget) {
  const rm = store.createRoom(crawlId, context, budget);
  if (searchedAreas(rm) !== 0 || generalDone(rm)) {
    throw new Error("newRoom produced a room with spent search flags");
  }
  return rm;
}

export function nextRoom(fromRoom, context, budget) {
  return newRoom(fromRoom.crawlId, context, budget || fromRoom.budget);
}

// What finishing a room actually reports (§6.4: boundary events summarise).
export function roomSummary(room) {
  const lines = [];
  lines.push(areaCount(room) + " Areas from " + (room.keywords || []).length + " keywords");
  lines.push(searchedAreas(room) + " of " + areaCount(room) + " Areas searched");
  lines.push("General Area: " + (generalDone(room) ? room.generalArea.elementName : "not searched"));
  if (room.encounter) lines.push("Encounter: " + room.encounter.answerName);
  if ((room.hidden || []).length) lines.push((room.hidden || []).length + " hidden search(es) recorded");
  lines.push("State: " + STATE_LABEL[searchState(room)]);
  return lines;
}

export function crawlSummary(crawlId) {
  const list = store.rooms(crawlId);
  const done = list.filter(isComplete).length;
  return {
    rooms: list.length,
    complete: done,
    described: list.length - done,
    lines: [
      list.length + " room(s) in this crawl",
      done + " fully explored, " + (list.length - done) + " left described or part searched"
    ]
  };
}

export { isComplete, searchState, STATE_LABEL };
