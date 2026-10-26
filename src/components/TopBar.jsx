import { useState } from 'react';
import { fmt } from '../lib/money.js';
import { walletStore } from '../lib/walletStore.js';
import { useWallet } from '../hooks/useStores.js';
import SoundControls from './SoundControls.jsx';
import HistoryModal from './HistoryModal.jsx';

// busy = en runde kører; så er navigation og refill låst.
export default function TopBar({ busy = false, onLobby, onExit }) {
  const w = useWallet();
  const [hist, setHist] = useState(false);
  if (!w) return null;
  const pl = w.bal - w.base;
  return (
    <div className="top">
      <span className="who">Wallet: <b>{w.name}</b> (play money)</span>
      <div className="wallet">
        <span>Balance <b className="bal" data-testid="balance">${fmt(w.bal)}</b></span>
        <span className={'pl' + (pl >= 0 ? ' up' : '')} data-testid="pl">{pl >= 0 ? '+' : '-'}${fmt(Math.abs(pl))}</span>
        <SoundControls />
        <button onClick={() => setHist(true)}>History</button>
        <button disabled={busy} onClick={() => walletStore.topUp()} title="Add your starting amount in play money">Refill +${fmt(w.start)}</button>
        {onLobby && <button disabled={busy} onClick={onLobby}>Lobby</button>}
        <button disabled={busy} onClick={onExit}>Switch player</button>
      </div>
      {hist && <HistoryModal onClose={() => setHist(false)} />}
    </div>
  );
}
