# Room Crafter

A personal play aid for **The Room Crafter**, the single-room exploration
variation from *Mythic Magazine* Vol. 69. Generate a room from keywords, then
find out what searching it turns up.

It is a solo tool by construction: there is no GM screen and no second seat,
because the system it comes from does not have one.

## Running it

There is no build step and no dependencies. Clone it and open `index.html`, or
serve the folder:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

It installs as a PWA and works offline. Everything is stored in your browser's
`localStorage` — no account, no server, no network calls at runtime.

## What it does

- **Room generation wizard** — the six-keyword walk (or three, for a crawl),
  one keyword at a time, with interpret / combine / drop. The app enforces the
  order, the two-keyword cap and the Area count; the interpretation is yours.
- **Room sheet** — Areas, description, per-Area search state, the General Area,
  hidden searches, notes.
- **Table roller** — d100 over Room Descriptors, Sock Drawer and Room Elements,
  including the Multi-Element cascade.
- **Crawls** — rooms chained in order; keep as many as you like.
- **Roll log** with a distribution view, **JSON export/import**, and a
  **read-aloud export** that writes the room as plain text for the table.
- **Rules library** and a **tutorial**, in the app's own words.

## Asking Mythic

The Room Crafter defers three things to a Game Master emulator, and this build
carries **One-Page Mythic** for them:

- **"Is there an encounter?"** and **"Is something hidden found?"** — pick how
  likely a Yes is and the app rolls it on the Ask The Game Master chart.
- **Random Events** — a double digit on that same roll fires one, and the app
  rolls its meaning without being asked.
- **Discover Meaning** — Action and Description columns, wired into the Random
  element (81–95) and offered when a Fortunate or Unfortunate result leaves you
  with no obvious idea. Roll more words until it comes clear.

Note this is the one-page emulator, **not Mythic GME 2e**: there is no Chaos
Factor, and the odds row is the only input to the chart.

**Settings → Use One-Page Mythic** turns all of it off. With it off those
surfaces go back to recording an answer you rolled yourself, each marked
*not automated*, and Mythic's entries leave the rules library with it.

## What it does not do

It does not generate interpretations. Rolling the keyword is the app's job;
deciding that "Crammed" is a bed with barely room to walk around it is yours.

It does not carry Mythic GME 2e's larger Meaning tables, its Chaos Factor, or
the Location Crafter's region-scale machinery.

## The dice

Rolls come from `crypto.getRandomValues`, not `Math.random()`. Every roll shows
its face, is written to the log once, and is never re-rolled silently. The
distribution view counts every face across the campaign, so you can check the
app instead of arguing with it.

## House content

The article publishes no table of room types, so the suggestion list in the
wizard and the two example rooms in the tutorial were invented for this app.
Both are labelled **house aid** wherever they appear and live in
`data-house-roomtypes.js`, never mixed into the extracted tables. You can turn
the suggestions off in Settings.

## Development

```
npm install         # dev-only: playwright-core, for the browser harnesses
npm test            # harness A — parse gate, rules invariants, table completeness
npm run scan        # dead-data scan: data extracted and never called
npm run smoke       # harness B — every route, every width, the end-to-end walk
npm run interact    # harness C — clicks every control in isolation
npm run probe:layout   # prints the measurement contract per route
npm run probe:flow     # prints tap counts for the common sequences
npm run all
```

`CLAUDE.md` is the canonical spec: what is built, what is deliberately absent
and why, the extraction and traceability ledgers, and the roadmap.
`docs/rules/` maps every rule to the code that applies it and the test that
proves it. `docs/AUDIT.md` is the findings log.

## Licensing

This is a personal play aid, built from the owner's own copies of the magazine
and the One-Page Mythic sheet. Rules text is paraphrased; the tables are the
publisher's and are reproduced here for personal use. **This repository should stay private.** If
you want to publish something like it, build it on openly licensed material
(an SRD, or ORC/CC content) instead — that choice, and its consequences, are
yours.

No setting, adventure or artwork from the source is included.
