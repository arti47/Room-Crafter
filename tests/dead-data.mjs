// Dead-data scan — the pass that finds the dominant defect class: data extracted
// faithfully, documented in the UI, and never called. Two scripts: every export
// nothing else imports, and every named import a file never uses.
import { readdirSync, readFileSync } from "node:fs";

const files = [
  ...readdirSync("src").filter(f => f.endsWith(".js")).map(f => "src/" + f),
  "data.js", "data-house-roomtypes.js", "data-mythic.js"
];
const src = Object.fromEntries(files.map(f => [f, readFileSync(f, "utf8")]));

// Exports declared per file.
const exports = {};
for (const [f, text] of Object.entries(src)) {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    }
  }
  exports[f] = names;
}

// Named imports per file.
const importsOf = {};
for (const [f, text] of Object.entries(src)) {
  const set = new Set();
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) set.add(n);
    }
  }
  importsOf[f] = set;
}

function word(n) {
  // \b does not bound identifiers like `$`, which produced false positives.
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return /^[A-Za-z0-9_]/.test(n) ? new RegExp("\\b" + esc + "\\b") : new RegExp("(?<![A-Za-z0-9_$])" + esc + "(?![A-Za-z0-9_$])");
}

// Harness files consume exports too — a test is a legitimate consumer, and the
// traceability ledger requires one for every automated rule.
const harnessText = readdirSync("tests").filter(f => f.endsWith(".mjs"))
  .map(f => readFileSync("tests/" + f, "utf8")).join("\n");

const allImported = new Set();
for (const s of Object.values(importsOf)) for (const n of s) allImported.add(n);
// Namespace imports (import * as x) mean any export of that module may be used.
const namespaced = new Set();
for (const text of Object.values(src)) {
  for (const m of text.matchAll(/import\s*\*\s*as\s*[A-Za-z0-9_$]+\s*from\s*["']([^"']+)["']/g)) {
    namespaced.add(m[1].replace(/^\.\.?\//, "").replace(/^\//, ""));
  }
}
function isNamespaced(file) {
  const base = file.replace(/^src\//, "");
  return namespaced.has(base) || namespaced.has(file) || namespaced.has("src/" + base);
}

// Entry points are consumed by index.html / the harnesses, not by other modules.
const ENTRY = new Set(["src/main.js"]);
const HARNESS_USED = new Set(["serve", "ROUTES", "resetStorage", "resolveSubBand", "EXPORT_VERSION"]);

const unusedExports = [];   // reachable from nothing at all — the real finding
const internalOnly = [];    // exported, used inside its own module
const testOnly = [];        // exported, reached only by a harness
for (const [f, names] of Object.entries(exports)) {
  if (ENTRY.has(f)) continue;
  for (const n of names) {
    const re = word(n);
    const bodyOfOwn = src[f].replace(new RegExp("^export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+" + n + "\\b", "m"), "");
    const usedHere = re.test(bodyOfOwn);
    const referencedElsewhere = Object.entries(src).some(([g, t]) => g !== f && re.test(t));
    const usedByHarness = re.test(harnessText);
    if (allImported.has(n) && referencedElsewhere) continue;
    if (isNamespaced(f) && referencedElsewhere) continue;
    if (usedHere) { internalOnly.push(f + " -> " + n); continue; }
    if (usedByHarness || HARNESS_USED.has(n)) { testOnly.push(f + " -> " + n); continue; }
    unusedExports.push(f + " -> " + n);
  }
}

const unusedImports = [];
for (const [f, names] of Object.entries(importsOf)) {
  const body = src[f].replace(/^import[^\n]*\n/gm, "");
  for (const n of names) {
    const used = word(n).test(body);
    if (!used) unusedImports.push(f + " imports " + n + " and never uses it");
  }
}

// Every data table must have a consumer somewhere in src/.
const dataExports = [...exports["data.js"], ...exports["data-house-roomtypes.js"], ...exports["data-mythic.js"]];
const srcText = files.filter(f => f.startsWith("src/")).map(f => src[f]).join("\n");
const unreadData = dataExports.filter(n => !word(n).test(srcText));

let fail = 0;
function report(title, rows, fatal) {
  console.log("\n" + title + ": " + rows.length);
  for (const row of rows) console.log("  " + row);
  if (fatal && rows.length) fail += rows.length;
}
report("Exports reachable from nothing (a rule the engine never reads)", unusedExports, true);
report("Exported, used only inside its own module (fine)", internalOnly, false);
report("Exported, reached only by a harness (fine — a test is a consumer)", testOnly, false);
report("Named imports never used", unusedImports, true);
report("Data exports no module reads (a rule the engine never calls)", unreadData, true);

console.log(fail ? "\ndead-data scan: " + fail + " finding(s)" : "\ndead-data scan: clean");
process.exit(fail ? 1 : 0);
