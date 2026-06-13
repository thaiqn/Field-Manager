# Field Events Live

Live results for track-and-field field events — long jump, triple jump, shot
put, high jump and friends. Officials score from a phone at the pit;
spectators watch ranked leaderboards update in real time. Visual language:
the Trojan Athletics design system (navy/gold, Fraunces/Inter/JetBrains
Mono). This implements the **Field Events Live** Claude Design handoff — the
spectator board is direction A's editorial table with direction C's "now-up"
hero card, the combination the user landed on.

## Run it

```bash
npm install
npm start          # builds the frontend and serves everything on :8787
```

Then open http://localhost:8787. The home page has two doors — **Live
results** (open) and **Scoring** (code-gated). The demo meet is spectate
code **MVAL26**, official code **TROJAN**.

For development with hot reload, run two terminals:

```bash
npm run server     # API + WebSocket on :8787
npm run dev        # Vite dev server on :5173 (proxies /api and /ws)
```

Logic smoke tests: `node server/smoke-test.js`

## How access works (the code system)

Every meet has two codes, Among-Us style:

- **Spectate code** (e.g. `MVAL26`) — public, routes spectators to the meet.
  Viewing is always read-only; the spectator payload never even contains the
  official code.
- **Official code** (e.g. `TROJAN`) — secret. Officials enter it on the lock
  screen; the server verifies it and issues a bearer token. **Every result
  write requires that token**, so spectators cannot edit live results.
  Rotating the code ("New code" in Setup) invalidates all existing tokens.

## Data model

`meet → events → flights → athletes`. Marks are stored canonically in
**meters**; imperial display reads to the lesser quarter inch (field-event
rule). Per-event meet records drive the MR badge. See `shared/marks.js`.

## Event formats

- **Horizontal, 3+3 finals** (`final3`) — three prelim attempts in flight
  order, three finals attempts in reverse rank order (last place jumps
  first). Six columns.
- **Horizontal, 4-attempt** (`open4`) — four attempts total, flight order
  throughout, no finals re-order. The demo's Long Jump Flight 2 uses this;
  toggle any horizontal flight's format in Setup.
- **Vertical** — bar-height progression grid (O / X / —), three consecutive
  misses eliminates, countback tie-breaks.

Tie-breaks: horizontal by second-best (then third, …) mark; vertical by
fewest misses at the last cleared height, then fewest total misses.

## Hy-Tek export

`GET /api/meets/:code/export/hytek?units=imperial|metric` (also the "Export
results" button in Setup) downloads a semicolon-delimited `.txt`: an **H**
header record plus one **33-field E result record** per athlete (event code,
flight, places, English `12'10.25` or metric marks, team codes). Import into
Meet Manager 6.0 via *File → Import → Semi-Colon Delimited Rosters/Entries
File*.

## Repo layout

- `server/` — Express + WebSocket API, JSON-file store, Hy-Tek export, tests
- `shared/` — `marks.js`: unit conversion, ranking, rotation, badges (used by
  both server and client)
- `src/` — React frontend: Home, Spectate (live boards), Officials (lock
  gate + entry pads + setup)
- `project/`, `chats/` — the Claude Design handoff bundle these designs came
  from
- `HANDOFF.md` — production deployment guidance
