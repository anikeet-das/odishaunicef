import type { School } from "@/lib/data/cces";

export type ParamScore = {
  key: string;
  label: string;
  full: number;
  obtained: number;
  pct: number;
  available: boolean;
  evaluation: string;
  weightInTotal: number;
};

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function evalText(pct: number, kind: string) {
  if (pct >= 85) return `Outstanding ${kind} performance — sustain practice.`;
  if (pct >= 70) return `Strong ${kind} baseline — minor gaps to close.`;
  if (pct >= 50) return `Moderate ${kind} readiness — targeted action needed.`;
  if (pct >= 30) return `Weak ${kind} performance — operational review required.`;
  return `Critical ${kind} gap — immediate UNICEF intervention recommended.`;
}

export function computeScorecard(s: School): { params: ParamScore[]; total: number; rating: number } {
  const section = (key: keyof School["sectionScores"]) => s.sectionScores[key];
  const averageSection = (keys: Array<keyof School["sectionScores"]>) => {
    const values = keys.map(section).filter((value): value is number => value !== null);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  };
  const riskReadiness = s.hazardScore === null ? null : 100 - s.hazardScore;
  const specs: Array<Omit<ParamScore, "evaluation" | "pct" | "obtained"> & { score: number }> = [
    { key: "wash", label: "WASH", full: 10, score: s.washScore, available: [section("water"), section("sanitation"), section("hygiene")].some((v) => v !== null), weightInTotal: 10 },
    { key: "sustainability", label: "Sustainability", full: 10, score: s.sustainabilityScore, available: ["waste", "operations", "energy", "environment", "behaviour"].some((key) => section(key as keyof School["sectionScores"]) !== null), weightInTotal: 10 },
    { key: "shvr", label: "SHVR", full: 10, score: s.shvr * 20, available: s.shvrAvailable, weightInTotal: 10 },
    { key: "risk", label: "Risk Analytics", full: 10, score: riskReadiness ?? 0, available: riskReadiness !== null, weightInTotal: 10 },
    { key: "climate", label: "Climate Management", full: 10, score: section("risk") ?? 0, available: section("risk") !== null, weightInTotal: 10 },
    { key: "education", label: "Education", full: 5, score: section("behaviour") ?? 0, available: section("behaviour") !== null, weightInTotal: 5 },
    { key: "management", label: "Management", full: 5, score: section("operations") ?? 0, available: section("operations") !== null, weightInTotal: 5 },
    { key: "tech", label: "Technology", full: 5, score: section("energy") ?? 0, available: section("energy") !== null, weightInTotal: 5 },
    { key: "env", label: "Environmental Performance", full: 10, score: averageSection(["environment", "waste"]), available: [section("environment"), section("waste")].some((v) => v !== null), weightInTotal: 10 },
    { key: "hygiene", label: "Hygiene Readiness", full: 5, score: section("hygiene") ?? 0, available: section("hygiene") !== null, weightInTotal: 5 },
    { key: "operational", label: "Operational Maintenance", full: 5, score: section("operations") ?? 0, available: section("operations") !== null, weightInTotal: 5 },
    { key: "behavioural", label: "Behavioural Sustainability", full: 5, score: section("behaviour") ?? 0, available: section("behaviour") !== null, weightInTotal: 5 },
    { key: "innovation", label: "Innovation", full: 5, score: section("risk") ?? 0, available: section("risk") !== null, weightInTotal: 5 },
    { key: "infra", label: "Infrastructure Readiness", full: 5, score: averageSection(["water", "sanitation"]), available: [section("water"), section("sanitation")].some((v) => v !== null), weightInTotal: 5 },
  ];
  const params = specs.map(({ score, ...p }) => {
    const pct = p.available ? Math.round(clamp(score)) : 0;
    return { ...p, obtained: p.available ? Math.round((pct / 100) * p.full) : 0, pct, evaluation: p.available ? evalText(pct, p.label.toLowerCase()) : "No source response is available for this measure." };
  });
  const availableWeight = params.reduce((sum, p) => sum + (p.available ? p.weightInTotal : 0), 0);
  const weighted = params.reduce((sum, p) => sum + (p.available ? p.pct * p.weightInTotal : 0), 0);
  const total = availableWeight ? Math.round(weighted / availableWeight) : 0;
  const rating = total >= 85 ? 5 : total >= 70 ? 4 : total >= 55 ? 3 : total >= 40 ? 2 : total >= 25 ? 1 : 0;
  return { params, total, rating };
}

const KEY = "crsap.unicef.comments.v1";
export function loadComments(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveComment(udise: string, comment: string) {
  const all = loadComments();
  if (comment.trim()) all[udise] = comment; else delete all[udise];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function washTriad(s: School) {
  const water = s.sectionScores.water !== null && s.sectionScores.water >= 50 ? 1 : 0;
  const sanitation = s.sectionScores.sanitation !== null && s.sectionScores.sanitation >= 50 ? 1 : 0;
  const hygiene = s.sectionScores.hygiene !== null && s.sectionScores.hygiene >= 50 ? 1 : 0;
  return { water, sanitation, hygiene, total: water + sanitation + hygiene };
}
