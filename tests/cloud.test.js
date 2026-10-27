import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { walletStore: W } = await import('../src/lib/walletStore.js');

const remote = { id: 'u1', username: 'Søren', balance: 80000, base: 50000, start_amount: 50000, total_won: 70000, total_lost: 40000, rounds: 12, best_win: 30000 };

test('cloud-wallet indlæses fra skyen og tællere følger med', () => {
  W.loadCloud(remote);
  const s = W.getState();
  assert.equal(s.cloud, true); assert.equal(s.bal, 80000); assert.equal(s.count, 12); assert.equal(s.dirty, false);
});

test('spil gør wallet "dirty" og tæller vundet/tabt/bedste', () => {
  const a = W.placeBet('limbo', 1000); W.settle(a, 3000);      // netto +2000
  const b = W.placeBet('limbo', 5000); W.settle(b, 0);         // netto -5000
  const s = W.getState();
  assert.equal(s.won, 72000); assert.equal(s.lost, 45000); assert.equal(s.count, 14); assert.equal(s.best, 30000);
  assert.equal(s.dirty, true);
});

test('markSynced rydder kun hvis intet er ændret siden', () => {
  const rev = W.getState().rev;
  const c = W.placeBet('limbo', 100);       // ændring EFTER at push startede
  W.markSynced(rev);
  assert.equal(W.getState().dirty, true);
  W.settle(c, 0);
  W.markSynced(W.getState().rev);
  assert.equal(W.getState().dirty, false);
});

test('ikke-synkroniserede lokale ændringer overskrives ikke ved login', () => {
  const x = W.placeBet('limbo', 1000); W.settle(x, 2000); // dirty igen
  const localBal = W.getState().bal;
  W.logout();
  W.loadCloud({ ...remote, balance: 1 });   // skyen er bagud
  assert.equal(W.getState().bal, localBal);
  W.markSynced(W.getState().rev);
  W.logout();
  W.loadCloud({ ...remote, balance: 777 }); // alt synkroniseret -> skyen vinder
  assert.equal(W.getState().bal, 777);
});

test('offline-profiler og cloud-profiler blandes ikke', () => {
  W.logout();
  W.create('Søren', 500);
  assert.equal(W.getState().cloud, undefined);
  assert.deepEqual(W.listProfiles().map((p) => p.name), ['Søren']);
  W.logout();
  assert.ok(W.continueAs('søren'));
  assert.notEqual(W.getState().cloud, true);
});
