// mythic.js — the One-Page Mythic engine, behind Settings.useMythic.
// Ask The Game Master resolves a yes/no question against an odds row; a double
// on that same d100 also fires a Random Event. Discover Meaning hands back
// words to interpret. Every roll here goes through the same logged dice as the
// rest of the app.
import { d100 } from "./core.js";
import { ODDS, ANSWERS, DISCOVER_MEANING, RANDOM_EVENT_ROLLS, MEANING_COLUMNS,
         DEFAULT_ODDS, MYTHIC_EXPLAIN, MYTHIC } from "../data-mythic.js";
import * as store from "./store.js";

export { ODDS, ANSWERS, MEANING_COLUMNS, DEFAULT_ODDS, MYTHIC_EXPLAIN, MYTHIC };

export function oddsById(id) {
  return ODDS.find(o => o.id === id) || ODDS.find(o => o.id === DEFAULT_ODDS);
}

// Pure: which answer a roll lands on for a given odds row.
export function answerFor(oddsId, roll) {
  const row = oddsById(oddsId);
  for (const a of ANSWERS) {
    const band = row[a.key];
    if (roll >= band[0] && roll <= band[1]) return a;
  }
  throw new Error("Ask The GM: no answer for " + roll + " at odds " + oddsId);
}

// Pure: a double digit generates a Random Event, whatever the answer was.
export function isRandomEvent(roll) {
  return RANDOM_EVENT_ROLLS.includes(roll);
}

// Pure: the Discover Meaning row a roll lands on.
export function meaningRowFor(roll) {
  const row = DISCOVER_MEANING.find(r => roll >= r.min && roll <= r.max);
  if (!row) throw new Error("Discover Meaning: no row for roll " + roll);
  return row;
}

function log(room, entry) {
  store.logRoll({
    crawlId: room ? room.crawlId : null,
    roomId: room ? room.id : null,
    roomName: room ? (room.context.label || "Untitled room") : null,
    mythic: true,
    ...entry
  });
}

// ── Discover Meaning ─────────────────────────────────────────────────────────
// One roll per column asked for. The default pair is Action + Description,
// which is what the Room Crafter's Random element wants.
export function discoverMeaning(room, columns = ["action", "description"], label = "Discover Meaning") {
  const rolls = [], words = [], cols = [];
  for (const c of columns) {
    const roll = d100();
    const word = meaningRowFor(roll)[c];
    log(room, { table: "Discover Meaning", roll, result: word, areaId: null, context: label + " · " + c });
    rolls.push(roll); words.push(word); cols.push(c);
  }
  return {
    tableId: "mythic", tableName: "Discover Meaning",
    rolls, words, columns: cols,
    doubled: words.length === 2 && words[0] === words[1]
  };
}

// "Get more words": keep rolling until an interpretation comes clear.
export function anotherWord(room, meaning, column = "action") {
  const roll = d100();
  const word = meaningRowFor(roll)[column];
  log(room, { table: "Discover Meaning", roll, result: word, areaId: null, context: "another word · " + column });
  meaning.rolls = [...meaning.rolls, roll];
  meaning.words = [...meaning.words, word];
  meaning.columns = [...(meaning.columns || []), column];
  return meaning;
}

// ── Ask The Game Master ──────────────────────────────────────────────────────
// One d100 produces both the answer and, on a double, the Random Event — the
// event is not a second question, it is the same roll read twice.
export function ask(room, oddsId, question, label = "Ask The GM") {
  const row = oddsById(oddsId);
  const roll = d100();
  const answer = answerFor(row.id, roll);
  log(room, { table: "Ask The GM", roll, result: answer.name, areaId: null, context: question || label });

  const result = {
    question: question || "",
    odds: row.id, oddsName: row.name,
    roll, answer: answer.id, answerName: answer.name, answerBlurb: answer.blurb,
    event: null, ts: Date.now()
  };
  if (isRandomEvent(roll)) {
    result.event = discoverMeaning(room, ["action", "description"], "Random Event");
  }
  return result;
}
