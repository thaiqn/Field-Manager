// shared-ui.jsx — components shared by the official + spectator views.
const { marks: M, store: S } = window.FEL;

// ── Hooks ───────────────────────────────────────────────────────
function useMeetState() {
  const [state, setState] = React.useState(S.get());
  React.useEffect(() => S.subscribe(s => setState(Object.assign({}, s))), []);
  return state;
}
function useUnits(initial) {
  const [units, setUnitsRaw] = React.useState(() => {
    try { return localStorage.getItem('fel-units') || initial || 'imperial'; } catch (e) { return 'imperial'; }
  });
  const setUnits = u => { setUnitsRaw(u); try { localStorage.setItem('fel-units', u); } catch (e) {} };
  return [units, setUnits];
}

// ── Status helpers ──────────────────────────────────────────────
function flightStatus(flight) {
  const started = M.flightStarted(flight);
  if (!started) return 'upcoming';
  if (flight.type === 'vertical') {
    return M.vertNextUp(flight) ? 'live' : 'final';
  }
  return M.horizNextUp(flight) ? 'live' : 'final';
}
function eventStatus(ev) {
  const st = ev.flights.map(flightStatus);
  if (st.some(s => s === 'live')) return 'live';
  if (st.length && st.every(s => s === 'final')) return 'final';
  return 'upcoming';
}
// Pending (athlete, round) cells in jump order; [0] is up now.
function horizQueue(flight) {
  const q = [];
  for (let r = 0; r < flight.rounds; r++) {
    for (const id of M.horizOrder(flight, r)) {
      const arr = flight.marks[id] || [];
      if (!arr[r]) q.push({ athleteId: id, round: r });
    }
  }
  return q;
}
function athleteById(flight, id) { return flight.athletes.find(a => a.id === id); }

// ── App chrome ──────────────────────────────────────────────────
function AppTop({ kicker, live, meet, children }) {
  return (
    <header className="app-top">
      <div className="app-top-inner">
        <div className="app-top-id">
          <div className="app-top-kicker">
            {live && <span className="live-dot"></span>}
            <span>{kicker}</span>
          </div>
          <div className="app-top-title">{meet.name}</div>
          <div className="app-top-meta">{meet.venue} · {meet.date}</div>
        </div>
        <div className="app-top-actions">{children}</div>
      </div>
    </header>
  );
}
function SegUnits({ units, onChange, light }) {
  return (
    <div className={'seg' + (light ? ' seg-light' : '')}>
      <button type="button" className={units === 'imperial' ? 'on' : ''} onClick={() => onChange('imperial')}>ft-in</button>
      <button type="button" className={units === 'metric' ? 'on' : ''} onClick={() => onChange('metric')}>m</button>
    </div>
  );
}
function Chips({ items, value, onChange }) {
  return (
    <div className="chips">
      {items.map(it => (
        <button key={it.id} type="button" className={'chip' + (it.id === value ? ' on' : '')} onClick={() => onChange(it.id)}>
          <span>{it.label}</span>
          {it.status === 'live' && <span className="chip-dot"></span>}
          {it.status === 'final' && <span className="chip-done">✓</span>}
        </button>
      ))}
    </div>
  );
}
function Badge({ kind }) {
  if (kind === 'MR') return <span className="badge-mr">Meet Record</span>;
  if (kind === 'PR') return <span className="badge-pr">New PR</span>;
  if (kind === 'SB') return <span className="badge-sb">Season Best</span>;
  return null;
}

// ── Attempt cell ────────────────────────────────────────────────
function attInfo(entry, i, bestIdx, units, isNow) {
  if (isNow) return { cls: 'va-att is-now', text: '·now·' };
  if (!entry) return { cls: 'va-att is-pending', text: '–' };
  if (entry.t === 'foul') return { cls: 'va-att is-foul', text: 'X' };
  if (entry.t === 'pass') return { cls: 'va-att is-pass', text: 'P' };
  return { cls: 'va-att' + (i === bestIdx ? ' is-best' : ''), text: M.fmtMark(entry.v, units) };
}
function bestIdxOf(attempts) {
  let bi = -1, bv = -1;
  (attempts || []).forEach((a, i) => { if (a && a.t === 'mark' && a.v > bv) { bv = a.v; bi = i; } });
  return bi;
}

// ── Hero card (direction C) ─────────────────────────────────────
function HeroCard({ flight, event, units, queue, ranked }) {
  if (!queue.length) return null;
  const { athleteId, round } = queue[0];
  const a = athleteById(flight, athleteId);
  if (!a) return null;
  const row = ranked.find(r => r.athlete.id === athleteId);
  const bi = bestIdxOf(flight.marks[athleteId]);
  const atts = [];
  for (let i = 0; i < flight.rounds; i++) {
    const entry = (flight.marks[athleteId] || [])[i];
    atts.push(attInfo(entry, i, bi, units, i === round));
  }
  const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  return (
    <div className="vc-hero" data-comment-anchor="hero-card">
      <div className="vc-hero-eyebrow">Now up · Attempt {round + 1} of {flight.rounds}</div>
      <div className="vc-hero-row">
        <div>
          <div className="vc-hero-name">{a.name}</div>
          <div className="vc-hero-team">{a.team} · Seed {M.fmtMark(a.seedM, units)}</div>
        </div>
        <div>
          <div className="vc-hero-mark">{row && row.best != null ? M.fmtMark(row.best, units) : '—'}</div>
          <div className="vc-hero-mark-label">{row && row.best != null ? 'Best today · ' + ord(row.place) : 'No mark yet'}</div>
        </div>
      </div>
      <div className="vc-hero-atts">
        {atts.map((x, i) => <span key={i} className={x.cls}>{x.text}</span>)}
      </div>
    </div>
  );
}

// ── Horizontal board (direction A + C hero) ─────────────────────
function HorizBoard({ event, flight, units, showHero, lastChange, interactive, selected, onSelect }) {
  const ranked = M.rankHorizontal(flight.athletes, flight.marks);
  const queue = horizQueue(flight);
  const status = flightStatus(flight);
  const started = status !== 'upcoming';
  const curRound = M.horizCurRound(flight);
  const deck = queue.length > 1 ? athleteById(flight, queue.find((q, i) => i > 0 && q.athleteId !== queue[0].athleteId)?.athleteId || queue[1].athleteId) : null;
  const now = queue.length ? athleteById(flight, queue[0].athleteId) : null;
  const fresh = lastChange && lastChange.fid === flight.id && (Date.now() - lastChange.ts) < 4000;

  return (
    <div className="board" data-screen-label={event.name + ' board'}>
      <div className="bd-head">
        <div className="bd-eyebrow">
          {status === 'live' && <span className="live-dot"></span>}
          <span>{status === 'live' ? 'Live · Round ' + (curRound + 1) + ' of ' + flight.rounds : status === 'final' ? 'Final' : 'Upcoming'}</span>
        </div>
        <h2 className="bd-title">{event.name}</h2>
        <div className="bd-meta">{flight.name} · {flight.athletes.length} athletes · {flight.format === 'open4' ? '4 attempts' : '3+3 finals'}{event.recordM ? ' · Record ' + M.fmtMark(event.recordM, units) : ''}</div>
      </div>

      {showHero && status === 'live' && (
        <HeroCard flight={flight} event={event} units={units} queue={queue} ranked={ranked} />
      )}

      {status === 'live' && now && (
        <div className="next-strip" style={{ marginTop: showHero ? 14 : 0 }}>
          <div className="next-cell">
            <span className="next-k">Up now</span>
            <span className="next-v">{now.name}<small>{now.team}</small></span>
          </div>
          <div className="next-cell">
            <span className="next-k">On deck</span>
            <span className="next-v">{deck ? deck.name : '—'}{deck && <small>{deck.team}</small>}</span>
          </div>
        </div>
      )}

      {!started && (
        <div className="empty-note">
          <span className="mono">Awaiting first round</span>
          Roster and seed marks below — results appear here live.
        </div>
      )}

      <div>
        {ranked.map(r => {
          const a = r.athlete;
          const bi = bestIdxOf(flight.marks[a.id]);
          const badge = started ? M.badgeFor(r.best, a, event.recordM) : null;
          const rowChanged = fresh && lastChange.athleteId === a.id;
          const isSel = interactive && selected && selected.athleteId === a.id;
          return (
            <div
              key={a.id}
              className={'va-row' + (started && r.best != null ? ' podium-' + Math.min(r.place, 4) : '') + (rowChanged ? ' just-changed' : '') + (isSel ? ' sheet-row-sel' : '')}
            >
              <div className="bd-place">{started ? r.place : '·'}</div>
              <div className="va-id">
                <div className="va-name">{a.name}</div>
                <div className="va-team">{a.team} · #{a.bib}</div>
                {badge && <Badge kind={badge} />}
              </div>
              <div className="va-best">
                <div className="va-best-mark">{started && r.best != null ? M.fmtMark(r.best, units) : M.fmtMark(a.seedM, units)}</div>
                <div className="va-best-label">{started && r.best != null ? 'Best' : 'Seed'}</div>
              </div>
              <div className="va-atts">
                {Array.from({ length: flight.rounds }).map((_, i) => {
                  const entry = (flight.marks[a.id] || [])[i];
                  const isNow = status === 'live' && queue.length && queue[0].athleteId === a.id && queue[0].round === i;
                  const x = attInfo(entry, i, bi, units, isNow);
                  const cellChanged = rowChanged && lastChange.round === i;
                  const selCell = isSel && selected.round === i;
                  if (interactive) {
                    return (
                      <button
                        key={i + (cellChanged ? '-' + lastChange.rev : '')}
                        type="button"
                        className={x.cls + ' tappable' + (cellChanged ? ' just-changed' : '') + (selCell ? ' sel' : '')}
                        onClick={() => onSelect(a.id, i)}
                      >{x.text}</button>
                    );
                  }
                  return <span key={i + (cellChanged ? '-' + lastChange.rev : '')} className={x.cls + (cellChanged ? ' just-changed' : '')}>{x.text}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bd-foot">
        <span>X foul</span><span>P pass</span><span>– pending</span>
        <span>Marks {M.unitSuffix(units)}</span>
        <span>Ties: 2nd-best mark</span>
      </div>
    </div>
  );
}

// ── Vertical board (bar grid) ───────────────────────────────────
function VertBoard({ event, flight, units, lastChange, showHero }) {
  const ranked = M.rankVertical(flight.athletes, flight.heights, flight.attempts);
  const status = flightStatus(flight);
  const nextUp = status === 'live' ? M.vertNextUp(flight) : null;
  const nowAth = nextUp ? athleteById(flight, nextUp.athleteId) : null;
  const cur = flight.curHeightIdx;
  const fresh = lastChange && lastChange.fid === flight.id && (Date.now() - lastChange.ts) < 4000;
  const started = status !== 'upcoming';

  return (
    <div className="board" data-screen-label={event.name + ' board'} style={{ '--hj-cols': flight.heights.length }}>
      <div className="bd-head">
        <div className="bd-eyebrow">
          {status === 'live' && <span className="live-dot"></span>}
          <span>{status === 'live' ? 'Live · Bar at ' + M.fmtMark(flight.heights[cur], units) : status === 'final' ? 'Final' : 'Upcoming'}</span>
        </div>
        <h2 className="bd-title">{event.name}</h2>
        <div className="bd-meta">{flight.name} · {M.vertAlive(flight).length} of {flight.athletes.length} still in{event.recordM ? ' · Meet record ' + M.fmtMark(event.recordM, units) : ''}</div>
      </div>

      {showHero && nowAth && (
        <div className="vc-hero" data-comment-anchor="hj-hero-card">
          <div className="vc-hero-eyebrow">Now attempting · Bar at {M.fmtMark(flight.heights[cur], units)}</div>
          <div className="vc-hero-row">
            <div>
              <div className="vc-hero-name">{nowAth.name}</div>
              <div className="vc-hero-team">{nowAth.team} · Seed {M.fmtMark(nowAth.seedM, units)}</div>
            </div>
            <div>
              <div className="vc-hero-mark">{((flight.attempts[nowAth.id] || {})[cur] || '') + '·'}</div>
              <div className="vc-hero-mark-label">Attempt {(((flight.attempts[nowAth.id] || {})[cur] || '').length) + 1} of 3</div>
            </div>
          </div>
        </div>
      )}

      <div className="hj-grid" style={{ marginTop: showHero && nowAth ? 14 : 0 }}>
        <div className="hj-colhead first">Athlete</div>
        {flight.heights.map((h, i) => (
          <div key={i} className={'hj-colhead' + (i === cur && status === 'live' ? ' cur' : '')}>{M.fmtMark(h, units)}</div>
        ))}
        {ranked.map(r => {
          const a = r.athlete;
          const rec = flight.attempts[a.id] || {};
          const badge = started ? M.badgeFor(r.best, a, event.recordM) : null;
          return (
            <React.Fragment key={a.id}>
              <div className={'hj-ath' + (r.out ? ' hj-row-out' : '') + (r.best != null ? ' podium-' + Math.min(r.place, 4) : '')}>
                <div className="bd-place">{started ? r.place : '·'}</div>
                <div>
                  <div className="hj-ath-name">{a.name}</div>
                  <div className="hj-ath-sub">
                    {a.team}{r.best != null ? ' · ' + M.fmtMark(r.best, units) : ''} {r.out ? <span className="out">out</span> : started ? <span className="in">in</span> : null}
                    {badge ? ' ' : ''}{badge && <Badge kind={badge} />}
                  </div>
                </div>
              </div>
              {flight.heights.map((h, i) => {
                const s = rec[i] || '';
                let cls = 'hj-cell';
                if (i === cur && status === 'live') cls += ' cur';
                if (s === 'XXX') cls += ' is-out';
                else if (s === 'P') cls += ' is-pass';
                else if (s.indexOf('O') >= 0) cls += ' is-clear';
                if (nextUp && nextUp.athleteId === a.id && i === cur && s && s !== 'P') cls += ' is-active';
                if (r.out) cls += ' hj-row-out';
                const changed = fresh && lastChange.athleteId === a.id && lastChange.heightIdx === i;
                return (
                  <div key={i + (changed ? '-' + lastChange.rev : '')} className={cls + (changed ? ' just-changed' : '')}>
                    {s === 'P' ? '—' : s}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div className="bd-foot">
        <span>O clear</span><span>X miss</span><span>— pass</span><span>3 straight misses = out</span>
        <span>Ties: countback</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  useMeetState, useUnits, flightStatus, eventStatus, horizQueue, athleteById,
  AppTop, SegUnits, Chips, Badge, attInfo, bestIdxOf, HeroCard, HorizBoard, VertBoard,
});
