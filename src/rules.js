// rules.js — pure lookups over the data library. No state, no DOM.
import {
  ROOM_DESCRIPTORS, SOCK_DRAWER, ROOM_ELEMENTS, ENCOUNTER_ANSWERS,
  BUDGETS, MEANING_TABLES, RULES_LIBRARY
} from "../data.js";

export function keywordFor(roll) {
  return ROOM_DESCRIPTORS[roll - 1];
}

export function meaningTable(id) {
  return MEANING_TABLES.find(t => t.id === id) || MEANING_TABLES[0];
}

export function meaningWordFor(tableId, roll) {
  return meaningTable(tableId).rows[roll - 1];
}

// Range lookup. Every value 1–100 resolves; see the harness's coverage test.
export function elementFor(roll) {
  const band = ROOM_ELEMENTS.find(b => roll >= b.min && roll <= b.max);
  if (!band) throw new Error("Room Elements: no band for roll " + roll);
  return band;
}

export function elementById(id) {
  const band = ROOM_ELEMENTS.find(b => b.id === id);
  if (!band) throw new Error("Room Elements: no band with id " + id);
  return band;
}

export function encounterAnswer(id) {
  return ENCOUNTER_ANSWERS.find(a => a.id === id) || null;
}

export function budget(keywords) {
  return BUDGETS.find(b => b.keywords === keywords) || BUDGETS[0];
}

export { ROOM_ELEMENTS, ENCOUNTER_ANSWERS, BUDGETS, MEANING_TABLES, RULES_LIBRARY, SOCK_DRAWER };
