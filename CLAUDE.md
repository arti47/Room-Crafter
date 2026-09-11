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
| P1 | Source scope | **Room Crafter article only.** Mythic GME 2e machinery is not supplied; blocked surfaces (B1–B3) ship as prompt-and-record stubs, marked `guidance only` in the traceability ledger |
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

| # | Missing | Blocks | Status |
|---|---|---|---|
| B1 | Fate Chart (Odds × Chaos Factor), Exceptional Yes/No | Automating "Is there an encounter?" and "Is something hidden found?" | Stub: app asks, you answer, it logs |
| B2 | Meaning tables (Actions 1/2, Descriptions 1/2) | The **Random** element (81–95, 15% of every search) and every Discover Meaning path | Stub; Random offers the two loaded tables (ruling A11) |
| B3 | Chaos Factor / Random Events | Solo pacing framing | Out of scope |
| B4 | Location Crafter Area Elements, Progress Points | Region-scale interop | Not needed |

**No UI is built against a blocked table.** Stubs are surfaces that ask and
record; they are not automation and are marked `guidance only` in §5.

---

## 3. File structure

| File | Purpose | Status |
|---|---|---|
| `index.html` | Shell: header, persistent room header, bottom nav, screen mount, module entry | ☐ |
| `styles.css` | Theme (light + dark) + component styles + tablet layout | ☐ |
| `data.js` | Room Descriptors · Sock Drawer · Room Elements · encounter bands · budgets · rules-library entries | ☐ |
| `data-house-roomtypes.js` | Room-type starter list, `HOUSE_AID = true` | ☐ |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA; `CACHE_VERSION` bumped on any shipped-file change | ☐ |
| `tests/` + `package.json` | Harnesses A–D, fixtures, probes; dev-only, gitignored `node_modules`, not in the SW app shell | ☐ |
| `README.md` | Setup + personal-use licensing note | ☐ |
| `docs/rules/` | Per-subsystem distilled reference the audit reads against the engine | ☐ |
| `docs/AUDIT.md` | Numbered findings + verified-clean list | ☐ |

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
| `roller.js` | The d100 engine: keyword rolls, Element resolution, Multi-Element cascade, Sock Drawer pairs, Random stub, roll-log writes |
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

| T | Table | Rows | Target file | Consuming module | Verified | Written |
|---|---|---|---|---|---|---|
| T1 | Room Descriptors Meaning | 100 | `data.js` | `roller.rollKeyword` · `wizard.js` | ☑ | ☐ |
| T2 | Sock Drawer Meaning | 100 | `data.js` | `roller.rollMeaningPair` | ☑ | ☐ |
| T3 | Room Elements bands | 7 bands / d100 | `data.js` | `roller.resolveElement` | ☑ | ☐ |
| T4 | "Is there an encounter?" answer bands | 3 | `data.js` | `lifecycle.encounterCheck` | ☑ | ☐ |
| T5 | Keyword budgets + derived Area ranges | 2 | `data.js` | `wizard.js` · `derived.areaCount` | ☑ | ☐ |
| T6 | Rules-library entries (paraphrased, cited) | ~8 | `data.js` | `screens.rulesLibrary` | ☐ | ☐ |
| T7 | `explain()` copy, one per screen | ~9 | `data.js` | every screen module | ☐ | ☐ |
| T8 | Tutorial steps | ~10 | `data.js` | `tutorial.js` | ☐ | ☐ |
| T9 | Room-type starter list (**house aid**) | ~30 | `data-house-roomtypes.js` | `wizard.js` | n/a | ☐ |
| T10 | Neutral demo rooms (**house content**, A13) | 2 | `data-house-roomtypes.js` | `tutorial.js` | n/a | ☐ |
| T11 | Fate Chart | — | — | — | **BLOCKED B1** | ✗ |
| T12 | Mythic Meaning tables | — | — | — | **BLOCKED B2** | ✗ |
| T13 | Chaos Factor / Random Events | — | — | — | **BLOCKED B3** | ✗ |

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
| R1 | Roll six keywords, one at a time, in order | Compulsion | `ROOM_DESCRIPTORS`, `BUDGETS` | `wizard.step` | Wizard, one keyword per step | keywords arrive singly and in order |
| R2 | A keyword that inspires becomes an Area alone | Permission | — | `wizard.interpretOne` | "Make this an Area" control | an Area is created from one keyword |
| R3 | A keyword that does not inspire combines with the next | Permission + Cascade | — | `wizard.carryForward` | "Combine with next" control | the pair yields one Area and consumes both |
| R4 | Combinations cap at two keywords (A7) | Threshold | — | `wizard.carryForward` | Control disabled at two, refusal cites A7 | six keywords never yield fewer than three Areas |
| R5 | The final keyword may be dropped if uninterpretable (A8) | Exception | — | `wizard.dropLast` | "Drop it" control, last step only | the control is absent on steps 1–5 |
| R6 | Keyword budget caps the Area count | Threshold | `BUDGETS` | `derived.areaCount` | Wizard progress + room header | 6→3–6 Areas, 3→2–3 Areas |
| R7 | Three-keyword variant for crawls | Substitution | `BUDGETS` | `wizard.setBudget` | Budget picker at room creation | a 3-budget room walks three steps |
| R8 | Embellish beyond the Areas; embellishments are not Areas | Permission | — | `sheet.description` | Free-text description field, separate from Area cards | description text creates no searchable Area |
| R9 | Encounter check runs after description, before searching (A9) | Lookup + Gate | `ENCOUNTER_BANDS` | `lifecycle.encounterCheck` | Room sheet, above the Area list | offered once, after description |
| R10 | Encounter resolution needs the Fate Chart | Lookup | — | `guidance only` (B1) | Prompt-and-record: app asks, you answer, it logs | the surface records an answer and cites B1 |
| R11 | One Room Elements roll per Area (A2) | Once-per-X | `ROOM_ELEMENTS` | `roller.searchArea` | Area card; control disables after use, refusal cites the rule | search, assert refusal on a second attempt |
| R12 | The once-per-Area flag is cleared only by a new room | Once-per-X | — | `lifecycle.newRoom` | — | new room, assert every Area is searchable again |
| R13 | Multi-Element expands to exactly two distinct Elements (A3) | Cascade | `ROOM_ELEMENTS` | `roller.expandMultiElement` | Result card shows both | assert exactly two, always |
| R14 | A repeat or nested Multi-Element becomes Expected (A4) | Exception | — | `roller.expandMultiElement` | Result card names the substitution | force a collision, assert Expected |
| R15 | Expectations follow face value, never the PC's wish | Compulsion | — | `guidance only` | `explain()` on the Area card + rules-library entry | the copy is present and marked guidance |
| R16 | Fortunate/Unfortunate use the obvious idea, else Discover Meaning | Permission | — | `roller.resolveElement` → prompt | Result card offers "I have an idea" / "Roll for it" | both branches reachable |
| R17 | Random rolls a keyword pair on a chosen Meaning table (A11) | Lookup + Permission | `ROOM_DESCRIPTORS`, `SOCK_DRAWER` | `roller.rollMeaningPair` | Table picker on the result card, naming B2's absent tables | a pair is returned from either table |
| R18 | Sock Drawer is a meaning table, rolled in pairs (A10) | Lookup | `SOCK_DRAWER` | `roller.rollMeaningPair` | Detail-roll control | doubles are kept, not re-rolled |
| R19 | One General Area roll per room (A1, A12) | Once-per-X | `ROOM_ELEMENTS` | `roller.searchGeneralArea` | Room sheet, its own card below the Areas | available at any budget, with no prerequisite |
| R20 | Room complete = every Area + the General Area rolled | Threshold | — | `derived.isComplete` | Persistent room header | the predicate flips on the last roll |
| R21 | Unsearched Areas leave the room *described, not searched* (A14) | Threshold | — | `derived.searchState` | Room header state label | a skipped Area yields the distinct state |
| R22 | No Conclusion Element — the room simply ends | Gate | — | `lifecycle.completeRoom` | Completion summary | no extra roll is offered at completion |
| R23 | Search all, some or none of the room | Permission | — | `lifecycle.completeRoom` | "Done with this room" always enabled | a room completes with zero searches |
| R24 | Hidden things need a task roll then a Fate Question | Substitution | — | `guidance only` (B1) | Prompt-and-record on the room sheet | the surface records an answer and cites B1 |
| R25 | Connected simple rooms may be treated as one room | Permission | — | `wizard.createRoom` | "This room covers several spaces" note field | the note persists on the room record |
| R26 | Place Areas where they seem most fitting | Permission | — | `sheet.reorderAreas` | Drag or move control on Area cards | order persists |
| R27 | A room may be any close space (cave, corridor, pool) | Permission | `ROOM_TYPES` (house aid) | `wizard.createRoom` | Room-type picker, free text allowed, house aid labelled | a free-text type is accepted |
| R28 | Chain rooms into a crawl | Permission | — | `lifecycle.nextRoom` | "Next room" from a completed room | the new room joins the same crawl in order |
| R29 | Dice are cryptographic, shown as faces, never silently re-rolled | — (template §5.1) | — | `core.d100` · `store.logRoll` | Every result card; distribution view | one action produces exactly one logged roll |
| R30 | House aids identify themselves wherever rolled | — (template §2.2) | `HOUSE_AID` | `ui.houseAidBadge` | Badge on every house-aid result | the badge renders on a room-type roll |

---

## 6. Data model (`localStorage`)

```
crawls/{crawlId}
  meta:   { name, createdAt, lastOpenedAt, note }
  rooms:  [roomId, ...]                       // explicit order — the crawl sequence

rooms/{roomId}
  crawlId, createdAt
  context:   { label, roomType, houseAidType: bool, genreNote, multiRoomNote }
  budget:    6 | 3
  keywords:  [ { n: 1..6, roll, word, use: "area" | "combined" | "dropped" } ]
  areas:     [ { id, name, fromKeywords: [n], order,
                 search: null | { roll, element, sub: [ {roll, element} ], meaning: [w,w]|null,
                                  note, ts } } ]
  generalArea: null | { roll, element, sub: [...], meaning: [w,w]|null, note, ts }
  encounter:   null | { asked: true, answer: "exYes"|"yes"|"no"|"exNo", note, ts }
  hidden:      [ { question, answer, note, ts } ]   // B1 stub records
  description: ""            // free text; embellishments, not Areas
  notes:       ""
  state:       { complete: bool }               // derived.isComplete, stored for list rendering

rollLog/{id}: { table, roll, result, crawlId, roomId, areaId|null, ts }   // capped ~200, paged
undo:         [ { label, snapshot, ts } ]                                  // one stack, any mutating action pushes
settings:     { theme, textScale, ... }
```

Rules: every rules number the schema references lives in the data files; every
schema addition ships a normalization path that back-fills defaults on old
records and **resets spent once-per-X flags in the same pass**; every field
addition is documented here in the same change; any shape change ships a
migration **and** a fixture test that loads a hand-written old-shape record.

---

## 7. Build roadmap

Build strictly in order. A phase is done when its features each satisfy §8.

**Phase 0 — Foundations** ☐
- ☐ Scaffold every file in §3; `node --check` gate wired first
- ☐ `data.js` complete and verified: T1 · T2 · T3 · T4 · T5 — *data before features*
- ☐ Theme (both palettes, system default, in-app toggle, text-size control)
- ☐ PWA shell: manifest, icon, service worker (app shell cached + versioned, navigation network-first), update toast — **and the update path tested**
- ☐ App shell: router, the template §6.2 frame, two-level nav, `localStorage`
- ☐ Crawl list + room list (P9)

**Phase 1 — Room Generation Wizard** ☐ — R1–R8, R25–R27
- ☐ Sequential keyword walk, one step per keyword, with interpret / combine / drop
- ☐ Budget picker (6 / 3), Area cap enforced, combination capped at two (A7)
- ☐ Room creation: label, room type (house-aid list + free text, badged), multi-room note
- ☐ Legality at every step; refusals cite the rule

**Phase 2 — Room Sheet** ☐ — R8, R20, R21, R26
- ☐ Description field, Area cards, ordering, notes
- ☐ Persistent room header: name · Areas searched N/M · General Area · budget
- ☐ JSON export/import in Settings; **read-aloud export**
- ☐ Persistence + normalization/migration + fixture test

**Phase 3 — Table Roller** ☐ — R9–R19, R29, R30
- ☐ `core.d100` on `crypto.getRandomValues`; faces shown; one action = one logged roll
- ☐ Element resolution with the Multi-Element cascade (A3/A4) and its cap
- ☐ Once-per-Area gate (A2) and General Area (A1/A12), both with cited refusals
- ☐ Sock Drawer pairs (A10); Random with table picker (A11) naming B2
- ☐ Encounter check (R9) and hidden-search (R24) prompt-and-record stubs, marked guidance
- ☐ Roll log: attributed, filterable, capped, paged, `aria-live` + distribution view
- ☐ Every automated surface links to its rules-library entry

**🏁 Milestone — First Room Playable** ☐
Create a crawl → generate a room → describe it → encounter check → search every
Area → General Area → complete → export, end to end, zero console errors,
rehearsed as a real session.

**Phase 4 — In-Play Systems** ☐ — R11–R12, R20–R23, R28
- ☐ Room lifecycle: completion summary, and **the boundary that clears the once-per flags** (R12 — watch D-17)
- ☐ Crawl boundaries: next room, finish crawl, both with summary + one-step undo
- ☐ General undo stack across every mutating action (§14.1.2)
- ☐ Repeat-roll affordance on result cards (§14.1.8)
- ☐ Data-integrity action in Settings: run normalization, report repairs (§14.1.9)

**Phase 5 — Teaching + tablet** ☐
- ☐ Rules library: accordion, in session order, search auto-opens matches (T6)
- ☐ `explain()` on every screen, collapsed by default (T7)
- ☐ Tutorial as its own route + neutral demo rooms (T8, T10)
- ☐ Tablet layout that **adds** density — keyword walk beside the room sheet (P8)

**Phase 6 — Hardening** ☐
- ☐ Harness A (parse gate + unit + table completeness), B (browser smoke), C (interaction audit), D (committed fixtures fresh/mid-crawl/stress + `probe-layout.mjs` + `probe-flow.mjs`)
- ☐ Accessibility pass; the §6.7 measurement contract
- ☐ Audit protocol run to **one complete seven-pass cycle with no finding**

---

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
9. **Scope guard.** Article content only. Nothing invented is presented as official; the room-type list is a labelled house aid, and the demo rooms are labelled house content.
10. **Reversibility is inventoried.** Every destructive action either undoes or confirms while naming the loss.

---

## 10. Changelog

| Date | Change | Why | Verification | Cache |
|---|---|---|---|---|
| 2026-09-11 | Distilled the source to `docs/room-crafter-rules.md` | Stage A ingestion | Both d100 tables verified by alphabetical monotonicity, 200/200 slots, no duplicates | — |
| 2026-09-11 | Stage A checkpoint written and signed off (`docs/STAGE-A-CHECKPOINT.md`) | Template §4.1 | Rulings A1–A15 approved as written | — |
| 2026-09-11 | Instantiated this spec: product decisions P1–P11, file tables, extraction ledger T1–T13, traceability ledger R1–R30, roadmap | Template §9 | Awaiting Stage C go-ahead | — |
