# Audit log

Numbered findings, pass by pass. Format: **Rule / Target / Fix / Why it
mattered**. The verified-clean list at the end exists so later passes do not
re-litigate settled ground.

---

## Cycle 1

### Pass 1 — Dead-data scan (mechanical)

**A-1 · The clearer for the once-per-X flags was not on the path.**
*Rule:* one roll per Area, cleared only by a new room (R11/R12, ruling A2).
*Target:* `src/wizard.js` → `newRoomForm.create`.
*Fix:* room creation now goes through `lifecycle.newRoom`, which throws if a new
room ever arrives carrying spent search flags. The UI had been calling
`store.createRoom` directly.
*Why it mattered:* the spec names `lifecycle.newRoom` as the one clearer in the
system. Nothing called it. The behaviour happened to be right because a fresh
record has no flags — so the guarantee was a coincidence, and the first
refactor that changed room creation would have quietly ended it. This is D-17
caught before it could happen.

**A-2 · A whole extracted table had no control.**
*Rule:* the Sock Drawer meaning table, rolled in pairs for one thing inside
something you have found (R18, ruling A10).
*Target:* `src/roller.js` → `rollDetail`; `src/sheet.js` → `detailBlock`.
*Fix:* a detail-roll control on every Area card and on the General Area, with
one `room.details` record shape and one renderer for both, carried into the
read-aloud export.
*Why it mattered:* 100 rows extracted, unit-tested and unreachable — §0 exactly.

**A-3 · The house-aid roll had no control, so the house-aid badge had no
surface.**
*Rule:* house aids identify themselves wherever they are rolled (R30).
*Target:* `src/wizard.js` → `newRoomForm`.
*Fix:* "Roll a room type" next to the field, with the badge on the result.
*Why it mattered:* the labelling rule is the whole basis on which invented
content is allowed in the app at all. It was enforced nowhere because nothing
rolled.

**A-4 · Two counters for one procedure.**
*Rule:* keywords remaining in the walk.
*Target:* `src/derived.js` → `keywordsRemaining` (deleted); `wizard.stepsLeft`
is now the only one.
*Fix:* deleted the duplicate and left a comment saying why the count lives in
the wizard.
*Why it mattered:* D-5. Two paths deriving one count disagree eventually, and
this one drove which control the wizard offered.

**A-5 · Derived values computed and never surfaced.**
*Rule:* total explorable = Areas + the General Area (R6).
*Target:* `src/derived.js` → `totalExplorable`, `searchedTotal`;
`src/sheet.js` → header and General Area block.
*Fix:* both now appear in the persistent header and in the sentence that
explains what the General Area adds.
*Why it mattered:* D-24 — a number that defines the shape of a room, computed
and shown to nobody.

**A-6 · Dead helpers.** `core.$$`, `rules.ruleEntry`, `wizard.isLastKeyword`,
and four unused named imports, all deleted. `lifecycle.nextRoom` was wired into
the "next room" flow rather than deleted, and now carries the previous room's
keyword budget forward.

### Pass 2 — Rules read-through (`docs/rules/*.md` against the engine)

**A-7 · A permission the book grants had no control.**
*Rule:* a simple multi-room space may be treated as one room
(`docs/room-crafter-rules.md` §1, R25).
*Target:* `src/wizard.js` → `newRoomForm`; `src/sheet.js` → room heading.
*Fix:* a "does this room cover several spaces?" field, collected at creation and
shown on the sheet.
*Why it mattered:* D-22. The schema had carried `multiRoomNote` since the spec
was written and nothing ever wrote to it — a permission silently removed from
the game.

**A-8 · The one rule players get wrong was not linked where it applies.**
*Rule:* expectations follow face value, not what the character wants (R15).
*Target:* `src/sheet.js` → `findBlock`.
*Fix:* every Expected / Enhanced / Minimized result now carries the note and a
link into the rules-library entry.
*Why it mattered:* §6.6 layer 2 — every automated surface links to its entry —
and this is the rule the article spends a whole box explaining.

**A-9 · "Searching is optional" had no control.**
*Rule:* no obligation to search all, or any, of a room (R23).
*Target:* `src/sheet.js` → `roomActionsBlock`.
*Fix:* "Done with this room" is always available, not only once everything has
been rolled.
*Why it mattered:* the only way out of an unsearched room was the back link,
which reads as abandoning it rather than finishing it.

**A-10 · Imperative copy with no enforcer.**
*Rule:* ask the encounter question after describing the room (R9, ruling A9).
*Target:* `src/sheet.js` → `encounterBlock`.
*Fix:* a nudge appears while the room has no description, and the block keeps
its `not automated` badge.
*Why it mattered:* §10.13 — copy that states a mechanic owes either an enforcer
or an explicit guidance mark. This is deliberately guidance: locking a player
out of a question they forgot to ask in order is worse than the disorder.

### Pass 4 — Interaction audit

**A-11 · The log's filter chips were plain buttons, not a radiogroup.**
*Target:* `src/screens.js` → `log`.
*Fix:* `role="radiogroup"` / `aria-checked`, matching every other choice row in
the app.
*Why it mattered:* clicking the chip that is already on is correctly a no-op;
the markup was what made that indistinguishable from a dead control.

### Pass 5 — Measured layout

**A-12 · The room sheet runs to ~5 viewports under load.**
*Target:* `src/sheet.js` → `jumpRow`.
*Fix:* an in-page jump row (buttons, not anchors — the app routes on the hash).
*Why it mattered:* §6.5. At session-three density the General Area sits four
screens below the Areas.

### Harness faults found and fixed (a harness that lies is worse than no harness)

- **H-1** The under-tab-bar check measured at the current scroll position, so
  content passing under a *fixed* bar mid-scroll read as buried. It now measures
  at maximum scroll.
- **H-2** The tap-target floor was applied to inline links inside sentences,
  which WCAG 2.2 SC 2.5.8 explicitly exempts, and to the visually-hidden search
  label. Both are now excluded, and inline prose links are *reported* by the
  probe so the exemption stays visible.
- **H-3** The 16px input floor was applied to checkboxes, which do not trigger
  zoom-on-focus and are measured by their wrapping label instead.
- **H-4** The dead-data scan used `\b` word boundaries, which do not bound `$`,
  and treated an export used inside its own module as unreachable. It now
  classifies findings into *reachable from nothing* (the real finding),
  *internal only*, and *reached only by a harness*.
- **H-5** The interaction audit did not count scrolling as a change, so the new
  jump row read as five dead buttons.
- **H-6** The seed fixtures pointed the app's current-room at the last room in
  the file, which is mid-wizard — so every pass on `#/room` had been measuring
  the "still being made" empty state instead of the sheet.
- **H-7** The live-badge assertion expected no badge with a room in context. The
  app was right and the test was wrong: live state is supposed to travel (§6.3.8).

### Guards proven to bite (§10.6)

Each was reintroduced as a defect and watched go red before the fix was restored:

| Guard | Break | Result |
|---|---|---|
| `R11 an Area takes exactly one roll` | `derived.canSearchArea` always true | red |
| `R13` / `R14` Multi-Element substitution | `resolveSubBand` substitution disabled | red, both checks |
| `nothing sits under the tab bar` | body bottom padding removed | red on three seeds |

---

## Verified clean

- **Data values.** Both d100 tables: 100 rows, no duplicates, alphabetical
  continuity across each column half, correct at both ends of the index. Room
  Elements: every value 1–100 resolves to exactly one band, and the band widths
  match the published table (40/10/15/5/10/15/5).
- **No stray `null` / `undefined` / `NaN` / `[object Object]`** text on any route,
  at any seed, at any width.
- **Zero console errors** on every route at every seed, and across the whole
  end-to-end walk.
- **No horizontal overflow** at 320 / 360 / 390px on every route, including the
  stress seed.
- **Every screen's primary action is above the fold**, where it has one.
- **Every screen carries an `explain()` note**, collapsed by default.
- **Every visible control does something**, errors nothing, and is clickable
  (240 controls, clicked in isolation with storage reset between each).
- **Every logged roll** carries its table, roll, result and timestamp; the log is
  capped; one action produces exactly one entry.
- **Export round-trips through import**, including finds; a foreign file is
  refused.
- **Old-shape records** normalize without crashing.

## Cycle 2 — still owed

The stopping rule is one complete cycle of all seven passes with no finding.
Cycle 1 produced twelve. Cycle 2 has not been run, and by the template's own
evidence it should be expected to find things — change the seed, the width, and
the order of reading before running it.
