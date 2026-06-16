import type { School } from "@/lib/data/cces";
import { aggregateByDistrict, hazardBreakdown, platformKpis, shvrDistribution } from "@/lib/data/cces";

/**
 * Build a compact JSON snapshot of the platform that the AI can ground answers in.
 * Kept small (~5–10KB) so it always fits the gateway prompt window.
 */
export function buildAIContext(schools: School[] | undefined) {
  if (!schools?.length) return { ready: false };
  const kpis = platformKpis(schools);
  const dist = aggregateByDistrict(schools)
    .map((d) => ({
      district: d.district,
      schools: d.schools,
      students: d.students,
      avgShvr: d.avgShvr,
      sustainability: d.avgSust,
      wash: d.avgWash,
      hazard: d.avgHazard,
      crsapAdoptionPct: d.crsapAdoption,
      greenAdoptionPct: d.greenAdoption,
      topHazard: d.topHazard,
    }))
    .sort((a, b) => b.sustainability - a.sustainability);
  return {
    ready: true,
    state: "Odisha",
    totals: kpis,
    hazards: hazardBreakdown(schools).slice(0, 13),
    shvrDistribution: shvrDistribution(schools),
    topDistricts: dist.slice(0, 8),
    bottomDistricts: dist.slice(-8).reverse(),
    allDistricts: dist,
  };
}
