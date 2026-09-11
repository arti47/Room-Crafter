// Probe — prints the measurement contract for every route at every width and
// seed. It asserts nothing: you read the table and notice the outlier. Once a
// number is known-good it graduates into the smoke harness as an assertion.
import { launch, newPage, goto, ROUTES, MEASURE } from "./harness-lib.mjs";

const { site, browser, close } = await launch();
const seeds = process.argv[2] ? [process.argv[2]] : ["fresh", "mid-crawl", "stress"];
const widths = [320, 390];

const rows = [];
for (const seed of seeds) {
  for (const route of ROUTES) {
    for (const w of widths) {
      const page = await newPage(browser, site, { seed, width: w, height: 780 });
      await goto(page, site, route.hash);
      // Functions cannot cross into the page as an object; each measurement is
      // evaluated on its own.
      const m = {
        h: await page.evaluate(MEASURE.heightInViewports),
        controls: await page.evaluate(MEASURE.controlCount),
        primary: await page.evaluate(MEASURE.primaryOffset),
        target: await page.evaluate(MEASURE.smallestTarget),
        over: await page.evaluate(MEASURE.overflow),
        inline: (await page.evaluate(MEASURE.inlineProseLinks)).length
      };
      rows.push({
        seed, route: route.hash, w,
        viewports: m.h, controls: m.controls,
        primaryY: m.primary ? m.primary.top : "—",
        primaryOK: m.primary ? (m.primary.inViewport ? "yes" : "NO") : "—",
        minTarget: m.target.min === null ? "—" : m.target.min,
        overflow: m.over, inlineLinks: m.inline
      });
      await page.context().close();
    }
  }
}
console.table(rows);
const tall = rows.filter(r => r.viewports > 6);
if (tall.length) {
  console.log("\nScreens over six viewports — check they page or collapse:");
  for (const t of tall) console.log("  " + t.seed + " " + t.route + " @" + t.w + " = " + t.viewports + " viewports, " + t.controls + " controls");
}
await close();
