import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDES, sideFromRoll, rollSide, coinRtp } from '../src/games/coinflip/coinflipMath.js';

test('coinflip: 40 % heads, 40 % tails, 20 % edge', () => {
  const c = { heads: 0, tails: 0, edge: 0 };
  for (let n = 0; n < 10; n++) c[sideFromRoll(n)]++;
  assert.deepEqual(c, { heads: 4, tails: 4, edge: 2 });
  assert.equal(SIDES.heads.chance + SIDES.tails.chance + SIDES.edge.chance, 1);
  const N = 100000, cnt = { heads: 0, tails: 0, edge: 0 };
  for (let i = 0; i < N; i++) cnt[rollSide()]++;
  assert.ok(Math.abs(cnt.heads / N - 0.4) < 0.01 && Math.abs(cnt.tails / N - 0.4) < 0.01 && Math.abs(cnt.edge / N - 0.2) < 0.01);
});

test('coinflip: 2x på heads/tails, større multiplikator på edge, ens RTP', () => {
  assert.equal(SIDES.heads.mult, 2);
  assert.equal(SIDES.tails.mult, 2);
  assert.ok(SIDES.edge.mult > 2);
  console.log(`  RTP coinflip: ${(coinRtp('heads') * 100).toFixed(0)}% / ${(coinRtp('tails') * 100).toFixed(0)}% / ${(coinRtp('edge') * 100).toFixed(0)}%`);
  assert.ok(Math.abs(coinRtp('heads') - coinRtp('edge')) < 1e-9);
});
