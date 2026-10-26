import { useRef, useState } from 'react';
import { toCents } from '../lib/money.js';

// Fælles Auto Play-logik: antal runder, stop ved gevinst/tab, pause/genoptag (jackpot).
export function useAuto() {
  const [on, setOn] = useState(false);
  const [cfg, setCfg] = useState({ n: '10', w: '0', l: '0' });
  const r = useRef({ rem: 0, net: 0, paused: false, on: false, cfg });
  r.current.cfg = cfg;

  const api = {
    on, cfg, setCfg,
    start() {
      const n = parseInt(r.current.cfg.n, 10);
      Object.assign(r.current, { rem: n > 0 ? n : Infinity, net: 0, paused: false, on: true });
      setOn(true);
    },
    stop() { Object.assign(r.current, { on: false, paused: false }); setOn(false); },
    pause() { if (r.current.on) { Object.assign(r.current, { paused: true, on: false }); setOn(false); } },
    resume() { if (r.current.paused && r.current.rem > 0) { Object.assign(r.current, { paused: false, on: true }); setOn(true); } },
    canResume: () => r.current.paused && r.current.rem > 0,
    remaining: () => r.current.rem,
    isOn: () => r.current.on,
    // Reserver en runde. Returnerer false når auto er slut.
    take() {
      if (!r.current.on) return false;
      if (r.current.rem <= 0) { api.stop(); return false; }
      r.current.rem--;
      return true;
    },
    // Registrer netto (cent) for en afsluttet runde; stopper ved grænser. Returnerer true hvis stoppet.
    note(net) {
      r.current.net += net;
      const w = toCents(r.current.cfg.w), l = toCents(r.current.cfg.l);
      if ((w > 0 && r.current.net >= w) || (l > 0 && r.current.net <= -l)) { api.stop(); return true; }
      return false;
    },
  };
  return api;
}
