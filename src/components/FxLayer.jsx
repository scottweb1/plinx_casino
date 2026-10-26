import { useEffect, useRef } from 'react';
import { fx } from '../effects/fxBus.js';

// Fuldskærms-canvas til mønt-udbrud og flydende "+$"-tekst ved gevinster.
export default function FxLayer() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, id = 0, last = 0, ps = [];
    const size = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const R = (a, b) => a + Math.random() * (b - a);

    const loop = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      x.clearRect(0, 0, W, H);
      ps = ps.filter((p) => p.life < p.max && p.y < H + 40);
      for (const p of ps) {
        p.life += dt;
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.s += (p.vs || 0) * dt;
        const k = Math.max(0, 1 - p.life / p.max);
        x.save(); x.translate(p.x, p.y);
        if (p.t === 'coin') {
          x.globalAlpha = Math.min(1, k * 2);
          x.beginPath(); x.ellipse(0, 0, p.r * Math.max(0.15, Math.abs(Math.cos(p.s))), p.r, 0, 0, 7);
          x.fillStyle = '#ffd23f'; x.fill(); x.strokeStyle = '#b8860b'; x.lineWidth = 2; x.stroke();
          x.beginPath(); x.ellipse(-p.r * 0.2, -p.r * 0.25, p.r * 0.25, p.r * 0.35, 0, 0, 7); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill();
        } else if (p.t === 'spark') {
          x.globalCompositeOperation = 'lighter'; x.globalAlpha = k;
          const r = p.r * (0.4 + k); x.fillStyle = '#fff1a8';
          x.beginPath(); x.moveTo(0, -r * 2); x.lineTo(r * 0.4, 0); x.lineTo(0, r * 2); x.lineTo(-r * 0.4, 0); x.closePath(); x.fill();
          x.beginPath(); x.moveTo(-r * 2, 0); x.lineTo(0, r * 0.4); x.lineTo(r * 2, 0); x.lineTo(0, -r * 0.4); x.closePath(); x.fill();
        } else {
          x.globalAlpha = Math.min(1, k * 2.2);
          x.font = `900 ${p.size}px system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.lineWidth = 5; x.strokeStyle = 'rgba(60,35,0,.85)'; x.strokeText(p.text, 0, 0);
          x.shadowColor = 'rgba(255,200,60,.9)'; x.shadowBlur = 14; x.fillStyle = '#ffe27a'; x.fillText(p.text, 0, 0);
        }
        x.restore();
      }
      id = ps.length ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!id) { last = performance.now(); id = requestAnimationFrame(loop); } };

    const off = fx.on((e) => {
      const px = e.x * W, py = e.y * H;
      if (e.type === 'text') {
        ps.push({ t: 'text', text: e.text, x: px, y: py, vx: 0, vy: -70, life: 0, max: 1.6, size: 26 + e.power * 8 });
      } else if (!reduce) {
        const n = Math.round(8 + e.power * 10);
        for (let i = 0; i < n; i++) ps.push({ t: 'coin', x: px + R(-30, 30), y: py, vx: R(-320, 320) * (0.6 + e.power * 0.25), vy: R(-620, -220), g: 1200, s: R(0, 6), vs: R(8, 16), r: R(7, 12), life: 0, max: R(1.1, 1.8) });
        for (let i = 0; i < n; i++) ps.push({ t: 'spark', x: px + R(-120, 120), y: py + R(-90, 60), vx: R(-20, 20), vy: R(-40, 10), life: 0, max: R(0.4, 0.9), r: R(3, 7), s: 0 });
      }
      kick();
    });
    return () => { off(); cancelAnimationFrame(id); removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} className="fx-layer" aria-hidden="true" />;
}
