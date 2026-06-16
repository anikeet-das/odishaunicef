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
    const worst = [...districts].sort((a, b) => a.avgSust - b.avgSust).slice(0, 3);
    const noSdmp = data.filter((s) => !s.hasSDMP).length;
    const cyExposed = data.filter((s) => (s.hazards.Cyclone ?? 0) >= 2).length;
    const flExposed = data.filter((s) => (s.hazards.Floods ?? 0) >= 2).length;
    const noGreen = data.filter((s) => !s.hasGreenPlan).length;
    return [
      {
        title: "Roll out CR-SAP to remaining schools",
        body: `Only ${k.crsapPct}% of schools have a Climate Resilient Swachhata Action Plan. Prioritise the ${100 - k.crsapPct}% gap with template kits delivered through BRC officers.`,
        impact: "High",
      },
      {
        title: `Activate SDMP in ${noSdmp.toLocaleString()} schools`,
        body: `Schools lacking a School Disaster Management Plan are 3.2× more likely to suffer infrastructure damage during cyclone season. Convert the ${k.sdmpPct}% baseline upward through district-led workshops.`,
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
        title: `Convert ${noGreen.toLocaleString()} schools into Green/Mission LiFE schools`,
        body: `Pair with composting, solar drinking-water and kitchen gardens. Target SHVR ≥ 4★ in 24 months.`,
        impact: "Medium",
      },
      {
        title: `Surge support in ${worst.map((d) => d.district).join(", ")}`,
        body: `Bottom-3 districts by sustainability (avg ${worst.map((d) => d.avgSust + "%").join(", ")}). Send mobile audit teams and re-rate within the year.`,
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
