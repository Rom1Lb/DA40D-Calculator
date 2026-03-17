import { useState, useEffect, useCallback } from "react";
import { useAppState } from "./hooks/useAppState.js";
import { AircraftPanel } from "./components/AircraftPanel.jsx";
import { MassBalancePanel } from "./components/MassBalancePanel.jsx";
import { AerodromePanel } from "./components/AerodromePanel.jsx";
import { PerformancePanel } from "./components/PerformancePanel.jsx";
import { SplashScreen } from "./components/SplashScreen.jsx";
import { generateDispatchPDF } from "./pdf/report.js";
import { AIRCRAFT_LIST } from "./data/aircraft.js";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const {
    state,
    setField,
    setAeroField,
    mb,
    perfDep,
    perfDest,
    perfAlt,
    warnings,
    activeWarning,
  } = useAppState();

  const now = useClock();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const utcStr = now.toUTCString().slice(17, 22) + "z";

  const handlePDF = useCallback(async () => {
    try {
      await generateDispatchPDF({
        state,
        mb,
        perfDep,
        perfDest,
        perfAlt,
        shownCharts: { todr: true, ldr: true, lrr: true },
        aircraftList: AIRCRAFT_LIST,
      });
    } catch (e) {
      console.error("PDF failed:", e);
      alert("PDF generation failed — see console for details.");
    }
  }, [state, mb, perfDep, perfDest, perfAlt]);

  const wLevel = activeWarning?.level ?? "ok";
  const wText = activeWarning
    ? activeWarning.text
    : warnings.length === 0
      ? "All checks passed"
      : `${warnings.length} notice${warnings.length > 1 ? "s" : ""}`;

  if (showSplash) {
    return <SplashScreen onContinue={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <div>
            <div className="brand-title">DA40-D Performance</div>
            <div className="brand-sub">
              NewCAG fleet · AFM Doc. #6.01.05-E Rev. 7 · 27-Sep-2013
            </div>
          </div>
        </div>

        <div className="topbar-clock">
          <div className="clock-date">{dateStr}</div>
          <div className="clock-utc">{utcStr}</div>
        </div>

        <div
          style={{
            width: "0.5px",
            height: 28,
            background: "var(--border)",
            flexShrink: 0,
          }}
        />

        <div className={`topbar-warning ${wLevel}`}>
          <div className="dot" />
          <span>{wText}</span>
        </div>

        <button
          className="btn btn-primary"
          onClick={generateDispatchPDF}
          style={{ flexShrink: 0 }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </header>

      <main className="main-grid">
        <div className="col col-mb">
          <MassBalancePanel state={state} setField={setField} mb={mb} />
        </div>
        <div className="col col-mid">
          <AircraftPanel state={state} setField={setField} mb={mb} />
          <AerodromePanel
            state={state}
            setAeroField={setAeroField}
            perfDep={perfDep}
            perfDest={perfDest}
            perfAlt={perfAlt}
            mb={mb}
          />
        </div>
        <div className="col col-perf">
          <PerformancePanel
            perfDep={perfDep}
            perfDest={perfDest}
            perfAlt={perfAlt}
            mb={mb}
            state={state}
          />
        </div>
      </main>
    </div>
  );
}
