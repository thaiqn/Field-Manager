// Ranking, rotation, and elimination logic shared by server and client.

export function attemptCount(event) {
  return event.format === 'open4' ? 4 : 6;
}

// ── Horizontal (long/triple jump, throws) ────────────────────

function validMarksDesc(atts) {
  return atts.filter((a) => typeof a === 'number').sort((a, b) => b - a);
}

// Best mark wins; ties broken by second-best, then third-best, etc.
export function rankHorizontal(event) {
  const n = attemptCount(event);
  const rows = event.athletes.map((ath) => {
    const atts = (event.results[ath.id] || []).slice(0, n);
    while (atts.length < n) atts.push(null);
    const marks = validMarksDesc(atts);
    return { athlete: ath, atts, marks, best: marks[0] ?? null, bestIdx: marks.length ? atts.indexOf(marks[0]) : -1 };
  });
  rows.sort((a, b) => {
    const len = Math.max(a.marks.length, b.marks.length);
    for (let i = 0; i < len; i++) {
      const d = (b.marks[i] ?? -1) - (a.marks[i] ?? -1);
      if (d !== 0) return d;
    }
    return 0;
  });
  let place = 0;
  rows.forEach((r, i) => {
    if (i > 0 && sameSeries(r.marks, rows[i - 1].marks)) r.p = rows[i - 1].p;
    else r.p = (place = i + 1);
    if (r.best === null) r.p = null; // NM — unplaced
  });
  return rows;
}

function sameSeries(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Rotation: rounds 1..3 in flight order; rounds 4..n in reverse rank order
// (current last place jumps first). Returns { round, nowId, deckId, holeId }.
export function rotation(event) {
  const n = attemptCount(event);
  const finalsStart = event.format === 'open4' ? n : 3; // open4 has no finals re-order
  const ranked = rankHorizontal(event);
  const flightOrder = event.athletes.map((a) => a.id);
  const reverseRank = [...ranked].reverse().map((r) => r.athlete.id);
  for (let round = 0; round < n; round++) {
    const order = round < finalsStart ? flightOrder : reverseRank;
    const queue = order.filter((id) => (event.results[id] || [])[round] == null);
    if (queue.length) {
      return { round: round + 1, nowId: queue[0] ?? null, deckId: queue[1] ?? null, holeId: queue[2] ?? null };
    }
  }
  return { round: n, nowId: null, deckId: null, holeId: null };
}

// ── Vertical (high jump, pole vault) ─────────────────────────
// results[athleteId] = per-height strings: '', 'X', 'XX', 'O', 'XO', 'XXO',
// 'XXX', 'P'. Elimination = 3 consecutive misses across heights.

export function verticalStatus(event, athleteId) {
  const cells = event.results[athleteId] || [];
  let consec = 0, out = false, bestIdx = -1, missesAtBest = 0, totalMisses = 0;
  for (let i = 0; i < event.heights.length; i++) {
    const c = cells[i] || '';
    if (c === 'P') { continue; }
    const misses = (c.match(/X/g) || []).length;
    totalMisses += misses;
    if (c.endsWith('O')) { consec = 0; bestIdx = i; missesAtBest = misses; }
    else { consec += misses; if (consec >= 3) { out = true; break; } }
  }
  return { out, bestIdx, best: bestIdx >= 0 ? event.heights[bestIdx] : null, missesAtBest, totalMisses };
}

// Highest cleared wins; ties: fewer misses at last-cleared height, then
// fewer total misses; still tied → shared place.
export function rankVertical(event) {
  const rows = event.athletes.map((ath) => ({ athlete: ath, ...verticalStatus(event, ath.id), cells: event.results[ath.id] || [] }));
  rows.sort((a, b) =>
    (b.bestIdx - a.bestIdx) || (a.missesAtBest - b.missesAtBest) || (a.totalMisses - b.totalMisses));
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.p = prev && r.bestIdx === prev.bestIdx && r.missesAtBest === prev.missesAtBest && r.totalMisses === prev.totalMisses
      ? prev.p : i + 1;
    if (r.bestIdx < 0) r.p = null; // NH
  });
  return rows;
}

// PR / SB badge: best mark beats the athlete's stored pr/sb seed.
export function badge(athlete, best) {
  if (typeof best !== 'number') return null;
  if (typeof athlete.prMark === 'number' && best > athlete.prMark) return 'PR';
  if (typeof athlete.sbMark === 'number' && best > athlete.sbMark) return 'SB';
  return null;
}
