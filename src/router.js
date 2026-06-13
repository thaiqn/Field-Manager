import { useEffect, useState } from 'react';

// Hash router:
//   ''               → home (hero + two cards)
//   '#/m/CODE'       → spectate (open, read-only)
//   '#/official/CODE'→ officials scoring (code-gated)
//   '#/create'       → create a meet
//   '#/join'         → join a meet to spectate
export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'm' && parts[1]) return { page: 'spectate', code: parts[1].toUpperCase() };
  if (parts[0] === 'official' && parts[1]) return { page: 'official', code: parts[1].toUpperCase() };
  if (parts[0] === 'create') return { page: 'create' };
  if (parts[0] === 'join') return { page: 'join' };
  return { page: 'home' };
}

export function navigate(path) { location.hash = path; }
