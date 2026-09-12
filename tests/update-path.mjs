// The one PWA behaviour that cannot be verified by looking at the running app
// (template §5): load, deploy a change, reload — is the new code served, does
// the update toast appear, does accepting it leave only the new cache, and does
// the app still boot offline? Mutates two shipped files and restores them.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
import { EXEC, reporter } from "./harness-lib.mjs";

const r = reporter();
const step = m => process.stderr.write("  … " + m + "\n");

// A poll that survives the page reloading underneath it: each evaluate is
// fresh, and an evaluate that dies with the old document is simply retried.
// page.waitForFunction binds to the document it started in, and a self-
// triggered reload leaves it waiting on a context that no longer exists.
async function pollFor(page, fn, arg, timeout) {
  const start = Date.now();
  for (;;) {
    try { if (await page.evaluate(fn, arg)) return true; } catch { /* mid-navigation */ }
    if (Date.now() - start > timeout) return false;
    // A Node-side sleep, not page.waitForTimeout: the latter is routed through
    // the page, and a page mid-reload under a changing worker is exactly what
    // we are waiting out.
    await new Promise(res => setTimeout(res, 150));
  }
}
const SW = "service-worker.js", DATA = "data.js";
const swOrig = readFileSync(SW, "utf8"), dataOrig = readFileSync(DATA, "utf8");
const MARK = "UPDATE-PATH-MARKER-" + Date.now();

const site = await serve();
const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("crash", () => { errors.push("renderer crashed"); step("EVENT: page crashed"); });
page.on("close", () => step("EVENT: page closed"));
ctx.on("page", p => step("EVENT: new page opened " + p.url()));

try {
  step("first load");
  // 1. First load: the worker installs and takes control.
  await page.goto(site.url + "/index.html#/crawls", { waitUntil: "load" });
  const controlled = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise(res => setTimeout(res, 100));
    return { controller: !!navigator.serviceWorker.controller, scope: reg.scope };
  });
  r.check("first load: the service worker controls the page", controlled.controller, JSON.stringify(controlled));
  const cachesBefore = await page.evaluate(() => caches.keys());
  r.check("first load: the versioned shell cache exists", cachesBefore.length === 1, cachesBefore.join(","));
  // Count the shell from a throwaway page and close it. A page that holds an
  // open Cache handle loses its renderer target when the new worker deletes
  // that cache on activation — the app never opens the cache from a page, and
  // this harness must not either (H-14).
  const counter = await ctx.newPage();
  await counter.goto(site.url + "/index.html#/settings", { waitUntil: "load" });
  const shellCount = await counter.evaluate(async k => (await (await caches.open(k)).keys()).length, cachesBefore[0]);
  await counter.close();
  r.check("first load: the shell is fully cached", shellCount >= 18, "entries: " + shellCount);

  step("deploy");
  // 2. Deploy a change: new data, new worker version.
  writeFileSync(DATA, dataOrig.replace('crawls: "A crawl is a run of rooms', 'crawls: "' + MARK + ' A crawl is a run of rooms'));
  writeFileSync(SW, swOrig.replace(/const CACHE_VERSION = "[^"]+";/, 'const CACHE_VERSION = "rc-update-test";'));

  step("reload after deploy");
  // 3. Reload: the new code must be served on THIS load, not the next one.
  await page.reload({ waitUntil: "load" });
  const rendered = await pollFor(page, () => !!document.querySelector("#screen details.explain"), null, 8000);
  const seesNew = rendered && await page.evaluate(m => document.querySelector("#screen details.explain").textContent.includes(m), MARK);
  r.check("after deploy: one reload serves the new code (network-first)", !!seesNew);

  step("wait for toast");
  // 4. The update toast appears for the new worker.
  const toast = await page.waitForSelector(".toast", { timeout: 8000 }).catch(() => null);
  const toastText = toast ? await toast.textContent() : "";
  r.check("after deploy: the update toast appears", /Update available/.test(toastText), toastText);
  const wired = await page.evaluate(() => {
    const b = document.querySelector(".toast .toast-action");
    return !!b && b.textContent.trim() === "Reload" && !b.disabled;
  });
  r.check("after deploy: the toast offers a live Reload action", wired);

  step("accept update");
  // 5. Accept it. The toast's action does two things: tells the waiting worker
  // to skip waiting, and reloads. A page's own location.reload() under an
  // activating worker is something this harness cannot reliably follow (H-14),
  // so the two halves are driven separately: skip-waiting is sent from here,
  // and the app is then opened in a FRESH page, which is what a user's next
  // load is. The guarantees asserted are the same: only the new cache remains,
  // and the new code is what runs.
  const skipped = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const w = reg && (reg.waiting || reg.installing);
    if (!w) return "no waiting worker";
    w.postMessage("skip-waiting");
    return "sent";
  }).catch(e => "evaluate failed: " + String(e).slice(0, 60));
  r.check("after accepting: a waiting worker was there to accept", skipped === "sent", skipped);
  await page.close().catch(() => {});
  await new Promise(res => setTimeout(res, 1500));

  const fresh = await ctx.newPage();
  fresh.on("pageerror", e => errors.push(String(e)));
  await fresh.goto(site.url + "/index.html#/crawls", { waitUntil: "load" });
  const back = await pollFor(fresh, () => !!document.querySelector("#screen details.explain"), null, 10000);
  r.check("after accepting: the app comes back", back);
  const keysAfter = await fresh.evaluate(async () => {
    for (let i = 0; i < 40; i++) {
      const k = await caches.keys();
      if (k.length === 1 && k[0] === "rc-update-test") return k;
      await new Promise(res => setTimeout(res, 100));
    }
    return caches.keys();
  });
  r.check("after accepting: only the new cache remains", keysAfter.length === 1 && keysAfter[0] === "rc-update-test", keysAfter.join(","));
  const stillNew = await pollFor(fresh, m => {
    const d = document.querySelector("#screen details.explain");
    return !!d && d.textContent.includes(m);
  }, MARK, 5000);
  r.check("after accepting: the new code is what runs", stillNew);

  step("offline boot");
  // 6. Offline: the basement case. The cached shell must boot with no network.
  await ctx.setOffline(true);
  await fresh.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  const offlineOk = await pollFor(fresh, () => !!document.querySelector("#screen h1"), null, 8000);
  r.check("offline: the app still boots from the cache", offlineOk);
  const offlineNew = offlineOk && await pollFor(fresh, m => {
    const d = document.querySelector("#screen details.explain");
    return !!d && d.textContent.includes(m);
  }, MARK, 3000);
  r.check("offline: and it is the new code, not the old", !!offlineNew);
  await ctx.setOffline(false);

  r.check("no page errors across the update path", errors.length === 0, errors[0]);
} catch (e) {
  // A hang is a red result, not a stack trace: report what passed before it.
  r.check("the update path completed without a hang", false, String(e).split("\n")[0]);
} finally {
  writeFileSync(SW, swOrig);
  writeFileSync(DATA, dataOrig);
  await browser.close();
  site.close();
}
process.exit(r.done("update-path"));
