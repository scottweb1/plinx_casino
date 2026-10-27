import { useEffect, useRef, useState } from 'react';
import { PAYTABLE, ROWS, RISKS, isEdge, col, label, randomDirs, offsets } from './plinkoMath.js';
import PlinkoBoard from './PlinkoBoard.jsx';
import TopBar from '../../components/TopBar.jsx';
import BetBox from '../../components/BetBox.jsx';
import JackpotOverlay from '../../components/JackpotOverlay.jsx';
import { AutoFields, AutoButton, TurboChip } from '../../components/AutoPanel.jsx';
import { useAuto } from '../../hooks/useAuto.js';
import { useWallet, useSettings } from '../../hooks/useStores.js';
import { walletStore } from '../../lib/walletStore.js';
import { toCents, mulCents, fmt } from '../../lib/money.js';
import { tierFor } from '../../lib/config.js';
import { randFloat, randRange } from '../../lib/rng.js';
import { applyDevLuck } from '../../dev/devLuck.js';
import { sfx } from '../../audio/sfx.js';
import { fx } from '../../effects/fxBus.js';

export default function Plinko({ onLobby, onExit }) {
  const w = useWallet();
  const { turbo } = useSettings();
  const [mode, setMode] = useState('manual');
  const [bet, setBet] = useState('10.00');
  const [risk, setRisk] = useState('Medium');
  const [rows, setRows] = useState(16);
  const [hist, setHist] = useState([]);
  const [jq, setJq] = useState([]);
  const [live, setLive] = useState(0);
  const [msg, setMsg] = useState('');
  const auto = useAuto();
  const board = useRef(null), jqR = useRef([]), cfg = useRef({}), dropRef = useRef(null);
  cfg.current = { bet, risk, rows, turbo };
  jqR.current = jq;

  // Afgør udfaldet, trækker indsatsen og sender kuglen af sted. Returnerer false hvis det ikke kan.
  const drop = () => {
    const c = cfg.current, stake = toCents(c.bet);
    if (!stake || jqR.current.length) return false;
    const dirs = applyDevLuck(walletStore.getState()?.name, c.rows, c.risk, randomDirs(c.rows)), k = dirs.reduce((a, b) => a + b, 0);
    const mult = PAYTABLE[c.rows][c.risk][k], payout = mulCents(stake, mult);
    const id = walletStore.placeBet('plinko', stake, { escrow: payout });
    if (!id) return false;
    const jx = Array.from({ length: c.rows + 1 }, (_, i) => (i === 0 || i === c.rows ? 0 : randRange(-2.5, 2.5)));
    const bn = Array.from({ length: c.rows }, () => randRange(2, 5));
    board.current.drop({ id, dirs, off: offsets(dirs), k, rows: c.rows, risk: c.risk, stake, payout, mult, sp: (c.turbo ? 2.4 : 1) * (0.95 + randFloat() * 0.1), jx, bn });
    setLive((n) => n + 1); setMsg(''); sfx.drop();
    return true;
  };
  dropRef.current = drop;

  const onLand = (b) => {
    if (!walletStore.settle(b.id, b.payout)) return; // allerede afregnet: ingen dobbeltbetaling
    setLive((n) => Math.max(0, n - 1));
    sfx.land(b.k, b.rows);
    setHist((h) => [{ id: b.id, m: b.mult, c: col(b.k, b.rows) }, ...h].slice(0, 4));
    const net = b.payout - b.stake;
    if (auto.note(net)) setMsg('Auto stopped: limit reached');
    if (isEdge(b.k, b.rows)) {
      setJq((q) => [...q, { id: b.id, m: b.mult, bet: b.stake, payout: b.payout, net, tier: tierFor(b.mult, 0) }]);
      auto.pause();
    } else if (b.mult >= 1.5) {
      sfx.win(b.mult);
      fx.pop('+$' + fmt(net), 0.5, 0.3, b.mult >= 5 ? 2 : 1);
      if (b.mult >= 10) fx.coinBurst(1.5, 0.5, 0.55);
    }
  };

  useEffect(() => {
    if (!auto.on) return;
    const id = setInterval(() => {
      if (!auto.take()) return;
      if (!dropRef.current()) { auto.stop(); setMsg('Auto stopped: cannot place bet'); return; }
      if (auto.remaining() <= 0) auto.stop();
    }, turbo ? 260 : 650);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.on, turbo]);
  useEffect(() => () => walletStore.flushEscrow('plinko'), []);

  const stake = toCents(bet), bad = stake <= 0, broke = !!w && stake > w.bal;
  const lock = auto.on || live > 0, busy = lock || jq.length > 0;
  const play = () => {
    if (mode === 'manual') { if (!drop()) setMsg(broke ? 'Insufficient balance' : ''); return; }
    if (auto.on) { auto.stop(); return; }
    auto.start();
    if (auto.take()) { if (!drop()) auto.stop(); else if (auto.remaining() <= 0) auto.stop(); }
  };
  const closeWin = (resume) => { setJq((q) => q.slice(1)); if (resume) auto.resume(); };

  return (
    <div className="wrap">
      {jq[0] && <JackpotOverlay key={jq[0].id} win={jq[0]} canResume={auto.canResume()} more={jq.length - 1} onClose={closeWin} />}
      <TopBar busy={busy} onLobby={onLobby} onExit={onExit} />
      <div className="app">
        <div className="side">
          <div className="tabs">
            {['manual', 'auto'].map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} disabled={auto.on} onClick={() => { setMode(m); auto.stop(); }}>{m === 'manual' ? 'Manual' : 'Auto'}</button>
            ))}
          </div>
          <BetBox bet={bet} setBet={setBet} disabled={auto.on} />
          <div>
            <label htmlFor="risk">Risk</label>
            <select id="risk" value={risk} disabled={lock} onChange={(e) => setRisk(e.target.value)}>{RISKS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div>
            <label htmlFor="rows">Rows</label>
            <select id="rows" value={rows} disabled={lock} onChange={(e) => setRows(+e.target.value)}>{ROWS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div className="chips2"><TurboChip /></div>
          {mode === 'auto' && <AutoFields auto={auto} nLabel={"Bets (0 = \u221e)"} />}
          {mode === 'manual'
            ? <button className="play" disabled={jq.length > 0 || bad || broke} onClick={play}>Play</button>
            : <AutoButton auto={auto} canStart={!bad && !broke && !jq.length} onStart={play} />}
          <div className="msg">{broke ? 'Insufficient balance' : bad ? 'Enter an amount' : msg}</div>
        </div>
        <div className="stage">
          <PlinkoBoard ref={board} rows={rows} risk={risk} onPin={(n) => sfx.bling(n)} onLand={onLand} />
          <div className="hist">{hist.map((x) => <div key={x.id} style={{ background: x.c }}>{label(x.m)}</div>)}</div>
        </div>
      </div>
    </div>
  );
}
