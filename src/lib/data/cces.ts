import Papa from "papaparse";
import { useQuery } from "@tanstack/react-query";
import { ODISHA_DISTRICTS, districtFor, districtByName, jitter, hashCode } from "./odisha";

export type SchoolRaw = Record<string, string>;
export const HAZARDS = ["Cyclone", "Tsunami", "Floods", "Lightning", "Thunderstorm", "Tornadoes", "Drought", "Earthquakes", "Heatwave", "Cold waves", "Sea erosion", "Landslides", "Forest fires"] as const;
export type HazardKey = typeof HAZARDS[number];
export type SectionKey = "risk" | "water" | "sanitation" | "hygiene" | "waste" | "operations" | "energy" | "environment" | "behaviour";

export type School = {
  udise: string; name: string; block: string; state: string; cluster: string; timestamp: string;
  respondent: string; designation: string; email: string; phone: string; management: string; category: string;
  classification: string; location: string; established: number; board: string;
  boys: number; girls: number; totalStudents: number; cwsn: number; maleStaff: number; femaleStaff: number; totalStaff: number;
  hasGreenPlan: boolean | null; hasCRSAP: boolean | null; hasSAP: boolean | null;
  shvr: number; shvrAvailable: boolean;
  hasSafetyCommittee: boolean | null; hasSDMP: boolean | null; mockDrills: boolean | null;
  hazards: Record<HazardKey, number | null>; topHazard: HazardKey | null; hazardScore: number | null; hazardDataAvailable: boolean;
  sustainabilityScore: number; washScore: number;
  sectionScores: Record<SectionKey, number | null>;
  district: string; districtId: number; lat: number; lng: number; raw: SchoolRaw;
};

const STAR_MAP: Record<string, number> = { "0 Star": 0, "I Star": 1, "II Star": 2, "III Star": 3, "IV Star": 4, "V Star": 5 };
const SECTION_CODES: Record<SectionKey, string[]> = {
  risk: ["A.", "risk assessment"], water: ["B.", "water"], sanitation: ["C.", "sanitation"], hygiene: ["D.", "handwashing"],
  waste: ["E.", "waste management"], operations: ["F.", "operation & maintenance", "operation and maintenance"], energy: ["G.", "energy"],
  environment: ["H.", "environment"], behaviour: ["I.", "behaviour change", "capacity building"],
};

function text(value: string | undefined): string { return (value ?? "").trim(); }
function findCol(headers: string[], ...frags: string[]): string | undefined {
  return headers.find((h) => frags.every((f) => h.toLowerCase().includes(f.toLowerCase())));
}
function answer(row: SchoolRaw, headers: string[], ...frags: string[]): string { return text(findCol(headers, ...frags) ? row[findCol(headers, ...frags) as string] : ""); }
function num(value: string | undefined): number { const n = Number(String(value ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function bool(value: string): boolean | null {
  const v = value.toLowerCase();
  if (!v) return null;
  if (/^(yes|true|available|adequate|functional|regular|daily|a\)|1)/.test(v)) return true;
  if (/^(no|false|not|unavailable|inadequate|non-functional|never|b\)|0)/.test(v)) return false;
  return null;
}
function scoreSection(row: SchoolRaw, headers: string[], key: SectionKey): number | null {
  const markers = SECTION_CODES[key];
  const values = headers.filter((h) => markers.some((marker) => h.toLowerCase().includes(marker.toLowerCase())))
    .map((h) => bool(text(row[h])))
    .filter((v): v is boolean => v !== null);
  return values.length ? Math.round((values.filter(Boolean).length / values.length) * 100) : null;
}
function average(values: Array<number | null>): number {
  const available = values.filter((v): v is number => v !== null);
  return available.length ? Math.round(available.reduce((a, v) => a + v, 0) / available.length) : 0;
}
function hazardValue(value: string): number | null {
  const v = value.toLowerCase();
  if (!v) return null;
  if (v.includes("very high")) return 3;
  if (v.includes("high")) return 2;
  if (v.includes("medium") || v.includes("moderate")) return 1.5;
  if (v.includes("low")) return 1;
  if (v.includes("no") || v.includes("none")) return 0;
  return null;
}

function normalize(row: SchoolRaw, headers: string[]): School {
  const udise = answer(row, headers, "udise") || `UD${hashCode(JSON.stringify(row))}`;
  const name = answer(row, headers, "school name") || answer(row, headers, "name of school");
  const districtRaw = answer(row, headers, "district");
  const district = districtByName(districtRaw) ?? districtFor(udise);
  const point = jitter(udise, district);
  const sectionScores = {} as Record<SectionKey, number | null>;
  (Object.keys(SECTION_CODES) as SectionKey[]).forEach((key) => { sectionScores[key] = scoreSection(row, headers, key); });
  const washScore = average([sectionScores.water, sectionScores.sanitation, sectionScores.hygiene]);
  const sustainabilityScore = average([sectionScores.waste, sectionScores.operations, sectionScores.energy, sectionScores.environment, sectionScores.behaviour]);

  const hazards = {} as Record<HazardKey, number | null>;
  let hazardDataAvailable = false;
  for (const hazard of HAZARDS) {
    const col = headers.find((h) => h.toLowerCase().includes(hazard.toLowerCase()) && /(likelihood|risk|hazard|exposure)/i.test(h));
    hazards[hazard] = col ? hazardValue(text(row[col])) : null;
    if (hazards[hazard] !== null) hazardDataAvailable = true;
  }
  const hazardEntries = Object.entries(hazards) as [HazardKey, number | null][];
  const availableHazards = hazardEntries.filter(([, value]) => value !== null);
  const top = [...availableHazards].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  const hazardScore = availableHazards.length ? Math.round((availableHazards.reduce((sum, [, value]) => sum + (value ?? 0), 0) / (availableHazards.length * 3)) * 100) : null;
  const shvrCol = headers.find((h) => /shvr/i.test(h) && /star/i.test(h));
  const shvrRaw = text(shvrCol ? row[shvrCol] : "");

  return {
    udise, name: name || `School ${udise.slice(-4)}`,
    block: answer(row, headers, "block"), state: answer(row, headers, "state"), cluster: answer(row, headers, "cluster"), timestamp: answer(row, headers, "timestamp"),
    respondent: answer(row, headers, "submitted by"), designation: answer(row, headers, "reporter role"), email: answer(row, headers, "email"), phone: answer(row, headers, "mobile"),
    management: answer(row, headers, "management category"), category: answer(row, headers, "school category"), classification: "", location: "", established: 0, board: "",
    boys: num(answer(row, headers, "boys")), girls: num(answer(row, headers, "girls")), totalStudents: num(answer(row, headers, "boys")) + num(answer(row, headers, "girls")),
    cwsn: 0, maleStaff: 0, femaleStaff: 0, totalStaff: 0,
    hasGreenPlan: null, hasCRSAP: sectionScores.risk === null ? null : true, hasSAP: null,
    shvr: STAR_MAP[shvrRaw] ?? 0, shvrAvailable: Boolean(shvrCol && shvrRaw),
    hasSafetyCommittee: bool(answer(row, headers, "safety", "committee")), hasSDMP: bool(answer(row, headers, "disaster management plan")), mockDrills: null,
    hazards, topHazard: top?.[0] ?? null, hazardScore, hazardDataAvailable,
    sustainabilityScore, washScore, sectionScores,
    district: district.name, districtId: district.id, lat: point.lat, lng: point.lng, raw: row,
  };
}

const LIVE_SOURCE = "/api/public/sheet";
export async function loadSchools(): Promise<School[]> {
  const res = await fetch(`${LIVE_SOURCE}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load live responses (${res.status})`);
  const parsed = Papa.parse<SchoolRaw>(await res.text(), { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  return parsed.data.filter((row) => row && headers.some((h) => text(row[h]))).map((row) => normalize(row, headers));
}
export function useSchools() {
  return useQuery({ queryKey: ["cces", "schools"], queryFn: loadSchools, staleTime: 10_000, refetchInterval: 30_000, refetchOnWindowFocus: true });
}

export type DistrictAgg = { districtId: number; district: string; lat: number; lng: number; schools: number; students: number; avgShvr: number; avgSust: number; avgWash: number; avgHazard: number; hazardDataAvailable: boolean; crsapAdoption: number; greenAdoption: number; topHazard: HazardKey | null };
export function aggregateByDistrict(schools: School[]): DistrictAgg[] {
  const out: DistrictAgg[] = [];
  for (const d of ODISHA_DISTRICTS) {
    const list = schools.filter((s) => s.districtId === d.id);
    const avg = (values: Array<number | null>) => average(values);
    const risk = list.map((s) => s.hazardScore).filter((v): v is number => v !== null);
    const shvr = list.filter((s) => s.shvrAvailable).map((s) => s.shvr);
    out.push({ districtId: d.id, district: d.name, lat: d.lat, lng: d.lng, schools: list.length, students: list.reduce((a, s) => a + s.totalStudents, 0), avgShvr: shvr.length ? Number((shvr.reduce((a, v) => a + v, 0) / shvr.length).toFixed(2)) : 0, avgSust: avg(list.map((s) => s.sustainabilityScore)), avgWash: avg(list.map((s) => s.washScore)), avgHazard: risk.length ? Math.round(risk.reduce((a, v) => a + v, 0) / risk.length) : 0, hazardDataAvailable: risk.length > 0, crsapAdoption: list.length ? Math.round(list.filter((s) => s.hasCRSAP === true).length / list.length * 100) : 0, greenAdoption: 0, topHazard: null });
  }
  return out;
}
export function platformKpis(schools: School[]) {
  const n = schools.length || 1; const averageValue = (values: number[]) => values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
  const risks = schools.map((s) => s.hazardScore).filter((v): v is number => v !== null);
  const rated = schools.filter((s) => s.shvrAvailable).map((s) => s.shvr);
  return { total: schools.length, students: schools.reduce((a, s) => a + s.totalStudents, 0), staff: schools.reduce((a, s) => a + s.totalStaff, 0), avgShvr: Number(averageValue(rated).toFixed(2)), avgSust: Math.round(averageValue(schools.map((s) => s.sustainabilityScore))), avgWash: Math.round(averageValue(schools.map((s) => s.washScore))), avgHazard: risks.length ? Math.round(averageValue(risks)) : 0, crsapPct: Math.round(schools.filter((s) => s.hasCRSAP === true).length / n * 100), greenPct: 0, sdmpPct: Math.round(schools.filter((s) => s.hasSDMP === true).length / n * 100), drillsPct: 0, hazardDataAvailable: risks.length > 0 };
}
export function hazardBreakdown(schools: School[]) {
  return HAZARDS.map((hazard) => { const samples = schools.filter((s) => s.hazards[hazard] !== null); const exposed = samples.filter((s) => (s.hazards[hazard] ?? 0) > 0).length; return { hazard, exposed, high: samples.filter((s) => (s.hazards[hazard] ?? 0) >= 2).length, exposedPct: samples.length ? Math.round(exposed / samples.length * 100) : null, available: samples.length > 0 }; }).sort((a, b) => b.exposed - a.exposed);
}
export function shvrDistribution(schools: School[]) { return [0, 1, 2, 3, 4, 5].map((star) => ({ star, label: star === 0 ? "Unrated" : "★".repeat(star), count: schools.filter((s) => s.shvrAvailable ? s.shvr === star : star === 0).length })); }
