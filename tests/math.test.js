import test from 'node:test';
import assert from 'node:assert/strict';
import { PAYTABLE, ROWS, RISKS, rtp } from '../src/games/plinko/plinkoMath.js';
import { slotRtp, evalGrid, SLOT } from '../src/games/slots/slotsMath.js';
import { toCents, mulCents, fmt } from '../src/lib/money.js';
import { randInt } from '../src/lib/rng.js';

test('penge regnes i hele cent uden flydende-komma-fejl', () => {
  assert.equal(toCents('0.1') + toCents('0.2'), 30);
  assert.equal(toCents('1,000.50'), 100050);
  assert.equal(mulCents(1000, 0.3), 300);
  assert.equal(mulCents(1, 0.2), 0);
  assert.equal(fmt(123456), '1,234.56');
});

test('plinko-tabeller er symmetriske med rimelig RTP', () => {
  for (const r of ROWS) for (const k of RISKS) {
    const t = PAYTABLE[r][k];
    assert.equal(t.length, r + 1);
    t.forEach((v, i) => assert.equal(v, t[r - i]));
    const x = rtp(r, k);
    console.log(`  RTP plinko ${r} rows ${k}: ${(x * 100).toFixed(2)}%`);
    assert.ok(x > 0.85 && x < 1.0, `${r}/${k}: ${x}`);
  }
});

test('slots: udbetaling og RTP', () => {
  const x = slotRtp();
  console.log(`  RTP slots (teoretisk): ${(x * 100).toFixed(2)}%`);
  assert.ok(x > 0.5 && x < 1.1);
  // Alle 3 rækker er 5 ens: kirsebær (midten), klokker (top), mønter (bund) -> 3 vindende linjer
  const grid = Array.from({ length: 5 }, () => [1, 0, 2]);
  const r = evalGrid(grid, 1000);
  assert.equal(r.pay, Math.round((1000 / 5) * (SLOT.syms[0].p[2] + SLOT.syms[1].p[2] + SLOT.syms[2].p[2])));
  assert.equal(r.hit.size, 15);
  assert.equal(evalGrid(Array.from({ length: 5 }, (_, i) => [i, (i + 3) % 8, (i + 5) % 8]), 1000).pay, 0);
});

test('randInt er i intervallet og rimeligt jævn', () => {
  const c = [0, 0, 0];
  for (let i = 0; i < 30000; i++) c[randInt(3)]++;
  c.forEach((n) => assert.ok(n > 9000 && n < 11000));
});
