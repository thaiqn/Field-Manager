import { useEffect, useState } from 'react';

// Tiny hash router: '#/m/CODE' (spectate), '#/official/CODE', '' (landing).
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
  return { page: 'landing' };
}

export function navigate(path) {
  location.hash = path;
}
