/**
 * RunwayDiagram.jsx  –  horizontal runway strip with distance markers
 */
const COLORS = { todr: "#58a6ff", ldr: "#3fb950", lrr: "#d29922" };
const LABELS = { todr: "TODR", ldr: "LDR", lrr: "LRR" };

export function RunwayDiagram({
  rwyLengthM = 1500,
  rwyName = "",
  distances = [],
  windDir = 0,
  rwyAxis = 0,
}) {
  const W = 620;
  const H = 90;
  const RWY_H = 40;
  const PAD_L = 10;
  const PAD_R = 10;
  const RWY_Y = 34; // top of runway strip
  const usableW = W - PAD_L - PAD_R;

  const toX = (m) => PAD_L + usableW * Math.min(m / rwyLengthM, 1);

  // dashes along centre
  const dashCount = 15;
  const dashes = Array.from(
    { length: dashCount },
    (_, i) => PAD_L + (usableW / dashCount) * (i + 0.5),
  ).slice(1);

  // alternate labels above / below runway
  const rows = ["above", "above", "above"];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: "block" }}
    >
      {/* ── Runway surface ── */}
      <rect
        x={PAD_L}
        y={RWY_Y}
        width={usableW}
        height={RWY_H}
        fill="#2a2e35"
        stroke="#444c56"
        strokeWidth={1}
        rx={2}
      />

      {/* ── Centre dashes ── */}
      {dashes.map((x, i) => (
        <line
          key={i}
          x1={x - 8}
          y1={RWY_Y + RWY_H / 2}
          x2={x + 8}
          y2={RWY_Y + RWY_H / 2}
          stroke="#555e6a"
          strokeWidth={1.5}
        />
      ))}

      {/* ── Runway name — rotated, left end, fits runway height ── */}
      <text
        x={PAD_L + RWY_H / 2}
        y={RWY_Y + RWY_H / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8b949e"
        fontSize={RWY_H * 0.23}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="1.5"
        transform={`rotate(90, ${PAD_L + RWY_H / 2}, ${RWY_Y + RWY_H / 2})`}
      >
        <tspan x={PAD_L + RWY_H / 2} dy="12">
          |||||||||
        </tspan>
        <tspan x={PAD_L + RWY_H / 2} dy="-12">
          {rwyName || "RWY"}
        </tspan>
      </text>

      {/* ── Runway length label (top-right) ── */}
      <text
        x={PAD_L + usableW}
        y={RWY_Y + 55}
        textAnchor="end"
        fill="#545d68"
        fontSize={11}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {rwyLengthM} m
      </text>

      {/* ── Distance markers ── */}
      {distances.map(({ key, value }, idx) => {
        if (!value || value <= 0) return null;
        const x = toX(value);
        const color = COLORS[key];
        const label = LABELS[key];
        const row = rows[idx % rows.length];
        const exceeds = value > rwyLengthM;

        // filled bar from left edge
        const barW = Math.min(value / rwyLengthM, 1) * usableW;
        const labelY = row === "above" ? RWY_Y - 15 : RWY_Y + RWY_H + 14;

        return (
          <g key={key}>
            {/* Coloured fill */}
            <rect
              x={PAD_L + 1}
              y={RWY_Y + 1}
              width={Math.max(barW - 2, 0)}
              height={RWY_H - 2}
              fill={color}
              opacity={0.1}
              rx={1}
            />

            {/* Vertical marker line */}
            <line
              x1={x}
              y1={RWY_Y}
              x2={x}
              y2={RWY_Y + RWY_H}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />

            {/* Tick on runway edges */}
            <line
              x1={x - 3}
              y1={RWY_Y}
              x2={x + 3}
              y2={RWY_Y}
              stroke={color}
              strokeWidth={2}
            />
            <line
              x1={x - 3}
              y1={RWY_Y + RWY_H}
              x2={x + 3}
              y2={RWY_Y + RWY_H}
              stroke={color}
              strokeWidth={2}
            />

            {/* Label */}
            <text
              x={x}
              y={labelY - 2}
              textAnchor="middle"
              fill={color}
              fontSize={11}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="700"
              letterSpacing="0.5"
            >
              {label}
            </text>
            <text
              x={x}
              y={labelY + 8}
              textAnchor="middle"
              fill={color}
              fontSize={9}
              fontFamily="Inter, system-ui, sans-serif"
              fontVariantNumeric="tabular-nums"
            >
              {exceeds ? ">RWY" : `${value} m`}
            </text>
          </g>
        );
      })}
      {/* ── Wind arrow ── */}
      <g
        transform={`translate(${PAD_L + usableW - 70}, ${RWY_Y + RWY_H - 75}) rotate(${(windDir - rwyAxis + 270 + 360) % 360})`}
      >
        {/* Shaft */}
        <line
          x1={0}
          y1={19}
          x2={0}
          y2={-10}
          stroke="#8b949e"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Arrowhead */}
        <polygon points="0,-19 -5,-6 5,-6" fill="#8b949e" />
      </g>
    </svg>
  );
}
