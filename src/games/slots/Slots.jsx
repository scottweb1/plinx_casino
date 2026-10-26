import { useEffect, useRef, useState } from 'react';
import Reel from './Reel.jsx';
import { SLOT, spinGrid, evalGrid } from './slotsMath.js';
import TopBar from '../../components/TopBar.jsx';
import BetBox from '../../components/BetBox.jsx';
import JackpotOverlay from '../../components/JackpotOverlay.jsx';
import { AutoFields, AutoButton, TurboChip } from '../../components/AutoPanel.jsx';
import { useAuto } from '../../hooks/useAuto.js';
import { useWallet, useSettings } from '../../hooks/useStores.js';
import { walletStore } from '../../lib/walletStore.js';
import { toCents, fmt } from '../../lib/money.js';
import { tierFor } from '../../lib/config.js';
import { sfx } from '../../audio/sfx.js';
import { fx } from '../../effects/fxBus.js';

export default function Slots({ onLobby, onExit }) {
  const w = useWallet();
  const { turbo } = useSettings();
  const [bet, setBet] = useState('10.00');
  const initial = useRef(null);
  if (!initial.current) initial.current = spinGrid();
  const [hit, setHit] = useState(() => new Set());
  const [win, setWin] = useState(null), [msg, setMsg] = useState(''), [pt, setPt] = useState(false);
  const [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const reels = useRef([]), run = useRef(null), timers = useRef([]), spinRef = useRef(null);
  const auto = useAuto();

  const finish = () => {
    const R = run.current;
    if (!R) return;
    run.current = null; timers.current = [];
    walletStore.settle(R.id, R.res.pay); // no-op hvis allerede afregnet
    setHit(R.res.hit); setBusy(false);
    const pay = R.res.pay, net = pay - R.stake, m = pay / R.stake;
    if (auto.note(net)) setMsg('Auto stopped: limit reached');
    if (!pay) { setMsg((x) => x || 'No win'); sfx.lose(); }
    else {
      const tier = tierFor(m);
      if (tier) { setWin({ id: R.id, m, bet: R.stake, payout: pay, net, tier }); auto.pause(); }
      else {
        sfx.win(m); setMsg('WIN +$' + fmt(pay));
        fx.pop('+$' + fmt(pay), 0.5, 0.3, m >= 3 ? 2 : 1);
        if (m >= 3) fx.coinBurst(1, 0.5, 0.5);
      }
    }
    setTick((t) => t + 1);
  };

  const stopReel = (i) => {
    const R = run.current;
    if (!R || R.requested[i]) return;
    R.requested[i] = true;
    reels.current[i].stop(R.out[i], R.f < 1 ? 0.7 : 1, () => {
      sfx.stop(i);
      if (++R.stopped === 5) finish();
    });
  };

  const spin = () => {
    if (run.current || win) return false;
    const stake = toCents(bet);
    if (!stake) return false;
    const out = spinGrid(), res = evalGrid(out, stake);
    const id = walletStore.placeBet('slots', stake, { escrow: res.pay });
    if (!id) return false;
    const f = turbo ? 0.5 : 1;
    run.current = { id, stake, out, res, f, stopped: 0, requested: [false, false, false, false, false] };
    setBusy(true); setMsg(''); setHit(new Set());
    reels.current.forEach((r, i) => r.start(i * 60 * f, i === 0 ? sfx.tick : null, turbo ? 1.6 : 1));
    out.forEach((_, i) => timers.current.push(setTimeout(() => stopReel(i), (900 + i * 430) * f)));
    return true;
  };
  spinRef.current = spin;

  // Hurtigstop: stopper de resterende ruller efter hinanden
  const quickStop = () => {
    const R = run.current;
    if (!R) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    R.f = 0.5;
    let k = 0;
    R.requested.forEach((done, i) => { if (!done) timers.current.push(setTimeout(() => stopReel(i), 40 + 110 * k++)); });
  };

  useEffect(() => {
    if (!auto.on || busy || win) return;
    const t = setTimeout(() => {
      if (!auto.take()) return;
      if (!spinRef.current()) { auto.stop(); setMsg('Auto stopped: cannot place bet'); }
    }, turbo ? 220 : 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.on, busy, win, tick]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); walletStore.flushEscrow('slots'); }, []);

  const b = toCents(bet), cant = !b || !w || b > w.bal;
  return (
    <div className="wrap">
      {win && <JackpotOverlay key={win.id} win={win} canResume={auto.canResume()} more={0} onClose={(r) => { setWin(null); if (r) auto.resume(); }} />}
      <TopBar busy={busy || auto.on} onLobby={onLobby} onExit={onExit} />
      <div className="machine">
        <div className="reels">
          {[0, 1, 2, 3, 4].map((i) => <Reel key={i} index={i} initial={initial.current[i]} hit={hit} ref={(el) => (reels.current[i] = el)} />)}
        </div>
        <div className="banner" aria-live="polite">{msg}</div>
        <div className="ctl">
          <BetBox bet={bet} setBet={setBet} disabled={busy || auto.on} />
          <div className="ctlr">
            <button className={'play' + (busy ? ' stop' : '')} disabled={busy ? false : auto.on || cant} onClick={busy ? quickStop : spin}>{busy ? 'STOP' : 'SPIN'}</button>
            <AutoButton auto={auto} canStart={!busy && !cant} onStart={() => auto.start()} />
            <div className="chips2">
              <TurboChip />
              <button className={'chip' + (pt ? ' on' : '')} onClick={() => setPt(!pt)}>Paytable</button>
            </div>
          </div>
        </div>
        <AutoFields auto={auto} nLabel={"Spins (0 = \u221e)"} />
        {pt && (
          <div className="pt">
            <p>Bet is split over 5 lines. Match 3, 4 or 5 symbols from the left on a line. Values are {'\u00d7'} total bet per winning line.</p>
            <table><tbody>{SLOT.syms.map((s, i) => <tr key={i}><td>{s.e}</td>{s.p.map((v, j) => <td key={j}>{j + 3}: {v / SLOT.lines.length}{'\u00d7'}</td>)}</tr>)}</tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}
