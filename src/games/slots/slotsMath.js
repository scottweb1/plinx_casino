import { randInt } from '../../lib/rng.js';

export const SLOT = {
  lines: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]],
  syms: [
    { e: '\ud83c\udf52', w: 26, p: [12, 31, 74] }, { e: '\ud83d\udd14', w: 20, p: [19, 50, 124] },
    { e: '\ud83e\ude99', w: 16, p: [25, 62, 186] }, { e: '\ud83d\udcb0', w: 12, p: [37, 93, 310] },
    { e: '\u2b50', w: 10, p: [50, 155, 496] }, { e: '\ud83d\udc51', w: 8, p: [74, 248, 930] },
    { e: '\ud83d\udc8e', w: 5, p: [155, 620, 3100] }, { e: '7\ufe0f\u20e3', w: 3, p: [248, 1240, 6200] },
  ],
};
const SW = SLOT.syms.reduce((a, s) => a + s.w, 0);
export const pickSym = () => { let r = randInt(SW); for (let i = 0; i < SLOT.syms.length; i++) { r -= SLOT.syms[i].w; if (r < 0) return i; } return 0; };
export const spinGrid = () => Array.from({ length: 5 }, () => [pickSym(), pickSym(), pickSym()]);

// bet i cent. Returnerer udbetaling i cent + de felter der vinder.
export function evalGrid(grid, bet) {
  const lb = bet / SLOT.lines.length, hit = new Set();
  let total = 0;
  SLOT.lines.forEach((L) => {
    const s = grid[0][L[0]];
    let n = 1;
    while (n < 5 && grid[n][L[n]] === s) n++;
    if (n >= 3) { total += lb * SLOT.syms[s].p[n - 3]; for (let i = 0; i < n; i++) hit.add(i + ':' + L[i]); }
  });
  return { pay: Math.round(total), hit };
}

// Teoretisk RTP: pr. linje er indsatsen 1/5, og 5 linjer giver samlet sum_s sum_n P(s,n) * udbetaling.
export function slotRtp() {
  let rtp = 0;
  SLOT.syms.forEach((s) => {
    const q = s.w / SW;
    for (let n = 3; n <= 5; n++) rtp += (n < 5 ? q ** n * (1 - q) : q ** 5) * s.p[n - 3];
  });
  return rtp;
}
