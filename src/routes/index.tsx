import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, platformKpis, hazardBreakdown, aggregateByDistrict } from "@/lib/data/cces";
import { useSettings } from "@/components/layout/settings-provider";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Activity, Droplets, Leaf, ShieldAlert, School as SchoolIcon, Star } from "lucide-react";
import unicefLogo from "@/assets/unicef-logo.png";
import { AwaitingData } from "@/components/data/AwaitingData";

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
  const hz = hazardBreakdown(schools).slice(0, 8);
  const districts = aggregateByDistrict(schools).sort((a, b) => b.avgSust - a.avgSust);
  const topD = districts.slice(0, 5);
  const bottomD = [...districts].sort((a, b) => a.avgSust - b.avgSust).slice(0, 5);

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

        <div className="grid lg:grid-cols-3 gap-3">
          {/* Hazards */}
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold">Top climate hazards exposing schools</h3>
              <Link to="/risk" className="text-xs text-accent hover:underline">Open Risk Analytics →</Link>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={hz}>
                  <XAxis dataKey="hazard" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="exposed" radius={[6, 6, 0, 0]}>
                    {hz.map((_, i) => <Cell key={i} fill={`oklch(0.78 0.18 ${(220 + i * 18) % 360})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plans adoption */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Plan adoption</h3>
            <Stat label="CR-SAP plans" pct={kpi.crsapPct} />
            <Stat label="Green / Sustainable plan" pct={kpi.greenPct} />
            <Stat label="School Disaster Mgmt Plan" pct={kpi.sdmpPct} />
            <Stat label="Regular mock drills" pct={kpi.drillsPct} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <DistrictBoard title="Top 5 sustainable districts" data={topD} positive />
          <DistrictBoard title="Bottom 5 — need urgent intervention" data={bottomD} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-aurora)" }} />
      </div>
    </div>
  );
}

function DistrictBoard({ title, data, positive }: { title: string; data: ReturnType<typeof aggregateByDistrict>; positive?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <Link to="/districts" key={d.districtId} className="flex items-center justify-between glass-soft rounded-xl px-4 py-3 hover:neon-ring transition">
            <div>
              <div className="font-medium">{d.district}</div>
              <div className="text-[11px] text-muted-foreground">{d.schools} schools · {d.students.toLocaleString()} students · top hazard: {d.topHazard ?? "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums" style={{ color: positive ? "oklch(0.84 0.2 155)" : "oklch(0.78 0.2 30)" }}>{d.avgSust}%</div>
              <div className="text-[11px] text-muted-foreground">★ {d.avgShvr.toFixed(2)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
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
