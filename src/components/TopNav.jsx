import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopNav({ activeWarning, warnings, onPDF }) {
  const now = useClock();

  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const utcStr = now.toUTCString().slice(17, 22) + "z";

  const wLevel = activeWarning?.level ?? "ok";
  const wText = activeWarning
    ? activeWarning.text
    : warnings?.length === 0
      ? "All checks passed"
      : `${warnings?.length ?? 0} notice${(warnings?.length ?? 0) > 1 ? "s" : ""}`;

  const navItems = [
    { to: "/", label: "Setup" },
    { to: "/mass-balance", label: "Mass & Balance" },
    { to: "/performance", label: "Performance" },
  ];

  return (
    <header className="topbar topbar-responsive">
      {/* ── Row 1: Brand + PDF button (always visible) ── */}
      <div className="topbar-row1">
        {/* Brand */}
        <div className="topbar-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <div>
            <div className="brand-title">DA40-D Calculator</div>
            <div
              className="brand-sub"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {dateStr} · {utcStr}
            </div>
          </div>
        </div>

        {/* Right side: warning + separator + PDF */}
        <div className="topbar-right">
          <div
            className={`topbar-warning ${wLevel}`}
            style={{ maxWidth: 280, minWidth: 0 }}
          >
            <div className="dot" />
            <span className="topbar-warning-text">{wText}</span>
          </div>

          <div
            style={{
              width: "0.5px",
              height: 28,
              background: "var(--border)",
              flexShrink: 0,
            }}
          />

          <button
            className="btn btn-primary"
            onClick={onPDF}
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
            <span className="btn-label">Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Row 2: Nav tabs (full width on mobile) ── */}
      <div className="topbar-row2">
        <nav className="topbar-nav">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                padding: "5px 14px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "var(--font)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "background 0.12s, color 0.12s",
                background: isActive ? "var(--bg0)" : "transparent",
                color: isActive ? "var(--text)" : "var(--muted)",
                border: isActive
                  ? "0.5px solid var(--border)"
                  : "0.5px solid transparent",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
