import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * Manual fund & resource-gap ledger.
 *
 * The Google Form captures school WASH conditions, not money. So funds
 * collected and resource gaps are recorded here by the team — each entry
 * notes who gave the fund, when, the purpose and the district. This is a
 * clean balance-sheet style tracker that lives alongside the live survey
 * data without ever fabricating numbers.
 * ------------------------------------------------------------------ */

export type LedgerKind = "fund" | "gap";

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;          // money collected vs. funding still required
  source: string;            // who gave / who needs it (e.g. UNICEF, CSR, Govt)
  amount: number;            // ₹
  date: string;              // ISO date string (yyyy-mm-dd)
  purpose: string;          // what the fund is for
  district: string;          // Odisha district (or "Statewide")
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
  // Notify other components in the same tab.
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
    balance: collected - gap, // positive = surplus, negative = shortfall
    coverage: gap > 0 ? Math.round((collected / gap) * 100) : collected > 0 ? 100 : 0,
  };
}

export function inr(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
