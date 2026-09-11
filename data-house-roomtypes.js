// data-house-roomtypes.js — HOUSE AID. Not from the source.
// The article defines what a room is but publishes no table of room types.
// These are invented conveniences and the UI labels them as such wherever rolled.
// No setting content: things are named by what they are, never by place or brand.
export const HOUSE_AID = true;

// T9 · Room-type starter list
export const ROOM_TYPES = [
  "Bedroom", "Kitchen", "Living space", "Workshop", "Study", "Storeroom",
  "Cellar", "Attic", "Bathroom", "Hallway", "Stairwell", "Office", "Shop floor",
  "Back room", "Cabin", "Crew quarters", "Cockpit", "Engine space", "Airlock",
  "Laboratory", "Infirmary", "Cell", "Guardroom", "Shrine", "Crypt", "Vault",
  "Dungeon chamber", "Corridor", "Cave mouth", "Cavern", "Grotto", "Tunnel",
  "Clearing", "Rooftop", "Vehicle interior", "Tent", "Stall", "Pantry"
];

// T10 · Neutral demo rooms for the tutorial. House content, not the article's
// worked examples (ruling A13) — those are fiction and stay out of the build.
export const DEMO_ROOMS = [
  {
    label: "A locksmith's back room",
    roomType: "Workshop",
    budget: 6,
    description: "Narrow and over-full. Somebody works here every day and tidies here never.",
    keywords: [
      { n: 1, roll: 88, word: "Tool", use: "area" },
      { n: 2, roll: 20, word: "Crammed", use: "combined" },
      { n: 3, roll: 75, word: "Shelves", use: "area" },
      { n: 4, roll: 54, word: "Lock", use: "area" },
      { n: 5, roll: 30, word: "Discarded", use: "combined" },
      { n: 6, roll: 40, word: "Garbage", use: "area" }
    ],
    areas: [
      { name: "A workbench under a rack of hanging tools", fromKeywords: [1] },
      { name: "Shelves crammed to the ceiling with parts trays", fromKeywords: [2, 3] },
      { name: "A strongbox with its lock half dismantled", fromKeywords: [4] },
      { name: "A bin of discarded brass shavings and failed cuts", fromKeywords: [5, 6] }
    ]
  },
  {
    label: "A flooded side tunnel",
    roomType: "Tunnel",
    budget: 3,
    description: "Ankle-deep and colder than the passage behind you. The water is going somewhere.",
    keywords: [
      { n: 1, roll: 97, word: "Water", use: "area" },
      { n: 2, roll: 51, word: "Ledge", use: "area" },
      { n: 3, roll: 8, word: "Broken", use: "area" }
    ],
    areas: [
      { name: "Standing water with something under the surface", fromKeywords: [1] },
      { name: "A dry ledge above the waterline", fromKeywords: [2] },
      { name: "A collapsed section blocking the far end", fromKeywords: [3] }
    ]
  }
];
