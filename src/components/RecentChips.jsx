import { fmtMult } from '../lib/money.js';

// Seneste resultater: [{ id, m, cls, label? }]
export default function RecentChips({ items }) {
  return (
    <div className="rec" aria-label="Recent results">
      {items.map((x) => <span key={x.id} className={x.cls}>{x.label ?? fmtMult(x.m)}</span>)}
    </div>
  );
}
