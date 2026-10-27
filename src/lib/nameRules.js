export const NAME_RE = /^[\p{L}\p{N}_.-]{3,16}$/u;
// Maks 32 bytes i UTF-8, så den kodede mail-del altid er under 64 tegn.
export const validName = (n) => NAME_RE.test(n.trim()) && new TextEncoder().encode(n.trim()).length <= 32;

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
const base32 = (bytes) => {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
};

// Supabase Auth vil have en mail. Vi laver en falsk ud fra brugernavnet; der sendes aldrig mails.
// Navne med æøå m.m. kodes (små bogstaver, så Supabase' lowercasing ikke kan skabe kollisioner).
export function emailFor(name, domain = 'gmail.com') {
  const n = name.trim().toLowerCase();
  const local = /^[a-z0-9._-]+$/.test(n) ? 'plinko.' + n : 'plinko.u' + base32(new TextEncoder().encode(n));
  return `${local}@${domain}`;
}
