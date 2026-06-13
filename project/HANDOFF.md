# Field Events Live — production deployment handoff

This prototype is a fully client-side simulation: state lives in `localStorage`
and syncs across tabs via the browser `storage` event. This doc maps each piece
to a real, single-deployable production stack.

## Recommended stack (prioritizing simplicity)

**One Node.js process serving everything** — API, WebSockets, and static
frontend — backed by SQLite. Deployable to a $5 VPS, Fly.io, or Railway as a
single container.

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite (this prototype's components port directly) | Already written as React components |
| Styling | The two CSS files in `ds/` + `app/app.css` as-is | Token-based, no build step needed |
| Server | Node + Fastify (or Express) | One process, trivial ops |
| Real-time | Socket.io | Rooms per flight, auto-reconnect, fallback to polling |
| Database | SQLite via better-sqlite3 + Litestream for backup | Zero-config, single file, plenty for a meet |
| Auth | Single shared "official PIN" per meet | Officials enter a 4-digit PIN; spectators need nothing |

## What maps to what

| Prototype file | Production equivalent |
|---|---|
| `app/store.js` (localStorage + storage events) | REST API + Socket.io broadcasts; same state shape works as the DB schema |
| `app/marks.js` | Shared `lib/marks.js` — import server-side for validation AND client-side for display. Keep meters as the canonical unit. |
| `app/shared-ui.jsx` | Unchanged React components |
| `app/official-app.jsx` | Officials SPA route (`/score`), behind the PIN |
| `app/spectator-app.jsx` | Public SPA route (`/live/:meetId`) |

## Schema (SQLite)

```sql
CREATE TABLE meets    (id TEXT PRIMARY KEY, name TEXT, venue TEXT, date TEXT, pin TEXT);
CREATE TABLE events   (id TEXT PRIMARY KEY, meet_id TEXT, name TEXT,
                       kind TEXT CHECK(kind IN ('horizontal','vertical')), record_m REAL);
CREATE TABLE flights  (id TEXT PRIMARY KEY, event_id TEXT, name TEXT, rounds INTEGER,
                       heights_json TEXT, cur_height_idx INTEGER);
CREATE TABLE athletes (id TEXT PRIMARY KEY, flight_id TEXT, name TEXT, team TEXT,
                       bib TEXT, seed_m REAL, pr_m REAL, sb_m REAL, ord INTEGER);
CREATE TABLE attempts (athlete_id TEXT, round INTEGER,        -- horizontal
                       kind TEXT CHECK(kind IN ('mark','foul','pass')), value_m REAL,
                       PRIMARY KEY (athlete_id, round));
CREATE TABLE bar_attempts (athlete_id TEXT, height_idx INTEGER, seq TEXT, -- e.g. 'XXO'
                       PRIMARY KEY (athlete_id, height_idx));
```

Store marks **in meters (REAL)**, exactly as the prototype does. Formatting to
ft-in (lesser ¼ inch) happens at render time — `marks.js` already implements it.

## Real-time flow

1. Official POSTs `/api/flights/:id/attempts` (validated server-side with the same `marks.js` rules).
2. Server writes to SQLite, then `io.to('flight:' + id).emit('update', changedRow)`.
3. Spectator clients subscribe on page load: `socket.emit('join', flightId)`.
4. Re-rank client-side (cheap, deterministic — `rankHorizontal` / `rankVertical`).
5. On reconnect, client GETs the full flight state once, then resumes the stream.

Rankings are *derived*, never stored — this avoids every sync bug class.
The tie-break rules (second-best mark; vertical countback: fewest misses at
best height, then total misses) live in one shared module.

## Hardening checklist for meet day

- [ ] Optimistic UI on the officials' pad (mark shows instantly, reconciles on ack)
- [ ] Offline queue: buffer entries in IndexedDB when the pit Wi-Fi drops; flush on reconnect
- [ ] Idempotent writes (PUT by `(athlete_id, round)`, not POST-append) so retries are safe
- [ ] Soft-delete / audit log of corrections (officials' corrections are common)
- [ ] CSV export: `SELECT` + join, one route; PDF via headless Chromium print of the spectator page
- [ ] Rate-limit the public socket room; spectators are read-only
- [ ] Litestream replication to S3/Backblaze for live backup

## What deliberately stays out of v1

- Multi-meet accounts / login systems (one PIN per meet is enough)
- Wind gauge integration, implement weights, photo finish — out of field-event scope
- Native apps — the responsive web views cover phone use at the venue
