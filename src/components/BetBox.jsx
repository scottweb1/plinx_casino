import { toCents, centsToInput } from '../lib/money.js';
import { useWallet } from '../hooks/useStores.js';

// bet er en tekststreng (f.eks. "10.00"). Hjælpeknapper: ½, 2×, Max.
export default function BetBox({ bet, setBet, disabled }) {
  const w = useWallet();
  const c = toCents(bet);
  const set = (cents) => setBet(centsToInput(Math.min(Math.max(0, cents), w ? w.bal : cents)));
  return (
    <div>
      <label htmlFor="bet">Amount</label>
      <div className="amt">
        <div className="in">
          <input id="bet" value={bet} inputMode="decimal" disabled={disabled} onChange={(e) => setBet(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={() => c > 0 && set(c)} />
          <span className="coin">$</span>
        </div>
        <button disabled={disabled} onClick={() => set(Math.round(c / 2))} aria-label="Halve bet">{'\u00bd'}</button>
        <button disabled={disabled} onClick={() => set(c * 2)} aria-label="Double bet">2{'\u00d7'}</button>
        <button disabled={disabled} onClick={() => set(w ? w.bal : c)} aria-label="Max bet">Max</button>
      </div>
    </div>
  );
}
