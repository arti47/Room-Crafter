// data-playtest.js — GENERATED from docs/PLAYTEST.md by tools/gen-playtest.mjs.
// Do not edit by hand: edit the script, then run `node tools/gen-playtest.mjs`.
// Dev aid, not rules content: walked only by the hidden playtest mode.
export const PLAYTEST_STEPS = [
 {
  "n": 1,
  "part": "Part A — first run",
  "section": "",
  "do": "Open the app on an empty install.",
  "check": "**Check:** a full-screen welcome, one panel at a time, Next / Skip. The last panel offers \"Load the example rooms\"."
 },
 {
  "n": 2,
  "part": "Part A — first run",
  "section": "",
  "do": "Tap **Skip**. Then Learn → **Tutorial**.",
  "check": "**Check:** numbered stations. Each one links to where it is done; tapping it opens that screen and pulses the control it means."
 },
 {
  "n": 3,
  "part": "Part A — first run",
  "section": "",
  "do": "In the tutorial, load the example rooms.",
  "check": "**Check:** the demo rooms load into a crawl called Examples, labelled with a house-aid badge as written for this app (process rule 10). Loading them twice resets them rather than stacking copies."
 },
 {
  "n": 4,
  "part": "Part A — first run",
  "section": "",
  "do": "Learn → **Rules**. Type \"two\" in the search.",
  "check": "**Check:** matching entries open on their own. Opening a rule from a link anywhere in the app gives you a Back to where you were."
 },
 {
  "n": 5,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B1. The crawl",
  "do": "Play → **New crawl** → name it → **Create**.",
  "check": "**Check:** the crawl screen is a map with a \"First room\" tile. Journal and Print chips are hidden until there is a room."
 },
 {
  "n": 6,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B1. The crawl",
  "do": "Tap **Add an explorer and a goal** → fill both → Save.",
  "check": "**Check:** the banner shows them with a *house rule* badge."
 },
 {
  "n": 7,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B2. Room 1 — six keywords, every walk permission",
  "do": "Tap the next-room tile. Name it, type a room type or tap **Roll a room type**, leave \"Does this room cover several spaces?\" **off**, budget **Six keywords** → **Start the keyword walk**.",
  "check": "**Check:** a rolled room type shows \"Rolled: … house aid\" (R30). The room bar replaces the app header; the stepper is on Keywords, 0/6."
 },
 {
  "n": 8,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B2. Room 1 — six keywords, every walk permission",
  "do": "**Roll keyword 1.** Type a name on the card → **Make this an Area** (or Enter).",
  "check": "**Check (R1, R2):** one keyword at a time, numbered. The Area appears as a named tile on the plan below, with its keyword under the name. An empty name is refused."
 },
 {
  "n": 9,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B2. Room 1 — six keywords, every walk permission",
  "do": "Roll keyword 2 → **Nothing yet — carry it forward**.",
  "check": "**Check (R3):** keyword 3 arrives on top of 2 (\"Combined\", two dice). The plan shows a dashed tile with both words."
 },
 {
  "n": 10,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B2. Room 1 — six keywords, every walk permission",
  "do": "With the pair on the card, look for the carry button.",
  "check": "**Check (R4):** it is gone, replaced by \"Combining stops at two — see why\". Name the pair → Make this an Area. One Area, two keywords used."
 },
 {
  "n": 11,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B2. Room 1 — six keywords, every walk permission",
  "do": "Roll 4 and 5 and make each an Area. Roll **6**.",
  "check": "**Check (R5):** \"Drop it and finish\" appears only now, on the last keyword. Tap it. **Check:** the toast says \"Dropped…\". The walk ends; the facts chips read 6 of 6 rolled with 3–6 Areas (R6). **Go to the room** opens on **Describe**."
 },
 {
  "n": 12,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B3. Describe and encounter",
  "do": "**Describe it** → write two sentences, mentioning something that is *not* one of your Areas.",
  "check": "**Check (R8):** the text shows as a page with a drop cap. No new Area or tile was created. Tap the text or the quill to edit it."
 },
 {
  "n": 13,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B3. Describe and encounter",
  "do": "The bar now says **Next: Encounter** → tap it.",
  "check": "**Check:** a coach strip under the heading, the odds dial resting at 50/50, and the bar's Ask reading \"(50/50)\"."
 },
 {
  "n": 14,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B3. Describe and encounter",
  "do": "Drag the dial to **Likely**.",
  "check": "**Check:** the bar's label changes to \"(Likely)\" and the band strip under the dial redraws. There is no second Ask button."
 },
 {
  "n": 15,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B3. Describe and encounter",
  "do": "Tap **Ask: is there an encounter? (Likely)**.",
  "check": "**Check (R35):** one die, the answer with \"at Likely\", the band strip with the roll marked. A double (11, 22 … 99) also shows a **Random Event** with two words (R32) — note it if it happens. Type a line under \"What is it?\" → **Good**."
 },
 {
  "n": 16,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B3. Describe and encounter",
  "do": "Tap the Encounter stage again.",
  "check": "**Check:** the answer card and your line are shown. **Clear** asks to confirm and names what is lost; cancel it."
 },
 {
  "n": 17,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Go to **Search**.",
  "check": "**Check:** the plan fills the width: named tiles, the General Area along the bottom wall, unsearched Areas as rows below with \"Search this Area\". The bar reads \"Search: <first Area>\"."
 },
 {
  "n": 18,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Tap an unsearched tile.",
  "check": "**Check (R11, R29):** the result sheet shows one d100, the Element, its glyph, the band strip with the roll marked and the Element's blurb. The tile turns solid in the find's colour (red for Unfortunate, green for Fortunate)."
 },
 {
  "n": 19,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Tap the same tile again.",
  "check": "**Check (R11):** it opens the card; it **never rolls again**. Look in Log to confirm there is exactly one Room Elements roll for it."
 },
 {
  "n": 20,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Search the remaining Areas from the tiles or the rows. As each Element comes up, check its own rule:\n- **Expected / Enhanced / Minimized** → the \"face value, not the wish\" note and its rule link (R15, guidance only).\n- **Fortunate / Unfortunate** → \"use the obvious idea\", plus **No idea — Discover Meaning**. Tap it, then **+ Action** or **+ Description**: each adds a word and never replaces one (R16, R33, R34).\n- **Random** → choose a table: Discover Meaning, Room Descriptors or Sock Drawer. A pair of words lands; doubles are kept (R17, R18).\n- **Multi-Element** → exactly two sub-Elements. A repeat or a nested Multi-Element is shown as replaced by Expected (R13, R14). The die decides which of these you see. Use the example rooms (step 3) to look at any you didn't roll.",
  "check": ""
 },
 {
  "n": 21,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "On a searched card: **Roll a detail** → a Sock Drawer pair tied to that Area (R18). **Add a note** → saved on the card.",
  "check": ""
 },
 {
  "n": 22,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Before searching the General Area, check the header: the state chip reads Part searched and Search N/M counts explorable places (Areas + 1).",
  "check": ""
 },
 {
  "n": 23,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Tap the General Area strip on the plan (or **Search the General Area**).",
  "check": "**Check (R19, R20):** one roll only. When it is the last search, the chip flips to **Fully explored** on this roll, not before. The General Area can take a detail too."
 },
 {
  "n": 24,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B4. Search — one roll per Area",
  "do": "Areas heading → **Edit** → ✎ rename one, ▲▼ move one → Done.",
  "check": "**Check (R26):** the tiles and the cards follow. The find itself can't be edited."
 },
 {
  "n": 25,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B5. The + menu",
  "do": "Tap **+** in the bar → **Hidden things**.",
  "check": "**Check (R24):** the \"your own game's search mechanic first\" text is always shown in full. Ask at any odds; the answer is kept in the list."
 },
 {
  "n": 26,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B5. The + menu",
  "do": "**+** → **Ask the GM** → type any yes/no question → Ask.",
  "check": "**Check (R38):** kept on the room with odds, roll and answer."
 },
 {
  "n": 27,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B5. The + menu",
  "do": "**+** → **Notes** → write something.",
  "check": ""
 },
 {
  "n": 28,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B5. The + menu",
  "do": "While a sheet is open, tap the **Log** tab.",
  "check": "**Check:** the sheet closes on leaving the screen. Go back."
 },
 {
  "n": 29,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B6. Done, Record, journal",
  "do": "Stepper → **Done**.",
  "check": "**Check (R22):** the stamp, the named plan, summary tiles, no \"conclusion\" anywhere and no further roll. The goal question (Closer / No change / Further, house rule) is there. Tap one, then tap it again — it clears."
 },
 {
  "n": 30,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B6. Done, Record, journal",
  "do": "Stepper → **Record**.",
  "check": "**Check:** everything on one page with a jump row; the bar walks the procedure."
 },
 {
  "n": 31,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B6. Done, Record, journal",
  "do": "**⋯** (room bar) → **Journal**.",
  "check": "**Check:** the room as a chapter, every roll a line in the order made, with your sentences. An unwritten line shows a quiet \"+ What is it?\". Tap it, write, save."
 },
 {
  "n": 32,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B6. Done, Record, journal",
  "do": "**⋯** → **Read-aloud text** → Share or Copy. Paste it somewhere.",
  "check": "**Check (R36):** it has the description, the encounter with its odds/roll, the finds, the hidden searches, the questions, your lines and the goal."
 },
 {
  "n": 33,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B6. Done, Record, journal",
  "do": "**⋯** → **Print this room** → Print (or save as PDF).",
  "check": "**Check:** one page, the plan, no buttons, and a roll appendix that matches the Log."
 },
 {
  "n": 34,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B7. Room 2 — three keywords, skipping",
  "do": "Done → **Next room in this crawl**.",
  "check": "**Check (R28):** the budget picker defaults to whatever room 1 used. Pick **Three keywords** this time."
 },
 {
  "n": 35,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B7. Room 2 — three keywords, skipping",
  "do": "Walk three keywords (one Area each). Then, on Encounter, tap **Skip the question**.",
  "check": "**Check (R9):** \"Not asked for this room\", with \"Ask it after all\"."
 },
 {
  "n": 36,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B7. Room 2 — three keywords, skipping",
  "do": "Search **one** Area only, then stepper → Done.",
  "check": "**Check (R21, R23):** the state is Part searched, and the hint says that is a real, finished state. **Earlier room / Later room** move between rooms 1 and 2."
 },
 {
  "n": 37,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B8. Room 3 — leaving mid-walk, several spaces",
  "do": "Next room: turn **\"Does this room cover several spaces?\"** on and fill the note; type a room type that isn't on the list (e.g. \"Bathysphere\").",
  "check": "**Check (R25, R27):** both accepted. The note shows on the sheet and the print record."
 },
 {
  "n": 38,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B8. Room 3 — leaving mid-walk, several spaces",
  "do": "Roll two keywords, then press the bottom **Play** tab.",
  "check": "**Check:** home leads with **Continue** for this room. Tapping it brings you back to the walk exactly where you left it."
 },
 {
  "n": 39,
  "part": "Part B — Crawl 1, Mythic on: the full procedure",
  "section": "B8. Room 3 — leaving mid-walk, several spaces",
  "do": "Finish the walk. Then open the crawl.",
  "check": "**Check:** the map has three tiles with type, Areas searched and state; the open room is lit. **Journal** shows three chapters. **Print** prints one room per page."
 },
 {
  "n": 40,
  "part": "Part C — Mythic off",
  "section": "",
  "do": "Settings → Content → turn **Use One-Page Mythic** off. Open a room's Encounter stage.",
  "check": "**Check (R10, R37):** no dial. \"Roll the question on your own tables and record\" with a **not automated** badge. Record an answer."
 },
 {
  "n": 41,
  "part": "Part C — Mythic off",
  "section": "",
  "do": "Search an Area that comes up Fortunate or Unfortunate (or open one).",
  "check": "**Check (R16):** \"No idea? Ask a Fate Question or Discover Meaning on your own tables.\" There is no Discover Meaning button."
 },
 {
  "n": 42,
  "part": "Part C — Mythic off",
  "section": "",
  "do": "**+** → Hidden things → record by hand. Learn → Rules.",
  "check": "**Check (R37):** the Mythic rules are gone from the library. Turn Mythic back **on**; they return."
 },
 {
  "n": 43,
  "part": "Part D — Log and distribution",
  "section": "",
  "do": "**Log**.",
  "check": "**Check:** grouped by room, each room heading links to the room, keyword walks collapsed into one row of dice, Mythic and house-aid rolls badged. The filter row scrolls sideways and fades at its edge."
 },
 {
  "n": 44,
  "part": "Part D — Log and distribution",
  "section": "",
  "do": "**Distribution**.",
  "check": "**Check (R39):** ten bands with an expected line, and the 10×10 face grid. Its total counts every roll ever made, even past the 200-roll log cap."
 },
 {
  "n": 45,
  "part": "Part E — Settings and safety",
  "section": "",
  "do": "Theme System / Light / Dark; text size Normal / Larger / Largest.",
  "check": "**Check:** everything stays readable; the room bar and pinned bar never cover content."
 },
 {
  "n": 46,
  "part": "Part E — Settings and safety",
  "section": "",
  "do": "Turn **Show house-aid suggestions** off.",
  "check": "**Check:** no room-type list, no Roll a room type. Turn it back on."
 },
 {
  "n": 47,
  "part": "Part E — Settings and safety",
  "section": "",
  "do": "**Your data** → Export JSON (and the text export). **Check my data**.",
  "check": ""
 },
 {
  "n": 48,
  "part": "Part E — Settings and safety",
  "section": "",
  "do": "**Undo and erase** → **Undo: …** (the last thing you did).",
  "check": "**Check:** it is undone and named in the toast."
 },
 {
  "n": 49,
  "part": "Part E — Settings and safety",
  "section": "",
  "do": "**Erase everything** → confirm → tap **Undo** on the toast.",
  "check": "**Check:** everything is back. Then Import the JSON from step 47 on top. **Check:** nothing duplicated or lost; the face counts survive."
 },
 {
  "n": 50,
  "part": "Part F — tablet and offline",
  "section": "",
  "do": "On a tablet or a wide window (≥760px): a room.",
  "check": "**Check:** the stepper becomes a rail on the left; Search shows the plan beside the cards; the walk shows the deck beside the plan; Distribution shows the chart beside the face grid."
 },
 {
  "n": 51,
  "part": "Part F — tablet and offline",
  "section": "",
  "do": "Install to the home screen, switch to airplane mode, open it.",
  "check": "**Check:** it boots and plays offline; rolls still work."
 }
];
