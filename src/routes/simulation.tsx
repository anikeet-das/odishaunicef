import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, platformKpis } from "@/lib/data/cces";


export const Route = createFileRoute("/simulation")({
  head: () => ({ meta: [{ title: "Simulation Lab · CR-SAP Odisha" }, { name: "description", content: "What-if simulator: roll out CR-SAP, SDMP and drills and watch the platform recompute." }] }),
  component: Page,
});

export function SimulationBody() {
  const { data } = useSchools();
  const [crsap, setCrsap] = useState(0);
  const [sdmp, setSdmp] = useState(0);
  const [drills, setDrills] = useState(0);

  const sim = useMemo(() => {
    if (!data) return null;
    const cloned = data.map((s, i) => {
      const seed = i / data.length * 100;
      const nCrsap = s.hasCRSAP === true || seed < crsap;
      const nSdmp  = s.hasSDMP === true || seed < sdmp;
      const nDrill = s.mockDrills === true || seed < drills;
      const bonus = (nCrsap ? 5 : 0) + (nSdmp ? 4 : 0) + (nDrill ? 3 : 0);
      return { ...s, hasCRSAP: nCrsap, hasSDMP: nSdmp, mockDrills: nDrill, sustainabilityScore: Math.min(100, s.sustainabilityScore + bonus), hazardScore: Math.max(0, (s.hazardScore ?? 0) - (nSdmp ? 6 : 0) - (nDrill ? 4 : 0)) };
    });
    return platformKpis(cloned);
  }, [data, crsap, sdmp, drills]);

  if (!data || !sim) return <div className="p-3"><div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading simulation…</div></div>;
  const base = platformKpis(data);

  return (
    <div className="p-3 grid lg:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold">Roll out interventions to additional % of schools</h3>
          <Slider label="CR-SAP plans"  v={crsap}  onChange={setCrsap} />
          <Slider label="SDMP plans"    v={sdmp}   onChange={setSdmp} />
          <Slider label="Mock drills"   v={drills} onChange={setDrills} />
          <button onClick={() => { setCrsap(0); setSdmp(0); setDrills(0); }} className="text-xs text-accent hover:underline">Reset</button>
        </div>
        <div className="glass rounded-2xl p-6 grid grid-cols-2 gap-3">
          <Delta label="Sustainability" base={base.avgSust} sim={sim.avgSust} suffix="%" />
          <Delta label="Climate risk"   base={base.avgHazard} sim={sim.avgHazard} suffix="%" invert />
          <Delta label="CR-SAP coverage" base={base.crsapPct} sim={sim.crsapPct} suffix="%" />
          <Delta label="SDMP coverage"   base={base.sdmpPct}  sim={sim.sdmpPct}  suffix="%" />
          <Delta label="Drill coverage"  base={base.drillsPct} sim={sim.drillsPct} suffix="%" />
          <Delta label="WASH score"      base={base.avgWash} sim={sim.avgWash} suffix="%" />
        </div>
      </div>
  );
}

function Page() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Simulation Lab" subtitle="What-If Engine" />
      <SimulationBody />
    </div>
  );
}

function Slider({ label, v, onChange }: { label: string; v: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5"><span>{label}</span><span className="tabular-nums">+{v}%</span></div>
      <input type="range" min={0} max={100} value={v} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
function Delta({ label, base, sim, suffix, invert }: { label: string; base: number; sim: number; suffix: string; invert?: boolean }) {
  const d = sim - base;
  const good = invert ? d < 0 : d > 0;
  return (
    <div className="glass-soft rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{sim}{suffix}</div>
      <div className="text-xs tabular-nums" style={{ color: d === 0 ? "var(--muted-foreground)" : good ? "oklch(0.84 0.2 155)" : "oklch(0.78 0.22 30)" }}>{d >= 0 ? "+" : ""}{d}{suffix} vs baseline {base}{suffix}</div>
    </div>
  );
}
