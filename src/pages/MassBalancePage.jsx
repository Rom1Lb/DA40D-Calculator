import { MassBalancePanel } from "../components/MassBalancePanel.jsx";
import { CGEnvelopeChart } from "../charts/CGEnvelopeChart.jsx";

export function MassBalancePage({ state, setField, mb }) {
  return (
    <main className="mb-page">
      {/* Left — inputs + tables */}
      <MassBalancePanel state={state} setField={setField} mb={mb} hideCGChart />

      {/* Right — CG chart sticky */}
      <div className="mb-chart-col" style={{ position: "sticky", top: 68 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              CG Envelope — Normal &amp; Utility
            </span>
            {mb && (
              <span
                className={`badge badge-${
                  Object.values(mb.cgStatus).includes("danger")
                    ? "danger"
                    : Object.values(mb.cgStatus).includes("warning")
                      ? "warning"
                      : "ok"
                }`}
              >
                {Object.values(mb.cgStatus).includes("danger")
                  ? "Out of limits"
                  : Object.values(mb.cgStatus).includes("warning")
                    ? "Utility only"
                    : "In limits"}
              </span>
            )}
          </div>
          <div className="card-body">
            <CGEnvelopeChart mb={mb} />
          </div>
        </div>
      </div>
    </main>
  );
}
