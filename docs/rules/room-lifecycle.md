# The room's life — the rules, and where each one happens

Distilled from `docs/room-crafter-rules.md` §2, §5, §6, §8.

| Rule | Where it happens | Proven by |
|---|---|---|
| Enter → Areas → describe → encounter check → search → General Area → done | `derived.nextStep` decides the step; `sheet.primaryAction` pins it: ask (or skip) → each Area → General Area → finish | `the primary action walks the article's order` · the smoke walk asserts the primary asks before it searches, then moves on |
| The encounter question may be passed over | `lifecycle.skipEncounter`, a link under the primary; recorded so the export says "not asked" | `skipping the encounter is a permission` |
| The encounter check is asked after describing and before searching (A9) | `sheet.encounterBlock`, above the Area list; a nudge appears while the room has no description | `R9/R10 the encounter answer is recorded, and can be cleared` |
| Resolving the question needs the Fate Chart | **guidance only** (B1) — the app asks, you answer from your own tables, it records | same |
| There is no Conclusion Element | `lifecycle.roomSummary` + `sheet.finishRoom` offer no further roll | `R22/R23`; the smoke harness asserts the summary never says "conclusion" |
| Fully known = every Area plus the General Area rolled | `derived.isComplete` | `R20 complete flips on the last roll, not before` |
| Leaving Areas unsearched is a real state, not an unfinished one | `derived.searchState` → `described` / `searching` / `complete`, shown in the persistent header | `R21 a skipped Area leaves the room described or part searched` |
| Areas are placed where they seem most fitting, and may be renamed | `lifecycle.renameArea` · `lifecycle.moveArea`; the find is never editable | `R26 an Area can be renamed` · `R26 Areas can be reordered` |
| Rooms chain into a crawl | `lifecycle.nextRoom` carries the crawl and the keyword budget forward | `R28 the next room joins the same crawl and inherits the budget` |
| Fewer keywords for a crawl | the budget picker defaults to the previous room's budget | `R6/R7` |

**Boundaries report and undo.** Deleting a room or a crawl, clearing the log and
erasing everything each name what is lost before doing it, and offer one-step
undo afterwards — `store.snapshot` / `store.undo`, one stack, every mutating
action pushing to it.
