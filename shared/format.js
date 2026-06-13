// Mark storage convention: horizontal/vertical marks are stored as inches
// (number), 'X' (foul/miss), 'P' (pass), or null (pending). All display
// formatting goes through here so the imperial/metric toggle is one switch.

export function inchesToFtIn(inches, { decimals = 2 } = {}) {
  const ft = Math.floor(inches / 12);
  const rem = inches - ft * 12;
  if (decimals === 0) return `${ft}-${String(Math.round(rem)).padStart(2, '0')}`;
  return `${ft}-${rem.toFixed(decimals).padStart(decimals + 3, '0')}`;
}

export function inchesToMeters(inches, { decimals = 2 } = {}) {
  return `${(inches * 0.0254).toFixed(decimals)}m`;
}

export function formatMark(mark, units, opts) {
  if (mark === null || mark === undefined) return '–';
  if (mark === 'X') return 'X';
  if (mark === 'P') return 'P';
  return units === 'M' ? inchesToMeters(mark, opts) : inchesToFtIn(mark, opts);
}

// Accepts "17-08.25", "17-8.25", "17 8.25", bare inches "212.25" with a
// trailing "i", or metric "5.39" / "5.39m" → inches. Returns null if
// unparseable.
export function parseMark(text, units = 'E') {
  const t = String(text).trim().toLowerCase();
  if (!t) return null;
  if (t.endsWith('m')) {
    const m = parseFloat(t);
    return Number.isFinite(m) ? round2(m / 0.0254) : null;
  }
  if (t.endsWith('i')) {
    const i = parseFloat(t);
    return Number.isFinite(i) ? round2(i) : null;
  }
  const sep = t.match(/^(\d+)[\s\-'](\d+(?:\.\d+)?)$/);
  if (sep) {
    const ft = parseInt(sep[1], 10);
    const inch = parseFloat(sep[2]);
    if (inch >= 12) return null;
    return round2(ft * 12 + inch);
  }
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  // Bare number: metric meets read it as meters, imperial as feet.
  return units === 'M' ? round2(n / 0.0254) : round2(n * 12);
}

function round2(n) { return Math.round(n * 100) / 100; }
