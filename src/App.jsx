import { useEffect, useState } from 'react';
import Start from './components/Start.jsx';
import Lobby from './components/Lobby.jsx';
import GoldDust from './components/GoldDust.jsx';
import FxLayer from './components/FxLayer.jsx';
import Plinko from './games/plinko/Plinko.jsx';
import Mines from './games/mines/Mines.jsx';
import Slots from './games/slots/Slots.jsx';
import Limbo from './games/limbo/Limbo.jsx';
import Wheel from './games/wheel/Wheel.jsx';
import Coinflip from './games/coinflip/Coinflip.jsx';
import { useWallet } from './hooks/useStores.js';
import { walletStore } from './lib/walletStore.js';
import { restoreSession, signOut } from './lib/cloud.js';
import { initAudio } from './audio/engine.js';
import { detectMusic, syncMusic } from './audio/music.js';
import { sfx } from './audio/sfx.js';

const GAMES = { plinko: Plinko, mines: Mines, slots: Slots, limbo: Limbo, wheel: Wheel, coinflip: Coinflip };

if (import.meta.env.DEV) window.__casino = { walletStore };

export default function App() {
  const w = useWallet();
  const [view, setView] = useState('lobby');
  const [booting, setBooting] = useState(true);
  useEffect(() => { restoreSession().finally(() => setBooting(false)); }, []);

  // Kliklyd på alle knapper + lyd låses op ved første berøring
  useEffect(() => {
    const click = (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (b && !b.disabled && !b.closest('.jp')) { initAudio(); sfx.click(); }
    };
    const first = () => { initAudio(); detectMusic().then(syncMusic); };
    document.addEventListener('click', click);
    document.addEventListener('pointerdown', first, { once: true });
    return () => { document.removeEventListener('click', click); document.removeEventListener('pointerdown', first); };
  }, []);

  const exit = async () => { if (w && w.cloud) await signOut(); else walletStore.logout(); setView('lobby'); };
  let page;
  if (booting && !w) page = <div className="wrap"><p className="boot">Loading...</p></div>;
  else if (!w) page = <Start />;
  else if (view === 'lobby') page = <Lobby go={setView} onExit={exit} />;
  else {
    const Game = GAMES[view];
    page = <Game key={view} onLobby={() => setView('lobby')} onExit={exit} />;
  }
  return <><GoldDust />{page}<FxLayer /></>;
}
