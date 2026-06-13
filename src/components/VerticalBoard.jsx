// High jump / pole vault bar-height grid — light (A) and navy (B) variants.

import React from 'react';
import { BoardHead } from './BoardHead';
import { formatMark, inchesToFtIn } from '../../shared/format';
import { rankVertical } from '../../shared/rank';

const podium = (p) => (p && p <= 3 ? ' podium-' + p : '');
const code = (a) => (a.teamCode || a.team || '').slice(0, 3).toUpperCase();

function cellClass(cell, colIdx, cur, isActive) {
  let c = 'hj-cell';
  if (colIdx === cur) c += ' cur';
  if (isActive) c += ' is-active';
  if (!cell) return c;
  if (cell === 'XXX') return c + ' is-out';
  if (cell === 'P') return c + ' is-pass';
  if (cell.endsWith('O')) return c + ' is-clear';
  return c;
}

export function VBoard({ event, meet, units, dark, flash }) {
  const rows = rankVertical(event);
  const cur = event.curHeight ?? 0;
  const barLabel = units === 'M'
    ? formatMark(event.heights[cur], units)
    : inchesToFtIn(event.heights[cur], { decimals: 0 });
  // active = first still-in athlete whose current-bar cell is unresolved
  const active = rows.find((r) => !r.out && !/O|P|XXX/.test(r.cells[cur] || ''));
  const live = rows.some((r) => !r.out) ? `Live · Bar at ${barLabel}` : 'Final';

  return (
    <div className={'board' + (dark ? ' vb hjb' : '')}>
      <BoardHead event={event.name} meta={`${meet.name} · ${event.flightLabel} · Bar at ${barLabel}`} live={live} />
      <div className="hj-grid" style={{ gridTemplateColumns: `124px repeat(${event.heights.length}, 1fr)` }}>
        <div className="hj-colhead first">Athlete</div>
        {event.heights.map((h, i) => (
          <div key={i} className={'hj-colhead' + (i === cur ? ' cur' : '')}>
            {units === 'M' ? formatMark(h, units).replace('m', '') : inchesToFtIn(h, { decimals: 0 })}
          </div>
        ))}
        {rows.map((r) => (
          <React.Fragment key={r.athlete.id}>
            <div className={'hj-ath' + (r.out ? ' hj-row-out' : '') + podium(r.p)}>
              <div className="bd-place">{r.p ?? '–'}</div>
              <div>
                <div className="hj-ath-name">{r.athlete.name}</div>
                <div className="hj-ath-sub">
                  {code(r.athlete)} · {r.best === null ? 'NH' : (units === 'M' ? formatMark(r.best, units) : inchesToFtIn(r.best, { decimals: 0 }))}{' '}
                  {r.out ? <span className="out">out</span> : <span className="in">in</span>}
                </div>
              </div>
            </div>
            {event.heights.map((_, i) => {
              const cell = r.cells[i] || '';
              const isActive = active?.athlete.id === r.athlete.id && i === cur;
              let c = cellClass(cell, i, cur, isActive) + (r.out ? ' hj-row-out' : '');
              if (flash?.has(`${event.id}:${r.athlete.id}:${i}`)) c += ' is-flash';
              return <div key={i} className={c}>{cell === 'P' ? '—' : cell}</div>;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="bd-foot">
        <span>O clear</span><span>X miss</span><span>— pass</span><span>3 misses = out</span>
      </div>
    </div>
  );
}
