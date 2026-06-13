// official-app.jsx — touch-first scoring UI for field-event officials.
const { marks: M, store: S } = window.FEL;
const {
  useMeetState, useUnits, AppTop, SegUnits, Chips,
  HorizBoard, VertBoard, flightStatus, eventStatus, horizQueue, athleteById,
} = window;

// ── Horizontal entry pad ────────────────────────────────────────
function EntryPadHoriz({ units, event, flight, target, onSaved }) {
  const athlete = athleteById(flight, target.athleteId);
  const existing = (flight.marks[target.athleteId] || [])[target.round];

  const initFeet = () => {
    const best = M.sortedMarks(flight.marks[target.athleteId])[0];
    const base = best != null ? best : (athlete && athlete.seedM);
    return base ? Math.floor(M.toInches(base) / 12) : 15;
  };
  const [feet, setFeet] = React.useState(initFeet);
  const [inches, setInches] = React.useState(null);
  const [frac, setFrac] = React.useState(0);
  const [mstr, setMstr] = React.useState('');
  React.useEffect(() => { setFeet(initFeet()); setInches(null); setFrac(0); setMstr(''); }, [target.athleteId, target.round]);

  const valM = units === 'imperial'
    ? (inches != null ? M.fi(feet, inches + frac) : null)
    : (parseFloat(mstr) > 0 ? +parseFloat(mstr).toFixed(2) : null);

  const commit = entry => {
    S.recordMark(event.id, flight.id, target.athleteId, target.round, entry);
    setInches(null); setFrac(0); setMstr('');
    onSaved();
  };

  if (!athlete) return null;
  return (
    <div className="pad" data-screen-label="Entry pad">
      <div className="pad-now">
        <div className="pad-now-eyebrow">{existing ? 'Correcting' : 'Now up'} · Attempt {target.round + 1} of {flight.rounds}</div>
        <div className="pad-now-name">{athlete.name}</div>
        <div className="pad-now-sub">{athlete.team} · #{athlete.bib} · Seed {M.fmtMark(athlete.seedM, units)}</div>
      </div>
      <div className="pad-body">
        <div className={'pad-readout'}>
          <span className="pad-readout-mark">{valM != null ? M.fmtMark(valM, units) : '— —'}</span>
          <span className="pad-readout-unit">{M.unitSuffix(units)}</span>
        </div>

        {units === 'imperial' ? (
          <React.Fragment>
            <div>
              <div className="pad-group-label">Feet</div>
              <div className="pad-stepper">
                <button type="button" className="pad-key" onClick={() => setFeet(f => Math.max(0, f - 1))}>−</button>
                <div className="pad-val">{feet}</div>
                <button type="button" className="pad-key" onClick={() => setFeet(f => f + 1)}>+</button>
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
                {[0, 0.25, 0.5, 0.75].map(q => (
                  <button key={q} type="button" className={'pad-key' + (frac === q ? ' on' : '')} onClick={() => setFrac(q)}>
                    {q === 0 ? '0' : q === 0.25 ? '¼' : q === 0.5 ? '½' : '¾'}
                  </button>
                ))}
              </div>
            </div>
          </React.Fragment>
        ) : (
          <div>
            <div className="pad-group-label">Meters</div>
            <div className="pad-keys cols-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => (
                <button
                  key={k} type="button" className={'pad-key' + (k === '⌫' ? ' pad-key-mute' : '')}
                  onClick={() => setMstr(s => {
                    if (k === '⌫') return s.slice(0, -1);
                    if (k === '.' && s.indexOf('.') >= 0) return s;
                    if (s.length >= 5) return s;
                    return s + k;
                  })}
                >{k}</button>
              ))}
            </div>
          </div>
        )}

        <div className="pad-actions">
          <button type="button" className="pad-btn pad-btn-foul" onClick={() => commit({ t: 'foul' })}>Foul ✗</button>
          <button type="button" className="pad-btn pad-btn-pass" onClick={() => commit({ t: 'pass' })}>Pass</button>
          <button type="button" className="pad-btn pad-btn-save" disabled={valM == null} onClick={() => commit({ t: 'mark', v: valM })}>
            Save mark →
          </button>
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
function EntryPadVert({ units, event, flight }) {
  const nextUp = M.vertNextUp(flight);
  const [selId, setSelId] = React.useState(null);
  const targetId = selId || (nextUp && nextUp.athleteId) || null;
  const athlete = targetId ? athleteById(flight, targetId) : null;
  const cur = flight.curHeightIdx;
  const curStr = athlete ? ((flight.attempts[athlete.id] || {})[cur] || '') : '';

  const stepIn = units === 'imperial' ? M.fi(0, 2) : 0.05; // 2in / 5cm standard raise
  const quickAdd = () => S.addHeight(event.id, flight.id, +(flight.heights[flight.heights.length - 1] + stepIn).toFixed(4));

  const record = r => {
    if (!athlete) return;
    S.vertRecord(event.id, flight.id, athlete.id, r);
    setSelId(null);
  };

  const openAthletes = flight.athletes.filter(a => {
    const rec = flight.attempts[a.id] || {};
    if (M.isEliminated(flight.heights, rec)) return false;
    const s = rec[cur] || '';
    return !(s.indexOf('O') >= 0 || s === 'P' || (s.match(/X/g) || []).length >= 3);
  });

  return (
    <div className="pad" data-screen-label="Bar entry pad">
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
            <button type="button" className="pad-key" style={{ minWidth: 46 }} disabled={cur === 0} onClick={() => S.setBar(event.id, flight.id, cur - 1)}>−</button>
            <button
              type="button" className="pad-key" style={{ minWidth: 46 }}
              onClick={() => { if (cur >= flight.heights.length - 1) quickAdd(); S.setBar(event.id, flight.id, cur + 1); }}
            >+</button>
          </div>
        </div>

        {openAthletes.length > 0 && (
          <div>
            <div className="pad-group-label">Order at this height — tap to select</div>
            <div className="chips" style={{ paddingTop: 0 }}>
              {openAthletes.map(a => (
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
          <button type="button" className="pad-btn pad-btn-clear" onClick={() => S.vertUndo(event.id, flight.id, athlete.id)}>
            Undo last ({curStr})
          </button>
        )}
        <div className="pad-note">Three consecutive misses eliminates automatically</div>
      </div>
    </div>
  );
}

// ── Setup tab ───────────────────────────────────────────────────
function SetupTab({ state, units, event, flight, eventId, flightId }) {
  const [meet, setMeet] = React.useState(state.meet);
  const [ath, setAth] = React.useState({ name: '', team: '', bib: '', ft: '', inch: '', m: '' });
  const [newEvent, setNewEvent] = React.useState({ name: '', kind: 'horizontal', format: 'final3' });
  const [exported, setExported] = React.useState(false);

  const seedM = () => {
    if (units === 'metric') return parseFloat(ath.m) > 0 ? +parseFloat(ath.m).toFixed(2) : null;
    const ft = parseInt(ath.ft, 10), inch = parseFloat(ath.inch) || 0;
    return ft >= 0 ? M.fi(ft || 0, inch) : null;
  };
  const addAthlete = e => {
    e.preventDefault();
    if (!ath.name.trim()) return;
    S.addAthlete(eventId, flightId, { name: ath.name.trim(), team: ath.team.trim() || '—', bib: ath.bib || '—', seedM: seedM() || 0 });
    setAth({ name: '', team: '', bib: '', ft: '', inch: '', m: '' });
  };

  return (
    <div data-screen-label="Setup">
      <div className="setup-card">
        <h3 className="setup-title">Meet access code</h3>
        <p className="lock-dek" style={{ margin: 0 }}>Share this code with field officials so they can enter results. Spectators never need it — the live page stays read-only.</p>
        <div className="code-display">
          <span className="code-chip">{state.meet.code}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { if (confirm('Generate a new code? Officials on the old code will be locked out.')) S.regenerateCode(); }}>New code</button>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Export — Hy-Tek Meet Manager</h3>
        <p className="lock-dek" style={{ margin: 0 }}>Semi-colon delimited results file (.txt). In Meet Manager 6.0: <strong>File → Import → Semi-Colon Delimited Rosters/Entries File → Export Results</strong>. Field marks export in {units === 'metric' ? 'metric' : 'English (ft-in)'} per your unit toggle.</p>
        <div className="setup-row">
          <button
            type="button" className="btn btn-primary btn-sm"
            onClick={() => { FEL.hytek.download(state, units); setExported(true); setTimeout(() => setExported(false), 2500); }}
          >{exported ? 'Downloaded ✓' : 'Export results →'}</button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{state.events.length} events · finals marks only</span>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Meet</h3>
        <div className="setup-grid">
          <div className="form-field full"><label>Meet name</label>
            <input value={meet.name} onChange={e => setMeet({ ...meet, name: e.target.value })} onBlur={() => S.updateMeet(meet)} /></div>
          <div className="form-field"><label>Venue</label>
            <input value={meet.venue} onChange={e => setMeet({ ...meet, venue: e.target.value })} onBlur={() => S.updateMeet(meet)} /></div>
          <div className="form-field"><label>Date</label>
            <input value={meet.date} onChange={e => setMeet({ ...meet, date: e.target.value })} onBlur={() => S.updateMeet(meet)} /></div>
        </div>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Roster — {event.name} · {flight.name}</h3>
        {flight.type === 'horizontal' && (
          <div>
            <div className="pad-group-label">Attempt format</div>
            <div className="fmt-seg">
              <button type="button" className={flight.format !== 'open4' ? 'on' : ''} onClick={() => S.setFlightFormat(eventId, flightId, 'final3')}>
                3 + 3 finals<small>6 attempts · top 9 advance</small>
              </button>
              <button type="button" className={flight.format === 'open4' ? 'on' : ''} onClick={() => S.setFlightFormat(eventId, flightId, 'open4')}>
                4 attempts<small>everyone · no finals cut</small>
              </button>
            </div>
          </div>
        )}
        <div>
          {flight.athletes.map(a => (
            <div key={a.id} className="roster-line">
              <strong>{a.name}</strong>
              <span className="mono">{a.team} · #{a.bib} · seed {M.fmtMark(a.seedM, units)}</span>
              <button type="button" className="roster-x" title="Remove athlete" onClick={() => S.removeAthlete(eventId, flightId, a.id)}>✕</button>
            </div>
          ))}
          {!flight.athletes.length && <div className="empty-note">No athletes yet — add the first below.</div>}
        </div>
        <form onSubmit={addAthlete} className="setup-grid">
          <div className="form-field"><label>Name</label>
            <input value={ath.name} onChange={e => setAth({ ...ath, name: e.target.value })} placeholder="Athlete name" /></div>
          <div className="form-field"><label>Team / school</label>
            <input value={ath.team} onChange={e => setAth({ ...ath, team: e.target.value })} placeholder="School" /></div>
          <div className="form-field"><label>Bib</label>
            <input value={ath.bib} onChange={e => setAth({ ...ath, bib: e.target.value })} placeholder="000" inputMode="numeric" /></div>
          {units === 'imperial' ? (
            <div className="form-field"><label>Seed (ft + in)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={ath.ft} onChange={e => setAth({ ...ath, ft: e.target.value })} placeholder="ft" inputMode="numeric" style={{ width: '50%' }} />
                <input value={ath.inch} onChange={e => setAth({ ...ath, inch: e.target.value })} placeholder="in" inputMode="decimal" style={{ width: '50%' }} />
              </div>
            </div>
          ) : (
            <div className="form-field"><label>Seed (m)</label>
              <input value={ath.m} onChange={e => setAth({ ...ath, m: e.target.value })} placeholder="5.40" inputMode="decimal" /></div>
          )}
          <div className="full"><button type="submit" className="btn btn-primary btn-sm">Add athlete</button></div>
        </form>
      </div>

      <div className="setup-card">
        <h3 className="setup-title">Events & flights</h3>
        <div className="setup-row">
          <div className="form-field" style={{ flex: 2 }}><label>New event name</label>
            <input value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="Boys Discus" /></div>
          <div className="form-field"><label>Format</label>
            <select value={newEvent.kind} onChange={e => setNewEvent({ ...newEvent, kind: e.target.value })}>
              <option value="horizontal">Distance (jumps / throws)</option>
              <option value="vertical">Bar height (HJ / PV)</option>
            </select></div>
          {newEvent.kind === 'horizontal' && (
            <div className="form-field"><label>Attempts</label>
              <select value={newEvent.format} onChange={e => setNewEvent({ ...newEvent, format: e.target.value })}>
                <option value="final3">3 + 3 finals</option>
                <option value="open4">4 total</option>
              </select></div>
          )}
          <button
            type="button" className="btn btn-outline btn-sm"
            onClick={() => { if (newEvent.name.trim()) { S.addEvent(newEvent.name.trim(), newEvent.kind, newEvent.format); setNewEvent({ name: '', kind: 'horizontal', format: 'final3' }); } }}
          >Add event</button>
        </div>
        <div className="setup-row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => S.addFlight(eventId, 'Flight ' + (event.flights.length + 1))}>
            + Add flight to {event.name}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Replace everything with the demo meet?')) S.resetDemo(); }}>
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Access-code gate ────────────────────────────────────────────
function useUnlock(code) {
  const [unlocked, setUnlocked] = React.useState(() => {
    try { return localStorage.getItem('fel-official-code') === code; } catch (e) { return false; }
  });
  React.useEffect(() => { // re-validate if the meet code is rotated elsewhere
    try { if (localStorage.getItem('fel-official-code') !== code) setUnlocked(false); } catch (e) {}
  }, [code]);
  const unlock = entered => {
    if (entered.toUpperCase() === code) {
      try { localStorage.setItem('fel-official-code', code); } catch (e) {}
      setUnlocked(true); return true;
    }
    return false;
  };
  const lock = () => { try { localStorage.removeItem('fel-official-code'); } catch (e) {} setUnlocked(false); };
  return { unlocked, unlock, lock };
}

function LockScreen({ meet, onUnlock }) {
  const LEN = 6;
  const [vals, setVals] = React.useState(Array(LEN).fill(''));
  const [err, setErr] = React.useState('');
  const refs = React.useRef([]);

  const setChar = (i, ch) => {
    const c = ch.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = vals.slice(); next[i] = c; setVals(next); setErr('');
    if (c && i < LEN - 1) refs.current[i + 1] && refs.current[i + 1].focus();
    if (next.every(x => x) && next.join('').length === LEN) submit(next.join(''));
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !vals[i] && i > 0) refs.current[i - 1] && refs.current[i - 1].focus();
  };
  const onPaste = e => {
    const t = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LEN);
    if (!t) return; e.preventDefault();
    const next = Array(LEN).fill(''); t.split('').forEach((c, i) => next[i] = c);
    setVals(next);
    if (t.length === LEN) submit(t); else refs.current[t.length] && refs.current[t.length].focus();
  };
  const submit = entered => {
    if (!onUnlock(entered)) { setErr('That code doesn’t match this meet'); setVals(Array(LEN).fill('')); setTimeout(() => refs.current[0] && refs.current[0].focus(), 0); }
  };

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-body">
          <div className="lock-kicker">Officials access</div>
          <h1 className="lock-title">Enter the meet code</h1>
          <p className="lock-dek">Scoring for <strong>{meet.name}</strong> is locked. Enter the 6-character code from the meet director to enter and edit live results.</p>
          <div className="code-inputs" onPaste={onPaste}>
            {vals.map((v, i) => (
              <input
                key={i} ref={el => refs.current[i] = el}
                className={'code-box' + (v ? ' filled' : '')}
                value={v} maxLength={1} inputMode="text" autoCapitalize="characters"
                aria-label={'Code character ' + (i + 1)}
                autoFocus={i === 0}
                onChange={e => setChar(i, e.target.value)}
                onKeyDown={e => onKey(i, e)}
              />
            ))}
          </div>
          <div className="lock-err">{err}</div>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => submit(vals.join(''))}>Unlock scoring →</button>
          <div className="lock-hint">Spectators don’t need a code — the live results page is always open &amp; read-only.</div>
          <div className="lock-hint" style={{ marginTop: 6, color: 'var(--gold-700)' }}>Prototype demo code: <strong>{meet.code}</strong></div>
        </div>
        <div className="lock-foot">
          <a href="Live Results.html">← Spectator live results</a>
          <a href="Field Events Live.html">Home</a>
        </div>
      </div>
    </div>
  );
}

// ── App shell ───────────────────────────────────────────────────
function OfficialApp() {
  const state = useMeetState();
  const { unlocked, unlock, lock } = useUnlock(state.meet.code);
  const [units, setUnits] = useUnits('imperial');
  const [eventId, setEventId] = React.useState(state.events[0] && state.events[0].id);
  const [tab, setTab] = React.useState('score');
  const event = state.events.find(e => e.id === eventId) || state.events[0];
  const [flightId, setFlightId] = React.useState(event && event.flights[0] && event.flights[0].id);
  const flight = event && (event.flights.find(f => f.id === flightId) || event.flights[0]);
  const [override, setOverride] = React.useState(null); // {athleteId, round} cell correction

  React.useEffect(() => { // keep flight selection valid when switching events
    if (event && !event.flights.some(f => f.id === flightId)) setFlightId(event.flights[0] && event.flights[0].id);
    setOverride(null);
  }, [eventId]);

  if (!unlocked) return <LockScreen meet={state.meet} onUnlock={unlock} />;
  if (!event || !flight) return <div className="empty-note">No events yet.</div>;

  const queue = flight.type === 'horizontal' ? horizQueue(flight) : [];
  const target = flight.type === 'horizontal' ? (override || queue[0] || null) : null;

  return (
    <div data-screen-label="Officials view">
      <AppTop kicker="Officials · Scoring" live meet={state.meet}>
        <SegUnits units={units} onChange={setUnits} />
        <a className="btn btn-accent btn-sm" href="Live Results.html">Live view</a>
      </AppTop>
      <div className="app-shell">
        <div className="lock-banner">
          <span>Scoring unlocked · code <span className="lb-code">{state.meet.code}</span></span>
          <button type="button" onClick={lock} title="Lock this device">Lock ✕</button>
        </div>
        <Chips
          items={state.events.map(e => ({ id: e.id, label: e.name, status: eventStatus(e) }))}
          value={event.id} onChange={setEventId}
        />
        {event.flights.length > 1 && (
          <Chips
            items={event.flights.map(f => ({ id: f.id, label: f.name, status: flightStatus(f) }))}
            value={flight.id} onChange={setFlightId}
          />
        )}
        <div className="otabs">
          <button type="button" className={tab === 'score' ? 'on' : ''} onClick={() => setTab('score')}>Score entry</button>
          <button type="button" className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>Setup</button>
        </div>

        {tab === 'score' && flight.type === 'horizontal' && (
          <React.Fragment>
            {target ? (
              <EntryPadHoriz units={units} event={event} flight={flight} target={target} onSaved={() => setOverride(null)} />
            ) : (
              <div className="pad"><div className="empty-note"><span className="mono">Flight complete</span>All {flight.rounds} rounds are in. Tap any cell below to make corrections.</div></div>
            )}
            <div className="sheet">
              <HorizBoard
                event={event} flight={flight} units={units} showHero={false}
                lastChange={state.lastChange} interactive selected={target}
                onSelect={(athleteId, round) => setOverride({ athleteId, round })}
              />
            </div>
          </React.Fragment>
        )}

        {tab === 'score' && flight.type === 'vertical' && (
          <React.Fragment>
            <EntryPadVert units={units} event={event} flight={flight} />
            <div className="sheet">
              <VertBoard event={event} flight={flight} units={units} lastChange={state.lastChange} showHero={false} />
            </div>
          </React.Fragment>
        )}

        {tab === 'setup' && (
          <SetupTab state={state} units={units} event={event} flight={flight} eventId={event.id} flightId={flight.id} />
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OfficialApp />);
