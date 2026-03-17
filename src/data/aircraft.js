// Aircraft M&B data — extracted from DA40-D Calculator Excel

export const AIRCRAFT_LIST = [
  {
    registration: "F-GUPL",
    bew: 799,
    arm: 2.397,
    moment: 1916.98,
    fuelUSG: 28,
  },
  { registration: "F-GUVM", bew: 815, arm: 2.39, moment: 1950.31, fuelUSG: 28 },
  {
    registration: "F-GXNC",
    bew: 799.5,
    arm: 2.39,
    moment: 1950.31,
    fuelUSG: 28,
  },
  {
    registration: "F-HABM",
    bew: 794,
    arm: 2.404,
    moment: 1909.28,
    fuelUSG: 28,
  },
  {
    registration: "F-HYOU",
    bew: 849.5,
    arm: 2.4965,
    moment: 2120.8,
    fuelUSG: 28,
  },
  {
    registration: "F-HABP",
    bew: 798.5,
    arm: 2.4,
    moment: 1912.95,
    fuelUSG: 28,
  },
  {
    registration: "F-HABQ",
    bew: 784.5,
    arm: 2.45,
    moment: 1921.26,
    fuelUSG: 28,
  },
];

// CG envelope Normal category [arm_m, mass_kg]
export const CG_NORMAL = [
  [2.4, 780],
  [2.4, 980],
  [2.46, 1150],
  [2.59, 1150],
  [2.59, 780],
];

// CG envelope Utility & Normal category [arm_m, mass_kg]
export const CG_UTILITY = [
  [2.4, 780],
  [2.4, 980],
  [2.59, 980],
  [2.59, 780],
];

export const MOMENT_ARMS = {
  frontSeats: 2.3,
  rearSeats: 3.25,
  bagFwd: 3.65,
  bagAft: null, // no aft baggage arm defined in AFM
  fuel: 2.63,
};

export const MTOW = 1150;

// Airspeeds — exact AFM names, mass refs [850, 1000, 1150] kg
// ICAO standard abbreviations where applicable
export const AIRSPEEDS = [
  // ── Normal operations ─────────────────────────────────────
  {
    code: "Vr",
    name: "Vr — Rotation (Flaps T/O)",
    v850: 49,
    v1000: 55,
    v1150: 59,
    category: "normal",
  },
  {
    code: "Vy",
    name: "Vy — Best rate of climb (T/O)",
    v850: 54,
    v1000: 60,
    v1150: 66,
    category: "normal",
  },
  {
    code: "Vx",
    name: "Vx — Cruise climb (Flaps UP)",
    v850: 60,
    v1000: 68,
    v1150: 73,
    category: "normal",
  },
  {
    code: "Vg",
    name: "Vg — Best glide (Flaps UP)",
    v850: 60,
    v1000: 68,
    v1150: 73,
    category: "normal",
  },
  // ── Landing speeds ────────────────────────────────────────
  {
    code: "Vapp0",
    name: "Vapp — Final approach (Flaps UP)",
    v850: 60,
    v1000: 68,
    v1150: 73,
    category: "landing",
  },
  {
    code: "Vapp1",
    name: "Vapp — Final approach (Flaps T/O)",
    v850: 59,
    v1000: 66,
    v1150: 72,
    category: "landing",
  },
  {
    code: "Vapp2",
    name: "Vapp — Final approach (Flaps LDG)",
    v850: 58,
    v1000: 63,
    v1150: 71,
    category: "landing",
  },
  // ── Stall speeds ──────────────────────────────────────────
  {
    code: "Vs0",
    name: "Vs0 — Stall (Flaps LDG)",
    v850: 42,
    v1000: null,
    v1150: 49,
    category: "stall",
  },
  {
    code: "Vs1t",
    name: "Vs1 — Stall (Flaps T/O)",
    v850: 44,
    v1000: null,
    v1150: 51,
    category: "stall",
  },
  {
    code: "Vs1",
    name: "Vs — Stall clean",
    v850: 47,
    v1000: null,
    v1150: 52,
    category: "stall",
  },
  // ── Structural / limit speeds ─────────────────────────────
  {
    code: "VFEto",
    name: "VFE — Flaps T/O (max)",
    v850: 108,
    v1000: null,
    v1150: null,
    category: "limit",
  },
  {
    code: "VFEldg",
    name: "VFE — Flaps LDG (max)",
    v850: 91,
    v1000: null,
    v1150: null,
    category: "limit",
  },
  {
    code: "Va",
    name: "Va — Manoeuvring",
    v850: 94,
    v1000: null,
    v1150: 108,
    category: "limit",
  },
  {
    code: "Vno",
    name: "Vno — Max structural cruise",
    v850: 129,
    v1000: null,
    v1150: null,
    category: "limit",
  },
  {
    code: "Vb",
    name: "Vb — Max turbulence penetration",
    v850: 129,
    v1000: null,
    v1150: null,
    category: "limit",
  },
  {
    code: "Vne",
    name: "Vne — Never exceed",
    v850: 178,
    v1000: null,
    v1150: null,
    category: "limit",
  },
];

export const AIRSPEED_MASS_REFS = [850, 1000, 1150];
