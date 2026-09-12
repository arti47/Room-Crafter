// Harness B — browser smoke. Boots the app and asserts the measurement contract
// on every route, at every tested width, then walks a whole room end to end.
import { launch, newPage, goto, until, reporter, ROUTES, MEASURE } from "./harness-lib.mjs";

const { site, browser, close } = await launch();
const r = reporter();
const WIDTHS = [320, 360, 390];

for (const seed of ["fresh", "mid-crawl", "stress"]) {
  for (const route of ROUTES) {
    const page = await newPage(browser, site, { seed });
    await goto(page, site, route.hash);

    const heading = await page.$eval("#screen h1, #screen .empty", n => n.textContent.trim()).catch(() => "");
    r.check(seed + " " + route.hash + " renders a heading", !!heading);
    r.check(seed + " " + route.hash + " has no console errors", page.__errors.length === 0, page.__errors[0]);

    const stray = await page.evaluate(MEASURE.strayText);
    r.check(seed + " " + route.hash + " has no stray null/undefined/NaN text", stray.length === 0, stray.join(" | "));

    const ex = await page.evaluate(MEASURE.explain);
    const needsExplain = route.hash !== "#/room" || (await page.$("#screen .block"));
    if (needsExplain && ex.present) r.check(seed + " " + route.hash + " explain() starts collapsed", !ex.open);

    const fonts = await page.evaluate(MEASURE.inputFontSizes);
    r.check(seed + " " + route.hash + " inputs are at least 16px", fonts.every(f => f >= 16), fonts.join(","));

    const target = await page.evaluate(MEASURE.smallestTarget);
    r.check(seed + " " + route.hash + " no tap target under 40px",
      target.min === null || target.min >= 40, target.min + "px on '" + target.who + "'");

    const buried = await page.evaluate(MEASURE.underTabBar);
    r.check(seed + " " + route.hash + " nothing sits under the tab bar", buried.length === 0, buried.join(" | "));

    const primary = await page.evaluate(MEASURE.primaryOffset);
    if (primary) {
      r.check(seed + " " + route.hash + " primary action is above the fold",
        primary.inViewport, primary.label + " at y=" + primary.top);
    }

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 780 });
      const over = await page.evaluate(MEASURE.overflow);
      r.check(seed + " " + route.hash + " no horizontal overflow at " + w + "px", over <= 0, "+" + over + "px");
    }
    await page.context().close();
  }
}

// Section nav reaches every sibling and marks the current one.
{
  const page = await newPage(browser, site, { seed: "mid-crawl" });
  for (const [hash, expected] of [["#/log", "Rolls"], ["#/log/distribution", "Distribution"], ["#/rules", "Rules"], ["#/learn/tutorial", "Tutorial"]]) {
    await goto(page, site, hash);
    const pills = await page.$$eval(".section-nav .pill", ns => ns.map(n => ({ t: n.textContent.trim(), on: n.classList.contains("pill-on"), href: n.getAttribute("href") })));
    r.check("section nav present on " + hash, pills.length >= 2);
    const on = pills.filter(p => p.on);
    r.check("section nav marks exactly one current pill on " + hash, on.length === 1, JSON.stringify(pills));
    r.check("section nav marks the right pill on " + hash, on[0] && on[0].t === expected, on[0] && on[0].t);
  }
  await page.context().close();
}

// Live-state badge: absent with nothing in play, and it travels with an open
// room to whatever screen you are on (§6.3.8).
{
  const fresh = await newPage(browser, site, { seed: "fresh" });
  await goto(fresh, site, "#/crawls");
  r.check("no live badge when nothing is in play", (await fresh.$(".tab-badge")) === null);
  await fresh.context().close();

  const page = await newPage(browser, site, { seed: "mid-crawl" });
  await goto(page, site, "#/room");
  await until(page, () => !!document.querySelector("#screen h1"));
  r.check("live badge shows while a room is open", (await page.$(".tab-badge")) !== null);
  await goto(page, site, "#/log");
  r.check("live badge travels to other screens", (await page.$(".tab-badge")) !== null);
  await page.context().close();
}

// The end-to-end walk: crawl -> room -> keywords -> describe -> encounter ->
// search every Area -> General Area -> complete -> read-aloud.
{
  const page = await newPage(browser, site, { seed: "fresh" });
  await goto(page, site, "#/crawls");

  await page.click("#action-bar-host .btn-primary");                    // New crawl
  await page.fill("#prompt-field", "Smoke crawl");
  await page.click(".modal-actions .btn-primary");
  r.check("e2e: crawl created", await until(page, () => location.hash.startsWith("#/crawl/")));

  await page.click("#action-bar-host .btn-primary");                    // First room
  await page.fill("#nr-label", "The smoke room");
  await page.click(".choice-row .choice:nth-child(2)");                 // three keywords
  await page.click(".modal-actions .btn-primary");
  r.check("e2e: wizard opened", await until(page, () => location.hash.startsWith("#/wizard/")));

  for (let step = 0; step < 3; step++) {
    await page.click("#action-bar-host .btn-primary");                  // Roll keyword N
    await until(page, () => !!document.querySelector(".card-keyword"));
    await page.click("#action-bar-host .btn-primary");                  // Make this an Area
    await until(page, () => !!document.querySelector("#prompt-field"));
    await page.fill("#prompt-field", "Area " + (step + 1));
    await page.click(".modal-actions .btn-primary");
    await until(page, () => !document.querySelector(".modal-backdrop"));
  }
  r.check("e2e: three keywords made three Areas",
    await until(page, () => document.body.textContent.includes("The keywords are done")));

  await page.click("#action-bar-host .btn-primary");                    // Go to the room
  r.check("e2e: room sheet reached", await until(page, () => location.hash.startsWith("#/room/")));
  r.check("e2e: the persistent room header is showing",
    await until(page, () => !!document.querySelector(".res-header")));

  // Describe it.
  await page.click("#screen .block:nth-of-type(1) .btn-quiet");
  await until(page, () => !!document.querySelector("#prompt-field"));
  await page.fill("#prompt-field", "Smoke and old paper.");
  await page.click(".modal-actions .btn-primary");
  r.check("e2e: description saved",
    await until(page, () => document.body.textContent.includes("Smoke and old paper.")));

  // The pinned primary now asks the encounter question first (§6.3.3).
  const firstPrimary = await page.$eval("#action-bar-host .btn-primary", n => n.textContent);
  r.check("e2e: the primary asks the encounter question before offering a search", /encounter/i.test(firstPrimary), firstPrimary);
  r.check("e2e: the question can be skipped", !!(await page.$("#action-bar-host .btn-link")));

  // Ask it from the block at Likely — the quick row's third chip.
  await page.click("#sec-encounter .asker .choice-row .choice:nth-child(3)");
  await page.click("#sec-encounter .btn-secondary");                    // Ask
  r.check("e2e: Ask The GM produced an answer",
    await until(page, () => !!document.querySelector(".modal-backdrop")));
  const answerText = await page.$eval(".modal-card", n => n.textContent);
  r.check("e2e: the answer names the odds it was asked at", /Likely/.test(answerText), answerText.slice(0, 80));
  r.check("e2e: the answer shows its die", /\d/.test(answerText));
  await page.click(".modal-actions .btn-primary");
  await until(page, () => !document.querySelector(".modal-backdrop"));
  r.check("e2e: encounter answer recorded on the sheet",
    await until(page, () => {
      const t = document.querySelector("#sec-encounter").textContent;
      return /at Likely/.test(t) && /Clear/.test(t) && !/How likely is a Yes/.test(t);
    }));
  const secondPrimary = await page.$eval("#action-bar-host .btn-primary", n => n.textContent);
  r.check("e2e: once asked, the primary moves on to searching", /^Search:/.test(secondPrimary), secondPrimary);

  // Rename and reorder an Area (R26).
  await page.click('#sec-areas .area-card:nth-of-type(1) [aria-label="Rename this Area"]');
  await until(page, () => !!document.querySelector("#prompt-field"));
  await page.fill("#prompt-field", "Renamed Area");
  await page.click(".modal-actions .btn-primary");
  r.check("e2e: an Area can be renamed on the sheet",
    await until(page, () => /Renamed Area/.test(document.querySelector("#sec-areas").textContent)));
  await page.click('#sec-areas .area-card:nth-of-type(1) [aria-label="Move this Area down"]');
  r.check("e2e: an Area can be moved",
    await until(page, () => !/Renamed Area/.test(document.querySelector("#sec-areas .area-card:nth-of-type(1)").textContent)));
  const thirdPrimary = await page.$eval("#action-bar-host .btn-primary", n => n.textContent);
  r.check("e2e: the primary follows the new order", !/Renamed Area/.test(thirdPrimary), thirdPrimary);

  // Search everything through the pinned primary action.
  for (let i = 0; i < 4; i++) {
    await page.click("#action-bar-host .btn-primary");
    await until(page, () => !!document.querySelector(".modal-backdrop"));
    await page.click(".modal-actions .btn-primary");                    // "Good"
    await until(page, () => !document.querySelector(".modal-backdrop"));
  }
  r.check("e2e: the room reads as fully explored",
    await until(page, () => document.querySelector(".res-header").textContent.includes("Fully explored")));

  // A searched Area refuses a second roll.
  const disabled = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".area-card"));
    return cards.every(c => !Array.from(c.querySelectorAll("button")).some(b => /Search this Area/.test(b.textContent)));
  });
  r.check("e2e: no Area offers a second search", disabled);

  // Finish, then read-aloud.
  await page.click("#action-bar-host .btn-primary");                    // Finish this room
  await until(page, () => !!document.querySelector(".modal-backdrop"));
  const summary = await page.$eval(".modal-card", n => n.textContent);
  r.check("e2e: the completion summary reports the room", /3 Areas|Areas from/.test(summary), summary.slice(0, 80));
  r.check("e2e: no conclusion roll is offered at the end", !/conclusion/i.test(summary));
  await page.keyboard.press("Escape");

  const logRows = await (async () => {
    await goto(page, site, "#/log");
    return page.$$eval("#screen .list-row", ns => ns.length);
  })();
  r.check("e2e: every roll reached the log", logRows >= 7, "rows: " + logRows);
  r.check("e2e: no console errors across the whole walk", page.__errors.length === 0, page.__errors[0]);
  await page.context().close();
}

// The Mythic toggle: on, the questions are asked; off, they go back to being
// recorded. Both states have to work, and neither may claim the other's copy.
{
  const page = await newPage(browser, site, { seed: "mid-crawl" });
  await goto(page, site, "#/room");
  const onText = await page.$eval("#sec-encounter", n => n.textContent);
  r.check("mythic on: the odds picker is offered", /How likely is a Yes/.test(onText));
  const quick = await page.$$eval("#sec-encounter .asker > .choice-row .choice", ns => ns.map(n => n.textContent.trim()));
  r.check("mythic on: the quick row is three odds with 50/50 in the middle",
    quick.length === 3 && /50\/50/.test(quick[1]), quick.join(" | "));
  r.check("mythic on: the full chart is behind a fold",
    (await page.$("#sec-encounter .asker details .choice-row")) !== null);
  r.check("mythic on: nothing claims to be un-automated", !/not automated/.test(onText), onText.slice(0, 90));

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("rc.settings") || "{}");
    s.useMythic = false;
    localStorage.setItem("rc.settings", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await until(page, () => !!document.querySelector("#screen h1"));
  const offText = await page.$eval("#sec-encounter", n => n.textContent);
  r.check("mythic off: the four answers are offered to record", /Exceptional Yes/.test(offText));
  r.check("mythic off: the surface says it is not automated", /not automated/.test(offText));
  r.check("mythic off: the odds picker is gone", !/How likely is a Yes/.test(offText));

  await goto(page, site, "#/rules");
  const rulesOff = await page.$eval("#screen", n => n.textContent);
  r.check("mythic off: its rules leave the library too", !/Ask The Game Master/.test(rulesOff));
  r.check("mythic off: no console errors", page.__errors.length === 0, page.__errors[0]);
  await page.context().close();
}

// Tablet width adds density: two real columns on the room sheet and the wizard.
{
  const page = await newPage(browser, site, { seed: "mid-crawl", width: 900, height: 1000 });
  await goto(page, site, "#/room");
  const cols = await page.evaluate(() => {
    const l = document.querySelector(".two-col .col-room"), r = document.querySelector(".two-col .col-areas");
    if (!l || !r) return null;
    const a = l.getBoundingClientRect(), b = r.getBoundingClientRect();
    return { sideBySide: b.left >= a.right - 1, leftW: Math.round(a.width), rightW: Math.round(b.width), over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  r.check("tablet: room sheet renders two columns side by side", !!cols && cols.sideBySide, JSON.stringify(cols));
  r.check("tablet: no horizontal overflow at 900px", !!cols && cols.over <= 0, JSON.stringify(cols));
  await page.setViewportSize({ width: 390, height: 780 });
  const stacked = await page.evaluate(() => {
    const l = document.querySelector(".two-col .col-room"), r = document.querySelector(".two-col .col-areas");
    return r.getBoundingClientRect().top >= l.getBoundingClientRect().bottom - 1;
  });
  r.check("phone: the same columns stack", stacked);
  await page.context().close();
}

// An in-place action keeps your place; a navigation starts at the top (A-30).
{
  const page = await newPage(browser, site, { seed: "stress", width: 390, height: 780 });
  await goto(page, site, "#/room");
  // Open the first searched Area's detail fold, scroll it into view, roll.
  const opened = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll(".area-card")).find(c => c.querySelector(".details-block"));
    if (!card) return null;
    const fold = card.querySelector(".details-block details");
    fold.open = true;
    fold.scrollIntoView({ block: "center" });
    return { y: Math.round(window.scrollY), folds: document.querySelectorAll("#screen details[open]").length };
  });
  r.check("scroll: a searched Area with a detail fold exists in the stress seed", !!opened && opened.y > 200, JSON.stringify(opened));
  if (opened) {
    await page.click(".area-card .details-block details[open] .choice:nth-child(2)");   // roll a Sock Drawer detail
    const after = await until(page, () => document.querySelectorAll(".details-block .find-head").length > 0, 1500);
    const y2 = await page.evaluate(() => Math.round(window.scrollY));
    r.check("scroll: rolling a detail does not jump to the top", after && Math.abs(y2 - opened.y) < 80, "before " + opened.y + " after " + y2);
    const foldsAfter = await page.evaluate(() => document.querySelectorAll("#screen details[open]").length);
    r.check("scroll: folds that were open stay open through the redraw", foldsAfter >= 1, "open folds after: " + foldsAfter);
  }
  await goto(page, site, "#/log");
  await goto(page, site, "#/room");
  const yNav = await page.evaluate(() => Math.round(window.scrollY));
  r.check("scroll: a navigation still starts at the top", yNav === 0, "y=" + yNav);
  await page.context().close();
}

// Actions inside the find modal redraw the modal itself (A-31). Search fresh
// rooms until a result with an action button comes up — Fortunate, Unfortunate
// or Random, ~30% of searches — then use it and assert the modal changed.
{
  const page = await newPage(browser, site, { seed: "fresh" });
  await goto(page, site, "#/crawls");
  await page.click("#action-bar-host .btn-primary");
  await page.fill("#prompt-field", "Modal crawl");
  await page.click(".modal-actions .btn-primary");
  await until(page, () => location.hash.startsWith("#/crawl/"));

  async function makeRoom(n) {
    await page.click("#action-bar-host .btn-primary");
    await page.fill("#nr-label", "Modal room " + n);
    await page.click(".choice-row .choice:nth-child(2)");
    await page.click(".modal-actions .btn-primary");
    await until(page, () => location.hash.startsWith("#/wizard/"));
    for (let i = 0; i < 3; i++) {
      await page.click("#action-bar-host .btn-primary");
      await until(page, () => !!document.querySelector(".card-keyword"));
      await page.click("#action-bar-host .btn-primary");
      await until(page, () => !!document.querySelector("#prompt-field"));
      await page.fill("#prompt-field", "Area " + i);
      await page.click(".modal-actions .btn-primary");
      await until(page, () => !document.querySelector(".modal-backdrop"));
    }
    await page.click("#action-bar-host .btn-primary");
    await until(page, () => location.hash.startsWith("#/room/"));
    await page.click("#action-bar-host .btn-link");          // skip the encounter question
    await until(page, () => /^Search:/.test(document.querySelector("#action-bar-host .btn-primary").textContent));
  }

  let found = null;
  for (let roomN = 0; roomN < 12 && !found; roomN++) {
    await makeRoom(roomN);
    for (let k = 0; k < 4 && !found; k++) {
      const label = await page.$eval("#action-bar-host .btn-primary", n => n.textContent);
      if (!/^Search/.test(label)) break;
      await page.click("#action-bar-host .btn-primary");
      await until(page, () => !!document.querySelector(".modal-backdrop"));
      const action = await page.$(".modal-card .find button.btn, .modal-card .find .choice");
      if (action) {
        const before = await page.$eval(".modal-card .find", n => n.textContent);
        await action.click();
        const changed = await until(page, b => document.querySelector(".modal-card .find").textContent !== b, 1500, before);
        const after = await page.$eval(".modal-card .find", n => n.textContent);
        found = { before: before.slice(0, 60), after: after.slice(0, 240), changed };
      }
      await page.click(".modal-actions .btn-primary");
      await until(page, () => !document.querySelector(".modal-backdrop"));
    }
    if (!found) { await page.goto(page.url().replace(/#.*$/, "#/crawl/" + (await page.evaluate(() => JSON.parse(localStorage.getItem("rc.current")).crawlId)))); await until(page, () => !!document.querySelector("#screen h1")); }
  }
  r.check("modal: a result with an action button came up within the sample", !!found, "none in 12 rooms");
  if (found) {
    r.check("modal: the action redraws the modal in place", found.changed, JSON.stringify(found));
    r.check("modal: the redrawn find shows the Meaning words",
      /Discover Meaning|Sock Drawer|Room Descriptors/.test(found.after) && / \/ /.test(found.after), found.after);
    r.check("modal: no duplicated 'use the obvious idea' line",
      (found.before.match(/Use the obvious idea/g) || []).length <= 1 && (found.after.match(/Use the obvious idea/g) || []).length <= 1);
  }
  r.check("modal: no console errors", page.__errors.length === 0, page.__errors[0]);
  await page.context().close();
}

// A Random Event is the same roll read twice, never a second question.
{
  const page = await newPage(browser, site, { seed: "mid-crawl" });
  await goto(page, site, "#/room");
  const sample = await page.evaluate(async () => {
    const mythic = await import("./src/mythic.js");
    const store = await import("./src/store.js");
    const room = store.rooms()[0];
    const out = { events: 0, mismatched: 0, n: 400 };
    for (let i = 0; i < out.n; i++) {
      const res = mythic.ask(room, "fifty", "probe");
      const isDouble = [11,22,33,44,55,66,77,88,99].includes(res.roll);
      if (isDouble !== !!res.event) out.mismatched++;
      if (res.event) out.events++;
    }
    return out;
  });
  r.check("every double fired an event and nothing else did", sample.mismatched === 0, JSON.stringify(sample));
  r.check("events actually occurred in the sample", sample.events > 0, JSON.stringify(sample));
  await page.context().close();
}

// The refusal path: a second search on an already-searched Area cites the rule.
{
  const page = await newPage(browser, site, { seed: "mid-crawl" });
  await goto(page, site, "#/crawls");
  const refused = await page.evaluate(async () => {
    const store = await import("./src/store.js");
    const roller = await import("./src/roller.js");
    const room = store.rooms().find(r => r.areas.some(a => a.search));
    const area = room.areas.find(a => a.search);
    const res = roller.searchArea(room, area.id);
    return { ok: res.ok, ruleId: res.ruleId, reason: res.reason };
  });
  r.check("a second search is refused in the browser too", refused.ok === false);
  r.check("the refusal names the rule rather than saying 'not allowed'",
    refused.ruleId === "search" && /one roll per Area/i.test(refused.reason), refused.reason);
  await page.context().close();
}

await close();
process.exit(r.done("smoke"));
