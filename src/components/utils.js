export function attClass(att, i, bestIdx) {
  let c = 'va-att';
  if (att === null) c += ' is-pending';
  else if (att === 'X') c += ' is-foul';
  else if (att === 'P') c += ' is-pass';
  else if (att === 'NOW') c += ' is-pending';
  else if (i === bestIdx) c += ' is-best';
  return c;
}

export function attText(att) {
  if (att === null) return '–';
  if (att === 'X') return 'X';
  if (att === 'P') return 'P';
  if (att === 'NOW') return '·now·';
  return att;
}

export function podiumClass(p) {
  return p <= 3 ? ' podium-' + p : '';
}
