import { PerfChart } from "../charts/PerfChart.jsx";
import { TD_DATA } from "../data/td50ftData.js";
import { LD_DATA } from "../data/ld50ftData.js";
import { LR_DATA } from "../data/lrData.js";
import { RunwayDiagram } from "../components/RunwayDiagram.jsx";

// ── Shared sub-components ────────────────────────────────────────

function ResultTile({ label, value, colorClass }) {
  if (!value) return (
    <div className="result-tile na">
      <div className="tile-label">{label}</div>
      <div className="tile-value" style={{ fontSize: 18, color: "var(--faint)" }}>—</div>
      <div className="tile-unit">no data</div>
    </div>
  );
  if (value.error) return (
    <div className="result-tile na">
      <div className="tile-label">{label}</div>
      <div className="tile-value" style={{ fontSize: 11, color: "var(--red)", lineHeight: 1.3 }}>
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

function ConditionsBadges({ perf }) {
  if (!perf) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
      {[
        { k: "PA",   v: `${perf.pa} ft` },
        { k: "OAT",  v: `${perf.oat} °C` },
        { k: "HW",   v: `${perf.headwind >= 0 ? "+" : ""}${perf.headwind} kt`,
          color: perf.headwind < -5 ? "var(--amber)" : perf.headwind > 0 ? "var(--green)" : undefined },
        { k: "CW",   v: `${perf.crosswind} kt`,
          color: perf.crosswind > 20 ? "var(--red)" : perf.crosswind > 15 ? "var(--amber)" : undefined },
        { k: "Mass", v: `${perf.mass} kg` },
      ].map(({ k, v, color }) => (
        <span key={k} style={{
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--bg3)",
          border: "0.5px solid var(--border)",
          color: color ?? "var(--muted)",
          fontVariantNumeric: "tabular-nums",
        }}>
          <span style={{ color: "var(--faint)", marginRight: 3 }}>{k}</span>{v}
        </span>
      ))}
    </div>
  );
}

function FactorRow({ label, val }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 10,
      color: "var(--muted)",
      padding: "2px 0",
      borderBottom: "0.5px solid var(--bg2)",
    }}>
      <span>{label}</span>
      <span style={{ color: val !== 1 ? "var(--amber)" : "var(--text)", fontWeight: 600 }}>
        × {val.toFixed(2)}
      </span>
    </div>
  );
}

/**
 * Single aerodrome performance column.
 * Used for Departure, Destination and Alternate.
 */
function AeroColumn({ label, phase, adKey, perf, ad }) {
  const isDep = phase === "takeoff";
  const accentDep  = "#58a6ff";
  const accentLdr  = "#3fb950";
  const accentLrr  = "#d29922";

  const chartP = perf ? {
    pressAlt: perf.pa,
    oat:      perf.oat,
    mass:     perf.mass,
    wind:     perf.headwind,
  } : null;

  return (
    <div className="card" style={{ height: "100%" }}>
      {/* Column header */}
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
          <span className={`badge badge-${isDep ? "ok" : "ok"}`}>
            {isDep ? "T/O" : "LDG"}
          </span>
        ) : (
          <span className="badge badge-muted">—</span>
        )}
      </div>

      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!perf ? (
          <p style={{ fontSize: 12, color: "var(--faint)", textAlign: "center", padding: "20px 0" }}>
            Enter {label.toLowerCase()} data on the Setup page
          </p>
        ) : (
          <>
            {/* Conditions badges */}
            <ConditionsBadges perf={perf} />

            {/* Result tiles */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isDep ? "1fr" : "1fr 1fr",
              gap: 8,
            }}>
              {isDep ? (
                <ResultTile label="TODR" value={perf.todr} colorClass="todr" />
              ) : (
                <>
                  <ResultTile label="LDR" value={perf.ldr} colorClass="ldr" />
                  <ResultTile label="LRR" value={perf.lrr} colorClass="lrr" />
                </>
              )}
            </div>

            {/* Factor breakdown */}
            {(isDep ? perf.todr : perf.ldr)?.breakdown && (() => {
              const bd = (isDep ? perf.todr : perf.ldr).breakdown;
              return (
                <div style={{
                  background: "var(--bg2)",
                  border: "0.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 8px",
                }}>
                  <FactorRow label="Slope"  val={bd.slopeFactor}  />
                  <FactorRow label="Surface" val={bd.surfFactor}  />
                  <FactorRow label="Cond."  val={bd.condFactor}   />
                  <FactorRow label="Safety" val={bd.safetyFactor} />
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--text)",
                    fontWeight: 700,
                    paddingTop: 4,
                  }}>
                    <span>Overall</span>
                    <span style={{ color: (isDep ? perf.todr : perf.ldr).overall > 1.05 ? "var(--amber)" : "var(--text)" }}>
                      × {(isDep ? perf.todr : perf.ldr).overall.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Runway diagram */}
            <div style={{
              background: "var(--bg2)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 10px",
            }}>
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

            {/* Charts */}
            {isDep && !perf.todr?.error && chartP && (
              <PerfChart
                chartId={`todr-${adKey}`}
                title="T/O over 50 ft"
                data={TD_DATA}
                params={{ ...chartP, result: perf.todr?.corrected }}
                accentColor={accentDep}
              />
            )}
            {!isDep && !perf.ldr?.error && chartP && (
              <PerfChart
                chartId={`ldr-${adKey}`}
                title="Landing over 50 ft"
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

/**
 * PerformancePage — Page 3
 *
 * Three equal columns side by side: Departure | Destination | Alternate
 */
export function PerformancePage({ perfDep, perfDest, perfAlt, state }) {
  const dep  = state.aerodromes.dep;
  const dest = state.aerodromes.dest;
  const alt  = state.aerodromes.alt;

  return (
    <main style={{
      flex: 1,
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 16,
      padding: "16px 20px 48px",
      alignItems: "start",
    }}>
      <AeroColumn
        label="Departure"
        phase="takeoff"
        adKey="dep"
        perf={perfDep}
        ad={dep}
      />
      <AeroColumn
        label="Destination"
        phase="landing"
        adKey="dest"
        perf={perfDest}
        ad={dest}
      />
      <AeroColumn
        label="Alternate"
        phase="landing"
        adKey="alt"
        perf={perfAlt}
        ad={alt}
      />
    </main>
  );
}
