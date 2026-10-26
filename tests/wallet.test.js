import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { walletStore: W } = await import('../src/lib/walletStore.js');

test('indsats trækkes og kan kun afregnes én gang', () => {
  W.create('Anna', 500);
  const id = W.placeBet('plinko', 1000, { escrow: 2500 });
  assert.equal(W.getState().bal, 49000);
  assert.equal(W.settle(id, 2500), true);
  assert.equal(W.settle(id, 2500), false); // dobbeltbetaling afvist
  assert.equal(W.getState().bal, 51500);
  assert.equal(W.getState().history.length, 1);
});

test('for stor indsats og ugyldige beløb afvises', () => {
  W.create('Bo', 500);
  assert.equal(W.placeBet('limbo', 50001), null);
  assert.equal(W.placeBet('limbo', 0), null);
  assert.equal(W.placeBet('limbo', 10.5), null);
  assert.equal(W.getState().bal, 50000);
});

test('saldo og historik gemmes og kan genindlæses', () => {
  W.create('Cleo', 1000);
  const id = W.placeBet('wheel', 2000, { escrow: 4000 });
  W.settle(id, 4000);
  W.logout();
  assert.ok(W.continueAs('cleo'));
  assert.equal(W.getState().bal, 100000 - 2000 + 4000);
  assert.equal(W.getState().history.length, 1);
});

test('afbrudt runde med kendt udbetaling udbetales ved genindlæsning', () => {
  W.create('Dan', 500);
  W.placeBet('plinko', 1000, { escrow: 3000 }); // lukker siden midt i runden
  W.logout();
  W.continueAs('Dan');
  assert.equal(W.getState().bal, 50000 - 1000 + 3000);
  assert.equal(Object.keys(W.getState().rounds).length, 0);
});

test('Mines-runde bevares til genoptagelse', () => {
  W.create('Eva', 500);
  const id = W.placeBet('mines', 1000, { data: { mines: [1, 2], open: [], M: 2, bet: 1000 } });
  W.logout();
  W.continueAs('Eva');
  assert.equal(W.findRound('mines').id, id);
  assert.equal(W.getState().bal, 49000);
});

test('refill ændrer ikke P/L', () => {
  W.create('Finn', 500);
  const before = W.getState().bal - W.getState().base;
  W.topUp();
  assert.equal(W.getState().bal - W.getState().base, before);
  assert.equal(W.getState().bal, 100000);
});
