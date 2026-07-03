import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { useSchools, aggregateByDistrict, platformKpis } from "@/lib/data/cces";
import { washTriad } from "@/lib/scoring/scorecard";
import { AwaitingData } from "@/components/data/AwaitingData";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend,
} from "recharts";
import { Droplets, Sparkles, Search, Download, Filter, Loader2 } from "lucide-react";

export const Route = createFileRoute("/wash")({
  head: () => ({ meta: [{ title: "WASH Board · CR-SAP Odisha" }] }),
  component: Page,
});

const C = {
  cyan: "oklch(0.86 0.16 200)",
  blue: "oklch(0.72 0.21 255)",
  teal: "oklch(0.78 0.14 190)",
  violet: "oklch(0.72 0.18 290)",
  amber: "oklch(0.82 0.16 80)",
  rose:  "oklch(0.75 0.18 20)",
};

function Page() {
  return <ModuleShell title="WASH Board" subtitle="Water · Sanitation · Hygiene Intelligence" macro={<Macro />} micro={<Micro />} />;
}

/* -------------------- MACRO -------------------- */
function Macro() {
  const { data: schools, isLoading } = useSchools();
  const kpis = useMemo(() => (schools ? platformKpis(schools) : null), [schools]);
  const byDistrict = useMemo(() => (schools ? aggregateByDistrict(schools) : []), [schools]);

  const waterData = useMemo(() => byDistrict.filter((d) => d.schools > 0).slice(0, 10).map((d) => ({ name: d.district.slice(0, 10), wash: d.avgWash, sus: d.avgSust })), [byDistrict]);
  const waterDistricts = useMemo(() =>
    byDistrict.filter((d) => d.schools > 0).slice(0, 10).map((d) => ({ name: d.district.slice(0, 10), water: d.avgWash })),
    [byDistrict]);

  // Real sanitation readiness buckets, derived from each school's washScore.
  const donut = useMemo(() => {
    const list = schools ?? [];
    const functional = list.filter((s) => s.washScore >= 60).length;
    const partial = list.filter((s) => s.washScore >= 40 && s.washScore < 60).length;
    const deficient = list.filter((s) => s.washScore < 40).length;
    return [
      { name: "Functional", v: functional, fill: C.cyan },
      { name: "Partial", v: partial, fill: C.blue },
      { name: "Deficient", v: deficient, fill: C.rose },
    ];
  }, [schools]);

  // Real hygiene/readiness radar from live aggregates (all 0–100).
  const radar = useMemo(() => {
    const list = schools ?? [];
    const n = list.length || 1;
    const avg = (f: (s: typeof list[number]) => number) => Math.round(list.reduce((a, s) => a + f(s), 0) / n);
    return [
      { k: "Water", v: avg((s) => s.washScore) },
      { k: "Sanitation", v: avg((s) => (s.sustainabilityScore >= 45 ? 100 : 0)) },
      { k: "Hygiene", v: avg((s) => (s.washScore >= 45 ? 100 : 0)) },
      { k: "CR-SAP", v: Math.round((list.filter((s) => s.hasCRSAP).length / n) * 100) },
      { k: "Green Plan", v: Math.round((list.filter((s) => s.hasGreenPlan).length / n) * 100) },
      { k: "SHVR", v: Math.round((avg((s) => s.shvr) / 5) * 100) },
    ];
  }, [schools]);

  if (isLoading || !kpis) return <LoadingBlock />;
  if (!schools || schools.length === 0) return <AwaitingData />;

  return (
    <div className="space-y-4">
      {/* AI summary */}
      <Panel>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full grid place-items-center bg-gradient-to-br from-[var(--neon-cyan)] to-primary/60 shrink-0">
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Aurora · Odisha WASH Synthesis</div>
            <p className="text-sm mt-1 leading-relaxed">
              State-wide WASH composite sits at <b className="text-[var(--cyan)]">{kpis.avgWash}%</b> across <b>{kpis.total.toLocaleString()}</b> schools.{" "}
              {donut[0].v.toLocaleString()} schools are functional, {donut[1].v.toLocaleString()} partial and {donut[2].v.toLocaleString()} deficient.{" "}
              {byDistrict.length > 0 && (() => {
                const sorted = [...byDistrict].filter((d) => d.schools > 0).sort((a, b) => b.avgWash - a.avgWash);
                const top = sorted[0], low = sorted[sorted.length - 1];
                return top && low ? `${top.district} leads at ${top.avgWash}% while ${low.district} (${low.avgWash}%) needs priority remediation.` : "";
              })()}
            </p>
          </div>
        </div>
      </Panel>

      {/* 4 panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Water Analytics · Top 10 districts" icon={<Droplets className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={waterDistricts}>
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="water" name="Water access %" fill={C.cyan} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sanitation Analytics">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donut} dataKey="v" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hygiene Analytics">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radar}>
              <PolarGrid stroke="oklch(0.5 0.05 220 / 0.3)" />
              <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="v" stroke={C.cyan} fill={C.cyan} fillOpacity={0.35} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="WASH vs Sustainability · district readiness">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={waterData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.blue} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="wash" name="WASH %" stroke={C.cyan} fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="sus" name="Sustainability %" stroke={C.blue} fill="url(#g2)" strokeWidth={2} />
              <Legend iconType="circle" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom trend */}
      <ChartCard title="District WASH vs Sustainability — Top 10">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={waterData}>
            <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" />
            <Bar dataKey="wash" fill={C.cyan} radius={[6,6,0,0]} />
            <Bar dataKey="sus"  fill={C.blue} radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

/* -------------------- MICRO -------------------- */
function Micro() {
  const { data: schools, isLoading } = useSchools();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [criticalOnly, setCriticalOnly] = useState(false);

  const districts = useMemo(() => {
    const set = new Set<string>(); (schools ?? []).forEach((s) => set.add(s.district));
    return Array.from(set).sort();
  }, [schools]);

  const rows = useMemo(() => {
    if (!schools) return [];
    const ql = q.toLowerCase();
    return schools
      .map((s) => ({ s, t: washTriad(s) }))
      .filter(({ s, t }) => {
        if (district !== "all" && s.district !== district) return false;
        if (t.total < minRating) return false;
        if (criticalOnly && t.total > 0) return false;
        if (ql && !`${s.name} ${s.udise} ${s.district} ${s.location}`.toLowerCase().includes(ql)) return false;
        return true;
      })
      .slice(0, 500);
  }, [schools, q, district, minRating, criticalOnly]);

  function exportCsv() {
    const header = "UDISE,Name,District,Locality,Water,Sanitation,Hygiene,Stars";
    const lines = rows.map(({ s, t }) =>
      [s.udise, JSON.stringify(s.name), s.district, s.location, t.water, t.sanitation, t.hygiene, t.total].join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "wash-matrix.csv"; a.click();
  }

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-3 min-w-0">
        {/* Search + filters */}
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                     placeholder="Search school, UDISE+, district, locality…"
                     className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
            </div>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm">
              <option value="all">All districts</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="glass-soft rounded-lg px-3 py-2 text-sm">
              <option value={0}>Any rating</option>
              <option value={1}>★ and above</option>
              <option value={2}>★★ and above</option>
              <option value={3}>★★★ only</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground glass-soft rounded-lg px-3 py-2">
              <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} />
              Critical only (☆)
            </label>
            <button onClick={exportCsv} className="ml-auto flex items-center gap-1.5 text-xs glass-soft rounded-lg px-3 py-2 hover:bg-primary/10">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground"><Filter className="inline h-3 w-3 mr-1" />{rows.length.toLocaleString()} schools</div>
        </Panel>

        {/* Matrix */}
        <Panel className="p-0 overflow-hidden">
          <div className="max-h-[68vh] overflow-auto scroll-invisible">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 backdrop-blur bg-[oklch(0.18_0.04_220/0.65)]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">School</th>
                  <th className="px-3 py-2.5">District</th>
                  <th className="px-3 py-2.5">Locality</th>
                  <th className="px-3 py-2.5 text-center">Water</th>
                  <th className="px-3 py-2.5 text-center">Sanitation</th>
                  <th className="px-3 py-2.5 text-center">Hygiene</th>
                  <th className="px-3 py-2.5 text-center">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, t }) => (
                  <tr key={s.udise} className="border-t border-border/30 hover:bg-primary/5 transition">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[28ch]">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">UDISE+ {s.udise}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.district}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.location}</td>
                    <td className="px-3 py-2.5 text-center"><Bit on={t.water === 1} /></td>
                    <td className="px-3 py-2.5 text-center"><Bit on={t.sanitation === 1} /></td>
                    <td className="px-3 py-2.5 text-center"><Bit on={t.hygiene === 1} /></td>
                    <td className="px-3 py-2.5 text-center"><Stars n={t.total} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* AI insights */}
      <Panel className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--cyan)]" />
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Aurora WASH Insights</div>
        </div>
        {(() => {
          const all = schools ?? [];
          const byD = aggregateByDistrict(all).filter((d) => d.schools > 0);
          const sorted = [...byD].sort((a, b) => b.avgWash - a.avgWash);
          const top = sorted.slice(0, 3).map((d) => d.district).join(" · ");
          const low = sorted.slice(-3).reverse().map((d) => d.district).join(" · ");
          const critical = all.filter((s) => s.washScore < 40).length;
          const noSan = all.filter((s) => s.sustainabilityScore < 45).length;
          return (
            <>
              <Insight title="Critical clusters" body={`${critical.toLocaleString()} schools below 40% WASH readiness need priority intervention.`} />
              <Insight title="Sanitation gap" body={`${noSan.toLocaleString()} schools fall short on sanitation/sustainability benchmarks.`} />
              <Insight title="Lagging districts" body={low ? `Lowest WASH readiness: ${low}. Prioritise water + hygiene retrofits.` : "Awaiting district data."} />
              <Insight title="Top performers" body={top ? `${top} lead on WASH readiness — replicate their playbooks.` : "Awaiting district data."} />
            </>
          );
        })()}
      </Panel>
    </div>
  );
}

function Bit({ on }: { on: boolean }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${on ? "bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" : "bg-muted-foreground/30"}`} />;
}
function Stars({ n }: { n: number }) {
  const filled = "★".repeat(n);
  const empty  = "☆".repeat(3 - n);
  const color = n === 0 ? "text-rose-400" : n === 3 ? "text-[var(--cyan)]" : "text-amber-300";
  return <span className={`tracking-widest ${color}`}>{filled || "☆"}{empty}</span>;
}
function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg glass-soft p-3">
      <div className="text-xs font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{body}</div>
    </div>
  );
}
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-4 ${className}`}>{children}</div>;
}
function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center gap-2 mb-2">
        {icon}<div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      </div>
      {children}
    </Panel>
  );
}
function LoadingBlock() {
  return <div className="h-[60vh] grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading WASH intelligence…</div>;
}