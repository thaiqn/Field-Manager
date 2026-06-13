// Officials' touch-first scoring view. Requires the meet's official code
// (validated server-side — the bearer token gates every write).

import { useState } from 'react';
import { api, useMeet } from '../api';
import { navigate } from '../router';
import { formatMark, parseMark, inchesToFtIn } from '../../shared/format';
import { rankHorizontal, rotation, attemptCount } from '../../shared/rank';
import { rankVertical } from '../../shared/rank';

export function Officials({ code }) {
  const token = sessionStorage.getItem(`official:${code}`);
  const { meet, error, flash } = useMeet(code);
  const [eventId, setEventId] = useState(null);
  const [err, setErr] = useState(null);

  if (!token) return <Gate text="Not signed in as an official for this meet." />;
  if (error) return <Gate text={error} />;
  if (!meet) return <Gate text="Connecting…" />;

  const event = meet.events.find((e) => e.id === eventId) || meet.events[0];

  const post = async (path, body) => {
    setErr(null);
    try {
      await api(`/api/meets/${code}${path}`, { method: 'POST', body, token });
    } catch (e) {
      setErr(e.message);
      if (/officials only/i.test(e.message)) sessionStorage.removeItem(`official:${code}`);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div className="app-nav-top">
          <button className="app-back" onClick={() => navigate('/')}>←</button>
          <span className="app-nav-eyebrow">Scoring · {meet.name}</span>
          <span className="app-nav-event mono-code">{meet.code}</span>
        </div>
        <div className="app-tabs">
          {meet.events.map((e) => (
            <button key={e.id} className={'app-tab' + (e.id === event?.id ? ' is-active' : '')}
              onClick={() => setEventId(e.id)}>{e.name}</button>
          ))}
        </div>
      </header>
      <main className="app-board off-board">
        {err && <div className="form-err off-err">{err}</div>}
        {event?.type === 'horizontal' && <HorizontalEntry event={event} post={post} units={meet.units} />}
        {event?.type === 'vertical' && <VerticalEntry event={event} post={post} units={meet.units} />}
      </main>
    </div>
  );
}

function Gate({ text }) {
  return (
    <div className="app-shell">
      <div className="app-message">
        {text}
        <button className="btn-go" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Back to join →</button>
      </div>
    </div>
  );
}

// ── Horizontal: rotation banner + roster + entry pad ─────────
function HorizontalEntry({ event, post, units }) {
  const [sel, setSel] = useState(null); // { athleteId, attempt }
  const rows = rankHorizontal(event);
  const rot = rotation(event);
  const n = attemptCount(event);

  const open = (athleteId, attempt) => setSel({ athleteId, attempt });

  return (
    <div className="off-entry">
      <div className="off-banner">
        <span className="off-banner-k">Round {rot.round} of {n}{event.format === 'open4' ? ' · 4-attempt format' : ''}</span>
        {rot.nowId
          ? <span className="off-banner-v">Up: <b>{event.athletes.find((a) => a.id === rot.nowId)?.name}</b></span>
          : <span className="off-banner-v">Event complete</span>}
      </div>
      <div className="off-roster">
        {rows.map((r) => (
          <div key={r.athlete.id} className={'off-row' + (rot.nowId === r.athlete.id ? ' is-now' : '')}>
            <div className="off-row-id">
              <span className="off-row-name">{r.athlete.name}</span>
              <span className="off-row-team">{r.athlete.team} · {r.best === null ? 'NM' : formatMark(r.best, units)}</span>
            </div>
            <div className="off-atts">
              {r.atts.map((att, i) => (
                <button key={i}
                  className={'off-att' + (att === null ? ' pend' : '') + (rot.nowId === r.athlete.id && rot.round - 1 === i ? ' now' : '')}
                  onClick={() => open(r.athlete.id, i)}>
                  {att === null ? i + 1 : formatMark(att, units)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {sel && (
        <Pad
          title={event.athletes.find((a) => a.id === sel.athleteId)?.name}
          subtitle={`Attempt ${sel.attempt + 1} of ${n}`}
          units={units}
          onClose={() => setSel(null)}
          onSave={async (mark) => {
            await post(`/events/${event.id}/result`, { athleteId: sel.athleteId, attempt: sel.attempt, mark });
            setSel(null);
          }}
        />
      )}
    </div>
  );
}

// Big-button mark pad: digits build a ft-in string, X/P/clear shortcuts.
function Pad({ title, subtitle, units, onClose, onSave }) {
  const [text, setText] = useState('');
  const parsed = parseMark(text, units);
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '-'];

  return (
    <div className="pad-overlay" onClick={onClose}>
      <div className="pad" onClick={(e) => e.stopPropagation()}>
        <div className="pad-head">
          <div>
            <div className="pad-name">{title}</div>
            <div className="pad-sub">{subtitle}</div>
          </div>
          <button className="pad-x" onClick={onClose}>×</button>
        </div>
        <div className="pad-display">
          {text || <span className="pad-ph">{units === 'M' ? 'meters e.g. 5.39' : 'ft-in e.g. 17-08.25'}</span>}
          <span className="pad-parsed">{text && (parsed !== null ? `= ${formatMark(parsed, units)}` : 'invalid')}</span>
        </div>
        <div className="pad-grid">
          {keys.map((k) => (
            <button key={k} className="pad-key" onClick={() => setText((t) => t + k)}>{k}</button>
          ))}
        </div>
        <div className="pad-actions">
          <button className="pad-key warn" onClick={() => setText((t) => t.slice(0, -1))}>⌫</button>
          <button className="pad-key foul" onClick={() => onSave('X')}>X foul</button>
          <button className="pad-key pass" onClick={() => onSave('P')}>P pass</button>
          <button className="pad-key save" disabled={parsed === null} onClick={() => onSave(parsed)}>Save</button>
        </div>
        <button className="pad-clear" onClick={() => onSave(null)}>Clear this attempt</button>
      </div>
    </div>
  );
}

// ── Vertical: bar control + O/X/— per athlete at current bar ─
function VerticalEntry({ event, post, units }) {
  const rows = rankVertical(event);
  const cur = event.curHeight ?? 0;
  const [newHeight, setNewHeight] = useState('');
  const fmtH = (h) => units === 'M' ? formatMark(h, units) : inchesToFtIn(h, { decimals: 0 });

  const setCell = (athleteId, cell) =>
    post(`/events/${event.id}/result`, { athleteId, heightIndex: cur, cell });

  const append = (r, ch) => {
    const cell = r.cells[cur] || '';
    if (/O|P|XXX/.test(cell)) return; // resolved — use reset first
    if (ch === 'O') return setCell(r.athlete.id, cell + 'O');
    if (ch === 'X') return setCell(r.athlete.id, cell.length >= 2 ? 'XXX' : cell + 'X');
    if (ch === 'P') return setCell(r.athlete.id, 'P');
  };

  return (
    <div className="off-entry">
      <div className="off-banner">
        <span className="off-banner-k">Bar at {fmtH(event.heights[cur])}</span>
        <div className="off-bar-controls">
          {cur > 0 && <button className="off-bar-btn" onClick={() => post(`/events/${event.id}/bar`, { curHeight: cur - 1 })}>↓</button>}
          {cur < event.heights.length - 1 && (
            <button className="off-bar-btn" onClick={() => post(`/events/${event.id}/bar`, { curHeight: cur + 1 })}>
              Raise to {fmtH(event.heights[cur + 1])} ↑
            </button>
          )}
        </div>
      </div>
      <div className="off-roster">
        {rows.map((r) => {
          const cell = r.cells[cur] || '';
          const resolved = /O|P|XXX/.test(cell);
          return (
            <div key={r.athlete.id} className={'off-row' + (r.out ? ' is-out' : '')}>
              <div className="off-row-id">
                <span className="off-row-name">{r.athlete.name}</span>
                <span className="off-row-team">
                  {r.athlete.team} · {r.best === null ? 'NH' : fmtH(r.best)} {r.out ? '· OUT' : ''}
                </span>
              </div>
              <div className="off-atts">
                <span className={'off-cell' + (cell ? '' : ' pend')}>{cell === 'P' ? '—' : cell || '·'}</span>
                {!r.out && !resolved && <>
                  <button className="pad-key save sm" onClick={() => append(r, 'O')}>O</button>
                  <button className="pad-key foul sm" onClick={() => append(r, 'X')}>X</button>
                  <button className="pad-key pass sm" onClick={() => append(r, 'P')}>—</button>
                </>}
                {(cell !== '' || r.out) && (
                  <button className="pad-key warn sm" onClick={() => setCell(r.athlete.id, '')}>↺</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="off-addheight">
        <input className="field-input" value={newHeight} placeholder={units === 'M' ? 'Add height (m)' : 'Add height e.g. 5-06'}
          onChange={(e) => setNewHeight(e.target.value)} />
        <button className="off-bar-btn" disabled={parseMark(newHeight, units) === null}
          onClick={() => { post(`/events/${event.id}/bar`, { addHeight: parseMark(newHeight, units) }); setNewHeight(''); }}>
          Add
        </button>
      </div>
    </div>
  );
}
