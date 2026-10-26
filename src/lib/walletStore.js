// Fælles wallet for alle spil. Saldo og beløb er hele cent (virtuelle legepenge).
//
// Regnskabsregler (forhindrer dobbeltbetaling):
//  - placeBet() trækker indsatsen og opretter en åben runde med et unikt id.
//  - settle(id, udbetaling) kan kun lykkes ÉN gang pr. id; et andet kald er et no-op.
//  - Runder hvis udbetaling er kendt på forhånd (escrow) udbetales automatisk
//    hvis siden lukkes midt i en runde. Mines-runder gemmes og genoptages.
import { HISTORY_MAX } from './config.js';
import { readJSON, writeJSON } from './storage.js';

const PROFILES_KEY = 'plinko-casino:profiles';
const LAST_KEY = 'plinko-casino:last';
const OLD_KEY = 'plinko-wallet'; // gammel enkelt-fil version (dollars som kommatal)

let state = null;
const listeners = new Set();
const keyOf = (name) => name.trim().toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function readProfiles() {
  const p = readJSON(PROFILES_KEY, null);
  if (p && typeof p === 'object') return p;
  const old = readJSON(OLD_KEY, null); // migrering fra index.html-versionen
  if (old && old.name) {
    const c = (v) => Math.max(0, Math.round((Number(v) || 0) * 100));
    const prof = { name: old.name, start: c(old.start), bal: c(old.bal), base: c(old.base ?? old.start), rounds: {}, history: [], v: 2 };
    const all = { [keyOf(old.name)]: prof };
    writeJSON(PROFILES_KEY, all);
    return all;
  }
  return {};
}

function persist() {
  if (!state) return;
  const all = readProfiles();
  all[keyOf(state.name)] = state;
  writeJSON(PROFILES_KEY, all);
  writeJSON(LAST_KEY, keyOf(state.name));
}

function emit() {
  persist();
  listeners.forEach((f) => f());
}

// Ved indlæsning: udbetal runder med kendt udbetaling, fortabt resten (undtagen Mines).
function recover(s) {
  let next = s;
  for (const r of Object.values(s.rounds || {})) {
    if (r.escrow != null) next = apply(next, r, r.escrow, 'recovered');
    else if (r.game === 'mines' && r.data) continue;
    else next = apply(next, r, 0, 'interrupted');
  }
  return next;
}

function apply(s, round, payout, note) {
  const { [round.id]: _gone, ...rest } = s.rounds;
  const entry = { id: round.id, game: round.game, stake: round.stake, payout, mult: round.stake ? payout / round.stake : 0, t: Date.now(), note };
  return { ...s, bal: s.bal + payout, rounds: rest, history: [entry, ...s.history].slice(0, HISTORY_MAX) };
}

const normalize = (p) => ({ rounds: {}, history: [], ...p });

export const walletStore = {
  getState: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  listProfiles() {
    return Object.values(readProfiles()).map((p) => ({ name: p.name, bal: p.bal }));
  },
  lastProfileName() {
    const all = readProfiles();
    const k = readJSON(LAST_KEY, null);
    return k && all[k] ? all[k].name : '';
  },

  // Opret ny wallet (erstatter en gemt wallet med samme navn).
  create(name, startDollars) {
    const start = Math.round(startDollars * 100);
    state = { name: name.trim(), start, bal: start, base: start, rounds: {}, history: [], v: 2 };
    emit();
  },
  continueAs(name) {
    const p = readProfiles()[keyOf(name)];
    if (!p) return false;
    state = recover(normalize(p));
    emit();
    return true;
  },
  logout() { state = null; listeners.forEach((f) => f()); },

  // Trækker indsatsen. Returnerer runde-id, eller null hvis ugyldig/for lidt saldo.
  placeBet(game, stake, opts = {}) {
    if (!state || !Number.isInteger(stake) || stake <= 0 || stake > state.bal) return null;
    const id = uid();
    const round = { id, game, stake, escrow: opts.escrow ?? null, data: opts.data ?? null, t: Date.now() };
    state = { ...state, bal: state.bal - stake, rounds: { ...state.rounds, [id]: round } };
    emit();
    return id;
  },
  // Udbetaler runden. Returnerer false hvis runden allerede er afregnet (ingen dobbeltbetaling).
  settle(id, payout, meta = {}) {
    const round = state && state.rounds[id];
    if (!round) return false;
    const p = Math.max(0, Math.round(payout));
    state = apply(state, round, p, meta.note);
    emit();
    return true;
  },
  updateRound(id, data) {
    if (!state || !state.rounds[id]) return;
    state = { ...state, rounds: { ...state.rounds, [id]: { ...state.rounds[id], data } } };
    emit();
  },
  findRound(game) {
    return state ? Object.values(state.rounds).find((r) => r.game === game) || null : null;
  },
  // Udbetal alle åbne runder med kendt udbetaling for et spil (bruges når et spil lukkes).
  flushEscrow(game) {
    if (!state) return;
    for (const r of Object.values(state.rounds)) if (r.game === game && r.escrow != null) this.settle(r.id, r.escrow, { note: 'auto-settled' });
  },
  openRounds: () => (state ? Object.keys(state.rounds).length : 0),

  topUp() {
    if (!state) return;
    state = { ...state, bal: state.bal + state.start, base: state.base + state.start };
    emit();
  },
  clearHistory() {
    if (!state) return;
    state = { ...state, history: [] };
    emit();
  },
};

// Synkroniser mellem faner, så den samme wallet ikke overskrives af en gammel fane.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => {
    if (e.key !== PROFILES_KEY || !state) return;
    const p = readProfiles()[keyOf(state.name)];
    if (p) { state = normalize(p); listeners.forEach((f) => f()); }
  });
}
