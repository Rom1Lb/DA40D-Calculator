import { useState, useEffect, useCallback } from "react";

const CHECKWX_KEY = import.meta.env.VITE_CHECKWX_KEY ?? "";
const REFRESH_MS = 5 * 60 * 1000;

async function fetchMetar(icao) {
  if (!CHECKWX_KEY || !icao) return null;
  try {
    const res = await fetch(`https://api.checkwx.com/metar/${icao}/decoded`, {
      headers: { "X-API-Key": CHECKWX_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const m = json?.data?.[0];
    if (!m) return null;

    const oat = m.temperature?.celsius ?? null;
    const dp = m.dewpoint?.celsius ?? null;
    let rh = null;
    if (oat !== null && dp !== null) {
      rh = Math.round(
        (100 * Math.exp((17.625 * dp) / (243.04 + dp))) /
          Math.exp((17.625 * oat) / (243.04 + oat)),
      );
    }

    // Normalise cloud layers — CheckWX decoded gives base_feet_agl in feet
    const clouds = (m.clouds ?? []).map((c) => ({
      code: c.code ?? "",
      // base_feet_agl is already in feet (e.g. 2500), never in hundreds
      altFt: c.base_feet_agl ?? null,
    }));

    return {
      raw: m.raw_text ?? "",
      station: m.icao ?? icao,
      obsTime: m.observed ?? null,
      oat,
      dp,
      rh,
      qnh: m.barometer?.hpa ?? null,
      windDir: m.wind?.degrees ?? null,
      windSpd: m.wind?.speed_kts ?? null,
      windGust: m.wind?.gust_kts ?? null,
      windVariable: m.wind?.degrees == null,
      vis: m.visibility?.meters ?? null,
      clouds,
      weather: (m.conditions ?? []).map((c) => c.text ?? c.code).join(", "),
      flightCategory: m.flight_category ?? null,
      trend: m.trend?.type ?? null,
    };
  } catch {
    return null;
  }
}

function categoryColor(cat) {
  switch (cat) {
    case "VFR":
      return "var(--green)";
    case "MVFR":
      return "var(--blue)";
    case "IFR":
      return "var(--red)";
    case "LIFR":
      return "#a855f7";
    default:
      return "var(--muted)";
  }
}

function categoryBg(cat) {
  switch (cat) {
    case "VFR":
      return "rgba(63,185,80,0.08)";
    case "MVFR":
      return "rgba(88,166,255,0.08)";
    case "IFR":
      return "rgba(248,81,73,0.08)";
    case "LIFR":
      return "rgba(168,85,247,0.08)";
    default:
      return "transparent";
  }
}

function WindArrow({ dir, variable }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      style={{ flexShrink: 0, color: "var(--text)" }}
    >
      {variable ? (
        <circle
          cx="11"
          cy="11"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : (
        <g transform={`rotate(${dir ?? 0}, 11, 11)`}>
          <line
            x1="11"
            y1="18"
            x2="11"
            y2="7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon points="11,2 7,9 15,9" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}

function CloudRow({ clouds }) {
  if (!clouds || clouds.length === 0) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--green)",
          padding: "2px 8px",
          background: "rgba(63,185,80,0.1)",
          borderRadius: 4,
        }}
      >
        CAVOK
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {clouds.map((c, i) => {
        const isBad = c.code === "OVC" || c.code === "BKN";
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "5px 10px",
              borderRadius: 6,
              minWidth: 52,
              background: isBad ? "rgba(248,81,73,0.1)" : "var(--bg2)",
              border: `0.5px solid ${isBad ? "rgba(248,81,73,0.35)" : "var(--border)"}`,
            }}
          >
            {/* Cloud cover code */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: isBad ? "var(--red)" : "var(--text)",
              }}
            >
              {c.code}
            </span>
            {/* Altitude */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: isBad ? "var(--red)" : "var(--muted)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              {c.altFt != null ? `${c.altFt.toLocaleString()} ft` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DataTile({ label, value, accent }) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "6px 8px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--faint)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: accent ?? "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetarCard({ label, icao, phase }) {
  const [metar, setMetar] = useState(null);
  const [status, setStatus] = useState("idle");
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    if (!icao) {
      setStatus("idle");
      setMetar(null);
      return;
    }
    setStatus("loading");
    const m = await fetchMetar(icao.toUpperCase());
    if (m) {
      setMetar(m);
      setStatus("ok");
      setLastFetch(new Date());
    } else setStatus("error");
  }, [icao]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const phaseLabel =
    phase === "takeoff" ? "DEP" : phase === "landing-dest" ? "DEST" : "ALT";
  const phaseColor =
    phase === "takeoff"
      ? "var(--blue)"
      : phase === "landing-dest"
        ? "var(--green)"
        : "var(--amber)";

  const obsFormatted = metar?.obsTime
    ? (() => {
        const d = new Date(metar.obsTime);
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const mm = String(d.getUTCMinutes()).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const mo = d.toUTCString().slice(8, 11);
        return `${dd} ${mo} ${hh}:${mm}z`;
      })()
    : null;

  return (
    <div
      style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: metar?.flightCategory
            ? categoryBg(metar.flightCategory)
            : "transparent",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
              padding: "2px 7px",
              borderRadius: 4,
              background: `${phaseColor}20`,
              color: phaseColor,
              letterSpacing: "0.6px",
            }}
          >
            {phaseLabel}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {icao || <span style={{ color: "var(--faint)" }}>{label}</span>}
          </span>
          {metar?.flightCategory && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                color: categoryColor(metar.flightCategory),
              }}
            >
              {metar.flightCategory}
            </span>
          )}
          {metar?.trend && metar.trend !== "NOSIG" && (
            <span
              style={{
                fontSize: 9,
                color: "var(--amber)",
                flexShrink: 0,
                border: "0.5px solid rgba(210,153,34,0.4)",
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              {metar.trend}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {obsFormatted && (
            <span
              style={{
                fontSize: 9,
                color: "var(--faint)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {obsFormatted}
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
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{
                animation:
                  status === "loading" ? "_spin 0.75s linear infinite" : "none",
              }}
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {!icao && (
          <p style={{ fontSize: 11, color: "var(--faint)", margin: 0 }}>
            Enter ICAO code on the Setup page
          </p>
        )}
        {icao && status === "loading" && !metar && (
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Fetching METAR…
          </p>
        )}
        {icao && status === "error" && !metar && (
          <div>
            <p style={{ fontSize: 11, color: "var(--red)", margin: 0 }}>
              No METAR available
            </p>
            {!CHECKWX_KEY && (
              <p
                style={{
                  fontSize: 10,
                  color: "var(--faint)",
                  margin: "4px 0 0",
                }}
              >
                Add <code>VITE_CHECKWX_KEY</code> to .env.local
              </p>
            )}
          </div>
        )}

        {metar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Wind */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "var(--bg2)",
                border: "0.5px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <WindArrow dir={metar.windDir} variable={metar.windVariable} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {metar.windVariable
                    ? "Variable"
                    : `${String(metar.windDir ?? 0).padStart(3, "0")}° / ${metar.windSpd ?? "—"} kt`}
                  {metar.windGust != null && (
                    <span
                      style={{
                        color: "var(--amber)",
                        marginLeft: 6,
                        fontSize: 14,
                      }}
                    >
                      G{metar.windGust} kt
                    </span>
                  )}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--faint)", marginTop: 2 }}
                >
                  {metar.windVariable
                    ? "Wind direction variable"
                    : "Direction / speed"}
                </div>
              </div>
            </div>

            {/* Data tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
              }}
            >
              <DataTile
                label="OAT"
                value={metar.oat != null ? `${metar.oat} °C` : "—"}
              />
              <DataTile
                label="Dew point"
                value={metar.dp != null ? `${metar.dp} °C` : "—"}
              />
              <DataTile
                label="Humidity"
                value={metar.rh != null ? `${metar.rh} %` : "—"}
                accent={
                  metar.rh != null && metar.rh > 85 ? "var(--amber)" : undefined
                }
              />
              <DataTile
                label="QNH"
                value={metar.qnh != null ? `${metar.qnh} hPa` : "—"}
                accent="var(--blue)"
              />
              <DataTile
                label="Visibility"
                value={
                  metar.vis != null
                    ? metar.vis >= 9999
                      ? "≥ 10 km"
                      : metar.vis >= 1000
                        ? `${(metar.vis / 1000).toFixed(1)} km`
                        : `${metar.vis} m`
                    : "—"
                }
                accent={
                  metar.vis != null && metar.vis < 5000
                    ? "var(--amber)"
                    : undefined
                }
              />
              <DataTile label="Wx" value={metar.weather || "—"} />
            </div>

            {/* Cloud layers */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Cloud layers
              </div>
              <CloudRow clouds={metar.clouds} />
            </div>

            {/* Raw METAR */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 5,
                }}
              >
                Raw METAR
              </div>
              <div
                style={{
                  padding: "7px 10px",
                  background: "var(--bg2)",
                  border: "0.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 10,
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  wordBreak: "break-all",
                  lineHeight: 1.6,
                }}
              >
                {metar.raw || "—"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetarSidebar({ aerodromes }) {
  const dep = aerodromes?.dep?.icao ?? "";
  const dest = aerodromes?.dest?.icao ?? "";
  const alt = aerodromes?.alt?.icao ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: "var(--bg1)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="card-title">Live METARs</span>
        <span style={{ fontSize: 9, color: "var(--faint)" }}>
          auto-refresh 5 min
        </span>
      </div>

      <MetarCard label="Departure" icao={dep} phase="takeoff" />
      <MetarCard label="Destination" icao={dest} phase="landing-dest" />
      <MetarCard label="Alternate" icao={alt} phase="landing-alt" />

      {!CHECKWX_KEY && (
        <div className="disclaimer" style={{ fontSize: 10 }}>
          ⓘ Live METAR requires <code>VITE_CHECKWX_KEY</code> in{" "}
          <code>.env.local</code>
        </div>
      )}
    </div>
  );
}
