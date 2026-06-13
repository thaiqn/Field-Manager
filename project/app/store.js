// store.js — persistent meet state + cross-tab live sync.
// Persistence: localStorage. Sync: 'storage' events (cross-tab) + local emit (same tab).
window.FEL = window.FEL || {};
(function (FEL) {
  const KEY = 'fel-meet-v1';
  const fi = FEL.marks.fi;

  // ── Demo seed ─────────────────────────────────────────────────
  function seed() {
    let nextId = 1;
    const id = p => p + '-' + (nextId++);

    const ath = (name, team, bib, seedM, extra) =>
      Object.assign({ id: id('a'), name, team, bib, seedM }, extra || {});

    // Girls Long Jump — flight 1, mid round 4 (finals, reverse-rank order)
    const lj1 = [
      ath('Maya Patel', 'Milpitas', 214, fi(17, 2.5), { prM: fi(17, 2.5) }),
      ath('Jordan Lee', 'Milpitas', 208, fi(17, 0)),
      ath('Sofia Alvarez', 'Santa Clara', 317, fi(16, 6), { sbM: fi(16, 8) }),
      ath('Kendall Brooks', 'Palo Alto', 121, fi(16, 9)),
      ath('Riya Shah', 'Milpitas', 221, fi(16, 0)),
      ath('Amara Okafor', 'Fremont', 402, fi(16, 1)),
    ];
    const m = v => ({ t: 'mark', v });
    const F = { t: 'foul' }, P = { t: 'pass' };
    const ljMarks = {};
    ljMarks[lj1[0].id] = [m(fi(17, 1.5)), F, m(fi(17, 8.25))];           // 1st — PR
    ljMarks[lj1[1].id] = [m(fi(16, 9)), m(fi(16, 11.5)), F];             // 2nd
    ljMarks[lj1[2].id] = [m(fi(16, 7.25)), m(fi(16, 10)), m(fi(16, 4.5))]; // 3rd — SB
    ljMarks[lj1[3].id] = [F, m(fi(16, 8.75)), m(fi(16, 2))];             // 4th
    ljMarks[lj1[4].id] = [m(fi(15, 11)), P, m(fi(16, 1.25))];            // 5th
    ljMarks[lj1[5].id] = [m(fi(15, 8.5)), m(fi(15, 10)), F];             // 6th — up now

    // Girls Long Jump — flight 2, not started
    const lj2 = [
      ath('Naomi Castillo', 'Palo Alto', 134, fi(15, 6)),
      ath('Beth Liang', 'Milpitas', 230, fi(15, 4)),
      ath('Harper Quinn', 'Fremont', 415, fi(15, 1)),
      ath('Zoe Mendez', 'Santa Clara', 322, fi(14, 10)),
    ];

    // Boys Triple Jump — not started
    const tj = [
      ath('Devon Carter', 'Milpitas', 102, fi(42, 6)),
      ath('Luis Herrera', 'Santa Clara', 311, fi(41, 9)),
      ath('Sam Nakamura', 'Milpitas', 118, fi(41, 2)),
      ath('Eli Thompson', 'Palo Alto', 145, fi(40, 7)),
      ath('Andre Bishop', 'Fremont', 421, fi(39, 11)),
    ];

    // Boys Shot Put — complete; winner breaks the meet record (MR badge)
    const sp = [
      ath('Marcus Webb', 'Milpitas', 110, fi(50, 2), { prM: fi(51, 6) }),
      ath('Tomas Riva', 'Palo Alto', 152, fi(48, 10)),
      ath('DeShawn Cole', 'Fremont', 433, fi(47, 5), { sbM: fi(47, 8) }),
      ath('Pete Okonkwo', 'Santa Clara', 308, fi(45, 0)),
      ath('Vik Sandhu', 'Milpitas', 125, fi(43, 7)),
    ];
    const spMarks = {};
    spMarks[sp[0].id] = [m(fi(49, 8)), m(fi(50, 11)), F, m(fi(51, 4.5)), m(fi(52, 3.5)), F];   // MR
    spMarks[sp[1].id] = [m(fi(47, 6)), m(fi(48, 4.25)), m(fi(48, 9)), F, m(fi(49, 1.5)), m(fi(48, 0))];
    spMarks[sp[2].id] = [F, m(fi(46, 11)), m(fi(47, 10.5)), m(fi(47, 2)), F, m(fi(47, 6.75))]; // SB
    spMarks[sp[3].id] = [m(fi(44, 3)), m(fi(44, 10.25)), m(fi(43, 8)), m(fi(45, 1)), F, m(fi(44, 6))];
    spMarks[sp[4].id] = [m(fi(42, 1)), F, m(fi(43, 5.5)), P, m(fi(42, 9)), m(fi(43, 0.25))];

    // Girls High Jump — in progress, bar at 5-02
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
      rev: 1,
      lastChange: null,
      meet: { name: 'MVAL Championships', venue: 'Milpitas High School', date: 'May 8, 2026', code: 'TROJAN' },
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

  // ── State + sync ──────────────────────────────────────────────
  function load() {
    try {
      const s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  let state = load();
  if (!state || !state.events) { state = seed(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  // migrate older saved states
  if (!state.meet.code) state.meet.code = 'TROJAN';
  state.events.forEach(ev => ev.flights.forEach(f => {
    if (f.type === 'horizontal' && !f.format) f.format = f.rounds === 4 ? 'open4' : 'final3';
  }));

  const listeners = new Set();
  function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }
  function save(change) {
    state.rev = (state.rev || 0) + 1;
    if (change) state.lastChange = Object.assign({ ts: Date.now(), rev: state.rev }, change);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    emit();
  }
  window.addEventListener('storage', e => {
    if (e.key === KEY && e.newValue) {
      try { state = JSON.parse(e.newValue); emit(); } catch (err) {}
    }
  });

  // ── Lookups ───────────────────────────────────────────────────
  const findEvent = eid => state.events.find(e => e.id === eid);
  const findFlight = (eid, fid) => {
    const ev = findEvent(eid);
    return ev ? ev.flights.find(f => f.id === fid) : null;
  };

  let nextSeq = Date.now() % 100000;
  const newId = p => p + '-x' + (nextSeq++);

  // ── Mutators ──────────────────────────────────────────────────
  FEL.store = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    findEvent, findFlight,

    // Horizontal: entry = {t:'mark', v:meters} | {t:'foul'} | {t:'pass'} | null (clear)
    recordMark(eid, fid, athleteId, round, entry) {
      const fl = findFlight(eid, fid); if (!fl) return;
      if (!fl.marks[athleteId]) fl.marks[athleteId] = [];
      fl.marks[athleteId][round] = entry;
      save({ type: 'mark', eid, fid, athleteId, round });
    },

    // Vertical: result = 'O' | 'X' | 'P'
    vertRecord(eid, fid, athleteId, result) {
      const fl = findFlight(eid, fid); if (!fl) return;
      if (!fl.attempts[athleteId]) fl.attempts[athleteId] = {};
      const h = fl.curHeightIdx;
      const cur = fl.attempts[athleteId][h] || '';
      fl.attempts[athleteId][h] = result === 'P' ? 'P' : cur + result;
      save({ type: 'vert', eid, fid, athleteId, heightIdx: h });
    },
    vertUndo(eid, fid, athleteId) {
      const fl = findFlight(eid, fid); if (!fl) return;
      const h = fl.curHeightIdx;
      const rec = fl.attempts[athleteId] || {};
      if (!rec[h]) return;
      rec[h] = rec[h] === 'P' ? '' : rec[h].slice(0, -1);
      if (!rec[h]) delete rec[h];
      save({ type: 'vert', eid, fid, athleteId, heightIdx: h });
    },
    setBar(eid, fid, heightIdx) {
      const fl = findFlight(eid, fid); if (!fl) return;
      fl.curHeightIdx = Math.max(0, Math.min(fl.heights.length - 1, heightIdx));
      save({ type: 'bar', eid, fid });
    },
    addHeight(eid, fid, meters) {
      const fl = findFlight(eid, fid); if (!fl) return;
      fl.heights.push(meters);
      save({ type: 'bar', eid, fid });
    },

    // Setup
    updateMeet(patch) { Object.assign(state.meet, patch); save({ type: 'meet' }); },
    regenerateCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O — easier to read aloud at the pit
      let c = '';
      for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
      state.meet.code = c;
      save({ type: 'meet' });
      return c;
    },
    addEvent(name, kind, format) {
      const ev = { id: newId('e'), name, kind, recordM: null, flights: [] };
      state.events.push(ev);
      FEL.store.addFlight(ev.id, kind === 'vertical' ? 'Varsity' : 'Flight 1', format);
      return ev.id;
    },
    addFlight(eid, name, format) {
      const ev = findEvent(eid); if (!ev) return;
      const fmt = format || (ev.flights[0] && ev.flights[0].format) || 'final3';
      ev.flights.push(ev.kind === 'vertical'
        ? { id: newId('f'), name, type: 'vertical', athletes: [], heights: [fi(4, 6), fi(4, 8), fi(4, 10)], curHeightIdx: 0, attempts: {} }
        : { id: newId('f'), name, type: 'horizontal', rounds: fmt === 'open4' ? 4 : 6, format: fmt, athletes: [], marks: {} });
      save({ type: 'setup' });
    },
    setFlightFormat(eid, fid, format) {
      const fl = findFlight(eid, fid); if (!fl || fl.type !== 'horizontal') return;
      fl.format = format;
      fl.rounds = format === 'open4' ? 4 : 6;
      Object.keys(fl.marks).forEach(k => { // drop entries beyond the new round count
        if (fl.marks[k] && fl.marks[k].length > fl.rounds) fl.marks[k].length = fl.rounds;
      });
      save({ type: 'setup' });
    },
    addAthlete(eid, fid, athlete) {
      const fl = findFlight(eid, fid); if (!fl) return;
      fl.athletes.push(Object.assign({ id: newId('a') }, athlete));
      save({ type: 'setup' });
    },
    removeAthlete(eid, fid, athleteId) {
      const fl = findFlight(eid, fid); if (!fl) return;
      fl.athletes = fl.athletes.filter(a => a.id !== athleteId);
      if (fl.marks) delete fl.marks[athleteId];
      if (fl.attempts) delete fl.attempts[athleteId];
      save({ type: 'setup' });
    },
    setRecord(eid, recordM) {
      const ev = findEvent(eid); if (!ev) return;
      ev.recordM = recordM;
      save({ type: 'setup' });
    },

    resetDemo() { state = seed(); save({ type: 'reset' }); },
  };
})(window.FEL);
