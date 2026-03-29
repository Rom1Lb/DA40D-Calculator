import { PerfChart } from "../charts/PerfChart.jsx";
import { TD_DATA } from "../data/td50ftData.js";
import { LD_DATA } from "../data/ld50ftData.js";
import { LR_DATA } from "../data/lrData.js";
import { RunwayDiagram } from "../components/RunwayDiagram.jsx";

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

function FactorBreakdown({ r }) {
  if (!r || r.error || !r.breakdown) return null;
  const bd = r.breakdown;
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
        { label: "Slope", val: bd.slopeFactor },
        { label: "Surface", val: bd.surfFactor },
        { label: "Cond.", val: bd.condFactor },
        { label: "Safety", val: bd.safetyFactor },
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
          className={`factor-val ${r.overall > 1.05 ? "amplified" : ""}`}
          style={{ fontSize: 13 }}
        >
          × {r.overall.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function AeroColumn({ label, phase, adKey, perf, ad }) {
  const isDep = phase === "takeoff";
  const accentDep = "#58a6ff";
  const accentLdr = "#3fb950";
  const accentLrr = "#d29922";
  const chartP = perf
    ? { pressAlt: perf.pa, oat: perf.oat, mass: perf.mass, wind: perf.headwind }
    : null;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{label}</div>
          {ad?.icao && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {ad.icao} · RWY {ad.runway || "—"}
            </div>
          )}
        </div>
        {perf?.crosswind > 20 ? (
          <span className="badge badge-danger">CW {perf.crosswind} kt</span>
        ) : ad?.icao ? (
          <span className="badge badge-ok">{isDep ? "T/O" : "LDG"}</span>
        ) : (
          <span className="badge badge-muted">—</span>
        )}
      </div>

      <div
        className="card-body"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {!perf ? (
          <p
            style={{
              fontSize: 12,
              color: "var(--faint)",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            Enter {label.toLowerCase()} aerodrome data on the Setup page
          </p>
        ) : (
          <>
            {perf.crosswind > 20 && (
              <div
                style={{
                  background: "var(--red-bg)",
                  border: "0.5px solid rgba(248,81,73,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "5px 10px",
                  fontSize: 11,
                  color: "var(--red)",
                  fontWeight: 600,
                }}
              >
                ⚠ {perf.crosswind} kt crosswind — exceeds 20 kt limit
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isDep ? "1fr 1fr" : "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {isDep ? (
                <>
                  <ResultTile
                    label="TODR"
                    value={perf.todr}
                    colorClass="todr"
                  />
                  <ConditionsCard perf={perf} />
                </>
              ) : (
                <>
                  <ResultTile label="LDR" value={perf.ldr} colorClass="ldr" />
                  <ResultTile label="LRR" value={perf.lrr} colorClass="lrr" />
                  <ConditionsCard perf={perf} />
                </>
              )}
            </div>

            <FactorBreakdown r={isDep ? perf.todr : perf.ldr} />

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

            {isDep && !perf.todr?.error && chartP && (
              <PerfChart
                chartId={`todr-${adKey}`}
                title="Takeoff distance over 50 ft obstacle"
                data={TD_DATA}
                params={{ ...chartP, result: perf.todr?.corrected }}
                accentColor={accentDep}
              />
            )}
            {!isDep && !perf.ldr?.error && chartP && (
              <PerfChart
                chartId={`ldr-${adKey}`}
                title="Landing distance over 50 ft obstacle"
                data={{ ...LD_DATA, step3hw: LD_DATA.step3, step3tw: [] }}
                params={{ ...chartP, result: perf.ldr?.corrected }}
                accentColor={accentLdr}
              />
            )}
            {!isDep && !perf.lrr?.error && chartP && (
              <PerfChart
                chartId={`lrr-${adKey}`}
                title="Landing ground roll"
                data={{ ...LR_DATA, step3hw: LR_DATA.step3, step3tw: [] }}
                params={{ ...chartP, result: perf.lrr?.corrected }}
                accentColor={accentLrr}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function PerformancePage({ perfDep, perfDest, perfAlt, state }) {
  return (
    <main className="perf-page">
      <AeroColumn
        label="Departure"
        phase="takeoff"
        adKey="dep"
        perf={perfDep}
        ad={state.aerodromes.dep}
      />
      <AeroColumn
        label="Destination"
        phase="landing"
        adKey="dest"
        perf={perfDest}
        ad={state.aerodromes.dest}
      />
      <AeroColumn
        label="Alternate"
        phase="landing"
        adKey="alt"
        perf={perfAlt}
        ad={state.aerodromes.alt}
      />
    </main>
  );
}
