// Harness A — parse gate, rules invariants, table completeness.
// Every row of CLAUDE.md §5's Test column has a check here.
import "./env.mjs";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resetStorage } from "./env.mjs";

let pass = 0, fail = 0;
const failures = [];
function check(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; failures.push(name + " — " + e.message); }
}
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg || "") + " expected " + B + ", got " + A);
}
function ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); }

// ── Parse gate: a missing paren in a screen module is a screen that never
// renders and a test run that hangs. One second, every time, by filename.
const sources = [
  ...readdirSync("src").filter(f => f.endsWith(".js")).map(f => "src/" + f),
  "data.js", "data-house-roomtypes.js", "service-worker.js"
];
for (const f of sources) {
  check("parses: " + f, () => { execFileSync("node", ["--check", f], { stdio: "pipe" }); });
}

const data = await import("../data.js");
const rules = await import("../src/rules.js");
const derived = await import("../src/derived.js");
const store = await import("../src/store.js");
const roller = await import("../src/roller.js");
const wizard = await import("../src/wizard.js");
const lifecycle = await import("../src/lifecycle.js");
const house = await import("../data-house-roomtypes.js");

// ── Tables (T1–T5) ───────────────────────────────────────────────────────────
check("T1 Room Descriptors has 100 unique rows", () => {
  eq(data.ROOM_DESCRIPTORS.length, 100);
  eq(new Set(data.ROOM_DESCRIPTORS).size, 100);
});
check("T2 Sock Drawer has 100 unique rows", () => {
  eq(data.SOCK_DRAWER.length, 100);
  eq(new Set(data.SOCK_DRAWER).size, 100);
});
check("tables are alphabetical within each column half (recovery check)", () => {
  for (const t of [data.ROOM_DESCRIPTORS, data.SOCK_DRAWER]) {
    const a = t.slice(0, 50), b = t.slice(50);
    eq(a, [...a].sort());
    eq(b, [...b].sort());
  }
});
check("T3 every d100 value resolves to exactly one Element band", () => {
  for (let i = 1; i <= 100; i++) {
    const hits = data.ROOM_ELEMENTS.filter(b => i >= b.min && i <= b.max);
    eq(hits.length, 1, "roll " + i + ":");
    ok(rules.elementFor(i));
  }
});
check("T3 band widths match the published table", () => {
  const w = {};
  for (const b of data.ROOM_ELEMENTS) w[b.id] = b.max - b.min + 1;
  eq(w, { expected: 40, enhanced: 10, minimized: 15, fortunate: 5, unfortunate: 10, random: 15, multi: 5 });
});
check("T1/T2 keyword lookup is 1-indexed at both ends", () => {
  eq(rules.keywordFor(1), "Active");
  eq(rules.keywordFor(100), "Wrecked");
  eq(rules.meaningWordFor("sock", 1), "Amusing");
  eq(rules.meaningWordFor("sock", 100), "Yellow");
});
check("T5 budgets carry the Area ranges the article states", () => {
  eq(rules.budget(6).areas, [3, 6]);
  eq(rules.budget(3).areas, [2, 3]);
});
check("T6 every rules-library entry has a body and a citation", () => {
  for (const r of data.RULES_LIBRARY) { ok(r.body.length > 40, r.id); ok(r.cite, r.id); }
});

// ── Dice (R29) ───────────────────────────────────────────────────────────────
const core = await import("../src/core.js");
check("R29 d100 stays in range and reaches both ends", () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const v = core.d100();
    ok(v >= 1 && v <= 100 && Number.isInteger(v), "out of range: " + v);
    seen.add(v);
  }
  ok(seen.size === 100, "only reached " + seen.size + " of 100 faces");
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function freshRoom(budget = 6) {
  resetStorage();
  const c = store.createCrawl("Test");
  return store.createRoom(c.id, { label: "Test room", roomType: "Cell" }, budget);
}
function walk(room, strategy) {
  // strategy(pendingWords, index) -> "area" | "carry" | "drop"
  let guard = 0;
  while (!wizard.isWalkDone(room) && guard++ < 40) {
    if (wizard.pending(room).length === 0) { wizard.rollNext(room); continue; }
    const move = strategy(wizard.pending(room), room);
    if (move === "carry" && wizard.canCarry(room)) wizard.carryForward(room);
    else if (move === "drop" && wizard.canDrop(room)) wizard.dropLast(room);
    else wizard.makeArea(room, "Area " + ((room.areas || []).length + 1));
  }
  return room;
}

// ── Wizard (R1–R8) ───────────────────────────────────────────────────────────
check("R1 keywords arrive one at a time, numbered in order", () => {
  const room = freshRoom(6);
  for (let i = 1; i <= 6; i++) {
    if (wizard.pending(room).length) wizard.makeArea(room, "A" + i);
    const before = room.keywords.length;
    const r = wizard.rollNext(room);
    if (!r.ok) break;
    eq(room.keywords.length, before + 1);
    eq(room.keywords[room.keywords.length - 1].n, before + 1);
  }
  eq(room.keywords.map(k => k.n), [1, 2, 3, 4, 5, 6]);
});
check("R1 rolling past the budget is refused", () => {
  const room = walk(freshRoom(6), () => "area");
  const r = wizard.rollNext(room);
  eq(r.ok, false);
});
check("R2 one keyword can become an Area on its own", () => {
  const room = freshRoom(6);
  wizard.rollNext(room);
  wizard.makeArea(room, "A lantern on a hook");
  eq(room.areas.length, 1);
  eq(room.areas[0].fromKeywords.length, 1);
  eq(room.keywords[0].use, "area");
});
check("R2 an Area with no name is refused — the interpretation is the point", () => {
  const room = freshRoom(6);
  wizard.rollNext(room);
  eq(wizard.makeArea(room, "   ").ok, false);
  eq(room.areas.length, 0);
});
check("R3 a carried pair makes one Area and consumes both keywords", () => {
  const room = freshRoom(6);
  wizard.rollNext(room);
  wizard.carryForward(room);
  eq(wizard.pending(room).length, 2);
  wizard.makeArea(room, "Crates jammed by the bed");
  eq(room.areas.length, 1);
  eq(room.areas[0].fromKeywords, [1, 2]);
  eq(room.keywords[0].use, "combined");
  eq(room.keywords[1].use, "area");
});
check("R4 combining stops at two, and the refusal cites the rule", () => {
  const room = freshRoom(6);
  wizard.rollNext(room);
  wizard.carryForward(room);
  const r = wizard.carryForward(room);
  eq(r.ok, false);
  eq(r.ruleId, "combine-cap");
  eq(wizard.canCarry(room), false);
});
check("R4 six keywords never yield fewer than three Areas, however you walk", () => {
  for (let i = 0; i < 200; i++) {
    const room = walk(freshRoom(6), () => (Math.random() < 0.5 ? "carry" : "area"));
    ok(room.areas.length >= 3 && room.areas.length <= 6,
      "got " + room.areas.length + " Areas from six keywords");
  }
});
check("R5 dropping is refused until the final keyword", () => {
  const room = freshRoom(6);
  for (let i = 1; i <= 5; i++) {
    wizard.rollNext(room);
    eq(wizard.canDrop(room), false, "step " + i + ":");
    eq(wizard.dropLast(room).ok, false);
    wizard.makeArea(room, "A" + i);
  }
  wizard.rollNext(room);
  eq(wizard.canDrop(room), true);
  eq(wizard.dropLast(room).ok, true);
  eq(room.keywords[5].use, "dropped");
  eq(room.areas.length, 5);
});
check("R6/R7 a three-keyword room walks three steps and yields two or three Areas", () => {
  for (let i = 0; i < 100; i++) {
    const room = walk(freshRoom(3), () => (Math.random() < 0.5 ? "carry" : "area"));
    eq(room.keywords.length, 3);
    ok(room.areas.length >= 2 && room.areas.length <= 3, "got " + room.areas.length);
  }
});
check("R6 derived Area counts match the record", () => {
  const room = walk(freshRoom(6), () => "area");
  eq(derived.areaCount(room), 6);
  eq(derived.totalExplorable(room), 7); // Areas + the General Area
});

// ── Searching (R11–R21) ──────────────────────────────────────────────────────
check("R11 an Area takes exactly one roll, and the second is refused", () => {
  const room = walk(freshRoom(6), () => "area");
  const id = room.areas[0].id;
  const first = roller.searchArea(room, id);
  eq(first.ok, true);
  const second = roller.searchArea(room, id);
  eq(second.ok, false);
  eq(second.ruleId, "search");
  eq(derived.canSearchArea(room, id), false);
});
check("R12 a new room clears the search flags — and nothing else does", () => {
  const room = walk(freshRoom(6), () => "area");
  for (const a of room.areas) roller.searchArea(room, a.id);
  roller.searchGeneralArea(room);
  ok(derived.isComplete(room));
  const next = lifecycle.newRoom(room.crawlId, { label: "Next" }, 6);
  eq(derived.searchedAreas(next), 0);
  eq(derived.generalDone(next), false);
  // the finished room is untouched by the boundary
  const reread = store.room(room.id);
  ok(derived.isComplete(reread));
});
check("R13 Multi-Element always expands to exactly two sub-Elements", () => {
  const room = walk(freshRoom(6), () => "area");
  let multis = 0;
  for (let i = 0; i < 3000; i++) {
    const find = { roll: 100 };
    // drive the real path: search a fresh room's Area repeatedly
    const r2 = walk(freshRoom(3), () => "area");
    const res = roller.searchArea(r2, r2.areas[0].id);
    if (res.find.elementId === "multi") {
      multis++;
      eq(res.find.sub.length, 2, "multi produced the wrong number of sub-elements:");
      for (const s of res.find.sub) ok(s.elementId !== "multi", "a sub-element was Multi-Element");
    } else {
      eq(res.find.sub.length, 0);
    }
    if (multis > 60) break;
  }
  ok(multis > 0, "no Multi-Element came up in the sample");
});
check("R14 a repeat or a nested Multi-Element becomes Expected", () => {
  // Deterministic: the substitution rule without dice.
  const multiRoll = 98, expectedRoll = 10, fortunateRoll = 68;
  eq(roller.resolveSubBand(multiRoll, []).band.id, "expected");
  eq(roller.resolveSubBand(multiRoll, []).substituted, "Multi-Element");
  eq(roller.resolveSubBand(fortunateRoll, ["fortunate"]).band.id, "expected");
  eq(roller.resolveSubBand(fortunateRoll, ["fortunate"]).substituted, "Fortunate");
  eq(roller.resolveSubBand(expectedRoll, []).band.id, "expected");
  eq(roller.resolveSubBand(expectedRoll, []).substituted, null);
  eq(roller.resolveSubBand(fortunateRoll, ["expected"]).band.id, "fortunate");
});
check("R17 Random asks for a Meaning pair, and only then stops asking", () => {
  const room = walk(freshRoom(6), () => "area");
  const find = { elementId: "random", sub: [], meaning: null };
  eq(roller.needsMeaning(find), true);
  find.meaning = roller.rollMeaningPair(room, "sock");
  eq(roller.needsMeaning(find), false);
  const nested = { elementId: "multi", sub: [{ elementId: "random" }, { elementId: "expected" }], meaning: null };
  eq(roller.needsMeaning(nested), true);
});
check("R18 a Meaning pair is two words from the chosen table, doubles kept", () => {
  const room = walk(freshRoom(3), () => "area");
  let doubles = 0;
  for (let i = 0; i < 400; i++) {
    const m = roller.rollMeaningPair(room, "sock");
    eq(m.words.length, 2);
    eq(m.tableName, "Sock Drawer");
    for (const w of m.words) ok(data.SOCK_DRAWER.includes(w), "not a Sock Drawer word: " + w);
    if (m.words[0] === m.words[1]) { doubles++; ok(m.doubled === true); }
  }
  ok(doubles > 0, "no doubles in 400 pairs — they are being re-rolled somewhere");
});
check("R19 the General Area needs no prerequisite and takes one roll", () => {
  const room = walk(freshRoom(6), () => "area");
  eq(derived.canSearchGeneral(room), true);        // nothing searched yet
  eq(roller.searchGeneralArea(room).ok, true);
  const again = roller.searchGeneralArea(room);
  eq(again.ok, false);
  eq(again.ruleId, "general-area");
});
check("R19/A12 a three-keyword room still gets exactly one General Area", () => {
  const room = walk(freshRoom(3), () => "area");
  eq(derived.totalExplorable(room), room.areas.length + 1);
  eq(roller.searchGeneralArea(room).ok, true);
  eq(roller.searchGeneralArea(room).ok, false);
});
check("R20 complete flips on the last roll, not before", () => {
  const room = walk(freshRoom(6), () => "area");
  for (const a of room.areas) {
    roller.searchArea(room, a.id);
    eq(derived.isComplete(room), false, "complete before the General Area:");
  }
  roller.searchGeneralArea(room);
  eq(derived.isComplete(room), true);
});
check("R21 a skipped Area leaves the room described or part searched, never complete", () => {
  const room = walk(freshRoom(6), () => "area");
  eq(derived.searchState(room), "described");
  roller.searchArea(room, room.areas[0].id);
  eq(derived.searchState(room), "searching");
  roller.searchGeneralArea(room);
  eq(derived.isComplete(room), false);
  eq(derived.searchState(room), "searching");
});
check("R22/R23 a room with nothing searched is a legitimate resting state", () => {
  const room = walk(freshRoom(6), () => "area");
  const lines = lifecycle.roomSummary(room);
  ok(lines.some(l => l.includes("0 of")), "summary did not report unsearched Areas");
  eq(derived.searchState(room), "described");
});

check("R18 a detail roll lands on the room, tagged with its Area", () => {
  const room = walk(freshRoom(3), () => "area");
  const id = room.areas[0].id;
  roller.rollDetail(room, "sock", id);
  roller.rollDetail(room, "descriptors", null);
  const saved = store.room(room.id);
  eq(saved.details.length, 2);
  eq(saved.details[0].areaId, id);
  eq(saved.details[1].areaId, null);
  eq(saved.details[0].tableName, "Sock Drawer");
  // and it reaches the read-aloud text, which is the point of keeping it
  ok(store.roomAsText(saved).includes("detail:"));
});
check("R28 the next room joins the same crawl and inherits the budget", () => {
  const room = walk(freshRoom(3), () => "area");
  const next = lifecycle.nextRoom(room, { label: "The next one" });
  eq(next.crawlId, room.crawlId);
  eq(next.budget, 3);
  const order = store.crawl(room.crawlId).rooms;
  eq(order[order.length - 1], next.id);
  eq(store.rooms(room.crawlId).map(r => r.id).indexOf(next.id), order.length - 1);
});
check("R30 a house-aid roll is logged as a house aid", () => {
  const room = walk(freshRoom(3), () => "area");
  const before = store.rollLog().length;
  const types = house.ROOM_TYPES;
  const pick = roller.rollRoomType(room, types);
  ok(types.includes(pick));
  const entry = store.rollLog()[0];
  eq(entry.houseAid, true);
  eq(store.rollLog().length, before + 1);
});

// ── Roll log (R29) ───────────────────────────────────────────────────────────
check("R29 one search writes exactly one Element roll to the log", () => {
  const room = walk(freshRoom(3), () => "area");
  const before = store.rollLog().filter(r => r.table === "Room Elements").length;
  const res = roller.searchArea(room, room.areas[0].id);
  const after = store.rollLog().filter(r => r.table === "Room Elements").length;
  eq(after - before, res.find.elementId === "multi" ? 3 : 1);
});
check("R29 every logged roll carries its table, room and result", () => {
  const room = walk(freshRoom(3), () => "area");
  roller.searchArea(room, room.areas[0].id);
  for (const r of store.rollLog()) {
    ok(r.table, "log row with no table");
    ok(typeof r.roll === "number" && r.roll >= 1 && r.roll <= 100, "bad roll in log");
    ok(r.result, "log row with no result");
    ok(r.ts, "log row with no timestamp");
  }
});
check("the roll log is capped", () => {
  const room = walk(freshRoom(3), () => "area");
  for (let i = 0; i < data.ROLL_LOG_CAP + 40; i++) roller.rollMeaningPair(room, "descriptors");
  ok(store.rollLog().length <= data.ROLL_LOG_CAP, "log grew past its cap");
});

// ── Encounter and hidden stubs (R9, R10, R24) ────────────────────────────────
check("R9/R10 the encounter answer is recorded, and can be cleared", () => {
  const room = walk(freshRoom(3), () => "area");
  eq(room.encounter, null);
  lifecycle.recordEncounter(room, "exYes", "a sleeping troll");
  eq(store.room(room.id).encounter.answerName, "Exceptional Yes");
  lifecycle.clearEncounter(room);
  eq(store.room(room.id).encounter, null);
});
check("R24 hidden searches are recorded, not automated", () => {
  const room = walk(freshRoom(3), () => "area");
  lifecycle.recordHidden(room, "Is something hidden found?", "Yes", "a loose board");
  eq(store.room(room.id).hidden.length, 1);
});

check("R25 the multi-room note persists on the record", () => {
  resetStorage();
  const c = store.createCrawl("Test");
  const rm = lifecycle.newRoom(c.id, { label: "The flat", multiRoomNote: "kitchen and the bathroom off it" }, 6);
  eq(store.room(rm.id).context.multiRoomNote, "kitchen and the bathroom off it");
});
check("R27 a room type the house-aid list has never heard of is accepted", () => {
  resetStorage();
  const c = store.createCrawl("Test");
  const rm = lifecycle.newRoom(c.id, { label: "Odd", roomType: "The inside of a whale" }, 6);
  eq(store.room(rm.id).context.roomType, "The inside of a whale");
  eq(store.room(rm.id).context.houseAidType, false);
});

// ── Persistence, migration, export (§6) ──────────────────────────────────────
check("normalization back-fills an old-shape record without crashing", () => {
  const old = JSON.parse(readFileSync("tests/fixtures/old-shape-room.json", "utf8"));
  const r = derived.normalizeRoom(old);
  eq(r.budget, 6);
  eq(r.hidden, []);
  eq(r.areas.length, 2);
  ok(r.areas.every(a => a.id && typeof a.order === "number"));
  eq(r.areas[0].search, null);
  eq(r.context.roomType, "");
  eq(derived.searchState(r), "described");
});
check("export round-trips through import", () => {
  const room = walk(freshRoom(6), () => "area");
  roller.searchArea(room, room.areas[0].id);
  const json = store.exportJSON();
  const roomCount = store.rooms().length;
  store.wipeAll();
  eq(store.rooms().length, 0);
  const res = store.importJSON(json);
  eq(res.ok, true);
  eq(store.rooms().length, roomCount);
  eq(store.room(room.id).areas.length, room.areas.length);
  ok(store.room(room.id).areas[0].search, "the find did not survive the round trip");
});
check("import refuses a file it did not write", () => {
  eq(store.importJSON('{"app":"something-else"}').ok, false);
  eq(store.importJSON("not json at all").ok, false);
});
check("read-aloud text names every Area and the General Area", () => {
  const room = walk(freshRoom(6), () => "area");
  roller.searchGeneralArea(room);
  const text = store.roomAsText(store.room(room.id));
  for (const a of room.areas) ok(text.includes(a.name), "missing Area: " + a.name);
  ok(text.includes("General Area"));
});
check("undo restores the state before a destructive action", () => {
  const room = walk(freshRoom(6), () => "area");
  const id = room.id;
  store.deleteRoom(id);
  eq(store.room(id), null);
  store.undo();
  ok(store.room(id), "undo did not bring the room back");
});
check("the data check repairs a dangling room reference", () => {
  const room = walk(freshRoom(6), () => "area");
  const c = store.crawl(room.crawlId);
  store.updateCrawl(c.id, { rooms: [...c.rooms, "room_does_not_exist"] });
  const repairs = store.checkData();
  ok(repairs.length > 0, "the check reported nothing");
  eq(store.crawl(c.id).rooms.includes("room_does_not_exist"), false);
});

// ── Report ───────────────────────────────────────────────────────────────────
console.log("\n" + pass + " passed, " + fail + " failed");
if (fail) {
  for (const f of failures) console.error("  FAIL " + f);
  process.exit(1);
}
