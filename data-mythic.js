// data-mythic.js — One-Page Mythic, the super simple Game Master Emulator.
// A second supplied source, behind its own toggle (Settings.useMythic).
// Source: the One-Page Mythic reference sheet, Word Mill Games.
// It is NOT Mythic GME 2e: there is no Chaos Factor here, and the odds row is
// the only input to the chart. That is the one-pager's own simplification, and
// ruling A16 records it as the resolution engine this build uses.
// Effect prose is paraphrased; only the single-word table entries are literal.

export const MYTHIC = true;

// ── T11 · Ask The Game Master chart ─────────────────────────────────────────
// Nine Odds, four answers, d100. Every row covers 1–100 contiguously; the unit
// harness asserts that rather than trusting the transcription.
export const ODDS = [
  { id: "certain",     name: "Certain",             exYes: [1, 18], yes: [19, 90], no: [91, 98], exNo: [99, 100] },
  { id: "nearlyCert",  name: "Nearly Certain",      exYes: [1, 17], yes: [18, 85], no: [86, 97], exNo: [98, 100] },
  { id: "veryLikely",  name: "Very Likely",         exYes: [1, 15], yes: [16, 75], no: [76, 95], exNo: [96, 100] },
  { id: "likely",      name: "Likely",              exYes: [1, 13], yes: [14, 65], no: [66, 93], exNo: [94, 100] },
  { id: "fifty",       name: "50/50 or Unknown",    exYes: [1, 10], yes: [11, 50], no: [51, 90], exNo: [91, 100] },
  { id: "unlikely",    name: "Unlikely",            exYes: [1, 7],  yes: [8, 35],  no: [36, 87], exNo: [88, 100] },
  { id: "veryUnlikely",name: "Very Unlikely",       exYes: [1, 5],  yes: [6, 25],  no: [26, 85], exNo: [86, 100] },
  { id: "nearlyImp",   name: "Nearly Impossible",   exYes: [1, 3],  yes: [4, 15],  no: [16, 83], exNo: [84, 100] },
  { id: "impossible",  name: "Impossible",          exYes: [1, 2],  yes: [3, 10],  no: [11, 82], exNo: [83, 100] }
];

export const DEFAULT_ODDS = "fifty";

// The four answers, in chart-column order. Ids match the Room Crafter's own
// encounter bands (data.js ENCOUNTER_ANSWERS) so one resolver serves both.
export const ANSWERS = [
  { id: "exYes", key: "exYes", name: "Exceptional Yes", blurb: "Yes, and more — go beyond what you expected." },
  { id: "yes",   key: "yes",   name: "Yes",             blurb: "Yes. Follow your expectations." },
  { id: "no",    key: "no",    name: "No",              blurb: "No. Follow your expectations; if you cannot see how, Discover Meaning." },
  { id: "exNo",  key: "exNo",  name: "Exceptional No",  blurb: "No, and beyond what you expected." }
];

// ── T13 · Random Events ─────────────────────────────────────────────────────
// Asking the GM and rolling a double digit generates a Random Event, whatever
// the answer was. Nine triggers; 100 is not a double.
export const RANDOM_EVENT_ROLLS = [11, 22, 33, 44, 55, 66, 77, 88, 99];

// ── T12 · Discover Meaning ──────────────────────────────────────────────────
// Fifty bands of two, two columns. Action for active elements, Description for
// descriptive ones. Roll more words until an interpretation comes clear.
export const DISCOVER_MEANING = [
  { min: 1,  max: 2,   action: "Attain",       description: "Artificial" },
  { min: 3,  max: 4,   action: "Benefit",      description: "Beautiful" },
  { min: 5,  max: 6,   action: "Betray",       description: "Bleak" },
  { min: 7,  max: 8,   action: "Break",        description: "Bright" },
  { min: 9,  max: 10,  action: "Burden",       description: "Clean" },
  { min: 11, max: 12,  action: "Change",       description: "Cold" },
  { min: 13, max: 14,  action: "Character",    description: "Colorful" },
  { min: 15, max: 16,  action: "Communicate",  description: "Damaged" },
  { min: 17, max: 18,  action: "Competition",  description: "Dangerous" },
  { min: 19, max: 20,  action: "Conclude",     description: "Dark" },
  { min: 21, max: 22,  action: "Conflict",     description: "Dirty" },
  { min: 23, max: 24,  action: "Control",      description: "Disagreeable" },
  { min: 25, max: 26,  action: "Create",       description: "Empty" },
  { min: 27, max: 28,  action: "Danger",       description: "Extravagant" },
  { min: 29, max: 30,  action: "Deceit",       description: "Feeble" },
  { min: 31, max: 32,  action: "Decrease",     description: "Fragrant" },
  { min: 33, max: 34,  action: "Delay",        description: "Frightening" },
  { min: 35, max: 36,  action: "Distant",      description: "Full" },
  { min: 37, max: 38,  action: "Emotions",     description: "Healthy" },
  { min: 39, max: 40,  action: "Enemies",      description: "Heavy" },
  { min: 41, max: 42,  action: "Environment",  description: "Helpful" },
  { min: 43, max: 44,  action: "Expectations", description: "Important" },
  { min: 45, max: 46,  action: "Failure",      description: "Incomplete" },
  { min: 47, max: 48,  action: "Fears",        description: "Lacking" },
  { min: 49, max: 50,  action: "Fight",        description: "Large" },
  { min: 51, max: 52,  action: "Gain",         description: "Light" },
  { min: 53, max: 54,  action: "Goals",        description: "Loud" },
  { min: 55, max: 56,  action: "Good",         description: "Mechanical" },
  { min: 57, max: 58,  action: "Harm",         description: "Modern" },
  { min: 59, max: 60,  action: "Help",         description: "Mundane" },
  { min: 61, max: 62,  action: "Increase",     description: "Mysterious" },
  { min: 63, max: 64,  action: "Information",  description: "Natural" },
  { min: 65, max: 66,  action: "Leave",        description: "New" },
  { min: 67, max: 68,  action: "Move",         description: "Official" },
  { min: 69, max: 70,  action: "Mundane",      description: "Old" },
  { min: 71, max: 72,  action: "Nature",       description: "Peaceful" },
  { min: 73, max: 74,  action: "Negative",     description: "Perfect" },
  { min: 75, max: 76,  action: "NPC",          description: "Powerful" },
  { min: 77, max: 78,  action: "Object",       description: "Quiet" },
  { min: 79, max: 80,  action: "Obstacle",     description: "Reassuring" },
  { min: 81, max: 82,  action: "Official",     description: "Rotten" },
  { min: 83, max: 84,  action: "PC",           description: "Rough" },
  { min: 85, max: 86,  action: "Positive",     description: "Ruined" },
  { min: 87, max: 88,  action: "Progress",     description: "Rustic" },
  { min: 89, max: 90,  action: "Setback",      description: "Simple" },
  { min: 91, max: 92,  action: "Start",        description: "Small" },
  { min: 93, max: 94,  action: "Stop",         description: "Strange" },
  { min: 95, max: 96,  action: "Strange",      description: "Stylish" },
  { min: 97, max: 98,  action: "Surprise",     description: "Valuable" },
  { min: 99, max: 100, action: "Uncertain",    description: "Warm" }
];

export const MEANING_COLUMNS = [
  { id: "action", name: "Action", blurb: "For active things — what something does, or what happens." },
  { id: "description", name: "Description", blurb: "For descriptive things — what something is like." }
];

// ── Rules-library entries, merged into the library when the toggle is on ────
export const MYTHIC_RULES = [
  { id: "mythic-ask", group: "Asking Mythic", title: "Ask The Game Master",
    cite: "One-Page Mythic · ruling A16",
    body: "Form a yes/no question, decide how likely a Yes is, and roll d100 against that row of the chart. Fifty-fifty if the odds are even or you have no idea. The answer comes back as Yes, No, or either of those taken further than you expected — and an exceptional answer is an instruction to go past what you had in mind, not just a stronger yes." },
  { id: "mythic-odds", group: "Asking Mythic", title: "Choosing the odds",
    cite: "One-Page Mythic",
    body: "Nine steps from Certain to Impossible, with 50/50 in the middle. Pick by what the fiction makes plausible, not by what you want. There is no Chaos Factor in this version of the emulator: the odds row is the whole of the input." },
  { id: "mythic-event", group: "Asking Mythic", title: "Random Events",
    cite: "One-Page Mythic",
    body: "If the d100 for a question comes up a double — 11, 22, 33 and so on — something else happens as well, whatever the answer was. Discover Meaning to find out what, and read it against what is going on right now." },
  { id: "mythic-meaning", group: "Asking Mythic", title: "Discover Meaning",
    cite: "One-Page Mythic",
    body: "Get detail without asking a yes/no question. Roll on the Action column for what something does, or the Description column for what it is like, and read the word as a prompt. If one word will not resolve into anything, roll another and take them together — keep going until it comes clear." }
];

export const MYTHIC_EXPLAIN = {
  ask: "Set how likely a Yes is, and the app rolls it on the One-Page Mythic chart. A double-digit roll also fires a Random Event, which it will roll for you."
};
