# Field Events Live

Live results for track-and-field field events — long jump, triple jump, high
jump and friends. Officials score from a phone at the pit; spectators watch
ranked leaderboards update in real time. Visual language: the Trojan
Athletics design system (navy/gold, Fraunces/Inter/JetBrains Mono).

## Run it

```bash
npm install
npm start          # builds the frontend and serves everything on :8787
```

Then open http://localhost:8787 — the demo meet is **MVAL26**
(official code **TROJAN**).

For development with hot reload, run two terminals:

```bash
npm run server     # API + WebSocket on :8787
npm run dev        # Vite dev server on :5173 (proxies /api and /ws)
```

Logic smoke tests: `node server/smoke-test.js`

## How access works (the code system)

Every meet gets two codes when it's created, Among-Us style:

- **Meet code** (e.g. `MVAL26`) — public. Anyone with it can spectate.
  Viewing is always read-only; there is no way to edit through the
  spectator view.
- **Official code** (e.g. `TROJAN`) — secret, shown once to the meet
  director at creation. Officials enter it to get a server-issued token;
  every result write requires that token.

## Event formats

- **Horizontal, 3+3** (`prelim3final3`) — three prelim attempts in flight
  order, three finals attempts in reverse rank order (last place jumps
  first). Six columns.
- **Horizontal, 4-attempt** (`open4`) — four attempts total, flight order
  throughout, no finals re-order. Four columns. The demo's Boys Triple
  Jump uses this.
- **Vertical** — bar-height progression grid (O / X / —), three
  consecutive misses eliminates, countback tie-breaks.

## Hy-Tek export

`GET /api/meets/:code/export/hytek?units=E|M` downloads a semicolon-
delimited file of Hy-Tek "D" records (one per athlete per event, best mark
+ E/M measure flag) — the format Hy-Tek Track & Field MEET MANAGER imports
via *File → Import → Entries* and athletic.net accepts for results uploads.
Also linked from the spectator view ("Hy-Tek ↓").

## Repo layout

- `server/` — Express + WebSocket API, JSON-file store, Hy-Tek export
- `shared/` — mark formatting/parsing and ranking logic (used by both sides)
- `src/` — React frontend: landing/join, spectator boards, officials' entry
- `project/`, `chats/` — the original Claude Design handoff bundle these
  designs came from
- `HANDOFF.md` — production deployment guidance

## Spectator board variants

The three long jump explorations (A · Editorial, B · Stadium, C · Pit view)
and two high jump grids (Light, Navy) from the design phase are all live —
toggle between them in the spectator view's sub-bar, along with ft-in ⇄
meters units.
