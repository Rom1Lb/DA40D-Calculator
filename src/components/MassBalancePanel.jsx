import { InputField } from "./InputField.jsx";
import { CGEnvelopeChart } from "../charts/CGEnvelopeChart.jsx";
import { AIRCRAFT_LIST } from "../data/aircraft.js";

export function MassBalancePanel({ state, setField, mb, hideCGChart = false }) {
  const ac = AIRCRAFT_LIST.find((a) => a.registration === state.acReg);
  const maxFuel = ac?.fuelUSG ?? 28;

  const fuelKg = (v) => {
    const n = Number(v);
    if (isNaN(n) || !n) return "";
    return `≈ ${Math.round(n * 3.785)} L / ${Math.round(n * 0.84 * 3.785)} kg`;
  };

  // Total affiché à côté du label de rangée
  const rowTotal = (a, b) => {
    const t = (Number(a) || 0) + (Number(b) || 0);
    return t > 0 ? `${t} kg` : "";
  };

  function cgBadge() {
    if (!mb) return <span className="badge badge-muted">—</span>;
    const worst = [mb.cgStatus.zf, mb.cgStatus.tom, mb.cgStatus.lm];
    if (worst.includes("danger"))
      return <span className="badge badge-danger">CG out of limits</span>;
    if (worst.includes("warning"))
      return <span className="badge badge-warning">Utility only</span>;
    if (mb.mtowExceeded)
      return <span className="badge badge-danger">MTOW exceeded</span>;
    return <span className="badge badge-ok">CG in limits</span>;
  }

  const statusColor = (st) =>
    st === "danger"
      ? "var(--red)"
      : st === "warning"
        ? "var(--amber)"
        : "var(--green)";

  // Style pour le header de colonne L / R
  const colHeader = {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--faint)",
    textAlign: "right",
    paddingBottom: 4,
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Mass &amp; Balance</span>
        {cgBadge()}
      </div>
      <div
        className="card-body"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Input table ── */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th
                style={{
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 500,
                  padding: "0 0 6px 0",
                }}
              >
                Item
              </th>
              <th style={colHeader}>Left (kg)</th>
              <th style={colHeader}>Right (kg)</th>
              <th style={{ ...colHeader, color: "var(--muted)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Front seats */}
            <tr>
              <td
                style={{
                  padding: "5px 0",
                  color: "var(--text)",
                  verticalAlign: "middle",
                }}
              >
                Front seats
              </td>
              <td style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.frontLeftKg}
                  onChange={(v) => setField("frontLeftKg", v)}
                  min={0}
                  max={200}
                  inputStyle={{ textAlign: "right" }}
                />
              </td>
              <td style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.frontRightKg}
                  onChange={(v) => setField("frontRightKg", v)}
                  min={0}
                  max={200}
                  inputStyle={{ textAlign: "right" }}
                />
              </td>
              <td
                style={{
                  padding: "4px 0 4px 10px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {rowTotal(state.frontLeftKg, state.frontRightKg)}
              </td>
            </tr>

            {/* Rear seats */}
            <tr>
              <td
                style={{
                  padding: "5px 0",
                  color: "var(--text)",
                  verticalAlign: "middle",
                }}
              >
                Rear seats
              </td>
              <td style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.rearLeftKg}
                  onChange={(v) => setField("rearLeftKg", v)}
                  min={0}
                  max={200}
                  inputStyle={{ textAlign: "right" }}
                />
              </td>
              <td style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.rearRightKg}
                  onChange={(v) => setField("rearRightKg", v)}
                  min={0}
                  max={200}
                  inputStyle={{ textAlign: "right" }}
                />
              </td>
              <td
                style={{
                  padding: "4px 0 4px 10px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {rowTotal(state.rearLeftKg, state.rearRightKg)}
              </td>
            </tr>

            {/* Baggage — colspan sur les 2 colonnes input */}
            <tr>
              <td
                style={{
                  padding: "5px 0",
                  color: "var(--text)",
                  verticalAlign: "middle",
                }}
              >
                Baggage
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  {" "}
                  (max 30 kg)
                </span>
              </td>
              <td colSpan={2} style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.bagFwdKg}
                  onChange={(v) => setField("bagFwdKg", v)}
                  min={0}
                  max={45}
                />
              </td>
              <td
                style={{
                  padding: "4px 0 4px 10px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--muted)",
                }}
              >
                {state.bagFwdKg ? `${Number(state.bagFwdKg) || 0} kg` : ""}
              </td>
            </tr>

            <tr>
              <td colSpan={4} style={{ padding: "2px 0" }}>
                <div style={{ borderTop: "1px solid var(--border)" }} />
              </td>
            </tr>

            {/* Fuel */}
            <tr>
              <td
                style={{
                  padding: "5px 0",
                  color: "var(--text)",
                  verticalAlign: "middle",
                }}
              >
                Fuel
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  {" "}
                  (max {maxFuel} USG)
                </span>
              </td>
              <td colSpan={2} style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.fuelUSG}
                  onChange={(v) => setField("fuelUSG", v)}
                  min={0}
                  max={maxFuel}
                  hint={fuelKg(state.fuelUSG)}
                />
              </td>
              <td />
            </tr>

            {/* Burnt fuel */}
            <tr>
              <td
                style={{
                  padding: "5px 0",
                  color: "var(--text)",
                  verticalAlign: "middle",
                }}
              >
                Burnt fuel
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  {" "}
                  (dep→ldg)
                </span>
              </td>
              <td colSpan={2} style={{ padding: "4px 0 4px 6px" }}>
                <InputField
                  value={state.burntFuelUSG}
                  onChange={(v) => setField("burntFuelUSG", v)}
                  min={0}
                  max={maxFuel}
                  hint={fuelKg(state.burntFuelUSG)}
                />
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        {/* ── Results ── */}
        {mb && (
          <>
            <div className="divider" style={{ margin: "0" }} />
            <div className="sub-header">Loading breakdown</div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 0",
                    }}
                  >
                    Item
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    Mass (kg)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    Arm (m)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    Moment
                  </th>
                </tr>
              </thead>
              <tbody>
                {mb.items
                  .filter((i) => i.mass > 0)
                  .map((item, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          "0.5px solid var(--border-faint, rgba(255,255,255,.06))",
                      }}
                    >
                      <td style={{ padding: "4px 0", color: "var(--muted)" }}>
                        {item.label}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.mass.toFixed(1)}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--muted)",
                        }}
                      >
                        {item.arm?.toFixed(3) ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "4px 0",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--muted)",
                        }}
                      >
                        {(item.mass * (item.arm ?? 0)).toFixed(1)}
                      </td>
                    </tr>
                  ))}

                {/* Taxi fuel */}
                <tr
                  style={{
                    borderBottom:
                      "0.5px solid var(--border-faint, rgba(255,255,255,.06))",
                  }}
                >
                  <td style={{ padding: "4px 0", color: "var(--muted)" }}>
                    Taxi fuel{" "}
                    <span style={{ color: "var(--faint)", fontSize: 10 }}>
                      (fixed)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--amber)",
                    }}
                  >
                    − {(mb.taxiKg ?? 1.5).toFixed(1)}
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--muted)",
                    }}
                  >
                    {(mb.taxiArm ?? 2.63).toFixed(3)}
                  </td>
                  <td
                    style={{
                      padding: "4px 0",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--muted)",
                    }}
                  >
                    − {((mb.taxiKg ?? 1.5) * (mb.taxiArm ?? 2.63)).toFixed(1)}
                  </td>
                </tr>

                {/* Burnt fuel */}
                {Number(state.burntFuelUSG) > 0 &&
                  (() => {
                    const burntKg =
                      Math.round(
                        Number(state.burntFuelUSG) * 0.84 * 3.785 * 10,
                      ) / 10;
                    const burntArm = mb.taxiArm ?? 2.63;
                    return (
                      <tr
                        style={{
                          borderBottom:
                            "0.5px solid var(--border-faint, rgba(255,255,255,.06))",
                        }}
                      >
                        <td style={{ padding: "4px 0", color: "var(--muted)" }}>
                          Burnt fuel{" "}
                          <span style={{ color: "var(--faint)", fontSize: 10 }}>
                            ({state.burntFuelUSG} USG)
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "4px 8px",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--amber)",
                          }}
                        >
                          − {burntKg.toFixed(1)}
                        </td>
                        <td
                          style={{
                            padding: "4px 8px",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--muted)",
                          }}
                        >
                          {burntArm.toFixed(3)}
                        </td>
                        <td
                          style={{
                            padding: "4px 0",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--muted)",
                          }}
                        >
                          − {(burntKg * burntArm).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })()}
              </tbody>
            </table>

            <div className="divider" style={{ margin: "0" }} />

            {/* ZFM / Ramp / TOM / LM */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 0",
                    }}
                  >
                    Phase
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    Mass (kg)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    CG (m)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "0 0 5px 8px",
                    }}
                  >
                    Moment
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Zero Fuel", d: mb.zf, st: mb.cgStatus.zf },
                  { label: "Ramp", d: mb.ramp, st: mb.cgStatus.ramp },
                  { label: "Take-Off", d: mb.tom, st: mb.cgStatus.tom },
                  { label: "Landing", d: mb.lm, st: mb.cgStatus.lm },
                ]
                  .filter(({ d }) => d)
                  .map(({ label, d, st }) => (
                    <tr
                      key={label}
                      style={{
                        borderBottom:
                          "0.5px solid var(--border-faint, rgba(255,255,255,.06))",
                      }}
                    >
                      <td style={{ padding: "5px 0", fontWeight: 600 }}>
                        {label}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {d.mass}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: statusColor(st),
                          fontWeight: 600,
                        }}
                      >
                        {d.cg.toFixed(3)}
                      </td>
                      <td
                        style={{
                          padding: "5px 0",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--muted)",
                        }}
                      >
                        {d.moment.toFixed(1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {mb.mtowExceeded && (
              <div
                style={{
                  background: "var(--red-bg)",
                  border: "0.5px solid rgba(248,81,73,.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "var(--red)",
                }}
              >
                MTOW exceeded — maximum 1150 kg
              </div>
            )}

            {!hideCGChart && (
              <>
                <div className="divider" style={{ margin: "0" }} />
                <div className="sub-header">
                  CG Envelope — Normal &amp; Utility categories
                </div>
                <CGEnvelopeChart mb={mb} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
