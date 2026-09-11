// Builds the three committed seed states every harness and probe loads, so no
// two passes measure a different app (template §11.1 D).
import "./env.mjs";
import { writeFileSync } from "node:fs";
import { resetStorage } from "./env.mjs";

const store = await import("../src/store.js");
const wizard = await import("../src/wizard.js");
const roller = await import("../src/roller.js");
const lifecycle = await import("../src/lifecycle.js");

function build(room, budget, names) {
  let i = 0;
  let guard = 0;
  while (!wizard.isWalkDone(room) && guard++ < 30) {
    if (wizard.pending(room).length === 0) { wizard.rollNext(room); continue; }
    if (wizard.pending(room).length === 1 && wizard.canCarry(room) && i % 3 === 2) {
      wizard.carryForward(room);
      continue;
    }
    wizard.makeArea(room, names[i % names.length]);
    i++;
  }
  return room;
}

const NAMES = [
  "A workbench under a rack of hanging tools",
  "Shelves crammed to the ceiling with parts trays",
  "A strongbox with its lock half dismantled",
  "A bin of brass shavings and failed cuts",
  "A ledger left open on a stool",
  "A curtain drawn across the far corner"
];

function snapshotJSON() { return JSON.parse(store.exportJSON()); }

// fresh — nothing created
resetStorage();
writeFileSync("tests/fixtures/fresh.json", JSON.stringify(snapshotJSON(), null, 2));

// mid-crawl — a crawl, one finished room, one part searched, one being made
resetStorage();
const c = store.createCrawl("The tomb under the mill");
const done = build(store.createRoom(c.id, { label: "The antechamber", roomType: "Dungeon chamber" }, 6), 6, NAMES);
done.description = "Low, dry and colder than the stair behind you.";
store.saveRoom(done);
lifecycle.recordEncounter(done, "no", "");
for (const a of done.areas) roller.searchArea(done, a.id);
roller.searchGeneralArea(done);

const part = build(store.createRoom(c.id, { label: "The flooded tunnel", roomType: "Tunnel" }, 3), 3, NAMES);
part.description = "Ankle-deep. The water is going somewhere.";
store.saveRoom(part);
roller.searchArea(part, part.areas[0].id);
lifecycle.recordHidden(part, "Is something hidden found?", "Yes", "a keystone below the waterline");

const building = store.createRoom(c.id, { label: "The scriptorium", roomType: "Study" }, 6);
wizard.rollNext(building);
wizard.carryForward(building);
writeFileSync("tests/fixtures/mid-crawl.json", JSON.stringify(snapshotJSON(), null, 2));

// stress — what a table has by session three
resetStorage();
for (let ci = 0; ci < 4; ci++) {
  const cc = store.createCrawl("Crawl " + (ci + 1) + " — a long name that has to wrap on a narrow phone screen");
  for (let ri = 0; ri < 6; ri++) {
    const rm = build(store.createRoom(cc.id, {
      label: "Room " + (ri + 1) + " — a deliberately long room label to stress the header",
      roomType: "Dungeon chamber"
    }, 6), 6, NAMES);
    rm.description = "A long description written at the table, the sort that runs to several sentences because the player got carried away and kept typing until the paragraph would not fit on one phone screen at all.";
    rm.notes = "Notes that also run long, because notes always do.";
    store.saveRoom(rm);
    lifecycle.recordEncounter(rm, ri % 2 ? "yes" : "no", "a note about what was waiting");
    for (const a of rm.areas) roller.searchArea(rm, a.id);
    if (ri % 2 === 0) roller.searchGeneralArea(rm);
    lifecycle.recordHidden(rm, "Is something hidden found?", "No", "");
  }
}
writeFileSync("tests/fixtures/stress.json", JSON.stringify(snapshotJSON(), null, 2));

console.log("fixtures written: fresh, mid-crawl, stress");
