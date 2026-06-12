import { useState } from 'react';
import { LJBoardA } from './components/LJBoardA';
import { LJBoardB } from './components/LJBoardB';
import { LJBoardC } from './components/LJBoardC';
import { HJGrid }   from './components/HJGrid';

const TABS = [
  { id: 'lj-a', label: 'A · Editorial', group: 'lj', groupLabel: 'Long Jump' },
  { id: 'lj-b', label: 'B · Stadium',   group: 'lj', groupLabel: 'Long Jump' },
  { id: 'lj-c', label: 'C · Pit view',  group: 'lj', groupLabel: 'Long Jump' },
  { id: 'hj-a', label: 'A · Light',     group: 'hj', groupLabel: 'High Jump' },
  { id: 'hj-b', label: 'B · Navy',      group: 'hj', groupLabel: 'High Jump' },
];

const BOARDS = {
  'lj-a': <LJBoardA />,
  'lj-b': <LJBoardB />,
  'lj-c': <LJBoardC />,
  'hj-a': <HJGrid dark={false} />,
  'hj-b': <HJGrid dark={true} />,
};

export default function App() {
  const [active, setActive] = useState('lj-a');
  const current = TABS.find((t) => t.id === active);
  const isDark = active === 'lj-b' || active === 'hj-b';

  return (
    <div className={'app-shell' + (isDark ? ' dark' : '')}>
      <header className="app-nav">
        <div className="app-nav-top">
          <span className="app-nav-eyebrow">Field Events Live</span>
          <span className="app-nav-event">{current?.groupLabel}</span>
        </div>
        <div className="app-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              className={'app-tab' + (active === t.id ? ' is-active' : '') + (t.group !== current?.group ? ' other-group' : '')}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="app-board" role="tabpanel">
        {BOARDS[active]}
      </main>
    </div>
  );
}
