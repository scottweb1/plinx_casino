import { useEffect, useRef, useState } from 'react';
import { SIDES, SIDE_KEYS, rollSide } from './coinflipMath.js';
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
import { sfx } from '../../audio/sfx.js';
import { ping } from '../../audio/engine.js';
import { fx } from '../../effects/fxBus.js';

const SHORT = { heads: 'H', tails: 'T', edge: 'E' };
// Vinkel for hver side (rotateY). Edge = mønten står på kant (set fra siden).
const ANGLE = { heads: 0, tails: 180, edge: 90 };
const LAYERS = Array.from({ length: 21 }, (_, i) => i - 10);

export default function Coinflip({ onLobby, onExit }) {
  const w = useWallet();
  const { turbo } = useSettings();
  const [bet, setBet] = useState('10.00'), [pick, setPick] = useState('heads');
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const [rec, setRec] = useState([]), [win, setWin] = useState(null), [landed, setLanded] = useState(null);
  const coin = useRef(null), toss = useRef(null), angle = useRef(0), run = useRef({ busy: false, anims: [] }), flipRef = useRef(null);
  const auto = useAuto();
  const stake = toCents(bet), S = SIDES[pick];

  const flip = () => {
    const R = run.current, a = toCents(bet);
    if (R.busy || win || !a) return false;
    const res = rollSide(), won = res === pick, pay = won ? mulCents(a, S.mult) : 0;
    const id = walletStore.placeBet('coinflip', a, { escrow: pay });
    if (!id) return false;
    R.busy = true; setBusy(true); setMsg(''); setLanded(null);
    sfx.drop();

    // Animation: myntkast (op/ned) + rotation der ender på den afgjorte side
    const dur = turbo ? 900 : 1900, spins = (turbo ? 3 : 6) * 360;
    const from = angle.current, base = Math.ceil(from / 360) * 360;
    let to = base + spins + ANGLE[res];
    if (res === 'edge') to = base + spins + 90;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const up = reduce ? 0 : -(turbo ? 110 : 190);
    const a1 = toss.current.animate(
      [{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(${up}px) scale(1.25)`, offset: 0.45 }, { transform: 'translateY(0) scale(1)' }],
      { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
    const a2 = coin.current.animate(
      [{ transform: `rotateY(${from}deg) rotateX(0deg)` }, { transform: `rotateY(${(from + to) / 2}deg) rotateX(${reduce ? 0 : 540}deg)`, offset: 0.5 }, { transform: `rotateY(${to}deg) rotateX(0deg)` }],
      { duration: dur, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'forwards' });
    R.anims = [a1, a2];
    const t = setInterval(() => ping(1200 + Math.random() * 500, 0.02, 0.05, 'triangle'), turbo ? 90 : 140);
    R.timer = t;
    a2.finished.then(() => {
      clearInterval(t);
      angle.current = to;
      coin.current.style.transform = `rotateY(${to}deg)`; toss.current.style.transform = 'none';
      R.anims.forEach((x) => x.cancel()); R.anims = [];
      finish(id, a, res, won, pay);
    }).catch(() => {});
    return true;
  };
  flipRef.current = flip;

  const finish = (id, a, res, won, pay) => {
    const R = run.current;
    R.busy = false; setBusy(false); setLanded(res);
    walletStore.settle(id, pay, { mult: won ? S.mult : 0 });
    setRec((x) => [{ id, m: 0, label: SHORT[res], cls: won ? 'w' : 'l' }, ...x].slice(0, 12));
    const net = pay - a;
    if (auto.note(net)) setMsg('Auto stopped: limit reached');
    sfx.wheelStop();
    if (won) {
      const m = SIDES[res].mult, tier = tierFor(m);
      if (tier) { setWin({ id, m, bet: a, payout: pay, net, tier }); auto.pause(); }
      else {
        sfx.win(m === 4 ? 10 : 3);
        setMsg((res === 'edge' ? 'ON THE EDGE! ' : SIDES[res].label + '! ') + 'WIN +$' + fmt(net));
        fx.pop('+$' + fmt(net), 0.5, 0.35, res === 'edge' ? 3 : 2);
        fx.coinBurst(res === 'edge' ? 2.5 : 1.2, 0.5, 0.5);
      }
    } else { sfx.lose(); setMsg('It landed on ' + SIDES[res].label + '. LOSS -$' + fmt(a)); }
    setTick((t) => t + 1);
  };

  useEffect(() => {
    if (!auto.on || busy || win) return;
    const t = setTimeout(() => {
      if (!auto.take()) return;
      if (!flipRef.current()) { auto.stop(); setMsg('Auto stopped: cannot place bet'); }
    }, turbo ? 200 : 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.on, busy, win, tick]);
  useEffect(() => () => { clearInterval(run.current.timer); run.current.anims.forEach((x) => x.cancel()); walletStore.flushEscrow('coinflip'); }, []);

  const lock = busy || auto.on, cant = !stake || !w || stake > w.bal;
  return (
    <div className="wrap">
      {win && <JackpotOverlay key={win.id} win={win} canResume={auto.canResume()} more={0} onClose={(r) => { setWin(null); if (r) auto.resume(); }} />}
      <TopBar busy={lock} onLobby={onLobby} onExit={onExit} />
      <div className="app">
        <div className="side">
          <BetBox bet={bet} setBet={setBet} disabled={lock} />
          <div>
            <label>Pick a side</label>
            <div className="cf-picks" role="radiogroup" aria-label="Pick a side">
              {SIDE_KEYS.map((k) => (
                <button key={k} role="radio" aria-checked={pick === k} disabled={lock} className={'cf-pick' + (pick === k ? ' on' : '') + (k === 'edge' ? ' edge' : '')} onClick={() => setPick(k)}>
                  <b>{SIDES[k].label}</b>
                  <span>{Math.round(SIDES[k].chance * 100)}% &middot; {SIDES[k].mult}{'\u00d7'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="stat"><span>Win chance</span><b>{Math.round(S.chance * 100)}%</b></div>
          <div className="stat"><span>Payout on win</span><b>${fmt(mulCents(stake, S.mult))}</b></div>
          <button className="play" disabled={lock || cant} onClick={flip}>{busy ? 'FLIPPING...' : 'FLIP'}</button>
          <div className="chips2"><TurboChip /></div>
          <div className="stat"><span>Auto play</span></div>
          <AutoFields auto={auto} nLabel={'Flips (0 = \u221e)'} />
          <AutoButton auto={auto} canStart={!busy && !cant} onStart={() => auto.start()} />
          <div className="banner" aria-live="polite">{msg}</div>
        </div>
        <div className="stage cf-stage" style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <div className={'cf-scene' + (landed === 'edge' ? ' glow-edge' : '')}>
            <div className="cf-shadow" />
            <div className="cf-toss" ref={toss}>
              <div className="cf-coin" ref={coin}>
                {LAYERS.map((z) => <i key={z} className="cf-rim" style={{ transform: `translateZ(${z * 0.9}px)` }} />)}
                <div className="cf-face front"><span>{'\ud83d\udc51'}</span><em>HEADS</em></div>
                <div className="cf-face back"><span>{'\ud83e\ude99'}</span><em>TAILS</em></div>
              </div>
            </div>
          </div>
          <div className="cf-odds" aria-hidden="true">
            {SIDE_KEYS.map((k) => <div key={k} style={{ flex: SIDES[k].slots }} className={k + (landed === k ? ' hit' : '')}>{SIDES[k].label} {Math.round(SIDES[k].chance * 100)}%</div>)}
          </div>
          <RecentChips items={rec.map((x) => ({ ...x, m: 0 }))} custom />
        </div>
      </div>
    </div>
  );
}
