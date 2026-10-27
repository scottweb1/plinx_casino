import { useEffect, useRef, useState } from 'react';
import { settingsStore } from '../lib/settingsStore.js';
import { initAudio } from '../audio/engine.js';
import { useSettings, useMusicAvailable } from '../hooks/useStores.js';

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

// Lyd-menu i navigationen: ikon-knap der åbner Sound on/off, lydstyrke og (hvis 1.mp3 findes) musik.
export default function SoundMenu() {
  const s = useSettings();
  const musicAvail = useMusicAvailable();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const muted = !s.sound || s.volume === 0;
  return (
    <div className="nav-item" ref={ref}>
      <button className={'nav-btn' + (open ? ' open' : '') + (muted ? ' muted' : '')} aria-haspopup="true" aria-expanded={open} aria-label="Sound settings" title="Sound" onClick={() => { initAudio(); setOpen(!open); }}>
        <Svg>
          <path d="M11 5 6 9H3v6h3l5 4z" />
          {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" />{s.volume > 0.5 && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}</>}
        </Svg>
        <span>Sound</span>
      </button>
      {open && (
        <div className="nav-pop" role="group" aria-label="Sound settings">
          <label className="nav-switch">
            <span>Sound</span>
            <input type="checkbox" checked={s.sound} onChange={() => { initAudio(); settingsStore.set({ sound: !s.sound }); }} />
            <i aria-hidden="true" />
          </label>
          <div className="nav-vol">
            <span>Volume</span>
            <input type="range" min="0" max="1" step="0.05" value={s.volume} aria-label="Volume" disabled={!s.sound}
              onChange={(e) => { initAudio(); settingsStore.set({ volume: +e.target.value }); }} />
            <b>{Math.round(s.volume * 100)}%</b>
          </div>
          {musicAvail && (
            <label className="nav-switch">
              <span>Music</span>
              <input type="checkbox" checked={s.music} onChange={() => { initAudio(); settingsStore.set({ music: !s.music }); }} />
              <i aria-hidden="true" />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
