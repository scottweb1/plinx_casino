import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.__env = {};
// supabase.js bruger import.meta.env (Vite). Her testes kun de rene hjælpefunktioner uden klient.
const { NAME_RE, validName, emailFor } = await import('../src/lib/nameRules.js');

test('brugernavne: 3-16 tegn, bogstaver/tal/_.-, ingen mellemrum', () => {
  for (const ok of ['Scott', 'ScottW', 'Søren', 'æøå_1', 'a.b-c']) assert.ok(NAME_RE.test(ok), ok);
  for (const bad of ['ab', 'a b c', 'x'.repeat(17), 'a@b', 'ok:no', '']) assert.ok(!validName(bad), bad);
  for (const bad of ['ab', 'a b c', 'x'.repeat(17), 'a@b', 'ok:no', '']) assert.ok(!NAME_RE.test(bad), bad);
});

test('falsk mail: kun ASCII, unik pr. navn (uanset store/små bogstaver), maks 64 tegn før @', () => {
  assert.equal(emailFor('Scott'), 'plinko.scott@gmail.com');
  assert.equal(emailFor('SCOTT'), emailFor('scott'));
  const e = emailFor('Søren');
  assert.match(e, /^[\x00-\x7f]+$/);
  assert.notEqual(e, emailFor('Soren'));
  for (const n of ["ÆØÅÆØÅÆØÅÆØÅÆØÅÆØÅÆ".slice(0, 16), 'x'.repeat(16)]) { assert.ok(validName(n), n); assert.ok(emailFor(n).split('@')[0].length <= 64); }
  assert.ok(!validName('😀😀😀😀😀'), 'emoji er ikke bogstaver');
  assert.notEqual(emailFor('æøå'), emailFor('æøe'));
});
