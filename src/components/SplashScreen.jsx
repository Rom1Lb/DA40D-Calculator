export function SplashScreen({ onContinue }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 680,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "#1a7f5a",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: "var(--text)",
              }}
            >
              DA40-D Calculator
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              NewCAG fleet · AFM Doc. #6.01.05-E Rev. 7 · 27-Sep-2013
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div
          style={{
            background: "var(--bg1)",
            border: "0.5px solid var(--border)",
            borderRadius: 10,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "var(--muted)",
            }}
          >
            Purpose
          </div>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            This tool provides pre-flight Mass &amp; Balance and performance
            calculations for the Diamond DA40-D aircraft operated by NewCAG. It
            computes:
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              [
                "M&B",
                "Take-off, landing and zero-fuel masses and CG positions",
              ],
              ["TODR", "Take-off distance required over 50 ft obstacle"],
              ["LDR", "Landing distance required over 50 ft obstacle"],
              ["LRR", "Landing roll required (ground roll)"],
            ].map(([label, desc]) => (
              <div
                key={label}
                style={{
                  background: "var(--bg2)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--blue)",
                    letterSpacing: "0.3px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to use */}
        <div
          style={{
            background: "var(--bg1)",
            border: "0.5px solid var(--border)",
            borderRadius: 10,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "var(--muted)",
            }}
          >
            How to use
          </div>
          {[
            [
              "1",
              "Select your aircraft registration. The empty mass, arm and fuel capacity are loaded automatically.",
            ],
            [
              "2",
              "Enter the loading: front and rear seat occupants, baggage and fuel quantities. The CG envelope is drawn live.",
            ],
            [
              "3",
              "Fill in aerodrome data for Departure, Destination and optionally Alternate: ICAO code, runway in use, elevation, QNH, OAT and wind. Pressure altitude, headwind and crosswind are computed automatically.",
            ],
            [
              "4",
              "Select correction factors for each aerodrome: runway slope, condition (dry/wet), surface type and optional safety factor.",
            ],
            [
              "5",
              'Performance results and AFM-style charts appear automatically. Use "Export PDF" to generate a pre-flight brief.',
            ],
          ].map(([num, text]) => (
            <div
              key={num}
              style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--blue-bg)",
                  border: "0.5px solid rgba(88,166,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--blue)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {num}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Assumptions */}
        <div
          style={{
            background: "var(--bg1)",
            border: "0.5px solid var(--border)",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "var(--muted)",
              marginBottom: 10,
            }}
          >
            Calculation assumptions
          </div>
          <ul
            style={{
              paddingLeft: 18,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {[
              "All interpolations are of linear type.",
              "Performance figures are graphically computed from digitised DA40-D AFM charts (Section 5).",
              "Wind correction: only headwind components are applied for landing distances (per AFM).",
              "Tailwind correction is applied for take-off distances when wind component is negative.",
              "Altimeter setting used for pressure altitude correction: 1013.25 hPa / 29.92 inHg.",
            ].map((item, i) => (
              <li
                key={i}
                style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            background: "rgba(210,153,34,0.08)",
            border: "0.5px solid rgba(210,153,34,0.3)",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6 }}>
            <strong>⚠ Disclaimer —</strong> The end-user is responsible for
            filling this tool with valid and consistent data, checking all
            results by performing a gross error check, and ensuring aircraft
            limitations are not exceeded. All information provided is for
            additional reference only. The pilot must confirm and verify all
            results against the AFM, which remains the authoritative source at
            all times.
            <strong> Not for operational use.</strong>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          style={{
            padding: "14px 32px",
            background: "#1a7f5a",
            border: "none",
            borderRadius: 8,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "-0.2px",
            transition: "opacity 0.15s",
            alignSelf: "flex-end",
          }}
          onMouseOver={(e) => (e.target.style.opacity = "0.85")}
          onMouseOut={(e) => (e.target.style.opacity = "1")}
        >
          I understand — open calculator →
        </button>
      </div>
    </div>
  );
}
