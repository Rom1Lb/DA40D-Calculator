import { useState, useMemo } from "react";
import {
  calcMassBalance,
  calcAirspeeds,
  pressureAltitude,
  windComponents,
  calcTODR,
  calcLDR,
  calcLRR,
  applyFactors,
  AIRCRAFT_LIST,
} from "../engine/index.js";

const DEFAULT_AD = {
  icao: "",
  runway: "",
  elevFt: "",
  qnh: "1013",
  oat: "",
  windDir: "",
  windSpeed: "",
  rwyAxis: "",
  slope: "0",
  condition: "Dry",
  surface: "Hard",
  safety: "None",
  rwyLengthM: "",
};

const INITIAL = {
  acReg: AIRCRAFT_LIST[0]?.registration ?? "",
  //frontSeatsKg: 0,
  //rearSeatsKg: 0,
  //bagFwdKg: 0,
  //fuelUSG: 28,
  //burntFuelUSG: 10,
  aerodromes: {
    dep: { ...DEFAULT_AD },
    dest: { ...DEFAULT_AD },
    alt: { ...DEFAULT_AD },
  },
};

export function useAppState() {
  const [state, setState] = useState(INITIAL);

  function setField(key, value) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function setAeroField(which, key, value) {
    setState((s) => ({
      ...s,
      aerodromes: {
        ...s.aerodromes,
        [which]: { ...s.aerodromes[which], [key]: value },
      },
    }));
  }

  const mb = useMemo(() => {
    const ac = AIRCRAFT_LIST.find((a) => a.registration === state.acReg);
    if (!ac) return null;
    return calcMassBalance({
      acReg: state.acReg,
      frontSeatsKg: Number(state.frontSeatsKg) || 0,
      rearSeatsKg: Number(state.rearSeatsKg) || 0,
      bagFwdKg: Number(state.bagFwdKg) || 0,
      fuelUSG: Number(state.fuelUSG) || 0,
      burntFuelUSG: Number(state.burntFuelUSG) || 0,
    });
  }, [
    state.acReg,
    state.frontSeatsKg,
    state.rearSeatsKg,
    state.bagFwdKg,
    state.fuelUSG,
    state.burntFuelUSG,
  ]);

  const airspeeds = useMemo(() => {
    if (!mb) return null;
    return {
      takeoff: calcAirspeeds(mb.tom.mass),
      landing: calcAirspeeds(mb.lm.mass),
    };
  }, [mb]);

  function computeAd(ad, phase) {
    const elev = Number(ad.elevFt);
    const qnh = Number(ad.qnh);
    const oat = Number(ad.oat);
    const wDir = Number(ad.windDir);
    const wSpd = Number(ad.windSpeed);
    const rwy = Number(ad.rwyAxis);
    const slope = Number(ad.slope) || 0;

    if ([elev, qnh, oat, wDir, wSpd, rwy].some(isNaN) || !ad.icao) return null;

    const pa = pressureAltitude(elev, qnh);
    const wind = windComponents(wDir, wSpd, rwy);
    const mass = phase === "takeoff" ? mb?.tom?.mass : mb?.lm?.mass;
    if (!mass) return null;

    const factors = {
      slope,
      condition: ad.condition,
      surface: ad.surface,
      safety: ad.safety,
    };

    const rawTodr =
      phase === "takeoff"
        ? calcTODR({ pressAlt: pa, oat, mass, wind: wind.headwind })
        : null;
    const rawLdr =
      phase === "landing"
        ? calcLDR({ pressAlt: pa, oat, mass, wind: wind.headwind })
        : null;
    const rawLrr =
      phase === "landing"
        ? calcLRR({ pressAlt: pa, oat, mass, wind: wind.headwind })
        : null;

    return {
      pa,
      oat,
      mass,
      headwind: wind.headwind,
      crosswind: wind.crosswind,
      _rwyLengthM: Number(ad.rwyLengthM) || 1500,
      _rwyName: ad.runway || "",
      _windDir: Number(ad.windDir) || 0,
      _rwyAxis: Number(ad.rwyAxis) || 0,
      todr:
        rawTodr && !rawTodr.error
          ? applyFactors(rawTodr.result, factors, "takeoff")
          : rawTodr,
      ldr:
        rawLdr && !rawLdr.error
          ? applyFactors(rawLdr.result, factors, "landing")
          : rawLdr,
      lrr:
        rawLrr && !rawLrr.error
          ? applyFactors(rawLrr.result, factors, "landing")
          : rawLrr,
      raw: { todr: rawTodr, ldr: rawLdr, lrr: rawLrr },
    };
  }

  const perfDep = useMemo(
    () => computeAd(state.aerodromes.dep, "takeoff"),
    [state.aerodromes.dep, mb],
  );
  const perfDest = useMemo(
    () => computeAd(state.aerodromes.dest, "landing"),
    [state.aerodromes.dest, mb],
  );
  const perfAlt = useMemo(
    () => computeAd(state.aerodromes.alt, "landing"),
    [state.aerodromes.alt, mb],
  );

  const warnings = useMemo(() => {
    const w = [];
    if (!mb)
      w.push({ id: "no-ac", level: "danger", text: "No aircraft selected" });
    if (mb?.mtowExceeded)
      w.push({
        id: "mtow",
        level: "danger",
        text: `MTOW exceeded (${mb.tom.mass} kg > 1150 kg)`,
      });
    if (mb?.cgStatus?.tom === "danger")
      w.push({
        id: "cg-tom",
        level: "danger",
        text: "T/O mass CG out of limits",
      });
    if (mb?.cgStatus?.lm === "danger")
      w.push({
        id: "cg-lm",
        level: "danger",
        text: "Landing mass CG out of limits",
      });
    if (mb?.cgStatus?.tom === "warning" || mb?.cgStatus?.lm === "warning")
      w.push({
        id: "cg-util",
        level: "warning",
        text: "CG in Utility category only — check AFM",
      });
    const dep = state.aerodromes.dep;
    if (!dep.icao || !dep.elevFt || !dep.oat)
      w.push({
        id: "dep",
        level: "warning",
        text: "Departure aerodrome data incomplete",
      });
    if (perfDep?.crosswind > 20)
      w.push({
        id: "cw-dep",
        level: "danger",
        text: `Crosswind ${perfDep.crosswind} kt > 20 kt limit (dep)`,
      });
    if (perfDest?.crosswind > 20)
      w.push({
        id: "cw-dest",
        level: "danger",
        text: `Crosswind ${perfDest.crosswind} kt > 20 kt limit (dest)`,
      });
    if (perfAlt?.crosswind > 20)
      w.push({
        id: "cw-alt",
        level: "danger",
        text: `Crosswind ${perfAlt.crosswind} kt > 20 kt limit (alt)`,
      });
    return w;
  }, [mb, state.aerodromes, perfDep, perfDest, perfAlt]);

  const activeWarning =
    warnings.find((w) => w.level === "danger") ??
    warnings.find((w) => w.level === "warning") ??
    null;

  return {
    state,
    setField,
    setAeroField,
    mb,
    airspeeds,
    perfDep,
    perfDest,
    perfAlt,
    warnings,
    activeWarning,
    aircraftList: AIRCRAFT_LIST,
  };
}
