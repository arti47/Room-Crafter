# RPG Player-Character App — Autonomous Build Instructions (v3)

> **To the AI receiving this file:** you have been given (1) this document and (2) a
> tabletop RPG rulebook in some form. Your task is to build a complete, installable
> player-character app for that game by executing the procedure below. The document is
> self-contained: the user does not fill anything in. **You** extract every game-specific
> fact from the rulebook, complete **one checkpoint + a short product Q&A**, then build
> the entire app autonomously.
>
> **Execution order:**
> 1. **Stage A — Ingest & Extract (§2, §3):** read the rulebook systematically and complete
>    the System Profile. Never substitute training-data memory for the rulebook.
> 2. **Stage B — Checkpoint + Product Q&A (§4):** present the System Profile summary,
>    content inventory, proposals, and ambiguity rulings for sign-off (**B.1**), then ask
>    the standard product-decision questions **one at a time** (**B.2**).
> 3. **Stage C — Build (§5–§9):** instantiate the project CLAUDE.md (including the **Data
>    Extraction Ledger**, §9.1) and build phase by phase, autonomously, under the process
>    rules in §10. After Stage B, ask the user questions **only** when the rulebook is
>    genuinely ambiguous on a rules point.
> 4. **Stage D — Audit to done (§11):** run the audit protocol until a full pass finds
>    nothing. This is not optional polish; in the reference builds it produced more than
>    half of the app's correctness.
>
> Everything marked **LOCKED** is proven architecture from fully built and rules-audited
> reference implementations — do not substitute or "improve" it.
> Everything marked **CONDITIONAL** is included only when the game actually has that
> subsystem; if the game lacks it, omit it entirely — never invent mechanics.

---

## 0. The one thing that goes wrong

Across reference builds, one defect class outnumbers every other combined:

> **Data is extracted faithfully, unit-tested, documented in the UI — and never called.**

A talent's effect sits in `data.js`. The sheet prints its name. The roller never reads it.
Everything looks finished and the rule does nothing. The same shape recurs as: a toggle that
sets a flag nothing reads; a constant imported and unused; a state field written and never
consumed; a modal that explains a cost the engine never charges.

Reading the code does not find these — you read the sentence in the UI and believe it.
**Mechanical scans find them in a minute** (§11.1). Build the scans early and run them every
pass. Everything else in this document is downstream of that lesson.

---

## 1. What you are building

| | |
|---|---|
| **Game** | The RPG in the supplied rulebook — core rules only (no setting/adventure content) |
| **Audience** | Players (player-facing tool with an opt-in GM screen — not a GM-first tool) |
| **Platforms** | Phone, browser, desktop — one installable PWA |
| **Core job** | Character **creation wizard** + full in-play **tracker** + native **dice engine** |
| **Multiplayer** | **Local-first by default**: single-device experience is built and playtested first; real-time shared party & combat sync is architected from day one but its build phase is gated behind the First Session Playable milestone (§9). The Stage B Q&A can promote it to the critical path. |
| **Backend** | Firebase Realtime Database + Storage; offline-capable; runs with no keys in local mode |
| **Theme** | Visual identity evoking the game's genre and trade-dress (proposed at checkpoint); light + dark, **default follows system** (`prefers-color-scheme`), in-app toggle overrides |

**Mandatory scope (every app, every game):** creation wizard · full in-play character
sheet · native dice engine · inventory & resources · **persistent resource/currency header
on every in-play screen** · **roll log** (every roll recorded with enough detail to
re-derive it, attributed to whoever rolled, filterable; `aria-live` announced) · **JSON
export/import backup** in Settings · **scene/session lifecycle engine** (the app owns
boundary events, with confirmation summary + one-step undo) · searchable rules library
(**every automated surface links to its rules-library entry**) · **per-screen "what this
does" note** (§6.6) · **first-session tutorial** (§6.6) · bestiary/NPC compendium · Firebase
multiplayer party with shared combat tracker (gated per above) · GM screen.
**Conditional:** solo mode (only if official solo rules exist) · expansion content (only
if expansion books are supplied; commitment tiers set at Stage B) · power/spell automation
(only if the game has such a subsystem) · shared group entity (only if the game has one —
§3.8).

---

## 2. Stage A — Rulebook ingestion

The rulebook may arrive in any form. Adapt:

- **PDF file(s):** read systematically cover-to-cover for the System Profile (skim
  fiction/setting chapters; read rules chapters closely). Record page numbers as you
  extract; cite them in data-file comments so the audit (§11) can re-check values fast.
- **Plain-text transcription of a PDF:** the most common real case, and the most dangerous.
  Transcription **de-interleaves multi-column tables**: a weapons table becomes a vertical
  list of names, then a vertical list of bonuses, then a vertical list of damages, with no
  reliable way to re-pair them. See §2.1.
- **Queryable notebook (e.g. NotebookLM):** first map the book's structure (query for the
  table of contents / chapter list), then extract section by section. Notebook answers are
  non-deterministic — corroborate any surprising value with a second, differently-phrased
  query before recording it. **A first-pass answer that summarizes a procedure is not the
  procedure** — for anything sequential (opposed tests, death, task resolution), ask for
  the EXACT step-by-step rule including edge cases (ties, who acts first, who banks
  leftover resources).
- **SRD / website URL:** crawl the section index first, then extract per section. Note
  that SRDs often omit content from the full book — tell the user at the checkpoint what
  the SRD does not cover.
- **Pasted text:** treat as authoritative for what it contains; list at the checkpoint
  everything the §3 profile needs that the text does not cover, and ask for those pages.
- **No digital source at all:** fall back to interviewing the user — walk the §3 slots in
  order, **one question at a time**, and record their answers as the source of record
  (flag at the checkpoint that values are user-supplied and unverified against a printing).

### 2.1 Source precedence and corrupted tables — **LOCKED**

Establish this order in the project CLAUDE.md on day one and never deviate:

> **page images > official character sheet > transcript/OCR text > third-party summary**

- A **third-party summary corroborates; it never decides.** Where transcript and summary
  disagree, request the page image rather than picking one. Where the summary is the *only*
  source for a value, mark the value provisional in the data file.
- **Never reconstruct a de-interleaved table from the transcript alone.** If a table's
  columns have been flattened into separate lists, the row alignment is unrecoverable and
  a plausible-looking reconstruction is worse than a blocked feature. Ask for a photo of
  the page. Record the block in a `TRANSCRIPT-ISSUES.md` alongside chapter line offsets,
  and **build no UI against a blocked table.**
- **Printed derived values lose to formulas.** Published pregens and sample characters
  contain arithmetic errors. When a pregen's printed Health disagrees with the game's own
  formula, the formula wins, and the discrepancy is recorded as a named erratum constant
  (`PREGEN_ERRATA`) with the page cited — never silently "corrected" and never silently
  copied. A regression test asserts the formula for every pregen and the erratum list for
  the exceptions.
- **Cite by line number, not page number**, when working from a transcript: page numbers
  survive in the text but drift against the real printing.

**Hard rules for extraction, regardless of form:**
- Every number, list, table, formula, and procedure in the app comes **from the supplied
  source**. If you cannot find a value, ask for it or mark the feature blocked — never
  fill gaps from memory of the game, even if you know it well. (Your memory of a game and
  its current printing routinely disagree; the printing wins.)
- **Extraction is complete, not sampled.** All spells, all monsters, all gear, all
  talents/feats in the core book go into the data files — the app is not done until the
  core book's every list is fully represented. For very large books, plan multiple
  data-extraction phases in the roadmap (§9), but completeness is non-negotiable.
- **Extract the guidance, not just the tables.** Solo principles, GM pacing advice, safety
  tools, "how to build a threat" checklists and per-archetype suggestions are content the
  app should surface. In reference builds these were extracted and then never shown — the
  same defect as §0, wearing a different coat.
- **Rules live in appendices, sidebars and stat blocks too.** A single guard-dog stat block
  in a bestiary appendix, a "minor NPCs use 2 in everything" line in a margin, a safety
  note before a table — these are rules with no chapter of their own and they are the ones
  a chapter-by-chapter sweep misses. Read the boxed text.
- **A permission the book grants is a feature.** "You may create a new talent", "you may
  reduce this alone", "either side may declare it over" — permissions read like flavour and
  are mechanics. Each one needs a control. If the app can only do the thing the book
  presents as the default path, it has quietly removed a rule.
- **Multiple books supplied:** the core rulebook populates `data.js`; each additional
  official book becomes its own `data-<name>.js` behind a content toggle, off by default
  (§8). The Stage B Q&A assigns each book a **commitment tier** (committed / stretch /
  dropped). Errata/revised versions of core content are canonical everywhere regardless
  of toggle.
- **Paraphrase, don't copy.** Extract numbers and mechanics; rewrite all effect and flavor
  text concisely in your own words. Never reproduce rules prose verbatim. Exclude setting,
  adventure, and art content entirely (see §12).

### 2.2 House aids — **LOCKED** if you build any

The book will be missing a table the book itself references, or one the app obviously needs
(name generators, a starting-point table for a journey). You may invent it, under rules:

- It lives in its **own file** (`data-<topic>.js`), never mixed into extracted data.
- It exports a `HOUSE_AID = true` flag and **the UI labels it as a house aid** wherever it
  is rolled.
- It contains **no setting content** — describe things by what they are, never by named
  places, people or brands from the setting.
- If it is an oracle/interpretation table, follow one published method and cite it; note
  in the project CLAUDE.md the distinction between **meaning tables** (single words, feed
  interpretation, keep doubles as amplification) and **content tables** (hand over a
  finished thing, draw distinct rows). Mixing the two produces tables that do neither job.

---

## 3. Stage A — System Profile to extract

Complete every slot below from the rulebook. The **archetype examples** exist so you map
unfamiliar systems honestly instead of forcing them into another game's shape — identify
which archetype (or novel shape) the game actually is, per slot.

### 3.0 Rule shapes — classify every rule before you extract it

The §3 slots ask *what subsystems the game has*. This section asks something orthogonal and
more useful for building: **what shape is each individual rule?** Games differ enormously in
their subsystems and barely at all in their rule shapes. Every audit finding in the
reference builds was a shape implemented wrongly, and each shape fails in its own
predictable way.

**Tag every rule you extract with its shape.** The tag decides where it lives, what its UI
must do, and which test proves it fires. A rule with no shape tag has not been understood
yet.

| Shape | It says | Examples across systems | Where it lives | How it fails silently | The test |
|---|---|---|---|---|---|
| **Modifier** | ±N to a roll under condition C | proficiency, advantage dice, a wound penalty, position/effect | `derived` — one function summing all active modifiers for a roll context | Rarely; the roller needs it to compile | Pool with and without C |
| **Threshold** | when X ≥ Y, state S | corruption ≥ humanity, stress ≥ composure, doom track full, XP to level | Pure predicate in `derived`, surfaced in the persistent header | The state is computed but nothing displays or acts on it | Assert the predicate flips at exactly the boundary |
| **Cost** | doing A spends B | spell slots, stress to push, momentum spend, ammo | The action's own function, before the effect | The dialog names the cost; the engine never deducts it | Resource before and after |
| **Future cost** | doing A spends a *later* resource | reaction costs your next turn, overwatch, holding an action, a spent reaction die | A flag consumed by the turn/round advance | **The commonest inert rule.** Prose says it in three places; nothing marks it | Advance a round, assert the actor is skipped |
| **Gate** | you may not do A while B | cannot cast in armor, cannot push while broken, no reaction while surprised | The action's legality check, not its UI | The button stays enabled and the rule lives in a tooltip | Attempt it under B, assert refusal |
| **Compulsion** | you must do A when B | must push, must attack the nearest, must take the worst result | Same place as the gate, inverted | Implemented as a suggestion | Assert the alternative is unavailable |
| **Substitution** | use A instead of B for C | intimidate on Strength not Charisma, a firearm in melee, an approach swap | An offer in the roller that rewrites the pool | Displayed on the sheet as text and never offered at the roll | Assert the swap changes the pool |
| **Cascade** | on A, do it again (up to N) | full auto, exploding dice, chain lightning, a failed control roll re-rolling worse | An explicit loop with a cap and a termination condition | Implemented once; the repetition is lost | Assert N iterations and the cap |
| **Escalation** | each occurrence is worse | doom clocks, rising DCs, stacking exhaustion, a countdown | The generic progress tracker (§3.13) | Two counters that disagree | Fire it N+1 times; assert it stops |
| **Once-per-X** | one use per scene/session/day | second wind, an escape roll, inspiration, a talent's single reroll | A flag set on use and **cleared by the lifecycle engine** | Set and never cleared, so it works once ever | Use, boundary, use again |
| **Conversion** | A becomes permanent B | temporary→permanent corruption, a scar, a lasting injury | The boundary that performs it, with its own roll | The temporary track decays and nothing is ever made permanent | Run the boundary; assert the permanent floor rises |
| **Blocker** | while B, no recovery of R | disease blocks healing, hunger blocks it, cold blocks it | The recovery function, reading a flag | The flag has no setter, so the blocker never engages | Set B; assert recovery does nothing |
| **Opposed** | both sides roll, one wins | attack vs defense, social conflict, a chase | One resolver with the tie rule and the margin rule | The tie case; the loser's banked resources | Both win/lose/tie branches |
| **Lookup** | roll on this table | crits, injuries, oracles, encounters | Data file + one range-lookup helper | Rows unreachable at the edges of the range | Every roll in range returns a row |
| **Permission** | you may invent/declare/choose | invent a talent, declare a stunt, name a consequence | A control, not a sentence | It reads as flavour and gets no UI | Assert the control exists and persists its result |
| **Exception** | archetype Z ignores rule R | a construct that does not heal, an undead that ignores morale | A branch in every function R touches | The common path works; the exception is not branched everywhere | Assert Z's behaviour in each of R's call sites |

**How to use this in practice**

1. As you extract, write the shape tag beside every rule in the traceability ledger
   (§9.1a). The ledger's Engine column then follows from the shape — you are not inventing
   a home for each rule, you are applying the pattern.
2. **Count your shapes at the checkpoint.** A game with forty Cost rules and no Future-cost
   rules has a different risk profile from one with six Compulsions. Tell the user which
   shapes dominate; that is the honest summary of what the app must be good at.
3. **Audit by shape, not by chapter.** "Show me every Future-cost rule and where it is
   enforced" finds in one pass what reading chapter by chapter misses across three.
4. When a rule does not fit a shape, that is a finding about the *rule*, not the taxonomy —
   look harder at the text, because you have probably summarised a procedure (§2).

**3.1 Core resolution mechanic.** The dice mechanic, success criteria, crit/fumble rules,
modifier model, the advantage mechanism, and the push/re-roll economy (with its costs and
legality limits) if one exists. **Flag every rule that repeats itself** — "on a hit you may
fire again", "if that fails, roll again at +2", "further damage restarts the count". These
cascade rules are implemented as single shots by default and the repetition is silently
lost; each one needs an explicit loop with its own termination condition and cap.
*Archetypes:* roll-under d20/d100 (Call of Cthulhu, RuneQuest — natural extremes
crit/fumble; advantage = roll extra dice, keep best/worst); d20+modifier vs DC
(D&D/Pathfinder — advantage = 2d20-keep, scaling proficiency); 2d6+stat tiered outcomes
(PbtA — 10+/7–9/6−, moves carry outcome text, no GM rolls); dice pool counting successes
(Year Zero/WoD/Blades — push with a cost, complications on specific faces); 2d20 target
number (Modiphius — pool 2–5 d20s, roll under skill+attribute, buy dice with
meta-currency, no push but a spendable conviction resource).

**3.2 Opposed / contested test procedure.** The EXACT sequence when two characters roll
against each other: who rolls first, whether one side's result sets the other's target,
the tie rule, and who banks leftover resources on a win or loss. Do not summarize this
slot from a general description — first-pass extraction routinely gets opposed tests
wrong. *Archetypes:* simultaneous roll-and-compare (highest margin wins); defender-first
(defender's successes become the attacker's difficulty; tie often favors the active
character); static defense (defender contributes a number, never rolls).

**3.3 Meta-currencies & shared pools.** Every table-level or character-level currency
outside the character's printed stats: name, who holds it (personal / group-shared / GM
mirror), how it is earned, **every legal spend with exact cost**, the **pool cap**, and
any **decay/reset schedule** (per scene, session, adventure). The GM's mirror economy (if
one exists) is extracted with the same rigor. *Archetypes:* Momentum/Threat (2d20);
Fate/Fortune points; Bennies; Inspiration; Stress/Trauma as spendable; Darkness Points.

**3.3a Currency interactions and lose conditions.** Where two tracked numbers are compared
to produce a state (addiction ≥ willpower, corruption ≥ humanity, stress ≥ composure),
record the comparison as a first-class rule. These are the game's real stakes, they belong
in the persistent header, and their **resolution paths** (who can end the state, at what
cost, and any once-per talent that grants an escape roll) are part of the slot.

**3.4 Attributes & scales.** Attribute list, value ranges, and every legal generation
method (rolled, array, point-buy, playbook-fixed) with its exact procedure. Note: some
games have **no classic attributes** (skill+drive, approach-based, playbook-only) — record
the real shape, and note that two §3 slots may merge when the game genuinely fuses them.

**3.5 Derived stats.** Every derived value and its **exact formula including rounding** —
HP/wounds, defenses, speed, carry limit, damage bonuses, initiative, saves, resource
maxima. These formulas drive the wizard and the sheet; they live in the data layer or a
pure rules module, never inline in UI code. If the game derives almost nothing (target
number = stat A + stat B and that's all), record that explicitly — a near-empty slot is a
valid, load-bearing finding.

**3.6 Skills / proficiencies.** The full list with governing attributes, trained/untrained
rules, and value derivation. If the game has no skill list, this slot is the move list /
action-rating list instead. Include specialization mechanisms (focuses, specialties,
expert dice) and exactly what they change (crit range, extra dice, re-rolls).

**3.7 Creation options.** Every choice character creation offers, in rule-legal order —
species/ancestry (+ innate abilities), class/profession/playbook (+ starting skills, gear,
features), faction/template picks (+ mandatory selections), age/background/experience
tiers (+ modifiers), starting power/feat picks. For each: what it grants, what it
constrains, what makes the result legal. **Record the creation steps that happen after the
character sheet is full** — the party's shared entity, the destination, the relationships
between characters. They are the ones every implementation forgets (§6.3.7, "the next step is named").

**3.8 Shared group entity — CONDITIONAL.** If the game has a party-level entity (noble
House, crew, ship, warband, covenant, colony, caravan): its **own creation wizard** (steps,
stat arrays, domain/asset choices), its stats and resources, how characters interact with
it mechanically (roles, using its stats in tests, spending its wealth), and **who may edit
it in play**. In multiplayer it is campaign-level shared state, not a character field.
*Archetypes:* Dune House (skill arrays by tier, domains → wealth); Blades crew (playbook,
rep, turf); Traveller ship (mortgage, roles); Ars Magica covenant.

**3.9 Conditions & statuses.** The condition list, causes, exact mechanical effects, and
removal rules. In the app, a condition **auto-applies** its effect to the rolls it touches
— a checkbox with no mechanical teeth is not done. Record **conditions that rewrite the
engine's own rules** (cannot push / must push / cannot be healed by X / cannot benefit
from the group) separately from dice modifiers: these need machine-readable rule keys, a
documented **conflict-resolution order** when two contradict, and their own tests. If the
game has no fixed list (complications create ad-hoc negative traits), record the
trait-creation and removal economy instead.

**3.10 Health, damage & death.** The damage model (HP, wound levels, harm/stress tracks,
**or defeat/progress tracks with no HP at all**), armor/soak (or difficulty-based defense),
and the **exact dying/death procedure** step by step, including every escape hatch
(resist-defeat, death saves, trauma-out) and its once-per-X limits. The death procedure
gets a dedicated guided UI — it is the highest-stakes moment in play and must be
impossible to run wrong. **Record what happens on each terminal outcome**: surviving often
triggers a lasting-injury roll, dying often triggers a new character. Both are part of the
procedure and both get an onward route in the UI (§6.3.6).

**3.10a Archetype exceptions to the damage model — CONDITIONAL.** Some games publish a
class that takes damage under different rules entirely (a machine body, an incorporeal
being, a possessing spirit). Extract every exception it makes to §3.10, §3.11 and §3.16 as
a named rule set, and note that the app must branch on it everywhere — the vitals label,
the death procedure, rest, injuries, inventory, currency. Reference builds have shipped
this archetype as flesh-and-blood four separate times before catching it.

**3.11 Rest & recovery.** Each rest type, duration, what it restores, and its usage
limits. Once-per-X limits are rules — the app enforces them. Include recovery of
narrative resources (crossed-out beliefs/drives, stress, corruption), not just physical
wounds, and record **what blocks recovery** (hunger, cold, disease, sleeplessness) — those
blockers imply background procedures the lifecycle engine must actually run (§3.12).

**3.12 Scene / session / adventure lifecycle.** What the game defines as a scene, session,
downtime, and adventure — and **exactly what happens at each boundary**: pool decay,
temporary asset/effect expiry, per-scene flags resetting, start-of-adventure resource
resets, end-of-session XP procedures. **The app owns these events**: explicit End
Scene / End Session / End Adventure controls that fire the whole bundle, with a
confirmation summary and one-step undo. Also record the **environmental checks that run on
a boundary** (exposure, starvation, thirst, sleep, disease progression, addiction decay);
each is a roll the app makes, not a note the player reads. If the game has no such
structure, record that.

**3.13 Extended / progress tasks.** The game's mechanism for efforts spanning multiple
rolls: extended tests, skill challenges, progress clocks, research projects. The exact
procedure — what a roll contributes, what modifies contribution, complication effects,
multiple contributors — and everything in the book that runs on it (death tracks, healing,
crafting, journeys). Build **one generic tracker component** reused by all of them.

**3.14 Powers / magic / special abilities — CONDITIONAL.** Power lists by school/class/
sphere, the activation roll, resource costs, boost/upcast options, failure/mishap tables,
preparation rules, restrictions (e.g. armor prohibitions), and any power subsystems
(summons, familiars, crafting, corruption). The bar is "tap to cast": activating a power
deducts its cost, rolls the right check, and resolves crits/mishaps from the game's real
tables. **If powers are implemented as talents/feats with embedded mechanics rather than
a subsystem, there is no separate power module — but every talent with a dice effect must
still be automated in the roller ("tap to use"), never merely displayed.**

**3.14a Abilities that change a rule rather than a die count.** Classify every ability as
`dice` (adds/removes dice — the roller wires these naturally) or `rule` (changes what is
legal, substitutes one attribute for another, grants an extra roll, alters a cost). **The
`rule` ones are the ones that ship inert**, because nothing in the roller needs them to
compile. Each requires: a machine-readable key, a named home in a specific module, and a
test asserting it fires. Include the game's permission to **invent** an ability if it
grants one — that is a feature, not flavour text.

**3.15 Advancement.** The exact advancement loop — XP thresholds, marks-and-session-end
procedures, milestones, playbook advances, **cost formulas and any one-advance-per-X
gates** — plus identity mechanics that interact with it (weakness/drive/bond/ambition).
Automate earning, spending/rolling, and consequences (new features at thresholds), and
carry the ability descriptions into the picker: a list of forty bare names is not a
choice.

**3.16 Inventory, encumbrance & wealth.** The game's *actual* carrying model (slots,
weight, abstract load, **or abstract assets with a permanent-asset cap**), equipped-gear
exemptions, currency denominations and coin weight (or an abstract wealth index and its
price ladder), stackables, durability/quality ratings. Over-limit consequences are
enforced, not just warned. Record the **repair path** for anything that degrades — a
degradable item with no way back is a dead end the audit will find later.

**3.17 Combat structure.** Initiative method (cards, rolls, side-based, popcorn,
alternating with seize/keep-initiative economics), the action economy per turn, movement
rules (grid, zones — physical or abstract), reactions (parry/dodge/opportunity) **and what
a reaction costs**, monster/NPC activation rules including multi-attack/ferocity, and
**whether multiple conflict scales share one engine** (dueling/skirmish/warfare; social
conflict as combat). Include any dual play scale (personal vs organization-level actions,
physical vs virtual realm) and what stats each scale uses, plus what happens to a character
who is acting in the other scale when attacked.

**3.18 Bestiary & NPCs.** Every monster/adversary stat block in the book, including
attack tables and attacks-per-turn; NPC archetypes; animals; **the NPC tier system**
(minion/notable/major build recipes) if one exists; which creatures are deliberately
unstatted forces of nature (record the fact — do not invent stats). Animals and minor
NPCs are stat blocks too: they belong in the same lookup the combat tracker uses, or they
will be extracted and unreachable.

**3.19 Pre-generated characters — CONDITIONAL.** If the book publishes pregens — or
sanctions playing its iconic NPCs — extract them fully for one-tap instantiation, and
record which rules economy they run on (PC rules vs NPC rules) as a checkpoint ruling.
Validate every printed derived value against §3.5 (see §2.1 on errata).

**3.20 Solo rules — CONDITIONAL.** Official solo oracle/tables/procedures only. If the
book has none, there is no solo tab — do not invent one. Extract the solo chapter's
**procedural framing** as well as its tables: how many characters the mode assumes, whether
a spotlight rotates between them, what the pacing device is (a deck, a clock, a countdown)
and the rule that governs when it resets.

**3.21 GM tables.** Fumble tables, fear/horror tables, random encounters, travel mishaps,
story/adventure generators, enemy generators — whatever rollable tables the book gives a
GM; these power the GM screen's reference panel.

**3.22 Safety tools.** Whatever the book recommends (lines and veils, an X-card, a debrief,
consent around specific content) and any rules the book explicitly gates behind table
agreement. These belong in Settings, before play, next to the toggle for the gated rules —
not in a document nobody opens.

---

## 4. Stage B — Checkpoint + Product Q&A

### 4.1 The Checkpoint (one sign-off)

Before writing any application code, present a single, readable summary containing:

1. **System Profile digest** — each §3 slot in 1–3 sentences with the key numbers (e.g.
   "Resolution: roll-under d20 vs skill; nat 1 crit / nat 20 fumble; boons/banes =
   extra d20 keep best/worst; push = re-roll once, take a condition").
2. **Content inventory** — counts per category (skills, powers, monsters, gear, pregens…)
   so the user sees the extraction scale, plus anything the source did not cover.
2a. **Rule-shape census** (§3.0) — how many rules of each shape the game has. This is the
   honest statement of what the app must be good at, and it predicts where the audit will
   find things: a game dense in Future-cost and Compulsion rules needs a strict engine, one
   dense in Permission rules needs good prompts and will feel thin if you only build maths.
3. **Blocked data** — every table you could not recover (§2.1), what you need to unblock it
   (usually a photo of one page), and which features are held back until then.
4. **Proposals** (defaults below — present your concrete choices):
   - **App name:** default `<Game> Player`.
   - **Visual theme:** a palette/typography direction that evokes the game's genre and
     trade-dress **without copying its art or logos** (parchment/ink for a fantasy game,
     terminal-green for cyberpunk, etc.); light/dark with system-default.
   - **Rules-vs-setting boundary:** which chapters you are including vs excluding.
   - **Expansions detected** with proposed commitment tiers; **solo mode** present or
     absent; **group entity** present or absent.
5. **Ambiguity list** — every rules point where the book was unclear, with your proposed
   ruling for each. The user confirms or corrects; rulings get recorded in the project
   CLAUDE.md with a stable ruling id (`A1`, `A2`…) so later work can cite them.

### 4.2 The Product Q&A (standard, one question at a time)

After checkpoint sign-off, ask these **one at a time** (adapt wording to the game; skip
any the user already answered; add game-specific levers you discovered). Record all
answers as **§1.1 Product Decisions** in the project CLAUDE.md, and instantiate the
roadmap to match:

1. **Usage mode** — full shared campaign / local-first with sync later (default) /
   single-device only. Sets Phase 5's gate.
2. **User's seat** — GM / player / rotates. Sets GM-screen priority.
3. **Dice input** — digital-only / digital + manual physical-dice entry / manual-first.
   Shapes the roller. (Manual entry is **two-stage** for any push economy: enter the
   initial dice, then only the re-rolled ones. A single total cannot tell the engine what
   the push cost.)
4. **Expansion commitment** — which supplied books are committed vs stretch vs dropped.
5. **Table device** — phone / tablet / desktop / mixed. Tunes layout effort (baseline
   stays phone-first regardless).
6. **Theme default** — follow system (default) / always dark / always light.
7. **One campaign or many** — a local campaign list, or one game at a time (§14.2). Cheap
   on day one, expensive once every module assumes there is exactly one.

After the Q&A, build autonomously to completion. Ask further questions **only** for
newly discovered rules ambiguities — never for permission to continue.

---

## 5. Architecture — **LOCKED**

- **No build step.** Vanilla JS, native ES modules loaded directly by the browser
  (`<script type="module" src="src/main.js">`). Clone-and-run must always work.
- **Installable PWA:** `manifest.json`, `service-worker.js`, an SVG icon, and an in-app
  "Update available — reload" toast when the service worker detects new code.
  **Mix strategies by request type**: the app shell and data files are versioned and cached
  (`CACHE_VERSION` bumped on any shipped-file change, §10.7); navigation requests are
  network-first with a cache fallback so a stale shell never outlives a deploy. The two
  failure modes are equal and opposite — cache too eagerly and the app becomes a museum of
  last month's rules; cache too little and it is useless in the basement where the game is
  actually played. **Test the update path explicitly**: load, deploy a change, reload, assert
  the toast appears and that accepting it yields the new version. It is the one PWA behaviour
  that cannot be verified by looking at the running app, and the reference build never
  tested it.
- **Storage modes:** `localStorage` **local-only mode** works with zero configuration;
  dropping real keys into `firebase-config.js` (clearly marked placeholder block +
  `FIREBASE_ENABLED` flag) switches on cloud sync. Never commit real keys.
- **Firebase:** Realtime Database (bandwidth-priced, low-latency — right for hundreds of
  tiny HP/condition writes) + Storage for portraits (client-side canvas compression to
  ~400px before upload).
- **Auth:** instant anonymous launch, no login wall; optional Google account linking in
  Settings for cross-device backup.
- **Roles from day one:** `members/{uid}.role: "player" | "gm"` in the schema **and** in
  `database.rules.json` (players read/write own sheet + shared combat; GM reads/writes
  all) — so the GM screen needs zero migration. If a shared group entity exists (§3.8),
  its write rules (GM + designated role) are in the schema from day one too.
- **Campaigns:** memorable fantasy-phrase join codes (e.g. `red-dragon-sword`).
- **Themed UI primitives:** no native `alert/confirm/prompt` — a shared `modal()` +
  `showToast/confirmModal/promptModal`, accessible (focus trap, Escape, `aria-modal`,
  focus restore) and sized to the visual viewport (mobile-toolbar safe). **Modal actions
  are ordered primary-first, consistently, everywhere.**
- **Null-safe DOM helpers.** The element factory skips nullish children so
  `el("div", {}, maybe && node)` is safe. Provide a matching `add(parent, ...children)`
  helper and use it for **every** append of a value that can be null — a bare
  `node.append(null)` renders the literal text `null` into the page (§13, D-1).
- **Accessibility:** keyboard + screen-reader usable — `aria-live` roll results and
  vitals, labeled icon-only buttons (**including checkboxes**, which the layout harness
  measures), `aria-current` nav.
- **Responsive:** phone-first; zero horizontal overflow at 320, 360 and 390px on every
  screen, in a realistic mid-campaign state (§11.2.6).


### 5.1 Trust and ownership — **LOCKED**

Two things a table will not forgive: dice it does not believe, and a character it cannot get
back. Both are architecture, not polish.

**The dice must be defensible.**
- **Use a cryptographic source, not `Math.random()`.** `crypto.getRandomValues` is available
  everywhere the app runs and costs nothing. `Math.random()` is unseeded, unspecified across
  engines, and — the part that matters at a table — indefensible when somebody asks. The
  reference build shipped `Math.random()` and had no answer.
- **Show the dice, not the total.** Every roll displays its individual faces, which side of
  the pool each came from, and what modified it. A result the player cannot reconstruct is a
  result they will re-roll by hand.
- **The roll log is the fairness record**, which is a second reason it is mandatory (§1).
  Give it a distribution view — counts per face across the campaign — so a suspicious table
  can check the app instead of arguing about it. It costs an afternoon and settles the
  question permanently.
- **Manual entry is a trust feature, not just an input mode.** A table that prefers physical
  dice should still get every other part of the app. That is why §4.2 asks; "manual-first"
  is a legitimate answer, not a degraded one.
- **Never re-roll silently.** If any path can produce a second roll for one action — a
  re-render, a double tap, a retry — the log will show it and trust evaporates. Roll once,
  store it, render from the stored value.

**The data must outlive the app.** The local-first ideals are the standard — no spinners,
multi-device, offline, collaboration, longevity, privacy, user control — and **longevity and
user control are the two this template holds itself to**:
- Storage is **plain JSON**, exportable and re-importable in one tap, in a format a human can
  read and a script can process. No proprietary container, nothing that needs the app to be
  interpreted.
- **The export is a supported feature, not a debug hatch.** It is tested, it round-trips, and
  its shape is documented in the project CLAUDE.md. A character sheet the player cannot take
  with them is a rental.
- **Be honest about the cloud phase.** Firebase RTDB is a centralised store with
  last-write-wins semantics. It delivers offline and multi-device; it does not deliver
  longevity, privacy from the provider, or conflict-free collaboration. Say so in the README
  rather than using "local-first" as a marketing word. If real collaboration matters more
  than shipping speed, that is a CRDT decision to take deliberately at Stage B — not one to
  discover during Phase 5.

---

## 6. File structure — **LOCKED**

| File | Purpose |
|---|---|
| `index.html` | App shell: header, persistent resource header, bottom nav, screen mount, module entry |
| `styles.css` | Game theme (light + dark) + all component styles |
| `data.js` | **Core rules library** — every §3 list/table/formula from the core book |
| `data-<expansion>.js` | One file per supplied expansion, behind its toggle (CONDITIONAL) |
| `data-monsters.js` | Bestiary stat blocks incl. attack tables & attacks-per-turn (omit if the game has no monster bestiary — record why) |
| `data-npcs.js` | Humanoid NPCs / archetypes / animals / NPC tier recipes |
| `data-pregens.js` | Published pre-generated characters + `*_ERRATA` (CONDITIONAL) |
| `data-solo.js` | Official solo tables (CONDITIONAL) |
| `data-<houseaid>.js` | Invented tables, `HOUSE_AID = true` (§2.2, CONDITIONAL) |
| `firebase-config.js` | Placeholder config + `FIREBASE_ENABLED` flag |
| `database.rules.json` | RTDB security rules (player/GM roles; group-entity write rules) |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA |
| `tests/` + `package.json` | Dev-only harnesses (§11.1); dev-only `playwright-core`; `node_modules` gitignored; not in the SW app shell |
| `README.md` | Setup incl. Firebase steps + the personal-use licensing note (§12) |
| `CLAUDE.md` | This document, instantiated (§9) — the project's living canonical spec |
| `docs/rules/` | Distilled per-subsystem reference, one file per chapter — the audit reads these against the engine (§11.2) |
| `docs/AUDIT.md` | Numbered findings, pass by pass, with the verified-clean list |

### 6.1 `src/` module map — **LOCKED** responsibilities

One module per responsibility; explicit `import`/`export`, nothing smuggled through
`window`. Runtime cycles (sheet ↔ roller ↔ combat) are safe under ESM live bindings.

| Module | Responsibility |
|---|---|
| `core.js` | Foundational constants, DOM/util helpers (incl. the null-safe `add`), raw dice functions. No imports. |
| `ui.js` | Themed modals/toasts/confirm/prompt, the collapsible **explain()** note (§6.6), and the pinned **actionBar()** (§6.2). |
| `rules.js` | Pure rules lookups over the data libraries. Lookups that can resolve a **character-owned** entry (an invented ability) take the character as an optional second argument. |
| `derived.js` | Character-derived calculations (effective maxima, encumbrance, equipped gear, condition modifiers, rule-conflict resolution, data normalization/migration). |
| `settings.js` | Feature/content toggles (expansions, solo, GM screen, advanced automation). |
| `store.js` | Local/cloud character (+ group entity) persistence + combat mirroring + JSON export/import + the roll log (attributed at write time). |
| `sync.js` | Firebase auth, campaigns, join codes, presence + theme. |
| `wizard.js` | Creation wizard (+ group-entity wizard, §3.8) + pregens. |
| `roller.js` | The dice engine: every roll type, opposed-test sequence (§3.2), meta-currency spends (§3.3), push flows, ability-embedded automation, damage applier, **roll-log writes**. |
| `sheet.js` | The full character sheet + all in-play tracking UI + persistent resource header. |
| `combat.js` | Shared combat tracker: initiative, turn state, turn-order derivation, combatant cards, generic progress-task tracker (§3.13). |
| `lifecycle.js` | Scene/session/adventure boundaries (§3.12), rest, environmental checks, advancement debrief (§3.15). |
| `power-automation.js` | Automated power/spell resolution — CONDITIONAL on §3.14 being a true subsystem. |
| `solo.js` | Solo assistant — CONDITIONAL on §3.20. |
| `gm.js` | GM dashboard. |
| `screens.js` | Top-level screen renderers (home/rules/settings) + roll-log view. |
| `tutorial.js` | First-session walkthrough. |
| `router.js` | Bottom-nav routing, **section nav** (§6.3.1), conditional tab gating. |
| `main.js` | Entry point / boot. |

When adding or moving a `src/` file: update the project CLAUDE.md's file tables **and**
the service-worker app-shell list, then bump `CACHE_VERSION` — in the same change.

### 6.2 Screen anatomy — **LOCKED**

Design for the real situation: a phone held in one hand, at arm's length, on a dim table,
by someone mid-conversation who has three seconds of attention to spare. Everything below
follows from that.

Every screen sits inside the same frame. Four regions are fixed; only one scrolls.

```
┌──────────────────────────────┐
│ app header  (brand · theme)  │  sticky, ~52px
├──────────────────────────────┤
│ resource header (vitals)     │  sticky under it, shown on in-play screens
├──────────────────────────────┤
│ section nav  (pill row)      │  first thing inside the scroll area
│                              │
│ screen content  ← scrolls    │
│                              │
├──────────────────────────────┤
│ action bar  (primary action) │  fixed above the tab bar, when the screen has one
├──────────────────────────────┤
│ tab bar  (4–6 tabs)          │  fixed, safe-area padded
└──────────────────────────────┘
```

**The contract:**
- The body carries bottom padding of `tab-bar height + safe-area + gap`, so the last
  control is never half-hidden. The action bar adds its own **spacer element**, returned
  together with the bar by one helper so a caller cannot forget it.
- The resource header is **sticky under the app header**, not part of the scroll: the two
  or three numbers that decide every choice in the game stay visible while you read
  anything else. It follows whoever is currently in context — the Traveler whose sheet is
  open, or the one selected on the dice screen.
- **Colour is reserved for meaning.** Pick one palette family for the game's mood and spend
  colour only on semantics: one hue for damage and loss, one for the game's signature
  resource, danger states also carrying text so colour is never the sole channel.
- **Zoom is off** (`user-scalable=no`, `maximum-scale=1`, `touch-action: manipulation`) and
  every input is ≥16px so mobile browsers do not zoom on focus. A stray pinch mid-roll is
  only ever a nuisance in a play aid. **This is an accessibility trade-off and it incurs a
  debt: pinch-zoom is how low-vision users cope.** Pay it back with a text-size control in
  Settings that scales the app's own type (a root font-size multiplier, persisted with the
  theme). Locking zoom without offering that is a regression for the players who need it
  most — the reference build shipped the lock and never built the control.
- **Reduced motion honoured**; no animation carries information.

### 6.3 Placing controls — gameplay flow — **LOCKED**

Layout is a rules question, not a taste question: the app should read like the game's own
sequence of play.

1. **Two-level navigation.** The bottom tab bar holds 4–6 tabs. **Any tab that owns more
   than one route carries a section nav** — a horizontally scrolling pill row at the top of
   every screen in that group, listing its siblings and marking the current one. Without
   it, routes beyond the first are reachable only from a link buried at the foot of another
   screen; in the reference build twelve of eighteen routes were in that state. Screens you
   go *into* rather than flick between (the wizard, a character sheet) are excluded.
2. **The primary action is above the fold, always.** The one control a screen exists for —
   Roll, End Shift, Next — never sits below the viewport on a phone. Where the content is
   long, pin the action in the bar, carrying its own context: the pool size, the current
   shift and day, the step number and name. **The layout harness asserts this per screen**
   (§11.2.5).
3. **Order controls by the sequence of play, and say so.** A screen that hosts a procedure
   presents its controls in the order the book performs them, in numbered phases with a
   line each on what the phase is for — *1 Before you set out · 2 On the road · 3 Arriving ·
   4 Playing the scene · 5 Turning the screw · 6 Ending it*. An unordered row of twelve
   buttons is a reference card, not a play aid. Phases used once (prep, wrap-up) fold away;
   the ones used every scene stay open.
4. **Frequency decides height.** On any screen, order blocks by how often they are touched
   in play, not by how the rulebook chapters them. On a character sheet that means: vitals,
   then the actions you take mid-scene (roll, take damage, resist), then conditions and
   gear, then the identity fields written once at creation. Reference before action is the
   most common layout mistake and the easiest to measure.
5. **In-scene before between-scene.** Within a subsystem, the rolls made during a scene
   come before the repairs, resupply and bookkeeping done between them.
6. **Every screen leads somewhere.** A screen that ends a procedure offers the next one the
   rules call for. A GM screen links to the dice and the tracker; a solo scene links to
   combat when it turns violent; a stabilized character is offered the injury roll; a dead
   one is offered the wizard. **A terminal outcome with no onward route** — a modal that
   says "you survived" and stops — leaves the player to remember a screen they have never
   opened.
7. **The next step is named.** Where the game's own procedure continues past the current
   screen (creation ends, but the party still needs a destination, a vehicle and
   relationships), the home screen names the next step until the group is ready to play.
   Otherwise a party sits looking finished with the game's Hope economy switched off.
8. **Live state travels.** State that changes what to do next — a fight in progress, a
   countdown running, a character dying — is shown wherever you are, as a badge on the
   section nav. State visible only on the screen that owns it is state nobody sees.
9. **No dead ends and no re-entry.** If tapping through to another screen is part of a
   flow (attack from the combat tracker → dice screen), the destination shows what it is
   part of and offers the way back. Never make the player re-type a number the app already
   knows.
10. **Tap targets: 44px where you can, 24px and spacing where you cannot.** WCAG 2.2 SC
    2.5.8 (AA) sets the floor at **24×24 CSS px**, with an explicit exception when targets
    are separated by 24px of offset; Apple's HIG asks 44pt and Material 48dp. Design to 44,
    fall back to 24-plus-spacing for genuinely dense rows (a stat block, a d66 table), and
    never below. A checkbox renders at ~13px unless styled: wrap every option row in a
    `<label>` so the whole row is the target, and never let an inline style override the
    stylesheet. **The harness measures the label, not the box.**
11. **Vertical position follows frequency, and the bottom is prime.** About half of phone
    use is one-handed, and the thumb's comfortable arc covers the bottom and centre; the top
    corners are the worst reach on a modern phone. So: the constant action goes in the
    pinned bar, navigation at the bottom, and **only low-frequency controls in the top
    corners** (theme, settings). The corollary is a safety rule — **keep destructive actions
    out of the thumb's resting arc.** Delete, clear and end-of-campaign controls belong at
    the end of a scroll, not beside the button pressed forty times an evening.

### 6.4 Feedback and dialogs — **LOCKED**

- **Toast** for a result that needs no decision ("Repaired. Hull 4/6"). **Modal** for a
  result the player must read before continuing, or any choice. **Inline** for state that
  persists (a status note on the sheet).
- **A result dialog shows the dice, the arithmetic and the consequence** — the raw dice,
  what modified them, the outcome in the game's own language, and what the app changed as
  a result. A number with no working shown is a number the table will argue about.
- **Modal actions are ordered primary-first**, everywhere, without exception.
- **Destructive actions confirm and name the loss.** "Ending the fight discards zones,
  rounds and every Threat's remaining health" — not "Are you sure?".
- **Boundary events summarise.** Anything that fires a bundle of changes (end of scene,
  session, day) reports exactly what changed, line by line, with **one-step undo**.
- **Refusals explain the rule.** When the app blocks something, it says which rule blocked
  it: "Only a Lone wolf can settle it without the other person there", not "Not allowed".
- **Empty states point forward.** An empty screen names the thing to do and links to it.

### 6.5 Density and long screens — **LOCKED**

Test at **session-three density**, not at zero (§11.2.6). Under real load:

- Lists that grow without bound (roll logs, combatant lists, event records) **page**: show
  a session's worth, offer the rest. A hundred log entries is fifteen phone screens.
- Items that are **done** collapse to a line — a combatant who has taken their turn keeps
  their name, health and an undo, and gives up everything else.
- Reference blocks read rarely (background, notes, prep, wrap-up) **fold**.
- A screen that is legitimately long (a full character sheet) gets a **jump row** — the same
  pill component, in-page — rather than hiding content.
- **Long values stack; short values sit inline.** A flex row centres its children, so a
  two-line sentence straddles its one-line label. Inline rows for `Hope 3/5`; stacked
  definition rows (label above, value below, full width) for anything sentence-length.

### 6.6 Teaching the game — **LOCKED**

The app is many players' first contact with the system. Four layers, each with a different
job; build all four, and never let one substitute for another.

**1. `explain()` — a "what this does" note on every screen.**
- A `<details>` collapsed by default, directly under the screen's heading, so it costs
  nothing to the player who does not need it.
- **Two to four sentences, in the app's own voice**, answering: what is this surface for,
  what does the app do for me here, and what does the game charge me for it. Name the rule,
  do not quote the book.
- Written for someone who has not read the rulebook. *"Build a pool and roll it. One 6
  succeeds; extra 6s add damage. Pushing re-rolls everything that is not a 1 or a 6, and
  the app charges the Hope and gear damage that follow."*
- The harness asserts every one is present and starts collapsed.

**2. Rules-library links — the depth behind the note.**
- A searchable library, one entry per automated rule, in the app's own words, with the book
  page cited.
- **An accordion grouped by subject in session order**, collapsed until opened, with search
  that auto-opens matches — a flat scroll of forty rules is unusable at a table.
- **Every automated surface links to its entry.** A status note about death rolls links to
  the death-roll entry; the link opens that entry, expanded and scrolled to.

**3. The tutorial — a first session, step by step.**
- Its own route, linked from the home screen while no character exists and permanently from
  Settings.
- One step per thing the player must do, in play order, each saying **what to tap and why
  the game asks for it** — not what the button is called. Cover the whole first session:
  make a character, set up the group, read the sheet, make a roll, push it, take damage,
  end a scene, end the session.
- If the game has a solo mode, the tutorial covers it as a second track: what the pacing
  device is, when to draw, how to read an oracle result.
- Steps are `<details>` so the whole thing is skimmable, and the tutorial is a *screen*,
  not a modal sequence — a player returns to it mid-session.

**Voice, throughout all four layers.** The app speaks in the game's register, not in
UI-ese, and **uses the book's own names for states** — if the book says Busted, Breakdown,
Incapacitated, so does the app, so that what a player reads on screen is what the table
says out loud. Where the app must name something the book does not (a screen, a control),
name it from the fiction rather than from the interface: *Travelers*, not *Characters*;
*The Journey*, not *Campaign settings*. Empty states get the same treatment — they are the
first thing a new player reads.

**4. In-context teaching — the part that actually lands.**
- **Say why, at the moment it costs something.** When a push takes a point of Hope, the
  result says so; when a condition subtracts dice, the pool shows the condition by name.
- **Label the mechanism, not just the number.** `4 ⌊2⌋` in a Bliss tile with "Permanent
  inline" beats a second unexplained track.
- **Surface the book's own guidance where it applies** — solo principles on the solo screen,
  pacing advice and threat-building on the GM screen, safety tools in Settings before play.
- **House aids identify themselves** wherever they are rolled (§2.2).

### 6.7 The measurement contract

These are the numbers the harness enforces (§11.1). Design to them, and they never become
findings:

| Property | Requirement |
|---|---|
| Horizontal overflow | none at 320 / 360 / 390px, in stress state |
| Primary action | above the fold, no scrolling, on every screen that has one |
| Controls under the tab bar | none (excluding collapsed panels) |
| Tap target | ≥ 44px effective, measured on the wrapping label |
| Input font size | ≥ 16px |
| `explain()` note | present on every screen, collapsed by default |
| Stray `null` / `undefined` / `NaN` text | none, on any route, in any state |
| Console errors | zero, on every route |
| Screen length under stress | no unbounded list; pages or collapses |

---

## 7. Data model (Firebase) — **LOCKED** shape; field names follow the game

```
campaigns/{campaignId}
  meta:    { name, joinCode, createdAt, ownerUid }
  members/{uid}: { displayName, characterId, role: "player" | "gm" }
  group:   { <§3.8 group-entity shape: stats, resources, roles, traits> }  // CONDITIONAL
  pools:   { <§3.3 shared meta-currencies, with caps> }
  combat:  { active, round, initiativeOrder[]|currentSide, keptInitiative,
             pendingContest{...},                                   // if §3.2 is sequential
             combatants{ id: { ..., actedThisRound, forfeitNextTurn,
                               scale, tracks{...} } } }             // shaped by §3.17
  tasks/{taskId}: { name, requirement, progress, contributors[] }   // §3.13 generic tasks
  scenes/{sceneId}: { <§3.12 adventure/scene record, countdowns, resolved> }
  rollLog/{pushId}: { by, byId, characterName, roll inputs, dice[], outcome,
                      currencyDeltas, ts }                          // capped (~100)
  broadcast/{pushId}: { text, ts, from }                            // GM→players feed

characters/{characterId}
  owner, campaignId
  identity:  { name, <§3.7 option fields>, appearance, <§3.15 identity fields>, portraitUrl }
  attributes:{ <§3.4 attributes> }
  derived:   { <§3.5 derived stats> }
  state:     { <§3.10 vitals/tracks>, conditions{...}, <death-procedure state>,
               <per-scene/per-session flags per §3.12>, <rest-limit flags>,
               <once-per-X escape-hatch flags per §3.3a>,
               <combat state: movement, posture, active scale per §3.17> }
  skills:    { <name>: { level/bonus, trained, mark } }             // shape per §3.6
  abilities: [ ... ]                                                // talents/feats/features
  customAbilities: [ { id, name, effect } ]                         // invented, per §3.14a
  powers:    { <§3.14 shape: known lists, cast skill, preparation> }
  inventory: { items[] (weight/qty/equipped/durability per §3.16), tiny[], money{...} }
  currencies:{ <§3.3 personal currencies, with caps> }
  companions:[ ... ]   effects:[ ... ]   notes: ""   advancementLog:[ ... ]
```

Rules: every rules number the schema references lives in the data files; every schema
addition ships with a normalization path that back-fills defaults on old characters (never
crash on old data); **state flags that represent a spent once-per-X reset in the same
normalization pass** that would restore them; every field addition is documented in the
project CLAUDE.md's data model **in the same change**.

---

## 8. Settings & toggle pattern — **LOCKED**

All optional surfaces follow one pattern: a flag in `settings.js`
(`Settings.<flag>() → !!get("<flag>")`, off by default), a toggle row in Settings & About
with a one-line description, every related UI checks the flag before rendering, and nav
tabs for gated modes are hidden by the router when off. Explicit user choice always beats
role-based defaults (store `true`/`false` distinctly from unset). A gated route reached
directly explains what it is and offers to turn it on in place — never a silent redirect.

Standard toggles: one per expansion book · solo mode · GM screen · manual dice entry ·
any rules the book gates behind table agreement (§3.22) · advanced/GM automation.

---

## 9. Build roadmap — instantiate with checkboxes in the project CLAUDE.md

At Stage C start, write the project's `CLAUDE.md`: this document's §1 and §5–§16 carried
over, **§1.1 Product Decisions** (the Stage B Q&A answers), §3 replaced by the
**completed** System Profile (with the checkpoint rulings recorded inline), the file
tables made real, the **Data Extraction Ledger** (§9.1), this roadmap instantiated with
checkboxes, and a changelog seeded with the instantiation row. That file is thereafter
the project's canonical spec, kept in sync per §10.

### 9.1 Data Extraction Ledger — mandatory

The project CLAUDE.md contains a **T-numbered checkbox ledger** listing **every data
table** the app needs, grouped by target data file and mapped to roadmap phases: every §3
list/table/formula, every catalog (talents, gear, powers, monsters), every generator
table, the rules-library quick-reference content, and per-expansion inventories. The
ledger opens with a **"How to continue"** preamble for any AI resuming the project:
work top to bottom within the current phase; query the source; corroborate surprising
values; write the table (paraphrased, cited); **tick the checkbox in the same change**
and append a changelog row; estimated counts yield to real counts (record them);
**an unticked box = data not extracted; never build UI against an unticked table.**

### 9.1a Rules Traceability Ledger — mandatory

The extraction ledger tracks whether a table exists. That is necessary and not sufficient:
in the reference build every table existed and dozens of rules still did nothing. Track the
whole path instead. **One row per rule, six columns** — the shape (§3.0) tells you what the
other four should contain:

| Rule | Shape | Data | Engine | Surface | Test |
|---|---|---|---|---|---|
| Re-roll economy: failures on the re-roll cost the spendable resource | Cost | `PUSH` | `roller.resolvePush` | Result card | `pushing keeps its kept faces` |
| Reacting costs your next turn | Future cost | `REACTIONS.cost` | `combat.forfeitNextTurn` | Combatant card + opposed dialog | `a reaction costs the defender their next turn` |
| Worn gear penalises real-world actions | Modifier | `GEAR[].wornPenalty` | `derived.wornPenalty` | Circumstances card | `the penalty applies only while worn` |
| Addiction ≥ willpower = lost | Threshold | `LOSE_CONDITION` | `derived.isLost` | Persistent header | `the predicate flips at the boundary` |

- **A row with a gap is the §0 defect, visible before it ships.** Data but no engine: a
  number nobody reads. Engine but no surface: a function nobody can reach. Surface but no
  test: a rule that will regress silently. No test column entry is acceptable for any rule
  the engine automates.
- Fill the row **when you build the rule**, not at audit time. The audit then becomes a
  check that the ledger is honest, which is a much cheaper thing to verify.
- Rules the app deliberately does **not** automate get a row too, with `guidance only` in
  the engine column — that is the explicit marking §10.13 requires, and it stops a later
  pass rediscovering the same non-decision.
- At the end of every phase, the dead-data scan (§11.2.1) must agree with this ledger. A
  disagreement means either the scan found something the ledger missed, or the ledger is
  describing work that was never done.

### 9.2 Phases — build strictly in order

- **Phase 0 — Foundations:** scaffold all §6 files; extract the **complete, verified**
  core data library per the ledger (multiple sub-phases for large books) — data before
  features; theme; PWA shell; app shell with router, the §6.2 frame, two-level nav (§6.3.1)
  and local storage.
- **Phase 1 — Creation Wizard(s):** the §3.7 flow with honest §3.4 generation, all §3.5
  derivations, legality validation at every step; the group-entity wizard if §3.8 exists;
  pregens if published (validated against the formulas, §2.1).
- **Phase 2 — Core Tracker:** the live sheet — vitals with steppers clamped to true
  maxima, conditions with real mechanical teeth, inventory/encumbrance, abilities/powers
  display, flavor + notes + portrait; **persistent resource header on every in-play
  screen**; **JSON export/import in Settings**; persistence + migration.
- **Phase 3 — Dice Engine:** §3.1 natively, wired into sheet skills, weapons, and powers;
  the exact §3.2 opposed sequence; §3.3 currency spends with caps enforced; condition
  effects auto-applied; push economy enforced (two-stage manual entry if chosen);
  crit/fumble consequences from the book's real tables; ability-embedded automation
  ("tap to use"); **roll log** (attributed, filterable, capped, `aria-live`); **rules
  citations** — every automated surface links to its rules-library entry.
- **🏁 Milestone — First Session Playable:** create character → live sheet → roll tests →
  track resources end-to-end, verified at (or rehearsed as) a real play session.
  **Phase 5 is gated on this milestone** unless the Stage B Q&A promoted multiplayer.
- **Phase 4 — In-Play Systems:** guided death procedure (§3.10, impossible to run wrong,
  with onward routes on every terminal outcome); rests with enforced limits; **lifecycle
  engine (§3.12) with confirmation summary + one-step undo**, including the environmental
  checks; the **generic progress-task tracker (§3.13)**; the full advancement loop (§3.15)
  incl. gates and invented abilities (§3.14a); local combat tracker wired to the dice
  engine — attacking from a combatant card and applying damage back to it, with no manual
  re-entry of numbers the app already knows.
- **Phase 5 — Multiplayer & Sync** *(gated per §1.1)*: Firebase, security rules
  (incl. group-entity write rules), anonymous auth + Google link, campaigns/join codes,
  party overview, shared pools, shared combat with two-way sync, shared tasks + roll log,
  portraits, PWA update toast.
- **Phase 6+ — Conditional surfaces:** expansion toggles per commitment tier; solo mode
  (with its procedural framing, §3.20 — not just its tables); GM screen (party panel, peek
  sheets, drop-in combatants, hand out damage/conditions, rollable §3.21 reference tables,
  and the book's own "how to build one" guidance); power-automation engine; advanced
  automation behind one shared toggle.
- **Hardening (always):** the harnesses of §11.1, the accessibility pass, the §6.2–§6.7
  layout, flow and teaching rules, and the **audit protocol of §11 run to a clean pass**.

### 9.3 Definition of done — per feature

A feature is done when every line is true. Anything less is a feature that will come back
as an audit finding, and the audit is more expensive than the checklist.

- [ ] **Rule** cited to the source, with the exact numbers and the edge cases.
- [ ] **Data** in a `data*.js` file, never inline in a module (§10.2).
- [ ] **Engine** — a named function that applies it, including any repetition or cascade.
- [ ] **Surface** — reachable in two taps from where a player would look for it, with its
      primary action above the fold (§6.3.2).
- [ ] **Flags** — every state field it introduces has a setter, a reader and a clearer
      (§10.14).
- [ ] **Defaults** match what the fiction does when nobody touches the control (§10.15).
- [ ] **Onward route** on every terminal outcome (§6.3.6).
- [ ] **Copy** either enforced or marked guidance-only (§10.13), in the book's own state
      names (§6.6).
- [ ] **Test** — a unit invariant, plus a browser check if it has a surface; and you have
      **watched it fail** against the unfixed code (§10.6).
- [ ] **Traceability row** filled in, all five columns (§9.1a).
- [ ] **CLAUDE.md** updated in the same change; `CACHE_VERSION` bumped.

**Per-feature spec format (mandatory for every roadmap item):**
- **Rule:** the canonical mechanic with exact numbers (cited to the source).
- **Target:** file · module · function.
- **Behavior/UI:** what to build and where it appears — including *where on the screen*
  relative to §6.2–§6.5, and the `explain()` line it carries (§6.6).
- **Schema:** new fields — name · type · default · location (and §7 updated).
- **Acceptance:** how to confirm it works in a browser, and which harness check pins it.

---

## 10. Process rules — **LOCKED**

1. **Living spec.** The project CLAUDE.md is canonical. **Every code change updates it in
   the same change** — features, data model, file tables, roadmap checkboxes, ledger
   ticks, changelog. A code change with a stale CLAUDE.md is incomplete.
2. **Single source of truth.** All rules data and numbers live in the `data*.js` files.
   Never hardcode a rules value in a `src/` module — if a table is missing, add it to the
   data layer first (and to the ledger if it was missed).
3. **Changelog table.** Every change appends a dated row: what, why, root cause for
   fixes, verification performed, cache version.
4. **Verify in a real browser.** Every phase/feature is verified headless (Playwright,
   Firebase requests aborted) before being marked complete: the flow works end-to-end
   with **zero console errors**. "Syntax is valid" is not verification.
5. **Committed regression harness.** See §11.1 for the required checks. Every bug fix adds
   a check that would catch its return.
6. **Prove the guard bites.** A regression check written after a fix is worthless until you
   have seen it fail. Reintroduce the defect, watch the check go red, restore the fix. Two
   guards in the reference build passed happily against the bug they were written for —
   one matched on the wrong whitespace, one ran in a state where the bug could not occur.
7. **Cache discipline.** Any shipped-file change bumps `CACHE_VERSION`.
8. **Root-cause fixes.** Debug to the actual cause before editing; record cause + fix in
   the changelog. No symptom-patching.
9. **Scope guard.** Core rules (+ toggled supplied expansions) only. No setting/adventure
   content. Nothing invented presented as official — any house convenience is explicitly
   labeled a house aid (§2.2).
10. **Module discipline.** Respect §6.1 responsibilities; export/import explicitly; split
    a module that outgrows its job along the same lines.
11. **One record, not two.** When two surfaces generate the same kind of thing (a GM
    building an adventure site and a solo player generating one), they share **one record
    shape, one builder and one renderer**, with a migration folding any legacy shape in.
    Two shapes for one concept is a bug with a delayed fuse.
12. **Counters live in one place.** A count that drives a procedure (which countdown step
    is next, how many rolls a talent has left) is stored once and read by every path. Two
    paths deriving the same count from different sources will disagree, and capped history
    lists cannot be counted at all.

### 10.1 Authoring rules that prevent §0

The audit protocol *finds* inert rules. These four stop you writing them. In the reference
build they would have prevented roughly half of eighty-five findings.

13. **Explain and enforce, in the same change.** The moment you write UI copy that states
    a mechanic — a blurb under a toggle, a line in a modal, a sentence on a card — you owe
    one of two things in that same change: **the engine enforcing it**, or the copy
    explicitly marked as guidance the app does not automate. Never a third option. Almost
    every inert rule in the reference build began as an honest sentence describing
    something nothing did: *"Reacting costs them their next turn"* appeared in three
    dialogs and was enforced in none. Grep your own copy for imperative rule language
    ("costs", "may not", "must", "instead of", "each", "per") and check each hit has an
    enforcer.
14. **Every flag has a setter, a reader and a clearer.** A boolean or counter on state is
    not done when it is written. Name all three call sites in the same change: what sets
    it, what reads it, and **what clears it** — usually normalization or the lifecycle
    engine. Two reference-build flags were written and read nowhere; two more were set and
    never cleared, so a condition became permanent. If you cannot name the clearer, the
    flag is a leak.
15. **Defaults follow the fiction.** When a rule applies unless something prevents it, its
    control **defaults to on**. A dice penalty for wearing a helmet, shipped defaulting to
    off, is a rule that will never once apply in play. Ask of every toggle: what happens if
    the player never touches this — is that the game's default state or the opposite of it?
16. **One lookup per kind of thing.** Everything that can stand opposite the party — major
    threats, minor NPCs, animals — resolves through **one function**, not one per data
    file. The moment a second list exists, one surface will know about it and three will
    not, and the ones that do not will silently fall back to a guessed value. The same
    applies to abilities: one resolver that also sees character-owned entries (§3.14a).
17. **A shape change ships a migration and a fixture.** Any change to a stored shape adds
    the migration **and** a test that loads a hand-written old-shape record and asserts the
    new one comes out right. Migrations that were never run against real old data are
    hopes, not code.
18. **Reversibility is inventoried.** List every action that destroys state. Each one either
    undoes (a snapshot the user can revert) or confirms while naming the loss (§6.4).
    Reference builds ship with undo on the lifecycle engine and nothing else, and the
    unprotected actions are exactly the ones taken at the end of a tense scene.

---

## 11. Audit protocol — mandatory before "done"

One audit pass is not enough. In the reference build, **eleven passes** were required, and
the last four still found real defects — including four screens whose primary action was
off-screen and a rule that had been inert since Phase 3. Run the passes below in order,
repeat the cycle until a full cycle produces nothing, and record everything in
`docs/AUDIT.md` as numbered findings (**Rule / Target / Fix / Why it mattered**) plus a
**verified-clean list** so later passes do not re-litigate settled ground.

### 11.1 The three harnesses — build these first

**A. Unit + data harness (`npm test`, seconds).**
- **Parses every source file first.** `node --check` each `src/*.js` and `data*.js`, and
  fail by filename. A missing paren in a screen module does not throw in the browser — it
  presents as a screen that never renders and a test run that hangs. This check costs one
  second and saves an hour.
- §3.5 derivation invariants across generated + pregen characters (and the errata list).
- Dice-engine invariants: the §3.2 opposed sequence, §3.3 caps and decay, push legality,
  the death procedure's terminal states.
- Table completeness: every D66/D100 table has its full row count and unique rows; every
  range table covers its range.
- Every closed audit finding.

**B. Browser smoke (Playwright, ~1 minute).** Boots the app and asserts:
- Every route renders a heading with zero console errors.
- Zero horizontal overflow at 320/360/390px.
- **No stray `null`/`undefined`/`NaN`/`[object Object]` text node** anywhere on any route.
- Nothing at the foot of a screen sits under the fixed tab bar (skipping controls inside
  collapsed panels — they keep their last layout position and read as buried while being
  unreachable).
- **Each screen's primary action is above the fold without scrolling** (§6.3.2).
- Section nav reaches every sibling route and marks the current one; live-state badges
  appear only when the state is live.
- No checkbox has an effective tap target under 40px (measure the wrapping label).
- The end-to-end walk: wizard → sheet → roll → push → damage → condition → log.

**C. Interaction audit (Playwright, ~1 minute).** Visits every route and **clicks every
visible control in isolation** — resetting storage and re-rendering between clicks — and
flags three things: a JS error, a control that cannot be clicked, and a control that
changes **nothing** (no re-render, no modal, no toast, no storage write, no navigation).
The no-op check is what catches a button wired to a handler that returns early.
**Poll for the change rather than waiting a fixed interval**; a fixed wait loses the race
with a handler that opens a modal and manufactures findings that reproduce nowhere.

**D. Committed probes and seed fixtures.** The measured-layout and stress passes need a
realistic state and a script that reports numbers rather than opinions. **Commit both.** In
the reference build these were written as scratch files and deleted three times, so every
pass paid to rebuild them and no two passes measured quite the same thing.

- `tests/fixtures/*.json` — three seed states, loaded by harnesses and probes alike:
  **fresh** (nothing created), **mid-session** (a full party, a journey, a fight running,
  a couple of conditions), **stress** (what a table has by session three — see §11.2.6).
- `tests/probe-layout.mjs` — prints the §6.7 table for every route: height in viewports,
  control count, primary-action offset, smallest tap target, overflow at each width.
- `tests/probe-flow.mjs` — walks a scripted session and prints the tap count and route
  changes for each common sequence (make an attack, resolve damage, end the day).

A probe prints; it does not assert. That is the point — you read the table and notice the
outlier. Once a number is known-good, it graduates into harness B as an assertion.

### 11.2 Pass types — run all of them, in this order

1. **Dead-data scan (mechanical).** Two scripts: *every export nothing else imports*, and
   *every named import a file never uses*. Triage each hit: provenance constant (fine),
   redundant duplicate (delete or note), or **a rule the engine never reads** (a finding).
   This pass alone produced 22 findings in one reference cycle. Run it first, every cycle.
2. **Rules-file read-through.** Read the distilled `docs/rules/*.md` section by section
   against the engine, asking of each sentence: *where does this happen in code?* This
   catches what the scans cannot — rules that are implemented but implemented wrongly, and
   rules never extracted in the first place. Where the rules file and the source disagree,
   **the source wins and the rules file is corrected** — and where a distilled file and the
   data file disagree, check the source before assuming the code is wrong.
3. **Ability sweep.** List every ability whose effect is `rule` rather than `dice` (§3.14a)
   and find each one's home in the engine. Anything without a home is inert.
4. **Interaction audit** (harness C).
5. **Measured layout.** A probe seeds a realistic mid-session state and records, per route:
   document height in viewports, control count, **the scroll offset of the primary action**,
   and every tap target's effective size. Read the table, not the screens. Four buried
   primary actions survived ten passes of reading and fell out of one table.
6. **Stress state.** Re-run the probe with what a table actually accumulates by session
   three: a full party, several conditions and a full pack each, ten combatants, a spent
   pacing deck, a full roll log, several adventure sites. Screens that are fine empty
   buckle here — a hundred log entries is fifteen phone screens.
7. **Flow walk.** Play a whole session through the app and ask at each step: *what do I tap
   next, and how many taps is it?* Look specifically for terminal states with no onward
   route (§6.3.6), procedures that require remembering a screen, and state that is invisible
   from where you need it.

### 11.3 Where the findings actually are

- **Data values audit essentially clean.** Spot-check every category; fully check every
  formula and every creation table; then stop looking there.
- **Engine behaviour is where the bugs live** — gating, options, limits and sequencing:
  push legality, rest once-per-X, crit option choices, multi-attack counts, the exact
  opposed sequence including ties and resource banking, currency caps and decay, once-per-
  scene escape hatches, lifecycle bundles, one-advance-per-X gates, and **every Future-cost
  rule** (§3.0) — whatever your game calls them: reactions, held actions, overwatch, a
  spent refresh, a move that costs the next one. That last shape is written as prose in
  three places and enforced in none, in every system family we have built for.
- **Subsystem seams concentrate bugs.** The places where two modules meet — tracker and
  roller, solo and GM, sheet and lifecycle — are where state gets described instead of
  shared, where a value gets re-typed instead of read, and where two shapes of one record
  appear. When a pass is short of leads, walk the seams: for each pair of modules that
  touch the same entity, ask what each one knows that the other should.
- **Re-verification method:** pull the app's value from the data files, query the source
  for the canonical value, compare; corroborate surprising answers before editing.

### 11.4 Cadence — what to run, and when

Passes are not equally expensive. Run them at the frequency their cost justifies:

| Pass | Cost | Run it |
|---|---|---|
| Parse gate + unit harness | seconds | every change |
| Dead-data scan (§11.2.1) | seconds | every change that adds data or a rule |
| Browser smoke | ~1 min | before every commit |
| Interaction audit | ~1 min | end of every feature |
| Rules read-through (§11.2.2) | hours | end of every phase, and every audit cycle |
| Measured layout / stress (§11.2.5–6) | ~10 min | end of every phase, after any layout change |
| Flow walk (§11.2.7) | ~30 min | end of every phase, and before calling it done |

**The stopping rule:** the build is done when **one complete cycle of all seven passes
produces no finding**. Not when a pass is clean — the reference build had clean passes at
six, eight and ten, and the next cycle found eleven, four and eight things respectively.
A cycle that produces only cosmetic findings is still a cycle that produced findings.

**When a pass finds nothing, suspect the pass.** Two consecutive empty passes of the same
type usually means the method has stopped reaching new ground, not that the ground is
clean — change the seed state, change the width, change the order you read in. The most
productive passes in the reference build came from changing the *method*: from reading to
scanning, from scanning to measuring, from measuring at zero state to measuring under load.

---

## 12. Content & IP rules

- Extract **numbers and mechanics**; **paraphrase all effect/flavor text concisely —
  never copy rules prose verbatim.** No setting, adventure, art, or logo content.
- House aids are labelled as such in the UI and isolated in their own files (§2.2).
- The generated app is a **personal play aid** built from the user's own books. State in
  the README that if the user publishes or distributes it, licensing is their
  responsibility, and that openly licensed material (an SRD, ORC/CC content) is the safe
  basis for anything public. If the source is a transcription of a commercial book, the
  repository stays private.

---

## 13. Known defect classes — check for each by name

Every one of these shipped in a reference build and was caught late. They are written in
system-neutral terms: read each one against **your** game's version of the shape (§3.0),
not against the example. Grep for your own version of each before declaring a phase done.

| | Defect | How it hides | The check |
|---|---|---|---|
| D-1 | `node.append(x)` where `x` can be null renders the text `null` | Only in the state where the value is absent | Text-node scan (§11.1 B) |
| D-2 | A toggle sets a flag nothing reads (full auto, ambush, a stance) | The UI describes the rule perfectly | Dead-data scan; grep the flag |
| D-3 | An ability whose effect is a *rule* rather than a modifier is displayed and never fires | It appears on the sheet | Ability sweep (§11.2.3) |
| D-4 | A state field is written and never read (any Future-cost or Blocker flag) | Nothing visibly breaks | Dead-data scan |
| D-5 | Two counters for one procedure disagree | Only after both paths are used | One-record rule (§10.12) |
| D-6 | A degradable or spendable resource has no path back | Nobody degrades it in testing | Flow walk |
| D-7 | A terminal outcome offers no next step | The modal reads as complete | Flow walk (§6.3.6) |
| D-8 | The primary action is below the fold | You always scroll during development | Measured layout (§11.2.5) |
| D-9 | A list grows without bound | Fine with three entries | Stress state (§11.2.6) |
| D-10 | An inline style overrides the stylesheet (13px checkboxes) | Looks deliberate | Tap-target measurement |
| D-11 | A wrapping value straddles its label in a flex row | Only with long text | Definition rows (§6.5) |
| D-12 | An Exception shape is not branched on at every call site of the rule it excepts | The common path works | §3.10a checklist |
| D-13 | Two surfaces generate the same record in two shapes | Each works alone | One-record rule (§10.11) |
| D-14 | A guard passes against the bug it was written for | Green is reassuring | Prove it bites (§10.6) |
| D-15 | A fixed wait in a harness manufactures a finding | Fails once in ten runs | Poll, don't wait |
| D-16 | A Cascade rule ("roll again", "explodes", "repeat up to N") implemented as a single shot | The first roll works | Grep the source for repetition language (§3.0) |
| D-17 | A Once-per-X flag is set and never cleared, so the ability works once ever | Only on the second occurrence | Setter/reader/clearer rule (§10.14) |
| D-18 | A default-off control for a rule that applies by default | The rule simply never fires | Defaults follow the fiction (§10.15) |
| D-19 | Two modules describe the same state instead of sharing it | Each works in isolation | Seam walk (§11.3) |
| D-20 | A rule in an appendix, sidebar or stat block is never extracted | The chapter sweep looked complete | Read boxed text (§2) |
| D-21 | A destructive action has neither undo nor confirmation | Nobody does it during testing | Reversibility inventory (§10.18) |
| D-22 | A permission the book grants has no control | It reads as flavour | Permissions are features (§2) |
| D-23 | A lookup exists per data file instead of per concept | The main list works | One lookup per kind (§10.16) |
| D-24 | A Threshold that defines the game's stakes is computed but never surfaced | The numbers are both on screen, separately | Header rule (§3.0, §6.2) |
| D-25 | A Compulsion is implemented as a suggestion the player may ignore | The text is accurate | Assert the alternative is unavailable |
| D-26 | A Gate lives in a tooltip while the control stays enabled | Nobody tries it under the gating condition | Attempt it under B; assert refusal |

---

## 14. Improvement backlog — features the next build should weigh

The template's mandatory scope (§1) is what a play aid must have. This section is what the
reference build **wished it had by the end** — gaps found in play and in audit rather than
guessed at. Treat it as a menu to decide from at Stage B, not as scope: each entry says what
the gap actually was, so you can judge whether the game you are building has it too.

### 14.1 Gaps the reference build actually hit

1. **A campaign list.** The build assumed **one campaign per device** — `getJourney()`
   returns *the* journey. Running a second game means wiping the first, and there is no way
   to keep a finished campaign as a record. Decide this consciously at Stage B: a local
   campaign list is cheap on day one and expensive to retrofit after every module has
   learned there is exactly one.
2. **Undo beyond the lifecycle engine.** One-step undo exists for time boundaries, because
   §3.12 demanded it, and nowhere else — so ending a fight, clearing a log or deleting a
   character are irreversible while ending a day is not. A general snapshot-and-revert
   (one stack, any mutating action pushes) is a modest amount of code and removes a whole
   class of confirmation dialogs.
3. **A session record, not just a roll log.** The roll log answers "what did I roll"; the
   advancement debrief asks "how did you follow your Dream this session" and the app has
   no answer, though it saw everything that happened. A per-session narrative record —
   events, conditions taken, Stops resolved, boundaries crossed — turns the debrief from a
   memory test into a review, and gives a group returning after three weeks a way back in.
4. **A fast character switcher.** A solo player runs two to four characters and switches
   constantly; every screen that acts on a character has its own select. One switcher in
   the persistent header, applying app-wide, would remove the single most repeated
   interaction in solo play.
5. **A text-size control** to pay back the zoom lock (§6.2).
6. **Named instances in the tracker.** Combatants drop in as "Law Enforcement 1, 2, 3".
   At a table they get names in the first thirty seconds, and the app cannot hold them.
   Editable combatant names, persisted for the fight.
7. **A human-readable export.** JSON export protects the data; it does not let a player
   hand their character to someone, print it, or read it on a device that does not have the
   app. A rendered character sheet (HTML or plain text) alongside the JSON.
8. **A repeat-roll affordance.** In play the same pool is rolled repeatedly (attack, attack,
   attack). "Roll that again" on the result card, and a short list of recent pools, would
   cut the commonest interaction to one tap.
9. **A data-integrity action.** Settings should offer "check my data": run normalization,
   report what it repaired. Migrations run silently at load; when one is wrong, the player
   sees only strange numbers with no way to say what happened.
10. **A roll-distribution view.** Counts per face across the campaign, in the roll log — the
    fairness answer (§5.1), and cheap once the log exists.
11. **Screen wake during a session.** A play aid that sleeps every thirty seconds is one
    people stop picking up. The Wake Lock API handles it; make it an explicit setting, off
    by default, because it is the player's battery.
12. **What is visible when the device is passed.** A player-facing app with a GM screen gets
    handed across a table. Decide whether GM-only content — prepared threats, countdown
    steps not yet fired, secret notes — needs a quick hide, or whether the honest answer is
    that the GM uses their own device.

### 14.2 Decisions to make consciously rather than by default

- **One campaign or many** (as above) — an architecture decision disguised as a feature.
- **Portraits.** In the schema from day one, never built. If the game's play does not want
  them, say so and drop the field; a schema field with no UI is §0 in another costume.
- **Sound and haptics on rolls.** A dice app that makes no noise is a deliberate choice —
  make it deliberately, and note it, because it is the first thing playtesters ask about.
- **A table/landscape layout.** The template is phone-first and says so; a tablet propped in
  the middle of a table is a different product with a different layout, and building both is
  a real cost.
- **Homebrew content.** The scope guard (§10.9) keeps invented content out of the extracted
  files. Whether players may *add their own* gear, threats or tables through the UI is a
  separate question — the invented-ability path (§3.14a) is the thin end of it, and once
  one exists the argument for the rest gets stronger.
- **Clocks on the header.** If the game's pacing device is a countdown, it competes with the
  vitals for the persistent header. Decide which the player needs at a glance.

### 14.3 Things to leave alone

- **A build step.** The no-build constraint (§5) survived a 7,000-line app comfortably and
  is why the thing still runs from a clone in five years.
- **A component framework.** The element factory plus one module per responsibility held up
  under eleven audit passes; nothing in the findings would have been prevented by a
  framework, and several were caused by indirection that a framework would add more of.
- **Cleverness in the data layer.** Plain arrays and objects with cited page numbers audited
  clean every single pass. That is not an accident: the data layer is the only part of the
  system a human can proofread against a book.

---

## 15. System family field guide

The reference builds are a Year Zero game and a 2d20 game. Neither is your game. This
section maps the template onto the families you are most likely to be handed, and — more
usefully — names **which rule shapes (§3.0) each family is dense in**, because that is where
its audit findings will be.

Use it to aim Stage A, not to skip it. If the game contradicts its family here, the game
wins; the value of the table is that it tells you what to look for hardest.

| Family | Resolution (§3.1) | Dense in | Characteristic misses |
|---|---|---|---|
| **d20 / OSR** | d20 + mod vs DC | Modifier, Once-per-X, Gate, Lookup | Conditions as inert checkboxes; concentration and its breaks; action economy (bonus/reaction) modelled as a note; spell components and prepared-vs-known; stacking rules for identical bonuses; per-day resets that never reset |
| **Dice pool, count successes** (Year Zero, WoD, Blades) | pool of dN, count faces | Cost, Future cost, Threshold, Escalation | The push/stress economy charged in the UI and not in the engine; conditions that rewrite what is legal; clocks with two counters; the game's threshold lose-condition displayed but never compared |
| **PbtA / Forged in the Dark** | 2d6+stat, tiered; position/effect | Compulsion, Permission, Escalation, Lookup | Move triggers ("when you do X, roll") implemented as a menu the player picks from, so the fiction no longer drives the roll; 7–9 costs offered as text; clocks not shared; playbook advances gated by conditions nobody checks |
| **2d20** (Modiphius) | pool 2–5 d20 under target | Cost, Conversion, Threshold | Momentum and Threat as two economies with caps and decay — spend menus with exact costs are the whole game and the commonest gap; complications converting to Threat; buying dice before the roll rather than after |
| **Percentile / BRP, CoC** | roll-under d100 | Modifier, Lookup, Once-per-X, Conversion | Bonus/penalty dice as tens-die keeps; pushing a roll and its consequences; sanity as a Threshold + Conversion pair; skill ticks marked at the moment of success and cashed later |
| **Narrative / diceless / resource-bid** | spend, compare, or GM call | Permission, Cost, Gate | Almost everything is a Permission shape — these games are *mostly* the rule shape that reads as flavour and gets no control; the app risks being a notepad |
| **Tactical grid** (4e-likes, Lancer) | d20 + mod, positioning | Modifier, Cascade, Gate, Exception | Zones vs squares; forced movement; auras and ongoing effects that tick on a specific turn; multi-part statblocks with per-phase abilities |
| **Investigation** (GUMSHOE) | spend for certainty, roll for tests | Cost, Gate, Permission | Core clues never gated behind a roll — an app that offers a roll for them has broken the game's central rule; pool refresh schedules |

**Family-independent truths worth stating once**

- **Every family has a Future-cost rule and every family's implementation forgets it.**
  Reactions, held actions, overwatch, a spent refresh, a move that costs your next one.
- **Every family has a Threshold that is the point of the game** — hit points reaching zero
  is one, but so is corruption, sanity, doom, heat, stress, infamy. It belongs in the
  persistent header, compared live, whatever the game calls it.
- **Every family has Once-per-X flags and a boundary that should clear them.** If the
  lifecycle engine (§3.12) does not own the clearing, nothing does.
- **Every family publishes at least one Permission** the app will otherwise silence.
- **The more narrative the game, the more of its rules are Permission and Compulsion
  shapes** — and the more the app's job shifts from arithmetic to *prompting*: putting the
  question in front of the player at the moment the fiction reaches it. A narrative game's
  app is judged on its prompts the way a crunchy game's app is judged on its maths.

---

## 16. What companion apps get wrong — evidence from the field

The template's rules come from two builds. This section comes from what players say about
the apps they already use, and from the standards those apps are measured against. Read it
before Stage B: it is the difference between building a competent app and building one a
table keeps using in month three.

**1. Divergence between surfaces is the loudest complaint.** The most common criticism of the
largest commercial companion app is that its phone app and its website are different
products — features present in one and missing in the other, sync that silently does not
arrive, and a character edited in one place that does not update in the other mid-session.
*What this template does about it:* one codebase, one storage layer, no "lite" surface. If
you are ever tempted to build a reduced version of a screen for a smaller viewport, do not:
reduce **density**, never **capability**.

**2. A tablet is not a big phone.** The same app is criticised for shipping a phone layout
scaled up, losing the information density that makes a tablet worth having at a table.
*What this template does about it:* phone-first is the baseline, and the Stage B device
question exists (§4.2.5). If the answer is tablet or mixed, the tablet layout must **add**
— two columns, more visible at once, fewer taps — not stretch. A scaled-up phone layout is
worse than no tablet support, because it looks like a decision.

**3. Printing and hand-off are afterthoughts everywhere, and players notice.** Complaints
about unreadable exported sheets are perennial. A character that cannot leave the app is a
character the player does not fully own (§5.1). *Backlog entry §14.1.7 exists for this
reason; treat it as more important than it looks.*

**4. Sync failure is worse than no sync.** An app that shows a stale sheet during a fight
costs more trust than one that never claimed to sync. This is the strongest argument for
this template's ordering: local-first works completely before multiplayer is switched on,
and Phase 5 is gated behind a real play session (§9.2).

**5. Players want one app, not five.** The apps that survive at tables combine sheet, dice,
rules reference and tracking; the ones that do one thing get replaced by paper. That is why
§1's mandatory scope is as large as it is — a dice roller without the sheet, or a sheet
without the rules, loses to a pencil.

**6. Digital dice are trusted only if they are legible.** Players do check, and they do
suspect. Cryptographic randomness, visible individual dice and a distribution view answer it
(§5.1); a total with no working shown does not.

**7. The accessibility floor is a published standard, not a feeling.** WCAG 2.2 AA is the
bar: 24×24px targets with a spacing exception (2.5.8), visible focus, no colour-only
meaning, and text that reflows. A play aid used in dim rooms by tired people at the end of a
long day has more need of this than most software, not less.

Sources: [D&D Beyond app feedback](https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/d-d-beyond-mobile-app-feedback/191792-character-sheet-not-updating-in-the-app) ·
[tablet layout complaints](https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/d-d-beyond-mobile-app-feedback/125828-full-character-sheet-for-tablets-ipads) ·
[printing complaints](https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/161207-printing-dnd-beyond-characters-sheets-is-horrible) ·
[what players want from companion apps](https://www.dungeonsolvers.com/dnd-character-sheet-apps/) ·
[WCAG 2.2 SC 2.5.8 target size](https://wcag22aa.org/new-criteria/target-size/) ·
[thumb-zone research](https://parachutedesign.ca/blog/thumb-zone-ux/) ·
[local-first software](https://www.inkandswitch.com/essay/local-first/) ·
[PWA cache pitfalls](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)

---

## 17. Kickoff Prompt — copy-paste this to start a project

> Copy the block below into a fresh chat along with this template file and (if available)
> the rulebook source. It is kept in sync with this template by design — if you edit one,
> edit the other.

```
Role: You are an Expert Software Architect and AI Project Manager.

Context: I am providing "RPG Player-Character App — Autonomous Build Instructions" (v3),
which defines a four-stage execution order (A: Ingest & Extract, B: Checkpoint + Product
Q&A, C: Autonomous Build, D: Audit to done) for building an installable HTML5/vanilla-JS
RPG companion app.

Objective: Guide me through Stage A and Stage B so we generate the project's canonical
CLAUDE.md — the completed System Profile, the content inventory, the T-numbered Data
Extraction Ledger, my recorded product decisions, and the phased build roadmap — before
any development begins.

Rules & Constraints:
1. No application code until I sign off Stage B. Producing the CLAUDE.md itself is the
   deliverable of this phase.
2. Source first: your FIRST question is to confirm the rulebook source. If a queryable or
   readable source exists (NotebookLM notebook, PDFs, SRD), extract the System Profile
   from it autonomously — map the table of contents first, extract section by section,
   and corroborate every surprising value with a second, differently-phrased query. For
   sequential procedures (opposed tests, death, extended tasks, lifecycle boundaries),
   get the EXACT step-by-step rule including ties and edge cases — never a summary.
3. Watch for corrupted tables. If the source is a transcription, multi-column tables are
   probably de-interleaved and unrecoverable. Do not reconstruct them — list them at the
   checkpoint and ask me for a photo of those pages.
4. Bring questions to me only for: (a) genuine rules ambiguities, each with your proposed
   ruling; (b) the standard Stage B product-decision questions (usage mode, my seat at
   the table, dice input, expansion commitment tiers, table device, theme default).
   If NO digital source exists, instead interview me through the §3 System Profile
   slot by slot.
5. Strictly one question at a time. Wait for my answer before the next. Never a list.
6. No assumptions: never substitute training-data memory of the game for the source. A
   missing value gets queried, then asked, then marked blocked — never guessed.
7. Every ledger row names the module that will consume the table. A table with no
   consumer is a table that will be extracted and never called.
8. Tag every rule you extract with its shape from §3.0, and give me the shape census at
   the checkpoint — it is the honest statement of what this app has to be good at.
9. Read §15 (the system family field guide) for the family this game belongs to, §16 (what
   companion apps get wrong) and §14 (the improvement backlog), before proposing the roadmap — then tell me which backlog
   entries this game actually needs, particularly whether it wants one campaign or many,
   since that is expensive to retrofit.
10. On Stage B sign-off, write the project CLAUDE.md per §9 of the instructions — including
   the Data Extraction Ledger with every box unticked and the Rules Traceability Ledger
   with its columns defined — then stop and await my go-ahead for Stage C.

Next Steps: Acknowledge these constraints, then ask your first question (the rulebook
source).
```

---

## Template changelog

| Version | Date | Change |
|---|---|---|
| v3 | 2026-08-13 | Lessons from the Electric State reference build (eleven audit passes). New §0 naming the dominant defect class (data extracted, never called) and §11.2's mechanical dead-data scan that finds it. New §2.1 source precedence + de-interleaved tables + printed-value errata; §2.2 house-aid rules. New §3 slots: 3.3a currency lose-conditions, 3.10a archetype damage exceptions, 3.14a rule-kind abilities, 3.22 safety tools; sharpened 3.9 (rule-rewriting conditions + conflict order), 3.12 (environmental checks), 3.17 (reaction costs, dual scales), 3.20 (solo procedural framing). New §6.2 screen anatomy (the fixed frame, sticky resource header, colour semantics, zoom lock); §6.3 placing controls for gameplay flow (two-level nav, pinned action bar, controls ordered by the sequence of play, frequency decides height, in-scene before between-scene, screens that lead somewhere, the named next step, travelling live state, tap targets); §6.4 feedback and dialogs (toast vs modal vs inline, results that show their working, confirmations that name the loss, refusals that cite the rule); §6.5 density under load; §6.6 the four teaching layers (per-screen explain note, rules-library links, the tutorial, in-context teaching); §6.7 the measurement contract the harness enforces — each rule a measured defect from this build. §9.1 ledger rows now name their consuming module. §10 adds prove-the-guard-bites, one-record and one-counter rules. §11 rewritten as a repeatable multi-pass protocol with three specified harnesses (incl. the parse gate and the interaction audit) and a statement of where findings actually are. New §9.1a Rules Traceability Ledger (rule → data → engine → surface → test, filled while building, gaps visible before they ship). New §10.1 authoring rules that prevent the §0 defect rather than finding it later: explain-and-enforce in the same change, every flag has a setter/reader/clearer, defaults follow the fiction, one lookup per kind of thing, shape changes ship a migration fixture, reversibility is inventoried. New §11.4 cadence table and the stopping rule (a full seven-pass cycle with no finding — clean single passes at six, eight and ten were each followed by cycles finding eleven, four and eight), plus subsystem seams as a lead when a pass runs dry. Extraction rules for appendix/sidebar rules and for permissions the book grants. Cascade rules flagged in §3.1. Voice rule: the app uses the book's own state names. §13 grown to twenty-three named defect classes. New §9.3 per-feature definition of done; §11.1 D committed probes and shared seed fixtures (fresh / mid-session / stress) so every pass measures the same thing; §14 improvement backlog — the nine gaps the reference build actually hit (campaign list, general undo, session record, character switcher, text-size control paying back the zoom lock, named combatants, human-readable export, repeat-roll, data-integrity action), the decisions to make consciously rather than by default, and the three things to leave alone. Stage B gains a seventh question: one campaign or many. **Generalised for any system:** new §3.0 rule-shape taxonomy — sixteen shapes (Modifier, Threshold, Cost, Future cost, Gate, Compulsion, Substitution, Cascade, Escalation, Once-per-X, Conversion, Blocker, Opposed, Lookup, Permission, Exception), each with its home, its silent failure mode and its test, because every finding in both reference builds was a shape implemented wrongly and shapes transfer across systems where subsystems do not; a shape census at the checkpoint; the traceability ledger gains a Shape column that determines the other four. New §15 system family field guide — d20/OSR, dice pool, PbtA/FitD, 2d20, percentile, narrative, tactical grid, investigation — each with the shapes it is dense in and its characteristic misses, plus the family-independent truths (every family has a Future-cost rule it forgets, a Threshold that is the point of the game, Once-per-X flags nothing clears, and a Permission the app silences). §13 rewritten in system-neutral terms and grown to twenty-six classes. **Researched against the field:** new §5.1 trust and ownership — a cryptographic RNG rather than `Math.random()`, visible individual dice, the roll log as a fairness record, manual entry as a trust feature, never re-rolling silently; data longevity held to the local-first ideals with an honest statement of what a centralised backend does and does not deliver. §6.3.10 replaces the invented 44px rule with the actual standard (WCAG 2.2 SC 2.5.8: 24×24 with a spacing exception, 44/48 as platform guidance); §6.3.11 adds thumb-zone placement and keeps destructive actions out of the resting arc. §5 sharpens the service-worker strategy by request type and requires the update path to be tested. New §16 field evidence from what players say about existing companion apps — surface divergence, tablets treated as big phones, printing, sync failure being worse than no sync, one app not five — with sources. Backlog gains roll distribution, wake lock, and device hand-off. |
| v2 | 2026-07-06 | Lessons from the Dune: Adventures in the Imperium reference build: new §3 slots (opposed-test sequence 3.2, meta-currencies 3.3, group entity 3.8, scene/session lifecycle 3.12, extended/progress tasks 3.13); mandatory Data Extraction Ledger (§9.1); Stage B split into checkpoint + standard product Q&A (§4.2); local-first default with First Session Playable milestone gating Phase 5; mandatory roll log, JSON export/import, persistent resource header, lifecycle confirm+undo, rules-citation links; notebook extraction warning about summarized procedures; kickoff prompt embedded (§13). |
| v1 | — | Original template from the first reference implementation. |
