// data.js — Room Crafter core rules library.
// Source: Mythic Magazine Vol. 69, "Variations: Single Room Explorations".
// Distilled reference: docs/room-crafter-rules.md. Ledger: CLAUDE.md §4 (T1–T8).
// Effect prose is paraphrased; only single-word table keywords are literal.

// ── T1 · Room Descriptors Meaning table (d100) ───────────────────────────────
export const ROOM_DESCRIPTORS = [
  "Active", "Art", "Beautiful", "Bed", "Belongings", "Bleak", "Bright", "Broken",
  "Busy", "Ceiling", "Chair", "Chaos", "Character", "Cloth", "Clothes", "Cold",
  "Collection", "Container", "Covered", "Crammed", "Cramped", "Creature",
  "Currency", "Damaged", "Danger", "Dark", "Deliberate", "Device", "Dim",
  "Discarded", "Display", "Exits", "Expected", "Extra", "Faded", "Fixture",
  "Floor", "Food", "Furniture", "Garbage", "Goods", "Grand", "Heavy", "Humble",
  "Image", "Incomplete", "Information", "Instrument", "Interesting", "Large",
  "Ledge", "Light", "Liquid", "Lock", "Map", "Mechanism", "Medicine", "Messy",
  "Missing", "Mundane", "Natural", "Object", "Occupied", "Open", "Ornament",
  "Ornate", "Partition", "Personal", "Plant", "Pristine", "Sacred", "Scenery",
  "Seating", "Secured", "Shelves", "Small", "Smell", "Sound", "Sparse",
  "Storage", "Strange", "Substance", "Supply", "Symbol", "Table", "Text",
  "Tidy", "Tool", "Unexpected", "Unknown", "Unpleasant", "Useful", "Valuable",
  "Vessel", "Wall", "Warm", "Water", "Weapon", "Window", "Wrecked"
];

// ── T2 · Sock Drawer Meaning table (d100) ────────────────────────────────────
export const SOCK_DRAWER = [
  "Amusing", "Assorted", "Black", "Blue", "Bright", "Clean", "Clothing",
  "Coarse", "Coin", "Colorful", "Concealed", "Cute", "Deep", "Delicate",
  "Design", "Dirty", "Drab", "Dusty", "Empty", "Expected", "Exquisite", "Extra",
  "Extravagant", "Faded", "Festive", "Filled", "Fine", "Fitting", "Folded",
  "Footwear", "Forgotten", "Formal", "Fresh", "Full", "Green", "Heavy",
  "Hidden", "Hosiery", "Image", "Interesting", "Jumbled", "Juvenile", "Large",
  "Light", "Long", "Loose", "Maintained", "Mended", "Mismatched", "Mundane",
  "Musty", "Neglected", "New", "Old", "Orange", "Ornate", "Pair", "Patched",
  "Patterned", "Petite", "Plain", "Purple", "Red", "Rolled", "Rough", "Rustic",
  "Sagging", "Seasonal", "Shallow", "Short", "Simple", "Single", "Small",
  "Sock", "Soft", "Solid", "Sorted", "Stained", "Stocking", "Storage",
  "Strange", "Stretched", "Striped", "Stuck", "Stylish", "Tattered", "Thick",
  "Threadbare", "Tidy", "Tight", "Tool", "Torn", "Unexpected", "Uniform",
  "Warm", "Wedged", "White", "Wobbling", "Wrapping", "Yellow"
];

export const MEANING_TABLES = [
  { id: "descriptors", name: "Room Descriptors", rows: ROOM_DESCRIPTORS },
  { id: "sock", name: "Sock Drawer", rows: SOCK_DRAWER }
];

// ── T3 · Room Elements (d100 bands) ──────────────────────────────────────────
// One roll per explorable Area. No Conclusion Element exists in this system.
export const ROOM_ELEMENTS = [
  { id: "expected", min: 1, max: 40, name: "Expected",
    blurb: "It is what it looks like, and holds what you would expect it to hold." },
  { id: "enhanced", min: 41, max: 50, name: "Enhanced Expected",
    blurb: "What you expected, with something more to it — worth more, or matters more." },
  { id: "minimized", min: 51, max: 65, name: "Minimized Expected",
    blurb: "What you expected, but lesser — worth less, or matters less." },
  { id: "fortunate", min: 66, max: 70, name: "Fortunate",
    blurb: "Something here is good for you. Use the obvious idea if you have one." },
  { id: "unfortunate", min: 71, max: 80, name: "Unfortunate",
    blurb: "Something here is bad for you. Use the obvious idea if you have one." },
  { id: "random", min: 81, max: 95, name: "Random",
    blurb: "Pick a Meaning table and roll a keyword pair to interpret." },
  { id: "multi", min: 96, max: 100, name: "Multi-Element",
    blurb: "Two Elements at once. A repeat, or Multi-Element again, becomes Expected." }
];

// ── T4 · "Is there an encounter?" answer bands ───────────────────────────────
// Resolved by the Fate Chart, which this build does not carry (blocked, B1).
export const ENCOUNTER_ANSWERS = [
  { id: "exYes", name: "Exceptional Yes",
    blurb: "An encounter, and it is important or special." },
  { id: "yes", name: "Yes", blurb: "There is an encounter." },
  { id: "no", name: "No", blurb: "Nothing is waiting for you." },
  { id: "exNo", name: "Exceptional No", blurb: "Nothing is waiting for you." }
];

// ── T5 · Keyword budgets and the Area ranges they produce ────────────────────
export const BUDGETS = [
  { keywords: 6, label: "Six keywords", areas: [3, 6], total: [4, 7],
    note: "The default. Three to six Areas, plus the General Area." },
  { keywords: 3, label: "Three keywords", areas: [2, 3], total: [3, 4],
    note: "The crawl variant — faster rooms when you are making many." }
];
export const MAX_COMBINE = 2; // Ruling A7: combinations cap at two keywords.
export const ROLL_LOG_CAP = 200;
export const UNDO_CAP = 20;

// ── T6 · Rules library ───────────────────────────────────────────────────────
// Paraphrased. `cite` points at the section of docs/room-crafter-rules.md.
export const RULES_LIBRARY = [
  { id: "what-is-a-room", group: "Before you start", title: "What counts as a room",
    cite: "§1",
    body: "Any small personal space varied enough to explore and quick enough to take in at a glance — a bedroom, a dungeon chamber, a crew cabin, a shallow cave, a car, a forest clearing. It need not have walls; it needs a boundary in your head. A simple apartment can be one room if a thirty-second walk shows you all of it." },
  { id: "generation", group: "Making the room", title: "Rolling the keywords",
    cite: "§2",
    body: "Roll six keywords one at a time, in order. If a keyword suggests something, make it an Area. If it does not, carry it forward and combine it with the next one. Keep going until the keywords run out. You end with three to six Areas — and the Areas are also the room's description." },
  { id: "combine-cap", group: "Making the room", title: "Combining stops at two",
    cite: "§2 · ruling A7",
    body: "A carried keyword combines with the next one and no further. Chaining three would let six keywords produce only two Areas, and the rules say three to six." },
  { id: "drop-last", group: "Making the room", title: "Dropping the last keyword",
    cite: "§2 · ruling A8",
    body: "If you reach the final keyword and nothing comes, drop it and go with what you have. Only the final one may be dropped — earlier ones get carried forward instead." },
  { id: "embellish", group: "Making the room", title: "Everything else you picture",
    cite: "§2",
    body: "Add whatever the room obviously needs — a window, boots by the wall, the smell of it. Those details are not Areas and cannot be searched. The Areas are the things the keywords gave you." },
  { id: "encounter", group: "Making the room", title: "Is there an encounter?",
    cite: "§6 · ruling A9",
    body: "Ask once, after you have described the room and before you start searching. This tool does not carry the Fate Chart, so roll the question on your own Mythic tables and record the answer here." },
  { id: "search", group: "Searching", title: "One roll per Area",
    cite: "§4 · ruling A2",
    body: "Each Area gets exactly one roll on Room Elements — never a second. You are under no obligation to search anything; a room you only looked at is a finished room." },
  { id: "expectations", group: "Searching", title: "What you expect, not what you want",
    cite: "§4",
    body: "Expected, Enhanced and Minimized all read the thing at face value. Looking under a bed gets you bed things, however badly you want the grimoire. What you want is handled by Fortunate and Unfortunate, which ignore face value and ask what would be good or bad for you." },
  { id: "multi", group: "Searching", title: "Multi-Element",
    cite: "§4 · rulings A3, A4",
    body: "Roll twice more for two separate Elements. If the second repeats the first, or comes up Multi-Element again, it becomes Expected — so you always end with exactly two and the chain always stops." },
  { id: "random", group: "Searching", title: "Random",
    cite: "§4 · ruling A11",
    body: "Choose a Meaning table and roll a keyword pair to interpret. Mythic's own Actions and Descriptions tables are not in this build; the two tables from the article are." },
  { id: "general-area", group: "Searching", title: "The General Area",
    cite: "§5 · rulings A1, A12",
    body: "One bonus Area: the room itself, everything not immediately obvious. One roll on Room Elements, at any keyword budget, with nothing needed first." },
  { id: "hidden", group: "Searching", title: "Hidden things",
    cite: "§7",
    body: "This tool reports what is apparent. For a secret door or a stashed object, use your own game's search mechanic, then ask 'Is something hidden found?' at whatever odds you think fair. Record the answer here." },
  { id: "complete", group: "Searching", title: "When the room is done",
    cite: "§4, §5 · rulings A14, A22",
    body: "There is no Conclusion Element. The room is fully known once every Area and the General Area have been rolled. Leave Areas unsearched and the room is described rather than searched — a real state, not an unfinished one." },
  { id: "crawl", group: "Going further", title: "Chaining rooms into a crawl",
    cite: "§8",
    body: "Run rooms back to back for a dungeon. Use three keywords instead of six to keep it moving, and remember a 'room' can be a corridor, a cavern or a pool." }
];

// ── T7 · Per-screen explain() copy ───────────────────────────────────────────
export const EXPLAIN = {
  crawls: "A crawl is a run of rooms — a dungeon, a house, an evening's exploring. Everything you generate lands in one, and finished crawls stay here to read back.",
  crawl: "The rooms of this crawl, in the order you made them. Open one to search it, or add the next.",
  wizard: "Keywords arrive one at a time. Take one that inspires you and make it an Area; carry one that does not and combine it with the next. The app enforces the order, the cap and the count — the interpretation is yours.",
  room: "This is the room: its Areas, its description, and what searching turned up. Each Area gets exactly one roll on Room Elements, plus one for the General Area — the room itself.",
  log: "Every d100 this app has rolled, newest first, with the table it came from and the room it belonged to. Nothing is rolled twice and nothing is rolled unseen.",
  distribution: "How often each face has come up across every roll. It is here so you can check the dice rather than argue about them.",
  rules: "The Room Crafter's procedure in the app's own words, in the order you use it. Every automated surface links back into this list.",
  tutorial: "A first room, start to finish. Work down it with the app open; each step says what to tap and why the procedure asks for it.",
  settings: "Theme, text size, and your data. Export writes a JSON file you can read and re-import; the read-aloud export writes the room as plain text you can hand to someone."
};

// ── T8 · Tutorial ────────────────────────────────────────────────────────────
export const TUTORIAL = [
  { title: "Start a crawl", body: "Everything lives in a crawl. Make one and name it after wherever you are exploring. One room is a perfectly good crawl." },
  { title: "Name the room and pick a budget", body: "Six keywords is the default and gives three to six Areas. Choose three if you are making a lot of rooms in a row — you get two or three Areas, which is enough to know what stands out." },
  { title: "Walk the keywords", body: "Take them one at a time and do not dwell. If a word suggests something in this room, make it an Area and name it. If it does not, carry it forward — the next word will usually rescue it." },
  { title: "Say what the room looks like", body: "The Areas are the room's main features, so write the description from them. Add whatever else obviously belongs. Those extras are scenery, not Areas, and you cannot search them." },
  { title: "Ask whether anything is here", body: "Before you touch anything, ask 'Is there an encounter?' on your Mythic tables and record the answer. It is the difference between an empty room and a room with a sleeping troll in it." },
  { title: "Search an Area", body: "One roll, and one roll only. Read the Element against the thing at face value: a shelf of bottles holds bottles. Wanting something else is what Fortunate is for." },
  { title: "Handle a Multi-Element", body: "Two Elements at once. The app rolls both and converts a repeat into Expected, so the chain always ends after two. Interpret them as one find with two aspects." },
  { title: "Search the General Area", body: "One last roll for the room itself — the loose floorboard, the thing in the bin. It is where the article's own example finally found the grimoire." },
  { title: "Finish the room", body: "There is no conclusion roll. When the Areas and the General Area are done, the room is done. Leave some unsearched if your character was only passing through." },
  { title: "Take it with you", body: "Read-aloud export writes the room as plain text for the table. JSON export writes everything, and imports back. Both are in Settings." }
];
