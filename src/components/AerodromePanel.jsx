import { useState } from "react";
import { InputField, SelectField, ComputedField } from "./InputField.jsx";

const CONDITIONS = ["Dry", "Wet"];
const SURFACES = ["Hard", "Short Grass", "Medium Grass", "Long Grass"];
const SAFETIES = ["None", "× 1.15", "× 1.25", "× 1.33"];

// ── Sub-component at MODULE scope ────────────────────────────────

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

function AerodromeForm({ ad, perf, onChange, phase }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
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

      <div className="grid-3">
        <InputField
          label="ICAO"
          value={ad.icao}
          onChange={(v) => onChange("icao", v.toUpperCase())}
          type="text"
        />
        <InputField
          label="Runway"
          value={ad.runway}
          onChange={(v) => onChange("runway", v)}
          type="text"
        />
        <InputField
          label="Elev (ft)"
          value={ad.elevFt}
          onChange={(v) => onChange("elevFt", v)}
          min={-1500}
          max={14000}
        />
      </div>

      <div className="grid-3">
        <InputField
          label="QNH (hPa)"
          value={ad.qnh}
          onChange={(v) => onChange("qnh", v)}
          min={920}
          max={1060}
        />
        <InputField
          label="OAT (°C)"
          value={ad.oat}
          onChange={(v) => onChange("oat", v)}
          min={-35}
          max={55}
        />
        <InputField
          label="RWY axis °"
          value={ad.rwyAxis}
          onChange={(v) => onChange("rwyAxis", v)}
          min={0}
          max={360}
        />
      </div>

      <div className="grid-3">
        <InputField
          label="Rwy lgth (m)"
          value={ad.rwyLengthM}
          onChange={(v) => onChange("rwyLengthM", v)}
          min={200}
          max={5000}
        />
        <InputField
          label="Wind dir (°)"
          value={ad.windDir}
          onChange={(v) => onChange("windDir", v)}
          min={0}
          max={360}
        />
        <InputField
          label="Wind (kts)"
          value={ad.windSpeed}
          onChange={(v) => onChange("windSpeed", v)}
          min={0}
          max={60}
        />
      </div>

      <div className="divider" style={{ margin: "2px 0" }} />

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

// ── Main component ────────────────────────────────────────────────

export function AerodromePanel({
  state,
  setAeroField,
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

      <AerodromeForm
        key={tab}
        ad={state.aerodromes[tab]}
        perf={active.perf}
        onChange={(k, v) => setAeroField(tab, k, v)}
        phase={active.phase}
      />
    </div>
  );
}
