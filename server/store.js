// JSON-file persistence. Survives restarts; swap for SQLite/Postgres in
// production (see HANDOFF.md).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCode } from './codes.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'meets.json');

let meets = {};

export function load() {
  try {
    meets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    meets = {};
  }
  if (!Object.keys(meets).length) seed();
  return meets;
}

let saveT = null;
export function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(meets, null, 2));
  }, 100);
}

export function byCode(code) {
  return meets[String(code || '').toUpperCase()] || null;
}

export function createMeet({ name, venue, date }) {
  let code;
  do { code = makeCode(); } while (meets[code]);
  const meet = {
    id: code,
    code,
    officialCode: makeCode(),
    name: String(name || 'Untitled Meet').slice(0, 80),
    venue: String(venue || '').slice(0, 80),
    date: String(date || '').slice(0, 20),
    units: 'E',
    events: [],
  };
  meets[code] = meet;
  save();
  return meet;
}

// Strip the secret before anything leaves the server.
export function publicMeet(meet) {
  const { officialCode, ...pub } = meet;
  return pub;
}

// ── Demo seed — matches the design prototype's MVAL data ────
const ftIn = (ft, inch) => ft * 12 + inch;

function seed() {
  const meet = {
    id: 'MVAL26',
    code: 'MVAL26',
    officialCode: 'TROJAN', // demo only — real meets get a random code
    name: 'MVAL Championships',
    venue: 'Milpitas High School',
    date: 'Jun 12, 2026',
    units: 'E',
    events: [
      {
        id: 'glj',
        name: 'Girls Long Jump',
        gender: 'F',
        type: 'horizontal',
        format: 'prelim3final3',
        eventCode: 'LJ',
        flightLabel: 'Varsity · Flight 1 of 2',
        athletes: [
          { id: 'a1', name: 'Maya Patel',     team: 'Milpitas',    teamCode: 'MILP', gender: 'F', seed: ftIn(16, 11),   prMark: ftIn(17, 6) },
          { id: 'a2', name: 'Jordan Lee',     team: 'Milpitas',    teamCode: 'MILP', gender: 'F', seed: ftIn(17, 0.5) },
          { id: 'a3', name: 'Sofia Alvarez',  team: 'Santa Clara', teamCode: 'SCLA', gender: 'F', seed: ftIn(16, 8),    sbMark: ftIn(16, 9) },
          { id: 'a4', name: 'Kendall Brooks', team: 'Palo Alto',   teamCode: 'PALO', gender: 'F', seed: ftIn(16, 10) },
          { id: 'a5', name: 'Riya Shah',      team: 'Milpitas',    teamCode: 'MILP', gender: 'F', seed: ftIn(16, 4) },
          { id: 'a6', name: 'Amara Okafor',   team: 'Fremont',     teamCode: 'FREM', gender: 'F', seed: ftIn(16, 1) },
        ],
        results: {
          a1: [ftIn(17, 1.5), 'X', ftIn(17, 8.25), null, null, null],
          a2: [ftIn(16, 9), ftIn(16, 11.5), 'X', null, null, null],
          a3: [ftIn(16, 7.25), ftIn(16, 10), ftIn(16, 4.5), null, null, null],
          a4: ['X', ftIn(16, 8.75), ftIn(16, 2), null, null, null],
          a5: [ftIn(15, 11), 'P', ftIn(16, 1.25), null, null, null],
          a6: [ftIn(15, 8.5), ftIn(15, 10), 'X', null, null, null],
        },
      },
      {
        id: 'btj',
        name: 'Boys Triple Jump',
        gender: 'M',
        type: 'horizontal',
        format: 'open4', // 4 attempts total, no finals re-order
        eventCode: 'TJ',
        flightLabel: 'Varsity · Flight 1 of 1',
        athletes: [
          { id: 'b1', name: 'Marcus Webb',  team: 'Milpitas',    teamCode: 'MILP', gender: 'M', seed: ftIn(42, 6) },
          { id: 'b2', name: 'Diego Ramos',  team: 'Fremont',     teamCode: 'FREM', gender: 'M', seed: ftIn(41, 9), prMark: ftIn(42, 0) },
          { id: 'b3', name: 'Ethan Cho',    team: 'Santa Clara', teamCode: 'SCLA', gender: 'M', seed: ftIn(41, 2) },
          { id: 'b4', name: 'Tyler Nguyen', team: 'Milpitas',    teamCode: 'MILP', gender: 'M', seed: ftIn(40, 8) },
          { id: 'b5', name: 'Sam Okada',    team: 'Palo Alto',   teamCode: 'PALO', gender: 'M', seed: ftIn(40, 1) },
        ],
        results: {
          b1: [ftIn(42, 2.5), ftIn(41, 11), null, null],
          b2: [ftIn(42, 4.75), 'X', null, null],
          b3: ['X', ftIn(40, 10.5), null, null],
          b4: [ftIn(40, 3), ftIn(40, 7.25), null, null],
          b5: ['P', ftIn(39, 11), null, null],
        },
      },
      {
        id: 'ghj',
        name: 'Girls High Jump',
        gender: 'F',
        type: 'vertical',
        eventCode: 'HJ',
        flightLabel: 'Varsity',
        heights: [ftIn(4, 6), ftIn(4, 8), ftIn(4, 10), ftIn(5, 0), ftIn(5, 2), ftIn(5, 4)],
        curHeight: 4,
        athletes: [
          { id: 'h1', name: 'Grace Kim',   team: 'Santa Clara', teamCode: 'SCLA', gender: 'F' },
          { id: 'h2', name: 'Tessa Wong',  team: 'Milpitas',    teamCode: 'MILP', gender: 'F' },
          { id: 'h3', name: 'Dani Foster', team: 'Palo Alto',   teamCode: 'PALO', gender: 'F' },
          { id: 'h4', name: 'Lily Tran',   team: 'Milpitas',    teamCode: 'MILP', gender: 'F' },
          { id: 'h5', name: 'Priya Nair',  team: 'Fremont',     teamCode: 'FREM', gender: 'F' },
        ],
        results: {
          h1: ['O', 'O', 'XO', 'O', 'XX', ''],
          h2: ['P', 'O', 'O', 'XO', 'X', ''],
          h3: ['O', 'XO', 'XXO', 'XXX', '', ''],
          h4: ['O', 'O', 'XXX', '', '', ''],
          h5: ['XO', 'XXX', '', '', '', ''],
        },
      },
    ],
  };
  meets[meet.code] = meet;
  save();
}
