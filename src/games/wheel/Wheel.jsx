import { useEffect, useRef, useState } from 'react';
import TopBar from '../../components/TopBar.jsx';
import BetBox from '../../components/BetBox.jsx';
import JackpotOverlay from '../../components/JackpotOverlay.jsx';
import { AutoFields, AutoButton, TurboChip } from '../../components/AutoPanel.jsx';
import { useAuto } from '../../hooks/useAuto.js';
import { useWallet, useSettings } from '../../hooks/useStores.js';
import { walletStore } from '../../lib/walletStore.js';
import { toCents, mulCents, fmt, centsToInput } from '../../lib/money.js';
import { tierFor } from '../../lib/config.js';
import { randInt, randFloat } from '../../lib/rng.js';
import { sfx } from '../../audio/sfx.js';
import { fx } from '../../effects/fxBus.js';

export const WHEEL = {
  types: [[0, 19], [0.5, 6], [1, 6], [1.5, 3], [2, 3], [3, 1], [5, 1], [10, 1]],
  col: { 0: '#26394a', 0.5: '#8a4b2b', 1: '#3f7cac', 1.5: '#2e9e6a', 2: '#19c37d', 3: '#e0b020', 5: '#f08a24', 10: '#e23d5a' },
};
// Felterne spredes jævnt rundt på hjulet
export const SL = WHEEL.types
  .flatMap(([m, c], t) => Array.from({ length: c }, (_, j) => ({ m, pos: (j + 0.5) / c + t * 0.0013 })))
  .sort((a, b) => a.pos - b.pos).map((s) => s.m);
export const NS = SL.length, SA = 360 / NS;
const sliceAt = (ang) => Math.floor(((((-ang) % 360) + 360) % 360) / SA) % NS;
const wpt = (a, r) => [200 + r * Math.sin((a * Math.PI) / 180), 200 - r * Math.cos((a * Math.PI) / 180)];

export default function Wheel({ onLobby, onExit }) {
  const w = useWallet();
  const { turbo } = useSettings();
  const [bet, setBet] = useState('10.00'), [ang, setAng] = useState(0), [res, setRes] = useState(-1), [msg, setMsg] = useState('');
  const [rec, setRec] = useState([]), [win, setWin] = useState(null), [odds, setOdds] = useState(false), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const R = useRef({ busy: false, ang: 0, raf: 0 }), spinRef = useRef(null);
  const auto = useAuto();

  const spin = () => {
    const a = toCents(bet), S = R.current;
    if (S.busy || win || !a) return false;
    const i = randInt(NS), m = SL[i], pay = mulCents(a, m);
    const id = walletStore.placeBet('wheel', a, { escrow: pay });
    if (!id) return false;
    S.busy = true; setBusy(true); setMsg(''); setRes(-1);
    const off = (randFloat() - 0.5) * SA * 0.7, a0 = S.ang, target = -(i + 0.5) * SA - off;
    const delta = (turbo ? 4 : 6) * 360 + ((((target - a0) % 360) + 360) % 360), dur = turbo ? 2600 : 6200, t0 = performance.now();
    let lastIdx = sliceAt(a0);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), cur = a0 + delta * (1 - Math.pow(1 - p, 4));
      S.ang = cur; setAng(cur);
      const idx = sliceAt(cur);
      if (idx !== lastIdx) { lastIdx = idx; sfx.wheelTick(); }
      if (p < 1) { S.raf = requestAnimationFrame(step); return; }
      S.busy = false; setBusy(false); setRes(i);
      walletStore.settle(id, pay, { mult: m });
      setRec((x) => [{ m, id }, ...x].slice(0, 10)); sfx.wheelStop();
      const net = pay - a;
      if (auto.note(net)) setMsg('Auto stopped: limit reached');
      if (m >= 10) { setWin({ id, m, bet: a, payout: pay, net, tier: tierFor(m, 10) }); auto.pause(); }
      else if (m > 1) { sfx.win(m); setMsg(m + '\u00d7: +$' + fmt(net)); fx.pop('+$' + fmt(net), 0.5, 0.35, m >= 3 ? 2 : 1); if (m >= 3) fx.coinBurst(1, 0.5, 0.5); }
      else if (m === 1) setMsg('1\u00d7: bet returned');
      else { sfx.lose(); setMsg(m + '\u00d7: -$' + fmt(a - pay)); }
      setTick((t) => t + 1);
    };
    S.raf = requestAnimationFrame(step);
    return true;
  };
  spinRef.current = spin;

  useEffect(() => {
    if (!auto.on || busy || win) return;
    const t = setTimeout(() => {
      if (!auto.take()) return;
      if (!spinRef.current()) { auto.stop(); setMsg('Auto stopped: cannot place bet'); }
    }, turbo ? 250 : 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.on, busy, win, tick]);
  useEffect(() => () => { cancelAnimationFrame(R.current.raf); walletStore.flushEscrow('wheel'); }, []);

  const b = toCents(bet), lock = busy || auto.on, cant = !b || !w || b > w.bal;
  return (
    <div className="wrap">
      {win && <JackpotOverlay key={win.id} win={win} canResume={auto.canResume()} more={0} onClose={(r) => { setWin(null); if (r) auto.resume(); }} />}
      <TopBar busy={lock} onLobby={onLobby} onExit={onExit} />
      <div className="app">
        <div className="side">
          <BetBox bet={bet} setBet={setBet} disabled={lock} />
          <div className="chips2">{[1, 10, 100, 1000].map((v) => <button key={v} className="chip" disabled={lock} onClick={() => setBet(centsToInput(Math.min(v * 100, w ? w.bal : v * 100)))}>${v}</button>)}</div>
          <button className="play" disabled={lock || cant} onClick={spin}>{busy ? 'SPINNING...' : 'SPIN'}</button>
          <div className="chips2">
            <TurboChip />
            <button className={'chip' + (odds ? ' on' : '')} onClick={() => setOdds(!odds)}>Odds</button>
          </div>
          {odds && (
            <div className="pt"><table><tbody>{WHEEL.types.map(([m, c]) => <tr key={m}><td>{m}{'\u00d7'}</td><td>{((c / NS) * 100).toFixed(1)}%</td><td>${fmt(mulCents(b, m))}</td></tr>)}</tbody></table></div>
          )}
          <div className="stat"><span>Auto play</span></div>
          <AutoFields auto={auto} nLabel={"Spins (0 = \u221e)"} />
          <AutoButton auto={auto} canStart={!busy && !cant} onStart={() => auto.start()} />
          <div className="banner" aria-live="polite">{msg}</div>
        </div>
        <div className="stage" style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <svg className="wheelsvg" viewBox="0 0 400 400" role="img" aria-label="Wheel">
            <circle cx="200" cy="200" r="192" fill="#0b1821" stroke="#f5b301" strokeWidth="6" />
            <g transform={`rotate(${ang} 200 200)`}>
              {SL.map((m, i) => {
                const [x1, y1] = wpt(i * SA, 180), [x2, y2] = wpt((i + 1) * SA, 180);
                return (
                  <g key={i}>
                    <path d={`M200 200L${x1} ${y1}A180 180 0 0 1 ${x2} ${y2}Z`} fill={WHEEL.col[m]} stroke={res === i ? '#fff' : '#0b1821'} strokeWidth={res === i ? 4 : 1} />
                    <text transform={`rotate(${(i + 0.5) * SA} 200 200)`} x="200" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{m}{'\u00d7'}</text>
                  </g>
                );
              })}
            </g>
            <circle cx="200" cy="200" r="34" fill="#f5b301" stroke="#7a4a00" strokeWidth="4" />
            <text x="200" y="211" textAnchor="middle" fontSize="30" fontWeight="900" fill="#3b2500">$</text>
            <polygon points="188,2 212,2 200,32" fill="#ffd23f" stroke="#7a4a00" strokeWidth="2" />
          </svg>
          <div className="rec">{rec.map((x) => <span key={x.id} className={x.m > 1 ? 'w' : x.m < 1 ? 'l' : ''}>{x.m}{'\u00d7'}</span>)}</div>
        </div>
      </div>
    </div>
  );
}
