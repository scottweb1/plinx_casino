// Navngivne lydeffekter bygget ovenpå engine.js.
import { ping, noise, sweep, playJackpotSample, stopJackpotSample, hasJackpotSample } from './engine.js';

const PENT = [0, 2, 4, 7, 9];
export const note = (s) => 523.25 * Math.pow(2, s / 12);
const timers = new Set();
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
export const clearSfxTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

let lastBling = 0;
export const sfx = {
  click: () => ping(900, 0.05, 0.06, 'triangle'),
  // Bling når kuglen rammer en pin. Tonen stiger med rækken; let tilfældig detune.
  bling(n) {
    const now = performance.now();
    if (now - lastBling < 22) return;
    lastBling = now;
    const f = 740 * Math.pow(2, (PENT[n % 5] + (n > 7 ? 12 : 0)) / 12) * (1 + (Math.random() - 0.5) * 0.012);
    ping(f, 0.07, 0.32);
  },
  drop: () => sweep(620, 330, 0.16, 0.07),
  land(k, rows) {
    const t = Math.abs(k - rows / 2) / (rows / 2), f = 440 * Math.pow(2, t * 1.5);
    ping(f, 0.16, 0.6);
    later(() => ping(f * 1.5, 0.1, 0.5), 80);
    if (t >= 0.5) later(() => ping(f * 2, 0.09, 0.5), 160);
    if (t >= 0.85) later(() => ping(f * 3, 0.08, 0.6), 240);
  },
  tick: () => ping(180 + Math.random() * 40, 0.012, 0.04, 'triangle'),
  stop(i) { noise(0.03, 0.12, 2500); ping(260 + i * 60, 0.1, 0.12, 'triangle'); },
  gem(k) { ping(660 * Math.pow(2, (PENT[(k - 1) % 5] + 12 * Math.min(2, Math.floor((k - 1) / 5))) / 12), 0.12, 0.35); },
  boom() { noise(0.45, 0.28, 250); ping(110, 0.12, 0.3, 'triangle'); },
  wheelTick: () => ping(900 + Math.random() * 120, 0.06, 0.04, 'triangle'),
  wheelStop: () => ping(180, 0.1, 0.3, 'triangle'),
  lose: () => ping(200, 0.08, 0.25, 'triangle'),
  // Gevinstlyd skaleret efter multiplikator: kasse-ring, mønter, akkord.
  win(mult = 2) {
    ping(1568, 0.12, 0.12, 'triangle');
    later(() => ping(2093, 0.15, 1, 'sine'), 120);
    const coins = mult >= 10 ? 8 : mult >= 3 ? 5 : 2;
    for (let i = 0; i < coins; i++) later(() => ping(2400 + Math.random() * 1400, 0.045, 0.12, 'triangle'), 160 + i * 70);
    if (mult >= 3) [0, 4, 7].forEach((s, i) => later(() => ping(note(s), 0.1, 0.5, 'triangle'), 200 + i * 90));
  },
  fanfare() {
    [[0, 0], [4, 120], [7, 240], [12, 360]].forEach(([s, t]) => later(() => { ping(note(s), 0.13, 0.9, 'triangle', true); ping(note(s + 12), 0.07, 0.9, 'sine', true); }, t));
    later(() => [0, 4, 7, 12, 16].forEach((s) => ping(note(s), 0.11, 1.6, 'triangle', true)), 620);
  },
  // Jackpot: bruger den indlejrede mp3-jingle; ellers en syntetisk jingle.
  jackpot(tier) {
    if (playJackpotSample()) return;
    noise(0.35, 0.16, 1500, true); ping(150, 0.18, 0.3, 'triangle', true);
    later(() => { noise(0.04, 0.2, 4000, true); ping(1568, 0.14, 0.12, 'triangle', true); }, 260);
    later(() => { ping(2093, 0.16, 1.1, 'sine', true); ping(3136, 0.07, 0.9, 'sine', true); }, 360);
    const arp = tier === 'big' ? [0, 4, 7, 12] : tier === 'mega' ? [0, 4, 7, 12, 16, 19, 24] : [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
    arp.forEach((s, i) => later(() => ping(note(s), 0.1, 0.7, 'sine', true), 600 + i * 110));
    const coins = tier === 'big' ? 10 : tier === 'mega' ? 18 : 30;
    for (let i = 0; i < coins; i++) later(() => ping(2400 + Math.random() * 1400, 0.05, 0.12, 'triangle', true), 500 + Math.random() * 1800);
    if (tier !== 'big') later(() => sfx.fanfare(), 1300);
    if (tier === 'epic') later(() => sfx.fanfare(), 2700);
  },
  stopJackpot() { stopJackpotSample(); clearSfxTimers(); },
  countTick: (p) => { if (!hasJackpotSample()) ping(500 + p * 1000, 0.035, 0.05, 'triangle', true); },
  countDone: () => { if (!hasJackpotSample()) { ping(note(12), 0.12, 0.8, 'sine', true); ping(note(19), 0.1, 0.8, 'sine', true); } },
};
