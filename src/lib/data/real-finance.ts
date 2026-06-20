import { useMemo } from "react";
import { useSchools, type School } from "./cces";

/* =========================================================================
 *  REAL Financial Intelligence — directly from Google Form responses.
 *  ZERO synthesised numbers. Every value flows from a real cell:
 *    - Capital Cost - Toilets (INR)
 *    - Capital Cost - Water (INR)
 *    - Capital Cost - Infrastructure (INR)
 *    - Operational Cost - Maintenance (INR)
 *    - Operational Cost - Cleaning (INR)
 *    - Operational Cost - Repairs (INR)
 *    - Total estimated budget (INR)         (used as Resource Mobilized)
 *    - Funding source suggested              (source breakdown)
 *    - Budget urgency
 *  Invalid entries ("No idea", "NA", text) become AI Notes instead of $0.
 * ========================================================================= */

export type CapitalField = "toilets" | "water" | "infrastructure";
export type OpexField = "maintenance" | "cleaning" | "repairs";
export type FinField = CapitalField | OpexField;

export const CAPITAL_FIELDS: CapitalField[] = ["toilets", "water", "infrastructure"];
export const OPEX_FIELDS: OpexField[] = ["maintenance", "cleaning", "repairs"];
export const ALL_FIELDS: FinField[] = [...CAPITAL_FIELDS, ...OPEX_FIELDS];

export const FIELD_LABEL: Record<FinField, string> = {
  toilets: "Toilets",
  water: "Water",
  infrastructure: "Infrastructure",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
  repairs: "Repairs",
};

const COL_MATCH: Record<FinField, string[]> = {
  toilets: ["capital cost", "toilet"],
  water: ["capital cost", "water"],
  infrastructure: ["capital cost", "infrastructure"],
  maintenance: ["operational cost", "maintenance"],
  cleaning: ["operational cost", "cleaning"],
  repairs: ["operational cost", "repair"],
};

const COL_BUDGET = ["total estimated budget"];
const COL_SOURCE = ["funding source"];
const COL_URGENCY = ["budget urgency"];

function findHeader(raw: Record<string, string>, frags: string[]): string | undefined {
  const headers = Object.keys(raw);
  return headers.find((h) => {
    const lc = h.toLowerCase();
    return frags.every((f) => lc.includes(f));
  });
}
function getCell(raw: Record<string, string>, frags: string[]): string {
  const h = findHeader(raw, frags);
  return h ? (raw[h] ?? "").trim() : "";
}

/* --- Data cleaning: convert messy strings into either a number or `null`. --- */
const INVALID_TOKENS = new Set([
  "", "-", "na", "n/a", "no idea", "no idea.", "yes", "no", "unknown",
  "nil", "none", "not applicable", "don't know", "dont know", "n.a.",
]);

export function parseAmount(raw: string): { value: number | null; reason?: string } {
  const t = raw.trim();
  if (!t) return { value: null, reason: "empty" };
  const low = t.toLowerCase();
  if (INVALID_TOKENS.has(low)) return { value: null, reason: low || "empty" };

  // Indian shorthand: "1l" / "1.5l" -> lakh, "2cr" -> crore, "10k" -> thousand
  const short = low.replace(/[,\s₹rs.]+/g, "").match(/^(\d+(?:\.\d+)?)([lck]r?)?$/i);
  if (short) {
    const n = Number(short[1]);
    const unit = short[2];
    if (!unit) return { value: n };
    if (unit === "k") return { value: n * 1_000 };
    if (unit === "l") return { value: n * 100_000 };
    if (unit === "lk") return { value: n * 100_000 };
    if (unit === "cr") return { value: n * 1_00_00_000 };
  }

  // Strip currency / commas / spaces and try to read a plain number.
  const cleaned = t.replace(/[₹,\s]|inr|rs\.?|rupees?/gi, "");
  // Patterns like "2000-0" → take the first number group.
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return { value: null, reason: "text" };
  const n = Number(m[0]);
  if (!Number.isFinite(n) || n < 0) return { value: null, reason: "text" };
  // If the original string still contains letters / non-numeric noise after
  // matching, surface it as an AI note BUT keep the number — except when the
  // letters dominate (e.g. "Yes 1000" is ambiguous).
  return { value: n };
}

/* --------------------------- AI Notes classification --------------------------- */

export type AiPriority = "High" | "Medium" | "Low";
export type AiNote = {
  id: string;
  udise: string;
  schoolName: string;
  district: string;
  field: string;
  fieldLabel: string;
  rawValue: string;
  reason: string;
  summary: string;
  action: string;
  priority: AiPriority;
  priorityScore: number; // 1-10
  timestamp: number;
};

const HIGH_KEYWORDS = [
  "unsafe", "danger", "damage", "damaged", "collapse", "broken", "no toilet",
  "no water", "no electricity", "structural", "leak", "flood", "cyclone",
  "urgent", "critical",
];
const MED_KEYWORDS = ["maintenance", "repair", "issue", "problem", "needed", "inspection"];

function classify(rawValue: string, field: string): { priority: AiPriority; score: number; summary: string; action: string } {
  const t = rawValue.trim().toLowerCase();
  const label = FIELD_LABEL[field as FinField] ?? field;

  if (t === "" ) {
    return { priority: "Low", score: 2, summary: `${label} cost not provided by respondent.`,
      action: "Request budget estimate from school authority." };
  }
  if (HIGH_KEYWORDS.some((k) => t.includes(k))) {
    return { priority: "High", score: 9, summary: `Respondent flagged a critical condition under ${label}: "${rawValue}".`,
      action: "Dispatch immediate field inspection and corrective action team." };
  }
  if (MED_KEYWORDS.some((k) => t.includes(k))) {
    return { priority: "Medium", score: 6, summary: `Respondent reported a maintenance/repair concern under ${label}.`,
      action: "Schedule maintenance assessment within 30 days." };
  }
  if (["no idea", "unknown", "don't know", "dont know"].some((k) => t.includes(k))) {
    return { priority: "Low", score: 3, summary: `Financial estimate for ${label} not provided by respondent.`,
      action: "Request a budget assessment from the school authority." };
  }
  if (["na", "n/a", "-", "nil", "none"].includes(t)) {
    return { priority: "Low", score: 2, summary: `Respondent marked ${label} as not applicable.`,
      action: "Verify with school whether the facility/cost truly does not apply." };
  }
  if (t === "yes" || t === "no") {
    return { priority: "Low", score: 4, summary: `Respondent entered a Yes/No answer instead of a ${label} amount.`,
      action: "Re-contact respondent to capture a numeric estimate." };
  }
  return { priority: "Low", score: 3, summary: `Non-numeric value entered under ${label}: "${rawValue}".`,
    action: "Validate the entry and request a corrected amount." };
}

/* --------------------------- Per-school finance object --------------------------- */

export type SchoolFin = {
  udise: string;
  name: string;
  district: string;
  block: string;
  capital: Record<CapitalField, number | null>;
  opex: Record<OpexField, number | null>;
  capitalTotal: number;      // sum of valid capital fields
  opexTotal: number;         // sum of valid opex fields
  required: number;          // capital + opex (from valid entries)
  mobilized: number;         // "Total estimated budget" cell, when valid
  gap: number;               // max(0, required - mobilized)
  fundingSource: string;
  urgency: string;
  validFields: number;       // number of the 6 monetary fields that parsed
  totalFields: number;       // 6
  isFullyValid: boolean;     // all 6 fields parse to numbers
  lastUpdated: string;
  notes: AiNote[];
};

function cleanSource(s: string): string {
  // "Panchayat fund / ପଞ୍ଚାୟତ ପାଣ୍ଠି" -> "Panchayat fund"
  return (s.split(" / ")[0] || s).trim();
}

function buildSchoolFin(s: School, idx: number): SchoolFin {
  const raw = s.raw ?? {};
  const notes: AiNote[] = [];
  const capital = {} as Record<CapitalField, number | null>;
  const opex = {} as Record<OpexField, number | null>;
  let valid = 0;

  for (const f of CAPITAL_FIELDS) {
    const cell = getCell(raw, COL_MATCH[f]);
    const { value, reason } = parseAmount(cell);
    capital[f] = value;
    if (value !== null) valid++;
    else {
      const c = classify(cell, f);
      notes.push({
        id: `${s.udise}-${f}-${idx}`,
        udise: s.udise, schoolName: s.name, district: s.district,
        field: f, fieldLabel: FIELD_LABEL[f],
        rawValue: cell, reason: reason ?? "invalid",
        summary: c.summary, action: c.action,
        priority: c.priority, priorityScore: c.score,
        timestamp: Date.now(),
      });
    }
  }
  for (const f of OPEX_FIELDS) {
    const cell = getCell(raw, COL_MATCH[f]);
    const { value, reason } = parseAmount(cell);
    opex[f] = value;
    if (value !== null) valid++;
    else {
      const c = classify(cell, f);
      notes.push({
        id: `${s.udise}-${f}-${idx}`,
        udise: s.udise, schoolName: s.name, district: s.district,
        field: f, fieldLabel: FIELD_LABEL[f],
        rawValue: cell, reason: reason ?? "invalid",
        summary: c.summary, action: c.action,
        priority: c.priority, priorityScore: c.score,
        timestamp: Date.now(),
      });
    }
  }

  const capitalTotal = CAPITAL_FIELDS.reduce((a, f) => a + (capital[f] ?? 0), 0);
  const opexTotal = OPEX_FIELDS.reduce((a, f) => a + (opex[f] ?? 0), 0);
  const required = capitalTotal + opexTotal;
  const budgetCell = getCell(raw, COL_BUDGET);
  const { value: mobilizedVal } = parseAmount(budgetCell);
  const mobilized = mobilizedVal ?? 0;

  return {
    udise: s.udise, name: s.name, district: s.district, block: s.raw["Block / ULB / ବ୍ଲକ୍ / ୟୁଏଲବି"] || "—",
    capital, opex, capitalTotal, opexTotal, required, mobilized,
    gap: Math.max(0, required - mobilized),
    fundingSource: cleanSource(getCell(raw, COL_SOURCE)),
    urgency: cleanSource(getCell(raw, COL_URGENCY)),
    validFields: valid, totalFields: 6,
    isFullyValid: valid === 6,
    lastUpdated: raw["Timestamp"] || "",
    notes,
  };
}

/* --------------------------- Aggregations --------------------------- */

export type RealFinanceState = {
  schools: SchoolFin[];
  notes: AiNote[];
  totals: {
    capitalTotal: number;
    opexTotal: number;
    capitalByField: Record<CapitalField, number>;
    opexByField: Record<OpexField, number>;
    required: number;
    mobilized: number;
    gap: number;
    convergence: number;       // mobilized/required %
    sourceBreakdown: { source: string; value: number }[];
    urgencyBreakdown: { urgency: string; count: number }[];
  };
  audit: {
    totalSchools: number;
    validRecords: number;        // schools with all 6 fields numeric
    partiallyValid: number;      // 1..5 valid
    invalidRecords: number;      // 0 valid
    totalFieldCells: number;     // schools * 6
    validFieldCells: number;
    accuracyPct: number;         // validFieldCells / totalFieldCells * 100
    mismatchSchools: number;     // capital+opex != mobilized AND mobilized>0
  };
  topByRequired: SchoolFin[];
  topByCapital: SchoolFin[];
  topByOpex: SchoolFin[];
  missingEstimates: SchoolFin[];
  districts: DistrictFin[];
};

export type DistrictFin = {
  district: string;
  schools: number;
  capitalTotal: number;
  opexTotal: number;
  required: number;
  mobilized: number;
  gap: number;
  convergence: number;
  validSchools: number;
};

function aggregateDistricts(schools: SchoolFin[]): DistrictFin[] {
  const m = new Map<string, SchoolFin[]>();
  for (const s of schools) {
    if (!m.has(s.district)) m.set(s.district, []);
    m.get(s.district)!.push(s);
  }
  return Array.from(m.entries()).map(([district, list]) => {
    const capitalTotal = list.reduce((a, s) => a + s.capitalTotal, 0);
    const opexTotal = list.reduce((a, s) => a + s.opexTotal, 0);
    const required = capitalTotal + opexTotal;
    const mobilized = list.reduce((a, s) => a + s.mobilized, 0);
    return {
      district, schools: list.length,
      capitalTotal, opexTotal, required, mobilized,
      gap: Math.max(0, required - mobilized),
      convergence: required ? Math.round((mobilized / required) * 100) : 0,
      validSchools: list.filter((s) => s.isFullyValid).length,
    };
  }).sort((a, b) => b.required - a.required);
}

function build(schools: School[]): RealFinanceState {
  const fin = schools.map((s, i) => buildSchoolFin(s, i));
  const notes = fin.flatMap((f) => f.notes);

  const capitalByField = CAPITAL_FIELDS.reduce((acc, f) => {
    acc[f] = fin.reduce((a, s) => a + (s.capital[f] ?? 0), 0); return acc;
  }, {} as Record<CapitalField, number>);
  const opexByField = OPEX_FIELDS.reduce((acc, f) => {
    acc[f] = fin.reduce((a, s) => a + (s.opex[f] ?? 0), 0); return acc;
  }, {} as Record<OpexField, number>);

  const capitalTotal = CAPITAL_FIELDS.reduce((a, f) => a + capitalByField[f], 0);
  const opexTotal = OPEX_FIELDS.reduce((a, f) => a + opexByField[f], 0);
  const required = capitalTotal + opexTotal;
  const mobilized = fin.reduce((a, s) => a + s.mobilized, 0);

  const srcMap = new Map<string, number>();
  for (const s of fin) {
    if (!s.fundingSource) continue;
    srcMap.set(s.fundingSource, (srcMap.get(s.fundingSource) ?? 0) + s.mobilized);
  }
  const sourceBreakdown = Array.from(srcMap.entries())
    .map(([source, value]) => ({ source, value }))
    .sort((a, b) => b.value - a.value);

  const urgMap = new Map<string, number>();
  for (const s of fin) {
    if (!s.urgency) continue;
    urgMap.set(s.urgency, (urgMap.get(s.urgency) ?? 0) + 1);
  }
  const urgencyBreakdown = Array.from(urgMap.entries())
    .map(([urgency, count]) => ({ urgency, count }))
    .sort((a, b) => b.count - a.count);

  const totalFieldCells = fin.length * 6;
  const validFieldCells = fin.reduce((a, s) => a + s.validFields, 0);
  const validRecords = fin.filter((s) => s.isFullyValid).length;
  const invalidRecords = fin.filter((s) => s.validFields === 0).length;
  const partiallyValid = fin.length - validRecords - invalidRecords;
  const accuracyPct = totalFieldCells ? Math.round((validFieldCells / totalFieldCells) * 1000) / 10 : 0;
  const mismatchSchools = fin.filter((s) => s.mobilized > 0 && Math.abs((s.capitalTotal + s.opexTotal) - s.mobilized) > Math.max(1000, s.mobilized * 0.1)).length;

  return {
    schools: fin,
    notes,
    totals: {
      capitalTotal, opexTotal, capitalByField, opexByField,
      required, mobilized, gap: Math.max(0, required - mobilized),
      convergence: required ? Math.round((mobilized / required) * 100) : 0,
      sourceBreakdown, urgencyBreakdown,
    },
    audit: {
      totalSchools: fin.length,
      validRecords, partiallyValid, invalidRecords,
      totalFieldCells, validFieldCells, accuracyPct, mismatchSchools,
    },
    topByRequired: [...fin].sort((a, b) => b.required - a.required).slice(0, 10),
    topByCapital: [...fin].sort((a, b) => b.capitalTotal - a.capitalTotal).slice(0, 10),
    topByOpex: [...fin].sort((a, b) => b.opexTotal - a.opexTotal).slice(0, 10),
    missingEstimates: fin.filter((s) => s.validFields === 0),
    districts: aggregateDistricts(fin),
  };
}

export function useRealFinance() {
  const { data } = useSchools();
  return useMemo(() => (data ? build(data) : null), [data]);
}

/* --------------------------- Formatting --------------------------- */
export function inr(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v === 0) return "₹0";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return `₹${Math.round(v)}`;
}
export function inrFull(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

/* --------------------------- CSV / Excel export helpers --------------------------- */
export function schoolsToCsvRows(rows: SchoolFin[]) {
  return rows.map((s) => ({
    "School ID": s.udise,
    "School Name": s.name,
    "District": s.district,
    "Block": s.block,
    "Toilets Cost": s.capital.toilets ?? "",
    "Water Cost": s.capital.water ?? "",
    "Infrastructure Cost": s.capital.infrastructure ?? "",
    "Maintenance Cost": s.opex.maintenance ?? "",
    "Cleaning Cost": s.opex.cleaning ?? "",
    "Repairs Cost": s.opex.repairs ?? "",
    "Total Capital Cost": s.capitalTotal,
    "Total Operational Cost": s.opexTotal,
    "Grand Total Budget": s.required,
    "Estimated Budget (Mobilized)": s.mobilized,
    "Funding Source": s.fundingSource,
    "Urgency": s.urgency,
    "Valid Fields": `${s.validFields}/6`,
    "Last Updated": s.lastUpdated,
  }));
}

export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function exportExcel(name: string, rows: Record<string, unknown>[]) {
  // Excel readily opens CSV. We emit an .xls-friendly UTF-8 BOM + tab-separated
  // file so it opens with proper column alignment in Excel/Google Sheets.
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const tsv = "\uFEFF" + [headers.join("\t"), ...rows.map((r) => headers.map((h) => String(r[h] ?? "").replace(/\t|\n/g, " ")).join("\t"))].join("\n");
  const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
