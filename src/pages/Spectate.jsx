import { useEffect, useState } from 'react';
import { useMeet } from '../api';
import { navigate } from '../router';
import {
  AppTop, SegUnits, Chips, HorizBoard, VertBoard, flightStatus, eventStatus,
} from '../components/SharedUI';

function useUnits() {
  const [units, setRaw] = useState(() => {
    try { return localStorage.getItem('fel-units') || 'imperial'; } catch { return 'imperial'; }
  });
  const setUnits = (u) => { setRaw(u); try { localStorage.setItem('fel-units', u); } catch {} };
  return [units, setUnits];
}

export function Spectate({ code }) {
  const { meet: data, error, flash } = useMeet(code);
  const [units, setUnits] = useUnits();
  const [eventId, setEventId] = useState(null);
  const [flightId, setFlightId] = useState(null);

  // default to a live event/flight once data arrives
  useEffect(() => { setFlightId(null); }, [eventId]);

  if (error) return <Message text={error} />;
  if (!data) return <Message text="Connecting…" />;
  const meet = data.meet;
  if (!data.events.length) return <Message text="No events published yet." />;

  const event = data.events.find((e) => e.id === eventId)
    || data.events.find((e) => eventStatus(e) === 'live') || data.events[0];
  const flight = event.flights.find((f) => f.id === flightId)
    || event.flights.find((f) => flightStatus(f) === 'live') || event.flights[0];
  const anyLive = data.events.some((e) => eventStatus(e) === 'live');

  return (
    <div className="pulse-on">
      <AppTop kicker={anyLive ? 'Live results' : 'Results'} live={anyLive} meet={meet}>
        <SegUnits units={units} onChange={setUnits} />
      </AppTop>
      <div className="app-shell">
        <Chips
          items={data.events.map((e) => ({ id: e.id, label: e.name, status: eventStatus(e) }))}
          value={event.id} onChange={setEventId}
        />
        {event.flights.length > 1 && (
          <Chips
            items={event.flights.map((f) => ({ id: f.id, label: f.name, status: flightStatus(f) }))}
            value={flight.id} onChange={setFlightId}
          />
        )}

        {flight.type === 'horizontal'
          ? <HorizBoard event={event} flight={flight} units={units} showHero flash={flash} />
          : <VertBoard event={event} flight={flight} units={units} showHero flash={flash} />}

        <p className="home-note" style={{ margin: 'var(--s-3) 0 0' }}>Updates automatically — no refresh needed</p>
        <div className="home-sub" style={{ marginTop: 'var(--s-3)' }}>
          <a className="btn btn-ghost btn-sm" href="#/">← Home</a>
          <a className="btn btn-outline btn-sm" href={`#/official/${code}`}>Officials scoring →</a>
        </div>
      </div>
    </div>
  );
}

function Message({ text }) {
  return (
    <div className="app-message">
      <div>{text}</div>
      <a className="btn btn-ghost btn-sm" href="#/">← Home</a>
    </div>
  );
}
