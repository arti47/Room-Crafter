# One-Page Mythic — the rules, and where each one happens

A second supplied source, behind `Settings.useMythic` (on by default). The Room
Crafter defers three things to an emulator; this is the emulator.

**It is not Mythic GME 2e.** There is no Chaos Factor: the odds row is the only
input to the chart. That is the one-pager's own simplification, recorded as
ruling A16 rather than treated as a missing piece.

| Rule | Where it happens | Proven by |
|---|---|---|
| Form a yes/no question, assign odds, roll d100, check the chart | `mythic.ask` → `mythic.answerFor`; the odds picker is `sheet.oddsAsker`, shared by the encounter check and the hidden-search question | `R31 the chart resolves at every band boundary` · `R35 Ask The GM records the odds, the roll and the answer` |
| Nine odds rows, four answers, every row covering 1–100 | `ODDS` in `data-mythic.js` | `T11 every Odds row covers 1–100 exactly once` · `R31 better odds never make a Yes less likely` |
| 50/50 when the odds are even or you do not know | `DEFAULT_ODDS`, the picker's starting selection; the quick row is Unlikely / 50-50 / Likely with the full chart behind a fold | the picker opens on it; smoke asserts the quick row's shape |
| An exceptional answer means go beyond what you expected | the answer's own blurb, printed on the result card and on the sheet | `R36 a Mythic answer reaches the encounter record` |
| A double digit on that d100 also generates a Random Event | `mythic.isRandomEvent` inside `mythic.ask` — the same roll read twice, never a second question | `R32 a double fires a Random Event, and nothing else does` · `R35 asking writes one roll, plus two only when an event fires` · smoke samples 400 asks and asserts no mismatch |
| Discover Meaning: Action for active things, Description for descriptive ones | `mythic.discoverMeaning`, default pair Action + Description — which is what the Room Crafter's Random element asks for | `R33 Discover Meaning returns one word per column asked for` · `T12 Discover Meaning covers 1–100 in fifty bands of two` |
| Get more words until an interpretation comes clear | `mythic.anotherWord`, appending to the same record | `R34 another word appends rather than replacing` |
| Any yes/no question about the room | `sheet.askBlock` → `mythic.ask` → `lifecycle.recordQuestion`; kept on the room, in the read-aloud text | `R38 a free question is kept on the room` |
| Fortunate/Unfortunate with no obvious idea | "No idea — Discover Meaning" on the result card | reachable-control check in the interaction audit |

## What the toggle does

Off, the three surfaces revert to what they were before this source arrived:
the app asks the question, you roll it on your own tables, and it records the
answer — each marked `not automated`. Mythic's rules-library entries leave the
library with it, because a rule the app does not apply has no business being
described as one that it does.

The smoke harness asserts both states, and that neither claims the other's copy.

## Provenance

Two sources are mixed now, so every roll says which one it came from: log rows
from this engine carry a **Mythic** badge, as house-aid rolls carry theirs.
