// hytek.js — results export in Hy-Tek's semi-colon delimited format.
// Imports into Track & Field Meet Manager 6.0 via
// File / Import / Semi-Colon Delimited Rosters/Entries File.
// Spec: H header record + one 33-field E record per individual field-event
// result. Ported from the design prototype's hytek-export.js.

import * as M from '../shared/marks.js';

// English field mark per Hy-Tek examples: 12'10.25, 14'10, 11'
function hyMark(meters, units) {
  if (units === 'metric') return meters.toFixed(2);
  const totalIn = Math.floor(M.toInches(meters) / 0.25 + 0.01) * 0.25;
  const ft = Math.floor(totalIn / 12);
  const rem = +(totalIn - ft * 12).toFixed(2);
  return ft + "'" + (rem ? (rem % 1 === 0 ? rem.toFixed(0) : rem) : '');
}

function eventCode(name) {
  const n = name.toLowerCase();
  if (n.includes('triple')) return 'TJ';
  if (n.includes('long')) return 'LJ';
  if (n.includes('high')) return 'HJ';
  if (n.includes('pole')) return 'PV';
  if (n.includes('shot')) return 'SP';
  if (n.includes('discus')) return 'DC';
  if (n.includes('javelin')) return 'JT';
  if (n.includes('hammer')) return 'HT';
  return 'LJ';
}
function eventGender(name) {
  const n = name.toLowerCase();
  if (/\b(girls|women|female)\b/.test(n)) return 'F';
  if (/\b(boys|men|male)\b/.test(n)) return 'M';
  return 'X';
}
function splitName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
const clean = (s, max) => String(s == null ? '' : s).replace(/;/g, ',').slice(0, max);
function hyDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return p(d.getMonth() + 1) + '/' + p(d.getDate()) + '/' + d.getFullYear();
}

// 33-field E record (Individual Event Result).
function eRecord({ evNum, ev, flightIdx, flightName, row, units }) {
  const a = row.athlete;
  const nm = splitName(a.name);
  const g = eventGender(ev.name);
  let mark;
  if (row.best != null) mark = hyMark(row.best, units);
  else mark = ev.kind === 'vertical' ? 'NH' : 'ND';
  const f = new Array(34).fill('');
  f[1] = 'E';
  f[2] = 'F';                                  // field event
  f[3] = evNum;                                // event number
  f[5] = eventCode(ev.name);                   // event code
  f[6] = g;                                    // event gender
  f[9] = clean(flightName, 15);                // division name
  f[10] = 'F';                                 // round = finals
  f[11] = mark;                                // result mark
  f[12] = units === 'metric' ? 'M' : 'E';      // measurement
  f[14] = row.overallPlace;                    // overall place
  f[15] = row.place;                           // heat (flight) place
  f[16] = flightIdx + 1;                       // heat (flight) number
  f[23] = clean(nm.last, 20);
  f[24] = clean(nm.first, 20);
  f[26] = g;                                   // athlete gender
  f[28] = clean(a.team, 4).toUpperCase();      // team code
  f[29] = clean(a.team, 25);                   // team name
  f[32] = clean(a.bib, 5);                     // competitor #
  return f.slice(1).join(';');
}

// Overall places for multi-flight horizontal events: rank the union.
export function buildResults(meet, units) {
  const info = meet.meet;
  const lines = [];
  lines.push(['H', clean(info.name, 45), hyDate(info.date), hyDate(info.date),
    'Field Events Live (prototype)', hyDate(new Date().toDateString()),
    clean(info.venue, 100)].join(';'));

  meet.events.forEach((ev, ei) => {
    const evNum = ei + 1;
    if (ev.kind === 'horizontal') {
      const union = [];
      const unionMarks = {};
      ev.flights.forEach(fl => fl.athletes.forEach(a => {
        union.push(a);
        unionMarks[a.id] = fl.marks[a.id] || [];
      }));
      const overall = M.rankHorizontal(union, unionMarks);
      const overallPlace = {};
      overall.forEach(r => { overallPlace[r.athlete.id] = r.place; });

      ev.flights.forEach((fl, fidx) => {
        M.rankHorizontal(fl.athletes, fl.marks).forEach(r => {
          const attempted = (fl.marks[r.athlete.id] || []).some(e => e);
          if (!attempted) return;
          r.overallPlace = overallPlace[r.athlete.id];
          lines.push(eRecord({ evNum, ev, flightIdx: fidx, flightName: fl.name, row: r, units }));
        });
      });
    } else {
      ev.flights.forEach((fl, fidx) => {
        M.rankVertical(fl.athletes, fl.heights, fl.attempts).forEach(r => {
          const attempted = Object.keys(fl.attempts[r.athlete.id] || {}).length > 0;
          if (!attempted) return;
          r.overallPlace = r.place;
          lines.push(eRecord({ evNum, ev, flightIdx: fidx, flightName: fl.name, row: r, units }));
        });
      });
    }
  });
  return lines.join('\r\n') + '\r\n';
}

export { hyMark, eventCode };
