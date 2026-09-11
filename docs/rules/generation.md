# Generation — the rules, and where each one happens

Distilled from `docs/room-crafter-rules.md` §2. Read each sentence and ask:
*where does this happen in code?* Where this file and the source disagree, the
source wins and this file is corrected.

| Rule | Where it happens | Proven by |
|---|---|---|
| Roll six keywords, one at a time, in order | `wizard.rollNext` → `roller.rollKeyword`; the wizard renders one step per keyword and will not roll past the budget | `R1 keywords arrive one at a time, numbered in order`, `R1 rolling past the budget is refused` |
| A keyword that inspires becomes an Area on its own | `wizard.makeArea` with one pending keyword | `R2 one keyword can become an Area on its own` |
| One that does not is carried and combined with the next | `wizard.carryForward`, which rolls the next keyword and leaves both pending | `R3 a carried pair makes one Area and consumes both keywords` |
| Combining stops at two (ruling A7) | `MAX_COMBINE` in `data.js`, enforced in `wizard.canCarry`; the refusal cites `combine-cap` | `R4 combining stops at two`, `R4 six keywords never yield fewer than three Areas` |
| The final keyword may be dropped (ruling A8) | `wizard.canDrop` — true only when no keywords remain to roll | `R5 dropping is refused until the final keyword` |
| Three to six Areas from six keywords; two to three from three | `BUDGETS` in `data.js`, `derived.areaCount`; structurally guaranteed by the two-keyword cap | `R4`, `R6/R7` |
| The three-keyword variant for crawls | budget picker in `wizard.newRoomForm`; carried to the next room by `lifecycle.nextRoom` | `R6/R7`, `R28` |
| Embellishments are not Areas | `sheet.descriptionBlock` — free text on the room, never an Area record | no Area is created from the description; `R8` is structural |
| A room may cover several connected spaces | `context.multiRoomNote`, collected in `wizard.newRoomForm`, shown on the sheet | `R25 the multi-room note persists on the record` |
| A room may be any close space | free-text room type; the house-aid list only suggests | `R27 a room type the house-aid list has never heard of is accepted` |

**Not automated, and marked as such:** the interpretation itself. The app will
not suggest what a keyword means — that is the one thing the tool exists to
leave alone, and a generator here would replace the reader.
