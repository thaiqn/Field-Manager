import { useState } from 'react';
import { api } from '../api';
import { navigate } from '../router';

export function Landing() {
  const [tab, setTab] = useState('spectate');
  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-eyebrow">Field Events Live</div>
        <h1 className="landing-title">Live results,<br /><em>right from the pit.</em></h1>
        <p className="landing-sub">Follow long jump, triple jump, and high jump as marks land — or run the event with an official code.</p>
      </div>
      <div className="landing-tabs">
        {[['spectate', 'Spectate'], ['official', 'I’m an official'], ['create', 'Create a meet']].map(([id, label]) => (
          <button key={id} className={'landing-tab' + (tab === id ? ' is-active' : '')} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'spectate' && <JoinForm mode="spectate" />}
      {tab === 'official' && <JoinForm mode="official" />}
      {tab === 'create' && <CreateForm />}
      <div className="landing-demo">
        Demo meet: code <b>MVAL26</b>{tab === 'official' && <> · official code <b>TROJAN</b></>}
      </div>
    </div>
  );
}

function JoinForm({ mode }) {
  const [code, setCode] = useState('');
  const [official, setOfficial] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const go = async (e) => {
    e.preventDefault();
    setErr(null);
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      await api(`/api/meets/${c}`); // validate code before navigating
      if (mode === 'official') {
        const { token } = await api(`/api/meets/${c}/auth`, { method: 'POST', body: { officialCode: official.trim() } });
        sessionStorage.setItem(`official:${c}`, token);
        navigate(`/official/${c}`);
      } else {
        navigate(`/m/${c}`);
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="landing-form" onSubmit={go}>
      <label className="field">
        <span className="field-label">Meet code</span>
        <input className="field-input code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123" maxLength={6} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
      </label>
      {mode === 'official' && (
        <label className="field">
          <span className="field-label">Official code</span>
          <input className="field-input code-input" value={official} onChange={(e) => setOfficial(e.target.value.toUpperCase())}
            placeholder="••••••" maxLength={6} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <span className="field-hint">Issued to the meet director when the meet is created. Spectators never need it — viewing is always open.</span>
        </label>
      )}
      {err && <div className="form-err">{err}</div>}
      <button className="btn-go" disabled={busy || !code.trim() || (mode === 'official' && !official.trim())}>
        {mode === 'official' ? 'Enter scoring →' : 'Watch live →'}
      </button>
    </form>
  );
}

function CreateForm() {
  const [form, setForm] = useState({ name: '', venue: '', date: '' });
  const [created, setCreated] = useState(null);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const go = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      setCreated(await api('/api/meets', { method: 'POST', body: form }));
    } catch (e2) {
      setErr(e2.message);
    }
  };

  if (created) {
    return (
      <div className="landing-form">
        <div className="created-codes">
          <div className="created-row">
            <span className="field-label">Meet code · share with everyone</span>
            <span className="created-code">{created.meet.code}</span>
          </div>
          <div className="created-row gold">
            <span className="field-label">Official code · officials only</span>
            <span className="created-code">{created.officialCode}</span>
          </div>
          <p className="field-hint">Write the official code down — this is the only time it’s shown. Anyone with the meet code can watch; only the official code can enter marks.</p>
        </div>
        <button className="btn-go" onClick={() => navigate(`/m/${created.meet.code}`)}>Open meet →</button>
      </div>
    );
  }

  return (
    <form className="landing-form" onSubmit={go}>
      <label className="field"><span className="field-label">Meet name</span>
        <input className="field-input" value={form.name} onChange={set('name')} placeholder="MVAL Championships" required /></label>
      <label className="field"><span className="field-label">Venue</span>
        <input className="field-input" value={form.venue} onChange={set('venue')} placeholder="Milpitas High School" /></label>
      <label className="field"><span className="field-label">Date</span>
        <input className="field-input" value={form.date} onChange={set('date')} placeholder="Jun 12, 2026" /></label>
      {err && <div className="form-err">{err}</div>}
      <button className="btn-go">Create meet →</button>
    </form>
  );
}
