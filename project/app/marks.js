// marks.js — unit conversion, mark formatting, ranking & rotation logic.
// Canonical unit everywhere: meters (number). Plain JS, no JSX.
window.FEL = window.FEL || {};
(function (FEL) {
  const M_PER_IN = 0.0254;

  // feet+inches -> meters
  function fi(ft, inch) { return +(((ft * 12) + inch) * M_PER_IN).toFixed(4); }
  function toInches(m) { return m / M_PER_IN; }

  // Field-event rule: imperial marks read to the lesser quarter inch.
  function fmtImperial(m) {
    if (m == null) return '';
    const totalIn = Math.floor(toInches(m) / 0.25 + 0.01) * 0.25;
    const ft = Math.floor(totalIn / 12);
    const rem = totalIn - ft * 12;
    const whole = Math.floor(rem);
    const frac = +(rem - whole).toFixed(2);
    const fracStr = frac ? frac.toFixed(2).slice(1) : '';
    return ft + '-' + String(whole).padStart(2, '0') + fracStr;
  }
  function fmtMetric(m) { return m == null ? '' : m.toFixed(2); }
  function fmtMark(m, units) { return units === 'metric' ? fmtMetric(m) : fmtImperial(m); }
  function unitSuffix(units) { return units === 'metric' ? 'm' : 'ft-in'; }

  // ── Horizontal events (jumps for distance + throws) ──────────
  // attempt entry: {t:'mark', v:meters} | {t:'foul'} | {t:'pass'} | null (pending)

  function sortedMarks(attempts) {
    return (attempts || []).filter(a => a && a.t === 'mark').map(a => a.v).sort((a, b) => b - a);
  }
  function cmpHoriz(x, y) {
    const a = x.sorted, b = y.sorted;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const av = a[i] != null ? a[i] : -1;
      const bv = b[i] != null ? b[i] : -1;
      if (av !== bv) return bv - av;
    }
    return 0;
  }
  // -> [{athlete, sorted, best, place}] sorted by standing; no-mark athletes last (roster order)
  function rankHorizontal(athletes, marks) {
    const rows = athletes.map((a, i) => {
      const sorted = sortedMarks(marks[a.id]);
      return { athlete: a, sorted, best: sorted.length ? sorted[0] : null, rosterIdx: i };
    });
    rows.sort((x, y) => {
      const c = cmpHoriz(x, y);
      return c !== 0 ? c : x.rosterIdx - y.rosterIdx;
    });
    rows.forEach((r, i) => {
      r.place = (i > 0 && cmpHoriz(rows[i - 1], r) === 0) ? rows[i - 1].place : i + 1;
    });
    return rows;
  }
  // Jump order for a given round (0-indexed).
  // format 'final3' (3+3): rounds 1-3 roster order, finals (4-6) reverse rank.
  // format 'open4' (4 attempts total): roster order throughout.
  function horizOrder(flight, round) {
    const prelims = flight.format === 'open4' ? flight.rounds : Math.min(3, flight.rounds);
    if (round < prelims) return flight.athletes.map(a => a.id);
    return rankHorizontal(flight.athletes, flight.marks).slice().reverse().map(r => r.athlete.id);
  }
  // First unfilled (athlete, round) cell in rotation order. null => flight complete.
  function horizNextUp(flight) {
    for (let r = 0; r < flight.rounds; r++) {
      const order = horizOrder(flight, r);
      for (const id of order) {
        const arr = flight.marks[id] || [];
        if (!arr[r]) return { athleteId: id, round: r };
      }
    }
    return null;
  }
  function horizCurRound(flight) {
    const nu = horizNextUp(flight);
    return nu ? nu.round : flight.rounds - 1;
  }
  function flightStarted(flight) {
    if (flight.type === 'vertical') {
      return Object.values(flight.attempts || {}).some(rec => Object.values(rec).some(s => s));
    }
    return Object.values(flight.marks || {}).some(arr => (arr || []).some(e => e));
  }

  // ── Vertical events (high jump / pole vault) ──────────────────
  // flight.heights: [meters...], flight.attempts: { athleteId: { heightIdx: 'XO'|'P'|... } }

  function vertStats(heights, rec) {
    let bestIdx = -1, missesAtBest = 0, totalMisses = 0;
    heights.forEach((h, i) => {
      const s = rec[i] || '';
      const x = (s.match(/X/g) || []).length;
      totalMisses += x;
      if (s.indexOf('O') >= 0) { bestIdx = i; missesAtBest = x; }
    });
    return { bestIdx, missesAtBest, totalMisses };
  }
  // Three consecutive misses (passes don't reset the count) => out.
  function isEliminated(heights, rec) {
    let seq = '';
    heights.forEach((h, i) => { seq += (rec[i] || '').replace(/[^XO]/g, ''); });
    return /XXX/.test(seq);
  }
  function rankVertical(athletes, heights, attempts) {
    const rows = athletes.map((a, i) => {
      const rec = attempts[a.id] || {};
      const st = vertStats(heights, rec);
      return {
        athlete: a, rosterIdx: i, bestIdx: st.bestIdx,
        missesAtBest: st.missesAtBest, totalMisses: st.totalMisses,
        best: st.bestIdx >= 0 ? heights[st.bestIdx] : null,
        out: isEliminated(heights, rec),
      };
    });
    const cmp = (x, y) =>
      (y.bestIdx - x.bestIdx) ||
      (x.missesAtBest - y.missesAtBest) ||
      (x.totalMisses - y.totalMisses);
    rows.sort((x, y) => cmp(x, y) || x.rosterIdx - y.rosterIdx);
    rows.forEach((r, i) => {
      r.place = (i > 0 && cmp(rows[i - 1], r) === 0) ? rows[i - 1].place : i + 1;
    });
    return rows;
  }
  // Athlete still owed an attempt at the current bar, in rotation order.
  function vertNextUp(flight) {
    const hIdx = flight.curHeightIdx;
    const open = flight.athletes.filter(a => {
      const rec = flight.attempts[a.id] || {};
      if (isEliminated(flight.heights, rec)) return false;
      const s = rec[hIdx] || '';
      return !(s.indexOf('O') >= 0 || s === 'P' || (s.match(/X/g) || []).length >= 3);
    });
    if (!open.length) return null;
    const attCount = a => ((flight.attempts[a.id] || {})[hIdx] || '').length;
    const min = Math.min.apply(null, open.map(attCount));
    return { athleteId: open.find(a => attCount(a) === min).id };
  }
  function vertAlive(flight) {
    return flight.athletes.filter(a => !isEliminated(flight.heights, flight.attempts[a.id] || {}));
  }

  // ── Badges ────────────────────────────────────────────────────
  // Precedence: meet record > PR > season best.
  function badgeFor(best, athlete, recordM) {
    if (best == null) return null;
    if (recordM && best > recordM + 1e-9) return 'MR';
    if (athlete.prM && best > athlete.prM + 1e-9) return 'PR';
    if (athlete.sbM && best > athlete.sbM + 1e-9) return 'SB';
    return null;
  }

  FEL.marks = {
    fi, toInches, fmtImperial, fmtMetric, fmtMark, unitSuffix,
    sortedMarks, rankHorizontal, horizOrder, horizNextUp, horizCurRound, flightStarted,
    vertStats, isEliminated, rankVertical, vertNextUp, vertAlive, badgeFor,
  };
})(window.FEL);
