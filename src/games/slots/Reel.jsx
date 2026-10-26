import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { SLOT, pickSym } from './slotsMath.js';

// En rigtig "ruller": en lodret strimmel af symboler der scroller nedad.
// Position p måles i symbolhøjder. Symbol n ligger ved z = p - n (0 = øverste synlige række).
const V = 21;      // topfart i symboler pr. sekund
const RAMP = 260;  // ms til fuld fart
const C1 = 0.9;    // størrelse på "hoppet" ved landing
const easeOutBack = (u) => { const x = u - 1; return 1 + (C1 + 1) * x * x * x + C1 * x * x; };
const EM = (s) => SLOT.syms[s].e;

const Reel = forwardRef(function Reel({ initial, hit, index }, ref) {
  const strip = useRef(null), cells = useRef([]);
  const S = useRef({ p: 100, v: 0, state: 'idle', t0: 0, last: 0, fl: null, seq: new Map(), raf: 0, speed: 1, plan: null, onDone: null, tickCb: null });

  const sym = (n) => { const m = S.current.seq; if (!m.has(n)) m.set(n, pickSym()); return m.get(n); };
  const render = () => {
    const s = S.current, fl = Math.floor(s.p), f = s.p - fl;
    if (fl !== s.fl) {
      if (s.fl !== null && s.tickCb) s.tickCb();
      s.fl = fl;
      for (let r = 0; r < 5; r++) cells.current[r].textContent = EM(sym(fl + 1 - r));
    }
    const step = cells.current[1].offsetTop;
    strip.current.style.transform = `translate3d(0,${(f - 1) * step}px,0)`;
    const blur = s.state === 'idle' ? 0 : Math.min(3.2, s.v * 0.13);
    strip.current.style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : 'none';
  };
  const frame = (now) => {
    const s = S.current, dt = Math.max(0, Math.min(0.05, (now - s.last) / 1000));
    s.last = now;
    if (s.state === 'spin') {
      const k = Math.min(1, Math.max(0, (now - s.t0) / RAMP));
      s.v = V * s.speed * k * k; s.p += s.v * dt;
    } else if (s.state === 'stop') {
      const u = Math.min(1, (now - s.plan.t0) / s.plan.D);
      s.p = s.plan.p0 + (s.plan.P - s.plan.p0) * easeOutBack(u);
      s.v = s.plan.v0 * (1 - u);
      if (u >= 1) {
        s.p = s.plan.P; s.state = 'idle'; s.v = 0;
        const keep = [s.plan.P, s.plan.P - 1, s.plan.P - 2].map((n) => [n, s.seq.get(n)]);
        s.seq.clear(); keep.forEach(([n, v]) => s.seq.set(n, v));
        s.fl = null; render(); s.raf = 0;
        const cb = s.onDone; s.onDone = null; cb && cb();
        return;
      }
    }
    render();
    s.raf = requestAnimationFrame(frame);
  };
  const kick = () => { const s = S.current; if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(frame); } };

  useImperativeHandle(ref, () => ({
    start(delay = 0, onTick, speed = 1) {
      const s = S.current;
      s.speed = speed; s.state = 'spin'; s.t0 = performance.now() + delay; s.v = 0; s.tickCb = onTick || null;
      kick();
    },
    // col = de tre slutsymboler (top→bund). factor<1 = hurtigere (turbo / hurtigstop).
    stop(col, factor = 1, onDone) {
      const s = S.current;
      if (s.state !== 'spin') { onDone && onDone(); return; }
      const v = Math.max(s.v, V * 0.5 * s.speed);
      const dist = Math.max(3.6, (v * 0.62 * factor) / (C1 + 3));
      const P = Math.ceil(s.p + dist);
      s.seq.set(P, col[0]); s.seq.set(P - 1, col[1]); s.seq.set(P - 2, col[2]);
      const D = Math.min(900 * Math.max(factor, 0.45), Math.max(260, (((P - s.p) * (C1 + 3)) / v) * 1000));
      s.plan = { p0: s.p, P, D, t0: performance.now(), v0: v };
      s.state = 'stop'; s.onDone = onDone; s.tickCb = null;
    },
    isActive: () => S.current.state !== 'idle',
  }));

  // startgitter
  useLayoutEffect(() => {
    const s = S.current;
    s.seq.set(s.p, initial[0]); s.seq.set(s.p - 1, initial[1]); s.seq.set(s.p - 2, initial[2]);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const ro = new ResizeObserver(() => render());
    ro.observe(strip.current.parentNode);
    return () => { ro.disconnect(); cancelAnimationFrame(S.current.raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reel">
      <div className="strip" ref={strip}>
        {[0, 1, 2, 3, 4].map((r) => (
          <div key={r} ref={(el) => (cells.current[r] = el)} className={'cell' + (r >= 1 && r <= 3 && hit.has(index + ':' + (r - 1)) ? ' hit' : '')} />
        ))}
      </div>
    </div>
  );
});
export default Reel;
