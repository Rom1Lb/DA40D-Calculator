import { useState, useEffect, useCallback } from "react";

const CHECKWX_KEY = import.meta.env.VITE_CHECKWX_KEY ?? "";
const REFRESH_MS = 5 * 60 * 1000; // 5 min auto-refresh

/**
 * Fetch a decoded METAR from CheckWX.
 * Returns a normalised object or null on failure.
 */
async function fetchMetar(icao) {
  if (!CHECKWX_KEY || !icao) return null;
  try {
    const res = await fetch(
      `https://api.checkwx.com/metar/${icao}/decoded`,
      { headers: { "X-API-Key": CHECKWX_KEY } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const m = json?.data?.[0];
    if (!m) return null;
    return {
      raw: m.raw_text ?? "",
      station: m.icao ?? icao,
      time: m.observed?.slice(11, 16) + "z" ?? "",
      oat: m.temperature?.celsius ?? null,
      dp: m.dewpoint?.celsius ?? null,
      qnh: m.barometer?.hpa ?? null,
      windDir: m.wind?.degrees ?? null,
      windSpd: m.wind?.speed_kts ?? null,
      windGust: m.wind?.gust_kts ?? null,
      vis: m.visibility?.meters ?? null,
      clouds: (m.clouds ?? []).map((c) => `${c.code}${c.base_feet_agl}`).join(" ") || "CAVOK",
      flightCategory: m.flight_category ?? null,
    };
  } catch {
    return null;
  }
}

function categoryColor(cat) {
  switch (cat) {
    case "VFR":  return "var(--green)";
    case "MVFR": return "var(--blue)";
    case "IFR":  return "var(--red)";
    case "LIFR": return "#a855f7";
    default:     return "var(--muted)";
  }
}

function WindArrow({ dir }) {
  if (dir == null) return null;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      <g transform={`rotate(${dir}, 8, 8)`}>
        <line x1="8" y1="13" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <polygon points="8,2 5,7 11,7" fill="currentColor" />
      </g>
    </svg>
  );
}

function MetarCard({ label, icao, phase }) {
  const [metar, setMetar] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    if (!icao) { setStatus("idle"); setMetar(null); return; }
    setStatus("loading");
    const m = await fetchMetar(icao.toUpperCase());
    if (m) {
      setMetar(m);
      setStatus("ok");
      setLastFetch(new Date());
    } else {
      setStatus("error");
    }
  }, [icao]);

  // Fetch on mount and when ICAO changes
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const phaseLabel = phase === "takeoff" ? "DEP" : phase === "landing-dest" ? "DEST" : "ALT";
  const phaseColor = phase === "takeoff" ? "var(--blue)" : phase === "landing-dest" ? "var(--green)" : "var(--amber)";

  return (
    <div style={{
      background: "var(--bg2)",
      border: "0.5px solid var(--border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        padding: "7px 10px",
        borderBottom: "0.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 3,
            background: `${phaseColor}18`,
            color: phaseColor,
            letterSpacing: "0.5px",
          }}>{phaseLabel}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
            {icao || label}
          </span>
          {metar?.flightCategory && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: categoryColor(metar.flightCategory),
              letterSpacing: "0.5px",
            }}>
              {metar.flightCategory}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lastFetch && (
            <span style={{ fontSize: 9, color: "var(--faint)" }}>
              {lastFetch.toUTCString().slice(17, 22)}z
            </span>
          )}
          <button
            onClick={load}
            disabled={status === "loading"}
            title="Refresh METAR"
            style={{
              background: "none",
              border: "none",
              cursor: status === "loading" ? "wait" : "pointer",
              color: "var(--muted)",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round"
              style={{
                animation: status === "loading" ? "_spin 0.75s linear infinite" : "none",
              }}
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "8px 10px" }}>
        {!icao && (
          <p style={{ fontSize: 10, color: "var(--faint)", margin: 0 }}>
            Enter ICAO code on the Setup page
          </p>
        )}
        {icao && status === "loading" && !metar && (
          <p style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
            Fetching METAR…
          </p>
        )}
        {icao && status === "error" && !metar && (
          <p style={{ fontSize: 10, color: "var(--red)", margin: 0 }}>
            No METAR available
            {!CHECKWX_KEY && " — add VITE_CHECKWX_KEY"}
          </p>
        )}
        {metar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {/* Wind */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <WindArrow dir={metar.windDir} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {metar.windDir != null ? `${String(metar.windDir).padStart(3, "0")}°` : "VRB"}
                {" / "}
                {metar.windSpd ?? "—"} kt
                {metar.windGust != null && (
                  <span style={{ color: "var(--amber)" }}> G{metar.windGust}</span>
                )}
              </span>
            </div>

            {/* Grid: OAT, DP, QNH, Vis */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
              {[
                { k: "OAT", v: metar.oat != null ? `${metar.oat} °C` : "—" },
                { k: "DP",  v: metar.dp  != null ? `${metar.dp} °C`  : "—" },
                { k: "QNH", v: metar.qnh != null ? `${metar.qnh} hPa` : "—" },
                { k: "Vis", v: metar.vis != null ? `${metar.vis >= 9999 ? "10+" : metar.vis} m` : "—" },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>{k}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Clouds */}
            <div style={{ fontSize: 10, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {metar.clouds}
            </div>

            {/* Raw METAR */}
            <div style={{
              marginTop: 2,
              padding: "4px 6px",
              background: "var(--bg3)",
              borderRadius: 4,
              fontSize: 9,
              color: "var(--faint)",
              fontFamily: "var(--font-mono)",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}>
              {metar.raw || "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MetarSidebar — shows live METARs for all 3 aerodromes.
 * Placed on the right side of the Setup page.
 */
export function MetarSidebar({ aerodromes }) {
  const dep  = aerodromes?.dep?.icao  ?? "";
  const dest = aerodromes?.dest?.icao ?? "";
  const alt  = aerodromes?.alt?.icao  ?? "";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Header */}
      <div className="card-header" style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span className="card-title">Live METARs</span>
        <span style={{ fontSize: 9, color: "var(--faint)" }}>auto-refresh 5 min</span>
      </div>

      <MetarCard label="Departure"   icao={dep}  phase="takeoff" />
      <MetarCard label="Destination" icao={dest} phase="landing-dest" />
      <MetarCard label="Alternate"   icao={alt}  phase="landing-alt" />

      {!CHECKWX_KEY && (
        <div className="disclaimer" style={{ fontSize: 10 }}>
          ⓘ Live METAR requires <code>VITE_CHECKWX_KEY</code> in <code>.env.local</code>
        </div>
      )}
    </div>
  );
}
