/**
 * engine/index.js — public API
 * UI components import only from here, never from engine internals.
 */
export { calcTODR, calcLDR, calcLRR, applyFactors } from './performance.js';
export { calcMassBalance, calcAirspeeds, pressureAltitude, windComponents, AIRCRAFT_LIST } from './massBalance.js';
