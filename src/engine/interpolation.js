/**
 * interpolation.js
 * Core math engine — works on digitised AFM curve data.
 */

/**
 * Evaluate a curve {xs, ys} at xVal. Handles both ascending and
 * descending x-axes. Clamps at boundary values.
 */
export function evalCurve(curve, xVal) {
  const { xs, ys } = curve;
  const n = xs.length;
  if (n === 0) return 0;
  if (n === 1) return ys[0];

  const ascending = xs[n - 1] > xs[0];
  if (ascending) {
    if (xVal <= xs[0])     return ys[0];
    if (xVal >= xs[n - 1]) return ys[n - 1];
  } else {
    if (xVal >= xs[0])     return ys[0];
    if (xVal <= xs[n - 1]) return ys[n - 1];
  }

  for (let i = 0; i < n - 1; i++) {
    const x1 = xs[i], x2 = xs[i + 1];
    const y1 = ys[i], y2 = ys[i + 1];
    if ((xVal >= x1 && xVal <= x2) || (xVal >= x2 && xVal <= x1)) {
      if (x2 === x1) return y1;
      return y1 + (y2 - y1) * (xVal - x1) / (x2 - x1);
    }
  }
  return ys[n - 1];
}

/**
 * Bilinear interpolation across altitude bands.
 */
export function evalBilinear(altBands, curves, alt, xVal) {
  const n = altBands.length;
  if (alt <= altBands[0])     return evalCurve(curves[0], xVal);
  if (alt >= altBands[n - 1]) return evalCurve(curves[n - 1], xVal);

  for (let i = 0; i < n - 1; i++) {
    if (alt >= altBands[i] && alt <= altBands[i + 1]) {
      const y1 = evalCurve(curves[i],     xVal);
      const y2 = evalCurve(curves[i + 1], xVal);
      return y1 + (y2 - y1) * (alt - altBands[i]) / (altBands[i + 1] - altBands[i]);
    }
  }
  return evalCurve(curves[n - 1], xVal);
}

/**
 * AFM Step 2 / Step 3 correction.
 *
 * Each reference curve (TM/HW/W) is a diagonal line on the AFM chart:
 *   xs = param values (mass kg descending 1150→750, or wind kts 0→20)
 *   ys = distance values along the diagonal
 *
 * The construction logic (read from the AFM charts):
 *   - Step 2 ENTRY: the left edge of step2 is at mass = xs[0] (=1150 kg)
 *     distIn is the horizontal line from step1. Find which two TM curves
 *     bracket distIn at mass=xs[0] (the entry side). Compute the fraction.
 *     Apply that same fraction to find the output at paramVal (actual mass).
 *
 *   - Step 3 ENTRY: the left edge of step3 is at wind = xs[0] (=0 kts)
 *     Same logic: find fraction at wind=0, apply to actual wind value.
 *
 * @param {Array<{xs,ys}>} curves - reference diagonal lines
 * @param {number} paramVal       - actual mass (kg) or headwind (kts)
 * @param {number} distIn         - distance from previous step
 * @returns {number}
 */
export function evalCorrectionStep(curves, paramVal, distIn) {
  const n = curves.length;
  if (n === 0) return distIn;

  // Entry param = first xs value of any curve (they all share the same param axis)
  // For step2: entry at mass=1150 (xs[0]). For step3: entry at wind=0 (xs[0]).
  const entryParam = curves[0].xs[0];

  // Evaluate each curve at the entry side to find fraction
  const distAtEntry = curves.map(c => evalCurve(c, entryParam));

  // Find which two curves bracket distIn at the entry side
  const ascending = distAtEntry[n - 1] > distAtEntry[0];
  let frac, loIdx, hiIdx;

  if (ascending) {
    if (distIn <= distAtEntry[0])     { frac = 0; loIdx = 0; hiIdx = 0; }
    else if (distIn >= distAtEntry[n-1]) { frac = 1; loIdx = n-1; hiIdx = n-1; }
    else {
      for (let i = 0; i < n - 1; i++) {
        if (distIn >= distAtEntry[i] && distIn <= distAtEntry[i+1]) {
          const span = distAtEntry[i+1] - distAtEntry[i];
          frac = span === 0 ? 0 : (distIn - distAtEntry[i]) / span;
          loIdx = i; hiIdx = i + 1; break;
        }
      }
    }
  } else {
    if (distIn >= distAtEntry[0])     { frac = 0; loIdx = 0; hiIdx = 0; }
    else if (distIn <= distAtEntry[n-1]) { frac = 1; loIdx = n-1; hiIdx = n-1; }
    else {
      for (let i = 0; i < n - 1; i++) {
        if (distIn <= distAtEntry[i] && distIn >= distAtEntry[i+1]) {
          const span = distAtEntry[i+1] - distAtEntry[i];
          frac = span === 0 ? 0 : (distIn - distAtEntry[i]) / span;
          loIdx = i; hiIdx = i + 1; break;
        }
      }
    }
  }

  if (loIdx === undefined) return distIn;

  // Apply the same fraction at paramVal to get the output distance
  const dLo = evalCurve(curves[loIdx], paramVal);
  const dHi = loIdx === hiIdx ? dLo : evalCurve(curves[hiIdx], paramVal);
  return dLo + frac * (dHi - dLo);
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
