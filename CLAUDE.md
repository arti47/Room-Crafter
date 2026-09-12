# Room Crafter — Project Spec (canonical)

Instantiated from `docs/BUILD-TEMPLATE-v3.md` (RPG Player-Character App —
Autonomous Build Instructions v3) per its §9. **This file is canonical. Every
code change updates it in the same change** (template §10.1) — features, data
model, file tables, roadmap checkboxes, ledger ticks, changelog.

Companion documents:
- `docs/room-crafter-rules.md` — the distilled source rules (the audit reads this against the engine, §11.2.2).
- `docs/STAGE-A-CHECKPOINT.md` — Stage A output, signed off. Rulings A1–A15 live there and are binding.
- `docs/BUILD-TEMPLATE-v3.md` — the build template. Everything marked LOCKED there applies here unless this file records an approved deviation.
- `docs/AUDIT.md` — numbered findings, created at Phase 6.

---

## 1. What we are building

| | |
|---|---|
| **Source** | *Mythic Magazine* Vol. 69, "Variations: Single Room Explorations" (The Room Crafter) |
| **Second source** | **One-Page Mythic** (Word Mill Games), behind `Settings.useMythic` — the emulator the article defers its Fate Questions to. Ruling A16: it is *not* GME 2e, and has no Chaos Factor |
| **What it is** | A solo/GM-less room oracle: generate a room from keywords, then resolve what searching it turns up |
| **Audience** | One person at a table, GM-less by construction — there is no second seat (ruling A15) |
| **Platforms** | Phone-first, tablet layout, installable PWA |
| **Core job** | Room **generation wizard** + **room sheet** with per-Area search state + **table roller** + crawl records |
| **Multiplayer** | **None.** Omitted at Stage B — a GM-less room oracle has no party state to sync. JSON and read-aloud export are the hand-off |
| **Backend** | None. `localStorage` only; no Firebase, no keys, no network at runtime |
| **Theme** | Ink on warm paper (light) / lamplit slate (dark); one accent for keywords, one for danger-side Elements. Follows system by default, in-app toggle overrides, plus a text-size control |

### 1.0 Approved deviations from template LOCKED scope

The source has no characters, resolution mechanic, combat, damage, inventory,
advancement or bestiary (Stage A §1). Template mandatory scope is re-pointed at
the **Room** as the tracked entity. Signed off at Stage B.

| Template surface | Here |
|---|---|
| Creation wizard | Room generation wizard (the keyword walk) |
| Character sheet | Room sheet |
| Dice engine | Table roller (d100 over three tables) |
| Persistent resource header | Persistent room header — name · Areas searched N/M · General Area used · budget |
| Roll log + distribution | Kept, mandatory |
| JSON export/import | Kept, mandatory; plus a **read-aloud export** (§14.1.7 — arguably this app's primary output) |
| Lifecycle engine | Room lifecycle (clears the once-per flags) + crawl boundaries, with summary and one-step undo |
| Rules library · per-screen `explain()` · tutorial | Kept, mandatory |
| Inventory & resources | **Omitted** — the system has none |
| Bestiary / NPC compendium | **Omitted** — explicitly out of scope in the source |
| Combat tracker | **Omitted** — no combat rules exist |
| Firebase multiplayer | **Omitted** — Stage B decision |
| GM screen | **Omitted** — ruling A15 |
| Solo mode (conditional toggle) | **Not a toggle — it is the app** |

### 1.1 Product Decisions (Stage B)

| # | Decision | Answer |
|---|---|---|
| P1 | Source scope | ~~Room Crafter article only~~ — **superseded.** One-Page Mythic was supplied after Stage B and unblocks B1–B3 (ruling A16) |
| P13 | Review round (2026-09-12) | **Play order:** the pinned primary walks the procedure — ask (skippable) → search → General → finish · **Odds picker:** one row Unlikely/50-50/Likely, full chart behind a fold · **Tablet:** two real columns · **Areas:** rename + reorder, finds never editable · **Export:** files + share sheet, clipboard fallback · **Mis-taps:** no protection — the roll is the roll · **Free questions:** an Ask-the-GM fold on the room sheet |
| P12 | Mythic scope | **All of it, behind a toggle** (`Settings.useMythic`, default on): Ask The GM, Discover Meaning, and Random Events. Off, the three surfaces revert to prompt-and-record and Mythic's rules leave the library |
| P2 | Scope re-point + rulings | **Approved as written** — §1.0 above, rulings A1–A15 binding |
| P3 | Repository | **Private** (owner to set). Verbatim tables stay committed; README carries the personal-use licensing note |
| P4 | Usage mode | Single-device, local-only. No sync phase |
| P5 | User's seat | N/A — GM-less tool, no role split |
| P6 | Dice input | **Digital only.** The app is the dice; no manual-entry field anywhere |
| P7 | Expansion commitment | None supplied |
| P8 | Table device | **Phone + tablet.** Phone is the baseline and the tested floor (320/360/390px); the tablet layout must *add* density (two columns, keyword walk beside the room sheet), never stretch |
| P9 | Crawl scope | **Many crawls.** `crawls/{id}/rooms/{id}`; a finished crawl stays as a browsable record |
| P10 | Theme default | Follow system |
| P11 | Backlog (§14) taken | Campaign list (as P9) · general undo · human-readable export · repeat-roll · roll distribution · text-size control. Not taken: character switcher, named combatants, wake lock, hand-off privacy, portraits, sound |

---

## 2. System Profile (completed)

Full slot-by-slot profile: `docs/STAGE-A-CHECKPOINT.md` §1. Summary of what
exists:

- **Resolution:** d100 table lookup only. No success criteria, modifiers, crits or push economy.
- **Entity:** the Room. Its fields are author Context (label, room type, genre note), not rules-defined stats.
- **Derived:** Area count (3–6 at six keywords, 2–3 at three) · total explorable Areas = Areas + 1 General Area · the room-complete predicate.
- **Lifecycle:** enter → generate Areas → describe → encounter check → search Areas (one roll each) → General Area (one roll) → complete. The clearer for both once-per flags is **new room**.
- **Absent:** attributes, skills, conditions, health, rest, advancement, inventory, combat, powers, bestiary, meta-currencies, safety tools.

### 2.1 Rule-shape census (§3.0)

Permission **11** · Lookup 4 · Compulsion 3 · Threshold 3 · Substitution 3 ·
Cascade 2 · Once-per-X 2 · Gate 1 · Exception 1.
Modifier · Cost · Future cost · Escalation · Conversion · Blocker · Opposed: **0**.

**What this means for the build.** A Permission-and-Lookup system with zero
arithmetic. Per template §15, this is the family where the app risks being a
notepad — the quality bar is **prompting and record-keeping**, not maths. Every
one of the eleven Permissions needs its own control (D-22); that is the build.
All §0 exposure sits on the two Cascades and two Once-per-X flags, so **D-16
(cascade shipped as a single shot)** and **D-17 (flag never cleared)** are the
two defects most likely to ship here. Watch them by name.

### 2.2 Blocked data

| # | Was missing | Blocked | Status |
|---|---|---|---|
| B1 | A Fate Question resolver | "Is there an encounter?", "Is something hidden found?" | **Unblocked** by One-Page Mythic's Ask The Game Master chart (T11) |
| B2 | A Meaning table | The **Random** element (81–95) and every Discover Meaning path | **Unblocked** by One-Page Mythic's Discover Meaning (T12) |
| B3 | Random Events | Solo pacing | **Unblocked** — the one-pager's double-digit trigger (T13) |
| B4 | Location Crafter Area Elements, Progress Points | Region-scale interop | Still absent; not needed |

**Still absent, deliberately:** GME 2e's larger Actions/Descriptions tables and
its themed Elements tables (this build has 50 Actions + 50 Descriptions), and
the **Chaos Factor** — the one-pager does not have one, and ruling A16 accepts
that rather than importing it from another edition.

**With `useMythic` off**, B1–B3 revert to prompt-and-record surfaces marked
`guidance only`. Both states are built, and the smoke harness asserts neither
claims the other's copy.

---

## 3. File structure

| File | Purpose | Status |
|---|---|---|
| `index.html` | Shell: header, persistent room header, bottom nav, screen mount, module entry | ☑ |
| `styles.css` | Theme (light + dark) + component styles + tablet layout | ☑ |
| `data.js` | Room Descriptors · Sock Drawer · Room Elements · encounter bands · budgets · rules-library entries | ☑ |
| `data-house-roomtypes.js` | Room-type starter list, `HOUSE_AID = true` | ☑ |
| `data-mythic.js` | One-Page Mythic: Ask The GM chart, Discover Meaning, Random Event triggers, its own rules-library entries | ☑ |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA. The worker is **network-first for everything**, cache as the offline fallback (A-32); `CACHE_VERSION` bumped on any shipped-file change raises the update toast | ☑ |
| `tests/` + `package.json` | Harnesses A–D, fixtures, probes; dev-only, gitignored `node_modules`, not in the SW app shell | ☑ |
| `README.md` | Setup + personal-use licensing note | ☑ |
| `docs/rules/` | Per-subsystem distilled reference the audit reads against the engine | ☑ |
| `docs/AUDIT.md` | Numbered findings + verified-clean list | ☑ |

**Deliberately absent, with reasons** (so a later pass does not rediscover the
non-decision): `data-monsters.js` / `data-npcs.js` — the source explicitly
excludes encounters and NPCs; `data-pregens.js` — none published, and the
article's worked examples are narrative fiction (ruling A13); `data-solo.js` —
solo is the whole app, not a module; `firebase-config.js` /
`database.rules.json` / `sync.js` — no backend (P4); `combat.js` — no combat
rules; `gm.js` — no second seat (A15); `power-automation.js` — no powers.

### 3.1 `src/` module map

| Module | Responsibility |
|---|---|
| `core.js` | Constants, DOM/util helpers (incl. the null-safe `add`), **crypto d100**. No imports |
| `ui.js` | Themed modal/toast/confirm/prompt, collapsible `explain()`, pinned `actionBar()` (returns bar + spacer together) |
| `rules.js` | Pure lookups over the data files: keyword by roll, Element band by roll, encounter band |
| `derived.js` | Area count, total explorable Areas, room-complete predicate, search progress, normalization/migration |
| `settings.js` | Theme, text size, house-aid visibility, advanced toggles |
| `store.js` | Crawl + room persistence, roll log (attributed at write time), JSON export/import, read-aloud export, undo stack |
| `wizard.js` | Room generation — the sequential keyword walk with interpret / combine / drop |
| `roller.js` | The d100 engine: keyword rolls, Element resolution, Multi-Element cascade, Sock Drawer pairs, roll-log writes |
| `mythic.js` | The One-Page Mythic engine, behind its toggle: Ask The GM, the Random Event trigger, Discover Meaning and "another word" |
| `sheet.js` | Room sheet, Area cards, persistent room header, General Area, notes |
| `lifecycle.js` | Room boundaries (the once-per flag clearer), crawl boundaries, encounter check, confirmation summaries + undo |
| `screens.js` | Home/crawl list, rules library, settings, roll log + distribution view |
| `tutorial.js` | First-session walkthrough + neutral demo rooms |
| `router.js` | Bottom-nav routing + section nav + live-state badges |
| `main.js` | Entry point / boot |

Adding or moving a `src/` file updates this table **and** the service-worker app
shell, and bumps `CACHE_VERSION`, in the same change.

---

## 4. Data Extraction Ledger

**How to continue (for any AI resuming this project):** work top to bottom
within the current phase. Read the value from `docs/room-crafter-rules.md`,
which is the distilled source of record; where it and the pasted source
disagree, the source wins and the distilled file is corrected. Write the table
into its data file (paraphrased where it is prose, cited by section), **tick the
box in the same change**, and append a changelog row. Estimated counts yield to
real counts — record them. **An unticked box means the data is not extracted;
never build UI against an unticked table.**

`Verified` = confirmed against the source. `Written` = present in the data file.
T1–T10 come from the Room Crafter article; T11–T14 from One-Page Mythic.

| T | Table | Rows | Target file | Consuming module | Verified | Written |
|---|---|---|---|---|---|---|
| T1 | Room Descriptors Meaning | 100 | `data.js` | `roller.rollKeyword` · `wizard.js` | ☑ | ☑ |
| T2 | Sock Drawer Meaning | 100 | `data.js` | `roller.rollMeaningPair` · `roller.rollDetail` | ☑ | ☑ |
| T3 | Room Elements bands | 7 bands / d100 | `data.js` | `roller.rollElement` · `roller.resolveSubBand` | ☑ | ☑ |
| T4 | "Is there an encounter?" answer bands | 4 (real count: the article lists Exceptional Yes, Yes, No, Exceptional No) | `data.js` | `lifecycle.recordEncounter` | ☑ | ☑ |
| T5 | Keyword budgets + derived Area ranges | 2 | `data.js` | `wizard.js` · `derived.areaCount` | ☑ | ☑ |
| T6 | Rules-library entries (paraphrased, cited) | 14 (real count) | `data.js` | `screens.rules` | ☑ | ☑ |
| T7 | `explain()` copy, one per screen | 9 | `data.js` | every screen module | ☑ | ☑ |
| T8 | Tutorial steps | 10 | `data.js` | `tutorial.js` | ☑ | ☑ |
| T9 | Room-type starter list (**house aid**) | 38 (real count) | `data-house-roomtypes.js` | `wizard.newRoomForm` · `roller.rollRoomType` | n/a | ☑ |
| T10 | Neutral demo rooms (**house content**, A13) | 2 | `data-house-roomtypes.js` | `tutorial.loadDemos` | n/a | ☑ |
| T11 | Ask The Game Master chart | 9 odds × 4 answers | `data-mythic.js` | `mythic.answerFor` · `sheet.oddsAsker` | ☑ | ☑ |
| T12 | Discover Meaning (Action + Description) | 50 bands / d100, 100 words | `data-mythic.js` | `mythic.discoverMeaning` · `mythic.anotherWord` | ☑ | ☑ |
| T13 | Random Event triggers | 9 doubles | `data-mythic.js` | `mythic.isRandomEvent` | ☑ | ☑ |
| T14 | Mythic rules-library entries | 4 | `data-mythic.js` | `screens.rules` (merged while the toggle is on) | ☑ | ☑ |

---

## 5. Rules Traceability Ledger

One row per rule. **Fill the row when you build the rule, not at audit time.**
A row with a gap is the §0 defect visible before it ships: data with no engine is
a number nobody reads; engine with no surface is a function nobody can reach;
surface with no test is a rule that will regress silently. Rules deliberately
not automated carry `guidance only` in the Engine column — that is the explicit
marking template §10.13 requires. At the end of every phase the dead-data scan
must agree with this ledger.

Targets below are **planned**; tick them off as they become real.

| # | Rule | Shape | Data | Engine | Surface | Test |
|---|---|---|---|---|---|---|
| R1 | Roll the keywords one at a time, in order | Compulsion | `ROOM_DESCRIPTORS`, `BUDGETS` | `wizard.rollNext` → `roller.rollKeyword` | Wizard, one keyword per step | `R1 keywords arrive one at a time, numbered in order` · `R1 rolling past the budget is refused` |
| R2 | A keyword that inspires becomes an Area alone | Permission | — | `wizard.makeArea` | "Make this an Area" | `R2 one keyword can become an Area on its own` · `R2 an Area with no name is refused` |
| R3 | One that does not combines with the next | Permission + Cascade | — | `wizard.carryForward` | "Nothing yet — carry it forward" | `R3 a carried pair makes one Area and consumes both keywords` |
| R4 | Combinations cap at two (A7) | Threshold | `MAX_COMBINE` | `wizard.canCarry` | Control replaced by a cited note at two | `R4 combining stops at two` · `R4 six keywords never yield fewer than three Areas` |
| R5 | Only the final keyword may be dropped (A8) | Exception | — | `wizard.canDrop` · `wizard.dropLast` | "Drop it and finish", last step only | `R5 dropping is refused until the final keyword` |
| R6 | The budget caps the Area count | Threshold | `BUDGETS` | `derived.areaCount` · `derived.totalExplorable` | Wizard meta line · persistent room header | `R6/R7` · `R6 derived Area counts match the record` |
| R7 | Three-keyword variant for crawls | Substitution | `BUDGETS` | `wizard.newRoomForm` budget picker | Budget picker, inherited by the next room | `R6/R7 a three-keyword room walks three steps` |
| R8 | Embellishments are not Areas | Permission | — | `sheet.descriptionBlock` | Free-text description, separate from Area cards | structural: no Area record is created from it |
| R9 | The encounter check comes after describing, before searching (A9) | Lookup + Gate | `ENCOUNTER_ANSWERS` | `derived.nextStep` → `sheet.primaryAction`; `lifecycle.recordEncounter` · `lifecycle.skipEncounter` | The pinned primary asks it first, with a skip link; the block sits above the Areas | `the primary action walks the article's order` · `skipping the encounter is a permission` · `R9/R10` |
| R10 | Resolving it needs the Fate Chart | Lookup | — | `guidance only` (B1) | Prompt-and-record, `not automated` badge | same |
| R11 | One Room Elements roll per Area (A2) | Once-per-X | `ROOM_ELEMENTS` | `derived.canSearchArea` → `roller.searchArea` | Control disappears after use; refusal cites `search` | `R11 an Area takes exactly one roll, and the second is refused` |
| R12 | The flag is cleared only by a new room | Once-per-X | — | `lifecycle.newRoom` (throws if a new room carries spent flags) | — | `R12 a new room clears the search flags — and nothing else does` |
| R13 | Multi-Element expands to exactly two (A3) | Cascade | `ROOM_ELEMENTS` | `roller.expandMultiElement` | Result card shows both | `R13 Multi-Element always expands to exactly two sub-Elements` |
| R14 | A repeat or nested Multi-Element becomes Expected (A4) | Exception | — | `roller.resolveSubBand` | Result card names the substitution | `R14 a repeat or a nested Multi-Element becomes Expected` |
| R15 | Expectations follow face value, not the wish | Compulsion | — | `guidance only` | Note + rules link on every Expected/Enhanced/Minimized result | copy asserted present by the smoke walk |
| R16 | Fortunate/Unfortunate: obvious idea, else Discover Meaning | Permission | — | `guidance only` (B1) | Prompt on the result card | copy asserted present |
| R17 | Random rolls a pair on a chosen Meaning table (A11) | Lookup + Permission | `ROOM_DESCRIPTORS`, `SOCK_DRAWER` | `roller.needsMeaning` → `roller.attachMeaning` | Table picker naming B2's absent tables | `R17 Random asks for a Meaning pair, and only then stops asking` |
| R18 | Sock Drawer is a meaning table, rolled in pairs (A10) | Lookup | `SOCK_DRAWER` | `roller.rollMeaningPair` · `roller.rollDetail` | Detail roll on every Area and the General Area | `R18 a Meaning pair is two words… doubles kept` · `R18 a detail roll lands on the room, tagged with its Area` |
| R19 | One General Area roll per room (A1, A12) | Once-per-X | `ROOM_ELEMENTS` | `derived.canSearchGeneral` → `roller.searchGeneralArea` | Its own card below the Areas | `R19 the General Area needs no prerequisite` · `R19/A12` |
| R20 | Complete = every Area + the General Area | Threshold | — | `derived.isComplete` | Persistent room header | `R20 complete flips on the last roll, not before` |
| R21 | Unsearched Areas leave it described, not searched (A14) | Threshold | — | `derived.searchState` | Header state chip · crawl list | `R21 a skipped Area leaves the room described or part searched` |
| R22 | No Conclusion Element | Gate | — | `lifecycle.roomSummary` · `sheet.finishRoom` | Completion summary offers no further roll | `R22/R23` · smoke asserts the summary never says "conclusion" |
| R23 | Search all, some or none | Permission | — | `sheet.finishRoom` | "Done with this room", always enabled | `R22/R23 a room with nothing searched is a legitimate resting state` |
| R24 | Hidden things: your task mechanic, then a Fate Question | Substitution | — | `guidance only` (B1) → `lifecycle.recordHidden` | Prompt-and-record fold, `not automated` badge | `R24 hidden searches are recorded, not automated` |
| R25 | Connected simple rooms may be one room | Permission | `context.multiRoomNote` | `wizard.newRoomForm` | "Does this room cover several spaces?" · shown on the sheet | `R25 the multi-room note persists on the record` |
| R26 | Place Areas where they seem fitting, and name them better later | Permission | `area.order`, `area.name` | `lifecycle.moveArea` · `lifecycle.renameArea` | ✎ ▲ ▼ on every Area card; the find is never editable | `R26 an Area can be renamed` · `R26 Areas can be reordered` |
| R27 | A room may be any close space | Permission | `ROOM_TYPES` (house aid) | `wizard.newRoomForm` | Free-text room type; the list only suggests | `R27 a room type the house-aid list has never heard of is accepted` |
| R28 | Chain rooms into a crawl | Permission | — | `lifecycle.nextRoom` | "Next room in this crawl", budget inherited | `R28 the next room joins the same crawl and inherits the budget` |
| R29 | Cryptographic dice, shown, logged once, never silently re-rolled | — | — | `core.d100` · `store.logRoll` | Every result card · roll log · distribution | `R29 d100 stays in range and reaches both ends` · `R29 one search writes exactly one Element roll` |
| R30 | House aids identify themselves wherever rolled | — | `HOUSE_AID`, `ROOM_TYPES` | `roller.rollRoomType` · `ui.houseAidBadge` | Badge on the rolled room type, in the log, in Settings and the tutorial | `R30 a house-aid roll is logged as a house aid` |

### One-Page Mythic (R31–R36) — live only while `Settings.useMythic` is on

| # | Rule | Shape | Data | Engine | Surface | Test |
|---|---|---|---|---|---|---|
| R31 | Assign odds, roll d100, read the chart | Lookup | `ODDS`, `DEFAULT_ODDS` | `mythic.answerFor` | `sheet.oddsAsker` — the odds radiogroup and Ask, shared by both questions | `T11 every Odds row covers 1–100 exactly once` · `R31 the chart resolves at every band boundary` · `R31 better odds never make a Yes less likely` |
| R32 | A double digit also fires a Random Event | Cascade | `RANDOM_EVENT_ROLLS` | `mythic.isRandomEvent` inside `mythic.ask` | Event printed on the answer card, with its rule linked | `R32 a double fires a Random Event, and nothing else does` · smoke samples 400 asks |
| R33 | Discover Meaning: Action and Description columns | Lookup | `DISCOVER_MEANING`, `MEANING_COLUMNS` | `mythic.discoverMeaning` | Random element picker · Fortunate/Unfortunate card | `T12 Discover Meaning covers 1–100 in fifty bands of two` · `R33` |
| R34 | Keep rolling words until it comes clear | Permission | `MEANING_COLUMNS` | `mythic.anotherWord` | "+ Action" / "+ Description" on any Mythic meaning | `R34 another word appends rather than replacing` |
| R35 | One question is one roll, read once for the answer and once for the event | Compulsion | — | `mythic.ask` | Answer card shows the single die | `R35 Ask The GM records the odds, the roll and the answer` · `R35 asking writes one roll, plus two only when an event fires` |
| R36 | The answer belongs to the room, not the moment | — | — | `lifecycle.recordEncounter` · `lifecycle.recordHidden` | Room sheet · read-aloud export | `R36 a Mythic answer reaches the encounter record and the read-aloud text` · `R36 a hidden search keeps its Mythic answer through normalization` |
| R38 | Any yes/no question about the room may be asked | Permission | — | `mythic.ask` → `lifecycle.recordQuestion` | "Ask the GM" fold on the sheet, kept with the room and in the read-aloud text | `R38 a free question is kept on the room` |
| R39 | The fairness record is never capped | — (template §5.1) | — | `store.logRoll` face counter · `store.distribution` | Distribution view | `the face counts are never capped` · `face counts survive export, import and undo` |
| R37 | The toggle gates every Mythic surface, and its rules with it | Gate | — | `Settings.useMythic` | Settings row; five call sites in `sheet.js`, one in `screens.js` | smoke asserts both states and that neither claims the other's copy |

**Rows with a `guidance only` engine** (R10, R15, R24 — and R16 only while the
Mythic toggle is off) are the blocked
surfaces of §2.2 and the one interpretation rule the app deliberately does not
automate. Each carries a `not automated` badge where it appears. That marking is
the explicit non-decision template §10.13 requires; it is not a gap.

## 6. Data model (`localStorage`)

```
crawls/{crawlId}
  meta:   { name, createdAt, lastOpenedAt }     // note removed (A-18)
  rooms:  [roomId, ...]                       // explicit order — the crawl sequence

rooms/{roomId}
  crawlId, createdAt
  context:   { label, roomType, houseAidType: bool, multiRoomNote }   // genreNote removed (A-18)
  budget:    6 | 3
  keywords:  [ { n: 1..6, roll, word, use: "area" | "combined" | "dropped" } ]
  areas:     [ { id, name, fromKeywords: [n], order,
                 search: null | { roll, elementId, elementName,
                                  sub: [ {roll, elementId, elementName, substituted} ],
                                  meaning: null | { tableId, tableName, rolls, words, doubled },
                                  note, ts }, note } ]
  generalArea: null | { roll, elementId, elementName, sub: [...], meaning|null, note, ts }
  details:     [ { areaId|null, <meaning>, ts } ]  // Sock Drawer / detail rolls, one list

  <meaning> = { tableId, tableName, rolls: [...], words: [...],
                columns: [...] | null,        // Mythic only: which column each word came from
                doubled }                     // words grow: "another word" appends
  encounter:   null | { asked: true, answer: "exYes"|"yes"|"no"|"exNo", answerName,
                        answerBlurb, note, ts,
                        odds, oddsName, roll,        // null unless Mythic answered it
                        event: null | <meaning> }    // a double fired a Random Event
  encounterSkipped: bool                        // the question passed over (a permission)
  hidden:      [ { question, answer, answerName, answerBlurb, note, ts,
                   odds, oddsName, roll, event } ]
  questions:   [ same shape as hidden ]          // free Ask-the-GM questions about the room (R38)
  description: ""            // free text; embellishments, not Areas
  notes:       ""
  state:       { complete: bool }               // derived.isComplete, stored for list rendering

rollLog/{id}: { table, roll, result, crawlId, roomId, roomName, areaId|null,
                context, houseAid?, mythic?, ts }           // capped at 200, paged 25 at a time
                                                            // provenance flags badge the row
faceCounts:   { counts[101], total }           // never capped: the fairness record (A-19)
undo:         [ { label, snapshot, ts } ]                                  // one stack, any mutating action pushes
settings:     { theme, textScale, showHouseAids, useMythic }
```

Rules: every rules number the schema references lives in the data files; every
schema addition ships a normalization path that back-fills defaults on old
records and **resets spent once-per-X flags in the same pass**; every field
addition is documented here in the same change; any shape change ships a
migration **and** a fixture test that loads a hand-written old-shape record.

---

## 7. Build roadmap

Build strictly in order. A phase is done when its features each satisfy §8.

**Phase 0 — Foundations** ☑
- ☑ Scaffold every file in §3; `node --check` parse gate wired first and run on every source file
- ☑ `data.js` complete and verified: T1 · T2 · T3 · T4 · T5 — *data before features*
- ☑ Theme (both palettes, system default, in-app toggle, text-size control)
- ☑ PWA shell: manifest, icon, service worker (app shell cached + versioned, navigation network-first), update toast
- ☑ App shell: router, the template §6.2 frame, two-level nav, `localStorage`
- ☑ Crawl list + room list (P9)

**Phase 1 — Room Generation Wizard** ☑ — R1–R8, R25–R27
- ☑ Sequential keyword walk with interpret / combine / drop
- ☑ Budget picker (6 / 3), Area cap enforced, combination capped at two (A7)
- ☑ Room creation: label, room type (house-aid list, free text, and a roll), multi-room note
- ☑ Legality at every step; refusals cite the rule

**Phase 2 — Room Sheet** ☑ — R8, R20, R21, R26
- ☑ Description field, Area cards, ordering, notes, jump row
- ☑ Persistent room header: name · Areas N/M · General Area · explorable N/M · state
- ☑ JSON export/import in Settings; read-aloud export
- ☑ Persistence + normalization/migration + old-shape fixture test

**Phase 3 — Table Roller** ☑ — R9–R19, R29, R30
- ☑ `core.d100` on `crypto.getRandomValues`; faces shown; one action = one logged roll
- ☑ Element resolution with the Multi-Element cascade (A3/A4) and its termination
- ☑ Once-per-Area gate (A2) and General Area (A1/A12), both with cited refusals
- ☑ Sock Drawer pairs and detail rolls (A10); Random with table picker (A11) naming B2
- ☑ Encounter check (R9) and hidden-search (R24) prompt-and-record stubs, badged
- ☑ Roll log: attributed, filterable, capped, paged, `aria-live` + distribution view
- ☑ Every automated surface links to its rules-library entry

**🏁 Milestone — First Room Playable** ☑
Create a crawl → generate a room → describe it → encounter check → search every
Area → General Area → complete → export, end to end, zero console errors.
Driven by the smoke harness as a scripted session; **not yet rehearsed at a real
table** — that is the one part of this milestone still owed.

**Phase 4 — In-Play Systems** ☑ — R11–R12, R20–R23, R28
- ☑ Room lifecycle: completion summary, and the boundary that clears the once-per flags (R12; the UI now goes through it — audit A-1)
- ☑ Crawl boundaries: next room with the budget inherited, summaries, one-step undo
- ☑ General undo stack across every mutating action
- ☑ Repeat-roll affordance on Random results
- ☑ Data-integrity action in Settings

**Phase 5 — Teaching + tablet** ☑
- ☑ Rules library: accordion, session order, search auto-opens matches (T6, 14 entries)
- ☑ `explain()` on every screen, collapsed by default (T7)
- ☑ Tutorial as its own route + neutral demo rooms (T8, T10)
- ☑ Tablet layout at ≥760px: **two real columns** on the room sheet and the wizard (A-22 — the first version was the phone layout, wider)

**Phase 6 — One-Page Mythic** ☑ — R31–R37, T11–T14
- ☑ `data-mythic.js`: the Ask The GM chart, Discover Meaning, Random Event triggers, its own rules entries
- ☑ `src/mythic.js`: the engine, with the answer resolver and the event trigger as pure functions
- ☑ Encounter check and hidden searches asked on the chart, with one shared odds picker
- ☑ Random Events fired from the same roll, never a second question
- ☑ Discover Meaning wired into the Random element and into Fortunate/Unfortunate, with "another word"
- ☑ `Settings.useMythic` gating every surface and the rules-library entries, both states asserted
- ☑ Provenance badge on Mythic rolls in the log — two sources now share one log

**Phase 7 — Review round** ☑ — P13, A-17…A-29
- ☑ Primary walks the procedure; the encounter question is skippable and recorded
- ☑ Compact odds picker; radiogroups with keyboard behaviour via one `radioGroup` helper
- ☑ Areas rename and reorder; detail/note folds only after a search
- ☑ Free Ask-the-GM questions on the room sheet
- ☑ Uncapped face counter behind the distribution view
- ☑ File export/import; share sheet for read-aloud text
- ☑ Dead fields removed; wizard trail and header humanised; one label for finishing a room

**Phase 8 — Hardening** ◐
- ☑ Harness A (`npm test`, 85 checks), B (`npm run smoke`, 268), C (`npm run interact`, 342), D (fixtures fresh/mid-crawl/stress + both probes)
- ☑ Dead-data scan (`npm run scan`), clean
- ☑ Accessibility: focus trap, `aria-live`, `aria-current`, labelled controls, 16px inputs, 40px+ targets, reduced motion, skip link
- ☑ The §6.7 measurement contract, asserted on every route at every seed
- ☑ Six guards proven to bite against reintroduced defects
- ☑ Audit cycles 1–3 (twelve, four, thirteen findings) — `docs/AUDIT.md`
- ◐ **Cycle 4.** First reports from play fixed (A-30…A-33). Harness gaps they exposed: mid-page actions, in-modal actions. The method that found it — using the app from the middle of a page, not the top — is one the harnesses lack; a mid-page variant of the interaction audit is owed.
- ☑ PWA update-path test — `npm run pwa`: network-first serves the new code on one reload, the toast appears, accepting leaves only the new cache, the app boots offline on the new code (A-32)

## 8. Definition of done — per feature

- [ ] **Rule** cited to `docs/room-crafter-rules.md`, with edge cases
- [ ] **Data** in a `data*.js` file, never inline in a module
- [ ] **Engine** — a named function that applies it, including any repetition
- [ ] **Surface** — reachable in two taps, primary action above the fold
- [ ] **Flags** — every state field has a setter, a reader and a **clearer**
- [ ] **Defaults** match what the fiction does when nobody touches the control
- [ ] **Onward route** on every terminal outcome
- [ ] **Copy** either enforced or marked guidance-only
- [ ] **Test** — a unit invariant, plus a browser check if it has a surface, and you have **watched it fail** against the unfixed code
- [ ] **Traceability row** filled, all six columns (§5)
- [ ] **This file** updated in the same change; `CACHE_VERSION` bumped

---

## 9. Process rules

Template §10 applies in full. The ones this project will actually be tested by:

1. **Living spec.** A code change with a stale `CLAUDE.md` is incomplete.
2. **Single source of truth.** No rules value hardcoded in a `src/` module.
3. **Changelog row per change:** what, why, root cause for fixes, verification, cache version.
4. **Verify in a real browser**, headless, zero console errors. "Syntax is valid" is not verification.
5. **Prove the guard bites** — reintroduce the defect, watch the check go red, restore the fix (D-14).
6. **Explain and enforce in the same change** — UI copy stating a mechanic owes either an enforcer or an explicit guidance-only mark.
7. **Every flag has a setter, a reader and a clearer.** Name all three in the same change. This project has exactly two once-per flags and one clearer; if that clearer is not `lifecycle.newRoom`, it does not exist.
8. **Defaults follow the fiction.** A rule that applies unless prevented ships defaulting to on.
9. **Two sources, one app.** Room Crafter content and One-Page Mythic content live in separate data files, and every Mythic surface — including its rules-library entries — is gated by `Settings.useMythic`. Describing a rule the app is not applying is the same defect as applying one it does not describe. Rolls from each source are badged in the log.
10. **Scope guard.** Supplied content only. Nothing invented is presented as official; the room-type list is a labelled house aid, and the demo rooms are labelled house content.
11. **Reversibility is inventoried.** Every destructive action either undoes or confirms while naming the loss.

---

## 10. Changelog

| Date | Change | Why | Verification | Cache |
|---|---|---|---|---|
| 2026-09-11 | Distilled the source to `docs/room-crafter-rules.md` | Stage A ingestion | Both d100 tables verified by alphabetical monotonicity, 200/200 slots, no duplicates | — |
| 2026-09-11 | Stage A checkpoint written and signed off (`docs/STAGE-A-CHECKPOINT.md`) | Template §4.1 | Rulings A1–A15 approved as written | — |
| 2026-09-11 | Instantiated this spec: product decisions P1–P11, file tables, extraction ledger T1–T13, traceability ledger R1–R30, roadmap | Template §9 | Awaiting Stage C go-ahead | — |
| 2026-09-11 | Stage C: built Phases 0–5 — data library, shell, wizard, sheet, roller, lifecycle, teaching layers, tablet layout | Stage B sign-off | `npm test` 63 · `smoke` 245 · `interact` 243 · `scan` clean; zero console errors on every route | `rc-v1` |
| 2026-09-11 | Audit cycle 1: twelve findings fixed (A-1…A-12) plus seven harness faults (H-1…H-7) | Template §11 | Each fix re-verified; three guards watched go red against reintroduced defects | `rc-v1` |
| 2026-09-11 | A-1: routed room creation through `lifecycle.newRoom` | The named clearer for the once-per-X flags was not on any code path — the guarantee was a coincidence | `R12` covers it; `newRoom` throws if a new room carries spent flags | `rc-v1` |
| 2026-09-11 | A-2: added the detail-roll control | The Sock Drawer table was extracted, tested and unreachable — §0 exactly | `R18 a detail roll lands on the room` | `rc-v1` |
| 2026-09-11 | Phase 6: integrated One-Page Mythic behind `Settings.useMythic` — Ask The GM, Discover Meaning, Random Events; B1–B3 unblocked | The owner supplied the source; ruling A16 records it as the engine, Chaos Factor and all | Chart verified: nine rows each covering 1–100 exactly once, Yes-or-better strictly monotonic; Discover Meaning 50 bands, both columns alphabetical; 400 sampled asks with zero event mismatches | `rc-v2` |
| 2026-09-11 | Audit cycle 2: A-13…A-16 and three harness faults | Template §11 | Three more guards watched go red | `rc-v2` |
| 2026-09-11 | A-13: moved the default odds into the data layer | `"fifty"` was hardcoded in two `src/` modules (§10.2) | `R31` covers the row; `DEFAULT_ODDS` is the only source | `rc-v2` |
| 2026-09-11 | H-10: the interaction audit now compares markup, not its length | A radiogroup changing selection is a net-zero length change, so nine live controls read as dead — and the same fault would hide any swap-shaped change | 294 controls, 0 findings | — |
| 2026-09-12 | A-32: service worker network-first for every request; the update path is now tested (`npm run pwa`, in `npm run all`) | The owner was shown a pre-fix build after the fix shipped: cache-first modules served stale code for one reload. The template's named failure, untested until now | Thirteen checks; watched go red (three named failures) against the cache-first worker. H-13/H-14: a page's own reload under an activating worker cannot be followed by this harness — the accept step is driven from a fresh page instead (`docs/AUDIT.md`) | `rc-v6` |
| 2026-09-12 | A-33: the find modal's secondary action is full-width like its primary | Formatting report | screenshot at 390px dark | `rc-v6` |
| 2026-09-12 | A-31: the find modal redraws itself after an action inside it; duplicate "obvious idea" line removed | Owner report: "No idea — Discover Meaning" looked dead. The modal body was static; its actions redrew only the sheet behind | `modal:` smoke checks, watched go red against the old path | `rc-v5` |
| 2026-09-12 | A-30: in-place refreshes keep scroll position and open folds; only navigation starts at the top | Owner report from play: rolling a detail jumped to the top. One render path served navigation and refresh alike | `scroll:` smoke checks, watched go red (before 745 → after 0) against the old path | `rc-v4` |
| 2026-09-12 | Review round (P13): primary walks the procedure with a skippable encounter question; compact odds picker; two-column tablet layout; Area rename/reorder; free Ask-the-GM questions; uncapped face counter; file export/import + share sheet; radiogroup keyboard behaviour; dead fields removed; wizard trail and header humanised | Flow walk with screenshots at 390/dark/900 found thirteen things (A-17…A-29) | `npm test` 85 · `smoke` 268 · `interact` 342 · `scan` clean; room sheet 3.7→3.3 viewports at mid-crawl | `rc-v3` |
| 2026-09-12 | A-22: the tablet layout was a stretched phone layout | `.two-col` was dead CSS; Phase 5's tablet line had been ticked on a wider frame alone | smoke asserts columns side by side at 900px and stacked at 390px | `rc-v3` |
| 2026-09-12 | A-19: distribution now reads an uncapped per-face counter | The log cap was silently truncating the fairness record at ~13 rooms | `the face counts are never capped` at 2× the cap; survive export/import/undo | `rc-v3` |
| 2026-09-12 | H-11: quick-odds row built in stated order, not chart order | Filtering the chart put Unlikely third; the smoke walk caught "Yes at Unlikely" where Likely was asked | assertion retained | — |
| 2026-09-11 | A-7: added the multi-room field | A permission the article grants had a schema field and no control (D-22) | `R25 the multi-room note persists` | `rc-v1` |
