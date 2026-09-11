# Stage A → B Checkpoint — Room Crafter Player App

Template: *RPG Player-Character App — Autonomous Build Instructions v3*.
Source supplied: pasted transcription of **Mythic Magazine Vol. 69**, "Variations:
Single Room Explorations" (The Room Crafter), 12 pages. Distilled to
`docs/room-crafter-rules.md`.

**No application code has been written.** This document is the §4.1 sign-off.

---

## 0. The finding that reshapes the brief

**The supplied source is not an RPG.** It is a 12-page variation article for a
GM-emulator toolkit (Mythic GME 2e / The Location Crafter). It contains no
characters, attributes, dice resolution, damage, combat, advancement, inventory
or bestiary — and it says so explicitly ("The Room Crafter concerns the room
itself… It doesn't deal with encounters, such as NPCs").

Consequence: the template's mandatory scope (§1) — creation wizard, character
sheet, dice engine, bestiary, combat tracker, GM screen, party sync — cannot be
built as written without **inventing mechanics**, which §2 forbids. The scope
must be re-pointed at the entity this tool actually has: **the Room**.

Proposed mapping is §5 below. It needs your ratification because it deviates
from LOCKED scope.

---

## 1. System Profile (§3) — slot by slot

Absent slots are load-bearing findings, not omissions (§3.5).

| § | Slot | Finding |
|---|---|---|
| 3.0 | Rule shapes | See census, §2 |
| 3.1 | Core resolution | **No character resolution mechanic.** Only d100 table lookup. No success criteria, crits, fumbles, modifiers, advantage or push economy. Two cascade rules: Multi-Element expansion, and the keyword-combine loop |
| 3.2 | Opposed tests | Absent |
| 3.3 | Meta-currencies | Absent in this article. Adjacent: Mythic's Chaos Factor (1–9) — **external, not supplied** |
| 3.3a | Lose conditions | Absent |
| 3.4 | Attributes | **No PC entity.** The tracked entity is a Room (a "Region"). Its only "stats" are author-supplied Context: genre, room type, keyword budget |
| 3.5 | Derived stats | Exactly three: Area count (3–6 at 6 keywords; 2–3 at 3); total explorable Areas = Areas + 1 General Area (4–7, or 3–4); room-complete predicate |
| 3.6 | Skills | Absent. The article defers search tasks to "your chosen RPG's task mechanics" — an external hook (Substitution shape) |
| 3.7 | Creation options | Room creation: label, room type, Context, keyword budget (6 default / 3 crawl variant). **The step after the sheet is full:** the encounter check runs after description and before searching (§6.3.7 — this is the one every implementation would forget) |
| 3.8 | Group entity | Absent as a rule. A multi-room **Crawl** container is app scaffolding, proposed in §5, and must be labelled as such |
| 3.9 | Conditions | Absent |
| 3.10 | Health/damage/death | Absent |
| 3.10a | Archetype damage exceptions | N/A |
| 3.11 | Rest & recovery | Absent |
| 3.12 | Lifecycle | A **room** lifecycle only: enter → generate Areas → describe → encounter check → search Areas (one roll each) → General Area (one roll) → complete. No scenes, sessions, decay or resets. The boundary that clears the once-per flags is **new room** |
| 3.13 | Extended tasks | Absent. The keyword walk is a bounded wizard, not a progress clock |
| 3.14 | Powers | Absent |
| 3.14a | Rule-vs-dice abilities | N/A |
| 3.15 | Advancement | Absent |
| 3.16 | Inventory/wealth | Absent |
| 3.17 | Combat | Absent |
| 3.18 | Bestiary/NPCs | **Explicitly out of scope in the source.** No `data-monsters.js`, no `data-npcs.js` — reason recorded here per §6 |
| 3.19 | Pregens | None published. Three worked examples exist (two rooms, one sock drawer) but are narrative fiction — see ruling A13 |
| 3.20 | Solo rules | **Solo is not a conditional toggle here — it is the whole app.** The tool is a GM-less aid by construction. Its procedural framing (Fate Questions, Chaos Factor) lives in Mythic GME 2e: blocked, B1 |
| 3.21 | GM tables | The three d100 tables *are* the GM tables. There is no GM/player split to build a GM screen for (ruling A15) |
| 3.22 | Safety tools | Absent from the article |

---

## 2. Rule-shape census (§3.0) — what this app must be good at

| Shape | Count | Instances |
|---|---|---|
| **Permission** | **11** | interpret a single keyword freely · combine when it doesn't inspire · drop the final keyword · embellish beyond the Areas · search all, some or none of the room · treat connected rooms as one room · use 3 keywords instead of 6 · place Areas where they fit · choose which Meaning table Random uses · assign Odds yourself · use your own RPG's task mechanic |
| **Lookup** | 4 | Room Descriptors d100 · Sock Drawer d100 · Room Elements d100 · "Is there an encounter?" answer table |
| **Compulsion** | 3 | roll keywords one at a time, in order · Multi-Element collisions become Expected · base expectations on face value, never on what the PC wants |
| **Threshold** | 3 | keyword budget caps Area count at 6 · room-complete predicate · the 3-keyword variant's 2–3 Areas |
| **Substitution** | 3 | 3-keyword variant · multi-room-as-one-room · external task mechanic for hidden searches |
| **Cascade** | 2 | Multi-Element → exactly two distinct Elements · keyword-combine loop |
| **Once-per-X** | 2 | one Elements roll per Area · one General Area roll per room |
| **Gate** | 1 | no Conclusion Element — the room ends when Areas + General are done |
| **Exception** | 1 | the final keyword may be dropped; earlier ones may not |
| Modifier · Cost · Future cost · Escalation · Conversion · Blocker · Opposed | **0** | — |

**The honest summary:** this is a **Permission-and-Lookup system with zero
arithmetic**. Per §15's narrative row, that is the family where "almost
everything is a Permission shape… the app risks being a notepad." So the quality
bar is **prompting and record-keeping**, not maths: putting the right question in
front of the player at the moment the procedure reaches it, and holding the room
afterwards. Every Permission in the table above needs its own control (§13 D-22);
eleven of them is the build.

Second-order risk: the two Cascade rules and the two Once-per-X flags are the
only enforceable mechanics in the system, so they carry all of the §0 exposure.
D-16 (cascade as single shot) and D-17 (flag never cleared) are the two defects
this build is most likely to ship.

---

## 3. Content inventory

**Recovered and verified (207 rows):**

| Table | Rows | Target file | Consuming module |
|---|---|---|---|
| Room Descriptors Meaning | 100 | `data.js` | `roller.js` (generation), `rules.js` |
| Sock Drawer Meaning | 100 | `data.js` | `roller.js` (Random element, detail rolls) |
| Room Elements | 7 ranges / 100 | `data.js` | `roller.js` (search resolution) |
| "Is there an encounter?" | 3 answer bands | `data.js` | `roller.js`, `lifecycle.js` |
| Procedures (generation, search, General Area, hidden search, crawl) | 5 | `data.js` (rules-library entries) | `screens.js`, `wizard.js` |

**Table recovery note (§2.1).** Both d100 tables arrived de-interleaved by the
two-column PDF layout, but each number stayed adjacent to its own word, so there
is **no row-pairing ambiguity** — the usual unrecoverable case does not apply.
Recovery was verified by alphabetical monotonicity across each half (Room
Descriptors 1–50 Active→Large, 51–100 Ledge→Wrecked; Sock Drawer 1–50
Amusing→Mundane, 51–100 Musty→Yellow) with all 200 slots filled and no
duplicates. I consider these verified, not provisional. A page photo would still
be the cheapest confirmation if you have one.

**Blocked data (§4.1.3):**

| # | Missing | Source | What it blocks | To unblock |
|---|---|---|---|---|
| B1 | Fate Chart (Odds × Chaos Factor), Exceptional Yes/No thresholds | Mythic GME 2e — not supplied | Automating "Is there an encounter?" and "Is something hidden found?"; the Fortunate/Unfortunate fallback | Supply the Fate Chart page + Odds list |
| B2 | Meaning tables (Actions 1/2, Descriptions 1/2, Elements tables) | Mythic GME 2e — not supplied | **Random (81–95) — 15% of every search** — and every Discover Meaning path | Supply the Meaning-table pages you want loaded |
| B3 | Chaos Factor rules, Random Events | Mythic GME 2e — not supplied | Solo pacing framing (§3.20) | Supply, or drop from scope |
| B4 | Location Crafter Area Elements + Region/Progress Points | LC — not supplied | LC interop only; **not needed** for this app | Optional |

Until B1/B2 are unblocked, the affected surfaces ship as **prompt-and-record**
stubs (the app asks the question, you enter the answer, it logs it) rather than
as automation — and are marked `guidance only` in the traceability ledger per
§10.13. No UI is built against a blocked table.

---

## 4. ⚠ IP / repository status — needs your decision

`arti47/Room-Crafter` is currently **public**, and the two committed d100 tables
are verbatim keyword lists from a commercial magazine. Template §12: *"If the
source is a transcription of a commercial book, the repository stays private."*

Options: (a) flip the repo to private — the cleanest, and it keeps the tables
intact; (b) keep it public and remove the verbatim tables from the repo, loading
them from a local file you supply at install time. I have not changed visibility
— that is yours to set. Everything else in §12 I will hold to: no setting or
adventure content, effect text paraphrased, a licensing note in the README.

---

## 5. Proposals

**App name:** `Room Crafter` (default `<Game> Player` doesn't fit a GM-less aid).

**Scope re-point — mandatory scope (§1) mapped onto the Room entity.** This is
the deviation that needs ratifying:

| Template mandatory surface | Proposal |
|---|---|
| Creation wizard | **Room generation wizard** — the sequential keyword walk, one keyword per step, with interpret / combine / drop controls |
| Full in-play character sheet | **Room sheet** — description, Area cards with search state, General Area, encounter, notes |
| Native dice engine | **Table roller** — d100 over the three tables, crypto RNG, visible faces, never re-rolled silently (§5.1) |
| Persistent resource header | **Persistent room header** — room name · Areas searched N/M · General Area used/unused · keyword budget |
| Roll log | Kept as mandatory: every d100 with its table, room, Area and resulting Element, filterable, `aria-live`, with the distribution view (§5.1, §14.1.10) |
| JSON export/import | Kept as mandatory |
| Lifecycle engine | **Room lifecycle** (the once-per flag clearer) + **Crawl** boundaries, with confirmation summary and one-step undo |
| Rules library + per-screen `explain()` + tutorial | Kept as mandatory (library is small: ~8 entries) |
| Inventory & resources | **Omit** — the system has none |
| Bestiary / NPC compendium | **Omit** — explicitly out of scope in the source (§3.18) |
| Combat tracker | **Omit** — no combat rules exist |
| Firebase multiplayer party + shared combat | **Propose omit**, or reduce to a read-only shared crawl. A GM-less room oracle has no party state to sync. Local-first only; JSON export is the hand-off |
| GM screen | **Propose omit** — ruling A15 |
| Solo mode (conditional) | **Not a toggle — it is the app** |

**House aids (§2.2), proposed, each in its own file with `HOUSE_AID = true` and
labelled in the UI wherever rolled:**
- `data-house-roomtypes.js` — a room-type starter list (the article defines what a
  room *is* but supplies no table of them).
- Nothing else. Interpretation stays the player's job; a "suggested
  interpretation" generator would replace the one thing this tool exists to do.

**Theme:** the article's register is analogue-referee — proposed palette is ink on
warm paper for light, lamplit slate for dark, one accent for the signature
element (the keyword), one for danger-side Elements (Unfortunate). Light + dark,
system default, in-app override, plus the §14.1.5 text-size control.

**Backlog entries (§14) this game actually needs:** a **campaign list** — here
"many crawls", and cheap now, expensive later (§14.1.1, §14.2); **general undo**
(§14.1.2); **human-readable export** — a room description you can read aloud at
the table is arguably this app's primary output (§14.1.7); **repeat-roll**
(§14.1.8); **roll distribution** (§14.1.10). Not needed: character switcher,
named combatants, wake lock (a room takes two minutes), GM hand-off privacy.

---

## 6. Ambiguity rulings — confirm or correct

| # | Ambiguity | Proposed ruling |
|---|---|---|
| A1 | Does the General Area roll require the Areas to be searched first? | No prerequisite; always available, independently |
| A2 | Can an Area be searched twice? | No — "only roll once… for each Area" is a hard cap. The control disables and the refusal cites the rule (§6.4) |
| A3 | On Multi-Element, does the Multi-Element roll itself count as one of the two? | No. It expands into **exactly two** distinct Elements |
| A4 | Can a Multi-Element sub-roll chain into another Multi-Element? | No — a second Multi-Element becomes Expected, so the cascade always terminates at two |
| A5 | Is the cap six keywords or six Areas? | Both: the keyword budget *is* the Area cap. One keyword never yields two Areas |
| A6 | When two keywords combine, are both consumed? | Yes — hence the floor of three Areas from six keywords |
| A7 | May three or more keywords combine into one Area? | No, cap combinations at two. Allowing three would yield two Areas from six keywords, contradicting the book's stated 3–6 range |
| A8 | May any uninterpretable keyword be dropped, or only the last? | Only the final one. Earlier ones must be carried into a combination |
| A9 | When does the encounter check run? | After description, before searching; once per room; re-askable only on explicit request |
| A10 | Is Sock Drawer a meaning table or a content table (§2.2)? | Meaning table — rolled in pairs, doubles kept as amplification (the article rolls it in pairs) |
| A11 | Which Meaning table does a Random result use? | The player chooses. The app offers what is loaded and says plainly that Mythic's Actions/Descriptions tables are absent until supplied (B2) |
| A12 | Does a 3-keyword room still get a General Area? | Yes — always exactly one, at any budget |
| A13 | Ship the article's three worked examples as tutorial content? | **No** — they are setting/adventure fiction (§12). Ship neutral demo rooms, labelled house content |
| A14 | Is "room complete" reachable if the player skips searches? | Only Areas actually rolled count. A room with unsearched Areas shows as *described, not searched* — a distinct, legitimate state, not an incomplete one |
| A15 | Build a GM screen? | No. The tool is GM-less by construction; there is no second seat to serve. If you play with a GM who uses it, the whole app is already their screen |
| A16 | *(added after Stage B, when the owner supplied the source)* Which emulator resolves the Fate Questions the article defers? | **One-Page Mythic**, not Mythic GME 2e. It answers all three blocked surfaces, and it has **no Chaos Factor** — the odds row is the only input to the chart. That is a real difference from the engine the article assumes, taken deliberately: a chaos track is a campaign-pacing device and a room takes two minutes. Behind `Settings.useMythic`, on by default |

---

## 7. What I need from you

1. **Sign-off or corrections** on §5's scope re-point and §6's fifteen rulings.
2. **The repo-visibility decision** (§4).
3. **Blocked data:** whether Mythic GME 2e's Fate Chart and Meaning tables are
   coming. This is the single biggest fork in the roadmap — see the question
   asked alongside this document.

Then the seven standard §4.2 product questions, one at a time, and I write the
project `CLAUDE.md` (System Profile, Data Extraction Ledger, Rules Traceability
Ledger, roadmap) and stop for your Stage C go-ahead.
