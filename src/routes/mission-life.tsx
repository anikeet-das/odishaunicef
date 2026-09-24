import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import {
  Leaf, Sparkles, Trees, Recycle, Zap, Droplets, GraduationCap, Users,
} from "lucide-react";

export const Route = createFileRoute("/mission-life")({
  head: () => ({ meta: [{ title: "Mission LiFE · CR-SAP Odisha" }, { name: "description", content: "Lifestyle for Environment — eco-clubs, carbon reduction, plastic-free, renewables." }] }),
  component: Page,
});

function Page() {
  const { data } = useSchools();
  if (!data) return <LoadingShell title="Mission LiFE" subtitle="Lifestyle for Environment" />;
  const total = data.length;
  const sectionAverage = (key: "waste" | "operations" | "energy" | "environment" | "behaviour") => {
    const values = data.map((s) => s.sectionScores[key]).filter((v): v is number => v !== null);
    return values.length ? Math.round(values.reduce((a, v) => a + v, 0) / values.length) : null;
  };
  const environment = sectionAverage("environment");
  const waste = sectionAverage("waste");
  const energy = sectionAverage("energy");
  const behaviour = sectionAverage("behaviour");
  const green = data.filter((s) => s.hasGreenPlan === true).length;
  const drills = data.filter((s) => s.mockDrills === true).length;

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Mission LiFE" subtitle="Lifestyle for Environment · Adoption Intelligence"
              uploadTab="Mission LiFE" uploadRecommendedColumns={["School_Name", "Eco_Club_Yes_No", "Carbon_kgCO2", "Plastic_Free", "Solar_kW", "Trees_Planted"]} />
      <div className="p-3 space-y-3">
        {/* AI synthesis */}
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-full"
                 style={{ background: "var(--gradient-aurora)" }}>
              <Sparkles className="h-5 w-5 text-background" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Aurora · Mission LiFE Synthesis</div>
              <p className="text-sm mt-1 leading-relaxed">
                The live form currently provides environmental readiness scores for <b className="text-[var(--aurora)]">{total.toLocaleString()}</b> schools.
                Environmental section coverage is <b className="text-[var(--cyan)]">{environment === null ? "NA" : `${environment}%`}</b>; no carbon, plantation, solar, or eco-club totals are inferred without source fields.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card icon={<Recycle className="h-5 w-5" />} title="Waste management" value={waste ?? 0} total={waste === null ? undefined : 100} hint="Live score from the form’s Waste Management section." />
          <Card icon={<Leaf className="h-5 w-5" />} title="Environment" value={environment ?? 0} total={environment === null ? undefined : 100} hint="Live score from the form’s Environment section." />
          <Card icon={<Zap className="h-5 w-5" />} title="Energy" value={energy ?? 0} total={energy === null ? undefined : 100} hint="Live score from the form’s Energy section." />
          <Card icon={<GraduationCap className="h-5 w-5" />} title="Behaviour change" value={behaviour ?? 0} total={behaviour === null ? undefined : 100} hint="Live score from the form’s Behaviour section." />
          <Card icon={<Leaf className="h-5 w-5" />}      title="Green / sustainable plans" value={green} total={total} hint="Schools with a formal clean & sustainable action plan." />
          <Card icon={<Droplets className="h-5 w-5" />}  title="Mock drills reported"        value={drills}     total={total} hint="Schools regularly running disaster response drills." />
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, value, total, unit = "", hint }: { icon: React.ReactNode; title: string; value: number; total?: number; unit?: string; hint: string }) {
  const pct = total ? Math.round((value / total) * 100) : null;
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-25"
           style={{ background: "var(--gradient-aurora)", filter: "blur(18px)" }} />
      <div className="flex items-center gap-3 mb-2 relative">
        <div className="h-9 w-9 grid place-items-center rounded-xl text-background" style={{ background: "var(--gradient-aurora)" }}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">{title}</div>
          <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}{unit}</div>
        </div>
      </div>
      {pct !== null && (
        <>
          <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden mb-1.5">
            <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-aurora)" }} />
          </div>
          <div className="text-[10px] text-muted-foreground">{pct}% of {total!.toLocaleString()} · {hint}</div>
        </>
      )}
      {pct === null && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
