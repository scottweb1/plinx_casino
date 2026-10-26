import { walletStore } from '../lib/walletStore.js';
import TopBar from './TopBar.jsx';

const GAMES = [
  ['plinko', 'Plinko', 'Drop the ball and chase up to 1000\u00d7.', '\ud83d\udd34', 'linear-gradient(135deg,#1b3a52,#0f212e)'],
  ['mines', 'Mines', 'Find the gems, dodge the mines, cash out in time.', '\ud83d\udc8e', 'linear-gradient(135deg,#0f4a40,#0f212e)'],
  ['slots', 'Slots', 'Five reels, five lines, and a shot at the big one.', '7\ufe0f\u20e3', 'linear-gradient(135deg,#5a3a08,#1a1030)'],
  ['limbo', 'Limbo', 'Set your target multiplier and beat the roll.', '\ud83d\ude80', 'linear-gradient(135deg,#0d3b5c,#0f212e)'],
  ['coinflip', 'Coinflip', 'Heads, tails or the rare edge. 2\u00d7 on a side, 4\u00d7 on the edge.', '\ud83e\ude99', 'linear-gradient(135deg,#4a3a0a,#0f212e)'],
  ['wheel', 'Spin the Wheel', 'Spin the big wheel and land on a multiplier.', '\ud83c\udfa1', 'linear-gradient(135deg,#5c1230,#1a1030)'],
];

export default function Lobby({ go, onExit }) {
  const resume = !!walletStore.findRound('mines');
  return (
    <div className="wrap">
      <TopBar onExit={onExit} />
      <div className="lobby">
        {GAMES.map(([id, t, d, e, bg]) => (
          <button key={id} className="card" onClick={() => go(id)}>
            <div className="thumb" style={{ background: bg }}><span className="emoji">{e}</span></div>
            <b>{t}</b>
            <span>{d}</span>
            {id === 'mines' && resume && <em className="badge">Round in progress</em>}
          </button>
        ))}
      </div>
    </div>
  );
}
