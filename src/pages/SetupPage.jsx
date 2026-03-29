import { AircraftPanel } from "../components/AircraftPanel.jsx";
import { AerodromePanel } from "../components/AerodromePanel.jsx";
import { MetarSidebar } from "../components/MetarSidebar.jsx";

/**
 * SetupPage — Page 1
 *
 * Layout (3 columns):
 *   [Aircraft card]  [Aerodromes card]  [METAR sidebar]
 */
export function SetupPage({
  state,
  setField,
  setAeroField,
  setBulkAeroFields,
  mb,
  perfDep,
  perfDest,
  perfAlt,
}) {
  return (
    <main style={{
      flex: 1,
      display: "grid",
      gridTemplateColumns: "280px 1fr 260px",
      gap: 16,
      padding: "16px 20px 48px",
      alignItems: "start",
    }}>
      {/* Column 1 — Aircraft */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AircraftPanel state={state} setField={setField} mb={mb} />

        {/* Quick M&B summary — useful to confirm loading without switching page */}
        {mb && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Mass summary</span>
              <span className={`badge badge-${mb.mtowExceeded ? "danger" : "ok"}`}>
                {mb.mtowExceeded ? "MTOW !" : "OK"}
              </span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "ZFM",  d: mb.zf,  st: mb.cgStatus.zf  },
                { label: "TOM",  d: mb.tom, st: mb.cgStatus.tom },
                { label: "LM",   d: mb.lm,  st: mb.cgStatus.lm  },
              ].map(({ label, d, st }) => (
                <div key={label} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "3px 0",
                  borderBottom: "0.5px solid var(--bg2)",
                }}>
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {d.mass} kg
                  </span>
                  <span style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: st === "danger" ? "var(--red)" : st === "warning" ? "var(--amber)" : "var(--green)",
                  }}>
                    CG {d.cg.toFixed(3)} m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer">
          ⚠ For planning only. Verify all figures against the AFM. Not for operational use.
        </div>
      </div>

      {/* Column 2 — Aerodromes */}
      <AerodromePanel
        state={state}
        setAeroField={setAeroField}
        setBulkAeroFields={setBulkAeroFields}
        perfDep={perfDep}
        perfDest={perfDest}
        perfAlt={perfAlt}
        mb={mb}
      />

      {/* Column 3 — METAR sidebar */}
      <MetarSidebar aerodromes={state.aerodromes} />
    </main>
  );
}
