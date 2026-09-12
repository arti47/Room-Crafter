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

---

## Cycle 2 — the One-Page Mythic source

Run while integrating the second supplied source, so this cycle covers new
ground rather than re-reading the old.

### Pass 1 — Dead-data scan

**A-13 · A rules value hardcoded in a `src/` module.**
*Rule:* 50/50 is the default odds (One-Page Mythic).
*Target:* `src/mythic.js` → `oddsById`; `src/sheet.js` → `oddsAsker`.
*Fix:* both now read `DEFAULT_ODDS` from `data-mythic.js`.
*Why it mattered:* §10.2 — the data layer is the only part a human can proofread
against the page. Two modules had the string `"fifty"` baked in.

**A-14 · Extracted copy and a provenance flag with no reader.**
*Target:* `MYTHIC_EXPLAIN` and `MYTHIC` in `data-mythic.js`.
*Fix:* the explain line now appears under the odds picker; the `MYTHIC` flag
drives a provenance badge on every Mythic row in the roll log, matching the
house-aid badge.
*Why it mattered:* two sources are mixed in one log now. Without the badge a
player cannot tell which book a roll came from — and the badge existed as a
concept with nothing rendering it.

### Pass 2 — Rules read-through (`docs/rules/mythic.md` against the engine)

**A-15 · Fortunate/Unfortunate still said "on your own tables" with Mythic on.**
*Rule:* use the obvious idea, else Discover Meaning (R16).
*Target:* `src/sheet.js` → `findBlock`.
*Fix:* with the toggle on, the card offers "No idea — Discover Meaning" and
rolls it. With the toggle off, the original guidance line returns.
*Why it mattered:* the copy would have been actively wrong — telling you to go
elsewhere for something the app had just gained the ability to do.

**A-16 · Mythic's rules stayed in the library with the toggle off.**
*Target:* `src/screens.js` → `rules`.
*Fix:* the library merges `MYTHIC_RULES` only while the toggle is on.
*Why it mattered:* §10.13 in its mirror image — describing a rule the app is not
applying is the same defect as applying one it does not describe.

### Passes 4–5 — Interaction audit and measured layout

No app findings. The room sheet grows to ~5.7 viewports at stress with the odds
picker present; the jump row added in cycle 1 (A-12) covers it.

### Harness faults

- **H-8** The smoke assertion for the recorded encounter used `\bYes\b`, but the
  die renders flush against the answer ("38Yes"), so the word boundary never
  matched. It now asserts the recorded state itself.
- **H-9** `page.goto` to the same URL and hash did not reliably reload, so the
  toggle-off tests were measuring the toggle-on app. They reload explicitly.
- **H-10** The interaction audit compared `innerHTML.length`. A radiogroup moving
  its selection from one chip to another is a **net-zero length change**, so nine
  live odds controls read as dead. It compares the markup itself now — which is
  the stronger check it should always have been, and the same fault would have
  hidden any swap-shaped change anywhere in the app.

### Guards proven to bite

| Guard | Break | Result |
|---|---|---|
| `T11` / `R31` / `R35` chart coverage | one band narrowed by a single number (`yes: [11,50]` → `[11,49]`) | red, three checks, naming roll 50 |
| `R32` Random Event trigger | `isRandomEvent` narrowed to `roll === 11` | red, naming roll 22 |
| `mythic off` smoke checks | the toggle condition forced true | red, three checks |

### Verified clean in this cycle

- **Every Odds row** covers 1–100 exactly once, starts at 1 and ends at 100.
- **Monotonicity:** Yes-or-better shrinks strictly from Certain to Impossible —
  the cheapest check that the nine rows were not transposed in transcription.
- **Discover Meaning:** 50 bands of two covering 1–100, 50 unique Actions and 50
  unique Descriptions, both columns alphabetical (case-insensitively — `NPC`
  sorts by letter, not by ASCII).
- **Random Events:** 400 sampled asks in the browser, zero mismatches between a
  double and an event; the event never costs a second question.
- **Both toggle states** render, neither claims the other's copy, and the rules
  library follows the toggle.

---

## Cycle 3 — the review walk

Run as a flow walk with screenshots at 390px, dark, and 900px, then a code
re-read — a different method from cycles 1 and 2, as the template says to do
when a pass runs dry. It found more than either.

### Pass 7 — Flow walk (run first this time)

**A-17 · The primary action skipped the article's order.**
*Rule:* describe → ask → search (ruling A9, R9).
*Target:* `src/sheet.js` → `primaryAction`; `src/derived.js` → `nextStep`.
*Fix:* the pinned primary now walks the procedure — "Ask: is there an
encounter?" until answered or skipped, then each Area, then the General Area,
then finish. Skipping is a link under the primary and is recorded on the room,
so the export can say "not asked" rather than nothing.
*Why it mattered:* §6.3.3 — the app should read like the game's own sequence of
play, and it opened on step three.

**A-18 · Two more schema fields with no control.**
*Target:* `context.genreNote`, `crawl.note`.
*Fix:* removed, with a migration that drops `genreNote` from old records.
*Why it mattered:* same class as A-7. Written empty, read by nothing.

**A-19 · The fairness record was amputated by the log cap.**
*Rule:* a distribution view across the campaign (template §5.1, §14.1.10).
*Target:* `src/store.js` → `logRoll`, `distribution`.
*Fix:* an uncapped per-face counter, written at the same moment as the log
entry, exported, imported, undone and cleared with it. The log still pages and
forgets; the counts do not.
*Why it mattered:* 200 rolls is thirteen rooms with Mythic on. The view that
exists to settle an argument about the dice was quietly forgetting the evidence.

**A-20 · Areas could not be renamed or reordered.**
*Rule:* place Areas where they seem most fitting (R26) — a permission I had
rationalised in the ledger as "order preserved".
*Target:* `src/lifecycle.js` → `renameArea`, `moveArea`; `src/sheet.js` → `areaCard`.
*Fix:* rename and up/down controls on every card. What searching found is never
editable.
*Why it mattered:* D-22, in my own ledger, dressed up as a structural note.

**A-21 · No general Ask The GM.**
*Target:* `src/sheet.js` → `askBlock`; `src/lifecycle.js` → `recordQuestion`.
*Fix:* a fold on the sheet for any yes/no question about the room, answered on
the chart, kept with the room, Random Events included, in the read-aloud text.
*Why it mattered:* the article names two questions; play asks twenty. Mythic is
a general oracle and the app was using it as two buttons.

### Pass 5 — Measured layout

**A-22 · The tablet layout was the phone layout, wider.**
*Rule:* P8 — a tablet layout must add density, never stretch (template §16).
*Target:* `styles.css`; `src/sheet.js` → `render`; `src/wizard.js`.
*Fix:* two real columns at ≥760px — the room's own matter left, the Areas
right; the keyword card left, Areas-so-far right. `.two-col` had been dead CSS
nothing used. The smoke harness now asserts the columns sit side by side at
900px and stack at 390px.
*Why it mattered:* I had ticked Phase 5's tablet line on the strength of a
wider frame and a bigger keyword card. That was not the promise.

**A-23 · The once-per-room odds picker outweighed the Areas.**
*Rule:* frequency decides height (§6.3.4).
*Target:* `src/sheet.js` → `oddsAsker`.
*Fix:* one row — Unlikely / 50-50 / Likely — with the full nine behind a fold.
The room sheet dropped from 3.7 to 3.3 viewports at mid-crawl even after the
review's other controls were added.

**A-24 · Area cards carried detail and note folds before the Area was searched.**
*Fix:* both now appear only on a searched Area — they are things you do to
something you have found.

### Pass 4 — Interaction audit

**A-25 · Radiogroups had the role without the keyboard behaviour.**
*Fix:* one `radioGroup` helper in `ui.js` with arrow, Home and End handling,
replacing five hand-rolled copies (budget, theme, text size, log filter, odds).

### Read-through, small

- **A-26** "Done with this room" and "Finish this room" were one action with two
  names. Unified.
- **A-27** The wizard's keyword trail showed the internal enum (`pending`,
  `combined`). Now "on the table", "carried into the next", "became an Area:
  …", "dropped".
- **A-28** The room header during the wizard read "open GENERAL · 0/1
  EXPLORABLE". It now shows keyword progress, which is the number that matters
  while a room is being made.
- **A-29** Export was clipboard-only. Now a file download with the textarea as
  fallback; import opens a file picker; read-aloud text uses the share sheet
  where the browser has one.

### Harness faults

- **H-11** The quick-odds row was built by filtering the chart in chart order,
  so its third chip was *Unlikely*. The smoke walk caught it on the first run
  ("Yes at Unlikely" where Likely was asked). Fixed to build the row in the
  stated order; the assertion that caught it stays.
- **H-12** The new "Skip the question" link was 32px tall. The tap-target check
  caught it; it is 44px.

### Verified clean in this cycle

- Both column layouts: side by side at 900px, stacked at 390px, no overflow.
- Every new control clickable, doing something, erroring nothing (342 controls).
- The primary follows the procedure through all four steps, and follows a
  reorder.
- Face counts equal total rolls at 2× the log cap; survive export, import and
  undo; reset with the log.
- Rename leaves the find untouched; move refuses at both edges; the read-aloud
  text follows the new order.

---

## Cycle 4 — first report from play

**A-30 · Every in-place action scrolled to the top.**
*Reported by the owner:* "When I roll sock drawer or detail, it jumps back to
the top."
*Target:* `src/router.js` → `render`.
*Root cause:* one render path served both navigation and refresh, and ended
with an unconditional scroll to top. Every screen's `rerender` — detail rolls,
notes, renames, reorders, another-word, the odds picker — went through it.
*Fix:* `refresh()` redraws with `keepPlace`: scroll position is restored and
open `<details>` folds are re-opened (keyed by summary text plus occurrence,
which is stable across a redraw of the same screen). Navigation still starts
at the top.
*Why it mattered:* the harnesses never saw it because none of them scrolled
before acting — every check clicked from the top of a freshly loaded page. The
first person to use the app on a phone found it in minutes. The regression
check now scrolls to a fold before rolling, and was watched go red (before 745,
after 0) against the old path.
*Lesson for the harness:* the interaction audit resets state between clicks,
which is right for isolation and blind to exactly this class — anything that
depends on where you were. A "from the middle of the page" variant is owed.

**A-31 · Actions inside the find modal did nothing visible.**
*Reported by the owner:* "Button doesn't work" — "No idea — Discover Meaning" on
a Fortunate result.
*Target:* `src/sheet.js` → `showFind`, `findBlock`, `meaningBlock`.
*Root cause:* the modal's body was built once. Its buttons mutated the find,
saved the room and called `rerender()` — which redrew the sheet *behind* the
modal and left the modal as it was. The data was written; the surface lied.
The Random table picker and "+ Action / + Description" had the same fault.
*Fix:* `findBlock` takes a `redraw`; the sheet passes its own rerender, the
modal passes one that rebuilds the modal body and then the sheet.
*Also:* the Fortunate/Unfortunate card printed "Use the obvious idea if you
have one" twice — once in the blurb, once as a hint. The hint is gone.
*Why the harness missed it:* the interaction audit clicks controls on the
*screen*, never inside a modal it has opened. Two of its three change signals
(screen markup, storage) fired anyway — storage changed, so the click "did
something" — which is exactly the no-op shape the audit exists to catch, one
layer down. The regression check now searches fresh rooms until a result with
an action comes up, uses it, and asserts the modal's own text changed; watched
go red against the old path.
*Lesson for the harness:* the interaction audit needs to descend into any modal
it opens and click there too, comparing the modal's markup.

## Cycle 4 — still owed

Three cycles: twelve, four, thirteen. The third was the largest because the
method changed. The stopping rule is unmet, and the method that would find the
next set is the one not yet used: **a real session at a table**, phone in one
hand, with someone who has not read the rulebook.
