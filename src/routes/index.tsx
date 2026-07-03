import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, platformKpis, shvrDistribution, type School } from "@/lib/data/cces";
import { useSettings } from "@/components/layout/settings-provider";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { Activity, Droplets, Leaf, ShieldAlert, School as SchoolIcon, Star } from "lucide-react";
import unicefLogo from "@/assets/unicef-logo.png";
import { AwaitingData } from "@/components/data/AwaitingData";
import { KeyDistrictsPanel } from "@/components/cr-sap/KeyDistrictsPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · CR-SAP Odisha" },
      { name: "description", content: "Live AI command center for 10,000 climate-resilient sustainable schools across Odisha." },
    ],
  }),
  component: Index,
});

function KPI({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4 flex items-center gap-4 hover:neon-ring transition">
      <div className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: accent ?? "var(--gradient-aurora)" }}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Index() {
  const { data: schools, isLoading, refetch } = useSchools();
  const { settings } = useSettings();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), settings.liveRefreshSec * 1000);
    return () => clearInterval(id);
  }, [settings.liveRefreshSec]);

  if (isLoading || !schools) return <Loading />;

  if (schools.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Mission Control" subtitle="Overview" />
        <AwaitingData onRefresh={() => refetch()} />
      </div>
    );
  }

  const kpi = platformKpis(schools);
  const shvr = shvrDistribution(schools);
  const hyg = hygieneAnalytics(schools);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Mission Control" subtitle="Overview" />
      <div className="p-3 grid gap-3">
        {/* Hero KPI strip */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-5">
            <img src={unicefLogo} alt="UNICEF" className="h-10" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">CR-SAP Odisha · Live</div>
              <h2 className="text-2xl font-semibold neon-text">{kpi.total.toLocaleString()} Schools Intelligence Stream</h2>
            </div>
            <span className="ml-auto inline-flex items-center gap-2 text-xs glass-soft rounded-full px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.84_0.2_155)] pulse-dot" />
              tick #{tick} · every {settings.liveRefreshSec}s
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KPI icon={SchoolIcon} label="Schools" value={kpi.total.toLocaleString()} />
            <KPI icon={Activity} label="Students" value={kpi.students.toLocaleString()} />
            <KPI icon={Star}     label="Avg SHVR ★" value={kpi.avgShvr.toFixed(2)} />
            <KPI icon={Leaf}     label="Sustainability" value={`${kpi.avgSust}%`} />
            <KPI icon={Droplets} label="WASH Score"  value={`${kpi.avgWash}%`} />
            <KPI icon={ShieldAlert} label="Climate Risk" value={`${kpi.avgHazard}%`} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          {/* SHVR star rating distribution 2025-26 */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold">Star rating distribution · 2025-26 (SHVR)</h3>
              <Link to="/shvr" className="text-xs text-accent hover:underline">Open SHVR →</Link>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={shvr}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {shvr.map((_, i) => <Cell key={i} fill={`oklch(0.78 0.18 ${(40 + i * 35) % 360})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hygiene analytics */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold">Hygiene Analytics</h3>
              <Link to="/wash" className="text-xs text-accent hover:underline">Open WASH →</Link>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={hyg} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {hyg.map((_, i) => <Cell key={i} fill={`oklch(0.78 0.18 ${(180 + i * 40) % 360})`} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                    formatter={(v: number) => `${v}% of schools`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hygieneAnalytics(schools: School[]) {
  const n = schools.length || 1;
  const pct = (filter: (s: School) => boolean) => Math.round((schools.filter(filter).length / n) * 100);
  return [
    { name: "WASH ≥ 70%", value: pct((s) => s.washScore >= 70) },
    { name: "WASH 40-69%", value: pct((s) => s.washScore >= 40 && s.washScore < 70) },
    { name: "WASH < 40%", value: pct((s) => s.washScore < 40) },
  ];
}


function Loading() {
  return (
    <div className="p-6">
      <div className="glass rounded-2xl h-[60vh] grid place-items-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <div className="text-sm text-muted-foreground">Syncing live data from Google Form…</div>
        </div>
      </div>
    </div>
  );
}
