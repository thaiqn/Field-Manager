import { BoardHead } from './BoardHead';
import { attClass, attText, podiumClass } from './utils';
import { LJ_DATA } from '../data/demo';

export function LJBoardA() {
  return (
    <div className="board">
      <BoardHead event="Girls Long Jump" meta="MVAL Championships · Varsity · Flight 1 of 2" />
      <div className="next-strip">
        <div className="next-cell">
          <span className="next-k">Up now</span>
          <span className="next-v">Amara Okafor<small>Fremont</small></span>
        </div>
        <div className="next-cell">
          <span className="next-k">On deck</span>
          <span className="next-v">Riya Shah<small>Milpitas</small></span>
        </div>
      </div>
      <div>
        {LJ_DATA.map((a) => (
          <div key={a.name} className={'va-row' + podiumClass(a.p)}>
            <div className="bd-place">{a.p}</div>
            <div className="va-id">
              <div className="va-name">{a.name}</div>
              <div className="va-team">{a.team}</div>
              {a.badge === 'PR' && <span className="badge-pr">New PR</span>}
              {a.badge === 'SB' && <span className="badge-sb">Season Best</span>}
            </div>
            <div className="va-best">
              <div className="va-best-mark">{a.best}</div>
              <div className="va-best-label">Best</div>
            </div>
            <div className="va-atts">
              {a.atts.map((att, i) => (
                <span key={i} className={attClass(att, i, a.bestIdx)}>{attText(att)}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bd-foot">
        <span>X foul</span><span>P pass</span><span>– pending</span><span>Marks ft-in</span>
      </div>
    </div>
  );
}
