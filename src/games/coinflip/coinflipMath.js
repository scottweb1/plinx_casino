import { randInt } from '../../lib/rng.js';

// Tre sider: Heads 40 %, Tails 40 %, Edge 20 %. Hver side er 4 af 10 / 2 af 10.
// Heads/Tails betaler 2x. Edge betaler 4x, så alle tre valg har samme forventede tilbagebetaling (80 %).
export const SIDES = {
  heads: { label: 'Heads', chance: 0.4, mult: 2, slots: 4 },
  tails: { label: 'Tails', chance: 0.4, mult: 2, slots: 4 },
  edge: { label: 'Edge', chance: 0.2, mult: 4, slots: 2 },
};
export const SIDE_KEYS = ['heads', 'tails', 'edge'];

// Præcis 40/40/20 ud fra et tal 0..9
export const sideFromRoll = (n) => (n < 4 ? 'heads' : n < 8 ? 'tails' : 'edge');
export const rollSide = () => sideFromRoll(randInt(10));
export const coinRtp = (pick) => SIDES[pick].chance * SIDES[pick].mult;
