import { readJSON, writeJSON } from './storage.js';

const KEY = 'plinko-casino:settings';
const DEFAULTS = { sound: true, volume: 0.7, music: false, turbo: false };

let state = { ...DEFAULTS, ...(readJSON(KEY, {}) || {}) };
const listeners = new Set();

export const settingsStore = {
  getState: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  set(patch) {
    state = { ...state, ...patch };
    writeJSON(KEY, state);
    listeners.forEach((f) => f());
  },
};
