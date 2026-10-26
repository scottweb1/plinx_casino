import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { SPACING as S, SEG_MS as SEG, PAYTABLE, col, label, geometry } from './plinkoMath.js';
import { randRange } from '../../lib/rng.js';

// Canvas-bræt. Selve udfaldet er afgjort i Plinko.jsx; her animeres kun kuglen.
// Props: rows, risk, onPin(rowIndex), onLand(ball)
const PlinkoBoard = forwardRef(function PlinkoBoard({ rows, risk, onPin, onLand }, ref) {
  const wrap = useRef(null), canvas = useRef(null);
  const cb = useRef({});
  cb.current = { rows, risk, onPin, onLand };
  const sim = useRef({ balls: [], hits: new Map(), parts: [], bucket: { i: -1, t: -1e9 }, raf: 0, cssW: 0, dpr: 1 });
  const reduce = useRef(!!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)).current;

  const burst = (x, y, n, kind, power = 1) => {
    const P = sim.current.parts;
    for (let i = 0; i < n; i++) {
      if (kind === 'spark') P.push({ k: 's', x, y, vx: randRange(-70, 70), vy: randRange(-90, 10), life: 0, max: randRange(0.25, 0.5), r: randRange(1.2, 2.6) });
      else P.push({ k: 'c', x: x + randRange(-14, 14), y, vx: randRange(-150, 150) * power, vy: randRange(-330, -120) * (0.7 + power * 0.3), life: 0, max: randRange(0.9, 1.4), r: randRange(5, 8), s: randRange(0, 6), vs: randRange(9, 16) });
    }
  };

  const draw = (now) => {
    const s = sim.current, c = canvas.current;
    if (!c || !s.cssW) return;
    const { rows, risk } = cb.current, g = geometry(rows), x = c.getContext('2d');
    const k = (s.cssW / g.W) * s.dpr;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, g.W, g.H);

    // pins + glød ved træf
    for (let r = 1; r <= rows; r++) for (let j = 0; j < r + 2; j++) {
      const px = g.cx + (j - (r + 1) / 2) * S, py = g.rowY(r), age = now - (s.hits.get(`${r}-${j}`) ?? -1e9);
      if (age < 380) {
        const f = 1 - age / 380, gr = x.createRadialGradient(px, py, 0, px, py, 8 + 14 * f);
        gr.addColorStop(0, `rgba(255,226,130,${0.75 * f})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(px, py, 8 + 14 * f, 0, 7); x.fill();
      }
      x.fillStyle = age < 380 ? '#fff6c8' : '#fff'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
    }

    // hinke
    const mult = PAYTABLE[rows][risk], bAge = now - s.bucket.t;
    mult.forEach((m, i) => {
      const dy = s.bucket.i === i && bAge < 260 ? 7 * Math.sin((Math.PI * bAge) / 260) : 0;
      const bx = g.cx + (i - rows / 2) * S - (S - 6) / 2, by = g.rowY(rows) + S - 12 + dy;
      x.fillStyle = col(i, rows);
      x.beginPath(); x.roundRect(bx, by, S - 6, 28, 5); x.fill();
      if (s.bucket.i === i && bAge < 600) {
        x.globalAlpha = 1 - bAge / 600; x.shadowColor = col(i, rows); x.shadowBlur = 24; x.fill(); x.shadowBlur = 0; x.globalAlpha = 1;
      }
      x.fillStyle = 'rgba(0,0,0,.65)'; x.font = `800 ${m >= 100 ? 10 : 12}px system-ui,sans-serif`; x.textAlign = 'center'; x.fillText(label(m), bx + (S - 6) / 2, by + 18);
    });

    // spor + kugler
    for (const b of s.balls) {
      if (b.trail) b.trail.forEach((p, i, a) => {
        const f = (i + 1) / a.length;
        x.globalAlpha = f * 0.45; x.fillStyle = '#ff6f9d'; x.beginPath(); x.arc(p.x, p.y, 7 * f, 0, 7); x.fill();
      });
      x.globalAlpha = 1;
      const gr = x.createRadialGradient(b.x, b.y, 2, b.x, b.y, 17);
      gr.addColorStop(0, 'rgba(255,45,111,.55)'); gr.addColorStop(1, 'rgba(255,45,111,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(b.x, b.y, 17, 0, 7); x.fill();
      x.fillStyle = '#ff2d6f'; x.beginPath(); x.arc(b.x, b.y, 7, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(b.x - 2.2, b.y - 2.4, 2.1, 0, 7); x.fill();
    }

    // partikler (gnister + mønter)
    for (const p of s.parts) {
      const f = Math.max(0, 1 - p.life / p.max);
      if (p.k === 's') {
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = f; x.fillStyle = '#ffe9a0';
        x.beginPath(); x.arc(p.x, p.y, p.r * (0.5 + f), 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      } else {
        x.globalAlpha = Math.min(1, f * 2);
        x.beginPath(); x.ellipse(p.x, p.y, p.r * Math.max(0.15, Math.abs(Math.cos(p.s))), p.r, 0, 0, 7);
        x.fillStyle = '#ffd23f'; x.fill(); x.strokeStyle = '#b8860b'; x.lineWidth = 1.5; x.stroke(); x.globalAlpha = 1;
      }
    }
  };

  const step = (now) => {
    const s = sim.current, { onPin, onLand } = cb.current;
    const g = geometry(cb.current.rows);
    s.balls = s.balls.filter((b) => {
      const e = Math.max(0, now - b.t0) * b.sp, n = Math.min(Math.floor(e / SEG), b.rows - 1), t = Math.min(1, (e - n * SEG) / SEG);
      if (n !== b.n && n < b.rows) {
        b.n = n;
        const j = b.off[n] + (n + 2) / 2, px = g.cx + b.off[n] * S, py = g.rowY(n + 1);
        s.hits.set(`${n + 1}-${j}`, now);
        if (!reduce) burst(px, py - 4, 4, 'spark');
        onPin && onPin(n, b);
      }
      b.x = g.cx + (b.off[n] + (b.off[n + 1] - b.off[n]) * t) * S + b.jx[n] + (b.jx[n + 1] - b.jx[n]) * t;
      b.y = g.rowY(1) - 11 + n * S + S * t * t - b.bn[n] * Math.sin(Math.PI * t) * (1 - t);
      if (!reduce) { (b.trail ||= []).push({ x: b.x, y: b.y }); if (b.trail.length > 9) b.trail.shift(); }
      if (e >= b.rows * SEG) {
        const bx = g.cx + (b.k - b.rows / 2) * S, by = g.rowY(b.rows) + S - 12;
        s.bucket = { i: b.k, t: now };
        const m = b.mult;
        if (!reduce && m > 1) burst(bx, by, m >= 100 ? 34 : m >= 10 ? 22 : m >= 2 ? 14 : 8, 'coin', m >= 10 ? 1.5 : 1);
        if (!reduce) burst(bx, by, 8, 'spark');
        onLand && onLand(b);
        return false;
      }
      return true;
    });
    const dt = Math.max(0, Math.min(0.05, (now - (s.last || now)) / 1000)); s.last = now;
    s.parts = s.parts.filter((p) => { p.life += dt; if (p.k === 'c') { p.vy += 900 * dt; p.s += p.vs * dt; } p.x += p.vx * dt; p.y += p.vy * dt; return p.life < p.max; });
    draw(now);
    const active = s.balls.length || s.parts.length || now - s.bucket.t < 650 || [...s.hits.values()].some((t) => now - t < 400);
    s.raf = active ? requestAnimationFrame(step) : 0;
    if (!active) s.hits.clear();
  };
  const kick = () => { const s = sim.current; if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(step); } };

  useImperativeHandle(ref, () => ({
    drop(ball) { sim.current.balls.push({ ...ball, t0: performance.now(), n: -1, x: 0, y: -50 }); kick(); },
    inFlight: () => sim.current.balls.length,
  }));

  // størrelse (responsiv) + gentegning ved rows/risk-skift
  useEffect(() => {
    const w = wrap.current, c = canvas.current;
    const fit = () => {
      const s = sim.current, g = geometry(cb.current.rows), dpr = Math.min(2, window.devicePixelRatio || 1);
      s.cssW = Math.max(1, w.clientWidth); s.dpr = dpr;
      c.style.height = (s.cssW * g.H) / g.W + 'px';
      c.width = Math.round(s.cssW * dpr); c.height = Math.round(((s.cssW * g.H) / g.W) * dpr);
      draw(performance.now());
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(w);
    return () => { ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, risk]);
  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  return (
    <div className="plinko-board" ref={wrap}>
      <canvas ref={canvas} role="img" aria-label="Plinko board" />
    </div>
  );
});
export default PlinkoBoard;
