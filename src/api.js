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

// Live meet subscription over WebSocket. Returns { meet, error, flash } where
// flash is a Set of changed-cell keys the boards pulse gold:
//   horizontal → `${flightId}:${athleteId}:${round}`
//   vertical   → `${flightId}:${athleteId}:${heightIdx}`
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
        const changed = prevRef.current ? diffMarks(prevRef.current, next) : [];
        if (changed.length) {
          setFlash((f) => new Set([...f, ...changed]));
          timers.current.push(setTimeout(() => {
            setFlash((f) => {
              const out = new Set(f);
              changed.forEach((k) => out.delete(k));
              return out;
            });
          }, 1900));
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

function diffMarks(prev, next) {
  const changed = [];
  for (const ev of next.events) {
    const pe = prev.events.find((e) => e.id === ev.id);
    if (!pe) continue;
    for (const fl of ev.flights) {
      const pf = pe.flights.find((f) => f.id === fl.id);
      if (!pf) continue;
      if (fl.type === 'vertical') {
        for (const [aid, rec] of Object.entries(fl.attempts || {})) {
          const prec = (pf.attempts || {})[aid] || {};
          for (const [hi, val] of Object.entries(rec)) {
            if (val && val !== prec[hi]) changed.push(`${fl.id}:${aid}:${hi}`);
          }
        }
      } else {
        for (const [aid, atts] of Object.entries(fl.marks || {})) {
          const patts = (pf.marks || {})[aid] || [];
          atts.forEach((v, i) => {
            const pv = patts[i];
            const k = JSON.stringify(v);
            if (v && k !== JSON.stringify(pv)) changed.push(`${fl.id}:${aid}:${i}`);
          });
        }
      }
    }
  }
  return changed;
}
