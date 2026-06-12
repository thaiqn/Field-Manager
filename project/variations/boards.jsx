// Spectator board variations — shared demo data + board components.
// All marks imperial (feet-inches), matching US high school convention.

// ── Demo data ─────────────────────────────────────────────────
// Long jump: rounds 1–3 complete, round 4 (finals) just underway.
// In finals, athletes jump in reverse rank order — so the current
// last-place athlete is up first.
const LJ_DATA = [
  { p: 1, name: 'Maya Patel',     team: 'Milpitas',    atts: ['17-01.50', 'X', '17-08.25', null, null, null], bestIdx: 2, best: '17-08.25', badge: 'PR' },
  { p: 2, name: 'Jordan Lee',     team: 'Milpitas',    atts: ['16-09.00', '16-11.50', 'X', null, null, null], bestIdx: 1, best: '16-11.50' },
  { p: 3, name: 'Sofia Alvarez',  team: 'Santa Clara', atts: ['16-07.25', '16-10.00', '16-04.50', null, null, null], bestIdx: 1, best: '16-10.00', badge: 'SB' },
  { p: 4, name: 'Kendall Brooks', team: 'Palo Alto',   atts: ['X', '16-08.75', '16-02.00', null, null, null], bestIdx: 1, best: '16-08.75' },
  { p: 5, name: 'Riya Shah',      team: 'Milpitas',    atts: ['15-11.00', 'P', '16-01.25', null, null, null], bestIdx: 2, best: '16-01.25' },
  { p: 6, name: 'Amara Okafor',   team: 'Fremont',     atts: ['15-08.50', '15-10.00', 'X', 'NOW', null, null], bestIdx: 1, best: '15-10.00' },
];

const HJ_HEIGHTS = ['4-06', '4-08', '4-10', '5-00', '5-02', '5-04'];
const HJ_CUR = 4; // bar currently at 5-02
const HJ_DATA = [
  { p: 1, name: 'Grace Kim',   team: 'SCV', marks: ['O', 'O', 'XO', 'O', 'XX', ''], best: '5-00', out: false, activeCol: 4 },
  { p: 2, name: 'Tessa Wong',  team: 'MIL', marks: ['P', 'O', 'O', 'XO', 'X', ''], best: '5-00', out: false },
  { p: 3, name: 'Dani Foster', team: 'PAL', marks: ['O', 'XO', 'XXO', 'XXX', '', ''], best: '4-10', out: true },
  { p: 4, name: 'Lily Tran',   team: 'MIL', marks: ['O', 'O', 'XXX', '', '', ''], best: '4-08', out: true },
  { p: 5, name: 'Priya Nair',  team: 'FRE', marks: ['XO', 'XXX', '', '', '', ''], best: '4-06', out: true },
];

// ── Shared pieces ─────────────────────────────────────────────
function BoardHead({ event, meta }) {
  return (
    <div className="bd-head">
      <div className="bd-eyebrow"><span className="live-dot"></span><span>Live · Round 4 of 6</span></div>
      <h2 className="bd-title">{event}</h2>
      <div className="bd-meta">{meta}</div>
    </div>
  );
}

function attClass(att, i, bestIdx, extra) {
  let c = extra ? extra + ' va-att' : 'va-att';
  if (att === null) c += ' is-pending';
  else if (att === 'X') c += ' is-foul';
  else if (att === 'P') c += ' is-pass';
  else if (att === 'NOW') c += ' is-pending';
  else if (i === bestIdx) c += ' is-best';
  return c;
}
function attText(att) {
  if (att === null) return '–';
  if (att === 'X') return 'X';
  if (att === 'P') return 'P';
  if (att === 'NOW') return '·now·';
  return att;
}

function podium(p) { return p <= 3 ? ' podium-' + p : ''; }

// ── Variant A · Editorial table ───────────────────────────────
function LJBoardA() {
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
          <div key={a.name} className={'va-row' + podium(a.p)}>
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
      <div className="bd-foot"><span>X foul</span><span>P pass</span><span>– pending</span><span>Marks ft-in</span></div>
    </div>
  );
}

// ── Variant B · Stadium board ─────────────────────────────────
function LJBoardB() {
  return (
    <div className="board vb">
      <BoardHead event="Girls Long Jump" meta="MVAL Championships · Varsity · Flight 1 of 2" />
      <div className="vb-next">
        <span><span className="k">Up now</span><b>Amara Okafor</b></span>
        <span><span className="k">On deck</span><b>Riya Shah</b></span>
      </div>
      <div>
        {LJ_DATA.map((a) => (
          <div key={a.name} className={'va-row' + podium(a.p)}>
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
      <div className="bd-foot"><span>X foul</span><span>P pass</span><span>– pending</span><span>Marks ft-in</span></div>
    </div>
  );
}

// ── Variant C · Pit view ──────────────────────────────────────
function LJBoardC() {
  const heroAtts = [
    { t: '15-08.50', c: 'va-att' },
    { t: '15-10.00', c: 'va-att is-best' },
    { t: 'X', c: 'va-att is-foul' },
    { t: '·now·', c: 'va-att is-pending' },
    { t: '–', c: 'va-att is-pending' },
    { t: '–', c: 'va-att is-pending' },
  ];
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
          {heroAtts.map((h, i) => <span key={i} className={h.c}>{h.t}</span>)}
        </div>
      </div>
      <div className="vc-rows">
        {LJ_DATA.map((a) => (
          <div key={a.name} className={'vc-row' + podium(a.p)}>
            <div className="bd-place">{a.p}</div>
            <div className="vc-id">
              <div className="vc-name">{a.name}</div>
              <div className="vc-team">{a.team}</div>
            </div>
            <div className="vc-dots">
              {a.atts.map((att, i) => {
                let c = 'vc-dot';
                let t = '';
                if (att === null) { t = ''; }
                else if (att === 'X') { c += ' foul'; t = 'X'; }
                else if (att === 'P') { c += ' pass'; t = 'P'; }
                else if (att === 'NOW') { c += ' active'; }
                else if (i === a.bestIdx) { c += ' best'; t = '★'; }
                else { c += ' ok'; t = '✓'; }
                return <span key={i} className={c}>{t}</span>;
              })}
            </div>
            <div className="vc-best">{a.best}</div>
          </div>
        ))}
      </div>
      <div className="bd-foot"><span>★ best</span><span>✓ legal</span><span>X foul</span><span>□ pending</span></div>
    </div>
  );
}

// ── High jump grids ───────────────────────────────────────────
function hjCellClass(mark, colIdx, row) {
  let c = 'hj-cell';
  if (colIdx === HJ_CUR) c += ' cur';
  if (row.activeCol === colIdx && !row.out) c += ' is-active';
  if (!mark) return c;
  if (mark === 'XXX') return c + ' is-out';
  if (mark === 'P') return c + ' is-pass';
  if (mark.endsWith('O')) return c + ' is-clear';
  return c; // in-progress misses like 'X' / 'XX'
}

function HJGrid({ dark }) {
  return (
    <div className={'board' + (dark ? ' vb hjb' : '')}>
      <BoardHead event="Girls High Jump" meta="MVAL Championships · Varsity · Bar at 5-02" />
      <div className="hj-grid">
        <div className="hj-colhead first">Athlete</div>
        {HJ_HEIGHTS.map((h, i) => (
          <div key={h} className={'hj-colhead' + (i === HJ_CUR ? ' cur' : '')}>{h}</div>
        ))}
        {HJ_DATA.map((a) => (
          <React.Fragment key={a.name}>
            <div className={'hj-ath' + (a.out ? ' hj-row-out' : '') + podium(a.p)}>
              <div className="bd-place">{a.p}</div>
              <div>
                <div className="hj-ath-name">{a.name}</div>
                <div className="hj-ath-sub">
                  {a.team} · {a.best} {a.out ? <span className="out">out</span> : <span className="in">in</span>}
                </div>
              </div>
            </div>
            {a.marks.map((m, i) => (
              <div key={i} className={hjCellClass(m, i, a) + (a.out ? ' hj-row-out' : '')}>
                {m === 'P' ? '—' : m || ''}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="bd-foot"><span>O clear</span><span>X miss</span><span>— pass</span><span>3 misses = out</span></div>
    </div>
  );
}

function HJBoardA() { return <HJGrid dark={false} />; }
function HJBoardB() { return <HJGrid dark={true} />; }

Object.assign(window, { LJBoardA, LJBoardB, LJBoardC, HJBoardA, HJBoardB });
