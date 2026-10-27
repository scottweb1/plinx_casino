// DEV-ONLY: skævvridning af Plinko for bestemte testnavne (genindsat efter ønske, samme "hæld" som før).
//
//  - "Scott"  : ca. 3x så ofte et vindende hink (>1x) som tilfældigt (maks. 95 %).
//  - "ScottW" : 12,5 % af kuglerne går lige til venstre eller højre kant (jackpot-zonen).
//
// Alle andre navne spiller med helt ens 50/50-baner. Slå funktionen fra ved at sætte DEV_LUCK_ENABLED til false.
import { PAYTABLE } from '../games/plinko/plinkoMath.js';
import { randFloat, shuffle } from '../lib/rng.js';

export const DEV_LUCK_ENABLED = true;
export const DEV_LUCK_NAMES = ['Scott', 'ScottW'];

// Vælg et hink med vægt = binomial sandsynlighed, blandt vindende eller tabende hinke.
export function tilt(rows, risk, dirs) {
  const tbl = PAYTABLE[rows][risk], pk = [];
  let c = 1, win = 0;
  for (let k = 0; k <= rows; k++) { pk.push(c); c = (c * (rows - k)) / (k + 1); }
  pk.forEach((v, k) => { if (tbl[k] > 1) win += v / Math.pow(2, rows); });
  const wantWin = randFloat() < Math.min(0.95, win * 3);
  const ks = pk.map((_, k) => k).filter((k) => (tbl[k] > 1) === wantWin);
  if (!ks.length) return dirs;
  let r = randFloat() * ks.reduce((a, k) => a + pk[k], 0), k = ks[ks.length - 1];
  for (const q of ks) { r -= pk[q]; if (r <= 0) { k = q; break; } }
  return shuffle(Array.from({ length: rows }, (_, i) => (i < k ? 1 : 0)));
}

export function applyDevLuck(name, rows, risk, dirs) {
  if (!DEV_LUCK_ENABLED) return dirs;
  if (name === 'Scott') return tilt(rows, risk, dirs);
  if (name === 'ScottW' && randFloat() < 0.125) return Array(rows).fill(randFloat() < 0.5 ? 1 : 0);
  return dirs;
}
