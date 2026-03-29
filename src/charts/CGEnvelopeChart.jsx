import { useEffect, useRef, useCallback } from "react";
import { CG_NORMAL, CG_UTILITY } from "../data/aircraft.js";

const ARM_MIN = 2.36,
  ARM_MAX = 2.64;
const MASS_MIN = 740,
  MASS_MAX = 1200;
const PAD = { t: 24, r: 20, b: 40, l: 52 };

function toX(arm, W) {
  return PAD.l + ((arm - ARM_MIN) / (ARM_MAX - ARM_MIN)) * (W - PAD.l - PAD.r);
}
function toY(mass, H) {
  return (
    PAD.t +
    (1 - (mass - MASS_MIN) / (MASS_MAX - MASS_MIN)) * (H - PAD.t - PAD.b)
  );
}

export function CGEnvelopeChart({ mb }) {
  const ref = useRef(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W < 10 || H < 10) return; // not laid out yet

    const ctx = canvas.getContext("2d");
    if (!ctx) return; // context failed

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const plotW = W - PAD.l - PAD.r;
    const plotH = H - PAD.t - PAD.b;

    // Grid
    ctx.strokeStyle = "#21262d";
    ctx.lineWidth = 0.5;
    const armTicks = [2.4, 2.45, 2.5, 2.55, 2.6];
    const massTicks = [800, 850, 900, 950, 1000, 1050, 1100, 1150];
    armTicks.forEach((a) => {
      const x = toX(a, W);
      ctx.beginPath();
      ctx.moveTo(x, PAD.t);
      ctx.lineTo(x, H - PAD.b);
      ctx.stroke();
    });
    massTicks.forEach((m) => {
      const y = toY(m, H);
      ctx.beginPath();
      ctx.moveTo(PAD.l, y);
      ctx.lineTo(W - PAD.r, y);
      ctx.stroke();
    });

    // Utility zone fill (amber)
    ctx.beginPath();
    CG_UTILITY.forEach(([arm, mass], i) => {
      const x = toX(arm, W),
        y = toY(mass, H);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(248, 165, 88, 0)";
    ctx.fill();

    // Normal-only zone fill (green) — mass 980–1150
    ctx.beginPath();
    ctx.moveTo(toX(2.4, W), toY(980, H));
    ctx.lineTo(toX(2.46, W), toY(1150, H));
    ctx.lineTo(toX(2.59, W), toY(1150, H));
    ctx.lineTo(toX(2.59, W), toY(980, H));
    ctx.closePath();
    ctx.fillStyle = "rgba(169, 88, 255, 0)";
    ctx.fill();

    // Utility envelope (dashed amber)
    ctx.beginPath();
    CG_UTILITY.forEach(([arm, mass], i) => {
      const x = toX(arm, W),
        y = toY(mass, H);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#545d68";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Normal envelope (solid green)
    ctx.beginPath();
    CG_NORMAL.forEach(([arm, mass], i) => {
      const x = toX(arm, W),
        y = toY(mass, H);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#545d68";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#545d68";
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    armTicks.forEach((a) =>
      ctx.fillText(a.toFixed(2), toX(a, W), H - PAD.b + 13),
    );
    ctx.textAlign = "right";
    massTicks.forEach((m) => ctx.fillText(m, PAD.l - 5, toY(m, H) + 3));

    ctx.fillStyle = "#8b949e";
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CG arm (m)", PAD.l + plotW / 2, H - 4);
    ctx.save();
    ctx.translate(11, PAD.t + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Mass (kg)", 0, 0);
    ctx.restore();

    // Zone labels
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#8b949e";
    ctx.fillText("Normal", toX(2.5, W), toY(1060, H));
    ctx.fillStyle = "#8b949e";
    ctx.fillText("Utility & Normal", toX(2.5, W), toY(870, H));

    // MTOW line
    ctx.strokeStyle = "rgba(248,81,73,0.4)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    const y1150 = toY(1150, H);
    ctx.beginPath();
    ctx.moveTo(PAD.l, y1150);
    ctx.lineTo(W - PAD.r, y1150);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(248,81,73,0.5)";
    ctx.font = "8px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("MTOW", W - PAD.r - 2, y1150 - 3);

    // CG points
    if (!mb) return;
    const points = [
      {
        label: "ZFM",
        cg: mb.zf.cg,
        mass: mb.zf.mass,
        color: "#8b949e",
        st: mb.cgStatus.zf,
      },
      {
        label: "TOM",
        cg: mb.tom.cg,
        mass: mb.tom.mass,
        color: "#3fb950",
        st: mb.cgStatus.tom,
      },
      {
        label: "LM",
        cg: mb.lm.cg,
        mass: mb.lm.mass,
        color: "#3fb950",
        st: mb.cgStatus.lm,
      },
    ];

    // Connecting line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    //ctx.setLineDash([3, 3]);
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = toX(p.cg, W),
        y = toY(p.mass, H);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach((p) => {
      const x = toX(p.cg, W);
      const y = toY(p.mass, H);
      const dotColor =
        p.st === "danger"
          ? "#f85149"
          : p.st === "warning"
            ? "#d29922"
            : p.color;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      //ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = dotColor;
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.textAlign = x > W - 80 ? "right" : "left";
      ctx.fillText(`${p.label} ${p.mass}kg`, x > W - 80 ? x - 8 : x + 8, y - 5);
    });
  }, [mb]);

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
    <canvas
      ref={ref}
      id="cg-envelope"
      style={{ width: "100%", height: 520, display: "block" }}
    />
  );
}
