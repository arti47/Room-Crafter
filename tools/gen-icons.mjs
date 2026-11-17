// Rasterises icon.svg into the PNGs that home screens need (iOS ignores SVG
// touch icons; Android wants 192/512 PNG and a maskable one). Run after any
// change to icon.svg: node tools/gen-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import { EXEC } from "../tests/harness-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "icon.svg"), "utf8");
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const art = inner.replace(/<rect width="512" height="512" rx="112" fill="([^"]+)"\/>/, "");
const bg = (svg.match(/rx="112" fill="([^"]+)"/) || [])[1] || "#7a4b1e";
// Full-bleed square: iOS and launchers cut their own shape.
const square = scale => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="' + bg + '"/>' +
  '<g transform="translate(256 256) scale(' + scale + ') translate(-256 -256)">' + art + "</g></svg>";
const jobs = [
  { file: "icons/icon-192.png", size: 192, svg },
  { file: "icons/icon-512.png", size: 512, svg },
  { file: "icons/apple-touch-icon.png", size: 180, svg: square(1) },
  { file: "icons/icon-maskable-512.png", size: 512, svg: square(0.78) }   // inside the 80% safe circle
];
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent('<html><body style="margin:0;background:transparent">' +
    j.svg.replace("<svg ", '<svg width="' + j.size + '" height="' + j.size + '" ') + "</body></html>");
  writeFileSync(join(root, j.file), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: j.size, height: j.size } }));
  console.log("wrote " + j.file);
}
await browser.close();
