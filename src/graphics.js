// graphics.js — drawn elements. Every picture here is derived from a record or
// from a data table; none of them adds a rule, and each says in text (on the
// card beside it, or in its accessible label) what it shows.
import { el } from "./core.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function svgWrap(cls, markup, label) {
  const attrs = label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" };
  return el("span", { class: "gfx " + cls, ...attrs, html: markup });
}

// The colour channel for a find: the danger hue for the loss side, the good hue
// for the fortunate side (theme, §1). Answers are never toned — whether a Yes is
// good news depends on the question.
export function findTone(find) {
  if (!find) return "";
  const ids = [find.elementId, ...(find.sub || []).map(x => x.elementId)];
  if (ids.includes("unfortunate")) return "tone-unfortunate";
  if (ids.includes("fortunate")) return "tone-fortunate";
  return "";
}

// A glyph for each Room Element (sprite symbols e-*), shown beside its name.
export function elementGlyph(id) {
  return svgWrap("glyph glyph-" + id,
    '<svg class="ico" viewBox="0 0 24 24"><use href="#e-' + esc(id) + '"/></svg>');
}

// ── A d100 table as a strip, with the roll marked ────────────────────────────
// `bands` are { id, min, max, name, tone? }. This is the working a result
// dialog owes (§6.4): which band the die fell in, out of all of them.
export function bandStrip(bands, roll, { label, compact = false } = {}) {
  const W = 300, H = compact ? 16 : 22, top = 14;
  let segs = "";
  for (const b of bands) {
    const x = (b.min - 1) / 100 * W, w = (b.max - b.min + 1) / 100 * W;
    const hit = roll != null && roll >= b.min && roll <= b.max;
    segs += '<rect class="seg seg-' + esc(b.tone || "plain") + (hit ? " seg-hit" : "") + '" x="' + x.toFixed(2) +
      '" y="' + top + '" width="' + Math.max(w - 1.5, 1).toFixed(2) + '" height="' + H + '" rx="3"/>';
    if (w >= 34 && !compact) {
      segs += '<text class="seg-num" x="' + (x + 4).toFixed(2) + '" y="' + (top + H - 6) + '">' + b.min + "</text>";
    }
  }
  let mark = "";
  if (roll != null) {
    const mx = ((roll - 0.5) / 100 * W).toFixed(2);
    mark = '<path class="mark" d="M' + mx + " " + (top - 1) + " l-5 -8 h10 z\"/>" +
      '<line class="mark-line" x1="' + mx + '" x2="' + mx + '" y1="' + top + '" y2="' + (top + H) + '"/>';
  }
  const markup = '<svg viewBox="-6 0 ' + (W + 12) + " " + (top + H + 2) + '" preserveAspectRatio="xMidYMid meet">' + segs + mark + "</svg>";
  return svgWrap("band-strip" + (compact ? " band-compact" : ""), markup, label);
}

// The Room Elements table, toned the way the theme reserves colour.
export function elementBands(table) {
  return table.map(b => ({ ...b, tone: b.id === "unfortunate" ? "danger" : b.id === "fortunate" ? "good" : "plain" }));
}

// One odds row of the Ask The Game Master chart as four bands, in chart order.
export function oddsBands(row, answers) {
  return answers.map((a, i) => ({ id: a.id, name: a.name, min: row[a.key][0], max: row[a.key][1], tone: "ans" + i }));
}

// ── The room as a plan ───────────────────────────────────────────────────────
// The outline is the General Area; each numbered block is an Area, read left
// to right and top to bottom in play order, filled when searched. Sizes vary a
// little per room so plans do not all look alike; the variation is fixed per
// room and means nothing.
function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

export function roomPlan(room, { onPick } = {}) {
  const areas = [...(room.areas || [])].sort((a, b) => a.order - b.order);
  const n = areas.length;
  const rows = n > 3 ? [Math.ceil(n / 2), n - Math.ceil(n / 2)] : [n];
  const rowH = 22, pad = 8, gap = 6, W = 120;
  const H = pad * 2 + rows.length * rowH + (rows.length - 1) * gap + 4;
  const gen = !!room.generalArea;
  let h = hash(room.id), blocks = "", idx = 0;
  rows.forEach((count, r) => {
    const inner = W - pad * 2 - 6;
    const weights = Array.from({ length: count }, () => { h = (h * 1103515245 + 12345) >>> 0; return 0.8 + (h % 100) / 250; });
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = pad + 3;
    weights.forEach(wt => {
      const a = areas[idx];
      const w = (inner - gap * (count - 1)) * wt / sum;
      h = (h * 1103515245 + 12345) >>> 0;
      const bh = rowH - (h % 7);
      const y = pad + 2 + r * (rowH + gap) + (r === 0 ? 0 : rowH - bh);
      const done = !!a.search;
      const tone = done ? findTone(a.search) : "";
      blocks += '<g class="plan-area' + (done ? " done" : "") + (tone ? " " + tone : "") + '" data-area="' + esc(a.id) +
        '" tabindex="0" role="button" aria-label="' + esc("Area " + (idx + 1) + ": " + a.name + (done ? ", searched" : ", not searched")) + '">' +
        '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="2.5"/>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y + bh / 2 + 2.6) + '">' + (idx + 1) + "</text></g>";
      x += w + gap;
      idx++;
    });
  });
  const doorX = 20 + (hash(room.id) % 60);
  const markup = '<svg viewBox="0 0 ' + W + " " + H + '">' +
    '<g class="plan-room' + (gen ? " done" : "") + '" data-area="__general" tabindex="0" role="button" aria-label="' +
    esc("The General Area" + (gen ? ", searched" : ", not searched")) + '">' +
    '<rect class="plan-floor" x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" rx="3"/>' +
    '<path class="plan-door" d="M' + doorX + " " + (H - 3) + "h14\"/></g>" + blocks + "</svg>";
  const searched = areas.filter(a => a.search).length;
  const wrap = svgWrap("room-plan", markup,
    "Plan of the room: " + searched + " of " + n + " Areas searched, General Area " + (gen ? "searched" : "not searched"));
  wrap.setAttribute("role", "group");
  if (onPick) {
    const pick = e => {
      const g = e.target.closest("[data-area]");
      if (!g) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onPick(g.getAttribute("data-area"));
    };
    wrap.addEventListener("click", pick);
    wrap.addEventListener("keydown", pick);
  }
  return wrap;
}

// ── A crawl as a strip of rooms, one square per room in crawl order ──────────
export function crawlStrip(states) {
  if (!states.length) return null;
  const n = states.length, gap = 3, size = 12;
  let cells = "";
  states.forEach((st, i) => {
    cells += '<rect class="cs cs-' + esc(st) + '" x="' + (i * (size + gap)) + '" y="1" width="' + size + '" height="' + size + '" rx="2.5"/>';
  });
  return svgWrap("crawl-strip", '<svg viewBox="-1 0 ' + (n * (size + gap) + 1) + ' 14" width="' + (n * (size + gap)) + '" height="14">' + cells + "</svg>");
}

// ── Every face of the d100, as a 10 × 10 field ───────────────────────────────
export function heatGrid(counts) {
  let max = 0;
  for (let f = 1; f <= 100; f++) max = Math.max(max, counts[f] || 0);
  let cells = "";
  for (let f = 1; f <= 100; f++) {
    const c = counts[f] || 0;
    const x = ((f - 1) % 10) * 10, y = Math.floor((f - 1) / 10) * 10;
    const o = max ? (0.12 + 0.88 * c / max) : 0;
    cells += '<rect class="hc' + (c ? "" : " hc-zero") + '" x="' + (x + .6) + '" y="' + (y + .6) + '" width="8.8" height="8.8" rx="1.6"' +
      (c ? ' style="fill-opacity:' + o.toFixed(2) + '"' : "") + "><title>" + f + ": " + c + "</title></rect>";
  }
  return svgWrap("heat-grid", '<svg viewBox="0 0 100 100">' + cells + "</svg>");
}

// ── Empty-state drawings ─────────────────────────────────────────────────────
const ART = {
  // An open doorway with lamplight on the floor.
  door: '<path class="a-fill" d="M38 86 L22 104 H98 L82 86 Z"/><path d="M40 86V30a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v56"/><path d="M40 86 L56 78V22l-12 4"/><circle class="a-dot" cx="52" cy="54" r="1.8"/><path d="M14 86h92"/>',
  // Two ten-sided dice.
  dice: '<path d="M40 30 L60 42 L56 70 L32 76 L20 52 Z"/><path d="M40 30 L38 56 L20 52M38 56 L56 70M38 56L32 76"/><path class="a-fill" d="M76 46 L96 56 L94 82 L72 88 L62 66 Z"/><path d="M76 46 L78 70 L62 66M78 70 L94 82M78 70 L72 88"/><path d="M14 94h92"/>',
  // A folded map with a dotted route.
  map: '<path d="M20 34 L44 26 L76 34 L100 26 V86 L76 94 L44 86 L20 94 Z"/><path d="M44 26V86M76 34V94"/><path class="a-route" d="M28 80 C40 66, 52 76, 60 60 S 82 50, 90 40"/><path class="a-fill" d="M86 36l8 8M94 36l-8 8"/>',
  // A floor plan with one room drawn.
  plan: '<rect x="18" y="26" width="84" height="60" rx="3"/><path d="M60 26V56H102M18 60H44"/><path class="a-fill" d="M22 30h34v22H22z"/><path d="M70 86h14"/>'
};
export function illustration(name) {
  if (!ART[name]) return null;
  return svgWrap("illo", '<svg viewBox="0 0 120 112" fill="none">' + ART[name] + "</svg>");
}

// The end of a long list: a small ornament instead of an abrupt stop.
export function fleuron() {
  return svgWrap("fleuron", '<svg class="ico" viewBox="0 0 48 12"><use href="#i-fleuron"/></svg>');
}
