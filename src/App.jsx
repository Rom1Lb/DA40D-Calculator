import { useState, useCallback } from "react";
import { useAppState } from "./hooks/useAppState.js";
import { TopNav } from "./components/TopNav.jsx";
import { AppRouter } from "./router.jsx";
import { SplashScreen } from "./components/SplashScreen.jsx";
import { generateDispatchPDF } from "./pdf/report.js";
import { AIRCRAFT_LIST } from "./data/aircraft.js";

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);

  const {
    state,
    setField,
    setAeroField,
    setBulkAeroFields,
    mb,
    airspeeds,
    perfDep,
    perfDest,
    perfAlt,
    warnings,
    activeWarning,
  } = useAppState();

  const handleContinue = useCallback(() => {
    setShowSplash(false);
  }, []);

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

  if (showSplash) {
    return <SplashScreen onContinue={handleContinue} />;
  }

  const pageProps = {
    state,
    setField,
    setAeroField,
    setBulkAeroFields,
    mb,
    airspeeds,
    perfDep,
    perfDest,
    perfAlt,
  };

  return (
    <div className="app-shell">
      <TopNav
        activeWarning={activeWarning}
        warnings={warnings}
        onPDF={handlePDF}
      />
      <AppRouter {...pageProps} />
    </div>
  );
}

export default AppShell;
