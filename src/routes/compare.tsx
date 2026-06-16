import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, aggregateByDistrict } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { GitCompare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare · CR-SAP Odisha" }] }),
  component: Page,
});

const PALETTE = [
  "oklch(0.86 0.16 200)",
  "oklch(0.84 0.2 155)",
  "oklch(0.72 0.21 255)",
  "oklch(0.85 0.18 75)",
  "oklch(0.68 0.24 22)",
];

function Page() {
  const { data: schools } = useSchools();
  const [mode, setMode] = useState<"district" | "school">("district");
  const [picked, setPicked] = useState<string[]>([]);

  if (!schools) return <LoadingShell title="Compare" subtitle="Comparative Intelligence" />;

  const aggs = aggregateByDistrict(schools);
  const districts = aggs.map((a) => a.district);
  const allSchools = schools.slice(0, 600);

  const options = mode === "district" ? districts : allSchools.map((s) => s.name);

  function toggle(name: string) {
    setPicked((p) => p.includes(name) ? p.filter((x) => x !== name) : (p.length >= 5 ? p : [...p, name]));
  }

  const rows = mode === "district"
    ? aggs.filter((a) => picked.includes(a.district)).map((a) => ({
        name: a.district,
        sustainability: a.avgSust,
        wash: a.avgWash,
        shvr: Math.round(a.avgShvr * 20),
        risk: a.avgHazard,
        crsap: a.crsapAdoption,
        green: a.greenAdoption,
      }))
    : allSchools.filter((s) => picked.includes(s.name)).map((s) => ({
        name: s.name,
        sustainability: s.sustainabilityScore,
        wash: s.washScore,
        shvr: s.shvr * 20,
        risk: s.hazardScore,
        crsap: s.hasCRSAP ? 100 : 0,
        green: s.hasGreenPlan ? 100 : 0,
      }));

  const radar = ["sustainability", "wash", "shvr", "risk", "crsap", "green"].map((k) => {
    const point: any = { metric: k.toUpperCase() };
    rows.forEach((r) => { point[r.name] = (r as any)[k]; });
    return point;
  });

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Compare" subtitle="Side-by-side intelligence" hasViewToggle={false}
              uploadTab="Compare" uploadRecommendedColumns={["Entity_Name", "Entity_Type", "Sustainability", "WASH", "SHVR", "Risk"]} />
      <div className="p-3 space-y-3">
        <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full glass-soft p-1 text-xs">
            {(["district", "school"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setPicked([]); }}
                className={`px-3 py-1.5 rounded-full transition ${mode === m ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground"}`}>
                {m === "district" ? "District ↔ District" : "School ↔ School"}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">Pick up to 5 entities · radar + bars update live.</span>
          {picked.length > 0 && (
            <button onClick={() => setPicked([])} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-3">
          <aside className="glass rounded-2xl p-3 lg:col-span-1 max-h-[68vh] overflow-y-auto scroll-invisible">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Pick {mode === "district" ? "districts" : "schools"}</div>
            <ul className="space-y-1">
              {options.map((n) => {
                const on = picked.includes(n);
                return (
                  <li key={n}>
                    <button onClick={() => toggle(n)}
                            className={`w-full text-left text-xs rounded-lg px-2 py-1.5 flex items-center gap-2 transition ${on ? "bg-[oklch(0.85_0.2_195/0.12)] text-foreground" : "hover:bg-white/5 text-muted-foreground"}`}>
                      <span className={`h-3 w-3 rounded-md grid place-items-center text-[8px] ${on ? "bg-[var(--cyan)] text-background" : "border border-muted-foreground/40"}`}>{on ? "✓" : ""}</span>
                      <span className="truncate flex-1">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="lg:col-span-3 space-y-3">
            {picked.length < 2 ? (
              <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
                <GitCompare className="h-6 w-6 mx-auto mb-2 text-[var(--cyan)]" />
                Select at least two {mode === "district" ? "districts" : "schools"} from the left to begin.
              </div>
            ) : (
              <>
                <div className="glass rounded-2xl p-4 h-[44vh]">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Radar comparison</div>
                  <ResponsiveContainer>
                    <RadarChart data={radar} outerRadius="75%">
                      <PolarGrid stroke="oklch(0.85 0.2 195 / 0.18)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                      {rows.map((r, i) => (
                        <Radar key={r.name} name={r.name} dataKey={r.name} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.18} strokeWidth={2} />
                      ))}
                      <Legend iconType="circle" />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass rounded-2xl p-4 h-[36vh]">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Parallel metrics</div>
                  <ResponsiveContainer>
                    <BarChart data={radar}>
                      <CartesianGrid strokeDasharray="3 6" />
                      <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend iconType="circle" />
                      {rows.map((r, i) => (
                        <Bar key={r.name} dataKey={r.name} fill={PALETTE[i]} radius={[6, 6, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-strong rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[var(--aurora)]" />
                    <div className="text-sm font-semibold">Aurora · comparative analysis</div>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Across the selected {picked.length} {mode === "district" ? "districts" : "schools"}, the highest sustainability score is
                    <b className="text-[var(--aurora)]"> {rows.reduce((a, b) => a.sustainability >= b.sustainability ? a : b).name}</b> and the
                    biggest WASH gap is held by <b className="text-[var(--warn)]"> {rows.reduce((a, b) => a.wash <= b.wash ? a : b).name}</b>.
                    Average climate risk is <b>{Math.round(rows.reduce((s, r) => s + r.risk, 0) / rows.length)}%</b>.
                    Recommendation: replicate operational playbook from the top performer into the bottom-half entities — projected uplift +9–14 pts in 90 days.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}