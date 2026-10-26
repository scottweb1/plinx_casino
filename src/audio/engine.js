// WebAudio-motor: master-volumen, mute, kompressor, ducking under jackpot.
import jackpotUrl from '../assets/jackpot.mp3';
import { settingsStore } from '../lib/settingsStore.js';

let ctx = null, master = null, sfxBus = null, jpBus = null, musicBus = null;
let jpBuf = null, jpLoading = false, jpSrc = null, jpGain = null, voices = 0;

export const getCtx = () => ctx;
export const getMusicBus = () => musicBus;

export function initAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      sfxBus = ctx.createGain();
      jpBus = ctx.createGain();
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.45;
      sfxBus.connect(master); jpBus.connect(master); musicBus.connect(master);
      master.connect(comp); comp.connect(ctx.destination);
      applySettings();
      loadJackpot();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* lyd er valgfri */ }
}

export function applySettings() {
  if (!ctx) return;
  const s = settingsStore.getState();
  master.gain.setTargetAtTime(s.sound ? Math.pow(s.volume, 1.6) : 0, ctx.currentTime, 0.02);
}
settingsStore.subscribe(applySettings);

const on = () => {
  const s = settingsStore.getState();
  return !!ctx && s.sound && s.volume > 0;
};

// Sænker almindelige effekter mens jackpot-overlayet vises.
export function duck(active) {
  if (ctx) sfxBus.gain.setTargetAtTime(active ? 0.25 : 1, ctx.currentTime, 0.05);
}

export function ping(f, vol, dur, type = 'sine', raw = false) {
  if (!on() || voices > 48) return;
  const t = ctx.currentTime, g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(raw ? jpBus : sfxBus);
  [[f, type, 1], [f * 2.76, 'sine', 0.35]].forEach(([fr, ty, k]) => {
    const o = ctx.createOscillator(), gg = ctx.createGain();
    o.type = ty; o.frequency.value = fr; gg.gain.value = k;
    o.connect(gg); gg.connect(g);
    voices++;
    o.onended = () => { voices--; };
    o.start(t); o.stop(t + dur + 0.02);
  });
}

export function noise(dur, vol, hp, raw = false) {
  if (!on()) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(raw ? jpBus : sfxBus); s.start();
}

export function sweep(f0, f1, vol, dur) {
  if (!on()) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}

function loadJackpot() {
  if (!ctx || jpBuf || jpLoading) return;
  jpLoading = true;
  fetch(jackpotUrl)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((b) => { jpBuf = b; })
    .catch(() => { jpLoading = false; });
}
export const hasJackpotSample = () => !!jpBuf;

export function playJackpotSample() {
  if (!jpBuf || !on()) return false;
  stopJackpotSample();
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = jpBuf; g.gain.value = 0.3; src.connect(g); g.connect(jpBus); src.start();
  jpSrc = src; jpGain = g;
  return true;
}
export function stopJackpotSample() {
  try {
    if (jpSrc) {
      const g = jpGain.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.4);
      jpSrc.stop(t + 0.45);
    }
  } catch { /* */ }
  jpSrc = null;
}
