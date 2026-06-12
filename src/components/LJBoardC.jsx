import { BoardHead } from './BoardHead';
import { podiumClass } from './utils';
import { LJ_DATA } from '../data/demo';

const HERO_ATTS = [
  { t: '15-08.50', c: 'va-att' },
  { t: '15-10.00', c: 'va-att is-best' },
  { t: 'X',        c: 'va-att is-foul' },
  { t: '·now·',    c: 'va-att is-pending' },
  { t: '–',        c: 'va-att is-pending' },
  { t: '–',        c: 'va-att is-pending' },
];

export function LJBoardC() {
  return (
    <div className="board">
      <BoardHead event="Girls Long Jump" meta="MVAL Championships · Varsity · Flight 1 of 2" />
      <div className="vc-ticker">
        <div className="vc-tick"><span className="k">Now</span><b>A. Okafor</b></div>
        <div className="vc-tick"><span className="k">Deck</span><b>R. Shah</b></div>
        <div className="vc-tick"><span className="k">Hole</span><b>K. Brooks</b></div>
      </div>
      <div className="vc-hero">
        <div className="vc-hero-eyebrow">Now jumping · Attempt 4 of 6</div>
        <div className="vc-hero-row">
          <div>
            <div className="vc-hero-name">Amara Okafor</div>
            <div className="vc-hero-team">Fremont · Seed 16-01.00</div>
          </div>
          <div>
            <div className="vc-hero-mark">15-10.00</div>
            <div className="vc-hero-mark-label">Best today · 6th</div>
          </div>
        </div>
        <div className="vc-hero-atts vb">
          {HERO_ATTS.map((h, i) => (
            <span key={i} className={h.c}>{h.t}</span>
          ))}
        </div>
      </div>
      <div className="vc-rows">
        {LJ_DATA.map((a) => (
          <div key={a.name} className={'vc-row' + podiumClass(a.p)}>
            <div className="bd-place">{a.p}</div>
            <div className="vc-id">
              <div className="vc-name">{a.name}</div>
              <div className="vc-team">{a.team}</div>
            </div>
            <div className="vc-dots">
              {a.atts.map((att, i) => {
                let c = 'vc-dot';
                let t = '';
                if (att === 'X')         { c += ' foul';   t = 'X'; }
                else if (att === 'P')    { c += ' pass';   t = 'P'; }
                else if (att === 'NOW')  { c += ' active'; }
                else if (att !== null && i === a.bestIdx) { c += ' best'; t = '★'; }
                else if (att !== null)   { c += ' ok';     t = '✓'; }
                return <span key={i} className={c}>{t}</span>;
              })}
            </div>
            <div className="vc-best">{a.best}</div>
          </div>
        ))}
      </div>
      <div className="bd-foot">
        <span>★ best</span><span>✓ legal</span><span>X foul</span><span>□ pending</span>
      </div>
    </div>
  );
}
