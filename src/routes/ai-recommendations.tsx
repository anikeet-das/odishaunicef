import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, aggregateByDistrict, platformKpis } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai-recommendations")({
  head: () => ({ meta: [{ title: "AI Recommendations · CR-SAP Odisha" }, { name: "description", content: "Data-driven actionable recommendations generated live from CCES responses." }] }),
  component: Page,
});

export function AiRecommendationsBody() {
  const { data } = useSchools();
  const recs = useMemo(() => {
    if (!data) return [];
    const k = platformKpis(data);
    const districts = aggregateByDistrict(data);
    const worst = districts.filter((d) => d.schools > 0).sort((a, b) => a.avgSust - b.avgSust).slice(0, 3);
    const knownSdmp = data.filter((s) => s.hasSDMP !== null);
    const noSdmp = knownSdmp.filter((s) => s.hasSDMP === false).length;
    const cyExposed = data.filter((s) => (s.hazards.Cyclone ?? 0) >= 2).length;
    const flExposed = data.filter((s) => (s.hazards.Floods ?? 0) >= 2).length;
    const knownGreen = data.filter((s) => s.hasGreenPlan !== null);
    const noGreen = knownGreen.filter((s) => s.hasGreenPlan === false).length;
    return [
      {
        title: "Complete CR-SAP plan coverage",
        body: k.crsapPct === 0
          ? "The connected form does not contain a distinct CR-SAP plan-adoption field, so coverage cannot be calculated from this source."
          : `The source records report ${k.crsapPct}% plan coverage. Prioritise schools without a recorded plan through BRC follow-up.`,
        impact: "High",
      },
      {
        title: knownSdmp.length ? `Follow up SDMP gaps in ${noSdmp.toLocaleString()} schools` : "Collect SDMP responses",
        body: knownSdmp.length
          ? `${noSdmp.toLocaleString()} schools have an explicit negative SDMP response. Use district-led workshops to close this recorded gap.`
          : "SDMP responses are not available in the connected records yet; collect the field before ranking schools.",
        impact: "High",
      },
      {
        title: `Pre-position relief for ${cyExposed.toLocaleString()} cyclone-exposed schools`,
        body: `These schools report ≥High cyclone probability. Stage WASH kits + early-warning SMS triggers before Nov–Dec landfall window.`,
        impact: cyExposed > 1000 ? "Critical" : "Medium",
      },
      {
        title: `Flood-proof ${flExposed.toLocaleString()} schools`,
        body: `Raise drinking-water points above flood level and add elevated toilet platforms. Combine with monsoon-readiness drills.`,
        impact: "High",
      },
      {
        title: knownGreen.length ? `Follow up green-plan gaps in ${noGreen.toLocaleString()} schools` : "Collect green-plan responses",
        body: knownGreen.length
          ? `${noGreen.toLocaleString()} schools have an explicit negative green-plan response. Verify the action plan status with the school authority.`
          : "Green-plan responses are not available in the connected records yet; collect the field before ranking schools.",
        impact: "Medium",
      },
      {
        title: worst.length ? `Surge support in ${worst.map((d) => d.district).join(", ")}` : "Collect district responses",
        body: worst.length ? `Lowest observed sustainability scores are ${worst.map((d) => `${d.district} ${d.avgSust}%`).join(", ")}. Verify the underlying section responses before assigning support.` : "No district records are available for a ranked recommendation.",
        impact: "Critical",
      },
    ];
  }, [data]);

  if (!data) return <div className="p-3"><div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading recommendations…</div></div>;
  if (data.length === 0) return <AwaitingData />;

  return (
    <div className="p-3 grid lg:grid-cols-2 gap-3">
      {recs.map((r, i) => (
        <div key={i} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recommendation #{i + 1}</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: r.impact === "Critical" ? "oklch(0.78 0.22 25 / 0.25)" : r.impact === "High" ? "oklch(0.84 0.2 50 / 0.25)" : "oklch(0.84 0.2 155 / 0.25)" }}>{r.impact}</span>
          </div>
          <h3 className="font-semibold">{r.title}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.body}</p>
        </div>
      ))}
    </div>
  );
}

function Page() {
  const { data } = useSchools();
  if (!data) return <LoadingShell title="AI Recommendations" subtitle="Generated Live" />;
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="AI Recommendations" subtitle="Action Engine" />
      <AiRecommendationsBody />
    </div>
  );
}
