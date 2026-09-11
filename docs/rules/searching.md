# Searching — the rules, and where each one happens

Distilled from `docs/room-crafter-rules.md` §4, §5, §7.

| Rule | Where it happens | Proven by |
|---|---|---|
| One Room Elements roll per Area, ever (ruling A2) | `derived.canSearchArea` gates `roller.searchArea`; the card's control disappears once used and the refusal cites `search` | `R11 an Area takes exactly one roll, and the second is refused` |
| The flag is cleared only by a new room | `lifecycle.newRoom` — the only creation path the UI has, and it throws if a new room arrives with spent flags | `R12 a new room clears the search flags — and nothing else does` |
| Multi-Element gives exactly two Elements (A3) | `roller.expandMultiElement`, a fixed two iterations | `R13 Multi-Element always expands to exactly two sub-Elements` |
| A repeat, or another Multi-Element, becomes Expected (A4) | `roller.resolveSubBand` — the substitution rule on its own, so it can be checked without dice | `R14 a repeat or a nested Multi-Element becomes Expected` |
| Expectations follow face value, not desire | **guidance only.** `sheet.findBlock` prints the note and links the `expectations` entry on every Expected/Enhanced/Minimized result | `R15` is copy; the link is asserted by the smoke walk |
| Fortunate/Unfortunate: obvious idea, else Discover Meaning | `sheet.findBlock` prints the prompt; Discover Meaning itself is blocked (B1) | guidance, marked |
| Random: choose a Meaning table, roll a pair (A11) | `roller.needsMeaning` → table picker → `roller.attachMeaning`; the surface names the Mythic tables this build does not carry | `R17 Random asks for a Meaning pair` |
| Sock Drawer is a meaning table, rolled in pairs (A10) | `roller.rollMeaningPair`; doubles are kept and labelled as amplification | `R18 a Meaning pair is two words from the chosen table, doubles kept` |
| A detail roll on something you have found | `roller.rollDetail` → one `room.details` list, one renderer for Areas and the General Area alike | `R18 a detail roll lands on the room, tagged with its Area` |
| One General Area roll per room, no prerequisite (A1, A12) | `derived.canSearchGeneral` gates `roller.searchGeneralArea`; offered at any budget | `R19`, `R19/A12` |
| Hidden things: your own task mechanic, then a Fate Question | **guidance only** (B1). `lifecycle.recordHidden` stores the answer you got | `R24 hidden searches are recorded, not automated` |
| No obligation to search all, or any, of it | "Done with this room" is always enabled | `R22/R23 a room with nothing searched is a legitimate resting state` |

**Every roll in this table is cryptographic, shown as a face, logged once and
never re-rolled silently** — `core.d100`, `store.logRoll`, and the distribution
view that lets a suspicious table check the app rather than argue with it.
