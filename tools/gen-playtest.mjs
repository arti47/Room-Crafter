// Generates data-playtest.js from docs/PLAYTEST.md, so the script you read and
// the steps the playtest mode walks are one text. `npm test` fails if they drift.
// Usage: node tools/gen-playtest.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "docs/PLAYTEST.md"), "utf8");

export function parsePlaytest(text) {
  const steps = [];
  let part = "", section = "", cur = null;
  const flush = () => { if (cur) { cur.do = cur.do.trim(); cur.check = cur.check.trim(); steps.push(cur); cur = null; } };
  for (const line of text.split("\n")) {
    let m;
    if ((m = line.match(/^## (Part .+)$/))) { flush(); part = m[1].replace(/\s*\(.*$/, "").trim(); section = ""; continue; }
    if ((m = line.match(/^### (.+)$/))) { flush(); section = m[1].replace(/\s*\(R.*$/, "").trim(); continue; }
    if (/^(## |---)/.test(line)) { flush(); continue; }
    if ((m = line.match(/^(\d+)\. (.*)$/))) { flush(); cur = { n: Number(m[1]), part, section, do: m[2], check: "", inCheck: false }; continue; }
    if (!cur) continue;
    const t = line.trim();
    if (!t) continue;
    if (/^\*\*Check/.test(t)) cur.inCheck = true;
    const sep = t.startsWith("- ") ? "\n" : " ";
    if (cur.inCheck) cur.check += (cur.check ? sep : "") + t;
    else cur.do += sep + t;
  }
  flush();
  return steps.map(({ inCheck, ...s }) => s);
}

export function render(steps) {
  return "// data-playtest.js — GENERATED from docs/PLAYTEST.md by tools/gen-playtest.mjs.\n" +
    "// Do not edit by hand: edit the script, then run `node tools/gen-playtest.mjs`.\n" +
    "// Dev aid, not rules content: walked only by the hidden playtest mode.\n" +
    "export const PLAYTEST_STEPS = " + JSON.stringify(steps, null, 1) + ";\n";
}

const out = render(parsePlaytest(md));
const target = join(root, "data-playtest.js");
if (process.argv.includes("--check")) {
  const have = readFileSync(target, "utf8");
  if (have !== out) { console.error("data-playtest.js is out of date with docs/PLAYTEST.md — run node tools/gen-playtest.mjs"); process.exit(1); }
  console.log("data-playtest.js in sync");
} else {
  writeFileSync(target, out);
  console.log("wrote " + parsePlaytest(md).length + " steps");
}
