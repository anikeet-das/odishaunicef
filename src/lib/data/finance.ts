import { useMemo } from "react";
import { ODISHA_DISTRICTS } from "./odisha";
import { useSchools, aggregateByDistrict, type School, type DistrictAgg } from "./cces";
import {
  useFundLedger,
  type LedgerEntry,
  type CapitalCategory,
  type OpexCategory,
  type SourceOption,
} from "./fund-ledger";

/* ------------------------------------------------------------------ *
 * Financial Intelligence & Resource Convergence model.
 * The supplied CR-SAP form has no financial cost columns. This module therefore
 * exposes manual ledger entries only and never invents school-level amounts.
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

function computeSchoolFinance(s: School): SchoolFinance {
  // Base capital scaled by student footprint + needs (lower scores = more need).
  const base = 600000 + s.totalStudents * 1800;
  const needFactor = 1 + (100 - s.washScore) / 140 + (s.hazardScore) / 220;

  const capital = {} as Record<CapitalKey, number>;
  const capWeights: Record<CapitalKey, number> = {
    water: 0.22, sanitation: 0.24, hygiene: 0.12, environment: 0.12,
    riskReduction: 0.13, technology: 0.09, education: 0.08,
  };
  for (const k of CAPITAL_KEYS) {
    const v = base * needFactor * capWeights[k] * (0.7 + rnd(s.udise + k) * 0.7);
    capital[k] = Math.round(v / 1000) * 1000;
  }
  const capitalTotal = CAPITAL_KEYS.reduce((a, k) => a + capital[k], 0);

  const opex = {} as Record<OpexKey, number>;
  const opexWeights: Record<OpexKey, number> = {
    maintenance: 0.3, repairs: 0.2, cleaning: 0.2, consumables: 0.15, utilities: 0.15,
  };
  const opexBase = capitalTotal * 0.18;
  for (const k of OPEX_KEYS) {
    const v = opexBase * opexWeights[k] * (0.7 + rnd(s.udise + k) * 0.7);
    opex[k] = Math.round(v / 1000) * 1000;
  }
  const opexTotal = OPEX_KEYS.reduce((a, k) => a + opex[k], 0);
  const required = capitalTotal + opexTotal;

  // Mobilization — better schools (CR-SAP/green) mobilize more.
  const mobFactor = 0.45 + rnd(s.udise + "mob") * 0.6
    + (s.hasCRSAP ? 0.08 : 0) + (s.hasGreenPlan ? 0.05 : 0)
    + (s.sustainabilityScore / 600);
  const targetMobilized = required * Math.min(1.15, mobFactor);
  const sources = {} as Record<SourceKey, number>;
  const srcWeights: Record<SourceKey, number> = {
    unicef: 0.26, government: 0.34, csr: 0.13, panchayat: 0.1, ngo: 0.07, community: 0.06, others: 0.04,
  };
  for (const k of SOURCE_KEYS) {
    const v = targetMobilized * srcWeights[k] * (0.6 + rnd(s.udise + k) * 0.8);
    sources[k] = Math.round(v / 1000) * 1000;
  }
  const mobilized = SOURCE_KEYS.reduce((a, k) => a + sources[k], 0);
  const utilized = Math.round(mobilized * (0.5 + rnd(s.udise + "util") * 0.45));
  const gap = Math.max(0, required - mobilized);
  const convergence = Math.round((mobilized / required) * 100);
  const utilization = Math.round((utilized / Math.max(1, mobilized)) * 100);

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
  void schools;
  return [];
}

export function useFinance() {
  const { data } = useSchools();
  const { entries } = useFundLedger();
  return useMemo(() => {
    if (!data) return null;
    return applyLedgerOverlay([], entries);
  }, [data, entries]);
}

/* ----- Ledger overlay: makes manual Fund Ledger entries flow into every
   chart, KPI and leaderboard in real time across Finance pages. ----- */

const CAPITAL_KEY_OF: Record<CapitalCategory, CapitalKey> = {
  water: "water", sanitation: "sanitation", hygiene: "hygiene",
  environment: "environment", riskReduction: "riskReduction",
  technology: "technology", education: "education",
};
const OPEX_KEY_OF: Record<OpexCategory, OpexKey> = {
  maintenance: "maintenance", repairs: "repairs", cleaning: "cleaning",
  consumables: "consumables", utilities: "utilities",
};
const SOURCE_KEY_OF: Record<string, SourceKey> = {
  unicef: "unicef", government: "government", csr: "csr", panchayat: "panchayat",
  ngo: "ngo", community: "community", others: "others",
};

function recompute(f: SchoolFinance): SchoolFinance {
  const capitalTotal = CAPITAL_KEYS.reduce((a, k) => a + f.capital[k], 0);
  const opexTotal = OPEX_KEYS.reduce((a, k) => a + f.opex[k], 0);
  const required = capitalTotal + opexTotal;
  const mobilized = SOURCE_KEYS.reduce((a, k) => a + f.sources[k], 0);
  const utilized = f.utilized;
  const gap = Math.max(0, required - mobilized);
  const convergence = required ? Math.round((mobilized / required) * 100) : 0;
  const utilization = Math.round((utilized / Math.max(1, mobilized)) * 100);
  const healthScore = Math.max(0, Math.min(100, Math.round(
    convergence * 0.45 + utilization * 0.3 + 50 * 0.15 + 5,
  )));
  const efficiencyScore = Math.max(0, Math.min(100, Math.round(
    Math.min(100, convergence) * 0.6 + utilization * 0.4,
  )));
  return {
    ...f, capitalTotal, opexTotal, required, mobilized, utilized, gap,
    convergence, utilization, healthScore, efficiencyScore,
    status: statusFor(healthScore),
  };
}

function applyEntryToSchool(f: SchoolFinance, e: LedgerEntry) {
  if (e.kind === "gap") {
    if (e.costType === "opex" && e.category && OPEX_KEY_OF[e.category as OpexCategory]) {
      f.opex[OPEX_KEY_OF[e.category as OpexCategory]] += e.amount;
    } else if (e.category && CAPITAL_KEY_OF[e.category as CapitalCategory]) {
      f.capital[CAPITAL_KEY_OF[e.category as CapitalCategory]] += e.amount;
    } else {
      // default capital bucket if unspecified
      f.capital.water += e.amount;
    }
  } else {
    const sk = SOURCE_KEY_OF[String(e.source).toLowerCase()] ?? "others";
    f.sources[sk] += e.amount;
    if (e.utilized) f.utilized += e.amount;
  }
}

function makeGhost(e: LedgerEntry): SchoolFinance {
  const district = e.district || "Statewide";
  const dist = ODISHA_DISTRICTS.find((d) => d.name === district);
  const empty = <T extends string>(keys: readonly T[]) =>
    Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  const f: SchoolFinance = {
    udise: `LEDGER-${e.id}`,
    name: e.schoolName || `Ledger · ${e.purpose || (e.kind === "fund" ? "Funds collected" : "Resource gap")}`,
    district,
    districtId: dist?.id ?? -1,
    block: e.block || district,
    location: district,
    capital: empty(CAPITAL_KEYS),
    opex: empty(OPEX_KEYS),
    sources: empty(SOURCE_KEYS),
    capitalTotal: 0, opexTotal: 0, required: 0, mobilized: 0, utilized: 0, gap: 0,
    convergence: 0, utilization: 0, healthScore: 0, efficiencyScore: 0,
    status: "Moderate",
  };
  applyEntryToSchool(f, e);
  return recompute(f);
}

export function applyLedgerOverlay(fins: SchoolFinance[], entries: LedgerEntry[]): SchoolFinance[] {
  if (!entries.length) return fins;
  const map = new Map<string, SchoolFinance>();
  for (const f of fins) {
    map.set(f.udise, {
      ...f,
      capital: { ...f.capital },
      opex: { ...f.opex },
      sources: { ...f.sources },
    });
  }
  const ghosts: SchoolFinance[] = [];
  for (const e of entries) {
    const matched = e.udise ? map.get(e.udise) : undefined;
    if (matched) applyEntryToSchool(matched, e);
    else ghosts.push(makeGhost(e));
  }
  const out: SchoolFinance[] = [];
  for (const f of map.values()) out.push(recompute(f));
  return out.concat(ghosts);
}

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

export function monthlyTrend(state: StateFinance) {
  void state;
  return [];
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
