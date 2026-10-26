// Lille eventbus så spil kan udløse guldmønter/-partikler uden at kende canvas'et.
const subs = new Set();
export const fx = {
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  emit(e) { subs.forEach((f) => f(e)); },
  // x,y er 0..1 af skærmen. power: 1 (lille) .. 3 (stor)
  coinBurst(power = 1, x = 0.5, y = 0.45) { fx.emit({ type: 'coins', power, x, y }); },
  pop(text, x = 0.5, y = 0.4, power = 1) { fx.emit({ type: 'text', text, x, y, power }); },
};
