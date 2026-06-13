// SSR snapshot generator for screenshots. Renders each screen to static HTML
// (real components, inlined CSS, no JS/WebSocket) so wkhtmltoimage can
// rasterize it without a full browser. Bundled by esbuild, run under Node.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AppTop, SegUnits, Chips, HorizBoard, VertBoard,
  flightStatus, eventStatus, horizQueue,
} from '../src/components/SharedUI.jsx';
import { Home } from '../src/pages/Home.jsx';
import { EntryPadHoriz, SetupTab, LockScreen } from '../src/pages/Officials.jsx';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const OUT = path.join(root, 'shots');
const CODE = 'MVAL26';

// minimal storage shim so readAuth()/useUnits() initial reads don't throw
function memStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
globalThis.localStorage = memStore({ 'fel-units': 'imperial' });
globalThis.sessionStorage = memStore({
  [`felofficial:${CODE}`]: JSON.stringify({ token: 'demo', officialCode: 'TROJAN' }),
});

const cssFiles = ['colors_and_type.css', 'kit.css', 'app.css']
  .map((f) => fs.readFileSync(path.join(root, 'src/styles', f), 'utf8'))
  // drop the Google Fonts @import so the rasterizer doesn't stall on egress;
  // the font stacks fall back to serif/sans/mono.
  .map((c) => c.replace(/@import\s+url\([^)]*\);?/g, ''))
  .join('\n');

function page(title, bodyHtml, { dark = false, width = 480 } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${cssFiles}
    html,body{margin:0;background:${dark ? '#001A36' : 'var(--paper)'};width:${width}px}
    *{ -webkit-font-smoothing:antialiased }
    /* RASTERIZER SHIM — the wkhtmltoimage WebKit build has no CSS Grid, so
       re-express the design's grid layouts as flexbox for screenshots only.
       The shipped app uses CSS Grid as authored. */
    .va-row{display:flex!important;flex-wrap:wrap;align-items:baseline}
    .va-row>.bd-place{width:24px;flex:none}
    .va-row>.va-id{flex:1 1 auto;min-width:0}
    .va-row>.va-best{flex:none}
    .va-atts{display:flex!important;flex-basis:100%;width:100%;order:9}
    .va-atts>.va-att{flex:1 1 0}
    .vc-hero-atts{display:flex!important}
    .vc-hero-atts>.va-att{flex:1 1 0}
    .next-strip{display:flex!important}
    .next-strip>.next-cell{flex:1 1 0}
    .home-cards{display:flex!important;flex-wrap:wrap}
    .home-cards>.home-card{flex:1 1 200px}
    .pad-stepper{display:flex!important}
    .pad-stepper>.pad-key{flex:none;width:56px}
    .pad-stepper>.pad-val{flex:1 1 auto;display:flex;align-items:center;justify-content:center}
    .pad-keys{display:flex!important;flex-wrap:wrap}
    .pad-keys>.pad-key{flex:0 0 auto;width:calc((100% - 30px)/6)}
    .pad-keys.cols-4>.pad-key{width:calc((100% - 18px)/4)}
    .pad-keys.cols-3>.pad-key{width:calc((100% - 12px)/3)}
    .pad-actions{display:flex!important}
    .pad-actions>.pad-btn{flex:1 1 0}
    .pad-actions>.pad-btn-save{flex:2 1 0}
    .ve-actions{display:flex!important}
    .ve-actions>.pad-btn{flex:1 1 0}
    .setup-grid{display:flex!important;flex-wrap:wrap}
    .setup-grid>.form-field{flex:1 1 45%}
    .setup-grid>.full{flex-basis:100%}
    .fmt-seg{display:flex!important}
    .fmt-seg>button{flex:1 1 0}
    .hj-grid{display:flex!important;flex-wrap:wrap}
    .hj-grid>*{box-sizing:border-box}
    .hj-colhead.first,.hj-ath{width:28%}
    .hj-colhead:not(.first),.hj-cell{width:12%}
    .hj-ath{display:flex!important}
  </style></head><body>${bodyHtml}</body></html>`;
}

const noop = async () => {};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const res = await fetch(`http://localhost:8787/api/meets/${CODE}`);
  const { meet: data } = await res.json();
  const meet = data.meet;
  const lj = data.events[0];        // Girls Long Jump (live, round 4)
  const ljFlight = lj.flights[0];
  const hj = data.events[1];        // Girls High Jump (live, bar 5-02)
  const hjFlight = hj.flights[0];

  const eventChips = (
    <Chips items={data.events.map((e) => ({ id: e.id, label: e.name, status: eventStatus(e) }))}
      value={lj.id} onChange={noop} />
  );
  const flightChips = (
    <Chips items={lj.flights.map((f) => ({ id: f.id, label: f.name, status: flightStatus(f) }))}
      value={ljFlight.id} onChange={noop} />
  );

  const screens = [];

  // 1 — Home
  screens.push(['1-home', page('Home', renderToStaticMarkup(<Home />))]);

  // 2 — Spectator · Long Jump (A table + C hero)
  screens.push(['2-spectator-long-jump', page('Spectator LJ', renderToStaticMarkup(
    <div className="pulse-on">
      <AppTop kicker="Live results" live meet={meet}><SegUnits units="imperial" onChange={noop} /></AppTop>
      <div className="app-shell">
        {eventChips}{flightChips}
        <HorizBoard event={lj} flight={ljFlight} units="imperial" showHero flash={new Set()} />
        <p className="home-note" style={{ margin: 'var(--s-3) 0 0' }}>Updates automatically — no refresh needed</p>
      </div>
    </div>
  ))]);

  // 3 — Spectator · High Jump grid
  screens.push(['3-spectator-high-jump', page('Spectator HJ', renderToStaticMarkup(
    <div className="pulse-on">
      <AppTop kicker="Live results" live meet={meet}><SegUnits units="imperial" onChange={noop} /></AppTop>
      <div className="app-shell">
        <Chips items={data.events.map((e) => ({ id: e.id, label: e.name, status: eventStatus(e) }))} value={hj.id} onChange={noop} />
        <VertBoard event={hj} flight={hjFlight} units="imperial" showHero flash={new Set()} />
      </div>
    </div>
  ), { width: 560 })]);

  // 4 — Officials · lock screen
  screens.push(['4-officials-lock', page('Lock', renderToStaticMarkup(
    <LockScreen code={CODE} meetName={meet.name} onUnlock={noop} />
  ), { dark: true })]);

  // 5 — Officials · entry pad + correction sheet
  const target = horizQueue(ljFlight)[0];
  screens.push(['5-officials-scoring', page('Scoring', renderToStaticMarkup(
    <div>
      <AppTop kicker="Officials · Scoring" live meet={meet}>
        <SegUnits units="imperial" onChange={noop} />
        <a className="btn btn-accent btn-sm">Live view</a>
      </AppTop>
      <div className="app-shell">
        <div className="lock-banner"><span>Scoring unlocked · code <span className="lb-code">TROJAN</span></span><button type="button">Lock ✕</button></div>
        {eventChips}{flightChips}
        <div className="otabs"><button type="button" className="on">Score entry</button><button type="button">Setup</button></div>
        <EntryPadHoriz units="imperial" event={lj} flight={ljFlight} target={target} post={noop} onSaved={noop} />
        <div className="sheet">
          <HorizBoard event={lj} flight={ljFlight} units="imperial" showHero={false} interactive selected={target} onSelect={noop} />
        </div>
      </div>
    </div>
  ))]);

  // 6 — Officials · setup (code + export + format toggle)
  screens.push(['6-officials-setup', page('Setup', renderToStaticMarkup(
    <div>
      <AppTop kicker="Officials · Scoring" live meet={meet}><SegUnits units="imperial" onChange={noop} /></AppTop>
      <div className="app-shell">
        <div className="otabs"><button type="button">Score entry</button><button type="button" className="on">Setup</button></div>
        <SetupTab data={data} units="imperial" event={lj} flight={ljFlight} code={CODE} post={noop} onRelock={noop} onCodeChange={noop} />
      </div>
    </div>
  ))]);

  for (const [name, html] of screens) {
    fs.writeFileSync(path.join(OUT, name + '.html'), html);
    console.log('wrote', name);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
