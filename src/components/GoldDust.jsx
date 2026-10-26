import { useEffect, useRef } from 'react';

// Rolige, svævende guldpartikler bag hele appen. Slukkes ved reduced-motion og skjult fane.
export default function GoldDust() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = ref.current, x = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, id = 0, last = performance.now();
    const size = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const count = W < 700 ? 22 : 42;
    const mk = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: 0.6 + Math.random() * 1.8, v: 6 + Math.random() * 16, ph: Math.random() * 6, sw: 8 + Math.random() * 18 });
    let ps = Array.from({ length: count }, () => mk(true));
    const loop = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      x.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y -= p.v * dt; p.ph += dt;
        if (p.y < -10) Object.assign(p, mk(false));
        const a = 0.25 + 0.35 * Math.sin(p.ph * 2.2) ** 2;
        const px = p.x + Math.sin(p.ph) * p.sw;
        const g = x.createRadialGradient(px, p.y, 0, px, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255,224,130,${a})`); g.addColorStop(1, 'rgba(255,200,60,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, p.y, p.r * 4, 0, 7); x.fill();
      }
      id = requestAnimationFrame(loop);
    };
    const vis = () => { cancelAnimationFrame(id); if (!document.hidden) { last = performance.now(); id = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', vis);
    addEventListener('resize', size);
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); document.removeEventListener('visibilitychange', vis); removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} className="gold-dust" aria-hidden="true" />;
}
