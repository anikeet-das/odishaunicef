import Papa from "papaparse";
import { useQuery } from "@tanstack/react-query";
import { ODISHA_DISTRICTS, districtFor, districtByName, jitter, hashCode } from "./odisha";

export type SchoolRaw = Record<string, string>;

export type School = {
  udise: string;
  name: string;
  respondent: string;
  designation: string;
  email: string;
  phone: string;
  management: string;
  category: string;
  classification: string;
  location: string; // Rural / Urban
  established: number;
  board: string;
  boys: number;
  girls: number;
  totalStudents: number;
  cwsn: number;
  maleStaff: number;
  femaleStaff: number;
  totalStaff: number;
  // Plans
  hasGreenPlan: boolean;
  hasCRSAP: boolean;
  hasSAP: boolean;
  // SHVR
  shvr: number; // 0..5 stars (2025-26)
  // Safety
  hasSafetyCommittee: boolean;
  hasSDMP: boolean;
  mockDrills: boolean;
  // Hazards (probability score 0..3)
  hazards: Record<HazardKey, number>;
  topHazard: HazardKey | null;
  hazardScore: number; // 0..100
  // Sustainability score 0..100 derived from many Yes/No fields
  sustainabilityScore: number;
  // WASH composite 0..100
  washScore: number;
  // Geo
  district: string;
  districtId: number;
  lat: number;
  lng: number;
  raw: SchoolRaw;
};

export const HAZARDS = [
  "Cyclone", "Tsunami", "Floods", "Lightning", "Thunderstorm", "Tornadoes",
  "Drought", "Earthquakes", "Heatwave", "Cold waves", "Sea erosion",
  "Landslides", "Forest fires",
] as const;
export type HazardKey = typeof HAZARDS[number];

const STAR_MAP: Record<string, number> = {
  "0 Star": 0, "I Star": 1, "II Star": 2, "III Star": 3, "IV Star": 4, "V Star": 5,
};

function yes(v: string | undefined): boolean {
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return t === "yes" || t.startsWith("a) yes") || t === "true";
}
function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function probability(v: string | undefined): number {
  if (!v) return 0;
  const t = v.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return t.includes("very") ? 3 : 2;
  if (t.includes("medium") || t.includes("moderate")) return 1.5;
  if (t.includes("low")) return 1;
  if (t.includes("not")) return 0;
  return 0;
}

// Find a header that contains all given fragments (case-insensitive).
function findCol(headers: string[], ...frags: string[]): string | undefined {
  const lc = headers.map((h) => h.toLowerCase());
  for (let i = 0; i < headers.length; i++) {
    if (frags.every((f) => lc[i].includes(f.toLowerCase()))) return headers[i];
  }
  return undefined;
}

function normalize(row: SchoolRaw, headers: string[]): School {
  const get = (h?: string) => (h ? row[h] ?? "" : "");

  const udise = (get(findCol(headers, "udise")) || "").trim() || `UD${hashCode(JSON.stringify(row))}`;
  const name = get(findCol(headers, "school name")) || get(findCol(headers, "name of school"));
  // Real district from the form's District column; fall back to UDISE hash only
  // if the respondent left it blank, so the live map is geographically accurate.
  const districtRaw = get(findCol(headers, "district"));
  const district = districtByName(districtRaw) ?? districtFor(udise);
  const j = jitter(udise, district);

  const boys = num(get(findCol(headers, "boys")));
  const girls = num(get(findCol(headers, "girls")));
  const cwsnB = num(get(findCol(headers, "cwsn boys")));
  const cwsnG = num(get(findCol(headers, "cwsn girls")));
  const ms = num(get(findCol(headers, "male teachers")));
  const fs = num(get(findCol(headers, "female teachers")));

  // Plans
  const hasGreen = yes(get(findCol(headers, "clean and sustainable")));
  const hasCRSAP = yes(get(findCol(headers, "climate resilient")));
  const hasSAP = yes(get(findCol(headers, "[swachhata action plan")));

  // SHVR 2025-26 (match the tagged column, not the long question prefix)
  const shvrCol = headers.find((h) => h.includes("[SHVR 2025-26]"));
  const shvr = STAR_MAP[get(shvrCol).trim()] ?? 0;

  // Safety
  const hasSafety = yes(get(findCol(headers, "1.1 ", "committee")));
  const hasSDMP = yes(get(findCol(headers, "school disaster management plan")));
  const mockDrills = yes(get(findCol(headers, "mock drills")));

  // Hazards
  const hazards = {} as Record<HazardKey, number>;
  for (const hz of HAZARDS) {
    const col = headers.find((h) => h.includes("likelihood") && h.includes(`[${hz}`));
    hazards[hz] = probability(get(col));
  }
  const topHazardEntry = (Object.entries(hazards) as [HazardKey, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const topHazard = topHazardEntry[1] > 0 ? topHazardEntry[0] : null;
  const hazardScore = Math.min(100, Math.round((Object.values(hazards).reduce((a, b) => a + b, 0) / (HAZARDS.length * 3)) * 100));

  // Sustainability: % of YES across sections 2-5 (heuristic)
  let yesCount = 0;
  let totalCount = 0;
  for (const h of headers) {
    if (/^[2-5]\./.test(h.trim()) || /^[2-5]\.\d/.test(h.trim())) {
      const v = (row[h] || "").trim().toLowerCase();
      if (v === "yes" || v === "no" || v.startsWith("a) yes") || v.startsWith("b) no")) {
        totalCount++;
        if (v === "yes" || v.startsWith("a) yes")) yesCount++;
      }
    }
  }
  const sustainabilityScore = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 50;

  // WASH: section 2 only (water + sanitation + hygiene)
  let wYes = 0, wTot = 0;
  for (const h of headers) {
    if (/^2\./.test(h.trim())) {
      const v = (row[h] || "").trim().toLowerCase();
      if (v === "yes" || v === "no") { wTot++; if (v === "yes") wYes++; }
    }
  }
  const washScore = wTot > 0 ? Math.round((wYes / wTot) * 100) : sustainabilityScore;

  return {
    udise,
    name: name || `School ${udise.slice(-4)}`,
    respondent: get(findCol(headers, "submitted by")),
    designation: get(findCol(headers, "reporter role")),
    email: get(findCol(headers, "email")),
    phone: get(findCol(headers, "mobile")),
    management: get(findCol(headers, "management category")),
    category: get(findCol(headers, "category of school")),
    classification: get(findCol(headers, "classication")) || get(findCol(headers, "classification")),
    location: get(findCol(headers, "location of the school")),
    established: num(get(findCol(headers, "year of establishment"))),
    board: get(findCol(headers, "name of board")),
    boys, girls,
    totalStudents: boys + girls,
    cwsn: cwsnB + cwsnG,
    maleStaff: ms, femaleStaff: fs,
    totalStaff: ms + fs,
    hasGreenPlan: hasGreen,
    hasCRSAP,
    hasSAP,
    shvr,
    hasSafetyCommittee: hasSafety,
    hasSDMP,
    mockDrills,
    hazards,
    topHazard,
    hazardScore,
    sustainabilityScore,
    washScore,
    district: district.name,
    districtId: district.id,
    lat: j.lat,
    lng: j.lng,
    raw: row,
  };
}

// Live source of truth: the Google Form response spreadsheet, proxied through
// our own server route (avoids CORS + normalises the export URL). Every record
// that flows into the dashboard, charts and AI is a REAL submitted response.
const LIVE_SOURCE = "/api/public/sheet";

export async function loadSchools(): Promise<School[]> {
  const res = await fetch(`${LIVE_SOURCE}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load live responses (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<SchoolRaw>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  return parsed.data
    .filter((r) => r && (r[headers[0]] ?? "").trim() !== "")
    .map((r) => normalize(r, headers));
}

export function useSchools() {
  return useQuery({
    queryKey: ["cces", "schools"],
    queryFn: loadSchools,
    // Real-time behaviour: poll the live sheet so a newly submitted Google Form
    // response materialises across the whole dashboard automatically.
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ---------- Aggregations ----------

export type DistrictAgg = {
  districtId: number;
  district: string;
  lat: number;
  lng: number;
  schools: number;
  students: number;
  avgShvr: number;
  avgSust: number;
  avgWash: number;
  avgHazard: number;
  crsapAdoption: number; // %
  greenAdoption: number; // %
  topHazard: HazardKey | null;
};

export function aggregateByDistrict(schools: School[]): DistrictAgg[] {
  const map = new Map<number, School[]>();
  for (const s of schools) {
    if (!map.has(s.districtId)) map.set(s.districtId, []);
    map.get(s.districtId)!.push(s);
  }
  const out: DistrictAgg[] = ODISHA_DISTRICTS.map((d) => {
    const list = map.get(d.id) ?? [];
    const avg = (f: (s: School) => number) => list.length ? list.reduce((a, s) => a + f(s), 0) / list.length : 0;
    const hzTotals: Record<string, number> = {};
    for (const s of list) for (const h of HAZARDS) hzTotals[h] = (hzTotals[h] ?? 0) + (s.hazards[h] ?? 0);
    const top = Object.entries(hzTotals).sort((a, b) => b[1] - a[1])[0];
    return {
      districtId: d.id,
      district: d.name,
      lat: d.lat,
      lng: d.lng,
      schools: list.length,
      students: list.reduce((a, s) => a + s.totalStudents, 0),
      avgShvr: +avg((s) => s.shvr).toFixed(2),
      avgSust: Math.round(avg((s) => s.sustainabilityScore)),
      avgWash: Math.round(avg((s) => s.washScore)),
      avgHazard: Math.round(avg((s) => s.hazardScore)),
      crsapAdoption: list.length ? Math.round((list.filter((s) => s.hasCRSAP).length / list.length) * 100) : 0,
      greenAdoption: list.length ? Math.round((list.filter((s) => s.hasGreenPlan).length / list.length) * 100) : 0,
      topHazard: top && top[1] > 0 ? (top[0] as HazardKey) : null,
    };
  });
  return out;
}

export function platformKpis(schools: School[]) {
  const n = schools.length || 1;
  const sum = (f: (s: School) => number) => schools.reduce((a, s) => a + f(s), 0);
  return {
    total: schools.length,
    students: sum((s) => s.totalStudents),
    staff: sum((s) => s.totalStaff),
    avgShvr: +(sum((s) => s.shvr) / n).toFixed(2),
    avgSust: Math.round(sum((s) => s.sustainabilityScore) / n),
    avgWash: Math.round(sum((s) => s.washScore) / n),
    avgHazard: Math.round(sum((s) => s.hazardScore) / n),
    crsapPct: Math.round((schools.filter((s) => s.hasCRSAP).length / n) * 100),
    greenPct: Math.round((schools.filter((s) => s.hasGreenPlan).length / n) * 100),
    sdmpPct: Math.round((schools.filter((s) => s.hasSDMP).length / n) * 100),
    drillsPct: Math.round((schools.filter((s) => s.mockDrills).length / n) * 100),
  };
}

export function hazardBreakdown(schools: School[]) {
  return HAZARDS.map((h) => {
    const exposed = schools.filter((s) => s.hazards[h] > 0).length;
    const high = schools.filter((s) => s.hazards[h] >= 2).length;
    return { hazard: h, exposed, high, exposedPct: Math.round((exposed / (schools.length || 1)) * 100) };
  }).sort((a, b) => b.exposed - a.exposed);
}

export function shvrDistribution(schools: School[]) {
  const buckets = [0, 1, 2, 3, 4, 5].map((star) => ({
    star,
    label: star === 0 ? "Unrated" : `${"★".repeat(star)}`,
    count: schools.filter((s) => s.shvr === star).length,
  }));
  return buckets;
}