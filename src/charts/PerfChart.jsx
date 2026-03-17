import { useEffect, useRef, useCallback } from "react";
import {
  evalBilinear,
  evalCorrectionStep,
  evalCurve,
} from "../engine/interpolation.js";

/**
 * AFM-style 3-section performance chart with DIAGONAL construction lines.
 *
 * The real AFM construction follows the slope of each reference curve:
 *
 * Step 1: vertical up from OAT bottom → hits altitude curve → horizontal right
 *
 * Step 2: Enter LEFT border at (mass=1150, y=s1)
 *         → DIAGONAL down-right to (mass=actual, y=s2)
 *         following the interpolated TM curve slope
 *         → horizontal right to section 3
 *
 * Step 3: Enter LEFT border at (wind=0, y=s2)
 *         → DIAGONAL to (wind=actual, y=s3)
 *         following the interpolated HW or TW curve slope
 *         → horizontal right to result axis
 */
export function PerfChart({
  data,
  params,
  title,
  accentColor = "#58a6ff",
  chartId,
}) {
  const ref = useRef(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas || !data || !params) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W < 10 || H < 10) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── Layout ────────────────────────────────────────────────
    const PAD = { t: 32, b: 44, l: 10, r: 50 };
    const SEP = 8;
    const pH = H - PAD.t - PAD.b;
    const tW = W - PAD.l - PAD.r - SEP * 2;
    const S1W = Math.round(tW * 0.5);
    const S2W = Math.round(tW * 0.27);
    const S3W = tW - S1W - S2W;

    const sx = [PAD.l, PAD.l + S1W + SEP, PAD.l + S1W + SEP + S2W + SEP];
    const sw = [S1W, S2W, S3W];

    // ── Data ──────────────────────────────────────────────────
    function bounds(curves) {
      let xMin = Infinity,
        xMax = -Infinity,
        yMin = Infinity,
        yMax = -Infinity;
      curves.forEach((c) => {
        c.xs.forEach((v) => {
          if (v < xMin) xMin = v;
          if (v > xMax) xMax = v;
        });
        c.ys.forEach((v) => {
          if (v < yMin) yMin = v;
          if (v > yMax) yMax = v;
        });
      });
      return { xMin, xMax, yMin, yMax };
    }

    const b1 = bounds(data.step1);
    const b2 = bounds(data.step2);
    const hw = data.step3hw ?? [];
    const tw = data.step3tw ?? [];

    const b3y = (() => {
      const all = [...hw, ...tw];
      return all.length ? bounds(all) : { yMin: 100, yMax: 2000 };
    })();

    const yMin = Math.min(b1.yMin, b2.yMin, b3y.yMin) * 0.95;
    const yMax = Math.max(b1.yMax, b2.yMax, b3y.yMax) * 1.02;

    const windXMax = Math.max(
      hw.length ? Math.max(...hw.map((c) => Math.max(...c.xs))) : 0,
      tw.length ? Math.max(...tw.map((c) => Math.max(...c.xs))) : 0,
      20,
    );

    // ── Transforms ───────────────────────────────────────────
    const ty = (d) => PAD.t + (1 - (d - yMin) / (yMax - yMin)) * pH;
    const tx1 = (v) => sx[0] + ((v - b1.xMin) / (b1.xMax - b1.xMin)) * sw[0];
    // Step2: mass axis REVERSED — entry at left = mass_max (1150)
    const tx2 = (m) =>
      sx[1] + (1 - (m - b2.xMin) / (b2.xMax - b2.xMin)) * sw[1];
    // Step3: wind axis — entry at left = wind 0
    const tx3 = (w) => sx[2] + (w / windXMax) * sw[2];

    // ── Section backgrounds ───────────────────────────────────
    const sections = [
      [0, "", ""],
      [1, "", ""],
      [2, "", ""],
    ];
    sections.forEach(([i, lbl, sub]) => {
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      ctx.fillRect(sx[i], PAD.t, sw[i], pH);
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx[i], PAD.t, sw[i], pH);
      ctx.fillStyle = "#545d68";
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lbl, sx[i] + sw[i] / 2, PAD.t - 14);
      ctx.fillText(sub, sx[i] + sw[i] / 2, PAD.t - 4);
    });

    // ── Y axis ────────────────────────────────────────────────
    const yStep = niceStep((yMax - yMin) / 6);
    const yStart = Math.ceil(yMin / yStep) * yStep;
    ctx.textAlign = "left";
    ctx.fillStyle = "#545d68";
    ctx.font = "8px Inter, system-ui, sans-serif";
    for (let v = yStart; v <= yMax + yStep * 0.01; v += yStep) {
      const py = ty(v);
      if (py < PAD.t - 2 || py > PAD.t + pH + 2) continue;
      ctx.strokeStyle = "#363c45";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(PAD.l, py);
      ctx.lineTo(W - PAD.r, py);
      ctx.stroke();
      ctx.fillText(Math.round(v), PAD.l + 370, py + 3);
    }
    ctx.save();
    ctx.translate(410, PAD.t + pH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "center";
    ctx.font = "8px Inter, system-ui, sans-serif";
    ctx.fillText("Distance (m)", 0, 0);
    ctx.restore();

    // ── X axis ticks ──────────────────────────────────────────
    function xTicks(minV, maxV, txFn, si, lbl) {
      const step = niceStep((maxV - minV) / 4);
      if (!step) return;
      ctx.fillStyle = "#545d68";
      ctx.font = "7px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      for (
        let v = Math.ceil(minV / step) * step;
        v <= maxV + step * 0.01;
        v += step
      ) {
        const px = txFn(v);
        if (px < sx[si] - 2 || px > sx[si] + sw[si] + 2) continue;
        ctx.strokeStyle = "#363c45";
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(px, PAD.t);
        ctx.lineTo(px, PAD.t + pH);
        ctx.stroke();
        ctx.fillText(Math.round(v), px, PAD.t + pH + 10);
      }
      ctx.fillStyle = "#8b949e";
      ctx.font = "8px Inter, system-ui, sans-serif";
      ctx.fillText(lbl, sx[si] + sw[si] / 2, PAD.t + pH + 22);
    }
    xTicks(b1.xMin, b1.xMax, tx1, 0, "OAT (°C) →");
    xTicks(b2.xMin, b2.xMax, tx2, 1, "← Mass (kg)");
    xTicks(0, windXMax, tx3, 2, "Wind (kt) →");

    // ── Reference curves ──────────────────────────────────────
    // Step1: altitude band curves
    data.step1.forEach((c, i) => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120,140,165,0.5)";
      ctx.lineWidth = 0.8;
      c.xs.forEach((x, j) => {
        const p = tx1(x),
          q = ty(c.ys[j]);
        j === 0 ? ctx.moveTo(p, q) : ctx.lineTo(p, q);
      });
      ctx.stroke();
      if (data.altBands?.[i] !== undefined) {
        const lb =
          data.altBands[i] === 0
            ? "0 ft"
            : `${(data.altBands[i] / 1000).toFixed(0)}k`;
        ctx.fillStyle = "#445566";
        ctx.font = "7px Inter,system-ui,sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(
          lb,
          Math.min(tx1(c.xs[c.xs.length - 1]) + 2, sx[0] + sw[0] - 18),
          ty(c.ys[c.ys.length - 1]),
        );
      }
    });

    // Step2: mass correction diagonals
    data.step2.forEach((c) => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120,140,165,0.5)";
      ctx.lineWidth = 0.7;
      c.xs.forEach((x, j) => {
        const p = tx2(x),
          q = ty(c.ys[j]);
        j === 0 ? ctx.moveTo(p, q) : ctx.lineTo(p, q);
      });
      ctx.stroke();
    });

    // Step3: HW curves (fan downward)
    hw.forEach((c) => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120,140,165,0.5)";
      ctx.lineWidth = 0.7;
      c.xs.forEach((x, j) => {
        const p = tx3(x),
          q = ty(c.ys[j]);
        j === 0 ? ctx.moveTo(p, q) : ctx.lineTo(p, q);
      });
      ctx.stroke();
    });

    // Step3: TW curves (fan upward)
    tw.forEach((c) => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120,140,165,0.5)";
      ctx.lineWidth = 0.7;
      c.xs.forEach((x, j) => {
        const p = tx3(x),
          q = ty(c.ys[j]);
        j === 0 ? ctx.moveTo(p, q) : ctx.lineTo(p, q);
      });
      ctx.stroke();
    });

    // ── Construction lines ────────────────────────────────────
    if (
      params.oat === undefined ||
      params.pressAlt === undefined ||
      !params.mass
    )
      return;

    const { pressAlt, oat, mass, wind = 0 } = params;

    const s1 = evalBilinear(data.altBands, data.step1, pressAlt, oat);
    if (!isFinite(s1)) return;
    const s2 = evalCorrectionStep(data.step2, mass, s1);
    if (!isFinite(s2)) return;

    const useHW = wind >= 0;
    const windAbs = Math.abs(wind);
    const windCurves = useHW ? hw : tw;
    const s3 = windAbs > 0 ? evalCorrectionStep(windCurves, windAbs, s2) : s2;
    if (!isFinite(s3)) return;

    // Entry param for step2 = first xs of step2 curves = mass at left border (≈1150)
    const massEntry = data.step2.length ? data.step2[0].xs[0] : b2.xMax;

    // Entry param for step3 = wind=0 (left border)
    const windEntry = 0;

    // Pixel coordinates
    const px_oat = tx1(oat);
    const py_s1 = ty(s1);
    const px_massEntry = tx2(massEntry); // left border of step2
    const px_mass = tx2(mass); // actual mass column
    const py_s2 = ty(s2);
    const px_windEntry = tx3(windEntry); // left border of step3 = tx3(0) = sx[2]
    const px_wind = windAbs > 0 ? tx3(windAbs) : sx[2];
    const py_s3 = ty(s3);

    if (
      [px_oat, py_s1, px_mass, py_s2, px_wind, py_s3].some((v) => !isFinite(v))
    )
      return;

    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 3]);

    // ── Step 1: vertical → horizontal ────────────────────────
    // Enter at OAT bottom, rise to altitude curve, carry right to step2
    ctx.beginPath();
    ctx.moveTo(px_oat, PAD.t + pH); // bottom of chart at OAT
    ctx.lineTo(px_oat, py_s1); // up to altitude curve
    ctx.lineTo(sx[1], py_s1); // horizontal right across step2
    ctx.stroke();

    // ── Step 2: DIAGONAL following TM curve slope ────────────
    // Enter at left border of step2 at s1 height
    // Diagonal down to actual mass column at s2 height
    // Then horizontal right to step3
    ctx.beginPath();
    ctx.moveTo(sx[1], py_s1); // left border of step2 at s1 level
    ctx.lineTo(px_mass, py_s2); // DIAGONAL to (mass, s2) — follows curve slope
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px_mass, PAD.t + pH); // bottom of chart at Mass
    ctx.lineTo(px_mass, py_s2); // up to curve
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px_mass, py_s2); // from mass column
    ctx.lineTo(sx[2], py_s2); // horizontal right into step3
    ctx.stroke();

    // ── Step 3: DIAGONAL following HW/TW curve slope ─────────
    // Enter at left border of step3 at s2 height
    // Diagonal to actual wind position at s3 height
    // Then horizontal right to result axis
    ctx.beginPath();
    ctx.moveTo(sx[2], py_s2); // left border of step3 at s2 level
    ctx.lineTo(px_wind, py_s3); // DIAGONAL to (wind, s3) — follows curve slope
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px_wind, PAD.t + pH); // bottom of chart at Wind
    ctx.lineTo(px_wind, py_s3); // up to curve
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px_wind, py_s3);
    ctx.lineTo(sx[2] + sw[2], py_s3); // horizontal right to result
    ctx.stroke();

    ctx.setLineDash([]);

    // ── Dots at each key point ────────────────────────────────
    const dots = [
      [px_oat, py_s1], // step1 result
      [px_mass, py_s2], // step2 result (at mass)
      [px_wind, py_s3], // step3 result (at wind)
      [sx[2] + sw[2] - 2, py_s3], // final result on right axis
    ];
    dots.forEach(([x, y]) => {
      if (!isFinite(x) || !isFinite(y)) return;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Result label
    ctx.fillStyle = accentColor;
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(s3)} m`, W - PAD.r - 2, py_s3 - 4);
  }, [data, params, accentColor]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => draw());
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "0.5px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
        {params?.result && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: accentColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {params.result} m
          </span>
        )}
      </div>
      <canvas
        ref={ref}
        id={chartId}
        style={{ width: "100%", height: 240, display: "block" }}
      />
    </div>
  );
}

function niceStep(rough) {
  if (!rough || rough <= 0 || !isFinite(rough)) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / mag;
  if (n < 1.5) return mag;
  if (n < 3.5) return 2 * mag;
  if (n < 7.5) return 5 * mag;
  return 10 * mag;
}
