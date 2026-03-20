import { useState, useCallback, useRef } from "react";
import { InputField, SelectField, ComputedField } from "./InputField.jsx";

const CONDITIONS = ["Dry", "Wet"];
const SURFACES = ["Hard", "Short Grass", "Medium Grass", "Long Grass"];
const SAFETIES = ["None", "× 1.15", "× 1.25", "× 1.33"];

// ─────────────────────────────────────────────────────────────────────────────
// Data sources
//
//  Static data  →  OurAirports CSV (cached in localStorage for 7 days)
//    airports.csv  →  elevation
//    runways.csv   →  heading, length per runway
//
//  Live METAR   →  CheckWX API  (https://checkwxapi.com)
//    Free tier: 1000 calls/month, CORS-open, returns decoded JSON.
//    Key stored in .env.local as VITE_CHECKWX_KEY — never committed to Git.
//
// Auto-filled fields:
//   elevFt     ← airport elevation_ft
//   runway     ← best runway end (closest heading to wind direction)
//   rwyAxis    ← that end's magnetic heading
//   rwyLengthM ← runway length_ft × 0.3048
//   qnh        ← barometer.hpa
//   oat        ← temperature.celsius
//   windDir    ← wind.degrees
//   windSpeed  ← wind.speed_kts
// ─────────────────────────────────────────────────────────────────────────────

const AIRPORTS_CSV =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const RUNWAYS_CSV =
  "https://davidmegginson.github.io/ourairports-data/runways.csv";

// CheckWX decoded METAR endpoint
// Key injected at build time from .env.local — never hard-coded here
const CHECKWX_KEY = import.meta.env.VITE_CHECKWX_KEY ?? "";
const CHECKWX_METAR = (icao) => `https://api.checkwx.com/metar/${icao}/decoded`;
// Nearest: finds closest station with a valid METAR when exact station has none
const CHECKWX_METAR_NEAREST = (icao) =>
  `https://api.checkwx.com/metar/${icao}/nearest/decoded`;

// Cache TTL: 7 days. OurAirports updates roughly weekly.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY_AIRPORTS = "oa_airports_csv";
const CACHE_KEY_RUNWAYS = "oa_runways_csv";
const CACHE_KEY_TS = "oa_csv_timestamp";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function splitCSVRow(row) {
  const cols = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      cols.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function parseCSV(text) {
  const rows = text.trim().split("\n");
  const headers = splitCSVRow(rows[0]);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const vals = splitCSVRow(rows[i]);
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = vals[j] ?? "";
    });
    out.push(obj);
  }
  return out;
}

// ── localStorage cache ────────────────────────────────────────────────────────

function cacheValid() {
  try {
    const ts = localStorage.getItem(CACHE_KEY_TS);
    return ts ? Date.now() - Number(ts) < CACHE_TTL_MS : false;
  } catch {
    return false;
  }
}

function cacheRead() {
  try {
    return {
      airportsCsv: localStorage.getItem(CACHE_KEY_AIRPORTS),
      runwaysCsv: localStorage.getItem(CACHE_KEY_RUNWAYS),
    };
  } catch {
    return { airportsCsv: null, runwaysCsv: null };
  }
}

function cacheWrite(airportsCsv, runwaysCsv) {
  try {
    localStorage.setItem(CACHE_KEY_AIRPORTS, airportsCsv);
    localStorage.setItem(CACHE_KEY_RUNWAYS, runwaysCsv);
    localStorage.setItem(CACHE_KEY_TS, String(Date.now()));
  } catch {
    // Quota exceeded (~10 MB total) — silently skip; app still works,
    // just re-downloads next session.
  }
}

// ── CSV fetch-or-cache ────────────────────────────────────────────────────────
//
// onProgress("cache")       — served from localStorage, instant
// onProgress("downloading") — first visit or cache expired, ~2-4 s
// onProgress("done")        — download complete, written to cache

async function fetchCsvData(onProgress) {
  if (cacheValid()) {
    const { airportsCsv, runwaysCsv } = cacheRead();
    if (airportsCsv && runwaysCsv) {
      onProgress("cache");
      return { airportsCsv, runwaysCsv };
    }
  }

  onProgress("downloading");

  const [apRes, rwRes] = await Promise.all([
    fetch(AIRPORTS_CSV),
    fetch(RUNWAYS_CSV),
  ]);

  if (!apRes.ok)
    throw new Error("Airport database unavailable — check network");
  if (!rwRes.ok) throw new Error("Runway database unavailable — check network");

  const [airportsCsv, runwaysCsv] = await Promise.all([
    apRes.text(),
    rwRes.text(),
  ]);

  cacheWrite(airportsCsv, runwaysCsv);
  onProgress("done");
  return { airportsCsv, runwaysCsv };
}

// ── Angular difference helper (shortest arc, 0-180) ─────────────────────────

function headingDiff(a, b) {
  const d = Math.abs((a - b + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// ── CheckWX METAR fetch ───────────────────────────────────────────────────────
//
// CheckWX decoded response shape (relevant fields):
// {
//   data: [{
//     icao: "EBCI",
//     observed: "2024-03-20T12:20:00.000Z",
//     temperature:  { celsius: 12 },
//     barometer:    { hpa: 1018, hg: 30.01, ... },
//     wind:         { degrees: 240, speed_kts: 8 }
//   }]
// }
//
// No key → returns 401. Missing station → data array is empty.
// Returns null on any failure so the rest of the lookup still completes.

function normaliseCheckWX(m, nearest = false) {
  return {
    _source: "checkwx",
    _nearest: nearest, // true when data is from a nearby station
    _station: m.icao ?? "", // actual station used (may differ from queried)
    time: { repr: m.observed?.slice(0, 16).replace("T", " ") ?? "" },
    temperature: { value: m.temperature?.celsius ?? null },
    altimeter: { value: m.barometer?.hpa ?? null },
    units: { altimeter: "hPa" },
    wind_direction: { value: m.wind?.degrees ?? null },
    wind_speed: { value: m.wind?.speed_kts ?? null },
  };
}

async function fetchMetar(icao) {
  if (!CHECKWX_KEY) {
    console.warn("VITE_CHECKWX_KEY not set in .env.local — METAR skipped");
    return null;
  }
  const headers = { "X-API-Key": CHECKWX_KEY };

  // ── 1. Try exact station ──────────────────────────────────────
  try {
    const res = await fetch(CHECKWX_METAR(icao), { headers });
    if (res.ok) {
      const json = await res.json();
      const m = json?.data?.[0];
      if (m) return normaliseCheckWX(m, false);
    }
  } catch {
    /* fall through */
  }

  // ── 2. No METAR for this station — try nearest ────────────────
  try {
    const res = await fetch(CHECKWX_METAR_NEAREST(icao), { headers });
    if (res.ok) {
      const json = await res.json();
      const m = json?.data?.[0];
      if (m) return normaliseCheckWX(m, true);
    }
  } catch {
    /* fall through */
  }

  return null; // both failed
}

// ── Best runway: end whose heading is closest to wind direction ───────────────
//
// Each runway has two usable ends (le and he, ~180° apart).
// We test both ends of every runway and pick the one with the smallest
// angular difference to the wind direction → maximum headwind component.
// Tie-break: longest runway wins.

function pickBestRunway(rwList, windDir) {
  if (!rwList.length) return null;

  // If no wind direction known, fall back to longest runway le-end
  if (windDir == null) return { rw: rwList[0], end: "le" };

  let best = null,
    bestDiff = Infinity;

  for (const rw of rwList) {
    for (const end of ["le", "he"]) {
      const hdg = end === "le" ? rw.leHdg : rw.heHdg;
      if (hdg == null) continue;
      const diff = headingDiff(hdg, windDir);
      // Prefer smaller diff; on tie prefer longer runway
      if (
        diff < bestDiff ||
        (diff === bestDiff && best && rw.lengthM > best.rw.lengthM)
      ) {
        best = { rw, end };
        bestDiff = diff;
      }
    }
  }

  return best ?? { rw: rwList[0], end: "le" };
}

// ── Core lookup function ──────────────────────────────────────────────────────

async function lookupIcao(icao, onProgress) {
  const code = icao.trim().toUpperCase();
  if (code.length < 3) throw new Error("ICAO code too short");

  // CSV (cached or fresh) + METAR fire concurrently
  const [csvResult, metarResult] = await Promise.allSettled([
    fetchCsvData(onProgress),
    fetchMetar(code),
  ]);

  if (csvResult.status !== "fulfilled")
    throw csvResult.reason ?? new Error("Airport data unavailable");

  const { airportsCsv, runwaysCsv } = csvResult.value;
  const metar = metarResult.status === "fulfilled" ? metarResult.value : null;

  // ── Airport static data ───────────────────────────────────────
  const airports = parseCSV(airportsCsv);
  const airport = airports.find(
    (a) =>
      a.ident?.toUpperCase() === code ||
      a.gps_code?.toUpperCase() === code ||
      a.local_code?.toUpperCase() === code,
  );
  if (!airport) throw new Error(`${code} not found in airport database`);

  const rawElev = parseFloat(airport.elevation_ft);
  const elevFt = isNaN(rawElev) ? null : Math.round(rawElev);

  // ── Runways ───────────────────────────────────────────────────
  const runways = parseCSV(runwaysCsv);
  const rwList = runways
    .filter((r) => r.airport_ident?.toUpperCase() === code && r.closed !== "1")
    .map((r) => {
      const leHdg = parseFloat(r.le_heading_degT);
      const heHdg = parseFloat(r.he_heading_degT);
      const leIdent = r.le_ident?.trim() || "";
      const heIdent = r.he_ident?.trim() || "";
      const lengthM = Math.round((parseFloat(r.length_ft) || 0) * 0.3048);
      return {
        leIdent,
        heIdent,
        leHdg: isNaN(leHdg) ? null : Math.round(leHdg),
        heHdg: isNaN(heHdg) ? null : Math.round(heHdg),
        lengthM,
      };
    })
    .filter((r) => r.leHdg !== null && r.lengthM > 50)
    .sort((a, b) => b.lengthM - a.lengthM);

  // Extract wind direction from METAR (needed for runway selection)
  const windDir = metar?.wind_direction?.value ?? null;

  // Pick best runway end based on wind
  const best = pickBestRunway(rwList, windDir);

  return { airport, elevFt, rwList, best, metar };
}

// ── Icon components ───────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ animation: "_spin 0.75s linear infinite" }}
      >
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--red)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--amber)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── FactorBreakdown ───────────────────────────────────────────────────────────

function FactorBreakdown({ perf, phase }) {
  if (!perf) return null;
  const r = phase === "takeoff" ? perf.todr : perf.ldr;
  if (!r || r.error) return null;
  const { breakdown, overall } = r;
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 10px",
      }}
    >
      {[
        { label: "Slope", val: breakdown.slopeFactor },
        { label: "Surface", val: breakdown.surfFactor },
        { label: "Cond.", val: breakdown.condFactor },
        { label: "Safety", val: breakdown.safetyFactor },
      ].map(({ label, val }) => (
        <div key={label} className="factor-row">
          <span>{label}</span>
          <span className={`factor-val ${val !== 1 ? "amplified" : ""}`}>
            × {val.toFixed(2)}
          </span>
        </div>
      ))}
      <div className="factor-row">
        <span>Overall</span>
        <span
          className={`factor-val ${overall > 1.05 ? "amplified" : ""}`}
          style={{ fontSize: 13 }}
        >
          × {overall.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ── AerodromeForm ─────────────────────────────────────────────────────────────

function AerodromeForm({ ad, perf, onChange, onBulkChange, phase }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [statusMsg, setStatusMsg] = useState("");
  const [fresh, setFresh] = useState(new Set()); // green flash — just filled
  const [stale, setStale] = useState(new Set()); // amber flash — nearest METAR
  const [empty, setEmpty] = useState(new Set()); // red flash — field was cleared
  const flashTimer = useRef(null);
  const staleTimer = useRef(null);
  const emptyTimer = useRef(null);

  /** Green flash — fields just filled from exact station */
  const flash = useCallback((fields) => {
    clearTimeout(flashTimer.current);
    setFresh(new Set(fields));
    flashTimer.current = setTimeout(() => setFresh(new Set()), 2800);
  }, []);

  /** Amber flash — fields filled from a nearby station, not the queried one */
  const flashStale = useCallback((fields) => {
    clearTimeout(staleTimer.current);
    setStale(new Set(fields));
    staleTimer.current = setTimeout(() => setStale(new Set()), 4000);
  }, []);

  /** Red flash — fields that were cleared because no data was found */
  const flashEmpty = useCallback((fields) => {
    clearTimeout(emptyTimer.current);
    setEmpty(new Set(fields));
    emptyTimer.current = setTimeout(() => setEmpty(new Set()), 4000);
  }, []);

  /** Main lookup handler */
  const doLookup = useCallback(async () => {
    const code = ad.icao.trim().toUpperCase();
    if (code.length < 3) return;

    setStatus("loading");
    setStatusMsg("Fetching\u2026");
    const onProgress = (phase) => {
      if (phase === "cache") setStatusMsg("Loading from cache\u2026");
      if (phase === "downloading")
        setStatusMsg(
          "Downloading airport database (~10\u00a0MB, cached 7 days)\u2026",
        );
      if (phase === "done")
        setStatusMsg("Database ready \u2014 looking up airport\u2026");
    };

    try {
      const {
        airport,
        elevFt,
        rwList: rws,
        best,
        metar,
      } = await lookupIcao(code, onProgress);

      // All fields go into one bulk object → single atomic setState
      const bulk = {};
      const filled = [];

      // ── Elevation ───────────────────────────────────────────
      if (elevFt !== null) {
        bulk.elevFt = elevFt;
        filled.push("elevFt");
      }

      // ── Best runway (wind-optimised) ────────────────────────
      if (best) {
        const { rw, end } = best;
        const ident = end === "le" ? rw.leIdent : rw.heIdent;
        const hdg = end === "le" ? rw.leHdg : rw.heHdg;
        bulk.runway = ident;
        bulk.rwyAxis = hdg ?? "";
        bulk.rwyLengthM = rw.lengthM;
        filled.push("runway", "rwyAxis", "rwyLengthM");
      } else {
        // No runway data in OurAirports — clear fields so stale data never lingers
        bulk.runway = "";
        bulk.rwyAxis = "";
        bulk.rwyLengthM = "";
      }

      // ── METAR ───────────────────────────────────────────────
      const metarFields = ["oat", "qnh", "windDir", "windSpeed"];

      if (metar) {
        const oatVal = metar.temperature?.value;
        if (oatVal != null) {
          bulk.oat = Math.round(oatVal);
          filled.push("oat");
        }

        const altVal = metar.altimeter?.value;
        const altUnit = metar.units?.altimeter ?? "hPa";
        if (altVal != null) {
          bulk.qnh =
            altUnit === "inHg"
              ? Math.round(altVal * 33.8639)
              : Math.round(altVal);
          filled.push("qnh");
        }

        const wdVal = metar.wind_direction?.value;
        if (wdVal != null) {
          bulk.windDir = wdVal;
          filled.push("windDir");
        }

        const wsVal = metar.wind_speed?.value;
        if (wsVal != null) {
          bulk.windSpeed = Math.round(wsVal);
          filled.push("windSpeed");
        }
      } else {
        // No METAR at all — clear weather fields so stale data never lingers
        bulk.oat = "";
        bulk.qnh = "1013";
        bulk.windDir = "";
        bulk.windSpeed = "";
      }

      onBulkChange(bulk);

      // Green flash for exact station, amber flash for nearest station
      if (metar?._nearest) {
        flash(filled.filter((f) => !metarFields.includes(f))); // green: static fields
        flashStale(filled.filter((f) => metarFields.includes(f))); // amber: weather fields
      } else {
        flash(filled);
      }

      // Red flash on runway fields if no runway data was found
      if (!best) flashEmpty(["runway", "rwyAxis", "rwyLengthM"]);

      // ── Status line ─────────────────────────────────────────
      const name = airport.name || code;
      const nearInfo = metar?._nearest ? ` · nearest: ${metar._station}` : "";
      const metarTime = metar?.time?.repr
        ? ` · METAR ${metar.time.repr}${nearInfo}`
        : "";
      const noMetar = !metar ? " · no METAR — weather cleared" : "";
      const rwInfo = best
        ? ` · RWY ${best.end === "le" ? best.rw.leIdent : best.rw.heIdent}`
        : "";
      const noRwy = !best ? " · no runway data " : "";
      setStatus(!metar ? "warning" : "ok");
      setStatusMsg(`${name}${rwInfo}${metarTime}${noMetar}${noRwy}`);
    } catch (err) {
      setStatus("error");
      setStatusMsg(err.message ?? "Lookup failed");
    }
  }, [ad.icao, onBulkChange, flash]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") doLookup();
  };

  // Green outline = freshly filled from exact station
  // Amber outline = filled from nearest station (stale warning)
  // Red outline   = field was cleared (no data found)
  const hiInput = (name) =>
    fresh.has(name)
      ? { outline: "1.5px solid rgba(63,185,80,0.5)", outlineOffset: "1px" }
      : stale.has(name)
        ? { outline: "1.5px solid rgba(210,153,34,0.7)", outlineOffset: "1px" }
        : empty.has(name)
          ? { outline: "1.5px solid rgba(248,81,73,0.7)", outlineOffset: "1px" }
          : {};

  // Lookup button colours by status
  const btnStyle = {
    flexShrink: 0,
    width: 32,
    height: 32,
    alignSelf: "flex-end",
    border: `0.5px solid ${
      status === "ok"
        ? "rgba(63,185,80,0.4)"
        : status === "error"
          ? "rgba(248,81,73,0.4)"
          : status === "warning"
            ? "rgba(210,153,34,0.4)"
            : "var(--border)"
    }`,
    borderRadius: "var(--radius-sm)",
    background:
      status === "ok"
        ? "rgba(63,185,80,0.1)"
        : status === "error"
          ? "rgba(248,81,73,0.1)"
          : status === "warning"
            ? "rgba(210,153,34,0.1)"
            : "var(--bg2)",
    cursor:
      status === "loading" || ad.icao.trim().length < 3
        ? "not-allowed"
        : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted)",
    opacity: ad.icao.trim().length < 3 ? 0.38 : 1,
    transition: "all 0.18s",
  };

  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* ── Computed PA / HW / CW ─────────────────────────────── */}
      {perf && (
        <div className="grid-3">
          <ComputedField
            label="Press. altitude"
            value={`${perf.pa} ft`}
            colorClass="highlight"
          />
          <ComputedField
            label="Headwind"
            value={`${perf.headwind > 0 ? "+" : ""}${perf.headwind} kt`}
            colorClass={
              perf.headwind < -5 ? "warn" : perf.headwind > 0 ? "ok" : ""
            }
          />
          <ComputedField
            label="Crosswind"
            value={`${perf.crosswind} kt`}
            colorClass={
              perf.crosswind > 20 ? "danger" : perf.crosswind > 15 ? "warn" : ""
            }
          />
        </div>
      )}

      {/* ── Row 1: ICAO + lookup btn / Runway / Elevation ─────── */}
      <div className="grid-3">
        {/* ICAO + inline lookup button */}
        <div className="field">
          <span className="field-label">ICAO</span>
          <div style={{ display: "flex", gap: 5 }}>
            <input
              type="text"
              value={ad.icao}
              onChange={(e) => onChange("icao", e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder="EBCI"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              onClick={doLookup}
              disabled={status === "loading" || ad.icao.trim().length < 3}
              title="Look up airport &amp; live METAR  (Enter)"
              style={btnStyle}
            >
              {status === "loading" ? (
                <SpinnerIcon />
              ) : status === "ok" ? (
                <CheckIcon />
              ) : status === "error" ? (
                <ErrorIcon />
              ) : status === "warning" ? (
                <WarningIcon />
              ) : (
                <SearchIcon />
              )}
            </button>
          </div>
        </div>

        <InputField
          label="Runway"
          value={ad.runway}
          onChange={(v) => onChange("runway", v)}
          type="text"
          inputStyle={hiInput("runway")}
        />

        <InputField
          label="Elev (ft)"
          value={ad.elevFt}
          onChange={(v) => onChange("elevFt", v)}
          min={-1500}
          max={14000}
          inputStyle={hiInput("elevFt")}
        />
      </div>

      {/* ── Row 2: QNH / OAT / RWY axis ──────────────────────── */}
      <div className="grid-3">
        <InputField
          label="QNH (hPa)"
          value={ad.qnh}
          onChange={(v) => onChange("qnh", v)}
          min={920}
          max={1060}
          inputStyle={hiInput("qnh")}
        />
        <InputField
          label="OAT (°C)"
          value={ad.oat}
          onChange={(v) => onChange("oat", v)}
          min={-35}
          max={55}
          inputStyle={hiInput("oat")}
        />
        <InputField
          label="RWY axis °"
          value={ad.rwyAxis}
          onChange={(v) => onChange("rwyAxis", v)}
          min={0}
          max={360}
          inputStyle={hiInput("rwyAxis")}
        />
      </div>

      {/* ── Row 3: Rwy length / Wind dir / Wind speed ─────────── */}
      <div className="grid-3">
        <InputField
          label="Rwy lgth (m)"
          value={ad.rwyLengthM}
          onChange={(v) => onChange("rwyLengthM", v)}
          min={200}
          max={5000}
          inputStyle={hiInput("rwyLengthM")}
        />
        <InputField
          label="Wind dir (°)"
          value={ad.windDir}
          onChange={(v) => onChange("windDir", v)}
          min={0}
          max={360}
          inputStyle={hiInput("windDir")}
        />
        <InputField
          label="Wind (kts)"
          value={ad.windSpeed}
          onChange={(v) => onChange("windSpeed", v)}
          min={0}
          max={60}
          inputStyle={hiInput("windSpeed")}
        />
      </div>

      {/* ── Status line — segments coloured to match field outlines ── */}
      {statusMsg && (
        <div
          style={{
            fontSize: 9,
            display: "flex",
            flexWrap: "wrap",
            gap: "0 4px",
          }}
        >
          {statusMsg.split(" · ").map((seg, i) => {
            // First segment is always the airport name — colour by overall status
            if (i === 0)
              return (
                <span
                  key={i}
                  style={{
                    color:
                      status === "error"
                        ? "var(--red)"
                        : status === "ok"
                          ? "var(--green)"
                          : "var(--amber)",
                  }}
                >
                  {seg}
                </span>
              );
            // Runway segment — red if no data, green if filled
            if (seg.startsWith("RWY") || seg.startsWith("no runway"))
              return (
                <span
                  key={i}
                  style={{
                    color: seg.startsWith("no runway")
                      ? "var(--red)"
                      : "var(--green)",
                  }}
                >
                  · {seg}
                </span>
              );
            // METAR segment — amber if nearest, green if exact
            if (seg.startsWith("METAR"))
              return (
                <span
                  key={i}
                  style={{
                    color: seg.includes("nearest")
                      ? "var(--amber)"
                      : "var(--green)",
                  }}
                >
                  · {seg}
                </span>
              );
            // nearest: segment — amber
            if (seg.startsWith("nearest"))
              return (
                <span key={i} style={{ color: "var(--amber)" }}>
                  · {seg}
                </span>
              );
            // no METAR — amber
            if (seg.startsWith("no METAR"))
              return (
                <span key={i} style={{ color: "var(--amber)" }}>
                  · {seg}
                </span>
              );
            // fallback
            return (
              <span key={i} style={{ color: "var(--muted)" }}>
                · {seg}
              </span>
            );
          })}
        </div>
      )}

      <div className="divider" style={{ margin: "2px 0" }} />

      {/* ── Correction factors ────────────────────────────────── */}
      <div className="sub-header">Correction factors</div>
      <div className="grid-2">
        <InputField
          label="Slope (%)"
          value={ad.slope}
          onChange={(v) => onChange("slope", v)}
          hint={
            phase === "takeoff"
              ? "Uphill + increases TODR"
              : "Uphill − reduces LDR"
          }
          min={-10}
          max={10}
        />
        <SelectField
          label="Safety factor"
          value={ad.safety}
          onChange={(v) => onChange("safety", v)}
          options={SAFETIES}
        />
      </div>
      <div className="grid-2">
        <SelectField
          label="RWY condition"
          value={ad.condition}
          onChange={(v) => onChange("condition", v)}
          options={CONDITIONS}
        />
        <SelectField
          label="RWY surface"
          value={ad.surface}
          onChange={(v) => onChange("surface", v)}
          options={SURFACES}
        />
      </div>

      <FactorBreakdown perf={perf} phase={phase} />
    </div>
  );
}

// ── AerodromePanel ────────────────────────────────────────────────────────────

export function AerodromePanel({
  state,
  setAeroField,
  setBulkAeroFields,
  perfDep,
  perfDest,
  perfAlt,
}) {
  const [tab, setTab] = useState("dep");

  const tabs = [
    { id: "dep", label: "Departure", perf: perfDep, phase: "takeoff" },
    { id: "dest", label: "Destination", perf: perfDest, phase: "landing" },
    { id: "alt", label: "Alternate", perf: perfAlt, phase: "landing" },
  ];

  const active = tabs.find((t) => t.id === tab);
  const ad = state.aerodromes[tab];
  const cw = active.perf?.crosswind ?? 0;

  /**
   * Single atomic setState for all lookup fields at once.
   * Converts every value to string to match the field format used
   * elsewhere in the form (inputs always yield strings).
   */
  const handleBulkChange = useCallback(
    (updates) => {
      const stringified = Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [k, String(v)]),
      );
      setBulkAeroFields(tab, stringified);
    },
    [tab, setBulkAeroFields],
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Aerodromes</span>
        {cw > 20 ? (
          <span className="badge badge-danger">CW limit exceeded</span>
        ) : ad.icao ? (
          <span className="badge badge-ok">{ad.icao}</span>
        ) : (
          <span className="badge badge-muted">—</span>
        )}
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {state.aerodromes[t.id].icao && (
              <span
                style={{ marginLeft: 5, fontSize: 10, color: "var(--faint)" }}
              >
                {state.aerodromes[t.id].icao}
              </span>
            )}
          </div>
        ))}
      </div>

      {/*
        key={tab} forces a remount when switching tabs so each aerodrome
        gets its own isolated lookup / picker state.
      */}
      <AerodromeForm
        key={tab}
        ad={ad}
        perf={active.perf}
        onChange={(k, v) => setAeroField(tab, k, v)}
        onBulkChange={handleBulkChange}
        phase={active.phase}
      />
    </div>
  );
}
