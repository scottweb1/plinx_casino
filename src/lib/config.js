// Fælles konfiguration. Alle beløb i spillet er VIRTUELLE legepenge.
export const START_OPTIONS = [500, 1000, 10000, 50000];
export const HISTORY_MAX = 200;

export const JP = {
  teaseMs: 4000,
  teaseTurboMs: 1600,
  edge: 2, // Plinko: de yderste 2 felter i hver side udløser jackpot
  mega: 25,
  epic: 100,
  count: { big: 1500, mega: 2400, epic: 3400 },
  n: { big: 1, mega: 1.8, epic: 3 },
};

// Tier ud fra multiplikator. bigMin er den laveste multiplikator der giver "big".
export const tierFor = (m, bigMin = 20) =>
  m >= JP.epic ? 'epic' : m >= JP.mega ? 'mega' : m >= bigMin ? 'big' : null;
