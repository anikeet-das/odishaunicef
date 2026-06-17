/**
 * Central permission + capability matrix for every top-level route.
 * Topbar reads this automatically — individual route files don't need
 * to repeat upload/view-toggle wiring.
 */
export type TabConfig = {
  /** Display name shown on the upload modal. Omit to disable Upload Data button. */
  upload?: { tab: string; cols: string[] };
  /** When false, the Macro/Micro toggle is shown as "Not Applicable". */
  view: boolean;
};

export const TAB_CONFIG: Record<string, TabConfig> = {
  "/": { view: false },

  // Intelligence
  "/map": { view: true },
  "/districts": {
    upload: { tab: "District Intelligence", cols: ["District", "Schools", "Students", "SHVR", "Sustainability", "WASH", "ClimateRisk", "CRSAP"] },
    view: true,
  },
  "/schools": {
    upload: { tab: "School Explorer", cols: ["UDISE", "School_Name", "District", "Students", "SHVR", "Sustainability", "WASH", "TopHazard"] },
    view: true,
  },

  // Analytics
  "/sustainability": {
    upload: { tab: "Sustainability Index", cols: ["UDISE", "District", "SustainabilityScore", "GreenPlan", "CRSAP"] },
    view: true,
  },
  "/risk": {
    upload: { tab: "Risk Analytics", cols: ["District", "Hazard", "Severity", "SchoolsExposed"] },
    view: true,
  },
  "/shvr": {
    upload: { tab: "SHVR Ratings", cols: ["UDISE", "School_Name", "District", "SHVR_Stars", "AcademicYear"] },
    view: true,
  },
  "/wash": {
    upload: { tab: "WASH Board", cols: ["UDISE", "District", "Water", "Sanitation", "Hygiene"] },
    view: true,
  },
  "/alerts": { view: true },
  // Finance pages: upload disabled — all financial data flows through the manual Fund Ledger
  "/finance": { view: true },
  "/finance-sum": { view: true },
  "/compare": { view: false },
  "/tech": { view: true },

  // AI Systems
  "/ai-recommendations": { view: false },
  "/simulation": { view: false },
  "/personalize": { view: false },
  "/truth-check": { view: false },

  // Mission
  "/mission-life": { view: false },
  "/resources": { view: false },
  "/reports": { view: false },

  // Evaluation
  "/scorecard": { view: true },
  "/feedback": { view: false },

  // System
  "/google-form": { view: false },
  "/theme": { view: false },
  "/settings": { view: false },
  "/admin": { view: false },
};

export function tabFor(path: string): TabConfig {
  // exact match first, then prefix
  if (TAB_CONFIG[path]) return TAB_CONFIG[path];
  const key = Object.keys(TAB_CONFIG).find((k) => k !== "/" && path.startsWith(k));
  return key ? TAB_CONFIG[key] : { view: false };
}