import { useEffect, useRef, useState } from 'react';
import TopBar from '../../components/TopBar.jsx';
import BetBox from '../../components/BetBox.jsx';
import JackpotOverlay from '../../components/JackpotOverlay.jsx';
import RecentChips from '../../components/RecentChips.jsx';
import { AutoFields, AutoButton, TurboChip } from '../../components/AutoPanel.jsx';
import { useAuto } from '../../hooks/useAuto.js';
import { useWallet, useSettings } from '../../hooks/useStores.js';
import { walletStore } from '../../lib/walletStore.js';
import { toCents, mulCents, fmt } from '../../lib/money.js';
import { tierFor } from '../../lib/config.js';
import { randInt } from '../../lib/rng.js';
import { ping } from '../../audio/engine.js';
import { sfx } from '../../audio/sfx.js';
import { fx } from '../../effects/fxBus.js';

export const LIMBO = { edge: 0.01, min: 1.01, max: 1000 };
export const lbChance = (T) => Math.min(1, (1 - LIMBO.edge) / T);
export const lbRoll = () => {
  const u = 1 - randInt(1e9) / 1e9;
  return Math.max(1, Math.min(LIMBO.max, Math.floor(((1 - LIMBO.edge) / u) * 100) / 100));
};

export default function Limbo({ onLobby, onExit }) {
  const w = useWallet();
  const { turbo } = useSettings();
  const [bet, setBet] = useState('10.00'), [tg, setTg] = useState('2.00');
  const [shown, setShown] = useState(1), [st, setSt] = useState('idle'), [msg, setMsg] = useState('');
  const [rec, setRec] = useState([]), [win, setWin] = useState(null), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const run = useRef({ busy: false, raf: 0 }), playRef = useRef(null);
  const auto = useAuto();
  const T = Math.min(LIMBO.max, Math.max(LIMBO.min, parseFloat(tg) || LIMBO.min));
  const stake = toCents(bet);

  const play = () => {
    const R = run.current, a = toCents(bet);
    if (R.busy || win || !a) return false;
    const res = lbRoll(), won = res >= T, pay = won ? mulCents(a, T) : 0;
    const id = walletStore.placeBet('limbo', a, { escrow: pay });
    if (!id) return false;
    R.busy = true; setBusy(true); setMsg(''); setSt('rolling');
    const dur = turbo ? 900 : 2600, t0 = performance.now();
    let last = 0;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      if (p < 1) {
        if (now - last > 30 + 260 * p * p * p) {
          last = now;
          const sp = 1.6 * Math.pow(1 - p, 2.5) * (p < 0.6 ? 6 : 1);
          setShown(Math.max(1, res * (1 + (Math.random() * 2 - 1) * sp)));
          ping(300 + p * 900, 0.02, 0.03, 'triangle');
        }
        R.raf = requestAnimationFrame(step);
        return;
      }
      setShown(res); R.busy = false; setBusy(false);
      walletStore.settle(id, pay, { mult: won ? T : 0 });
      setRec((x) => [{ id, m: res, cls: won ? 'w' : 'l' }, ...x].slice(0, 12));
      if (auto.note(pay - a)) setMsg('Auto stopped: limit reached');
      if (won) {
        setSt('win');
        const tier = tierFor(T);
        if (tier) { setWin({ id, m: T, bet: a, payout: pay, net: pay - a, tier }); auto.pause(); }
        else { sfx.win(T); setMsg('WIN +$' + fmt(pay - a)); fx.pop('+$' + fmt(pay - a), 0.5, 0.35, T >= 3 ? 2 : 1); if (T >= 3) fx.coinBurst(1, 0.5, 0.5); }
      } else { setSt('lose'); sfx.lose(); setMsg('LOSS -$' + fmt(a)); }
      setTick((t) => t + 1);
    };
    R.raf = requestAnimationFrame(step);
    return true;
  };
  playRef.current = play;

  useEffect(() => {
    if (!auto.on || busy || win) return;
    const t = setTimeout(() => {
      if (!auto.take()) return;
      if (!playRef.current()) { auto.stop(); setMsg('Auto stopped: cannot place bet'); }
    }, turbo ? 150 : 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.on, busy, win, tick]);
  useEffect(() => () => { cancelAnimationFrame(run.current.raf); walletStore.flushEscrow('limbo'); }, []);

  const lock = busy || auto.on, cant = !stake || !w || stake > w.bal;
  return (
    <div className="wrap">
      {win && <JackpotOverlay key={win.id} win={win} canResume={auto.canResume()} more={0} onClose={(r) => { setWin(null); if (r) auto.resume(); }} />}
      <TopBar busy={lock} onLobby={onLobby} onExit={onExit} />
      <div className="app">
        <div className="side">
          <BetBox bet={bet} setBet={setBet} disabled={lock} />
          <div>
            <label htmlFor="tg">Target Multiplier (1.01 - {LIMBO.max})</label>
            <input id="tg" className="num" value={tg} inputMode="decimal" disabled={lock} onChange={(e) => setTg(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={() => setTg(T.toFixed(2))} />
          </div>
          <div className="stat"><span>Win chance</span><b>{(lbChance(T) * 100).toFixed(2)}%</b></div>
          <div className="stat"><span>Payout on win</span><b>${fmt(mulCents(stake, T))}</b></div>
          <button className="play" disabled={lock || cant} onClick={play}>{busy ? 'ROLLING...' : 'PLAY'}</button>
          <div className="chips2"><TurboChip /></div>
          <div className="stat"><span>Auto play</span></div>
          <AutoFields auto={auto} />
          <AutoButton auto={auto} canStart={!busy && !cant} onStart={() => auto.start()} />
          <div className="banner" aria-live="polite">{msg}</div>
        </div>
        <div className="stage" style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <div className="lbox">
            <div className={'lnum ' + st}>{shown.toFixed(2)}{'\u00d7'}</div>
            <div className="ltg">Target {'\u2265'} {T.toFixed(2)}{'\u00d7'}</div>
          </div>
          <RecentChips items={rec.map((x) => ({ ...x, m: x.m }))} />
        </div>
      </div>
    </div>
  );
}
