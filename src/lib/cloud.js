// Konti + sync til Supabase. Spillet kører lokalt (hurtigt og uden ventetid); ændringer i
// saldo/statistik skubbes til skyen med kort forsinkelse, så leaderboardet er opdateret.
import { useSyncExternalStore } from 'react';
import { supabase, cloudEnabled, emailFor, validName } from './supabase.js';
import { walletStore } from './walletStore.js';

let cs = { status: cloudEnabled ? 'idle' : 'off', message: '' }; // off | idle | syncing | error
const subs = new Set();
const setStatus = (status, message = '') => { cs = { status, message }; subs.forEach((f) => f()); };
export const useCloud = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cs);

const friendly = (err) => {
  const m = (err && (err.code || err.message) ? `${err.code || ''} ${err.message || ''}` : String(err)).toLowerCase();
  if (m.includes('already') || m.includes('exists') || m.includes('duplicate') || m.includes('database error saving'))
    return 'That name is already taken.';
  if (m.includes('invalid_credentials') || m.includes('invalid login')) return 'Wrong name or password.';
  if (m.includes('weak_password') || m.includes('password should')) return 'Password is too weak (use at least 6 characters).';
  if (m.includes('email_address_invalid') || m.includes('is invalid'))
    return 'Sign-up was rejected (email domain). Set VITE_AUTH_EMAIL_DOMAIN to a real domain.';
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'No connection to the server.';
  return (err && err.message) || 'Something went wrong.';
};

async function loadProfile(userId, force = false) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw error || new Error('Profile not found');
  walletStore.loadCloud(data, { force });
  attach();
}

export async function signUp(name, password, startDollars) {
  if (!cloudEnabled) throw new Error('Online accounts are not configured.');
  if (!validName(name)) throw new Error('Name: 3-16 letters, digits, _ . or -');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: emailFor(name), password,
      options: { data: { username: name.trim(), start: startDollars } },
    });
    if (error) throw error;
    if (!data.session) throw new Error('Account created, but the server wants email confirmation. Turn off "Confirm email" in Supabase (Authentication, Providers, Email).');
    await loadProfile(data.user.id);
  } catch (e) { throw new Error(friendly(e)); }
}

export async function signIn(name, password) {
  if (!cloudEnabled) throw new Error('Online accounts are not configured.');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailFor(name), password });
    if (error) throw error;
    await loadProfile(data.user.id);
  } catch (e) { throw new Error(friendly(e)); }
}

export async function restoreSession() {
  if (!cloudEnabled) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    await loadProfile(data.session.user.id);
    return true;
  } catch { return false; }
}

export async function signOut() {
  await push(true);
  walletStore.logout();
  if (cloudEnabled) { try { await supabase.auth.signOut(); } catch { /* */ } }
  setStatus('idle');
}

// ---- sync ----
let timer = 0, attached = false, retry = 0, pushing = false;
const DEBOUNCE = 1500;

export async function push(now = false) {
  clearTimeout(timer);
  const s = walletStore.getState();
  if (!cloudEnabled || !s || !s.cloud || !s.dirty || pushing) return;
  pushing = true; const rev = s.rev; setStatus('syncing');
  const { error } = await supabase.from('profiles').update({
    balance: s.bal, base: s.base, total_won: s.won, total_lost: s.lost, rounds: s.count, best_win: s.best,
  }).eq('id', s.uid);
  pushing = false;
  if (error) {
    if (/cannot decrease/i.test(error.message || '')) { try { await loadProfile(s.uid, true); setStatus('idle'); return; } catch { /* */ } }
    setStatus('error', error.message || 'sync failed');
    clearTimeout(retry); retry = setTimeout(() => push(), 10000);
  } else {
    walletStore.markSynced(rev); setStatus('idle');
    const n = walletStore.getState(); if (n && n.dirty) timer = setTimeout(() => push(), DEBOUNCE);
  }
}

function attach() {
  if (attached) return;
  attached = true;
  walletStore.subscribe(() => {
    const s = walletStore.getState();
    if (s && s.cloud && s.dirty && !pushing) { clearTimeout(timer); timer = setTimeout(() => push(), DEBOUNCE); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) push(true); });
  addEventListener('pagehide', () => push(true));
  addEventListener('online', () => push());
}

// ---- leaderboard ----
export const SORTS = {
  money: { col: 'balance', label: 'Most money' },
  won: { col: 'total_won', label: 'Most won' },
  lost: { col: 'total_lost', label: 'Most lost' },
};

export async function fetchLeaderboard(sort = 'money') {
  const col = SORTS[sort].col;
  const { data, error } = await supabase.from('profiles')
    .select('username,balance,total_won,total_lost,rounds,best_win')
    .order(col, { ascending: false }).order('username', { ascending: true }).limit(50);
  if (error) throw new Error(friendly(error));
  let myRank = null;
  const s = walletStore.getState();
  if (s && s.cloud) {
    const mine = { balance: s.bal, total_won: s.won, total_lost: s.lost }[col];
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt(col, mine);
    if (typeof count === 'number') myRank = count + 1;
  }
  return { rows: data, myRank };
}
