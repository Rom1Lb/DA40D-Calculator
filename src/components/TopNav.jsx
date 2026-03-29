import { NavLink, useLocation } from "react-router-dom";

/**
 * TopNav — sticky navigation bar shared by all pages.
 *
 * Pages:
 *   /          → Setup   (aircraft + aerodromes)
 *   /mass-balance → M&B
 *   /performance  → Performance results
 */
export function TopNav({ activeWarning, warnings, onPDF }) {
  const location = useLocation();

  const wLevel = activeWarning?.level ?? "ok";
  const wText = activeWarning
    ? activeWarning.text
    : warnings?.length === 0
      ? "All checks passed"
      : `${warnings?.length ?? 0} notice${(warnings?.length ?? 0) > 1 ? "s" : ""}`;

  const navItems = [
    { to: "/", label: "Setup", short: "1" },
    { to: "/mass-balance", label: "Mass & Balance", short: "2" },
    { to: "/performance", label: "Performance", short: "3" },
  ];

  return (
    <header className="topbar" style={{ gap: 0 }}>
      {/* Brand */}
      <div className="topbar-brand" style={{ flexShrink: 0, marginRight: 16 }}>
        <div className="brand-icon">
          <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div>
          <div className="brand-title">DA40-D Calculator</div>
          <div className="brand-sub">NewCAG · AFM Rev. 7</div>
        </div>
      </div>

      {/* Page navigation */}
      <nav
        className="topnav-pages"
        style={{
          display: "flex",
          gap: 2,
          background: "var(--bg2)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 3,
          flexShrink: 0,
        }}
      >
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 6,
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Warning badge */}
      <div
        className={`topbar-warning ${wLevel}`}
        style={{ maxWidth: 340, flexShrink: 1 }}
      >
        <div className="dot" />
        <span>{wText}</span>
      </div>

      {/* Separator */}
      <div
        style={{
          width: "0.5px",
          height: 28,
          background: "var(--border)",
          flexShrink: 0,
          margin: "0 12px",
        }}
      />

      {/* Export PDF */}
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
        Export PDF
      </button>
    </header>
  );
}
