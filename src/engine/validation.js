/**
 * validation.js
 * All input range checks in one place.
 */

export const LIMITS = {
  pressAlt:  { min: -2000,  max: 10000, unit: 'ft',   label: 'Pressure altitude' },
  oat:       { min: -35,    max: 55,    unit: '°C',   label: 'OAT'               },
  mass:      { min: 748,    max: 1150,  unit: 'kg',   label: 'Aircraft mass'     },
  wind:      { min: -15,    max: 25,    unit: 'kts',  label: 'Wind component'    },
  elevFt:    { min: -1500,  max: 14000, unit: 'ft',   label: 'Elevation'         },
  qnh:       { min: 920,    max: 1060,  unit: 'hPa',  label: 'QNH'               },
  windSpeed: { min: 0,      max: 60,    unit: 'kts',  label: 'Wind speed'        },
  frontSeats:{ min: 0,      max: 200,   unit: 'kg',   label: 'Front seats'       },
  rearSeats: { min: 0,      max: 200,   unit: 'kg',   label: 'Rear seats'        },
  bagFwd:    { min: 0,      max: 45,    unit: 'kg',   label: 'Baggage fwd'       },
  bagAft:    { min: 0,      max: 45,    unit: 'kg',   label: 'Baggage aft'       },
  fuelUSG:   { min: 0,      max: 28,    unit: 'USG',  label: 'Fuel'              },
};

export function validateField(field, value) {
  const limit = LIMITS[field];
  if (!limit) return null;
  const num = Number(value);
  if (value === '' || value === null || value === undefined) return `${limit.label} is required`;
  if (isNaN(num)) return `${limit.label} must be a number`;
  if (num < limit.min || num > limit.max)
    return `${limit.label}: ${limit.min}–${limit.max} ${limit.unit}`;
  return null;
}
