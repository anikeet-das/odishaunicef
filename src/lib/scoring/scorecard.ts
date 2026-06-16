import type { School } from "@/lib/data/cces";

export type ParamScore = {
  key: string;
  label: string;
  full: number;
  obtained: number;
  pct: number;
  evaluation: string;
  weightInTotal: number; // contribution to /100
};

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function evalText(pct: number, kind: string) {
  if (pct >= 85) return `Outstanding ${kind} performance — sustain practice.`;
  if (pct >= 70) return `Strong ${kind} baseline — minor gaps to close.`;
  if (pct >= 50) return `Moderate ${kind} readiness — targeted action needed.`;
  if (pct >= 30) return `Weak ${kind} performance — operational review required.`;
  return `Critical ${kind} gap — immediate UNICEF intervention recommended.`;
}

/** Deterministic pseudo-jitter so synthetic categories are stable per school. */
function det(seed: string, n: number, lo: number, hi: number) {
  let h = 2166136261 >>> 0;
  const s = `${seed}:${n}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = ((h >>> 0) % 10000) / 10000;
  return lo + r * (hi - lo);
}

export function computeScorecard(s: School): { params: ParamScore[]; total: number; rating: number } {
  const seed = s.udise;
  const hazardInv = 100 - s.hazardScore;
  const hygiene = clamp(s.washScore + det(seed, 1, -8, 8));
  const climateMgmt = clamp((s.hasCRSAP ? 70 : 30) + (s.hasSDMP ? 10 : 0) + (s.mockDrills ? 10 : 0) + det(seed, 2, -5, 10));
  const education = clamp(60 + det(seed, 3, -15, 30));
  const management = clamp((s.hasGreenPlan ? 65 : 40) + (s.hasSAP ? 15 : 0) + det(seed, 4, -8, 15));
  const tech = clamp(45 + det(seed, 5, -10, 40));
  const env = clamp(s.sustainabilityScore + det(seed, 6, -6, 8));
  const operational = clamp(s.sustainabilityScore * 0.6 + (s.hasSDMP ? 25 : 10) + det(seed, 7, -5, 12));
  const behavioural = clamp(50 + det(seed, 8, -15, 35));
  const innovation = clamp(40 + det(seed, 9, -15, 45));
  const infra = clamp((s.washScore * 0.5) + 30 + det(seed, 10, -8, 18));

  const params: Omit<ParamScore, "evaluation" | "pct">[] = [
    { key: "wash",          label: "WASH",                       full: 10, obtained: round(s.washScore / 10),         weightInTotal: 10 },
    { key: "sustainability",label: "Sustainability",             full: 10, obtained: round(s.sustainabilityScore / 10), weightInTotal: 10 },
    { key: "shvr",          label: "SHVR",                       full: 10, obtained: round(s.shvr * 2),                weightInTotal: 10 },
    { key: "risk",          label: "Risk Analytics",             full: 10, obtained: round(hazardInv / 10),            weightInTotal: 10 },
    { key: "climate",       label: "Climate Management",         full: 10, obtained: round(climateMgmt / 10),          weightInTotal: 10 },
    { key: "education",     label: "Education",                  full: 5,  obtained: round(education / 20),            weightInTotal: 5  },
    { key: "management",    label: "Management",                 full: 5,  obtained: round(management / 20),           weightInTotal: 5  },
    { key: "tech",          label: "Technology",                 full: 5,  obtained: round(tech / 20),                 weightInTotal: 5  },
    { key: "env",           label: "Environmental Performance",  full: 10, obtained: round(env / 10),                  weightInTotal: 10 },
    { key: "hygiene",       label: "Hygiene Readiness",          full: 5,  obtained: round(hygiene / 20),              weightInTotal: 5  },
    { key: "operational",   label: "Operational Maintenance",    full: 5,  obtained: round(operational / 20),          weightInTotal: 5  },
    { key: "behavioural",   label: "Behavioural Sustainability", full: 5,  obtained: round(behavioural / 20),          weightInTotal: 5  },
    { key: "innovation",    label: "Innovation",                 full: 5,  obtained: round(innovation / 20),           weightInTotal: 5  },
    { key: "infra",         label: "Infrastructure Readiness",   full: 5,  obtained: round(infra / 20),                weightInTotal: 5  },
  ];

  const full = params.map((p) => {
    const pct = Math.round((p.obtained / p.full) * 100);
    return { ...p, pct, evaluation: evalText(pct, p.label.toLowerCase()) };
  });
  const total = Math.round(full.reduce((a, p) => a + p.pct * (p.weightInTotal / 100), 0));
  const rating = total >= 85 ? 5 : total >= 70 ? 4 : total >= 55 ? 3 : total >= 40 ? 2 : total >= 25 ? 1 : 0;
  return { params: full, total, rating };
}

function round(n: number) { return Math.max(0, Math.min(999, Math.round(n))); }

const KEY = "crsap.unicef.comments.v1";
export function loadComments(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveComment(udise: string, comment: string) {
  const all = loadComments();
  if (comment.trim()) all[udise] = comment; else delete all[udise];
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** Compute WASH 0/1 booleans from a School. */
export function washTriad(s: School) {
  const water = s.washScore >= 50 ? 1 : 0;
  const sanitation = s.sustainabilityScore >= 45 ? 1 : 0;
  const hygiene = (s.washScore >= 45 ? 1 : 0);
  const total = water + sanitation + hygiene;
  return { water, sanitation, hygiene, total };
}