/**
 * performance.js
 * ─────────────────────────────────────────────────────────────
 * Three-step performance calculations for the DA40-D.
 *
 * The AFM chart logic (confirmed from original charts):
 *   Step 1: Enter OAT at bottom of sect1, rise to altitude curve,
 *           read distance horizontally to right.
 *   Step 2: Carry that horizontal distance into sect2, drop down
 *           to the mass reference line, read distance right.
 *   Step 3: Carry distance into sect3, move right to wind line,
 *           read final result on right axis.
 *
 * Each curve in step2/step3 data is a diagonal reference line:
 *   xs = param values (mass or wind) at each point
 *   ys = distance values at each point
 * evalCorrectionStep finds where distIn (horizontal entry)
 * intersects the bracketing curves for the given param.
 * ─────────────────────────────────────────────────────────────
 */

import { evalBilinear, evalCorrectionStep } from './interpolation.js';
import { TD_DATA } from '../data/td50ftData.js';
import { LD_DATA } from '../data/ld50ftData.js';
import { LR_DATA } from '../data/lrData.js';

/**
 * Takeoff Distance over 50ft obstacle (TODR)
 */
export function calcTODR({ pressAlt, oat, mass, wind }) {
  if (pressAlt > 10000) return { error: 'Altitude above 10 000 ft chart limit' };
  if (mass < 748 || mass > 1150) return { error: 'Mass outside chart range (748–1150 kg)' };

  const s1 = evalBilinear(TD_DATA.altBands, TD_DATA.step1, pressAlt, oat);

  const s2 = evalCorrectionStep(TD_DATA.step2, mass, s1);

  let s3;
  if (wind >= 0) {
    s3 = evalCorrectionStep(TD_DATA.step3hw, wind, s2);
  } else {
    s3 = evalCorrectionStep(TD_DATA.step3tw, Math.abs(wind), s2);
  }

  return {
    result: Math.round(s3),
    steps: { s1: Math.round(s1), s2: Math.round(s2), s3: Math.round(s3) },
  };
}

/**
 * Landing Distance over 50ft obstacle (LDR)
 */
export function calcLDR({ pressAlt, oat, mass, wind }) {
  if (pressAlt > 10000) return { error: 'Altitude above 10 000 ft chart limit' };

  const s1 = evalBilinear(LD_DATA.altBands, LD_DATA.step1, pressAlt, oat);
  const s2 = evalCorrectionStep(LD_DATA.step2, mass, s1);

  const hw = Math.max(0, wind);
  const s3 = hw > 0
    ? evalCorrectionStep(LD_DATA.step3, hw, s2)
    : s2;

  return {
    result: Math.round(s3),
    steps: { s1: Math.round(s1), s2: Math.round(s2), s3: Math.round(s3) },
  };
}

/**
 * Landing Ground Roll (LRR)
 */
export function calcLRR({ pressAlt, oat, mass, wind }) {
  if (pressAlt > 10000) return { error: 'Altitude above 10 000 ft chart limit' };

  const s1 = evalBilinear(LR_DATA.altBands, LR_DATA.step1, pressAlt, oat);
  const s2 = evalCorrectionStep(LR_DATA.step2, mass, s1);

  const hw = Math.max(0, wind);
  const s3 = hw > 0
    ? evalCorrectionStep(LR_DATA.step3, hw, s2)
    : s2;

  const result = Math.round(s3);
  if (result < 50 || result > 1600) return { error: 'Result outside chart range' };

  return {
    result,
    steps: { s1: Math.round(s1), s2: Math.round(s2), s3: Math.round(s3) },
  };
}

/**
 * Apply correction factors (slope, surface, safety)
 */
export function applyFactors(rawDist, factors, phase) {
  const { slope, condition, surface, safety } = factors;

  const slopeSign   = phase === 'takeoff' ? 1 : -1;
  const slopeFactor = 1 + slopeSign * Number(slope) * 0.05;

  let condFactor = 1;
  if (condition === 'Wet') {
    if (phase === 'takeoff') condFactor = surface === 'Hard' ? 1 : 1.1;
    else condFactor = surface === 'Hard' ? 1.15 : 1.2;
  }

  const surfMap = { 'Short Grass': 1.1, 'Medium Grass': 1.15, 'Long Grass': 1.25 };
  const surfFactor = surfMap[surface] ?? 1;

  const safetyMap = { 'None': 1, '× 1.15': 1.15, '× 1.25': 1.25, '× 1.33': 1.33 };
  const safetyFactor = safetyMap[safety] ?? 1;

  const overall   = slopeFactor * condFactor * surfFactor * safetyFactor;
  const corrected = Math.round(rawDist * overall);

  return {
    corrected,
    overall: Math.round(overall * 100) / 100,
    breakdown: { slopeFactor, condFactor, surfFactor, safetyFactor },
  };
}
