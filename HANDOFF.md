# Production handoff

What's a prototype shortcut today, and what to swap in for a real deployment.

## Current architecture

Single deployable artifact: one Node process (Express) serves the built
React app, the REST API, and a WebSocket per meet. State lives in
`data/meets.json`, written through a 100ms debounce.

```
browser ──HTTP──▶ Express (server/index.js) ──▶ store.js ──▶ data/meets.json
        ◀──WS──── one room per meet code, full-meet snapshot per change
```

## Deploying as-is (small meets, one venue)

Any Node host works — Fly.io, Railway, Render, a $5 VPS:

```bash
npm install && npm run build
PORT=8080 node server/index.js
```

Put it behind TLS (the join codes are the only secret in transit). One
instance handles a typical invitational comfortably; the WS payload is a
full meet snapshot (a few KB) per result entry.

## What to harden for real production

| Prototype shortcut | Production replacement |
|---|---|
| JSON file store (`server/store.js`) | SQLite (fine for one venue) or Postgres. The store API is 5 functions — swap the internals, keep the interface. |
| In-memory official tokens (lost on restart; officials just re-enter the code) | Signed tokens (JWT with the meet code as claim) or a tokens table, plus expiry. |
| Official code = flat secret per meet | Per-official PINs if you need an audit trail of who entered what. |
| Full-meet snapshot broadcast | Per-event diffs if meets grow large (100+ athletes); not needed below that. |
| No rate limiting | `express-rate-limit` on `/auth` (the only brute-forceable surface — 6 chars from a 31-char alphabet ≈ 887M codes, so 5 tries/min/IP makes guessing impractical). |
| Single process | Sticky sessions or a Redis pub/sub fan-out if you ever scale horizontally. One venue never needs this. |

## Hy-Tek interop notes

The export produces an **H header** record plus one **33-field E result
record** per athlete (semicolon-delimited, CRLF):

```
H;MVAL Championships;05/08/2026;05/08/2026;Field Events Live (prototype);06/13/2026;Milpitas High School
E;F;1;;LJ;F;;;Flight 1;F;17'8.25;E;;2;2;1;;;;;;;Patel;Maya;;F;;MILP;Milpitas;;;214;
```

- Imports into Track & Field MEET MANAGER 6.0 via **File → Import →
  Semi-Colon Delimited Rosters/Entries File**. The E record carries event
  code, gender, division (flight name), overall + flight place, English
  (`17'8.25`) or metric mark, team code, and bib.
- athletic.net accepts the same file under *Upload results → Hy-Tek*.
- Athletes with no valid mark export as `ND` (horizontal) / `NH` (vertical);
  athletes with no attempt at all are skipped.
- Verify field semantics against your MM install once — fields beyond place
  (declaration, seed, wind) vary by MM configuration and are left empty.
- If you need MM's full *results interchange* (wind per attempt, the full
  attempt series), the path is the Lynx/FieldLynx `.lff` interface; the
  attempt-level data model here already has everything needed to add that
  writer.

## Not built yet (deliberately)

- Wind readings per attempt (matters for record validation).
- CSV/PDF export (user opted to skip for the prototype).
- Persisted official sessions (tokens are in-memory; officials re-enter the
  code after a server restart).
