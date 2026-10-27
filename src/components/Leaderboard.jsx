import { useEffect, useState } from 'react';
import { fmt } from '../lib/money.js';
import { SORTS, fetchLeaderboard } from '../lib/cloud.js';
import { useWallet } from '../hooks/useStores.js';

const COLS = { money: 'balance', won: 'total_won', lost: 'total_lost' };

export default function Leaderboard({ onClose }) {
  const w = useWallet();
  const [sort, setSort] = useState('money'); // standard: flest penge
  const [data, setData] = useState({ rows: [], myRank: null });
  const [state, setState] = useState('loading');
  const [err, setErr] = useState('');
  const [n, setN] = useState(0);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setState('loading');
    fetchLeaderboard(sort).then((d) => { if (live) { setData(d); setState('ok'); } })
      .catch((e) => { if (live) { setErr(e.message); setState('error'); } });
    return () => { live = false; };
  }, [sort, n]);

  const me = w && w.name.toLowerCase();
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Leaderboard" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>{'\ud83c\udfc6'} Leaderboard</b><button onClick={onClose} aria-label="Close">{'\u2715'}</button></div>
        <div className="lb-tabs" role="tablist">
          {Object.entries(SORTS).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={sort === k} className={'chip' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>{v.label}</button>
          ))}
          <button className="chip" onClick={() => setN((x) => x + 1)} aria-label="Refresh">{'\u21bb'}</button>
        </div>
        <div className="htable" tabIndex={0}>
          {state === 'loading' && <p className="empty">Loading...</p>}
          {state === 'error' && <p className="empty down">{err}</p>}
          {state === 'ok' && (data.rows.length === 0 ? <p className="empty">No players yet.</p> : (
            <table>
              <thead><tr><th>#</th><th>Player</th>
                {Object.entries(COLS).map(([k, c]) => <th key={k} className={sort === k ? 'sorted' : ''}>{k === 'money' ? 'Money' : k === 'won' ? 'Won' : 'Lost'}</th>)}
                <th>Rounds</th></tr></thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.username} className={r.username.toLowerCase() === me ? 'me' : ''}>
                    <td>{['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'][i] || i + 1}</td>
                    <td>{r.username}</td>
                    {Object.entries(COLS).map(([k, c]) => <td key={k} className={sort === k ? 'sorted' : ''}>${fmt(r[c])}</td>)}
                    <td>{r.rounds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        <div className="modal-foot">
          <small>{data.myRank ? `Your rank: #${data.myRank} · ` : ''}Top 50 · Won/Lost = sum of net wins/losses per round</small>
        </div>
      </div>
    </div>
  );
}
