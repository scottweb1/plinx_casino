import { JP } from '../../lib/config.js';
import { randInt } from '../../lib/rng.js';

export const PAYTABLE = {
  8: { Low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], Medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], High: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] },
  12: { Low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], Medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], High: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170] },
  16: { Low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], Medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110], High: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000] },
};
export const ROWS = [8, 12, 16];
export const RISKS = ['Low', 'Medium', 'High'];
export const SPACING = 46; // afstand mellem pins (logiske enheder)
export const SEG_MS = 230; // tid pr. række ved normal fart

export const isEdge = (k, rows) => Math.min(k, rows - k) < JP.edge;
export const col = (i, n) => {
  const m = n / 2, d = Math.abs(i - m) / m;
  return `hsl(${Math.round(46 * (1 - d))},100%,${Math.round(56 - 9 * d)}%)`;
};
export const label = (m) => (m >= 100 ? String(m) : m + 'x');

// Hvert pin-ramp er 50/50 (kryptografisk tilfældigt). k = antal "højre"-valg = hink-indeks.
export const randomDirs = (rows) => Array.from({ length: rows }, () => randInt(2));
export const offsets = (dirs) => {
  let o = 0;
  const off = [0];
  dirs.forEach((d) => { o += d ? 0.5 : -0.5; off.push(o); });
  return off;
};

// Teoretisk tilbagebetaling (RTP) for en tabel
export function rtp(rows, risk) {
  const tbl = PAYTABLE[rows][risk];
  let c = 1, sum = 0;
  for (let k = 0; k <= rows; k++) { sum += (c / 2 ** rows) * tbl[k]; c = (c * (rows - k)) / (k + 1); }
  return sum;
}

export const geometry = (rows) => {
  const W = (rows + 3) * SPACING, cx = W / 2, rowY = (r) => 40 + (r - 1) * SPACING;
  return { W, cx, rowY, H: rowY(rows) + SPACING + 36 };
};
