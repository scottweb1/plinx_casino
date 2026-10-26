// Kryptografisk tilfældighed uden modulo-bias (falder tilbage til Math.random).
const hasCrypto = typeof crypto !== 'undefined' && crypto.getRandomValues;
const u32 = () => (hasCrypto ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 4294967296));

export const randInt = (n) => {
  const max = Math.floor(4294967296 / n) * n;
  let x;
  do x = u32(); while (x >= max);
  return x % n;
};
export const randFloat = () => u32() / 4294967296;
export const randRange = (a, b) => a + randFloat() * (b - a);
export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
