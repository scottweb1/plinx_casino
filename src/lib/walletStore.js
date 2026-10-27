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
const storeKey = (st) => (st.cloud ? 'cloud:' : '') + keyOf(st.name);
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
  all[storeKey(state)] = state;
  writeJSON(PROFILES_KEY, all);
  if (!state.cloud) writeJSON(LAST_KEY, keyOf(state.name));
}

// mutating=true: tæller revisionen op og markerer cloud-wallets som ikke-synkroniseret
function emit(mutating = true) {
  if (state && mutating && state.cloud) state = { ...state, dirty: true, rev: (state.rev || 0) + 1 };
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
  const net = payout - round.stake; // statistik til leaderboardet
  return {
    ...s, bal: s.bal + payout, rounds: rest, history: [entry, ...s.history].slice(0, HISTORY_MAX),
    won: (s.won || 0) + Math.max(0, net), lost: (s.lost || 0) + Math.max(0, -net), count: (s.count || 0) + 1, best: Math.max(s.best || 0, net),
  };
}

const normalize = (p) => ({ rounds: {}, history: [], won: 0, lost: 0, count: 0, best: 0, ...p });

export const walletStore = {
  getState: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  listProfiles() {
    return Object.values(readProfiles()).filter((p) => !p.cloud).map((p) => ({ name: p.name, bal: p.bal }));
  },
  lastProfileName() {
    const all = readProfiles();
    const k = readJSON(LAST_KEY, null);
    return k && all[k] && !all[k].cloud ? all[k].name : '';
  },

  // Opret ny wallet (erstatter en gemt wallet med samme navn).
  create(name, startDollars) {
    const start = Math.round(startDollars * 100);
    state = normalize({ name: name.trim().replace(/:/g, ''), start, bal: start, base: start, v: 2 });
    emit();
  },
  continueAs(name) {
    const p = readProfiles()[keyOf(name)];
    if (!p || p.cloud) return false;
    state = recover(normalize(p));
    emit();
    return true;
  },
  logout() { state = null; listeners.forEach((f) => f()); },

  // Indlæs en konto fra Supabase. Lokale, endnu ikke synkroniserede ændringer vinder (medmindre force).
  loadCloud(r, { force = false } = {}) {
    const key = 'cloud:' + r.username.trim().toLowerCase();
    const local = readProfiles()[key];
    const mine = local && local.uid === r.id;
    let s;
    if (mine && local.dirty && !force) s = normalize(local);
    else {
      s = normalize({
        ...(mine ? { rounds: local.rounds, history: local.history } : {}),
        name: r.username, start: r.start_amount, bal: r.balance, base: r.base,
        won: r.total_won, lost: r.total_lost, count: r.rounds, best: r.best_win,
        cloud: true, uid: r.id, dirty: false, rev: mine ? local.rev || 0 : 0, v: 2,
      });
    }
    state = recover(s);
    emit(false);
    if (state.dirty || Object.keys(s.rounds).length !== Object.keys(state.rounds).length) emit();
  },
  // Kaldes når en push er lykkedes. Kun hvis intet er ændret siden.
  markSynced(rev) {
    if (state && state.cloud && state.dirty && state.rev === rev) { state = { ...state, dirty: false }; persist(); listeners.forEach((f) => f()); }
  },

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

  // Refill: lægger startbeløbet til saldoen. Baseline (base) røres ikke, så det tæller som profit i +/-.
  topUp() {
    if (!state) return;
    state = { ...state, bal: state.bal + state.start };
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
    const p = readProfiles()[storeKey(state)];
    if (p) { state = normalize(p); listeners.forEach((f) => f()); }
  });
}
