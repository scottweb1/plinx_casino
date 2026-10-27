// Lokal erstatning for @supabase/supabase-js, KUN til browsertest uden netværk.
// Data ligger i localStorage under "fakesb", så den overlever genindlæsning.
const KEY = 'fakesb';
const load = () => JSON.parse(localStorage.getItem(KEY) || '{"users":[],"profiles":[],"session":null}');
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
const wait = () => new Promise((r) => setTimeout(r, 40));
const E = (message, code) => ({ message, code, status: 400 });

export function createClient() {
  const auth = {
    async signUp({ email, password, options }) {
      await wait(); const d = load();
      if (d.users.find((u) => u.email === email)) return { data: { user: null, session: null }, error: E('User already registered', 'user_already_exists') };
      if (password.length < 6) return { data: {}, error: E('Password should be at least 6 characters.', 'weak_password') };
      const uname = String(options?.data?.username || '').trim().slice(0, 16);
      if (uname.length < 3 || d.profiles.find((p) => p.username.toLowerCase() === uname.toLowerCase())) return { data: {}, error: E('Database error saving new user', 'unexpected_failure') };
      let st = Number(options?.data?.start); if (![500, 1000, 10000, 50000].includes(st)) st = 1000;
      const id = 'u' + Math.random().toString(36).slice(2, 10);
      d.users.push({ id, email, password });
      d.profiles.push({ id, username: uname, balance: st * 100, base: st * 100, start_amount: st * 100, total_won: 0, total_lost: 0, rounds: 0, best_win: 0 });
      d.session = { user: { id } }; save(d);
      return { data: { user: { id }, session: d.session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      await wait(); const d = load(); const u = d.users.find((x) => x.email === email && x.password === password);
      if (!u) return { data: {}, error: E('Invalid login credentials', 'invalid_credentials') };
      d.session = { user: { id: u.id } }; save(d); return { data: { user: { id: u.id }, session: d.session }, error: null };
    },
    async getSession() { await wait(); return { data: { session: load().session } }; },
    async signOut() { const d = load(); d.session = null; save(d); return { error: null }; },
  };

  const from = (table) => {
    const q = { f: [], o: [], lim: null, mode: 'select', patch: null, head: false, count: false, single: false };
    const api = {
      select(cols, opts) { q.head = !!opts?.head; q.count = !!opts?.count; return api; },
      update(p) { q.mode = 'update'; q.patch = p; return api; },
      eq(c, v) { q.f.push((r) => r[c] === v); return api; },
      gt(c, v) { q.f.push((r) => r[c] > v); return api; },
      order(c, o) { q.o.push([c, o?.ascending !== false]); return api; },
      limit(n) { q.lim = n; return api; },
      single() { q.single = true; return api; },
      then(res, rej) { return run().then(res, rej); },
    };
    async function run() {
      await wait(); const d = load();
      if (!d.session) return { data: null, error: E('permission denied', '42501') };
      let rows = d.profiles.filter((r) => q.f.every((fn) => fn(r)));
      if (q.mode === 'update') {
        for (const r of rows) {
          if (r.id !== d.session.user.id) continue;
          for (const k of ['rounds', 'total_won', 'total_lost', 'best_win']) if (k in q.patch && q.patch[k] < r[k]) return { data: null, error: E('counters cannot decrease') };
          for (const k of Object.keys(q.patch)) if (!['balance', 'base', 'total_won', 'total_lost', 'rounds', 'best_win'].includes(k)) return { data: null, error: E('permission denied for column ' + k) };
          Object.assign(r, q.patch);
        }
        save(d); return { data: null, error: null };
      }
      q.o.slice().reverse().forEach(([c, asc]) => rows.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)));
      // sorter stabilt på første ordre sidst => anvend i omvendt rækkefølge (ovenfor)
      const count = rows.length;
      if (q.head) return { data: null, count, error: null };
      if (q.lim) rows = rows.slice(0, q.lim);
      if (q.single) return rows[0] ? { data: rows[0], error: null } : { data: null, error: E('Row not found', 'PGRST116') };
      return { data: rows, count, error: null };
    }
    return api;
  };
  return { auth, from };
}
