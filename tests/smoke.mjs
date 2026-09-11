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

  // Encounter check (the stub).
  await page.click("#screen .choice-row .choice:nth-child(3)");         // "No"
  await until(page, () => !!document.querySelector("#prompt-field"));
  await page.click(".modal-actions .btn-primary");
  r.check("e2e: encounter answer recorded",
    await until(page, () => document.body.textContent.includes("No")));

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
