import { useState } from 'react';
import { navigate } from '../router';
import { api } from '../api';

const DEMO = 'MVAL26';

export function Home() {
  const [code, setCode] = useState('');
  const join = (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) navigate(`/m/${c}`);
  };
  return (
    <div>
      <div className="home-hero">
        <div className="wrap-narrow">
          <div className="hero-kicker">Field events · Live results</div>
          <h1 className="hero-title">Every mark, <em>the moment</em> it lands.</h1>
          <p className="hero-dek">Officials score from the pit on a phone. Spectators watch ranks move in real time. Long jump, triple jump, shot put, and high jump — one meet, two views.</p>
        </div>
      </div>
      <div className="track-divider" />
      <div className="wrap-narrow">
        <div className="home-cards">
          <a className="home-card" href={`#/official/${DEMO}`}>
            <div className="home-card-k">For officials</div>
            <div className="home-card-t">Scoring</div>
            <p className="home-card-d">Touch-first mark entry in rotation order, bar-height progression, corrections, and meet setup. Enter the meet code to unlock.</p>
            <span className="home-card-cta">Open scoring →</span>
          </a>
          <a className="home-card" href={`#/m/${DEMO}`}>
            <div className="home-card-k">For spectators</div>
            <div className="home-card-t">Live results</div>
            <p className="home-card-d">Auto-updating leaderboards with attempt-by-attempt detail, up-next rotation, and PR badges.</p>
            <span className="home-card-cta">Watch live →</span>
          </a>
        </div>

        <form className="home-join" onSubmit={join}>
          <input className="code-box" style={{ aspectRatio: 'auto', height: 44, letterSpacing: '.22em' }}
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MEET CODE" maxLength={6} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <button className="btn btn-primary" type="submit">Watch a meet →</button>
        </form>
        <div className="home-sub">
          <a className="btn btn-ghost btn-sm" href="#/create">Create a meet</a>
        </div>

        <p className="home-note">Tip: open both pages side by side — marks entered in scoring appear on the live board instantly.</p>
      </div>
    </div>
  );
}

export function CreateMeet() {
  const [form, setForm] = useState({ name: '', venue: '', date: '' });
  const [created, setCreated] = useState(null);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      setCreated(await api('/api/meets', { method: 'POST', body: form }));
    } catch (e2) { setErr(e2.message); }
  };

  if (created) {
    return (
      <div className="wrap-narrow" style={{ paddingTop: 'var(--s-6)' }}>
        <div className="setup-card">
          <h3 className="setup-title">Meet created</h3>
          <p className="lock-dek" style={{ margin: 0 }}>Share the spectate code with everyone. The official code unlocks scoring — write it down, it’s only shown once.</p>
          <div className="setup-grid">
            <div><div className="va-best-label">Spectate code</div><span className="code-chip">{created.meet.code}</span></div>
            <div><div className="va-best-label">Official code</div><span className="code-chip">{created.officialCode}</span></div>
          </div>
          <div className="setup-row">
            <a className="btn btn-primary btn-sm" href={`#/m/${created.meet.code}`}>Open live results →</a>
            <a className="btn btn-outline btn-sm" href={`#/official/${created.meet.code}`}>Open scoring →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap-narrow" style={{ paddingTop: 'var(--s-6)' }}>
      <form className="setup-card" onSubmit={submit}>
        <h3 className="setup-title">Create a meet</h3>
        <div className="setup-grid">
          <div className="form-field full"><label>Meet name</label>
            <input value={form.name} onChange={set('name')} placeholder="MVAL Championships" required /></div>
          <div className="form-field"><label>Venue</label>
            <input value={form.venue} onChange={set('venue')} placeholder="Milpitas High School" /></div>
          <div className="form-field"><label>Date</label>
            <input value={form.date} onChange={set('date')} placeholder="May 8, 2026" /></div>
        </div>
        {err && <div className="lock-err" style={{ minHeight: 0 }}>{err}</div>}
        <div className="setup-row">
          <button className="btn btn-primary btn-sm" type="submit">Create meet →</button>
          <a className="btn btn-ghost btn-sm" href="#/">Cancel</a>
        </div>
      </form>
    </div>
  );
}
