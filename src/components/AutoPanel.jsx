import { settingsStore } from '../lib/settingsStore.js';
import { useSettings } from '../hooks/useStores.js';

export const TurboChip = () => {
  const { turbo } = useSettings();
  return <button className={'chip' + (turbo ? ' on' : '')} aria-pressed={turbo} onClick={() => settingsStore.set({ turbo: !turbo })}>Turbo {turbo ? 'on' : 'off'}</button>;
};

// Felter for Auto Play: antal runder, stop ved gevinst og stop ved tab (i dollars).
export function AutoFields({ auto, nLabel = 'Rounds' }) {
  const num = (k) => (e) => auto.setCfg({ ...auto.cfg, [k]: e.target.value.replace(/[^0-9.]/g, '') });
  return (
    <div className="chips2 autof">
      {[['n', nLabel], ['w', 'Stop win $'], ['l', 'Stop loss $']].map(([k, t]) => (
        <div key={k} style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor={'auto-' + k}>{t}</label>
          <input id={'auto-' + k} className="num" style={{ padding: 8 }} inputMode="decimal" value={auto.cfg[k]} disabled={auto.on} onChange={num(k)} />
        </div>
      ))}
    </div>
  );
}

// Start/Stop-knap til Auto Play
export function AutoButton({ auto, canStart, onStart }) {
  return (
    <button className={'play' + (auto.on ? ' stop' : '')} disabled={!auto.on && !canStart} onClick={() => (auto.on ? auto.stop() : onStart())}>
      {auto.on ? 'Stop Auto' : 'Start Auto'}
    </button>
  );
}
