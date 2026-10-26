// Alle penge regnes i hele cent (heltal) for at undgå flydende-komma-fejl.
export const toCents = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
export const mulCents = (cents, mult) => Math.max(0, Math.round(cents * mult + 1e-9));
export const fmt = (cents) =>
  (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const centsToInput = (cents) => (Math.max(0, cents) / 100).toFixed(2);
export const fmtMult = (m) => (m >= 100 ? String(Math.round(m)) : String(+m.toFixed(2))) + '\u00d7';
