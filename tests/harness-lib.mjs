// Shared browser plumbing for harnesses B and C and both probes.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { serve, ROUTES } from "./serve.mjs";

export { ROUTES };

export const EXEC = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export async function launch() {
  const site = await serve();
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  return { site, browser, close: async () => { await browser.close(); site.close(); } };
}

export function fixture(name) {
  return JSON.parse(readFileSync("tests/fixtures/" + name + ".json", "utf8"));
}

// Seeds a fixture into localStorage before any app code runs, so the app boots
// straight into that state rather than being driven into it.
export async function newPage(browser, site, { width = 390, height = 780, seed = "fresh" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  const data = fixture(seed);
  await page.addInitScript(d => {
    localStorage.setItem("rc.crawls", JSON.stringify(d.crawls || []));
    localStorage.setItem("rc.rooms", JSON.stringify(d.rooms || []));
    localStorage.setItem("rc.rollLog", JSON.stringify(d.rollLog || []));
    // Point at a room whose keyword walk is finished, so the sheet is what gets
    // measured rather than the wizard's "still being made" state.
    const walked = (d.rooms || []).filter(r =>
      (r.keywords || []).length >= (r.budget || 6) &&
      !(r.keywords || []).some(k => k.use === "pending"));
    const pick = walked.find(r => (r.areas || []).some(a => !a.search)) || walked[0];
    if (pick) localStorage.setItem("rc.current", JSON.stringify({ crawlId: pick.crawlId, roomId: pick.id }));
  }, data);
  page.__errors = errors;
  return page;
}

export async function goto(page, site, hash) {
  await page.goto(site.url + "/index.html" + hash, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#screen") && document.querySelector("#screen").children.length > 0);
  await page.waitForFunction(() => document.querySelector("#tabbar").children.length > 0);
}

// Poll for a change rather than waiting a fixed interval (defect D-15).
export async function until(page, fn, timeout = 2500) {
  const start = Date.now();
  for (;;) {
    if (await page.evaluate(fn)) return true;
    if (Date.now() - start > timeout) return false;
    await page.waitForTimeout(25);
  }
}

export function reporter() {
  const state = { pass: 0, fail: 0, failures: [] };
  return {
    check(name, condition, detail) {
      if (condition) state.pass++;
      else { state.fail++; state.failures.push(name + (detail ? " — " + detail : "")); }
    },
    done(label) {
      console.log("\n" + label + ": " + state.pass + " passed, " + state.fail + " failed");
      for (const f of state.failures) console.error("  FAIL " + f);
      return state.fail;
    },
    state
  };
}

// Measurements the contract is written in (template §6.7).
export const MEASURE = {
  strayText: () => {
    const bad = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = n.nodeValue.trim();
      if (/^(null|undefined|NaN|\[object Object\])$/.test(t) ||
          /\b(undefined|NaN|\[object Object\])\b/.test(t)) {
        bad.push(t.slice(0, 60));
      }
    }
    return bad;
  },
  overflow: () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  // Measured at maximum scroll: the tab bar is fixed, so content passing under
  // it mid-scroll is normal. What matters is whether anything is still buried
  // once you have scrolled as far as the screen goes.
  underTabBar: () => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const tab = document.querySelector(".tabbar");
    if (!tab) return [];
    const top = tab.getBoundingClientRect().top;
    const docH = document.documentElement.scrollHeight;
    const out = [];
    for (const c of document.querySelectorAll("#screen button, #screen a, #screen input, #screen summary")) {
      if (c.closest("details:not([open])")) continue;   // collapsed panels keep a stale box
      const r = c.getBoundingClientRect();
      const absBottom = r.bottom + window.scrollY;
      if (absBottom > docH - 1) continue;
      const visible = r.width > 0 && r.height > 0;
      if (visible && r.top > top - 2 && r.top < window.innerHeight) out.push((c.textContent || c.name || c.tagName).trim().slice(0, 40));
    }
    return out;
  },
  primaryOffset: () => {
    const btn = document.querySelector("#action-bar-host .btn-primary") ||
                document.querySelector("#screen .btn-primary");
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { top: Math.round(r.top), inViewport: r.top >= 0 && r.bottom <= window.innerHeight + 1, label: btn.textContent.trim().slice(0, 40) };
  },
  // WCAG 2.2 SC 2.5.8 exempts a target that sits inside a sentence or block of
  // text, so inline links in prose are counted separately rather than failing
  // the 44px floor they were never held to.
  smallestTarget: () => {
    let min = Infinity, who = "";
    const sel = "#screen button, #screen a, #screen label, #action-bar-host button, #action-bar-host a, .tab";
    for (const c of document.querySelectorAll(sel)) {
      if (c.closest("details:not([open])") && !c.matches("summary")) continue;
      if (c.classList.contains("sr-only")) continue;
      const inlineInProse = c.tagName === "A" &&
        getComputedStyle(c).display === "inline" &&
        !!c.closest("p, li, summary");
      if (inlineInProse) continue;
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const size = Math.min(r.width, r.height);
      if (size < min) { min = size; who = (c.textContent || c.tagName).trim().slice(0, 40); }
    }
    return { min: min === Infinity ? null : Math.round(min), who };
  },
  explain: () => {
    const d = document.querySelector("#screen details.explain");
    return d ? { present: true, open: d.open } : { present: false, open: false };
  },
  // Only fields a mobile browser would zoom into on focus; a checkbox has no
  // text to zoom and is measured by its wrapping label instead.
  inputFontSizes: () => Array.from(document.querySelectorAll("#screen input, #screen textarea, #screen select"))
    .filter(i => !["checkbox", "radio", "range", "color"].includes(i.type))
    .map(i => parseFloat(getComputedStyle(i).fontSize)),

  // Reported, not asserted: inline prose links, so the exemption stays visible.
  inlineProseLinks: () => Array.from(document.querySelectorAll("#screen p a, #screen li a"))
    .filter(a => getComputedStyle(a).display === "inline")
    .map(a => ({ text: a.textContent.trim().slice(0, 30), h: Math.round(a.getBoundingClientRect().height) })),
  heightInViewports: () => +(document.documentElement.scrollHeight / window.innerHeight).toFixed(1),
  controlCount: () => document.querySelectorAll("#screen button, #screen a, #screen input, #screen summary").length
};
