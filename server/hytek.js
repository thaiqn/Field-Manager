// Hy-Tek Track & Field MEET MANAGER semicolon-delimited export.
//
// Generates "D" individual records (the 18-field format MM 6.0 imports via
// File → Import → Entries, and that athletic.net accepts as a results
// upload). The athlete's final result mark goes in the mark field with the
// E/M measure flag. Reference line shape:
//   D;Last;First;;F;;MILP;Milpitas;;;LJ;17-08.25;E;;;;;
// Lines are CRLF-terminated (Windows software).

import { rankHorizontal, rankVertical } from '../shared/rank.js';
import { inchesToFtIn, inchesToMeters } from '../shared/format.js';

function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function clean(s, max) {
  return String(s ?? '').replace(/;/g, ',').slice(0, max);
}

function hytekMark(inches, units) {
  if (typeof inches !== 'number') return units === 'M' ? 'NM' : 'NM';
  return units === 'M'
    ? inchesToMeters(inches).replace('m', '')
    : inchesToFtIn(inches);
}

function dRecord({ athlete, eventCode, mark, units, gender }) {
  const { first, last } = splitName(athlete.name);
  const f = new Array(18).fill('');
  f[0] = 'D';
  f[1] = clean(last, 20);
  f[2] = clean(first, 20);
  f[3] = '';                            // middle initial
  f[4] = athlete.gender || gender || ''; // M / F
  f[5] = '';                            // birth date
  f[6] = clean(athlete.teamCode || 'UNA', 4).toUpperCase();
  f[7] = clean(athlete.team || 'Unattached', 30);
  f[8] = '';                            // age
  f[9] = athlete.grade ?? '';           // school year
  f[10] = eventCode;                    // LJ / TJ / HJ / PV / SP / DT / JT
  f[11] = mark;
  f[12] = units;                        // E = English, M = Metric
  return f.join(';');
}

export function exportMeet(meet, units = 'E') {
  const lines = [];
  for (const event of meet.events) {
    const rows = event.type === 'vertical' ? rankVertical(event) : rankHorizontal(event);
    for (const r of rows) {
      const bestInches = event.type === 'vertical' ? r.best : r.best;
      lines.push(dRecord({
        athlete: r.athlete,
        eventCode: event.eventCode,
        mark: hytekMark(bestInches, units),
        units,
        gender: event.gender,
      }));
    }
  }
  return lines.join('\r\n') + '\r\n';
}
