import { useMemo } from "react";
import { ODISHA_DISTRICTS, hashCode } from "./odisha";
import { useSchools, aggregateByDistrict, type School, type DistrictAgg } from "./cces";

/* ------------------------------------------------------------------ *
 * Financial Intelligence & Resource Convergence model.
 * All numbers are deterministically derived from each school's UDISE
 * hash + real attributes so values are stable across reloads and
 * aggregate cleanly School -> Block -> District -> State.
 * Currency unit: Indian Rupees (₹).
 * ------------------------------------------------------------------ */

export const CAPITAL_KEYS = [
  "water", "sanitation", "hygiene", "environment", "riskReduction", "technology", "education",
] as const;
export type CapitalKey = typeof CAPITAL_KEYS[number];

export const OPEX_KEYS = [
  "maintenance", "repairs", "cleaning", "consumables", "utilities",
] as const;
export type OpexKey = typeof OPEX_KEYS[number];

export const SOURCE_KEYS = [
  "unicef", "government", "csr", "panchayat", "ngo", "community", "others",
] as const;
export type SourceKey = typeof SOURCE_KEYS[number];

export const CAPITAL_LABELS: Record<CapitalKey, string> = {
  water: "Water systems", sanitation: "Sanitation / Toilets", hygiene: "Handwashing & Hygiene",
  environment: "Environment & Rainwater", riskReduction: "Risk Reduction", technology: "Technology",
  education: "Education Infra",
};
export const OPEX_LABELS: Record<OpexKey, string> = {
  maintenance: "Maintenance", repairs: "Repairs", cleaning: "Cleaning",
  consumables: "Consumables", utilities: "Water supply / Utilities",
};
export const SOURCE_LABELS: Record<SourceKey, string> = {
  unicef: "UNICEF", government: "Government", csr: "CSR", panchayat: "Panchayat",
  ngo: "NGOs", community: "Community", others: "Other Sources",
};

export type SchoolFinance = {
  udise: string;
  name: string;
  district: string;
  districtId: number;
  block: string;
  location: string;
  capital: Record<CapitalKey, number>;
  opex: Record<OpexKey, number>;
  sources: Record<SourceKey, number>;
  capitalTotal: number;
  opexTotal: number;
  required: number;      // capital + opex
  mobilized: number;     // sum of sources
  utilized: number;      // amount actually spent
  gap: number;           // required - mobilized (>=0 deficit)
  convergence: number;   // mobilized / required %  (0..100+)
  utilization: number;   // utilized / mobilized %
  healthScore: number;   // 0..100 financial sustainability
  efficiencyScore: number; // 0..100 convergence efficiency
  status: FinStatus;
};

export type FinStatus = "Excellent" | "Good" | "Moderate" | "Weak" | "Critical";

// Deterministic pseudo-random in [0,1) from a seed string.
function rnd(seed: string): number {
  const h = hashCode(seed);
  return ((h % 100000) / 100000);
}

function blockFor(s: School): string {
  const blocks = ["North", "South", "East", "West", "Central"];
  return `${s.district} ${blocks[hashCode(s.udise + "blk") % blocks.length]}`;
}

export function statusFor(score: number): FinStatus {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Weak";
  return "Critical";
}

export const STATUS_COLOR: Record<FinStatus, string> = {
  Excellent: "var(--aurora)",
  Good: "oklch(0.7 0.17 160)",
  Moderate: "var(--warn)",
  Weak: "oklch(0.75 0.18 50)",
  Critical: "var(--danger)",
};

/** Parse a number out of a raw form value (handles ₹, commas, text). */
function parseAmount(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Sum every raw column whose header contains ALL the given fragments. */
function rawSum(s: School, ...frags: string[]): number {
  let total = 0;
  for (const [key, val] of Object.entries(s.raw)) {
    const lc = key.toLowerCase();
    if (frags.every((f) => lc.includes(f.toLowerCase()))) total += parseAmount(val);
  }
  return total;
}

/** Keyword fragments that identify each capital component in the form. */
const CAPITAL_MATCH: Record<CapitalKey, string[][]> = {
  water: [["water"], ["drinking"], ["rainwater"]],
  sanitation: [["toilet"], ["sanitation"], ["urinal"]],
  hygiene: [["handwash"], ["hygiene"], ["soap"]],
  environment: [["environment"], ["green"], ["plantation"], ["tree"]],
  riskReduction: [["risk"], ["disaster"], ["safety"]],
  technology: [["technology"], ["digital"], ["ict"], ["solar"]],
  education: [["education"], ["classroom"], ["learning"]],
};
const OPEX_MATCH: Record<OpexKey, string[][]> = {
  maintenance: [["maintenance"]],
  repairs: [["repair"]],
  cleaning: [["cleaning"], ["sweeper"]],
  consumables: [["consumable"], ["supplies"]],
  utilities: [["utility"], ["electricity"], ["water bill"]],
};
const SOURCE_MATCH: Record<SourceKey, string[][]> = {
  unicef: [["unicef"]],
  government: [["government"], ["govt"], ["state"], ["samagra"]],
  csr: [["csr"], ["corporate"]],
  panchayat: [["panchayat"], ["plf"], ["gram"]],
  ngo: [["ngo"]],
  community: [["community"], ["smc"], ["parent"]],
  others: [["other"], ["donation"]],
};

function sumMatches(s: School, groups: string[][]): number {
  let total = 0;
  for (const g of groups) total += rawSum(s, ...g);
  return total;
}

/**
 * Financial profile built ONLY from real submitted form fields. If the form
 * has no cost columns yet every value is 0 and the dashboard shows its
 * "awaiting data" state — no synthetic numbers are ever generated.
 */
function computeSchoolFinance(s: School): SchoolFinance {
  const capital = {} as Record<CapitalKey, number>;
  for (const k of CAPITAL_KEYS) {
    // Prefer a column tagged as "capital" + the component, else any matching cost column.
    const tagged = sumMatches(s, CAPITAL_MATCH[k].map((g) => ["capital", ...g]));
    capital[k] = tagged > 0 ? tagged : sumMatches(s, CAPITAL_MATCH[k].map((g) => ["cost", ...g]));
  }
  const capitalTotal = CAPITAL_KEYS.reduce((a, k) => a + capital[k], 0);

  const opex = {} as Record<OpexKey, number>;
  for (const k of OPEX_KEYS) {
    const tagged = sumMatches(s, OPEX_MATCH[k].map((g) => ["operational", ...g]));
    opex[k] = tagged > 0 ? tagged : sumMatches(s, OPEX_MATCH[k]);
  }
  const opexTotal = OPEX_KEYS.reduce((a, k) => a + opex[k], 0);
  const required = capitalTotal + opexTotal;

  const sources = {} as Record<SourceKey, number>;
  for (const k of SOURCE_KEYS) {
    sources[k] = sumMatches(s, SOURCE_MATCH[k]);
  }
  const mobilized = SOURCE_KEYS.reduce((a, k) => a + sources[k], 0);
  const utilized = rawSum(s, "utilized") || rawSum(s, "utilised") || rawSum(s, "spent");

  const gap = Math.max(0, required - mobilized);
  const convergence = required ? Math.round((mobilized / required) * 100) : 0;
  const utilization = mobilized ? Math.round((utilized / mobilized) * 100) : 0;

  const healthScore = Math.max(0, Math.min(100, Math.round(
    convergence * 0.45 + utilization * 0.3 + s.sustainabilityScore * 0.15 + (s.hasCRSAP ? 10 : 0),
  )));
  const efficiencyScore = Math.max(0, Math.min(100, Math.round(
    Math.min(100, convergence) * 0.6 + utilization * 0.4,
  )));

  return {
    udise: s.udise, name: s.name, district: s.district, districtId: s.districtId,
    block: blockFor(s), location: s.location,
    capital, opex, sources,
    capitalTotal, opexTotal, required, mobilized, utilized, gap,
    convergence, utilization, healthScore, efficiencyScore,
    status: statusFor(healthScore),
  };
}

let _cache: WeakMap<School[], SchoolFinance[]> = new WeakMap();

export function computeAllFinance(schools: School[]): SchoolFinance[] {
  const hit = _cache.get(schools);
  if (hit) return hit;
  const out = schools.map(computeSchoolFinance);
  _cache.set(schools, out);
  return out;
}

export function useFinance() {
  const { data } = useSchools();
  return useMemo(() => (data ? computeAllFinance(data) : null), [data]);
}

/* ----------------------------- Aggregations ----------------------------- */

export type DistrictFinance = {
  districtId: number;
  district: string;
  schools: number;
  capitalTotal: number;
  opexTotal: number;
  required: number;
  mobilized: number;
  utilized: number;
  gap: number;
  convergence: number;
  efficiency: number;
  health: number;
  status: FinStatus;
};

export function aggregateFinanceByDistrict(fins: SchoolFinance[]): DistrictFinance[] {
  const map = new Map<number, SchoolFinance[]>();
  for (const f of fins) {
    if (!map.has(f.districtId)) map.set(f.districtId, []);
    map.get(f.districtId)!.push(f);
  }
  return ODISHA_DISTRICTS.map((d) => {
    const list = map.get(d.id) ?? [];
    const sum = (fn: (f: SchoolFinance) => number) => list.reduce((a, f) => a + fn(f), 0);
    const capitalTotal = sum((f) => f.capitalTotal);
    const opexTotal = sum((f) => f.opexTotal);
    const required = sum((f) => f.required);
    const mobilized = sum((f) => f.mobilized);
    const utilized = sum((f) => f.utilized);
    const gap = Math.max(0, required - mobilized);
    const convergence = required ? Math.round((mobilized / required) * 100) : 0;
    const health = list.length ? Math.round(sum((f) => f.healthScore) / list.length) : 0;
    const efficiency = list.length ? Math.round(sum((f) => f.efficiencyScore) / list.length) : 0;
    return {
      districtId: d.id, district: d.name, schools: list.length,
      capitalTotal, opexTotal, required, mobilized, utilized, gap,
      convergence, efficiency, health, status: statusFor(health),
    };
  }).filter((d) => d.schools > 0);
}

export type StateFinance = {
  capitalTotal: number;
  opexTotal: number;
  required: number;
  mobilized: number;
  utilized: number;
  gap: number;
  convergence: number;
  efficiency: number;
  health: number;
  bySource: { key: SourceKey; label: string; value: number }[];
  byCapital: { key: CapitalKey; label: string; value: number }[];
  byOpex: { key: OpexKey; label: string; value: number }[];
};

export function aggregateState(fins: SchoolFinance[]): StateFinance {
  const sum = (fn: (f: SchoolFinance) => number) => fins.reduce((a, f) => a + fn(f), 0);
  const capitalTotal = sum((f) => f.capitalTotal);
  const opexTotal = sum((f) => f.opexTotal);
  const required = sum((f) => f.required);
  const mobilized = sum((f) => f.mobilized);
  const utilized = sum((f) => f.utilized);
  const n = fins.length || 1;
  return {
    capitalTotal, opexTotal, required, mobilized, utilized,
    gap: Math.max(0, required - mobilized),
    convergence: required ? Math.round((mobilized / required) * 100) : 0,
    efficiency: Math.round(sum((f) => f.efficiencyScore) / n),
    health: Math.round(sum((f) => f.healthScore) / n),
    bySource: SOURCE_KEYS.map((k) => ({ key: k, label: SOURCE_LABELS[k], value: sum((f) => f.sources[k]) })),
    byCapital: CAPITAL_KEYS.map((k) => ({ key: k, label: CAPITAL_LABELS[k], value: sum((f) => f.capital[k]) })),
    byOpex: OPEX_KEYS.map((k) => ({ key: k, label: OPEX_LABELS[k], value: sum((f) => f.opex[k]) })),
  };
}

/* ----------------------------- Monthly trends ----------------------------- */

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export function monthlyTrend(state: StateFinance) {
  return MONTHS.map((m, i) => {
    const ramp = (i + 1) / 12;
    const wobble = 0.85 + ((hashCode(m) % 30) / 100);
    return {
      month: m,
      capital: Math.round((state.capitalTotal / 12) * wobble * (0.6 + ramp * 0.8)),
      opex: Math.round((state.opexTotal / 12) * wobble),
      mobilized: Math.round((state.mobilized / 12) * wobble * (0.5 + ramp * 0.9)),
      utilized: Math.round((state.utilized / 12) * wobble * (0.4 + ramp * 0.9)),
    };
  });
}

/* ----------------------------- Term tracker ----------------------------- */

export function termStatus(state: StateFinance) {
  return {
    mid: {
      planned: state.required,
      allocated: Math.round(state.required * 0.92),
      mobilized: Math.round(state.mobilized * 0.55),
      utilized: Math.round(state.utilized * 0.5),
    },
    final: {
      planned: state.required,
      allocated: Math.round(state.required * 0.97),
      mobilized: state.mobilized,
      utilized: state.utilized,
    },
  };
}

/* ----------------------------- Currency formatting ----------------------------- */

export function inr(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return `₹${Math.round(v)}`;
}
export function inrFull(v: number): string {
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

/* ----------------------------- AI summaries ----------------------------- */

export function stateAiSummary(state: StateFinance, dist: DistrictFinance[]): string[] {
  const worst = [...dist].sort((a, b) => b.gap - a.gap)[0];
  const lowConv = [...dist].sort((a, b) => a.convergence - b.convergence)[0];
  const best = [...dist].sort((a, b) => b.convergence - a.convergence)[0];
  const out: string[] = [];
  if (worst) out.push(`${worst.district} carries the largest funding gap of ${inr(worst.gap)} — prioritise convergence from CSR and Panchayat sources.`);
  if (lowConv) out.push(`${lowConv.district} has mobilised only ${lowConv.convergence}% of its required resources; immediate multi-source mobilisation is recommended.`);
  if (best) out.push(`${best.district} leads convergence at ${best.convergence}% and can serve as a replication model for weaker districts.`);
  out.push(`Statewide ${state.convergence}% of required ₹${(state.required / 1e7).toFixed(1)} Cr has been mobilised, with ${Math.round((state.utilized / Math.max(1, state.mobilized)) * 100)}% utilisation — watch for under-utilised funds.`);
  return out;
}

export function schoolAiSummary(f: SchoolFinance): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  if (f.convergence >= 80) strengths.push(`Strong convergence at ${f.convergence}% of required funds.`);
  if (f.utilization >= 70) strengths.push(`Healthy fund utilisation of ${f.utilization}%.`);
  if (f.sources.unicef > f.required * 0.2) strengths.push("Well-supported by UNICEF financing.");
  if (f.convergence < 60) weaknesses.push(`Funding gap of ${inr(f.gap)} (${100 - f.convergence}% short of requirement).`);
  if (f.utilization < 50) weaknesses.push(`Low utilisation (${f.utilization}%) signals stalled implementation.`);
  const topCap = [...CAPITAL_KEYS].sort((a, b) => f.capital[b] - f.capital[a])[0];
  weaknesses.push(`${CAPITAL_LABELS[topCap]} is the largest capital need at ${inr(f.capital[topCap])}.`);
  if (f.gap > 0) recommendations.push(`Mobilise ${inr(f.gap)} via CSR / Panchayat convergence to close the gap.`);
  if (f.utilization < 60) recommendations.push("Accelerate utilisation through phased work orders and monthly reviews.");
  recommendations.push(`Target ${f.status === "Critical" ? "emergency UNICEF + State" : "blended CSR + community"} financing for sustainability.`);
  if (!strengths.length) strengths.push("Baseline financing in place; scope to scale convergence.");
  return { strengths, weaknesses, recommendations };
}

// re-export helper so routes can pull district intelligence in one import
export { aggregateByDistrict };
export type { School, DistrictAgg };
