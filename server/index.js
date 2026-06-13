import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as store from './store.js';
import { mutate } from './store.js';
import { makeToken } from './codes.js';
import { buildResults } from './hytek.js';

const PORT = process.env.PORT || 8787;
const app = express();
app.use(express.json());

store.load();

// official tokens: token → meet code (in-memory; re-auth after restart)
const tokens = new Map();

function requireOfficial(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const meetCode = tokens.get(token);
  if (!meetCode || meetCode !== req.params.code.toUpperCase()) {
    return res.status(401).json({ error: 'Officials only — enter the meet code to score.' });
  }
  req.token = token;
  next();
}

function getMeet(req, res) {
  const meet = store.byCode(req.params.code);
  if (!meet) res.status(404).json({ error: 'No meet with that code.' });
  return meet;
}

// ── Meets ─────────────────────────────────────────────────────
app.post('/api/meets', (req, res) => {
  const meet = store.createMeet(req.body || {});
  res.json({ meet: store.publicMeet(meet), officialCode: meet.officialCode });
});

app.get('/api/meets/:code', (req, res) => {
  const meet = getMeet(req, res);
  if (meet) res.json({ meet: store.publicMeet(meet) });
});

// Officials authenticate with the secret code → bearer token.
app.post('/api/meets/:code/auth', (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  if (String(req.body?.officialCode || '').toUpperCase() !== meet.officialCode) {
    return res.status(403).json({ error: 'That code doesn’t match this meet' });
  }
  const token = makeToken();
  tokens.set(token, meet.code);
  res.json({ token });
});

// ── Mutations (officials only) ────────────────────────────────
// A single dispatch endpoint keeps the wire surface small; every op maps to
// a server-authoritative mutator in store.js.
const OPS = {
  mark: 'recordMark', vert: 'vertRecord', 'vert-undo': 'vertUndo',
  bar: 'setBar', 'add-height': 'addHeight',
  meet: 'updateMeet', 'add-event': 'addEvent', 'add-flight': 'addFlight',
  'flight-format': 'setFlightFormat', 'add-athlete': 'addAthlete',
  'remove-athlete': 'removeAthlete', record: 'setRecord', reset: 'resetDemo',
};

app.post('/api/meets/:code/op/:op', requireOfficial, (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  const fn = OPS[req.params.op];
  if (!fn) return res.status(400).json({ error: 'Unknown op.' });

  // Validate the few ops that touch athlete-supplied marks.
  const body = req.body || {};
  if (req.params.op === 'mark') {
    const e = body.entry;
    const ok = e === null || (e && (e.t === 'foul' || e.t === 'pass' ||
      (e.t === 'mark' && typeof e.v === 'number' && e.v > 0 && e.v < 40)));
    if (!ok) return res.status(400).json({ error: 'Bad mark entry.' });
  }
  if (req.params.op === 'vert' && !['O', 'X', 'P'].includes(body.result)) {
    return res.status(400).json({ error: 'Bad vertical result.' });
  }

  // Code rotation invalidates every token issued for this meet (incl. caller).
  if (req.params.op === 'meet' && body.regenerate) {
    const fresh = mutate.regenerateCode(meet);
    for (const [t, c] of tokens) if (c === meet.code) tokens.delete(t);
    broadcast(meet.code);
    return res.json({ ok: true, officialCode: fresh, relock: true });
  }

  mutate[fn](meet, body);
  broadcast(meet.code);
  res.json({ ok: true });
});

// ── Hy-Tek export ─────────────────────────────────────────────
app.get('/api/meets/:code/export/hytek', (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  const units = req.query.units === 'metric' ? 'metric' : 'imperial';
  const fname = meet.meet.name.replace(/[^\w]+/g, '-').toLowerCase() + '-hytek-results.txt';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.send(buildResults(meet, units));
});

// ── Static frontend (single-artifact deploy) ─────────────────
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

// ── WebSocket live sync ───────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map(); // meet code → Set<ws>

wss.on('connection', (ws, req) => {
  const code = String(new URL(req.url, 'http://x').searchParams.get('meet') || '').toUpperCase();
  const meet = store.byCode(code);
  if (!meet) return ws.close(4404, 'No such meet');
  if (!rooms.has(code)) rooms.set(code, new Set());
  rooms.get(code).add(ws);
  ws.send(JSON.stringify({ type: 'meet', meet: store.publicMeet(meet) }));
  ws.on('close', () => rooms.get(code)?.delete(ws));
});

function broadcast(code) {
  const meet = store.byCode(code);
  const subs = rooms.get(code);
  if (!meet || !subs) return;
  const msg = JSON.stringify({ type: 'meet', meet: store.publicMeet(meet) });
  for (const ws of subs) if (ws.readyState === 1) ws.send(msg);
}

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Field Events Live listening on http://${HOST}:${PORT}`);
  console.log(`Demo meet: spectate code MVAL26 · official code TROJAN`);
});
