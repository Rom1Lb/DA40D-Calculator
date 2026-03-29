import { MassBalancePanel } from "../components/MassBalancePanel.jsx";
import { AircraftPanel } from "../components/AircraftPanel.jsx";
import { AIRSPEEDS, AIRSPEED_MASS_REFS } from "../data/aircraft.js";
import { calcAirspeeds } from "../engine/index.js";

const CATEGORY_LABELS = {
  normal:  "Normal operations",
  landing: "Landing speeds",
  stall:   "Stall speeds",
  limit:   "Limit speeds",
};

const CATEGORY_COLORS = {
  normal:  "var(--blue)",
  landing: "var(--green)",
  stall:   "var(--amber)",
  limit:   "var(--red)",
};

function AirspeedTable({ mb }) {
  if (!mb) return null;

  const tomSpeeds = calcAirspeeds(mb.tom.mass);
  const lmSpeeds  = calcAirspeeds(mb.lm.mass);

  const byCategory = {};
  tomSpeeds.forEach((spd, i) => {
    if (!byCategory[spd.category]) byCategory[spd.category] = [];
    byCategory[spd.category].push({ ...spd, lmKias: lmSpeeds[i]?.kias });
  });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Operating airspeeds (KIAS)</span>
        <span className="badge badge-muted">interpolated</span>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {Object.entries(byCategory).map(([cat, speeds]) => (
          <div key={cat}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: CATEGORY_COLORS[cat] ?? "var(--muted)",
              marginBottom: 6,
            }}>
              {CATEGORY_LABELS[cat] ?? cat}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {speeds.map((spd) => (
                <div key={spd.code} style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr auto auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "3px 0",
                  borderBottom: "0.5px solid var(--bg2)",
                  fontSize: 11,
                }}>
                  <span style={{ color: CATEGORY_COLORS[cat] ?? "var(--muted)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                    {spd.code}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {spd.name.replace(/^[A-Za-z0-9]+ — /, "")}
                  </span>
                  {!spd.isLimit ? (
                    <>
                      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--blue)" }}>
                        {spd.kias ?? "—"} <span style={{ fontSize: 9, color: "var(--muted)" }}>TOM</span>
                      </span>
                      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--green)", minWidth: 52 }}>
                        {spd.lmKias ?? "—"} <span style={{ fontSize: 9, color: "var(--muted)" }}>LM</span>
                      </span>
                    </>
                  ) : (
                    <span style={{ gridColumn: "3 / 5", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 600 }}>
                      {spd.kias ?? "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--faint)" }}>
          TOM = {mb.tom.mass} kg · LM = {mb.lm.mass} kg · Linearly interpolated from AFM refs ({AIRSPEED_MASS_REFS.join(" / ")} kg)
        </div>
      </div>
    </div>
  );
}

/**
 * MassBalancePage — Page 2
 *
 * Layout (2 columns):
 *   [M&B full panel]  [Airspeeds table]
 */
export function MassBalancePage({ state, setField, mb }) {
  return (
    <main style={{
      flex: 1,
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gap: 16,
      padding: "16px 20px 48px",
      alignItems: "start",
    }}>
      {/* Column 1 — M&B (full) */}
      <MassBalancePanel state={state} setField={setField} mb={mb} />

      {/* Column 2 — Airspeeds */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AirspeedTable mb={mb} />
        {!mb && (
          <div style={{
            color: "var(--faint)",
            fontSize: 12,
            textAlign: "center",
            padding: "24px 0",
          }}>
            Enter loading data on the Setup page to compute airspeeds
          </div>
        )}
      </div>
    </main>
  );
}
