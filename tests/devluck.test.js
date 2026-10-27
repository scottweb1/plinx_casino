import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDevLuck } from '../src/dev/devLuck.js';
import { PAYTABLE, randomDirs } from '../src/games/plinko/plinkoMath.js';

const rate = (name, rows, risk, N, pred) => {
  let n = 0;
  for (let i = 0; i < N; i++) {
    const d = applyDevLuck(name, rows, risk, randomDirs(rows));
    assert.equal(d.length, rows);
    if (pred(d.reduce((a, b) => a + b, 0), rows)) n++;
  }
  return n / N;
};

test('Scott får langt oftere vindende hinke end andre spillere', () => {
  const win = (k, rows) => PAYTABLE[rows][ 'Medium' ][k] > 1;
  const normal = rate('Anna', 16, 'Medium', 20000, win), scott = rate('Scott', 16, 'Medium', 20000, win);
  console.log(`  vinderate 16/Medium: normal ${(normal * 100).toFixed(1)}%, Scott ${(scott * 100).toFixed(1)}%`);
  assert.ok(scott > normal * 2);
});

test('ScottW rammer kanten ca. 12,5 % oftere; andre navne er upåvirkede', () => {
  const edge = (k, rows) => k === 0 || k === rows;
  const normal = rate('Anna', 16, 'High', 40000, edge), w = rate('ScottW', 16, 'High', 40000, edge);
  console.log(`  kant-rate 16/High: normal ${(normal * 100).toFixed(2)}%, ScottW ${(w * 100).toFixed(2)}%`);
  assert.ok(normal < 0.005);
  assert.ok(w > 0.11 && w < 0.14);
});
