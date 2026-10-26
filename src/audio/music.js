// Valgfri baggrundsmusik: læg en fil ved navn "1.mp3" i public/-mappen.
// Findes filen ikke, skjules musikknappen automatisk.
import { settingsStore } from '../lib/settingsStore.js';
import { initAudio, getCtx, getMusicBus } from './engine.js';

const URL_ = `${import.meta.env.BASE_URL || './'}1.mp3`;
let available = null, el = null, wired = false;
const subs = new Set();
const notify = () => subs.forEach((f) => f());

export const musicStore = {
  getState: () => available === true,
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};

export async function detectMusic() {
  if (available !== null) return available;
  try {
    const r = await fetch(URL_, { method: 'HEAD' });
    available = r.ok && /audio|mpeg|octet-stream/i.test(r.headers.get('content-type') || '');
  } catch { available = false; }
  notify();
  return available;
}

export function syncMusic() {
  if (!available) return;
  const s = settingsStore.getState();
  if (s.music && s.sound) {
    initAudio();
    if (!el) { el = new Audio(URL_); el.loop = true; }
    const ctx = getCtx();
    if (ctx && !wired) {
      try { ctx.createMediaElementSource(el).connect(getMusicBus()); wired = true; } catch { /* */ }
    }
    el.play().catch(() => {});
  } else if (el) el.pause();
}
settingsStore.subscribe(syncMusic);
