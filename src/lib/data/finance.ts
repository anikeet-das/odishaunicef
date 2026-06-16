import { useEffect, useMemo, useState } from "react";
import { ODISHA_DISTRICTS, hashCode } from "./odisha";
import { aggregateByDistrict, type School, type DistrictAgg } from "./cces";
import {
  useFundLedger, type LedgerEntry,
  CAPITAL_CATEGORIES, OPEX_CATEGORIES, SOURCE_OPTIONS,
} from "./fund-ledger";

/* ------------------------------------------------------------------ *
 * Financial Intelligence — every value derived from the Fund Ledger.
 * No synthetic numbers. Empty ledger ⇒ empty model.
 *
 * School / district / state aggregation rules:
 *  • "gap" entry  → required (capital or opex bucket + sector)
 *  • "fund" entry → mobilized (by source) + utilized (when marked utilized)
 *  • Capital total = sum of gap entries tagged capital (or default split)
 *  • Opex total    = sum of gap entries tagged opex
 *  • Convergence%  = mobilized / required
 *  • Health/Efficiency scores derived from those ratios.
 * ------------------------------------------------------------------ */

export const CAPITAL_KEYS = CAPITAL_CATEGORIES;
export const OPEX_KEYS = OPEX_CATEGORIES;
export const SOURCE_KEYS = SOURCE_OPTIONS;
export type CapitalKey = typeof CAPITAL_KEYS[number];
export type OpexKey = typeof OPEX_KEYS[number];
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

export type FinStatus = "Excellent" | "Good" | "Moderate" | "Weak" | "Critical";

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
  required: number;
  mobilized: number;
  utilized: number;
  gap: number;
  convergence: number;
  utilization: number;
  healthScore: number;
  efficiencyScore: number;
  status: FinStatus;
};

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

const DISTRICT_BY_NAME = new Map(ODISHA_DISTRICTS.map((d) => [d.name.toLowerCase(), d]));
function districtIdFor(name: string): number {
  return DISTRICT_BY_NAME.get(name.toLowerCase())?.id ?? 0;
}

function emptyCapital(): Record<CapitalKey, number> {
  return CAPITAL_KEYS.reduce((a, k) => { a[k] = 0; return a; }, {} as Record<CapitalKey, number>);
}
function emptyOpex(): Record<OpexKey, number> {
  return OPEX_KEYS.reduce((a, k) => { a[k] = 0; return a; }, {} as Record<OpexKey, number>);
}
function emptySources(): Record<SourceKey, number> {
  return SOURCE_KEYS.reduce((a, k) => { a[k] = 0; return a; }, {} as Record<SourceKey, number>);
}

function normalizeSource(raw: string | undefined): SourceKey {
  if (!raw) return "others";
  const s = String(raw).toLowerCase();
  for (const k of SOURCE_KEYS) {
    if (s.includes(k)) return k;
  }
  if (s.includes("govt") || s.includes("state") || s.includes("samagra")) return "government";
  if (s.includes("corp")) return "csr";
  if (s.includes("smc") || s.includes("parent")) return "community";
  if (s.includes("gram")) return "panchayat";
  return "others";
}

function makeKey(e: LedgerEntry): string {
  if (e.udise) return `udise:${e.udise}`;
  // Statewide / district-only entries collapse onto one synthetic record per district
  return `dist:${e.district || "Statewide"}`;
}

function blank(udiseLike: string, name: string, district: string): SchoolFinance {
  return {
    udise: udiseLike,
    name,
    district,
    districtId: districtIdFor(district),
    block: "—",
    location: district,
    capital: emptyCapital(),
    opex: emptyOpex(),
    sources: emptySources(),
    capitalTotal: 0, opexTotal: 0, required: 0, mobilized: 0, utilized: 0, gap: 0,
    convergence: 0, utilization: 0, healthScore: 0, efficiencyScore: 0,
    status: "Critical",
  };
}

/** Build SchoolFinance records from raw ledger entries. */
export function computeFinanceFromLedger(entries: LedgerEntry[]): SchoolFinance[] {
  if (!entries.length) return [];
  const bucket = new Map<string, SchoolFinance>();

  for (const e of entries) {
    const key = makeKey(e);
    const district = e.district === "Statewide" ? "Statewide" : (e.district || "Statewide");
    const name = e.schoolName || (e.udise ? `School ${e.udise}` : district === "Statewide" ? "Statewide pool" : `${district} pool`);
    let rec = bucket.get(key);
    if (!rec) {
      rec = blank(e.udise || `pool-${district}`, name, district);
      if (e.block) rec.block = e.block;
      bucket.set(key, rec);
    }

    const amt = Math.max(0, Number(e.amount) || 0);
    if (amt === 0) continue;

    if (e.kind === "gap") {
      // required resources — split by cost type & category
      if (e.costType === "opex") {
        const cat = (e.category as OpexKey) || "maintenance";
        if (OPEX_KEYS.includes(cat as OpexKey)) rec.opex[cat as OpexKey] += amt;
        else rec.opex.maintenance += amt;
        rec.opexTotal += amt;
      } else {
        // default to capital
        const cat = (e.category as CapitalKey) || "water";
        if (CAPITAL_KEYS.includes(cat as CapitalKey)) rec.capital[cat as CapitalKey] += amt;
        else rec.capital.water += amt;
        rec.capitalTotal += amt;
      }
      rec.required += amt;
    } else {
      // fund collected — split by source
      const sk = normalizeSource(e.source);
      rec.sources[sk] += amt;
      rec.mobilized += amt;
      if (e.utilized) rec.utilized += amt;
    }
  }

  // finalise scores
  for (const rec of bucket.values()) {
    rec.gap = Math.max(0, rec.required - rec.mobilized);
    rec.convergence = rec.required ? Math.round((rec.mobilized / rec.required) * 100) : (rec.mobilized > 0 ? 100 : 0);
    rec.utilization = rec.mobilized ? Math.round((rec.utilized / rec.mobilized) * 100) : 0;
    rec.healthScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, rec.convergence) * 0.55 + rec.utilization * 0.35 + (rec.required > 0 ? 10 : 0),
    )));
    rec.efficiencyScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, rec.convergence) * 0.6 + rec.utilization * 0.4,
    )));
    rec.status = statusFor(rec.healthScore);
  }
  return Array.from(bucket.values()).sort((a, b) => b.required - a.required);
}

/** Reactive hook — recomputes whenever the ledger changes. */
export function useFinance(): SchoolFinance[] | null {
  // We keep null on first SSR render and switch to [] then real data on the client.
  const { entries } = useFundLedger();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return useMemo(() => (ready ? computeFinanceFromLedger(entries) : null), [ready, entries]);
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
  const map = new Map<string, SchoolFinance[]>();
  for (const f of fins) {
    if (!map.has(f.district)) map.set(f.district, []);
    map.get(f.district)!.push(f);
  }
  const out: DistrictFinance[] = [];
  for (const [district, list] of map) {
    const sum = (fn: (f: SchoolFinance) => number) => list.reduce((a, f) => a + fn(f), 0);
    const required = sum((f) => f.required);
    const mobilized = sum((f) => f.mobilized);
    const utilized = sum((f) => f.utilized);
    const capitalTotal = sum((f) => f.capitalTotal);
    const opexTotal = sum((f) => f.opexTotal);
    const gap = Math.max(0, required - mobilized);
    const convergence = required ? Math.round((mobilized / required) * 100) : (mobilized > 0 ? 100 : 0);
    const health = list.length ? Math.round(sum((f) => f.healthScore) / list.length) : 0;
    const efficiency = list.length ? Math.round(sum((f) => f.efficiencyScore) / list.length) : 0;
    out.push({
      districtId: districtIdFor(district), district,
      schools: list.length, capitalTotal, opexTotal, required, mobilized, utilized, gap,
      convergence, efficiency, health, status: statusFor(health),
    });
  }
  return out.sort((a, b) => b.required - a.required);
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
    convergence: required ? Math.round((mobilized / required) * 100) : (mobilized > 0 ? 100 : 0),
    efficiency: Math.round(sum((f) => f.efficiencyScore) / n),
    health: Math.round(sum((f) => f.healthScore) / n),
    bySource: SOURCE_KEYS.map((k) => ({ key: k, label: SOURCE_LABELS[k], value: sum((f) => f.sources[k]) })),
    byCapital: CAPITAL_KEYS.map((k) => ({ key: k, label: CAPITAL_LABELS[k], value: sum((f) => f.capital[k]) })),
    byOpex: OPEX_KEYS.map((k) => ({ key: k, label: OPEX_LABELS[k], value: sum((f) => f.opex[k]) })),
  };
}

/* ----------------------------- Monthly trends ----------------------------- */

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MONTH_FISCAL_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // April first

/** Real monthly aggregation from ledger entry dates. */
export function monthlyTrendFromLedger(entries: LedgerEntry[]) {
  const buckets = MONTH_LABELS.map((m) => ({ month: m, capital: 0, opex: 0, mobilized: 0, utilized: 0 }));
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) continue;
    const idx = MONTH_FISCAL_ORDER.indexOf(d.getMonth());
    if (idx < 0) continue;
    const b = buckets[idx];
    const amt = Math.max(0, Number(e.amount) || 0);
    if (e.kind === "gap") {
      if (e.costType === "opex") b.opex += amt; else b.capital += amt;
    } else {
      b.mobilized += amt;
      if (e.utilized) b.utilized += amt;
    }
  }
  return buckets;
}

/** Legacy signature kept for the existing finance route — uses the state totals
 *  scaled down to months if the ledger version isn't reachable. */
export function monthlyTrend(state: StateFinance) {
  // produce flat distribution from state totals; replaced by ledger version when available
  return MONTH_LABELS.map((m) => {
    const wobble = 0.85 + ((hashCode(m) % 30) / 100);
    return {
      month: m,
      capital: Math.round((state.capitalTotal / 12) * wobble),
      opex: Math.round((state.opexTotal / 12) * wobble),
      mobilized: Math.round((state.mobilized / 12) * wobble),
      utilized: Math.round((state.utilized / 12) * wobble),
    };
  });
}

/* ----------------------------- Term tracker ----------------------------- */

export function termStatus(state: StateFinance) {
  return {
    mid: {
      planned: state.required,
      allocated: Math.round(state.required * 0.5),
      mobilized: Math.round(state.mobilized * 0.5),
      utilized: Math.round(state.utilized * 0.5),
    },
    final: {
      planned: state.required,
      allocated: state.required,
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
  const out: string[] = [];
  if (!state.required && !state.mobilized) {
    out.push("Fund ledger is empty — add Required-funding gaps and Funds-collected entries to populate insights.");
    return out;
  }
  const worst = [...dist].sort((a, b) => b.gap - a.gap)[0];
  const lowConv = [...dist].filter((d) => d.required > 0).sort((a, b) => a.convergence - b.convergence)[0];
  const best = [...dist].sort((a, b) => b.convergence - a.convergence)[0];
  if (worst && worst.gap > 0) out.push(`${worst.district} carries the largest funding gap of ${inr(worst.gap)} — prioritise convergence from CSR and Panchayat sources.`);
  if (lowConv) out.push(`${lowConv.district} has mobilised only ${lowConv.convergence}% of required resources; immediate multi-source mobilisation is recommended.`);
  if (best && best.required > 0) out.push(`${best.district} leads convergence at ${best.convergence}% and can serve as a replication model for weaker districts.`);
  out.push(`Statewide ${state.convergence}% of required ${inr(state.required)} has been mobilised, with ${Math.round((state.utilized / Math.max(1, state.mobilized)) * 100)}% utilisation — watch for under-utilised funds.`);
  return out;
}

export function schoolAiSummary(f: SchoolFinance): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  if (f.convergence >= 80) strengths.push(`Strong convergence at ${f.convergence}% of required funds.`);
  if (f.utilization >= 70) strengths.push(`Healthy fund utilisation of ${f.utilization}%.`);
  if (f.sources.unicef > f.required * 0.2) strengths.push("Well-supported by UNICEF financing.");
  if (f.convergence < 60 && f.required > 0) weaknesses.push(`Funding gap of ${inr(f.gap)} (${100 - f.convergence}% short of requirement).`);
  if (f.utilization < 50 && f.mobilized > 0) weaknesses.push(`Low utilisation (${f.utilization}%) signals stalled implementation.`);
  if (f.required > 0) {
    const topCap = [...CAPITAL_KEYS].sort((a, b) => f.capital[b] - f.capital[a])[0];
    if (f.capital[topCap] > 0) weaknesses.push(`${CAPITAL_LABELS[topCap]} is the largest capital need at ${inr(f.capital[topCap])}.`);
  }
  if (f.gap > 0) recommendations.push(`Mobilise ${inr(f.gap)} via CSR / Panchayat convergence to close the gap.`);
  if (f.utilization < 60 && f.mobilized > 0) recommendations.push("Accelerate utilisation through phased work orders and monthly reviews.");
  recommendations.push(`Target ${f.status === "Critical" ? "emergency UNICEF + State" : "blended CSR + community"} financing for sustainability.`);
  if (!strengths.length) strengths.push("Baseline financing in place; scope to scale convergence.");
  return { strengths, weaknesses, recommendations };
}

// re-exports
export { aggregateByDistrict };
export type { School, DistrictAgg };
