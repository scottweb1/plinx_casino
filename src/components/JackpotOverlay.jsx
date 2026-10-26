import { useEffect, useRef, useState } from 'react';
import { JP } from '../lib/config.js';
import { fmt } from '../lib/money.js';
import { sfx } from '../audio/sfx.js';
import { duck } from '../audio/engine.js';
import { useSettings } from '../hooks/useStores.js';

const TITLES = { big: 'BIG WIN!', mega: 'MASSIVE WIN!', epic: 'EPIC JACKPOT!' };

// win: { id, m, bet, payout, net, tier }  (beløb i cent)
export default function JackpotOverlay({ win, canResume, more, onClose }) {
  const { turbo } = useSettings();
  const teaseMs = turbo ? JP.teaseTurboMs : JP.teaseMs;
  const cv = useRef(null);
  const [val, setVal] = useState(0);
  const [phase, setPhase] = useState('tease');
  const [cd, setCd] = useState(Math.ceil(teaseMs / 1000));
  const reduce = useRef(!!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)).current;

  // Lyd + nedtælling. Alle timere ryddes lokalt.
  useEffect(() => {
    sfx.jackpot(win.tier);
    duck(true);
    const ids = [];
    for (let i = 1; i < Math.ceil(teaseMs / 1000); i++) ids.push(setTimeout(() => setCd(Math.ceil(teaseMs / 1000) - i), i * 1000));
    ids.push(setTimeout(() => setPhase('reveal'), teaseMs));
    return () => { ids.forEach(clearTimeout); sfx.stopJackpot(); duck(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.id]);

  // Optælling af beløbet
  useEffect(() => {
    if (phase !== 'reveal') return;
    const dur = reduce ? 0 : JP.count[win.tier], t0 = performance.now() + 500;
    let id, last = 0;
    const step = () => {
      const p = dur ? Math.min(1, Math.max(0, (performance.now() - t0) / dur)) : 1;
      setVal(Math.round(win.payout * (1 - Math.pow(1 - p, 3))));
      if (p < 1) {
        if (p - last > 0.03) { last = p; sfx.countTick(p); }
        id = requestAnimationFrame(step);
      } else { setVal(win.payout); sfx.countDone(); }
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [phase, win, reduce]);

  // Partikler: pengesedler, mønter m. glimt, konfetti, stjerner, guldglimmer
  useEffect(() => {
    if (reduce || phase !== 'reveal') return;
    const c = cv.current, x = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W, H, id, last = performance.now(), parts = [], acc = 0, tt = 0;
    const size = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const R = (a, b) => a + Math.random() * (b - a), k = JP.n[win.tier];
    const pal = ['#ffd23f', '#ff4d8d', '#4de1ff', '#7dff6a', '#fff'];
    const bill = () => parts.push({ t: 'b', x: R(0, W), y: -40, vx: R(-40, 40), vy: R(110, 230), a: R(0, 6), va: R(-2.5, 2.5), s: R(0, 6), vs: R(2, 5), sc: R(0.8, 1.3) });
    const coin = () => parts.push({ t: 'c', x: W / 2 + R(-60, 60), y: H / 2, vx: R(-520, 520), vy: R(-820, -250), g: 1100, s: R(0, 6), vs: R(8, 16), r: R(9, 15) });
    const conf = () => parts.push({ t: 'f', x: R(0, W), y: -10, vx: R(-60, 60), vy: R(120, 260), a: R(0, 6), va: R(-6, 6), s: 0, vs: 0, col: pal[Math.floor(R(0, 5))], w: R(5, 9), h: R(3, 6) });
    const star = () => parts.push({ t: 's', x: R(0, W), y: R(0, H), vx: 0, vy: 0, s: 0, vs: 0, life: 0, max: R(0.5, 1.1), r: R(4, 9) });
    const glit = (px, py) => parts.push({ t: 'g', x: px + R(-6, 6), y: py + R(-6, 6), vx: R(-30, 30), vy: R(-30, 30), s: 0, vs: 0, life: 0, max: R(0.3, 0.7), r: R(2, 4) });
    for (let i = 0; i < 24 * k; i++) coin();
    const loop = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; tt += dt; acc += dt;
      if (tt < 2.2 + k * 1.2) {
        while (acc > 0.06 / k) { acc -= 0.06 / k; bill(); conf(); if (Math.random() < 0.5) star(); }
        if (Math.random() < 0.02 * k) coin();
      }
      x.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.y < H + 60 && !((p.t === 's' || p.t === 'g') && p.life > p.max));
      const born = [];
      for (const p of parts) {
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.s += p.vs * dt;
        if (p.va) p.a += p.va * dt;
        if (p.life !== undefined) p.life += dt;
        x.save(); x.translate(p.x, p.y);
        if (p.t === 'b') {
          x.rotate(p.a); x.scale(p.sc, p.sc * Math.cos(p.s)); x.fillStyle = '#2f9e5a'; x.fillRect(-23, -11, 46, 22);
          x.strokeStyle = '#bff0c8'; x.lineWidth = 2; x.strokeRect(-20, -8, 40, 16);
          x.fillStyle = '#bff0c8'; x.font = 'bold 13px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', 0, 1);
        } else if (p.t === 'c') {
          x.beginPath(); x.ellipse(0, 0, p.r * Math.max(0.15, Math.abs(Math.cos(p.s))), p.r, 0, 0, 7);
          x.fillStyle = '#ffd23f'; x.fill(); x.strokeStyle = '#b8860b'; x.lineWidth = 2; x.stroke();
          if (Math.random() < 0.18) born.push([p.x, p.y]);
        } else if (p.t === 'f') { x.rotate(p.a); x.fillStyle = p.col; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        else if (p.t === 'g') {
          x.globalCompositeOperation = 'lighter'; const a = Math.max(0, 1 - p.life / p.max); x.fillStyle = `rgba(255,225,120,${a})`;
          x.beginPath(); x.arc(0, 0, p.r * a + 0.5, 0, 7); x.fill();
        } else {
          const r = p.r * Math.sin(Math.PI * Math.min(1, p.life / p.max)); x.fillStyle = '#fff6c2'; x.beginPath(); x.moveTo(0, -r);
          x.quadraticCurveTo(0, 0, r, 0); x.quadraticCurveTo(0, 0, 0, r); x.quadraticCurveTo(0, 0, -r, 0); x.quadraticCurveTo(0, 0, 0, -r); x.fill();
        }
        x.restore();
      }
      if (parts.length < 900) born.forEach(([px, py]) => glit(px, py));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); removeEventListener('resize', size); };
  }, [phase, win.tier, reduce]);

  const title = TITLES[win.tier];
  if (phase === 'tease') {
    return (
      <div className="jp tease" role="dialog" aria-modal="true" aria-label="Big win incoming" onClick={() => setPhase('reveal')}>
        <div className="jp-vig" />
        <div className="jp-ts">
          <div className="jp-zone">JACKPOT ZONE!</div>
          <div className="jp-orb">
            <i className="r1" /><i className="r2" /><i className="r3" />
            <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" className="trk" /><circle cx="100" cy="100" r="90" className="bar" style={{ animationDuration: teaseMs + 'ms' }} /></svg>
            <div className="jp-cd" key={cd}>{cd}</div>
          </div>
          <div className="jp-sub">Something big is coming... <span className="jp-skip">tap to skip</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className={'jp ' + win.tier} role="dialog" aria-modal="true" aria-label={title}>
      <div className="jp-rays" />
      <canvas ref={cv} className="jp-cv" />
      <div className="jp-flash" />
      <div className="jp-shk">
        <div className="jp-box">
          <div className="jp-title">{title}</div>
          <div className="jp-mult">{+win.m.toFixed(2)}×</div>
          <div className="jp-amt">${fmt(val)}</div>
          <div className="jp-rows">
            <span>Bet <b>${fmt(win.bet)}</b></span>
            <span>Net win <b className="up">+${fmt(win.net)}</b></span>
          </div>
          <button className="jp-btn" autoFocus onClick={() => onClose(false)}>AWESOME!</button>
          {canResume && <button className="jp-btn alt" onClick={() => onClose(true)}>Resume Autobet</button>}
          {more > 0 && <div className="jp-more">+{more} more win{more > 1 ? 's' : ''} waiting</div>}
        </div>
      </div>
    </div>
  );
}
