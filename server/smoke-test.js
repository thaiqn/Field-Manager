// Logic smoke test: node server/smoke-test.js
import assert from 'node:assert';
import * as M from '../shared/marks.js';
import { buildResults } from './hytek.js';

const m = v => ({ t: 'mark', v });
const F = { t: 'foul' }, P = { t: 'pass' };

// ── formatting (meters canonical, imperial to lesser ¼ inch) ──
assert.equal(M.fmtImperial(M.fi(17, 8.25)), '17-08.25');
assert.equal(M.fmtImperial(M.fi(4, 6)), '4-06');
assert.equal(M.fmtImperial(M.fi(16, 1.25)), '16-01.25');
assert.equal(M.fmtMetric(M.fi(5, 0)), '1.52');
assert.equal(M.fmtMark(M.fi(17, 0), 'metric'), '5.18');

// ── horizontal ranking + 2nd-best tie-break ──────────────────
const athletes = [
  { id: 'a', name: 'Ann A', team: 'T1', bib: 1 },
  { id: 'b', name: 'Bea B', team: 'T2', bib: 2 },
  { id: 'c', name: 'Cy C', team: 'T3', bib: 3 },
];
const marks = {
  a: [m(M.fi(16, 0)), m(M.fi(15, 0))],
  b: [m(M.fi(16, 0)), m(M.fi(15, 6))], // same best, better 2nd → 1st
  c: [F, F],                           // no mark → last
};
let ranked = M.rankHorizontal(athletes, marks);
assert.deepEqual(ranked.map(r => [r.athlete.id, r.place]), [['b', 1], ['a', 2], ['c', 3]]);
assert.equal(ranked[0].best, M.fi(16, 0));

// ── rotation order: final3 reverses rank for round 4 ─────────
const fl = { type: 'horizontal', rounds: 6, format: 'final3', athletes, marks: {
  a: [m(M.fi(16, 0)), m(M.fi(15, 0)), m(M.fi(14, 0))],
  b: [m(M.fi(17, 0)), m(M.fi(15, 6)), m(M.fi(14, 0))],
  c: [m(M.fi(15, 0)), m(M.fi(14, 0)), m(M.fi(13, 0))],
} };
const order4 = M.horizOrder(fl, 3); // finals → reverse of standing (b,a,c) => c,a,b
assert.deepEqual(order4, ['c', 'a', 'b']);
const nu = M.horizNextUp(fl);
assert.equal(nu.round, 3);
assert.equal(nu.athleteId, 'c');

// ── open4: 4 attempts, roster order throughout ───────────────
const fl4 = { type: 'horizontal', rounds: 4, format: 'open4', athletes, marks: {
  a: [m(M.fi(16, 0))], b: [m(M.fi(17, 0))], c: [m(M.fi(15, 0))],
} };
assert.deepEqual(M.horizOrder(fl4, 3), ['a', 'b', 'c']); // never reverses
assert.equal(M.horizNextUp(fl4).round, 1);   // round 0 filled for all → round 1
assert.equal(M.horizNextUp(fl4).athleteId, 'a'); // roster order

// ── vertical: elimination + countback ────────────────────────
const heights = [M.fi(4, 6), M.fi(4, 8), M.fi(4, 10)];
const vAth = [
  { id: 'x', name: 'Xi X', team: 'T', bib: 1 },
  { id: 'y', name: 'Yo Y', team: 'T', bib: 2 },
  { id: 'z', name: 'Zed Z', team: 'T', bib: 3 },
];
const attempts = {
  x: { 0: 'O', 1: 'XO', 2: 'XXX' },  // best 4-08, 1 miss there → 2nd
  y: { 0: 'O', 1: 'O', 2: 'XXX' },   // best 4-08, clean → 1st
  z: { 0: 'XXX' },                   // out, NH → last
};
const vr = M.rankVertical(vAth, heights, attempts);
assert.deepEqual(vr.map(r => [r.athlete.id, r.place, r.out]), [['y', 1, true], ['x', 2, true], ['z', 3, true]]);
assert.ok(M.isEliminated(heights, attempts.z));

// ── badges: MR > PR > SB ──────────────────────────────────────
assert.equal(M.badgeFor(M.fi(18, 0), { prM: M.fi(17, 0) }, M.fi(17, 6)), 'MR');
assert.equal(M.badgeFor(M.fi(17, 6), { prM: M.fi(17, 0) }, M.fi(18, 0)), 'PR');
assert.equal(M.badgeFor(M.fi(16, 6), { sbM: M.fi(16, 0) }, M.fi(18, 0)), 'SB');
assert.equal(M.badgeFor(M.fi(15, 0), { prM: M.fi(17, 0) }, M.fi(18, 0)), null);

// ── Hy-Tek export: H header + 33-field E records ─────────────
const meet = {
  meet: { name: 'Test Meet', venue: 'Here', date: 'May 8, 2026' },
  events: [{ id: 'e1', name: 'Girls Long Jump', kind: 'horizontal', recordM: null,
    flights: [{ id: 'f1', name: 'Flight 1', type: 'horizontal', rounds: 6, format: 'final3', athletes, marks }] }],
};
const out = buildResults(meet, 'imperial');
const lines = out.trim().split('\r\n');
assert.ok(lines[0].startsWith('H;Test Meet;'));
const e = lines[1].split(';');
assert.equal(e.length, 33);
assert.equal(e[0], 'E');
assert.equal(e[1], 'F');
assert.equal(e[4], 'LJ');
assert.equal(e[5], 'F');         // girls
assert.equal(e[10], "16'");      // best mark of athlete b
assert.equal(e[23], 'Bea');      // first name (field 24 → index 23 after slice), winner first
assert.equal(lines.length, 1 + 3); // header + 3 athletes (c's fouls still count as attempted)

console.log('All smoke tests passed.');
