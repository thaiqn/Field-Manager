import React from 'react';
import { BoardHead } from './BoardHead';
import { podiumClass } from './utils';
import { HJ_DATA, HJ_HEIGHTS, HJ_CUR } from '../data/demo';

function hjCellClass(mark, colIdx, row) {
  let c = 'hj-cell';
  if (colIdx === HJ_CUR) c += ' cur';
  if (row.activeCol === colIdx && !row.out) c += ' is-active';
  if (!mark) return c;
  if (mark === 'XXX') return c + ' is-out';
  if (mark === 'P') return c + ' is-pass';
  if (mark.endsWith('O')) return c + ' is-clear';
  return c;
}

export function HJGrid({ dark }) {
  return (
    <div className={'board' + (dark ? ' vb hjb' : '')}>
      <BoardHead
        event="Girls High Jump"
        meta="MVAL Championships · Varsity · Bar at 5-02"
        round="Bar at 5-02"
      />
      <div className="hj-grid">
        <div className="hj-colhead first">Athlete</div>
        {HJ_HEIGHTS.map((h, i) => (
          <div key={h} className={'hj-colhead' + (i === HJ_CUR ? ' cur' : '')}>{h}</div>
        ))}
        {HJ_DATA.map((a) => (
          <React.Fragment key={a.name}>
            <div className={'hj-ath' + (a.out ? ' hj-row-out' : '') + podiumClass(a.p)}>
              <div className="bd-place">{a.p}</div>
              <div>
                <div className="hj-ath-name">{a.name}</div>
                <div className="hj-ath-sub">
                  {a.team} · {a.best}{' '}
                  {a.out
                    ? <span className="out">out</span>
                    : <span className="in">in</span>}
                </div>
              </div>
            </div>
            {a.marks.map((m, i) => (
              <div
                key={i}
                className={hjCellClass(m, i, a) + (a.out ? ' hj-row-out' : '')}
              >
                {m === 'P' ? '—' : m || ''}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="bd-foot">
        <span>O clear</span><span>X miss</span><span>— pass</span><span>3 misses = out</span>
      </div>
    </div>
  );
}
