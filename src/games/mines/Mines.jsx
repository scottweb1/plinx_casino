import { useRef, useState } from 'react';
import TopBar from '../../components/TopBar.jsx';
import BetBox from '../../components/BetBox.jsx';
import JackpotOverlay from '../../components/JackpotOverlay.jsx';
import { useWallet } from '../../hooks/useStores.js';
import { walletStore } from '../../lib/walletStore.js';
import { toCents, mulCents, fmt } from '../../lib/money.js';
import { tierFor } from '../../lib/config.js';
import { shuffle } from '../../lib/rng.js';
import { sfx } from '../../audio/sfx.js';
import { fx } from '../../effects/fxBus.js';

const MINES = { edge: 0.01, size: 25 };
export const minesMult = (k, M) => { let p = 1; for (let i = 0; i < k; i++) p *= (MINES.size - i) / (MINES.size - M - i); return p * (1 - MINES.edge); };
const Gem = () => <svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#00e5a0" stroke="#b8ffe9" strokeWidth="1" /></svg>;
const IDLE = { ph: 'idle', mines: [], open: [], bet: 0, hit: -1, M: 3, id: null };

export default function Mines({ onLobby, onExit }) {
  const w = useWallet();
  const [bet, setBet] = useState('10.00'), [M, setM] = useState(3), [msg, setMsg] = useState(''), [win, setWin] = useState(null);
  // Genoptag en igangværende runde (gemt i wallet) efter genindlæsning
  const [g, setG] = useState(() => {
    const r = walletStore.findRound('mines');
    return r && r.data ? { ph: 'playing', hit: -1, id: r.id, ...r.data } : IDLE;
  });
  const gr = useRef(g);
  const up = (v) => { gr.current = v; setG(v); };

  const start = () => {
    const stake = toCents(bet);
    if (gr.current.ph === 'playing' || !stake) return;
    const mines = shuffle(Array.from({ length: 25 }, (_, i) => i)).slice(0, M);
    const id = walletStore.placeBet('mines', stake, { data: { mines, open: [], M, bet: stake } });
    if (!id) return;
    setMsg(''); setWin(null);
    up({ ph: 'playing', mines, open: [], bet: stake, hit: -1, M, id });
  };
  const cash = (s = gr.current) => {
    if (s.ph !== 'playing' || !s.open.length) return;
    const m = minesMult(s.open.length, s.M), pay = mulCents(s.bet, m);
    if (!walletStore.settle(s.id, pay)) return;
    up({ ...s, ph: 'over' });
    const tier = tierFor(m);
    if (tier) setWin({ id: s.id, m, bet: s.bet, payout: pay, net: pay - s.bet, tier });
    else { sfx.win(m); fx.pop('+$' + fmt(pay - s.bet), 0.5, 0.35, m > 3 ? 2 : 1); if (m >= 2) fx.coinBurst(1, 0.5, 0.5); setMsg('Cashed out ' + m.toFixed(2) + '\u00d7: +$' + fmt(pay - s.bet)); }
  };
  const pick = (i) => {
    const s = gr.current;
    if (s.ph !== 'playing' || s.open.includes(i)) return;
    if (s.mines.includes(i)) {
      walletStore.settle(s.id, 0);
      up({ ...s, ph: 'over', hit: i }); sfx.boom(); setMsg('BOOM! You lost $' + fmt(s.bet)); return;
    }
    const n = { ...s, open: [...s.open, i] };
    sfx.gem(n.open.length);
    walletStore.updateRound(s.id, { mines: n.mines, open: n.open, M: n.M, bet: n.bet });
    if (n.open.length === 25 - s.M) cash(n); else up(n);
  };

  const play = g.ph === 'playing', over = g.ph === 'over', k = g.open.length;
  const Mg = play || over ? g.M : M, mult = k ? minesMult(k, Mg) : 1, b = play || over ? g.bet : toCents(bet);
  const tiles = Array.from({ length: 25 }, (_, i) => {
    const isM = g.mines.includes(i), o = g.open.includes(i);
    return (
      <button key={i} aria-label={'Tile ' + (i + 1)} disabled={!play || o} onClick={() => pick(i)}
        className={'tile' + (o ? ' gem' : '') + (over && isM ? ' mine' + (g.hit === i ? ' hit' : '') : '') + (over && !o && !isM ? ' dim' : '')}>
        {o || (over && !isM) ? <Gem /> : over && isM ? '\ud83d\udca3' : null}
      </button>
    );
  });
  return (
    <div className="wrap">
      {win && <JackpotOverlay key={win.id} win={win} canResume={false} more={0} onClose={() => setWin(null)} />}
      <TopBar busy={play} onLobby={onLobby} onExit={onExit} />
      <div className="app">
        <div className="side">
          <BetBox bet={bet} setBet={setBet} disabled={play} />
          <div>
            <label htmlFor="mines">Mines</label>
            <select id="mines" value={M} disabled={play} onChange={(e) => setM(+e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
          </div>
          <div className="stat"><span>Safe picks</span><b>{k + ' / ' + (25 - Mg)}</b></div>
          <div className="stat"><span>Multiplier</span><b>{mult.toFixed(2)}{'\u00d7'}</b></div>
          <div className="stat"><span>Payout</span><b>${fmt(mulCents(b, mult))}</b></div>
          {play && <div className="stat"><span>Next pick</span><b>{minesMult(k + 1, Mg).toFixed(2)}{'\u00d7'}</b></div>}
          <button className="play" disabled={play || !(b > 0) || !w || b > w.bal} onClick={start}>{over ? 'New Round' : 'Start Game'}</button>
          <button className="play" disabled={!play || !k} onClick={() => cash()}>{play && k ? 'Cash Out $' + fmt(mulCents(b, mult)) : 'Cash Out'}</button>
          <div className="banner">{msg}</div>
        </div>
        <div className="stage"><div className="mgrid">{tiles}</div></div>
      </div>
    </div>
  );
}
