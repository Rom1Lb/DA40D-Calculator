import { PerfChart } from "../charts/PerfChart.jsx";
import { TD_DATA } from "../data/td50ftData.js";
import { LD_DATA } from "../data/ld50ftData.js";
import { LR_DATA } from "../data/lrData.js";
import { RunwayDiagram } from "./RunwayDiagram.jsx";

// ── Sub-components at MODULE scope ──────────────────────────────

function ResultTile({ label, value, colorClass }) {
  if (!value)
    return (
      <div className="result-tile na">
        <div className="tile-label">{label}</div>
        <div
          className="tile-value"
          style={{ fontSize: 18, color: "var(--faint)" }}
        >
          —
        </div>
        <div className="tile-unit">no data</div>
      </div>
    );
  if (value.error)
    return (
      <div className="result-tile na">
        <div className="tile-label">{label}</div>
        <div
          className="tile-value"
          style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.3 }}
        >
          {value.error}
        </div>
      </div>
    );
  return (
    <div className={`result-tile ${colorClass}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value.corrected}</div>
      <div className="tile-unit">metres</div>
      {value.overall > 1.005 && (
        <div className="tile-factor">× {value.overall.toFixed(2)} applied</div>
      )}
    </div>
  );
}

function ConditionsCard({ perf }) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        fontSize: 11,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div className="sub-header" style={{ marginBottom: 4 }}>
        Conditions
      </div>
      {[
        { k: "PA", v: `${perf.pa} ft`, c: "" },
        { k: "OAT", v: `${perf.oat} °C`, c: "" },
        {
          k: "HW",
          v: `${perf.headwind > 0 ? "+" : ""}${perf.headwind} kt`,
          c: perf.headwind < -5 ? "warn" : perf.headwind > 0 ? "ok" : "",
        },
        {
          k: "CW",
          v: `${perf.crosswind} kt`,
          c: perf.crosswind > 20 ? "danger" : perf.crosswind > 15 ? "warn" : "",
        },
        { k: "Mass", v: `${perf.mass} kg`, c: "" },
      ].map(({ k, v, c }) => (
        <div
          key={k}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span style={{ color: "var(--muted)" }}>{k}</span>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              color:
                c === "danger"
                  ? "var(--red)"
                  : c === "warn"
                    ? "var(--amber)"
                    : c === "ok"
                      ? "var(--green)"
                      : "var(--text)",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function AeroBlock({ label, perf, adKey }) {
  if (!perf)
    return (
      <div style={{ color: "var(--faint)", fontSize: 12 }}>
        {label} — complete aerodrome data to compute
      </div>
    );

  const isDep = adKey === "dep";
  const chartP = {
    pressAlt: perf.pa,
    oat: perf.oat,
    mass: perf.mass,
    wind: perf.headwind,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div className="sub-header" style={{ marginBottom: 0 }}>
          {label}
        </div>
        {perf.crosswind > 20 && (
          <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 600 }}>
            ⚠ {perf.crosswind} kt — CW limit
          </span>
        )}
      </div>

      {/* Tiles + conditions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDep ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: 8,
        }}
      >
        {isDep ? (
          <ResultTile label="TODR" value={perf.todr} colorClass="todr" />
        ) : (
          <>
            <ResultTile label="LDR" value={perf.ldr} colorClass="ldr" />
            <ResultTile label="LRR" value={perf.lrr} colorClass="lrr" />
          </>
        )}
        <ConditionsCard perf={perf} />
      </div>

      {/* Runway diagram */}
      <div
        style={{
          background: "var(--bg2)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
        }}
      >
        <RunwayDiagram
          rwyLengthM={Number(perf._rwyLengthM) || 1500}
          rwyName={perf._rwyName ?? ""}
          windDir={Number(perf._windDir) || 0}
          rwyAxis={Number(perf._rwyAxis) || 0}
          distances={
            isDep
              ? [{ key: "todr", value: perf.todr?.corrected }]
              : [
                  { key: "ldr", value: perf.ldr?.corrected },
                  { key: "lrr", value: perf.lrr?.corrected },
                ]
          }
        />
      </div>

      {/* Charts — always shown, no toggle */}
      {isDep && !perf.todr?.error && (
        <PerfChart
          chartId={`todr-${adKey}`}
          title="Takeoff distance over 50 ft obstacle"
          data={TD_DATA}
          params={{ ...chartP, result: perf.todr?.corrected }}
          accentColor="#58a6ff"
        />
      )}
      {!isDep && !perf.ldr?.error && (
        <PerfChart
          chartId={`ldr-${adKey}`}
          title="Landing distance over 50 ft obstacle"
          data={{ ...LD_DATA, step3hw: LD_DATA.step3, step3tw: [] }}
          params={{ ...chartP, result: perf.ldr?.corrected }}
          accentColor="#3fb950"
        />
      )}
      {!isDep && !perf.lrr?.error && (
        <PerfChart
          chartId={`lrr-${adKey}`}
          title="Landing ground roll"
          data={{ ...LR_DATA, step3hw: LR_DATA.step3, step3tw: [] }}
          params={{ ...chartP, result: perf.lrr?.corrected }}
          accentColor="#d29922"
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export function PerformancePanel({ perfDep, perfDest, perfAlt, mb, state }) {
  const dep = state.aerodromes.dep;
  const dest = state.aerodromes.dest;
  const alt = state.aerodromes.alt;
  const hasAny = perfDep || (perfDest && dest.icao) || (perfAlt && alt.icao);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Performance results</span>
        {hasAny && <span className="badge badge-ok">Computed</span>}
      </div>
      <div
        className="card-body"
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {!hasAny && (
          <div
            style={{
              color: "var(--faint)",
              fontSize: 13,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Enter departure aerodrome data to compute performance
          </div>
        )}

        {perfDep && dep.icao && (
          <AeroBlock
            label={`Departure — ${dep.icao} RWY ${dep.runway || "—"}`}
            perf={perfDep}
            adKey="dep"
          />
        )}

        {perfDest && dest.icao && (
          <>
            <div className="divider" />
            <AeroBlock
              label={`Destination — ${dest.icao} RWY ${dest.runway || "—"}`}
              perf={perfDest}
              adKey="dest"
            />
          </>
        )}

        {perfAlt && alt.icao && (
          <>
            <div className="divider" />
            <AeroBlock
              label={`Alternate — ${alt.icao} RWY ${alt.runway || "—"}`}
              perf={perfAlt}
              adKey="alt"
            />
          </>
        )}
      </div>
    </div>
  );
}
