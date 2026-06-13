// spectator-app.jsx — read-only live results view (direction A + C hero).
const { marks: M, store: S } = window.FEL;
const {
  useMeetState, useUnits, AppTop, SegUnits, Chips,
  HorizBoard, VertBoard, flightStatus, eventStatus,
} = window;
const { TweaksPanel, TweakSection, TweakToggle, TweakRadio, useTweaks } = window;

const SPEC_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "units": "imperial",
  "showHero": true,
  "pulse": true
}/*EDITMODE-END*/;

function SpectatorApp() {
  const state = useMeetState();
  const [tweaks, setTweak] = useTweaks(SPEC_TWEAK_DEFAULTS);
  const [unitsLS, setUnitsLS] = useUnits(tweaks.units);
  const units = tweaks.units || unitsLS;
  const setUnits = u => { setTweak('units', u); setUnitsLS(u); };

  const [eventId, setEventId] = React.useState(() => {
    // open on a live event if there is one
    const live = state.events.find(e => eventStatus(e) === 'live');
    return (live || state.events[0]) && (live || state.events[0]).id;
  });
  const event = state.events.find(e => e.id === eventId) || state.events[0];
  const [flightId, setFlightId] = React.useState(null);
  const flight = event && (event.flights.find(f => f.id === flightId) ||
    event.flights.find(f => flightStatus(f) === 'live') ||
    event.flights[0]);

  React.useEffect(() => { setFlightId(null); }, [eventId]);

  // tick so the "just-changed" pulse window expires naturally
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    if (!state.lastChange) return;
    const t = setTimeout(force, 4200);
    return () => clearTimeout(t);
  }, [state.rev]);

  if (!event || !flight) return <div className="empty-note">No events published yet.</div>;
  const anyLive = state.events.some(e => eventStatus(e) === 'live');

  return (
    <div className={tweaks.pulse ? 'pulse-on' : ''} data-screen-label="Spectator view">
      <AppTop kicker={anyLive ? 'Live results' : 'Results'} live={anyLive} meet={state.meet}>
        <SegUnits units={units} onChange={setUnits} />
      </AppTop>
      <div className="app-shell">
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

        {flight.type === 'horizontal' ? (
          <HorizBoard event={event} flight={flight} units={units} showHero={tweaks.showHero} lastChange={state.lastChange} />
        ) : (
          <VertBoard event={event} flight={flight} units={units} showHero={tweaks.showHero} lastChange={state.lastChange} />
        )}

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-500)', textAlign: 'center', marginTop: 'var(--s-3)' }}>
          Updates automatically — no refresh needed
        </p>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Units" />
        <TweakRadio
          label="Marks" value={tweaks.units}
          options={['imperial', 'metric']}
          onChange={v => setUnits(v)}
        />
        <TweakSection label="Board" />
        <TweakToggle label="Now-up hero card" value={tweaks.showHero} onChange={v => setTweak('showHero', v)} />
        <TweakToggle label="Pulse new marks gold" value={tweaks.pulse} onChange={v => setTweak('pulse', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SpectatorApp />);
