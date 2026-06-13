import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as store from './store.js';
import { makeToken } from './codes.js';
import { exportMeet } from './hytek.js';
import { attemptCount } from '../shared/rank.js';

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
    return res.status(401).json({ error: 'Officials only. Join with the meet’s official code.' });
  }
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
  // The only time officialCode is sent over the wire — shown once to the
  // meet director at creation.
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
    return res.status(403).json({ error: 'Wrong official code.' });
  }
  const token = makeToken();
  tokens.set(token, meet.code);
  res.json({ token });
});

// ── Results entry (officials only) ────────────────────────────
app.post('/api/meets/:code/events/:eventId/result', requireOfficial, (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  const event = meet.events.find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'No such event.' });
  const { athleteId } = req.body || {};
  if (!event.athletes.some((a) => a.id === athleteId)) {
    return res.status(400).json({ error: 'Unknown athlete.' });
  }

  if (event.type === 'horizontal') {
    const { attempt, mark } = req.body; // attempt: 0-based; mark: inches | 'X' | 'P' | null
    const n = attemptCount(event);
    if (!Number.isInteger(attempt) || attempt < 0 || attempt >= n) {
      return res.status(400).json({ error: `Attempt must be 1–${n}.` });
    }
    const ok = mark === null || mark === 'X' || mark === 'P' || (typeof mark === 'number' && mark > 0 && mark < 1200);
    if (!ok) return res.status(400).json({ error: 'Bad mark.' });
    const atts = event.results[athleteId] || new Array(n).fill(null);
    while (atts.length < n) atts.push(null);
    atts[attempt] = mark;
    event.results[athleteId] = atts;
  } else {
    const { heightIndex, cell } = req.body; // cell: '', 'X', 'XX', 'XXX', 'O', 'XO', 'XXO', 'P'
    if (!Number.isInteger(heightIndex) || heightIndex < 0 || heightIndex >= event.heights.length) {
      return res.status(400).json({ error: 'Bad height.' });
    }
    if (!/^(X{0,2}O|X{1,3}|P|)$/.test(String(cell))) {
      return res.status(400).json({ error: 'Bad cell — use O, XO, XXO, XXX, X, XX, P, or empty.' });
    }
    const cells = event.results[athleteId] || new Array(event.heights.length).fill('');
    while (cells.length < event.heights.length) cells.push('');
    cells[heightIndex] = cell;
    event.results[athleteId] = cells;
  }

  store.save();
  broadcast(meet.code);
  res.json({ ok: true });
});

// Bar control for vertical events (raise/set current height).
app.post('/api/meets/:code/events/:eventId/bar', requireOfficial, (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  const event = meet.events.find((e) => e.id === req.params.eventId);
  if (!event || event.type !== 'vertical') return res.status(404).json({ error: 'No such vertical event.' });
  const { curHeight, addHeight } = req.body || {};
  if (typeof addHeight === 'number' && addHeight > 0 && addHeight < 1200) {
    event.heights.push(addHeight);
  }
  if (Number.isInteger(curHeight) && curHeight >= 0 && curHeight < event.heights.length) {
    event.curHeight = curHeight;
  }
  store.save();
  broadcast(meet.code);
  res.json({ ok: true });
});

// ── Hy-Tek export ─────────────────────────────────────────────
app.get('/api/meets/:code/export/hytek', (req, res) => {
  const meet = getMeet(req, res);
  if (!meet) return;
  const units = req.query.units === 'M' ? 'M' : 'E';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${meet.code}-results-hytek.txt"`);
  res.send(exportMeet(meet, units));
});

// ── Static frontend (production single-artifact deploy) ──────
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

server.listen(PORT, () => {
  console.log(`Field Events Live on http://localhost:${PORT}`);
  console.log(`Demo meet: code MVAL26 · official code TROJAN`);
});
