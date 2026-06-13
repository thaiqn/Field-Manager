// live-app.jsx — read-only spectator leaderboard. Direction A table + C hero card.
// Live sync: storage events (cross-tab) + 2s polling fallback.
const { marks: M, store: S } = window.FEL;
const {
  useMeetState, useUnits, AppTop, SegUnits, Chips,
  HorizBoard, VertBoard, flightStatus, eventStatus,
} = window;
const { TweaksPanel, TweakSection, TweakToggle, TweakRadio, useTweaks } = window;

function LiveApp() {
  const state = useMeetState();
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "units": "imperial",
    "showHero": true,
    "pulse": true
  }/*EDITMODE-END*/);
  const [eventId, setEventId] = React.useState(state.events[0] && state.events[0].id);
  const event = state.events.find(e => e.id === eventId) || state.events[0];
  const [flightId, setFlightId] = React.useState(event && event.flights[0] && event.flights[0].id);
  const flight = event && (event.flights.find(f => f.id === flightId) || event.flights[0]);
  const units = tweaks.units;

  React.useEffect(() => {
    if (event && !event.flights.some(f => f.id === flightId)) setFlightId(event.flights[0] && event.flights[0].id);
  }, [eventId]);

  // Poll fallback: storage events don't fire in the same tab/iframe pair on
  // some hosts; re-read every 2s so the leaderboard always converges.
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(() => {
      const cur = S.get().rev;
      try {
        const raw = localStorage.getItem('fel-meet-v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.rev !== cur) { window.dispatchEvent(new StorageEvent('storage', { key: 'fel-meet-v1', newValue: raw })); }
        }
      } catch (e) {}
      force(); // also refreshes 'just-changed' pulse windows + live dots
    }, 2000);
    return () => clearInterval(t);
  }, []);

  if (!event || !flight) return <div className="empty-note">No events published yet.</div>;

  return (
    <div className={tweaks.pulse ? 'pulse-on' : ''} data-screen-label="Spectator live view">
      <AppTop kicker="Live field results" live={eventStatus(event) === 'live'} meet={state.meet}>
        <SegUnits units={units} onChange={u => setTweak('units', u)} />
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

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-500)', textAlign: 'center', marginTop: 'var(--s-4)' }}>
          Updates automatically — keep this page open
        </p>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Display">
          <TweakRadio
            label="Units" value={tweaks.units}
            options={[{ value: 'imperial', label: 'ft-in' }, { value: 'metric', label: 'meters' }]}
            onChange={v => setTweak('units', v)}
          />
          <TweakToggle label="Hero 'now up' card" value={tweaks.showHero} onChange={v => setTweak('showHero', v)} />
          <TweakToggle label="Pulse new marks" value={tweaks.pulse} onChange={v => setTweak('pulse', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<LiveApp />);
