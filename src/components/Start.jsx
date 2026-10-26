import { useState } from 'react';
import { START_OPTIONS } from '../lib/config.js';
import { fmt } from '../lib/money.js';
import { walletStore } from '../lib/walletStore.js';
import { initAudio } from '../audio/engine.js';
import { detectMusic } from '../audio/music.js';

export default function Start() {
  const saved = walletStore.listProfiles();
  const [name, setName] = useState(walletStore.lastProfileName());
  const [amt, setAmt] = useState(1000);
  const ok = name.trim().length > 0;
  const exists = saved.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const begin = (fn) => { initAudio(); detectMusic(); fn(); };
  return (
    <div className="wrap">
      <div className="start">
        <h1>Plinko Casino</h1>
        <p>Create your wallet. Play money only, nothing here is real.</p>
        <div>
          <label htmlFor="pname">Your name</label>
          <input id="pname" className="num" value={name} maxLength={20} placeholder="Enter name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Starting balance</label>
          <div className="chips">
            {START_OPTIONS.map((v) => (
              <button key={v} className={'chip' + (amt === v ? ' on' : '')} aria-pressed={amt === v} onClick={() => setAmt(v)}>${v.toLocaleString('en-US')}</button>
            ))}
          </div>
        </div>
        <button className="play" disabled={!ok} onClick={() => begin(() => walletStore.create(name, amt))}>
          {exists ? 'Start new wallet (replaces saved)' : 'Start playing'}
        </button>
        {saved.length > 0 && (
          <div className="saved">
            <label>Continue as</label>
            {saved.map((p) => (
              <button key={p.name} className="chip" onClick={() => begin(() => walletStore.continueAs(p.name))}>
                {p.name} (${fmt(p.bal)})
              </button>
            ))}
          </div>
        )}
        <small className="fine">Virtual play money only. No real money is ever used.</small>
      </div>
    </div>
  );
}
