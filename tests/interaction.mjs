// Harness C — interaction audit. Visits every route and clicks every visible
// control in isolation, resetting between clicks, and flags three things: a JS
// error, a control that cannot be clicked, and a control that changes nothing.
// The no-op check is what catches a button wired to a handler that returns early.
import { launch, newPage, goto, until, reporter, ROUTES } from "./harness-lib.mjs";

const { site, browser, close } = await launch();
const r = reporter();

const SKIP = /^(Erase everything|Delete crawl|Delete this room|Clear the log|Replace everything)$/;

for (const seed of ["mid-crawl"]) {
  for (const route of ROUTES) {
    const probe = await newPage(browser, site, { seed });
    await goto(probe, site, route.hash);
    const count = await probe.$$eval(
      "#screen button:not([disabled]), #action-bar-host button:not([disabled]), #screen summary",
      ns => ns.length);
    await probe.context().close();

    for (let i = 0; i < count; i++) {
      const page = await newPage(browser, site, { seed });
      await goto(page, site, route.hash);

      const info = await page.evaluate(idx => {
        const ns = Array.from(document.querySelectorAll(
          "#screen button:not([disabled]), #action-bar-host button:not([disabled]), #screen summary"));
        const n = ns[idx];
        if (!n) return null;
        const rect = n.getBoundingClientRect();
        return {
          label: (n.textContent || "").trim().slice(0, 40),
          visible: rect.width > 0 && rect.height > 0,
          alreadyChosen: n.getAttribute("aria-checked") === "true"
        };
      }, i);
      if (!info) { await page.context().close(); continue; }

      const id = route.hash + " › " + (info.label || "(unlabelled)");
      if (SKIP.test(info.label)) { await page.context().close(); continue; }
      if (!info.visible) { await page.context().close(); continue; }
      if (info.alreadyChosen) { await page.context().close(); continue; }

      await page.evaluate(() => {
        window.__before = {
          html: document.querySelector("#screen").innerHTML.length,
          hash: location.hash,
          store: JSON.stringify([localStorage.getItem("rc.rooms"), localStorage.getItem("rc.crawls"), localStorage.getItem("rc.rollLog"), localStorage.getItem("rc.settings")]).length,
          modal: !!document.querySelector(".modal-backdrop"),
          toast: !!document.querySelector(".toast"),
          scroll: Math.round(window.scrollY)
        };
      });

      let clicked = true;
      try {
        await page.evaluate(idx => {
          const ns = Array.from(document.querySelectorAll(
            "#screen button:not([disabled]), #action-bar-host button:not([disabled]), #screen summary"));
          ns[idx].click();
        }, i);
      } catch { clicked = false; }
      r.check("clickable: " + id, clicked);

      // Poll for a change; never a fixed wait (defect D-15).
      const changed = await until(page, () => {
        const b = window.__before;
        return document.querySelector("#screen").innerHTML.length !== b.html ||
          location.hash !== b.hash ||
          JSON.stringify([localStorage.getItem("rc.rooms"), localStorage.getItem("rc.crawls"), localStorage.getItem("rc.rollLog"), localStorage.getItem("rc.settings")]).length !== b.store ||
          !!document.querySelector(".modal-backdrop") !== b.modal ||
          !!document.querySelector(".toast") !== b.toast ||
          Math.round(window.scrollY) !== b.scroll;
      }, 1500);

      r.check("does something: " + id, changed);
      r.check("no error from: " + id, page.__errors.length === 0, page.__errors[0]);
      await page.context().close();
    }
  }
}

await close();
process.exit(r.done("interaction"));
