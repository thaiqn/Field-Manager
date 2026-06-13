import { useEffect, useRef, useState } from 'react';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Live meet subscription. Returns { meet, error, flash } where flash is a
// Set of "eventId:athleteId:idx" keys for results that just changed —
// the spectator boards pulse those cells gold.
export function useMeet(code) {
  const [meet, setMeet] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(() => new Set());
  const prevRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => {
    if (!code) return;
    let ws, closed = false, retry;
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?meet=${encodeURIComponent(code)}`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type !== 'meet') return;
        const next = msg.meet;
        const prev = prevRef.current;
        if (prev) {
          const changed = diffResults(prev, next);
          if (changed.length) {
            setFlash((f) => new Set([...f, ...changed]));
            timers.current.push(setTimeout(() => {
              setFlash((f) => {
                const out = new Set(f);
                changed.forEach((k) => out.delete(k));
                return out;
              });
            }, 2400));
          }
        }
        prevRef.current = next;
        setMeet(next);
        setError(null);
      };
      ws.onclose = (e) => {
        if (closed) return;
        if (e.code === 4404) { setError('No meet with that code.'); return; }
        retry = setTimeout(connect, 1500); // venue wifi drops — auto-reconnect
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      timers.current.forEach(clearTimeout);
      ws?.close();
    };
  }, [code]);

  return { meet, error, flash };
}

function diffResults(prev, next) {
  const changed = [];
  for (const ev of next.events) {
    const pe = prev.events.find((e) => e.id === ev.id);
    if (!pe) continue;
    for (const [athId, atts] of Object.entries(ev.results)) {
      const pAtts = pe.results[athId] || [];
      atts.forEach((v, i) => {
        if (v !== null && v !== '' && v !== (pAtts[i] ?? (ev.type === 'vertical' ? '' : null))) {
          changed.push(`${ev.id}:${athId}:${i}`);
        }
      });
    }
  }
  return changed;
}
