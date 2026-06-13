// Quick logic smoke test: node server/smoke-test.js
import assert from 'node:assert';
import { rankHorizontal, rankVertical, rotation, attemptCount } from '../shared/rank.js';
import { parseMark, inchesToFtIn, inchesToMeters } from '../shared/format.js';
import { exportMeet } from './hytek.js';

const ftIn = (f, i) => f * 12 + i;

// formats
assert.equal(inchesToFtIn(212.25), '17-08.25');
assert.equal(inchesToFtIn(54, { decimals: 0 }), '4-06');
assert.equal(inchesToMeters(212.25), '5.39m');
assert.equal(parseMark('17-08.25'), 212.25);
assert.equal(parseMark("17'8.25"), 212.25);
assert.equal(parseMark('5.39m'), 212.2);
assert.equal(parseMark('blah'), null);
assert.equal(parseMark('17-13'), null); // 13 inches is invalid

// horizontal ranking + tie-break on second-best
const ev = {
  type: 'horizontal', format: 'prelim3final3', eventCode: 'LJ',
  athletes: [
    { id: 'a', name: 'A A', team: 'T1', teamCode: 'T1' },
    { id: 'b', name: 'B B', team: 'T2', teamCode: 'T2' },
    { id: 'c', name: 'C C', team: 'T3', teamCode: 'T3' },
  ],
  results: {
    a: [200, 190, null, null, null, null],
    b: [200, 195, null, null, null, null], // same best, better 2nd → wins
    c: ['X', 'X', null, null, null, null], // NM
  },
};
let rows = rankHorizontal(ev);
assert.deepEqual(rows.map((r) => [r.athlete.id, r.p]), [['b', 1], ['a', 2], ['c', null]]);

// rotation: round 3 in flight order, prelim
let rot = rotation(ev);
assert.equal(rot.round, 3);
assert.equal(rot.nowId, 'a');

// finals reverse-rank order: fill prelims, check round 4 starts with last place
ev.results.a = [200, 190, 180, null, null, null];
ev.results.b = [200, 195, 180, null, null, null];
ev.results.c = ['X', 'X', 'X', null, null, null];
rot = rotation(ev);
assert.equal(rot.round, 4);
assert.equal(rot.nowId, 'c'); // NM jumps first in finals

// open4: 4 attempts, no reorder
const ev4 = { ...ev, format: 'open4', results: { a: [200, 190, 180, null], b: [201, 0 + 195, 180, null], c: [150, 160, 170, null] } };
assert.equal(attemptCount(ev4), 4);
rot = rotation(ev4);
assert.equal(rot.round, 4);
assert.equal(rot.nowId, 'a'); // flight order, not reverse rank

// vertical: countback
const hj = {
  type: 'vertical', eventCode: 'HJ', heights: [54, 56, 58],
  athletes: [
    { id: 'x', name: 'X X', team: 'T', teamCode: 'T' },
    { id: 'y', name: 'Y Y', team: 'T', teamCode: 'T' },
    { id: 'z', name: 'Z Z', team: 'T', teamCode: 'T' },
  ],
  results: {
    x: ['O', 'XO', 'XXX'],   // 56 with 1 miss at height → 2nd
    y: ['O', 'O', 'XXX'],    // 56 clean → 1st
    z: ['XX', 'X', ''],      // 3 consecutive across heights → out, NH
  },
};
rows = rankVertical(hj);
assert.deepEqual(rows.map((r) => [r.athlete.id, r.p, r.out]), [['y', 1, true], ['x', 2, true], ['z', null, true]]);

// hytek export shape
const out = exportMeet({ events: [ev] }, 'E');
const lines = out.trim().split('\r\n');
assert.equal(lines.length, 3);
const f = lines[0].split(';');
assert.equal(f.length, 18);
assert.equal(f[0], 'D');
assert.equal(f[1], 'B');       // last name of winner-first ordering
assert.equal(f[10], 'LJ');
assert.equal(f[11], '16-08.00'); // 200 inches
assert.equal(f[12], 'E');

console.log('All smoke tests passed.');
