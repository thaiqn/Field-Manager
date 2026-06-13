// Officials' touch-first scoring. The 6-char official code is verified
// server-side (POST /auth → bearer token); every mark write carries that
// token, so spectators (who never have it) cannot edit. Ported from the
// design prototype's official-app.jsx, wired to the live backend.
import { useEffect, useRef, useState } from 'react';
import { api, useMeet } from '../api';
import { navigate } from '../router';
import * as M from '../../shared/marks.js';
import {
  AppTop, SegUnits, Chips, HorizBoard, VertBoard,
  flightStatus, eventStatus, horizQueue, athleteById,
} from '../components/SharedUI';

const tokenKey = (code) => `felofficial:${code}`;
function readAuth(code) {
  try { return JSON.parse(sessionStorage.getItem(tokenKey(code)) || 'null'); } catch { return null; }
}
function writeAuth(code, auth) {
  try { auth ? sessionStorage.setItem(tokenKey(code), JSON.stringify(auth)) : sessionStorage.removeItem(tokenKey(code)); } catch {}
}

function useUnits() {
  const [units, setRaw] = useState(() => {
    try { return localStorage.getItem('fel-units') || 'imperial'; } catch { return 'imperial'; }
  });
  const setUnits = (u) => { setRaw(u); try { localStorage.setItem('fel-units', u); } catch {} };
  return [units, setUnits];
}

export function Officials({ code }) {
  const { meet: data, error } = useMeet(code);
  const [auth, setAuth] = useState(() => readAuth(code));
  const [units, setUnits] = useUnits();
  const [eventId, setEventId] = useState(null);
  const [flightId, setFlightId] = useState(null);
  const [tab, setTab] = useState('score');
  const [override, setOverride] = useState(null);
  const [opErr, setOpErr] = useState(null);

  useEffect(() => { setOverride(null); }, [eventId, flightId, tab]);

  if (error) return <Gate text={error} />;
  if (!data) return <Gate text="Connecting…" />;
  const meet = data.meet;

  if (!auth) {
    return <LockScreen code={code} meetName={meet.name} onUnlock={(a) => { writeAuth(code, a); setAuth(a); }} />;
  }
  if (!data.events.length) return <Gate text="No events yet." />;

  const event = data.events.find((e) => e.id === eventId) || data.events[0];
  const flight = event.flights.find((f) => f.id === flightId) || event.flights[0];

  const post = async (op, body = {}) => {
    setOpErr(null);
    try {
      return await api(`/api/meets/${code}/op/${op}`, { method: 'POST', body, token: auth.token });
    } catch (e) {
      setOpErr(e.message);
      if (/officials only/i.test(e.message)) { writeAuth(code, null); setAuth(null); }
      throw e;
    }
  };
  const lock = () => { writeAuth(code, null); setAuth(null); };

  const queue = flight.type === 'horizontal' ? horizQueue(flight) : [];
  const target = flight.type === 'horizontal' ? (override || queue[0] || null) : null;

  return (
    <div>
      <AppTop kicker="Officials · Scoring" live meet={meet}>
        <SegUnits units={units} onChange={setUnits} />
        <a className="btn btn-accent btn-sm" href={`#/m/${code}`}>Live view</a>
      </AppTop>
      <div className="app-shell">
        <div className="lock-banner">
          <span>Scoring unlocked · code <span className="lb-code">{auth.officialCode}</span></span>
          <button type="button" onClick={lock} title="Lock this device">Lock ✕</button>
        </div>
        {opErr && <div className="lock-err" style={{ minHeight: 0, marginTop: 8 }}>{opErr}</div>}

        <Chips
          items={data.events.map((e) => ({ id: e.id, label: e.name, status: eventStatus(e) }))}
          value={event.id} onChange={(id) => { setEventId(id); setFlightId(null); }}
        />
        {event.flights.length > 1 && (
          <Chips
            items={event.flights.map((f) => ({ id: f.id, label: f.name, status: flightStatus(f) }))}
            value={flight.id} onChange={setFlightId}
          />
        )}
        <div className="otabs">
          <button type="button" className={tab === 'score' ? 'on' : ''} onClick={() => setTab('score')}>Score entry</button>
          <button type="button" className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>Setup</button>
        </div>

        {tab === 'score' && flight.type === 'horizontal' && (
          <>
            {target
              ? <EntryPadHoriz units={units} event={event} flight={flight} target={target} post={post} onSaved={() => setOverride(null)} />
              : <div className="pad"><div className="empty-note"><span className="mono">Flight complete</span>All {flight.rounds} rounds are in. Tap any cell below to make corrections.</div></div>}
            <div className="sheet">
              <HorizBoard event={event} flight={flight} units={units} showHero={false}
                interactive selected={target} onSelect={(athleteId, round) => setOverride({ athleteId, round })} />
            </div>
          </>
        )}

        {tab === 'score' && flight.type === 'vertical' && (
          <>
            <EntryPadVert units={units} event={event} flight={flight} post={post} />
            <div className="sheet"><VertBoard event={event} flight={flight} units={units} showHero={false} /></div>
          </>
        )}

        {tab === 'setup' && (
          <SetupTab data={data} units={units} event={event} flight={flight} code={code} post={post}
            onRelock={() => { writeAuth(code, null); setAuth(null); }}
            onCodeChange={(officialCode) => { const a = { ...auth, officialCode }; writeAuth(code, a); setAuth(a); }} />
        )}
      </div>
    </div>
  );
}

function Gate({ text }) {
  return (
    <div className="app-message">
      <div>{text}</div>
      <a className="btn btn-ghost btn-sm" href="#/">← Home</a>
    </div>
  );
}

// ── Horizontal entry pad ────────────────────────────────────────
export function EntryPadHoriz({ units, event, flight, target, post, onSaved }) {
  const athlete = athleteById(flight, target.athleteId);
  const existing = (flight.marks[target.athleteId] || [])[target.round];

  const initFeet = () => {
    const best = M.sortedMarks(flight.marks[target.athleteId])[0];
    const base = best != null ? best : (athlete && athlete.seedM);
    return base ? Math.floor(M.toInches(base) / 12) : 15;
  };
  const [feet, setFeet] = useState(initFeet);
  const [inches, setInches] = useState(null);
  const [frac, setFrac] = useState(0);
  const [mstr, setMstr] = useState('');
  useEffect(() => { setFeet(initFeet()); setInches(null); setFrac(0); setMstr(''); }, [target.athleteId, target.round]);

  const valM = units === 'imperial'
    ? (inches != null ? M.fi(feet, inches + frac) : null)
    : (parseFloat(mstr) > 0 ? +parseFloat(mstr).toFixed(2) : null);

  const commit = (entry) =>
    post('mark', { eid: event.id, fid: flight.id, athleteId: target.athleteId, round: target.round, entry })
      .then(() => { setInches(null); setFrac(0); setMstr(''); onSaved(); })
      .catch(() => {});

  if (!athlete) return null;
  return (
    <div className="pad">
      <div className="pad-now">
        <div className="pad-now-eyebrow">{existing ? 'Correcting' : 'Now up'} · Attempt {target.round + 1} of {flight.rounds}</div>
        <div className="pad-now-name">{athlete.name}</div>
        <div className="pad-now-sub">{athlete.team} · #{athlete.bib} · Seed {M.fmtMark(athlete.seedM, units)}</div>
      </div>
      <div className="pad-body">
        <div className="pad-readout">
          <span className="pad-readout-mark">{valM != null ? M.fmtMark(valM, units) : '— —'}</span>
          <span className="pad-readout-unit">{M.unitSuffix(units)}</span>
        </div>

        {units === 'imperial' ? (
          <>
            <div>
              <div className="pad-group-label">Feet</div>
              <div className="pad-stepper">
                <button type="button" className="pad-key" onClick={() => setFeet((f) => Math.max(0, f - 1))}>−</button>
                <div className="pad-val">{feet}</div>
                <button type="button" className="pad-key" onClick={() => setFeet((f) => f + 1)}>+</button>
              </div>
            </div>
            <div>
              <div className="pad-group-label">Inches</div>
              <div className="pad-keys">
                {Array.from({ length: 12 }).map((_, i) => (
                  <button key={i} type="button" className={'pad-key' + (inches === i ? ' on' : '')} onClick={() => setInches(i)}>{i}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="pad-group-label">Quarter inch</div>
              <div className="pad-keys cols-4">
                {[0, 0.25, 0.5, 0.75].map((q) => (
                  <button key={q} type="button" className={'pad-key' + (frac === q ? ' on' : '')} onClick={() => setFrac(q)}>
                    {q === 0 ? '0' : q === 0.25 ? '¼' : q === 0.5 ? '½' : '¾'}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="pad-group-label">Meters</div>
            <div className="pad-keys cols-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                <button key={k} type="button" className={'pad-key' + (k === '⌫' ? ' pad-key-mute' : '')}
                  onClick={() => setMstr((s) => {
                    if (k === '⌫') return s.slice(0, -1);
                    if (k === '.' && s.indexOf('.') >= 0) return s;
                    if (s.length >= 5) return s;
                    return s + k;
                  })}>{k}</button>
              ))}
            </div>
          </div>
        )}

        <div className="pad-actions">
          <button type="button" className="pad-btn pad-btn-foul" onClick={() => commit({ t: 'foul' })}>Foul ✗</button>
          <button type="button" className="pad-btn pad-btn-pass" onClick={() => commit({ t: 'pass' })}>Pass</button>
          <button type="button" className="pad-btn pad-btn-save" disabled={valM == null} onClick={() => commit({ t: 'mark', v: valM })}>Save mark →</button>
        </div>
        {existing && (
          <button type="button" className="pad-btn pad-btn-clear" onClick={() => commit(null)}>
            Clear this attempt ({existing.t === 'mark' ? M.fmtMark(existing.v, units) : existing.t})
          </button>
        )}
        <div className="pad-note">Tap any attempt cell below to correct it</div>
      </div>
    </div>
  );
}

// ── Vertical (bar) entry ────────────────────────────────────────
export function EntryPadVert({ units, event, flight, post }) {
  const nextUp = M.vertNextUp(flight);
  const [selId, setSelId] = useState(null);
  const targetId = selId || (nextUp && nextUp.athleteId) || null;
  const athlete = targetId ? athleteById(flight, targetId) : null;
  const cur = flight.curHeightIdx;
  const curStr = athlete ? ((flight.attempts[athlete.id] || {})[cur] || '') : '';

  const stepIn = units === 'imperial' ? M.fi(0, 2) : 0.05; // 2in / 5cm raise
  const record = (r) => {
    if (!athlete) return;
    post('vert', { eid: event.id, fid: flight.id, athleteId: athlete.id, result: r }).then(() => setSelId(null)).catch(() => {});
  };
  const raise = () => {
    if (cur >= flight.heights.length - 1) {
      post('add-height', { eid: event.id, fid: flight.id, meters: +(flight.heights[flight.heights.length - 1] + stepIn).toFixed(4) })
        .then(() => post('bar', { eid: event.id, fid: flight.id, heightIdx: cur + 1 })).catch(() => {});
    } else {
      post('bar', { eid: event.id, fid: flight.id, heightIdx: cur + 1 });
    }
  };

  const openAthletes = flight.athletes.filter((a) => {
    const rec = flight.attempts[a.id] || {};
    if (M.isEliminated(flight.heights, rec)) return false;
    const s = rec[cur] || '';
    return !(s.indexOf('O') >= 0 || s === 'P' || (s.match(/X/g) || []).length >= 3);
  });

  return (
    <div className="pad">
      <div className="pad-now">
        <div className="pad-now-eyebrow">{athlete ? 'Now attempting · try ' + (curStr.length + 1) + ' of 3' : 'Height complete'}</div>
        <div className="pad-now-name">{athlete ? athlete.name : 'Raise the bar'}</div>
        <div className="pad-now-sub">{athlete ? athlete.team + ' · #' + athlete.bib + (curStr ? ' · so far: ' + curStr : '') : M.vertAlive(flight).length + ' athletes still in'}</div>
      </div>
      <div className="pad-body">
        <div className="ve-bar">
          <div>
            <div className="ve-bar-label">Bar height</div>
            <div className="ve-bar-h">{M.fmtMark(flight.heights[cur], units)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="pad-key" style={{ minWidth: 46 }} disabled={cur === 0} onClick={() => post('bar', { eid: event.id, fid: flight.id, heightIdx: cur - 1 })}>−</button>
            <button type="button" className="pad-key" style={{ minWidth: 46 }} onClick={raise}>+</button>
          </div>
        </div>

        {openAthletes.length > 0 && (
          <div>
            <div className="pad-group-label">Order at this height — tap to select</div>
            <div className="chips" style={{ paddingTop: 0 }}>
              {openAthletes.map((a) => (
                <button key={a.id} type="button" className={'chip' + (athlete && athlete.id === a.id ? ' on' : '')} onClick={() => setSelId(a.id)}>
                  {a.name}{((flight.attempts[a.id] || {})[cur] || '') && ' · ' + (flight.attempts[a.id] || {})[cur]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ve-actions">
          <button type="button" className="pad-btn ve-btn-o" disabled={!athlete} onClick={() => record('O')}>Clear O</button>
          <button type="button" className="pad-btn ve-btn-x" disabled={!athlete} onClick={() => record('X')}>Miss X</button>
          <button type="button" className="pad-btn ve-btn-p" disabled={!athlete || !!curStr} onClick={() => record('P')}>Pass —</button>
        </div>
        {athlete && curStr && (
          <button type="button" className="pad-btn pad-btn-clear" onClick={() => post('vert-undo', { eid: event.id, fid: flight.id, athleteId: athlete.id })}>
            Undo last ({curStr})
          </button>
        )}
        <div className="pad-note">Three consecutive misses eliminates automatically</div>
      </div>
    </div>
  );
}

// ── Setup tab ───────────────────────────────────────────────────
export function SetupTab({ data, units, event, flight, code, post, onRelock, onCodeChange }) {
  const meet = data.meet;
  const [info, setInfo] = useState(meet);
  const [ath, setAth] = useState({ name: '', team: '', bib: '', ft: '', inch: '', m: '' });
  const [newEvent, setNewEvent] = useState({ name: '', kind: 'horizontal', format: 'final3' });
  const [exported, setExported] = useState(false);
  useEffect(() => { setInfo(meet); }, [meet.name, meet.venue, meet.date]);

  const seedM = () => {
    if (units === 'metric') return parseFloat(ath.m) > 0 ? +parseFloat(ath.m).toFixed(2) : 0;
    const ft = parseInt(ath.ft, 10), inch = parseFloat(ath.inch) || 0;
    return ft >= 0 ? M.fi(ft || 0, inch) : 0;
  };
  const addAthlete = (e) => {
    e.preventDefault();
    if (!ath.name.trim()) return;
    post('add-athlete', { eid: event.id, fid: flight.id, athlete: { name: ath.name.trim(), team: ath.team.trim() || '—', bib: ath.bib || '—', seedM: seedM() } })
      .then(() => setAth({ name: '', team: '', bib: '', ft: '', inch: '', m: '' })).catch(() => {});
  };
  const regenerate = async () => {
    if (!confirm('Generate a new code? Officials on the old code will be locked out.')) return;
    try {
      const res = await post('meet', { regenerate: true });
      if (res?.officialCode) onCodeChange(res.officialCode);
    } catch {}
  };

  return (
    <div>
      <div className="setup-card">
        <h3 className="setup-title">Meet access code</h3>
        <p className="lock-dek" style={{ margin: 0 }}>Share this code with field officials so they can enter results. Spectators never need it — the live page stays read-only.</p>
        <div className="code-display">
          <span className="code-chip">{readAuth(code)?.officialCode || '••••••'}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={regenerate}>New code</button>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Export — Hy-Tek Meet Manager</h3>
        <p className="lock-dek" style={{ margin: 0 }}>Semi-colon delimited results file (.txt). In Meet Manager 6.0: <strong>File → Import → Semi-Colon Delimited Rosters/Entries File → Export Results</strong>. Field marks export in {units === 'metric' ? 'metric' : 'English (ft-in)'} per your unit toggle.</p>
        <div className="setup-row">
          <a className="btn btn-primary btn-sm" href={`/api/meets/${code}/export/hytek?units=${units}`} download
            onClick={() => { setExported(true); setTimeout(() => setExported(false), 2500); }}>
            {exported ? 'Downloaded ✓' : 'Export results →'}
          </a>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{data.events.length} events · finals marks only</span>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Meet</h3>
        <div className="setup-grid">
          <div className="form-field full"><label>Meet name</label>
            <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} onBlur={() => post('meet', { patch: info })} /></div>
          <div className="form-field"><label>Venue</label>
            <input value={info.venue} onChange={(e) => setInfo({ ...info, venue: e.target.value })} onBlur={() => post('meet', { patch: info })} /></div>
          <div className="form-field"><label>Date</label>
            <input value={info.date} onChange={(e) => setInfo({ ...info, date: e.target.value })} onBlur={() => post('meet', { patch: info })} /></div>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Roster — {event.name} · {flight.name}</h3>
        {flight.type === 'horizontal' && (
          <div>
            <div className="pad-group-label">Attempt format</div>
            <div className="fmt-seg">
              <button type="button" className={flight.format !== 'open4' ? 'on' : ''} onClick={() => post('flight-format', { eid: event.id, fid: flight.id, format: 'final3' })}>
                3 + 3 finals<small>6 attempts · top 9 advance</small>
              </button>
              <button type="button" className={flight.format === 'open4' ? 'on' : ''} onClick={() => post('flight-format', { eid: event.id, fid: flight.id, format: 'open4' })}>
                4 attempts<small>everyone · no finals cut</small>
              </button>
            </div>
          </div>
        )}
        <div>
          {flight.athletes.map((a) => (
            <div key={a.id} className="roster-line">
              <strong>{a.name}</strong>
              <span className="mono">{a.team} · #{a.bib} · seed {M.fmtMark(a.seedM, units)}</span>
              <button type="button" className="roster-x" title="Remove athlete" onClick={() => post('remove-athlete', { eid: event.id, fid: flight.id, athleteId: a.id })}>✕</button>
            </div>
          ))}
          {!flight.athletes.length && <div className="empty-note">No athletes yet — add the first below.</div>}
        </div>
        <form onSubmit={addAthlete} className="setup-grid">
          <div className="form-field"><label>Name</label>
            <input value={ath.name} onChange={(e) => setAth({ ...ath, name: e.target.value })} placeholder="Athlete name" /></div>
          <div className="form-field"><label>Team / school</label>
            <input value={ath.team} onChange={(e) => setAth({ ...ath, team: e.target.value })} placeholder="School" /></div>
          <div className="form-field"><label>Bib</label>
            <input value={ath.bib} onChange={(e) => setAth({ ...ath, bib: e.target.value })} placeholder="000" inputMode="numeric" /></div>
          {units === 'imperial' ? (
            <div className="form-field"><label>Seed (ft + in)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={ath.ft} onChange={(e) => setAth({ ...ath, ft: e.target.value })} placeholder="ft" inputMode="numeric" style={{ width: '50%' }} />
                <input value={ath.inch} onChange={(e) => setAth({ ...ath, inch: e.target.value })} placeholder="in" inputMode="decimal" style={{ width: '50%' }} />
              </div>
            </div>
          ) : (
            <div className="form-field"><label>Seed (m)</label>
              <input value={ath.m} onChange={(e) => setAth({ ...ath, m: e.target.value })} placeholder="5.40" inputMode="decimal" /></div>
          )}
          <div className="full"><button type="submit" className="btn btn-primary btn-sm">Add athlete</button></div>
        </form>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Events & flights</h3>
        <div className="setup-row">
          <div className="form-field" style={{ flex: 2 }}><label>New event name</label>
            <input value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="Boys Discus" /></div>
          <div className="form-field"><label>Format</label>
            <select value={newEvent.kind} onChange={(e) => setNewEvent({ ...newEvent, kind: e.target.value })}>
              <option value="horizontal">Distance (jumps / throws)</option>
              <option value="vertical">Bar height (HJ / PV)</option>
            </select></div>
          {newEvent.kind === 'horizontal' && (
            <div className="form-field"><label>Attempts</label>
              <select value={newEvent.format} onChange={(e) => setNewEvent({ ...newEvent, format: e.target.value })}>
                <option value="final3">3 + 3 finals</option>
                <option value="open4">4 total</option>
              </select></div>
          )}
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => { if (newEvent.name.trim()) post('add-event', { name: newEvent.name.trim(), kind: newEvent.kind, format: newEvent.format }).then(() => setNewEvent({ name: '', kind: 'horizontal', format: 'final3' })).catch(() => {}); }}>
            Add event
          </button>
        </div>
        <div className="setup-row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => post('add-flight', { eid: event.id, name: 'Flight ' + (event.flights.length + 1) })}>
            + Add flight to {event.name}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Replace everything with the demo meet?')) post('reset', {}); }}>
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Access-code lock ────────────────────────────────────────────
export function LockScreen({ code, meetName, onUnlock }) {
  const LEN = 6;
  const [vals, setVals] = useState(Array(LEN).fill(''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);

  const submit = async (entered) => {
    if (entered.length !== LEN || busy) return;
    setBusy(true);
    try {
      const { token } = await api(`/api/meets/${code}/auth`, { method: 'POST', body: { officialCode: entered } });
      onUnlock({ token, officialCode: entered.toUpperCase() });
    } catch (e) {
      setErr(e.message || 'That code doesn’t match this meet');
      setVals(Array(LEN).fill(''));
      setTimeout(() => refs.current[0]?.focus(), 0);
    } finally {
      setBusy(false);
    }
  };
  const setChar = (i, ch) => {
    const c = ch.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = vals.slice(); next[i] = c; setVals(next); setErr('');
    if (c && i < LEN - 1) refs.current[i + 1]?.focus();
    if (next.every((x) => x) && next.join('').length === LEN) submit(next.join(''));
  };
  const onKey = (i, e) => { if (e.key === 'Backspace' && !vals[i] && i > 0) refs.current[i - 1]?.focus(); };
  const onPaste = (e) => {
    const t = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LEN);
    if (!t) return; e.preventDefault();
    const next = Array(LEN).fill(''); t.split('').forEach((c, i) => (next[i] = c));
    setVals(next);
    if (t.length === LEN) submit(t); else refs.current[t.length]?.focus();
  };

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-body">
          <div className="lock-kicker">Officials access</div>
          <h1 className="lock-title">Enter the meet code</h1>
          <p className="lock-dek">Scoring for <strong>{meetName}</strong> is locked. Enter the 6-character code from the meet director to enter and edit live results.</p>
          <div className="code-inputs" onPaste={onPaste}>
            {vals.map((v, i) => (
              <input key={i} ref={(el) => (refs.current[i] = el)}
                className={'code-box' + (v ? ' filled' : '')}
                value={v} maxLength={1} inputMode="text" autoCapitalize="characters"
                aria-label={'Code character ' + (i + 1)} autoFocus={i === 0}
                onChange={(e) => setChar(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} />
            ))}
          </div>
          <div className="lock-err">{err}</div>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={() => submit(vals.join(''))}>Unlock scoring →</button>
          <div className="lock-hint">Spectators don’t need a code — the live results page is always open &amp; read-only.</div>
          {code === 'MVAL26' && <div className="lock-hint" style={{ marginTop: 6, color: 'var(--gold-700)' }}>Prototype demo code: <strong>TROJAN</strong></div>}
        </div>
        <div className="lock-foot">
          <a href={`#/m/${code}`}>← Spectator live results</a>
          <a href="#/">Home</a>
        </div>
      </div>
    </div>
  );
}
