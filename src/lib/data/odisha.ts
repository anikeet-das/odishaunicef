// 30 districts of Odisha with approximate centroid lat/lng.
// Used by the live map and district analytics.
export type OdishaDistrict = { id: number; name: string; lat: number; lng: number };

export const ODISHA_DISTRICTS: OdishaDistrict[] = [
  { id: 0,  name: "Angul",          lat: 20.84, lng: 85.10 },
  { id: 1,  name: "Balangir",       lat: 20.70, lng: 83.48 },
  { id: 2,  name: "Balasore",       lat: 21.49, lng: 86.93 },
  { id: 3,  name: "Bargarh",        lat: 21.33, lng: 83.62 },
  { id: 4,  name: "Bhadrak",        lat: 21.06, lng: 86.50 },
  { id: 5,  name: "Boudh",          lat: 20.83, lng: 84.32 },
  { id: 6,  name: "Cuttack",        lat: 20.46, lng: 85.88 },
  { id: 7,  name: "Deogarh",        lat: 21.53, lng: 84.73 },
  { id: 8,  name: "Dhenkanal",      lat: 20.66, lng: 85.60 },
  { id: 9,  name: "Gajapati",       lat: 18.85, lng: 84.13 },
  { id: 10, name: "Ganjam",         lat: 19.39, lng: 84.69 },
  { id: 11, name: "Jagatsinghpur",  lat: 20.25, lng: 86.17 },
  { id: 12, name: "Jajpur",         lat: 20.85, lng: 86.33 },
  { id: 13, name: "Jharsuguda",     lat: 21.86, lng: 84.01 },
  { id: 14, name: "Kalahandi",      lat: 19.91, lng: 83.16 },
  { id: 15, name: "Kandhamal",      lat: 20.13, lng: 84.01 },
  { id: 16, name: "Kendrapara",     lat: 20.50, lng: 86.42 },
  { id: 17, name: "Kendujhar",      lat: 21.63, lng: 85.58 },
  { id: 18, name: "Khordha",        lat: 20.18, lng: 85.62 },
  { id: 19, name: "Koraput",        lat: 18.81, lng: 82.71 },
  { id: 20, name: "Malkangiri",     lat: 18.36, lng: 81.88 },
  { id: 21, name: "Mayurbhanj",     lat: 21.93, lng: 86.73 },
  { id: 22, name: "Nabarangpur",    lat: 19.23, lng: 82.55 },
  { id: 23, name: "Nayagarh",       lat: 20.13, lng: 85.10 },
  { id: 24, name: "Nuapada",        lat: 20.81, lng: 82.54 },
  { id: 25, name: "Puri",           lat: 19.81, lng: 85.83 },
  { id: 26, name: "Rayagada",       lat: 19.17, lng: 83.42 },
  { id: 27, name: "Sambalpur",      lat: 21.47, lng: 83.97 },
  { id: 28, name: "Subarnapur",     lat: 20.84, lng: 83.90 },
  { id: 29, name: "Sundargarh",     lat: 22.12, lng: 84.03 },
];

// Stable hash so the same UDISE code always maps to the same district / coords.
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function districtFor(udise: string): OdishaDistrict {
  return ODISHA_DISTRICTS[hashCode(udise) % ODISHA_DISTRICTS.length];
}

// Match a free-text district name (from the live form) to a canonical Odisha
// district. Tolerant of casing, spacing and common spelling variants.
const DISTRICT_ALIASES: Record<string, string> = {
  keonjhar: "Kendujhar", balasore: "Balasore", baleswar: "Balasore",
  sonepur: "Subarnapur", sonapur: "Subarnapur", subarnapur: "Subarnapur",
  khurda: "Khordha", khorda: "Khordha", jajapur: "Jajpur",
  baudh: "Boudh", debagarh: "Deogarh", nawarangpur: "Nabarangpur",
  nawapada: "Nuapada", anugul: "Angul", bolangir: "Balangir",
  baragarh: "Bargarh",
};
export function districtByName(raw: string): OdishaDistrict | null {
  if (!raw) return null;
  const norm = raw.trim().toLowerCase().replace(/\s*\/.*$/, "").replace(/[^a-z]/g, "");
  if (!norm) return null;
  const alias = DISTRICT_ALIASES[norm];
  const target = (alias ?? raw).trim().toLowerCase().replace(/[^a-z]/g, "");
  for (const d of ODISHA_DISTRICTS) {
    const dn = d.name.toLowerCase().replace(/[^a-z]/g, "");
    if (dn === target || dn === norm || dn.includes(norm) || norm.includes(dn)) return d;
  }
  return null;
}

// Jitter within ~25km of centroid for spatial spread.
export function jitter(udise: string, base: OdishaDistrict): { lat: number; lng: number } {
  const h = hashCode(udise + "x");
  const dLat = (((h % 1000) / 1000) - 0.5) * 0.45;
  const dLng = ((((h >> 10) % 1000) / 1000) - 0.5) * 0.45;
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

// Odisha bounding box (rough) used by the map SVG projection.
export const ODISHA_BOUNDS = { minLat: 17.78, maxLat: 22.57, minLng: 81.37, maxLng: 87.53 };