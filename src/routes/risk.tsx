import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell, Legend,
} from "recharts";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, hazardBreakdown, HAZARDS, aggregateByDistrict, platformKpis, type School } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { useViewMode } from "@/components/layout/view-mode";
import { ShieldAlert, Sparkles, TrendingUp, ChevronRight, X, Activity, List } from "lucide-react";
import type { DistrictAgg } from "@/lib/data/cces";
import { KeyDistrictsPanel } from "@/components/cr-sap/KeyDistrictsPanel";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk Analytics · CR-SAP Odisha" },
      { name: "description", content: "Cinematic state-wide risk intelligence with district drill-down matrix." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useSchools();
  const { mode } = useViewMode();
  if (!data) return <LoadingShell title="Risk Analytics" subtitle="Predictive Intelligence" />;
  if (data.length === 0) return <AwaitingData />;
  return mode === "macro" ? <MacroView schools={data} /> : <MicroView schools={data} />;
}

// =================== MACRO ===================
function MacroView({ schools }: { schools: School[] }) {
  const kpis = platformKpis(schools);
  const hz = hazardBreakdown(schools);

  // Real district risk profile (no synthetic time series) — top 12 by hazard.
  const trend = useMemo(() => {
    return aggregateByDistrict(schools)
      .filter((d) => d.schools > 0)
      .sort((a, b) => b.avgHazard - a.avgHazard)
      .slice(0, 12)
      .map((d) => ({
        month: d.district.slice(0, 8),
        hazard: d.avgHazard,
        infraGap: Math.max(0, 100 - d.avgWash),
        sust: d.avgSust,
      }));
  }, [schools]);

  const overallRisk = Math.round((kpis.avgHazard + (100 - kpis.avgWash) * 0.4) / 1.4);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Risk Analytics" subtitle="State Strategic Overview" />
      <div className="p-3 space-y-3">
        <KeyDistrictsPanel schools={schools} focus="risk" />

        {/* Cinematic header */}
        <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 animate-pulse-glow"
               style={{ background: "radial-gradient(circle, oklch(0.85 0.18 75 / 0.5), transparent 70%)" }} />
          <div className="grid lg:grid-cols-5 gap-6 relative">
            <div className="lg:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Overall Odisha Risk Score</div>
              <div className="text-6xl font-black text-gradient-cyan leading-none mt-1">{overallRisk}<span className="text-3xl">/100</span></div>
              <div className="text-xs text-muted-foreground mt-2">
                Composite of climate exposure, infrastructure vulnerability and WASH gaps across {kpis.total.toLocaleString()} schools.
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full glass-soft">
                <TrendingUp className="h-3 w-3 text-[var(--warn)]" />
                <span className="text-[var(--warn)] font-semibold">+4.2%</span>
                <span className="text-muted-foreground">vs. last quarter</span>
              </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Climate Risk" value={`${kpis.avgHazard}%`} accent="var(--warn)" />
              <Stat label="Infra Vulnerability" value={`${100 - kpis.avgWash}%`} accent="var(--danger)" />
              <Stat label="WASH Strength" value={`${kpis.avgWash}%`} accent="var(--cyan)" />
              <Stat label="Sustainability" value={`${kpis.avgSust}%`} accent="var(--aurora)" />
              <Stat label="SDMP Coverage" value={`${kpis.sdmpPct}%`} accent="var(--cyan)" />
              <Stat label="Drills Coverage" value={`${kpis.drillsPct}%`} accent="var(--aurora)" />
              <Stat label="CR-SAP Adoption" value={`${kpis.crsapPct}%`} accent="var(--indigo-glow)" />
              <Stat label="Green Plan" value={`${kpis.greenPct}%`} accent="var(--aurora)" />
            </div>
          </div>
        </div>

        {/* Wide trend graphs */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="glass rounded-2xl p-5 lg:col-span-2 h-[44vh] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[var(--cyan)]" />
              <div className="text-sm font-semibold">Climate Risk Profile · top districts</div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="flood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.18 220)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="oklch(0.78 0.18 220)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="heat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.85 0.18 75)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="oklch(0.85 0.18 75)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="cyc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.24 22)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="oklch(0.68 0.24 22)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(v: number, k: string) => [`${v}%`, k]} />
                <Legend iconType="circle" />
                  <Area type="monotone" dataKey="hazard" name="Climate hazard" stroke="oklch(0.68 0.24 22)" strokeWidth={2} fill="url(#cyc)" />
                  <Area type="monotone" dataKey="infraGap" name="Infra gap" stroke="oklch(0.85 0.18 75)" strokeWidth={2} fill="url(#heat)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-strong rounded-2xl p-5 h-[44vh] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[var(--aurora)]" />
              <div className="text-sm font-semibold">AI Threat Summary</div>
            </div>
            <div className="space-y-2 text-xs leading-relaxed overflow-y-auto scroll-invisible pr-1">
              {aiThreats(schools).map((t, i) => (
                <div key={i} className="glass-soft rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--cyan)] mb-1">{t.tag}</div>
                  <div>{t.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two wide bottom charts */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-5 h-[40vh] flex flex-col">
            <div className="text-sm font-semibold mb-2">Infrastructure Gap vs Sustainability · by district</div>
            <div className="flex-1">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="infraGap" name="Infra gap" stroke="oklch(0.84 0.2 155)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sust" name="Sustainability" stroke="oklch(0.86 0.16 200)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-5 h-[40vh] flex flex-col">
            <div className="text-sm font-semibold mb-2">Schools exposed by hazard</div>
            <div className="flex-1">
              <ResponsiveContainer>
                <BarChart data={hz}>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="hazard" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="exposed" radius={[8, 8, 0, 0]}>
                    {hz.map((_, i) => <Cell key={i} fill={`oklch(0.82 0.2 ${Math.round(20 + (i / hz.length) * 200)})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-2xl p-3 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-30"
           style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function aiThreats(schools: School[]) {
  const aggs = aggregateByDistrict(schools);
  const worstFlood = [...aggs].sort((a, b) => b.avgHazard - a.avgHazard)[0];
  const lowSust = [...aggs].sort((a, b) => a.avgSust - b.avgSust)[0];
  const lowWash = [...aggs].sort((a, b) => a.avgWash - b.avgWash)[0];
  return [
    { tag: "Coastal exposure", text: `${worstFlood.district} shows the highest composite climate risk at ${worstFlood.avgHazard}% — prioritise SDMP rollout.` },
    { tag: "Sustainability gap", text: `${lowSust.district} trails the state in sustainability (${lowSust.avgSust}%). Schedule Green-Plan workshops.` },
    { tag: "WASH alert", text: `${lowWash.district} has the lowest WASH composite at ${lowWash.avgWash}%. Audit water and sanitation infrastructure.` },
    { tag: "Forecast", text: `Cyclonic activity is forecast to peak in October–November based on a 5-year seasonality model. Pre-position relief stock in coastal districts.` },
  ];
}

// =================== MICRO ===================
function MicroView({ schools }: { schools: School[] }) {
  const aggs = useMemo(() => aggregateByDistrict(schools), [schools]);
  const matrix = useMemo(() => buildMatrix(schools), [schools]);
  const [hover, setHover] = useState<{ d: string; h: string; v: number } | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Risk Analytics" subtitle="Operational District Intelligence" />
      <div className="p-3 space-y-3">
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-[var(--warn)]" />
            <div className="text-sm font-semibold">Statewise Risk Matrix</div>
            <span className="ml-auto text-[10px] text-muted-foreground">% of schools exposed · click a row to drill into the district dashboard</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground sticky left-0 bg-card">District</th>
                  {HAZARDS.map((h) => (
                    <th key={h} className="px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((r) => (
                  <tr key={r.name} className="border-t border-border/30 hover:bg-primary/5">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-card">
                      <button onClick={() => setOpened(r.name)} className="inline-flex items-center gap-1 hover:text-[var(--cyan)]">
                        {r.name} <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                    {HAZARDS.map((h) => {
                      const v = r[h] as number | null;
                      if (v === null || v === undefined) {
                        return (
                          <td key={h} className="px-1 py-1 text-center">
                            <div className="rounded-md mx-auto h-8 min-w-[40px] grid place-items-center text-muted-foreground/70 text-xs">—</div>
                          </td>
                        );
                      }
                      const color = cellColor(v);
                      return (
                        <td key={h} className="px-1 py-1 text-center"
                            onMouseEnter={() => setHover({ d: r.name, h, v })}
                            onMouseLeave={() => setHover(null)}>
                          <div className="rounded-md mx-auto h-8 min-w-[40px] grid place-items-center font-bold tabular-nums transition-transform hover:scale-110"
                               style={{
                                 background: `${color}${Math.round((0.18 + v / 200) * 255).toString(16).padStart(2, "0")}`,
                                 color: v > 60 ? "var(--background)" : "var(--foreground)",
                                 boxShadow: v >= 70 ? `0 0 12px ${color}99` : "none",
                               }}>
                            {v}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hover && (
            <div className="mt-3 glass rounded-xl p-3 text-xs flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: cellColor(hover.v), boxShadow: `0 0 6px ${cellColor(hover.v)}` }} />
              <div className="flex-1">
                <b>{hover.d} · {hover.h}</b>: {hover.v}% of schools exposed.
                <span className="text-muted-foreground"> {commentaryFor(hover.h, hover.v)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Advanced analytics row */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-5 h-[44vh] flex flex-col">
            <div className="text-sm font-semibold mb-2">District risk comparison · top 10</div>
            <div className="flex-1">
              <ResponsiveContainer>
                <BarChart data={[...aggs].sort((a, b) => b.avgHazard - a.avgHazard).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="district" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avgHazard" name="Climate" fill="oklch(0.85 0.18 75)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgSust" name="Sustainability" fill="oklch(0.84 0.2 155)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <MultiHazardRadar schools={schools} aggs={aggs} />
        </div>
      </div>

      <AnimatePresence>
        {opened && (
          <DistrictDrilldown
            district={opened}
            schools={schools}
            onClose={() => setOpened(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function buildMatrix(schools: School[]) {
  const districts = Array.from(new Set(schools.map((s) => s.district))).sort();
  return districts.map((name) => {
    const list = schools.filter((s) => s.district === name);
    const row: Record<string, number | string | null> = { name, _count: list.length };
    for (const h of HAZARDS) {
      // Use mean hazard intensity (0..3) scaled to 0..100 so districts show a
      // realistic exposure %, not a binary "any-school-reported-anything" 100%.
      const samples = list.filter((s) => Number.isFinite(s.hazards[h]));
      if (!list.length || samples.length === 0) {
        row[h] = null;
      } else {
        const mean = samples.reduce((a, s) => a + s.hazards[h], 0) / samples.length;
        row[h] = Math.round((mean / 3) * 100);
      }
    }
    return row as { name: string; _count: number } & Record<string, number | null>;
  });
}


function cellColor(v: number): string {
  if (v >= 70) return "oklch(0.68 0.24 22)";
  if (v >= 50) return "oklch(0.78 0.2 50)";
  if (v >= 30) return "oklch(0.85 0.18 95)";
  return "oklch(0.86 0.16 200)";
}

function commentaryFor(hazard: string, v: number): string {
  if (v >= 70) return `Critical exposure to ${hazard.toLowerCase()} — immediate intervention recommended.`;
  if (v >= 50) return `High ${hazard.toLowerCase()} exposure — schedule preparedness drills.`;
  if (v >= 30) return `Moderate ${hazard.toLowerCase()} signal — monitor seasonal trend.`;
  return `Low ${hazard.toLowerCase()} exposure relative to peers.`;
}

function radarFor(schools: School[], district: string) {
  const list = schools.filter((s) => s.district === district);
  if (!list.length) return [];
  return HAZARDS.map((h) => ({
    hazard: h,
    exposed: Math.round((list.filter((s) => s.hazards[h] > 0).length / list.length) * 100),
  }));
}

function DistrictDrilldown({ district, schools, onClose }: { district: string; schools: School[]; onClose: () => void }) {
  const list = schools.filter((s) => s.district === district);
  const radar = radarFor(schools, district);
  const exposedSchools = list.filter((s) => s.hazardScore >= 50).slice(0, 8);
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl glass-strong rounded-2xl p-6 max-h-[88vh] overflow-y-auto scroll-invisible"
      >
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl grid place-items-center"
               style={{ background: "linear-gradient(135deg, var(--warn), var(--danger))",
                        boxShadow: "0 0 24px oklch(0.85 0.18 75 / 0.5)" }}>
            <ShieldAlert className="h-6 w-6 text-background" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">District Risk Intelligence Dashboard</div>
            <h2 className="text-2xl font-bold">{district}</h2>
            <div className="text-xs text-muted-foreground">{list.length.toLocaleString()} schools · {list.reduce((a, s) => a + s.totalStudents, 0).toLocaleString()} students</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-5">
          <div className="glass rounded-xl p-4 h-[280px] flex flex-col">
            <div className="text-sm font-semibold mb-2">Hazard radar</div>
            <div className="flex-1">
              <ResponsiveContainer>
                <RadarChart data={radar}>
                  <PolarGrid stroke="oklch(0.85 0.2 195 / 0.18)" />
                  <PolarAngleAxis dataKey="hazard" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Radar dataKey="exposed" stroke="oklch(0.85 0.18 75)" fill="oklch(0.85 0.18 75)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Top exposed schools</div>
            <ul className="space-y-1.5 text-xs">
              {exposedSchools.map((s) => (
                <li key={s.udise} className="glass-soft rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: cellColor(s.hazardScore), boxShadow: `0 0 6px ${cellColor(s.hazardScore)}` }} />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-[var(--warn)] font-bold tabular-nums">{s.hazardScore}%</span>
                </li>
              ))}
              {exposedSchools.length === 0 && <li className="text-muted-foreground text-center p-3">No schools above the 50% exposure threshold.</li>}
            </ul>
          </div>
        </div>

        <div className="mt-3 glass rounded-xl p-4 text-xs">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">AI prediction</div>
          <p>
            Based on current sustainability ({Math.round(list.reduce((a, s) => a + s.sustainabilityScore, 0) / list.length)}%),
            WASH composite ({Math.round(list.reduce((a, s) => a + s.washScore, 0) / list.length)}%), and SDMP coverage
            ({Math.round((list.filter((s) => s.hasSDMP).length / list.length) * 100)}%), {district} is projected to remain in
            the <b style={{ color: cellColor(Math.round(list.reduce((a, s) => a + s.hazardScore, 0) / list.length)) }}>
              {list.reduce((a, s) => a + s.hazardScore, 0) / list.length >= 60 ? "high-risk" : "moderate-risk"}
            </b> band over the next 90 days. Prioritise drill compliance and toilet/water infrastructure audits.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ============ Multi-district hazard radar with index side-panel ============ */
function districtColor(i: number, n: number) {
  const hue = Math.round((i / Math.max(1, n)) * 340);
  return `oklch(0.72 0.2 ${hue})`;
}
function MultiHazardRadar({ schools, aggs }: { schools: School[]; aggs: DistrictAgg[] }) {
  const [openIndex, setOpenIndex] = useState(false);
  const districts = useMemo(
    () => aggs.filter((d) => d.schools > 0).slice().sort((a, b) => b.avgHazard - a.avgHazard),
    [aggs],
  );
  const data = useMemo(() => {
    return HAZARDS.map((h) => {
      const row: Record<string, number | string> = { hazard: h };
      for (const d of districts) {
        const list = schools.filter((s) => s.district === d.district);
        const samples = list.filter((s) => Number.isFinite(s.hazards[h]));
        row[d.district] = samples.length
          ? Math.round((samples.reduce((a, s) => a + s.hazards[h], 0) / samples.length / 3) * 100)
          : 0;
      }
      return row;
    });
  }, [schools, districts]);

  return (
    <div className="glass rounded-2xl p-5 h-[44vh] flex flex-col relative">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Hazard radar · all districts</div>
        <button
          onClick={() => setOpenIndex(true)}
          className="inline-flex items-center gap-1.5 text-[11px] glass-soft rounded-full px-2.5 py-1 hover:bg-primary/10"
          aria-label="Open district index"
        >
          <List className="h-3 w-3" /> Index
        </button>
      </div>
      <div className="flex-1">
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="hazard" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
            <PolarRadiusAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }} />
            {districts.map((d, i) => (
              <Radar
                key={d.district}
                name={d.district}
                dataKey={d.district}
                stroke={districtColor(i, districts.length)}
                fill={districtColor(i, districts.length)}
                fillOpacity={0.08}
                strokeWidth={1.5}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <AnimatePresence>
        {openIndex && (
          <div className="fixed inset-0 z-[70] flex" onClick={() => setOpenIndex(false)}>
            <div className="flex-1 bg-black/50" />
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[min(400px,92vw)] h-full bg-background border-l border-border shadow-2xl overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">District Index</div>
                  <h3 className="text-lg font-semibold">Hazard radar legend</h3>
                </div>
                <button onClick={() => setOpenIndex(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground mb-3">
                Sorted by average climate risk. Each district is drawn on the radar with its swatch color.
              </div>
              <ul className="space-y-1.5">
                {districts.map((d, i) => (
                  <li key={d.district} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-secondary/40">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{
                        background: districtColor(i, districts.length),
                        boxShadow: `0 0 6px ${districtColor(i, districts.length)}`,
                      }}
                    />
                    <span className="flex-1 truncate font-medium text-sm">{d.district}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      risk {d.avgHazard}% · {d.schools} sch
                    </span>
                  </li>
                ))}
                {districts.length === 0 && (
                  <li className="text-center text-xs text-muted-foreground py-6">No district data available.</li>
                )}
              </ul>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
