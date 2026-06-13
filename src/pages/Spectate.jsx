import { useState } from 'react';
import { useMeet } from '../api';
import { navigate } from '../router';
import { HBoardA, HBoardB, HBoardC } from '../components/HorizontalBoard';
import { VBoard } from '../components/VerticalBoard';

const H_VARIANTS = [['a', 'Editorial'], ['b', 'Stadium'], ['c', 'Pit view']];
const V_VARIANTS = [['a', 'Light'], ['b', 'Navy']];

export function Spectate({ code }) {
  const { meet, error, flash } = useMeet(code);
  const [eventId, setEventId] = useState(null);
  const [variant, setVariant] = useState('a');
  const [units, setUnits] = useState('E');

  if (error) return <Message text={error} />;
  if (!meet) return <Message text="Connecting…" />;

  const event = meet.events.find((e) => e.id === eventId) || meet.events[0];
  if (!event) return <Message text="No events in this meet yet." />;
  const variants = event.type === 'vertical' ? V_VARIANTS : H_VARIANTS;
  const v = variants.some(([id]) => id === variant) ? variant : 'a';
  const dark = v === 'b';

  const HBoard = { a: HBoardA, b: HBoardB, c: HBoardC }[v];
  const board = event.type === 'vertical'
    ? <VBoard event={event} meet={meet} units={units} dark={dark} flash={flash} />
    : <HBoard event={event} meet={meet} units={units} flash={flash} />;

  return (
    <div className={'app-shell' + (dark ? ' dark' : '')}>
      <header className="app-nav">
        <div className="app-nav-top">
          <button className="app-back" onClick={() => navigate('/')}>←</button>
          <span className="app-nav-eyebrow">{meet.name}</span>
          <span className="app-nav-event mono-code">{meet.code}</span>
        </div>
        <div className="app-tabs">
          {meet.events.map((e) => (
            <button key={e.id} className={'app-tab' + (e.id === event.id ? ' is-active' : '')}
              onClick={() => setEventId(e.id)}>{e.name}</button>
          ))}
        </div>
        <div className="app-subbar">
          <div className="seg">
            {variants.map(([id, label]) => (
              <button key={id} className={'seg-btn' + (id === v ? ' is-active' : '')} onClick={() => setVariant(id)}>{label}</button>
            ))}
          </div>
          <div className="seg">
            {[['E', 'ft-in'], ['M', 'meters']].map(([id, label]) => (
              <button key={id} className={'seg-btn' + (id === units ? ' is-active' : '')} onClick={() => setUnits(id)}>{label}</button>
            ))}
          </div>
          <a className="export-link" href={`/api/meets/${meet.code}/export/hytek?units=${units}`} download>Hy-Tek ↓</a>
        </div>
      </header>
      <main className="app-board">{board}</main>
    </div>
  );
}

function Message({ text }) {
  return (
    <div className="app-shell">
      <div className="app-message">{text}</div>
    </div>
  );
}
