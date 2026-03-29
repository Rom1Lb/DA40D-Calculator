import { AircraftPanel } from "../components/AircraftPanel.jsx";
import { AerodromePanel } from "../components/AerodromePanel.jsx";
import { MetarSidebar } from "../components/MetarSidebar.jsx";

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
    <main className="setup-page">
      {/* Left — Aircraft + Aerodromes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AircraftPanel state={state} setField={setField} mb={mb} />
        <AerodromePanel
          state={state}
          setAeroField={setAeroField}
          setBulkAeroFields={setBulkAeroFields}
          perfDep={perfDep}
          perfDest={perfDest}
          perfAlt={perfAlt}
          mb={mb}
        />
      </div>

      {/* Right — METAR sidebar */}
      <MetarSidebar aerodromes={state.aerodromes} />
    </main>
  );
}
