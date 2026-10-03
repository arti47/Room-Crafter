// tutorial.js — a first room, step by step. A screen, not a modal sequence: you
// come back to it mid-session.
import { el, add } from "./core.js";
import { explain, sectionNav, showToast } from "./ui.js";
import { EXPLAIN, TUTORIAL } from "../data.js";
import { DEMO_ROOMS, HOUSE_AID } from "../data-house-roomtypes.js";
import * as store from "./store.js";
import { uid } from "./core.js";
import { houseAidBadge } from "./ui.js";
import { illustration, fleuron } from "./graphics.js";

export function render() {
  const content = el("div", {});
  add(content,
    sectionNav([
      { id: "rules", label: "Rules", href: "#/rules" },
      { id: "tutorial", label: "Tutorial", href: "#/learn/tutorial" }
    ], "tutorial"),
    el("h1", { class: "screen-title", text: "Your first room" }),
    explain(EXPLAIN.tutorial)
  );

  // Numbered stations on one line, top to bottom: the order is the lesson.
  const steps = el("div", { class: "tut-steps" });
  TUTORIAL.forEach(step => {
    const d = el("details", { class: "fold tut-step" });
    add(d, el("summary", {}, el("span", { class: "tut-num" }), el("span", { text: step.title })),
      el("p", { class: "prose", text: step.body }));
    add(steps, d);
  });
  add(content, steps);

  add(content, el("section", { class: "block block-end demo-card" },
    illustration("door"),
    el("h2", { class: "block-title", text: "Or look at a finished one" }),
    el("p", { class: "prose" }, "Two example rooms, written for this app ", houseAidBadge(),
      " — not the article's own examples, which are fiction. They load into a crawl called Examples."),
    el("button", { class: "btn btn-secondary btn-wide", type: "button", onclick: loadDemos }, "Load the example rooms")
  ));

  add(content, el("p", { class: "hint" }, "Ready? ", el("a", { class: "rule-link", href: "#/crawls" }, "Start a crawl"), "."), fleuron());
  return { title: "Tutorial", content };
}

function loadDemos() {
  const existing = store.crawls().find(c => c.name === "Examples");
  const crawl = existing || store.createCrawl("Examples");
  for (const demo of DEMO_ROOMS) {
    const rm = store.createRoom(crawl.id, {
      label: demo.label, roomType: demo.roomType, houseAidType: HOUSE_AID,
      genreNote: "", multiRoomNote: ""
    }, demo.budget);
    rm.keywords = demo.keywords.map(k => ({ ...k }));
    rm.areas = demo.areas.map((a, i) => ({
      id: uid("area"), name: a.name, fromKeywords: a.fromKeywords, order: i, search: null, note: ""
    }));
    rm.description = demo.description;
    store.saveRoom(rm);
  }
  showToast("Example rooms loaded. Nothing in them is searched yet — that part is yours.");
  location.hash = "#/crawl/" + crawl.id;
}
