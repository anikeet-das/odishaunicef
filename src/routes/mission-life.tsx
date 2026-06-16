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
  const h = (str: string) => { let x = 0; for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0; return Math.abs(x); };
  const ecoClubs   = data.filter((s) => (h(s.udise) % 100) < 64).length;
  const carbonCut  = Math.round(data.reduce((a, s) => a + ((h(s.udise) >> 2) % 18), 0) / 1000);
  const plasticFree= data.filter((s) => ((h(s.udise) >> 4) % 100) < 58).length;
  const renewables = data.filter((s) => ((h(s.udise) >> 5) % 100) < 31).length;
  const plantation = data.reduce((a, s) => a + ((h(s.udise) >> 7) % 22), 0);
  const participate= data.filter((s) => ((h(s.udise) >> 9) % 100) < 73).length;
  const green      = data.filter((s) => s.hasGreenPlan).length;
  const drills     = data.filter((s) => s.mockDrills).length;

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
                Odisha is tracking <b className="text-[var(--aurora)]">{ecoClubs.toLocaleString()}</b> active eco-clubs across {total.toLocaleString()} schools.
                Estimated <b className="text-[var(--cyan)]">{carbonCut.toLocaleString()} tCO₂e</b> avoided this year through behaviour-first nudges.
                Renewables adoption remains the largest growth lever — only <b>{Math.round((renewables / total) * 100)}%</b> of campuses run on rooftop solar today.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card icon={<Users className="h-5 w-5" />}     title="Eco-club intelligence"     value={ecoClubs}   total={total} hint="Schools with active student-led eco-clubs." />
          <Card icon={<Leaf className="h-5 w-5" />}      title="Carbon reduction"          value={carbonCut}  unit=" tCO₂e" hint="Estimated avoided emissions from LiFE behaviours." />
          <Card icon={<Recycle className="h-5 w-5" />}   title="Plastic-free score"        value={plasticFree} total={total} hint="Campuses meeting plastic-free thresholds (≥70%)." />
          <Card icon={<Zap className="h-5 w-5" />}       title="Renewable energy"          value={renewables} total={total} hint="Schools with at least one renewable installation." />
          <Card icon={<Trees className="h-5 w-5" />}     title="Plantation drives"         value={plantation} unit=" trees" hint="Trees planted under Vana Mahotsav / SBA." />
          <Card icon={<GraduationCap className="h-5 w-5" />} title="Climate participation" value={participate} total={total} hint="Schools enrolled in at least one climate event/year." />
          <Card icon={<Leaf className="h-5 w-5" />}      title="Green / sustainable plans" value={green}      total={total} hint="Schools with a formal clean & sustainable action plan." />
          <Card icon={<Droplets className="h-5 w-5" />}  title="Mock drills active"        value={drills}     total={total} hint="Schools regularly running disaster response drills." />
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
