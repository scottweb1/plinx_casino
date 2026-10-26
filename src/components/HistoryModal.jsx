import { useEffect } from 'react';
import { fmt, fmtMult } from '../lib/money.js';
import { walletStore } from '../lib/walletStore.js';
import { useWallet } from '../hooks/useStores.js';

const NAMES = { plinko: 'Plinko', mines: 'Mines', slots: 'Slots', limbo: 'Limbo', wheel: 'Wheel', coinflip: 'Coinflip' };

export default function HistoryModal({ onClose }) {
  const w = useWallet();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const h = w ? w.history : [];
  const wagered = h.reduce((a, x) => a + x.stake, 0);
  const net = h.reduce((a, x) => a + x.payout - x.stake, 0);
  const best = h.reduce((a, x) => Math.max(a, x.payout - x.stake), 0);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="History" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>History</b><button onClick={onClose} aria-label="Close">{'\u2715'}</button></div>
        <div className="hstats">
          <div><span>Rounds</span><b>{h.length}</b></div>
          <div><span>Wagered</span><b>${fmt(wagered)}</b></div>
          <div><span>Net</span><b className={net >= 0 ? 'up' : 'down'}>{net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}</b></div>
          <div><span>Best win</span><b>${fmt(best)}</b></div>
        </div>
        <div className="htable" tabIndex={0}>
          {h.length === 0 ? <p className="empty">No rounds yet. Play a game and your results show up here.</p> : (
            <table>
              <thead><tr><th>Game</th><th>Bet</th><th>Mult</th><th>Payout</th><th>Net</th></tr></thead>
              <tbody>
                {h.map((x) => {
                  const n = x.payout - x.stake;
                  return (
                    <tr key={x.id}>
                      <td>{NAMES[x.game] || x.game}{x.note ? <i> ({x.note})</i> : null}</td>
                      <td>${fmt(x.stake)}</td><td>{fmtMult(x.mult)}</td><td>${fmt(x.payout)}</td>
                      <td className={n >= 0 ? 'up' : 'down'}>{n >= 0 ? '+' : '-'}${fmt(Math.abs(n))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-foot">
          <small>Last {h.length} of max 200 rounds. Play money only.</small>
          <button disabled={!h.length} onClick={() => walletStore.clearHistory()}>Clear history</button>
        </div>
      </div>
    </div>
  );
}
