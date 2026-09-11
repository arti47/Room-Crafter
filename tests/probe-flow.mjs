// Probe — walks the common sequences and prints taps and route changes each one
// costs. Read it and ask: what do I tap next, and how many taps is that?
import { launch, newPage, goto, until } from "./harness-lib.mjs";

const { site, browser, close } = await launch();
const results = [];

async function sequence(name, seed, steps) {
  const page = await newPage(browser, site, { seed });
  await goto(page, site, "#/crawls");
  let taps = 0, routes = 0, last = await page.evaluate(() => location.hash);
  for (const step of steps) {
    await step(page);
    taps++;
    const now = await page.evaluate(() => location.hash);
    if (now !== last) { routes++; last = now; }
  }
  results.push({ sequence: name, taps, routeChanges: routes, errors: page.__errors.length });
  await page.context().close();
}

const click = sel => async page => {
  await page.click(sel);
  await page.waitForTimeout(30);
};
const fillPrompt = v => async page => {
  await until(page, () => !!document.querySelector("#prompt-field"));
  await page.fill("#prompt-field", v);
  await page.click(".modal-actions .btn-primary");
  await until(page, () => !document.querySelector(".modal-backdrop"));
};

await sequence("make a crawl and start a room", "fresh", [
  click("#action-bar-host .btn-primary"),
  fillPrompt("Probe crawl"),
  click("#action-bar-host .btn-primary"),
  async page => { await page.fill("#nr-label", "Probe room"); await page.click(".modal-actions .btn-primary"); }
]);

await sequence("search one Area from the room sheet", "mid-crawl", [
  click('.tab[href="#/room"]'),
  click("#action-bar-host .btn-primary"),
  click(".modal-actions .btn-primary")
]);

await sequence("read a rule from an automated surface", "mid-crawl", [
  click('.tab[href="#/room"]'),
  async page => {
    const link = await page.$("#screen .rule-link");
    if (link) await link.click();
    await page.waitForTimeout(50);
  }
]);

await sequence("export a room to read aloud", "mid-crawl", [
  click('.tab[href="#/room"]'),
  async page => {
    const btns = await page.$$("#screen button");
    for (const b of btns) {
      const t = (await b.textContent()).trim();
      if (t === "Read-aloud text") { await b.click(); break; }
    }
    await until(page, () => !!document.querySelector(".modal-backdrop"));
  }
]);

console.table(results);
await close();
