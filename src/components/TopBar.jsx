import { useEffect, useRef, useState } from 'react';
import '../styles/nav.css';
import { fmt } from '../lib/money.js';
import { walletStore } from '../lib/walletStore.js';
import { useWallet } from '../hooks/useStores.js';
import { useCloud } from '../lib/cloud.js';
import SoundMenu from './SoundControls.jsx';
import HistoryModal from './HistoryModal.jsx';
import Leaderboard from './Leaderboard.jsx';

const ICONS = {
  lobby: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  refill: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  logout: <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
);
const NavBtn = ({ icon, label, ...p }) => (
  <button className="nav-btn" title={label} aria-label={label} {...p}><Icon name={icon} /><span>{label}</span></button>
);

// busy = en runde kører; så er navigation, refill og log ud låst.
export default function TopBar({ busy = false, onLobby, onExit }) {
  const w = useWallet();
  const cloud = useCloud();
  const [hist, setHist] = useState(false), [lb, setLb] = useState(false), [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState('');
  const prev = useRef(w ? w.bal : 0), menuRef = useRef(null);
  const bal = w ? w.bal : 0;

  // Saldoen blinker grønt ved gevinst og rødt ved tab
  useEffect(() => {
    if (bal === prev.current) return;
    setFlash(bal > prev.current ? 'up' : 'down');
    prev.current = bal;
    const t = setTimeout(() => setFlash(''), 700);
    return () => clearTimeout(t);
  }, [bal]);

  useEffect(() => {
    if (!menu) return;
    const down = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    const key = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [menu]);

  if (!w) return null;
  const pl = w.bal - w.base;
  const sync = !w.cloud ? null : cloud.status === 'error' ? ['err', 'Sync problem (retrying)'] : cloud.status === 'syncing' || w.dirty ? ['sync', 'Saving...'] : ['ok', 'Saved online'];
  const brand = (
    <>
      <span className="nav-logo" aria-hidden="true">
        <svg viewBox="0 0 32 32"><circle cx="16" cy="9" r="5" fill="#ff2d6f" /><g fill="#ffd23f"><circle cx="8" cy="21" r="2.4" /><circle cx="16" cy="21" r="2.4" /><circle cx="24" cy="21" r="2.4" /><circle cx="12" cy="27" r="2.4" /><circle cx="20" cy="27" r="2.4" /></g></svg>
      </span>
      <span className="nav-name">Plinko<em>Casino</em></span>
    </>
  );

  return (
    <header className="nav">
      {onLobby
        ? <button className="nav-brand" disabled={busy} onClick={onLobby} aria-label="Back to lobby">{brand}</button>
        : <div className="nav-brand static">{brand}</div>}

      <div className={'nav-bal ' + flash} aria-live="polite">
        <span className="nb-l">Balance</span>
        <b className="nb-v" data-testid="balance">${fmt(w.bal)}</b>
        <span className={'nb-pl ' + (pl >= 0 ? 'up' : 'down')} data-testid="pl">{pl >= 0 ? '+' : '-'}${fmt(Math.abs(pl))}</span>
      </div>

      <nav className="nav-actions" aria-label="Main">
        {onLobby && <NavBtn icon="lobby" label="Lobby" disabled={busy} onClick={onLobby} />}
        <NavBtn icon="history" label="History" onClick={() => setHist(true)} />
        {w.cloud && <NavBtn icon="trophy" label="Leaderboard" onClick={() => setLb(true)} />}
        <SoundMenu />
        <div className="nav-item" ref={menuRef}>
          <button className={'nav-user' + (menu ? ' open' : '')} aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <span className="nav-avatar">{w.name.slice(0, 1).toUpperCase()}{sync && <i className={'dot ' + sync[0]} />}</span>
            <span className="nav-uname">{w.name}</span>
            <Icon name="chevron" />
          </button>
          {menu && (
            <div className="nav-pop" role="menu">
              <div className="nav-pop-head">
                <b>{w.name}</b>
                <small>{w.cloud ? 'Online account' : 'Offline wallet, this device only'}</small>
                {sync && <small className={'nav-sync ' + sync[0]}><i className={'dot ' + sync[0]} /> {sync[1]}</small>}
              </div>
              {/* Skjult refill: ingen tekst, men knappen har stadig en klikbar plads i menuen. Menuen bliver åben, så man kan trykke flere gange. */}
              <button type="button" className="nav-menu-item ghost" aria-hidden="true" tabIndex={-1} disabled={busy} onClick={() => walletStore.topUp()} />
              <button role="menuitem" className="nav-menu-item danger" disabled={busy} onClick={() => { setMenu(false); onExit(); }}>
                <Icon name="logout" /> {w.cloud ? 'Log out' : 'Switch player'}
              </button>
            </div>
          )}
        </div>
      </nav>

      {hist && <HistoryModal onClose={() => setHist(false)} />}
      {lb && <Leaderboard onClose={() => setLb(false)} />}
    </header>
  );
}
