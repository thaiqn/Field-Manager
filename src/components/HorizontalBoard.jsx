// Long/triple jump (and throws) leaderboard — variants A (editorial),
// B (stadium), C (pit view) from the design exploration, now data-driven.

import { BoardHead } from './BoardHead';
import { formatMark } from '../../shared/format';
import { rankHorizontal, rotation, attemptCount, badge } from '../../shared/rank';

const podium = (p) => (p && p <= 3 ? ' podium-' + p : '');
const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th');

function attCell({ att, i, bestIdx, isNow, units, flashKey, flash }) {
  let c = 'va-att';
  let t;
  if (isNow) { c += ' is-pending'; t = '·now·'; }
  else if (att === null || att === undefined) { c += ' is-pending'; t = '–'; }
  else if (att === 'X') { c += ' is-foul'; t = 'X'; }
  else if (att === 'P') { c += ' is-pass'; t = 'P'; }
  else { t = formatMark(att, units); if (i === bestIdx) c += ' is-best'; }
  if (flash?.has(flashKey)) c += ' is-flash';
  return <span key={i} className={c}>{t}</span>;
}

function useBoard(event) {
  const rows = rankHorizontal(event);
  const rot = rotation(event);
  const name = (id) => event.athletes.find((a) => a.id === id)?.name || '—';
  const team = (id) => event.athletes.find((a) => a.id === id)?.team || '';
  return { rows, rot, name, team, n: attemptCount(event) };
}

function liveText(event, rot) {
  const n = attemptCount(event);
  return rot.nowId ? `Live · Round ${rot.round} of ${n}` : 'Final';
}

function footLegend(units) {
  return (
    <div className="bd-foot">
      <span>X foul</span><span>P pass</span><span>– pending</span>
      <span>Marks {units === 'M' ? 'meters' : 'ft-in'}</span>
    </div>
  );
}

function MainRows({ event, rows, rot, units, flash }) {
  return (
    <div>
      {rows.map((r) => {
        const bdg = badge(r.athlete, r.best);
        return (
          <div key={r.athlete.id} className={'va-row' + podium(r.p)}>
            <div className="bd-place">{r.p ?? '–'}</div>
            <div className="va-id">
              <div className="va-name">{r.athlete.name}</div>
              <div className="va-team">{r.athlete.team}</div>
              {bdg === 'PR' && <span className="badge-pr">New PR</span>}
              {bdg === 'SB' && <span className="badge-sb">Season Best</span>}
            </div>
            <div className="va-best">
              <div className="va-best-mark">{r.best === null ? 'NM' : formatMark(r.best, units)}</div>
              <div className="va-best-label">Best</div>
            </div>
            <div className="va-atts" style={{ gridTemplateColumns: `repeat(${r.atts.length}, 1fr)` }}>
              {r.atts.map((att, i) => attCell({
                att, i, bestIdx: r.bestIdx,
                isNow: rot.nowId === r.athlete.id && rot.round - 1 === i,
                units, flash, flashKey: `${event.id}:${r.athlete.id}:${i}`,
              }))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── A · Editorial table ───────────────────────────────────────
export function HBoardA({ event, meet, units, flash }) {
  const { rows, rot, name, team } = useBoard(event);
  return (
    <div className="board">
      <BoardHead event={event.name} meta={`${meet.name} · ${event.flightLabel}`} live={liveText(event, rot)} />
      {rot.nowId && (
        <div className="next-strip">
          <div className="next-cell">
            <span className="next-k">Up now</span>
            <span className="next-v">{name(rot.nowId)}<small>{team(rot.nowId)}</small></span>
          </div>
          <div className="next-cell">
            <span className="next-k">On deck</span>
            <span className="next-v">{name(rot.deckId)}<small>{team(rot.deckId)}</small></span>
          </div>
        </div>
      )}
      <MainRows event={event} rows={rows} rot={rot} units={units} flash={flash} />
      {footLegend(units)}
    </div>
  );
}

// ── B · Stadium board ─────────────────────────────────────────
export function HBoardB({ event, meet, units, flash }) {
  const { rows, rot, name } = useBoard(event);
  return (
    <div className="board vb">
      <BoardHead event={event.name} meta={`${meet.name} · ${event.flightLabel}`} live={liveText(event, rot)} />
      {rot.nowId && (
        <div className="vb-next">
          <span><span className="k">Up now</span><b>{name(rot.nowId)}</b></span>
          <span><span className="k">On deck</span><b>{name(rot.deckId)}</b></span>
        </div>
      )}
      <MainRows event={event} rows={rows} rot={rot} units={units} flash={flash} />
      {footLegend(units)}
    </div>
  );
}

// ── C · Pit view ──────────────────────────────────────────────
const initial = (full) => {
  const parts = full.split(' ');
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : full;
};

export function HBoardC({ event, meet, units, flash }) {
  const { rows, rot, name } = useBoard(event);
  const hero = rows.find((r) => r.athlete.id === rot.nowId);
  return (
    <div className="board">
      <BoardHead event={event.name} meta={`${meet.name} · ${event.flightLabel}`} live={liveText(event, rot)} />
      {rot.nowId && (
        <div className="vc-ticker">
          <div className="vc-tick"><span className="k">Now</span><b>{initial(name(rot.nowId))}</b></div>
          {rot.deckId && <div className="vc-tick"><span className="k">Deck</span><b>{initial(name(rot.deckId))}</b></div>}
          {rot.holeId && <div className="vc-tick"><span className="k">Hole</span><b>{initial(name(rot.holeId))}</b></div>}
        </div>
      )}
      {hero && (
        <div className="vc-hero">
          <div className="vc-hero-eyebrow">Now jumping · Attempt {rot.round} of {hero.atts.length}</div>
          <div className="vc-hero-row">
            <div>
              <div className="vc-hero-name">{hero.athlete.name}</div>
              <div className="vc-hero-team">
                {hero.athlete.team}{hero.athlete.seed ? ` · Seed ${formatMark(hero.athlete.seed, units)}` : ''}
              </div>
            </div>
            <div>
              <div className="vc-hero-mark">{hero.best === null ? 'NM' : formatMark(hero.best, units)}</div>
              <div className="vc-hero-mark-label">Best today{hero.p ? ` · ${ord(hero.p)}` : ''}</div>
            </div>
          </div>
          <div className="vc-hero-atts vb">
            {hero.atts.map((att, i) => attCell({
              att, i, bestIdx: hero.bestIdx,
              isNow: rot.round - 1 === i,
              units, flash, flashKey: `${event.id}:${hero.athlete.id}:${i}`,
            }))}
          </div>
        </div>
      )}
      <div className="vc-rows">
        {rows.map((r) => (
          <div key={r.athlete.id} className={'vc-row' + podium(r.p)}>
            <div className="bd-place">{r.p ?? '–'}</div>
            <div className="vc-id">
              <div className="vc-name">{r.athlete.name}</div>
              <div className="vc-team">{r.athlete.team}</div>
            </div>
            <div className="vc-dots">
              {r.atts.map((att, i) => {
                let c = 'vc-dot', t = '';
                const isNow = rot.nowId === r.athlete.id && rot.round - 1 === i;
                if (isNow) c += ' active';
                else if (att === 'X') { c += ' foul'; t = 'X'; }
                else if (att === 'P') { c += ' pass'; t = 'P'; }
                else if (typeof att === 'number' && i === r.bestIdx) { c += ' best'; t = '★'; }
                else if (typeof att === 'number') { c += ' ok'; t = '✓'; }
                if (flash?.has(`${event.id}:${r.athlete.id}:${i}`)) c += ' is-flash';
                return <span key={i} className={c}>{t}</span>;
              })}
            </div>
            <div className="vc-best">{r.best === null ? 'NM' : formatMark(r.best, units)}</div>
          </div>
        ))}
      </div>
      <div className="bd-foot">
        <span>★ best</span><span>✓ legal</span><span>X foul</span><span>□ pending</span>
      </div>
    </div>
  );
}
