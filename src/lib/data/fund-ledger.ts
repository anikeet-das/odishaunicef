import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * Manual fund & resource-gap ledger.
 *
 * Every financial number in the platform is derived from entries here —
 * Funds Collected (with source), Required Resources (gaps), Capital vs
 * Operational tagging, optional school/UDISE attribution. No synthetic
 * numbers anywhere; the Fund Ledger IS the source of truth.
 * ------------------------------------------------------------------ */

export type LedgerKind = "fund" | "gap";
export type CostType = "capital" | "opex";

export const CAPITAL_CATEGORIES = [
  "water", "sanitation", "hygiene", "environment", "riskReduction", "technology", "education",
] as const;
export const OPEX_CATEGORIES = [
  "maintenance", "repairs", "cleaning", "consumables", "utilities",
] as const;
export const SOURCE_OPTIONS = [
  "unicef", "government", "csr", "panchayat", "ngo", "community", "others",
] as const;

export type CapitalCategory = typeof CAPITAL_CATEGORIES[number];
export type OpexCategory = typeof OPEX_CATEGORIES[number];
export type SourceOption = typeof SOURCE_OPTIONS[number];

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;          // money collected vs. funding still required
  source: SourceOption | string; // contributor / requester
  amount: number;            // ₹
  date: string;              // ISO date (yyyy-mm-dd)
  purpose: string;
  district: string;          // Odisha district or "Statewide"
  // — Extended attributes (all optional; older entries gracefully default) —
  costType?: CostType;       // capital vs operational
  category?: CapitalCategory | OpexCategory; // sector within cost type
  udise?: string;            // school UDISE if attributable
  schoolName?: string;       // school name if attributable
  block?: string;            // block within district
  utilized?: boolean;        // funds already spent vs only mobilized
  note?: string;
};

const KEY = "crsap.fundLedger.v1";

function read(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: LedgerEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("crsap-ledger-change"));
}

export function useFundLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => read());

  useEffect(() => {
    const sync = () => setEntries(read());
    window.addEventListener("crsap-ledger-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("crsap-ledger-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((e: Omit<LedgerEntry, "id">) => {
    const next = [...read(), { ...e, id: crypto.randomUUID() }];
    write(next);
    setEntries(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((x) => x.id !== id);
    write(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, add, remove, clear };
}

export function ledgerTotals(entries: LedgerEntry[]) {
  const collected = entries.filter((e) => e.kind === "fund").reduce((a, e) => a + e.amount, 0);
  const gap = entries.filter((e) => e.kind === "gap").reduce((a, e) => a + e.amount, 0);
  return {
    collected,
    gap,
    balance: collected - gap,
    coverage: gap > 0 ? Math.round((collected / gap) * 100) : collected > 0 ? 100 : 0,
  };
}

export function inr(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
