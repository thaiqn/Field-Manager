import crypto from 'node:crypto';

// Among-Us-style join codes: 6 chars from an alphabet with no 0/O/1/I/L
// ambiguity, so they survive being read aloud across a noisy infield.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeCode(len = 6) {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function makeToken() {
  return crypto.randomBytes(24).toString('base64url');
}
