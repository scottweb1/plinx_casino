import { useState } from 'react';
import { START_OPTIONS } from '../lib/config.js';
import { fmt } from '../lib/money.js';
import { walletStore } from '../lib/walletStore.js';
import { cloudEnabled } from '../lib/supabase.js';
import { signIn, signUp } from '../lib/cloud.js';
import { initAudio } from '../audio/engine.js';
import { detectMusic } from '../audio/music.js';

export default function Start() {
  const [tab, setTab] = useState(cloudEnabled ? 'login' : 'offline');
  const [name, setName] = useState(walletStore.lastProfileName());
  const [pw, setPw] = useState('');
  const [amt, setAmt] = useState(1000);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const saved = walletStore.listProfiles();
  const exists = saved.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const unlock = () => { initAudio(); detectMusic(); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true); unlock();
    try {
      if (tab === 'login') await signIn(name, pw);
      else if (tab === 'signup') await signUp(name, pw, amt);
      else walletStore.create(name, amt);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  const chips = (
    <div>
      <label>Starting balance</label>
      <div className="chips">
        {START_OPTIONS.map((v) => (
          <button type="button" key={v} className={'chip' + (amt === v ? ' on' : '')} aria-pressed={amt === v} onClick={() => setAmt(v)}>${v.toLocaleString('en-US')}</button>
        ))}
      </div>
    </div>
  );
  const labels = { login: 'Log in', signup: 'Create account', offline: 'Play offline' };
  const go = { login: 'Log in', signup: 'Create account', offline: exists ? 'Start new wallet (replaces saved)' : 'Start playing' }[tab];

  return (
    <div className="wrap">
      <form className="start" onSubmit={submit}>
        <h1>Plinko Casino</h1>
        <p>Play money only, nothing here is real.</p>
        {cloudEnabled && (
          <div className="tabs" role="tablist">
            {['login', 'signup', 'offline'].map((t) => (
              <button type="button" role="tab" aria-selected={tab === t} key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setErr(''); }}>{labels[t]}</button>
            ))}
          </div>
        )}
        <div>
          <label htmlFor="pname">{tab === 'offline' ? 'Your name' : 'Username'}</label>
          <input id="pname" className="num" value={name} maxLength={16} autoComplete="username" autoCapitalize="off" spellCheck={false} placeholder="Enter name" onChange={(e) => setName(e.target.value)} />
        </div>
        {tab !== 'offline' && (
          <div>
            <label htmlFor="ppw">Password</label>
            <input id="ppw" className="num" type="password" value={pw} maxLength={72} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 6 characters" onChange={(e) => setPw(e.target.value)} />
          </div>
        )}
        {tab !== 'login' && chips}
        {tab === 'signup' && <small className="fine warn">No email is used. If you lose your password, the account cannot be recovered.</small>}
        {err && <div className="msg" role="alert">{err}</div>}
        <button className="play" type="submit" disabled={busy || !name.trim() || (tab !== 'offline' && pw.length < 1)}>{busy ? 'Please wait...' : go}</button>
        {tab === 'offline' && saved.length > 0 && (
          <div className="saved">
            <label>Continue as</label>
            {saved.map((p) => (
              <button type="button" key={p.name} className="chip" onClick={() => { unlock(); walletStore.continueAs(p.name); }}>{p.name} (${fmt(p.bal)})</button>
            ))}
          </div>
        )}
        {tab === 'offline' && cloudEnabled && <small className="fine">Offline wallets stay on this device and are not on the leaderboard.</small>}
        <small className="fine">Virtual play money only. No real money is ever used.</small>
      </form>
    </div>
  );
}
