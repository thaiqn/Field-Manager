// store.js — persistent meet state. JSON-file backed (swap for SQLite/
// Postgres per HANDOFF.md). Data model and demo seed ported from the
// Field Events Live design prototype: meet → events → flights → athletes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fi } from '../shared/marks.js';
import { makeCode } from './codes.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'meets.json');

let meets = {};

export function load() {
  try { meets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { meets = {}; }
  if (!Object.keys(meets).length) {
    const demo = seedMeet();
    meets[demo.code] = demo;
    persist();
  }
  return meets;
}

let saveT = null;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(meets, null, 2));
  }, 80);
}

export function byCode(code) { return meets[String(code || '').toUpperCase()] || null; }

// Public projection: hide the secret official code from spectators.
export function publicMeet(meet) {
  const { officialCode, ...rest } = meet;
  return { ...rest, meet: { ...meet.meet, code: undefined } };
}

export function createMeet({ name, venue, date }) {
  let code;
  do { code = makeCode(); } while (meets[code]);
  const meet = {
    code,                     // public spectate/route code
    officialCode: makeCode(), // secret scoring code
    rev: 1,
    lastChange: null,
    meet: {
      name: String(name || 'Untitled Meet').slice(0, 80),
      venue: String(venue || '').slice(0, 80),
      date: String(date || '').slice(0, 24),
    },
    events: [],
  };
  meets[code] = meet;
  persist();
  return meet;
}

// ── Mutators (server-authoritative; all callers must be authenticated) ──
let nextSeq = Date.now() % 100000;
const newId = p => p + '-x' + (nextSeq++);

function bump(meet, change) {
  meet.rev = (meet.rev || 0) + 1;
  meet.lastChange = change ? { ts: Date.now(), rev: meet.rev, ...change } : null;
  persist();
}

const findEvent = (meet, eid) => meet.events.find(e => e.id === eid);
const findFlight = (meet, eid, fid) => {
  const ev = findEvent(meet, eid);
  return ev ? ev.flights.find(f => f.id === fid) : null;
};

export const mutate = {
  recordMark(meet, { eid, fid, athleteId, round, entry }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    if (!fl.marks[athleteId]) fl.marks[athleteId] = [];
    fl.marks[athleteId][round] = entry;
    bump(meet, { type: 'mark', eid, fid, athleteId, round });
  },
  vertRecord(meet, { eid, fid, athleteId, result }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    if (!fl.attempts[athleteId]) fl.attempts[athleteId] = {};
    const h = fl.curHeightIdx;
    const cur = fl.attempts[athleteId][h] || '';
    fl.attempts[athleteId][h] = result === 'P' ? 'P' : cur + result;
    bump(meet, { type: 'vert', eid, fid, athleteId, heightIdx: h });
  },
  vertUndo(meet, { eid, fid, athleteId }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    const h = fl.curHeightIdx;
    const rec = fl.attempts[athleteId] || {};
    if (!rec[h]) return;
    rec[h] = rec[h] === 'P' ? '' : rec[h].slice(0, -1);
    if (!rec[h]) delete rec[h];
    bump(meet, { type: 'vert', eid, fid, athleteId, heightIdx: h });
  },
  setBar(meet, { eid, fid, heightIdx }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    fl.curHeightIdx = Math.max(0, Math.min(fl.heights.length - 1, heightIdx));
    bump(meet, { type: 'bar', eid, fid });
  },
  addHeight(meet, { eid, fid, meters }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    fl.heights.push(+meters);
    bump(meet, { type: 'bar', eid, fid });
  },
  updateMeet(meet, { patch }) {
    Object.assign(meet.meet, {
      name: String(patch.name ?? meet.meet.name).slice(0, 80),
      venue: String(patch.venue ?? meet.meet.venue).slice(0, 80),
      date: String(patch.date ?? meet.meet.date).slice(0, 24),
    });
    bump(meet, { type: 'meet' });
  },
  regenerateCode(meet) {
    meet.officialCode = makeCode();
    bump(meet, { type: 'meet' });
    return meet.officialCode;
  },
  addEvent(meet, { name, kind, format }) {
    const ev = { id: newId('e'), name: String(name).slice(0, 60), kind, recordM: null, flights: [] };
    meet.events.push(ev);
    mutate.addFlight(meet, { eid: ev.id, name: kind === 'vertical' ? 'Varsity' : 'Flight 1', format });
    return ev.id;
  },
  addFlight(meet, { eid, name, format }) {
    const ev = findEvent(meet, eid); if (!ev) return;
    const fmt = format || (ev.flights[0] && ev.flights[0].format) || 'final3';
    ev.flights.push(ev.kind === 'vertical'
      ? { id: newId('f'), name, type: 'vertical', athletes: [], heights: [fi(4, 6), fi(4, 8), fi(4, 10)], curHeightIdx: 0, attempts: {} }
      : { id: newId('f'), name, type: 'horizontal', rounds: fmt === 'open4' ? 4 : 6, format: fmt, athletes: [], marks: {} });
    bump(meet, { type: 'setup' });
  },
  setFlightFormat(meet, { eid, fid, format }) {
    const fl = findFlight(meet, eid, fid); if (!fl || fl.type !== 'horizontal') return;
    fl.format = format;
    fl.rounds = format === 'open4' ? 4 : 6;
    Object.keys(fl.marks).forEach(k => {
      if (fl.marks[k] && fl.marks[k].length > fl.rounds) fl.marks[k].length = fl.rounds;
    });
    bump(meet, { type: 'setup' });
  },
  addAthlete(meet, { eid, fid, athlete }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    fl.athletes.push({ id: newId('a'), ...athlete });
    bump(meet, { type: 'setup' });
  },
  removeAthlete(meet, { eid, fid, athleteId }) {
    const fl = findFlight(meet, eid, fid); if (!fl) return;
    fl.athletes = fl.athletes.filter(a => a.id !== athleteId);
    if (fl.marks) delete fl.marks[athleteId];
    if (fl.attempts) delete fl.attempts[athleteId];
    bump(meet, { type: 'setup' });
  },
  setRecord(meet, { eid, recordM }) {
    const ev = findEvent(meet, eid); if (!ev) return;
    ev.recordM = recordM;
    bump(meet, { type: 'setup' });
  },
  resetDemo(meet) {
    const fresh = seedMeet();
    meet.events = fresh.events;
    bump(meet, { type: 'reset' });
  },
};

// ── Demo seed (mirrors the design prototype's MVAL meet) ──────
function seedMeet() {
  let nextId = 1;
  const id = p => p + '-' + (nextId++);
  const ath = (name, team, bib, seedM, extra) => ({ id: id('a'), name, team, bib, seedM, ...(extra || {}) });
  const m = v => ({ t: 'mark', v });
  const F = { t: 'foul' }, P = { t: 'pass' };

  const lj1 = [
    ath('Maya Patel', 'Milpitas', 214, fi(17, 2.5), { prM: fi(17, 2.5) }),
    ath('Jordan Lee', 'Milpitas', 208, fi(17, 0)),
    ath('Sofia Alvarez', 'Santa Clara', 317, fi(16, 6), { sbM: fi(16, 8) }),
    ath('Kendall Brooks', 'Palo Alto', 121, fi(16, 9)),
    ath('Riya Shah', 'Milpitas', 221, fi(16, 0)),
    ath('Amara Okafor', 'Fremont', 402, fi(16, 1)),
  ];
  const ljMarks = {};
  ljMarks[lj1[0].id] = [m(fi(17, 1.5)), F, m(fi(17, 8.25))];
  ljMarks[lj1[1].id] = [m(fi(16, 9)), m(fi(16, 11.5)), F];
  ljMarks[lj1[2].id] = [m(fi(16, 7.25)), m(fi(16, 10)), m(fi(16, 4.5))];
  ljMarks[lj1[3].id] = [F, m(fi(16, 8.75)), m(fi(16, 2))];
  ljMarks[lj1[4].id] = [m(fi(15, 11)), P, m(fi(16, 1.25))];
  ljMarks[lj1[5].id] = [m(fi(15, 8.5)), m(fi(15, 10)), F];

  const lj2 = [
    ath('Naomi Castillo', 'Palo Alto', 134, fi(15, 6)),
    ath('Beth Liang', 'Milpitas', 230, fi(15, 4)),
    ath('Harper Quinn', 'Fremont', 415, fi(15, 1)),
    ath('Zoe Mendez', 'Santa Clara', 322, fi(14, 10)),
  ];

  const tj = [
    ath('Devon Carter', 'Milpitas', 102, fi(42, 6)),
    ath('Luis Herrera', 'Santa Clara', 311, fi(41, 9)),
    ath('Sam Nakamura', 'Milpitas', 118, fi(41, 2)),
    ath('Eli Thompson', 'Palo Alto', 145, fi(40, 7)),
    ath('Andre Bishop', 'Fremont', 421, fi(39, 11)),
  ];

  const sp = [
    ath('Marcus Webb', 'Milpitas', 110, fi(50, 2), { prM: fi(51, 6) }),
    ath('Tomas Riva', 'Palo Alto', 152, fi(48, 10)),
    ath('DeShawn Cole', 'Fremont', 433, fi(47, 5), { sbM: fi(47, 8) }),
    ath('Pete Okonkwo', 'Santa Clara', 308, fi(45, 0)),
    ath('Vik Sandhu', 'Milpitas', 125, fi(43, 7)),
  ];
  const spMarks = {};
  spMarks[sp[0].id] = [m(fi(49, 8)), m(fi(50, 11)), F, m(fi(51, 4.5)), m(fi(52, 3.5)), F];
  spMarks[sp[1].id] = [m(fi(47, 6)), m(fi(48, 4.25)), m(fi(48, 9)), F, m(fi(49, 1.5)), m(fi(48, 0))];
  spMarks[sp[2].id] = [F, m(fi(46, 11)), m(fi(47, 10.5)), m(fi(47, 2)), F, m(fi(47, 6.75))];
  spMarks[sp[3].id] = [m(fi(44, 3)), m(fi(44, 10.25)), m(fi(43, 8)), m(fi(45, 1)), F, m(fi(44, 6))];
  spMarks[sp[4].id] = [m(fi(42, 1)), F, m(fi(43, 5.5)), P, m(fi(42, 9)), m(fi(43, 0.25))];

  const hj = [
    ath('Grace Kim', 'Santa Clara', 305, fi(5, 1), { prM: fi(5, 1) }),
    ath('Tessa Wong', 'Milpitas', 217, fi(5, 0)),
    ath('Dani Foster', 'Palo Alto', 140, fi(4, 11)),
    ath('Lily Tran', 'Milpitas', 226, fi(4, 9)),
    ath('Priya Nair', 'Fremont', 410, fi(4, 8)),
  ];
  const hjHeights = [fi(4, 6), fi(4, 8), fi(4, 10), fi(5, 0), fi(5, 2), fi(5, 4)];
  const hjAtt = {};
  hjAtt[hj[0].id] = { 0: 'O', 1: 'O', 2: 'XO', 3: 'O', 4: 'XX' };
  hjAtt[hj[1].id] = { 0: 'P', 1: 'O', 2: 'O', 3: 'XO', 4: 'X' };
  hjAtt[hj[2].id] = { 0: 'O', 1: 'XO', 2: 'XXO', 3: 'XXX' };
  hjAtt[hj[3].id] = { 0: 'O', 1: 'O', 2: 'XXX' };
  hjAtt[hj[4].id] = { 0: 'XO', 1: 'XXX' };

  return {
    code: 'MVAL26',
    officialCode: 'TROJAN',
    rev: 1,
    lastChange: null,
    meet: { name: 'MVAL Championships', venue: 'Milpitas High School', date: 'May 8, 2026' },
    events: [
      {
        id: id('e'), name: 'Girls Long Jump', kind: 'horizontal', recordM: fi(18, 4.5),
        flights: [
          { id: id('f'), name: 'Flight 1', type: 'horizontal', rounds: 6, format: 'final3', athletes: lj1, marks: ljMarks },
          { id: id('f'), name: 'Flight 2', type: 'horizontal', rounds: 4, format: 'open4', athletes: lj2, marks: {} },
        ],
      },
      {
        id: id('e'), name: 'Girls High Jump', kind: 'vertical', recordM: fi(5, 6),
        flights: [
          { id: id('f'), name: 'Varsity', type: 'vertical', athletes: hj, heights: hjHeights, curHeightIdx: 4, attempts: hjAtt },
        ],
      },
      {
        id: id('e'), name: 'Boys Triple Jump', kind: 'horizontal', recordM: fi(45, 8),
        flights: [
          { id: id('f'), name: 'Flight 1', type: 'horizontal', rounds: 6, format: 'final3', athletes: tj, marks: {} },
        ],
      },
      {
        id: id('e'), name: 'Boys Shot Put', kind: 'horizontal', recordM: fi(51, 9),
        flights: [
          { id: id('f'), name: 'Flight 1', type: 'horizontal', rounds: 6, format: 'final3', athletes: sp, marks: spMarks },
        ],
      },
    ],
  };
}
