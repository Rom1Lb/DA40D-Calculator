// report.js — DA40-D Dispatch Release PDF
// Single landscape A4 · black & white

import jsPDF from "jspdf";
import { AIRCRAFT_LIST, CG_NORMAL, CG_UTILITY } from "../data/aircraft.js";

// ── Greyscale palette ──────────────────────────────────────────
const C = {
  black: [0, 0, 0],
  dark: [40, 40, 40],
  mid: [110, 110, 110],
  light: [170, 170, 170],
  hairline: [210, 210, 210],
  white: [255, 255, 255],
};
const setFill = (doc, col) => doc.setFillColor(...col);
const setDraw = (doc, col) => doc.setDrawColor(...col);
const setTxt = (doc, col) => doc.setTextColor(...col);

function hRule(doc, y, x1, x2, col = C.hairline, lw = 0.2) {
  setDraw(doc, col);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

// ── Wide, flat CG Envelope (native jsPDF vectors) ──────────────
function drawCGEnvelope(doc, mb, x, y, w, h) {
  const ARM_MIN = 2.36,
    ARM_MAX = 2.64;
  const MASS_MIN = 740,
    MASS_MAX = 1200;
  const PAD = { t: 5, r: 5, b: 10, l: 16 };

  const plotW = w - PAD.l - PAD.r;
  const plotH = h - PAD.t - PAD.b;
  const x0 = x + PAD.l;
  const y0 = y + PAD.t;

  const tx = (a) => x0 + ((a - ARM_MIN) / (ARM_MAX - ARM_MIN)) * plotW;
  const ty = (m) => y0 + (1 - (m - MASS_MIN) / (MASS_MAX - MASS_MIN)) * plotH;

  // Plot area
  setFill(doc, C.white);
  setDraw(doc, C.hairline);
  doc.setLineWidth(0.25);
  doc.rect(x0, y0, plotW, plotH, "FD");

  // Grid
  doc.setLineWidth(0.12);
  setDraw(doc, C.hairline);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);

  const armTicks = [2.4, 2.45, 2.5, 2.55, 2.6];
  const massTicks = [800, 900, 1000, 1100, 1150];

  armTicks.forEach((a) => {
    const gx = tx(a);
    doc.line(gx, y0, gx, y0 + plotH);
    setTxt(doc, C.light);
    doc.text(a.toFixed(2), gx, y0 + plotH + 3.5, { align: "center" });
  });
  massTicks.forEach((m) => {
    const gy = ty(m);
    doc.line(x0, gy, x0 + plotW, gy);
    setTxt(doc, C.light);
    doc.text(String(m), x0 - 1, gy + 1.5, { align: "right" });
  });

  // Axis labels
  doc.setFontSize(5);
  setTxt(doc, C.mid);
  doc.text("CG arm (m)", x0 + plotW / 2, y0 + plotH + 8, { align: "center" });
  doc.text("kg", x + 4, y0 + plotH / 2, { align: "center", angle: 90 });

  // MTOW dashed line
  setDraw(doc, C.mid);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x0, ty(1150), x0 + plotW, ty(1150));
  doc.setLineDashPattern([], 0);
  doc.setFontSize(4.5);
  setTxt(doc, C.mid);
  doc.text("MTOW", x0 + plotW - 1, ty(1150) - 1.5, { align: "right" });

  // Draw closed polygon envelope
  function drawEnvelope(pts, dash, lw) {
    doc.setLineWidth(lw);
    if (dash) doc.setLineDashPattern([1.5, 1], 0);
    const segs = pts.map((p, i) => {
      const n = pts[(i + 1) % pts.length];
      return [tx(n[0]) - tx(p[0]), ty(n[1]) - ty(p[1])];
    });
    doc.lines(segs, tx(pts[0][0]), ty(pts[0][1]), [1, 1], "S", true);
    if (dash) doc.setLineDashPattern([], 0);
  }

  setDraw(doc, C.mid);
  drawEnvelope(CG_UTILITY, true, 0.25);

  setDraw(doc, C.black);
  drawEnvelope(CG_NORMAL, false, 0.4);

  // Zone labels
  doc.setFontSize(4.5);
  setTxt(doc, C.mid);
  doc.text("Normal", tx(2.495), ty(1065), { align: "center" });
  doc.text("Utility+Normal", tx(2.495), ty(875), { align: "center" });

  if (!mb) return;

  const pts = [
    { lbl: "ZFM", cg: mb.zf.cg, mass: mb.zf.mass, st: mb.cgStatus.zf },
    { lbl: "TOM", cg: mb.tom.cg, mass: mb.tom.mass, st: mb.cgStatus.tom },
    { lbl: "LM", cg: mb.lm.cg, mass: mb.lm.mass, st: mb.cgStatus.lm },
  ];

  // Connecting line
  setDraw(doc, C.mid);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1, 0.8], 0);
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(
      tx(pts[i].cg),
      ty(pts[i].mass),
      tx(pts[i + 1].cg),
      ty(pts[i + 1].mass),
    );
  }
  doc.setLineDashPattern([], 0);

  pts.forEach((p) => {
    const px = tx(p.cg),
      py = ty(p.mass);
    setDraw(doc, C.black);
    doc.setLineWidth(0.3);
    if (p.st === "ok") {
      setFill(doc, C.black);
      doc.circle(px, py, 0.6, "FD");
    } else {
      setFill(doc, C.white);
      doc.circle(px, py, 0.8, "FD");
      doc.line(px - 0.6, py - 0.6, px + 0.6, py + 0.6);
      doc.line(px + 0.6, py - 0.6, px - 0.6, py + 0.6);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    setTxt(doc, C.dark);
    const isRight = px > x0 + plotW - 22;
    doc.text(`${p.lbl} ${p.mass}kg`, isRight ? px - 2 : px + 2, py - 2, {
      align: isRight ? "right" : "left",
    });
  });
}

// ── One aerodrome row (horizontal band) ────────────────────────
// Returns new y after drawing the block
function drawAeroRow(doc, { label, ad, perf, isDep, x, y, rowW }) {
  const LEFT_W = 68; // conditions sub-column width
  const RIGHT_X = x + LEFT_W + 4;
  const RIGHT_W = rowW - LEFT_W - 4;

  if (!perf || !ad?.icao) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    setTxt(doc, C.light);
    doc.text(`${label} — no data entered`, x, y + 4);
    return y + 8;
  }

  // ── Row header ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTxt(doc, C.black);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTxt(doc, C.mid);
  doc.text(`${ad.icao}  RWY ${ad.runway || "—"}`, x + 28, y);
  y += 4;
  hRule(doc, y, x, x + rowW);
  y += 3;

  // ── Left sub-column: conditions ──────────────────────────────
  const conds = [
    ["PA", `${perf.pa ?? "—"} ft`],
    ["OAT", `${perf.oat ?? "—"} \u00b0C`],
    ["QNH", `${ad.qnh ?? "—"} hPa`],
    ["Elev", `${ad.elevFt ?? "—"} ft`],
    ["HW", `${perf.headwind >= 0 ? "+" : ""}${perf.headwind ?? "—"} kt`],
    ["CW", `${perf.crosswind ?? "—"} kt`],
    ["Mass", `${perf.mass ?? "—"} kg`],
  ];
  let cy = y;
  doc.setFontSize(6.5);
  conds.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal");
    setTxt(doc, C.light);
    doc.text(k, x, cy);
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.dark);
    doc.text(v, x + LEFT_W - 2, cy, { align: "right" });
    cy += 3.6;
  });

  // ── Vertical sub-separator ────────────────────────────────────
  setDraw(doc, C.hairline);
  doc.setLineWidth(0.15);
  doc.line(x + LEFT_W + 1, y - 1, x + LEFT_W + 1, cy);

  // ── Right sub-column: results + factors ──────────────────────
  let ry = y;
  const results = isDep
    ? [{ lbl: "TODR", r: perf.todr }]
    : [
        { lbl: "LDR", r: perf.ldr },
        { lbl: "LRR", r: perf.lrr },
      ];

  // Results side by side within right sub-column
  const resultColW = Math.floor(RIGHT_W / results.length) - 2;
  results.forEach(({ lbl, r }, i) => {
    const rx = RIGHT_X + i * (resultColW + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setTxt(doc, C.mid);
    doc.text(lbl, rx, ry);

    if (r?.error) {
      doc.setFontSize(6.5);
      setTxt(doc, C.mid);
      doc.text("N/A", rx, ry + 4);
    } else if (r?.corrected) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      setTxt(doc, C.black);
      doc.text(`${r.corrected} m`, rx, ry + 8);
      if (r.overall > 1.005) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        setTxt(doc, C.mid);
        doc.text(`\u00d7 ${r.overall.toFixed(2)} applied`, rx, ry + 12);
      }
    } else {
      doc.setFontSize(9);
      setTxt(doc, C.light);
      doc.text("—", rx, ry + 6);
    }
  });

  ry += 14;

  // Factor breakdown (inline, space-separated)
  const primary = isDep ? perf.todr : perf.ldr;
  if (primary?.breakdown) {
    const bd = primary.breakdown;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    setTxt(doc, C.light);
    const factorStr = [
      `Slope \u00d7${bd.slopeFactor?.toFixed(2) ?? "—"}`,
      `Surf. \u00d7${bd.surfFactor?.toFixed(2) ?? "—"}`,
      `Cond. \u00d7${bd.condFactor?.toFixed(2) ?? "—"}`,
      `Safety \u00d7${bd.safetyFactor?.toFixed(2) ?? "—"}`,
    ].join("   ");
    doc.text(factorStr, RIGHT_X, ry);
    ry += 3.5;
    doc.setFont("helvetica", "bold");
    setTxt(doc, C.dark);
    doc.text(
      `Overall \u00d7 ${primary.overall?.toFixed(2) ?? "—"}`,
      RIGHT_X,
      ry,
    );
    ry += 3.5;
  }

  // Wind / rwy info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  setTxt(doc, C.light);
  doc.text(
    `Wind ${ad.windDir ?? "—"}\u00b0/${ad.windSpeed ?? "—"} kt  Axis ${ad.rwyAxis ?? "—"}\u00b0  ${ad.rwyLengthM ?? "—"} m  ${ad.condition ?? "—"} / ${ad.surface ?? "—"}  Slope ${ad.slope ?? 0}%`,
    RIGHT_X,
    ry,
  );

  const rowBottom = Math.max(cy, ry + 3) + 2;
  return rowBottom;
}

// ══════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════
export async function generateDispatchPDF({
  state = {},
  mb,
  perfDep,
  perfDest,
  perfAlt,
}) {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const PW = 297,
      PH = 210;
    const ML = 10,
      MR = 10,
      MT = 8,
      MB = 7;

    const acReg = state?.acReg || "XXXX";
    const ac = AIRCRAFT_LIST.find((a) => a.registration === acReg) || {};
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB");
    const utcStr = now.toUTCString().slice(17, 22) + "z";

    // ── Header ─────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setTxt(doc, C.black);
    doc.text("DA40-D  DISPATCH RELEASE", ML, MT + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setTxt(doc, C.mid);
    doc.text(
      `${acReg}  |  AFM Doc. #6.01.05-E Rev.7 · 27-Sep-2013`,
      ML,
      MT + 10,
    );
    doc.text(`${utcStr}   ${dateStr}`, PW - MR, MT + 10, { align: "right" });
    hRule(doc, MT + 12, ML, PW - MR, C.dark, 0.4);

    const TOP = MT + 16;

    // ── Two-column geometry ─────────────────────────────────────
    // Left : M&B table + CG chart
    // Right: 3 stacked aerodrome rows
    const LEFT_W = 108; // wider left for the flat CG chart
    const SEP = 6;
    const RIGHT_X = ML + LEFT_W + SEP;
    const RIGHT_W = PW - MR - RIGHT_X;

    // Vertical separator
    setDraw(doc, C.hairline);
    doc.setLineWidth(0.2);
    doc.line(
      ML + LEFT_W + SEP / 2,
      TOP - 2,
      ML + LEFT_W + SEP / 2,
      PH - MB - 2,
    );

    // ════════════════════════════════════════════════════════════
    // LEFT COLUMN — M&B
    // ════════════════════════════════════════════════════════════
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, C.mid);
    doc.text("MASS & BALANCE", ML, TOP);
    hRule(doc, TOP + 1.5, ML, ML + LEFT_W);

    let ly = TOP + 5;

    if (mb?.items?.length) {
      // Table header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      setTxt(doc, C.mid);
      const cols = { item: ML, kg: ML + 56, arm: ML + 74, mom: ML + 96 };
      doc.text("Item", cols.item, ly);
      doc.text("kg", cols.kg, ly, { align: "right" });
      doc.text("Arm", cols.arm, ly, { align: "right" });
      doc.text("Moment", cols.mom, ly, { align: "right" });
      hRule(doc, ly + 1.5, ML, ML + LEFT_W);
      ly += 4.5;

      // Items
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      mb.items
        .filter((i) => i.mass > 0)
        .forEach((item) => {
          setTxt(doc, C.dark);
          doc.text(item.label, cols.item, ly);
          setTxt(doc, C.mid);
          doc.text(item.mass.toFixed(1), cols.kg, ly, { align: "right" });
          doc.text(item.arm != null ? item.arm.toFixed(3) : "—", cols.arm, ly, {
            align: "right",
          });
          doc.text(
            item.arm != null ? (item.mass * item.arm).toFixed(1) : "—",
            cols.mom,
            ly,
            { align: "right" },
          );
          ly += 4;
        });

      // Taxi fuel row (fixed deduction)
      const taxiKg = mb.taxiKg ?? 1.5;
      const taxiArm = mb.taxiArm ?? 2.63;
      setTxt(doc, C.dark);
      doc.text("Taxi fuel", cols.item, ly);
      setTxt(doc, C.mid);
      doc.text(`- ${taxiKg.toFixed(1)}`, cols.kg, ly, { align: "right" });
      doc.text(taxiArm.toFixed(3), cols.arm, ly, { align: "right" });
      doc.text(`- ${(taxiKg * taxiArm).toFixed(1)}`, cols.mom, ly, {
        align: "right",
      });
      ly += 4;

      // Burnt fuel row
      const burntUSG = Number(state.burntFuelUSG) || 0;
      if (burntUSG > 0) {
        const FUEL_ARM = 2.63;
        const burntKg = Math.round(burntUSG * 0.84 * 3.785 * 10) / 10;
        setTxt(doc, C.dark);
        doc.text(`Burnt fuel (${burntUSG} USG)`, cols.item, ly);
        setTxt(doc, C.mid);
        doc.text(`- ${burntKg.toFixed(1)}`, cols.kg, ly, { align: "right" });
        doc.text(FUEL_ARM.toFixed(3), cols.arm, ly, { align: "right" });
        doc.text(`- ${(burntKg * FUEL_ARM).toFixed(1)}`, cols.mom, ly, {
          align: "right",
        });
        ly += 4;
      }

      hRule(doc, ly, ML, ML + LEFT_W);
      ly += 3;

      // ZFM / Ramp / TOM / LM
      const phases = [
        { label: "Zero Fuel", d: mb.zf, st: mb.cgStatus.zf },
        { label: "Ramp", d: mb.ramp, st: mb.cgStatus.ramp },
        { label: "Take-Off", d: mb.tom, st: mb.cgStatus.tom },
        { label: "Landing", d: mb.lm, st: mb.cgStatus.lm },
      ].filter((p) => p.d); // guard if ramp not present (old mb shape)

      phases.forEach(({ label, d, st }) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setTxt(doc, C.dark);
        doc.text(label, cols.item, ly);
        setTxt(doc, C.mid);
        doc.text(d.mass.toFixed(1), cols.kg, ly, { align: "right" });
        setTxt(doc, st !== "ok" ? C.dark : C.mid);
        doc.text(d.cg.toFixed(3) + (st !== "ok" ? "*" : ""), cols.arm, ly, {
          align: "right",
        });
        setTxt(doc, C.mid);
        doc.text(d.moment.toFixed(1), cols.mom, ly, { align: "right" });
        ly += 4.5;
      });

      if (mb.mtowExceeded) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setTxt(doc, C.dark);
        doc.text("! MTOW EXCEEDED (max 1150 kg)", ML, ly);
        ly += 4.5;
      }
      const anyOOE = Object.values(mb.cgStatus).some((s) => s !== "ok");
      if (anyOOE) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        setTxt(doc, C.mid);
        doc.text("* CG outside Normal envelope", ML, ly);
        ly += 4;
      }

      hRule(doc, ly, ML, ML + LEFT_W);
      ly += 3;

      // CG Envelope — takes all remaining height, full left-column width
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setTxt(doc, C.mid);
      doc.text("CG ENVELOPE \u2014 Normal & Utility", ML, ly);
      ly += 2;

      const chartH = Math.min(80, PH - MB - ly - 4); // capped at 38mm
      if (chartH > 15) {
        drawCGEnvelope(doc, mb, ML, ly, LEFT_W, chartH);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      setTxt(doc, C.light);
      doc.text("No loading data entered.", ML, ly);
    }

    // ════════════════════════════════════════════════════════════
    // RIGHT COLUMN — Aerodrome performance (3 stacked rows)
    // ════════════════════════════════════════════════════════════
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, C.mid);
    doc.text("AERODROME PERFORMANCE", RIGHT_X, TOP);
    hRule(doc, TOP + 1.5, RIGHT_X, PW - MR);

    let ry = TOP + 5;

    const aeroBlocks = [
      { key: "dep", label: "DEPARTURE", perf: perfDep, isDep: true },
      { key: "dest", label: "DESTINATION", perf: perfDest, isDep: false },
      { key: "alt", label: "ALTERNATE", perf: perfAlt, isDep: false },
    ];

    aeroBlocks.forEach(({ key, label, perf, isDep }, i) => {
      const ad = state?.aerodromes?.[key] || {};

      ry = drawAeroRow(doc, {
        label,
        ad,
        perf,
        isDep,
        x: RIGHT_X,
        y: ry,
        rowW: RIGHT_W,
      });

      // Separator between rows (not after last)
      if (i < aeroBlocks.length - 1) {
        hRule(doc, ry, RIGHT_X, PW - MR, C.hairline, 0.3);
        ry += 4;
      }
    });

    // ── Footer ──────────────────────────────────────────────────
    hRule(doc, PH - MB, ML, PW - MR, C.dark, 0.3);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    setTxt(doc, C.light);
    doc.text(
      "For planning purposes only. Not for operational use. Verify all figures against the DA40-D AFM \u2014 authoritative source at all times.",
      PW / 2,
      PH - MB + 3.5,
      { align: "center" },
    );

    doc.save(`DA40-${acReg}-dispatch-${now.toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("PDF generation error:", err);
    throw err;
  }
}
