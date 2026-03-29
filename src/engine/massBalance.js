/**
 * massBalance.js
 */

import {
  AIRCRAFT_LIST,
  MOMENT_ARMS,
  CG_NORMAL,
  CG_UTILITY,
  MTOW,
  AIRSPEEDS,
  AIRSPEED_MASS_REFS,
} from "../data/aircraft.js";
import { evalCurve } from "./interpolation.js";

export { AIRCRAFT_LIST };

export function calcMassBalance(loading) {
  const ac = AIRCRAFT_LIST.find((a) => a.registration === loading.acReg);
  if (!ac) return { error: "Aircraft not found" };

  const arms = MOMENT_ARMS;
  const fuelDensity = 0.84 * 3.78541;

  const fuelKg = loading.fuelUSG * fuelDensity;
  const burntKg = loading.burntFuelUSG * fuelDensity;
  const TAXI_KG = 1.5;
  const TAXI_ARM = arms.fuel;

  // Addition des sièges gauche + droite
  const frontSeatsKg =
    (Number(loading.frontLeftKg) || 0) + (Number(loading.frontRightKg) || 0);
  const rearSeatsKg =
    (Number(loading.rearLeftKg) || 0) + (Number(loading.rearRightKg) || 0);

  const items = [
    { label: "Empty aircraft", mass: ac.bew, arm: ac.arm },
    { label: "Front seats", mass: frontSeatsKg, arm: arms.frontSeats },
    { label: "Rear seats", mass: rearSeatsKg, arm: arms.rearSeats },
    { label: "Baggage", mass: loading.bagFwdKg, arm: arms.bagFwd },
    { label: `Fuel (${loading.fuelUSG} USG)`, mass: fuelKg, arm: arms.fuel },
  ];

  const zfItems = items.slice(0, 4);
  const zfMass = zfItems.reduce((s, i) => s + i.mass, 0);
  const zfMom = zfItems.reduce((s, i) => s + i.mass * i.arm, 0);
  const zfCG = zfMass > 0 ? zfMom / zfMass : 0;

  const rampMass = zfMass + fuelKg;
  const rampMom = zfMom + fuelKg * arms.fuel;

  const tomMass = rampMass - TAXI_KG;
  const tomMom = rampMom - TAXI_KG * TAXI_ARM;
  const tomCG = tomMass > 0 ? tomMom / tomMass : 0;

  const lmMass = tomMass - burntKg;
  const lmMom = tomMom - burntKg * arms.fuel;
  const lmCG = lmMass > 0 ? lmMom / lmMass : 0;

  return {
    items,
    taxiKg: TAXI_KG,
    taxiArm: TAXI_ARM,
    zf: {
      mass: Math.round(zfMass * 10) / 10,
      cg: Math.round(zfCG * 1000) / 1000,
      moment: Math.round(zfMom * 10) / 10,
    },
    ramp: {
      mass: Math.round(rampMass * 10) / 10,
      cg: Math.round((rampMass > 0 ? rampMom / rampMass : 0) * 1000) / 1000,
      moment: Math.round(rampMom * 10) / 10,
    },
    tom: {
      mass: Math.round(tomMass * 10) / 10,
      cg: Math.round(tomCG * 1000) / 1000,
      moment: Math.round(tomMom * 10) / 10,
    },
    lm: {
      mass: Math.round(lmMass * 10) / 10,
      cg: Math.round(lmCG * 1000) / 1000,
      moment: Math.round(lmMom * 10) / 10,
    },
    mtowExceeded: tomMass > MTOW,
    cgStatus: {
      zf: cgCheck(zfCG, zfMass),
      ramp: cgCheck(rampMass > 0 ? rampMom / rampMass : 0, rampMass),
      tom: cgCheck(tomCG, tomMass),
      lm: cgCheck(lmCG, lmMass),
    },
  };
}

function cgCheck(cg, mass) {
  if (isInEnvelope(cg, mass, CG_NORMAL)) return "ok";
  if (isInEnvelope(cg, mass, CG_UTILITY)) return "warning";
  return "danger";
}

function isInEnvelope(cg, mass, envelope) {
  if (envelope.length < 3) return false;
  let inside = false;
  const n = envelope.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = envelope[i];
    const [xj, yj] = envelope[j];
    const intersects =
      yi > mass !== yj > mass &&
      cg < ((xj - xi) * (mass - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function calcAirspeeds(mass) {
  const refs = AIRSPEED_MASS_REFS;
  return AIRSPEEDS.map((entry) => {
    const { code, name, v850, v1000, v1150, category } = entry;
    const vals = [v850, v1000, v1150];
    const defined = vals.filter((v) => v !== null);
    if (defined.length <= 1) {
      return {
        code,
        name,
        kias: defined[0] ?? null,
        category,
        isLimit: category === "limit",
      };
    }
    const curve = { xs: [], ys: [] };
    vals.forEach((v, i) => {
      if (v !== null) {
        curve.xs.push(refs[i]);
        curve.ys.push(v);
      }
    });
    const kias = Math.round(evalCurve(curve, mass));
    return { code, name, kias, category, isLimit: category === "limit" };
  });
}

export function pressureAltitude(elevFt, qnhHPa) {
  return Math.round(elevFt + (1013.25 - qnhHPa) * 27);
}

export function windComponents(windDir, windSpeed, rwyAxis) {
  const angle = ((windDir - rwyAxis) * Math.PI) / 180;
  return {
    headwind: Math.round(windSpeed * Math.cos(angle) * 10) / 10,
    crosswind: Math.round(Math.abs(windSpeed * Math.sin(angle)) * 10) / 10,
  };
}
