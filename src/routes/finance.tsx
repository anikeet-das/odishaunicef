import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend,
  PieChart, Pie, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Wallet, Coins, TrendingUp, AlertTriangle, Sparkles, Search, Download,
  Building2, Target, Gauge, FileSpreadsheet, FileText, ShieldCheck,
  ArrowDownRight, Layers, BadgeAlert, Clock,
} from "lucide-react";
import {
  useRealFinance, inr, inrFull, exportCsv, exportExcel, schoolsToCsvRows,
  CAPITAL_FIELDS, OPEX_FIELDS, FIELD_LABEL,
  type SchoolFin,
} from "@/lib/data/real-finance";
import { useSchools } from "@/lib/data/cces";
import { KeyDistrictsPanel } from "@/components/cr-sap/KeyDistrictsPanel";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Financial Intelligence · CR-SAP Odisha" },
      { name: "description", content: "Real-time capital, operational cost & resource convergence from live Google Form responses." },
    ],
  }),
  component: Page,
});

const COLORS = [
  "oklch(0.72 0.21 255)", "oklch(0.82 0.19 175)", "oklch(0.84 0.2 155)",
  "oklch(0.62 0.22 285)", "oklch(0.85 0.18 75)", "oklch(0.68 0.24 22)", "oklch(0.86 0.16 200)",
];

function Page() {
  const fin = useRealFinance();
  if (!fin) return <LoadingShell title="Financial Intelligence" subtitle="Live Form Responses" />;
  if (fin.schools.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Financial Intelligence" subtitle="Awaiting form submissions" />
        <AwaitingData />
      </div>
    );
  }
  return <Dashboard fin={fin} />;
}

function Dashboard({ fin }: { fin: NonNullable<ReturnType<typeof useRealFinance>> }) {
  const { totals, audit, districts } = fin;
  const { data: schools } = useSchools();
  const accuracyGood = audit.accuracyPct >= 95;


  return (
    <div className="flex flex-col min-h-full">
      <Topbar
        title="Financial Intelligence"
        subtitle="Live · sourced from Google Form responses"
      />
      <div className="p-3 space-y-3">
        {/* Data integrity banner */}
        <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <ShieldCheck className={`h-5 w-5 ${accuracyGood ? "text-[var(--aurora)]" : "text-[var(--warn)]"}`} />
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Data Integrity</div>
            <div className="text-sm">
              <span className="font-semibold">{audit.validFieldCells.toLocaleString()}</span>
              <span className="text-muted-foreground"> of </span>
              <span className="font-semibold">{audit.totalFieldCells.toLocaleString()}</span>
              <span className="text-muted-foreground"> cost cells parsed cleanly · </span>
              <span className={`font-bold ${accuracyGood ? "text-[var(--aurora)]" : "text-[var(--warn)]"}`}>{audit.accuracyPct}%</span>
              <span className="text-muted-foreground"> accuracy</span>
            </div>
          </div>
          {audit.mismatchSchools > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-[oklch(0.85_0.18_75/0.18)] text-[var(--warn)]">
              <BadgeAlert className="h-3.5 w-3.5" /> {audit.mismatchSchools} school(s) with capital+opex / mobilized mismatch
            </span>
          )}
          <Link to="/ai-notes" className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full glass-soft hover:neon-ring">
            <Sparkles className="h-3.5 w-3.5 text-[var(--aurora)]" /> {fin.notes.length} AI Notes
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi icon={<Wallet className="h-4 w-4" />} label="Capital Cost" value={inr(totals.capitalTotal)} sub={`Toilets + Water + Infra · ${fin.schools.length} schools`} accent={COLORS[0]} />
          <Kpi icon={<Coins className="h-4 w-4" />} label="Operational Cost" value={inr(totals.opexTotal)} sub="Maintenance + Cleaning + Repairs" accent={COLORS[1]} />
          <Kpi icon={<Target className="h-4 w-4" />} label="Required Budget" value={inr(totals.required)} sub="Capital + Operational" accent={COLORS[6]} />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Resource Mobilized" value={inr(totals.mobilized)} sub={`${totals.convergence}% of required`} accent={COLORS[2]} ring={totals.convergence} />
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Resource Gap" value={inr(totals.gap)} sub={totals.required ? `${Math.round((totals.gap / totals.required) * 100)}% short` : "—"} accent={COLORS[5]} />
          <Kpi icon={<Building2 className="h-4 w-4" />} label="Schools Covered" value={audit.totalSchools.toString()} sub={`${districts.length} districts`} accent={COLORS[3]} />
          <Kpi icon={<BadgeAlert className="h-4 w-4" />} label="Invalid Entries" value={fin.notes.length.toString()} sub={`${audit.invalidRecords} fully blank · ${audit.partiallyValid} partial`} accent={COLORS[5]} />
          <Kpi icon={<Gauge className="h-4 w-4" />} label="Data Accuracy" value={`${audit.accuracyPct}%`} sub={accuracyGood ? "Within target ≥ 95%" : "Below 95% target"} accent={accuracyGood ? COLORS[2] : COLORS[4]} ring={audit.accuracyPct} />
        </div>

        {/* Required vs Mobilized vs Gap */}
        <div className="grid lg:grid-cols-2 gap-3">
          <Section title="Required vs Mobilized vs Gap" icon={<ArrowDownRight className="h-4 w-4 text-[var(--danger)]" />} note="From live cells">
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={[
                  { name: "Required", v: totals.required, fill: COLORS[6] },
                  { name: "Mobilized", v: totals.mobilized, fill: COLORS[2] },
                  { name: "Gap", v: totals.gap, fill: COLORS[5] },
                ]}>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                    {[COLORS[6], COLORS[2], COLORS[5]].map((c, i) => <Cell key={i} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Capital + Opex split */}
          <Section title="Capital vs Operational composition" icon={<Layers className="h-4 w-4 text-[var(--cyan)]" />}>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={[
                    ...CAPITAL_FIELDS.map((f) => ({ name: `Capital · ${FIELD_LABEL[f]}`, value: totals.capitalByField[f] })),
                    ...OPEX_FIELDS.map((f) => ({ name: `Opex · ${FIELD_LABEL[f]}`, value: totals.opexByField[f] })),
                  ].filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {[0, 1, 2, 3, 4, 5].map((i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* Sources + urgency */}
        <div className="grid lg:grid-cols-2 gap-3">
          <Section title="Resource Mobilization · Source breakdown" icon={<Layers className="h-4 w-4 text-[var(--aurora)]" />} note="From “Funding source suggested”">
            {totals.sourceBreakdown.length === 0 ? (
              <div className="text-xs text-muted-foreground p-6 text-center">No funding source data submitted yet.</div>
            ) : (
              <div className="space-y-2">
                {totals.sourceBreakdown.map((s, i) => {
                  const tot = totals.sourceBreakdown.reduce((a, b) => a + b.value, 0) || 1;
                  const pct = Math.round((s.value / tot) * 100);
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate pr-2">{s.source}</span>
                        <span className="font-semibold tabular-nums">{inr(s.value)} · {pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Budget urgency distribution" icon={<Clock className="h-4 w-4 text-[var(--warn)]" />} note="From “Budget urgency”">
            {totals.urgencyBreakdown.length === 0 ? (
              <div className="text-xs text-muted-foreground p-6 text-center">No urgency data submitted yet.</div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={totals.urgencyBreakdown} layout="vertical" margin={{ left: 30 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="urgency" type="category" tick={{ fontSize: 10 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {totals.urgencyBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </div>

        {/* District leaderboard */}
        <Section title="District-wise budget map" icon={<Building2 className="h-4 w-4 text-[var(--cyan)]" />} note={`${districts.length} districts`}>
          {districts.length === 0 ? <div className="text-xs text-muted-foreground p-4">—</div> : (
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={districts.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="district" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="capitalTotal" name="Capital" stackId="a" fill={COLORS[0]} />
                  <Bar dataKey="opexTotal" name="Operational" stackId="a" fill={COLORS[1]} />
                  <Line type="monotone" dataKey="mobilized" stroke={COLORS[2]} strokeWidth={2} dot={false} name="Mobilized" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* Top schools */}
        <div className="grid lg:grid-cols-3 gap-3">
          <RankList title="Top 10 highest budget schools" data={fin.topByRequired} valueOf={(s) => s.required} />
          <RankList title="Top 10 largest infrastructure cost" data={fin.topByCapital} valueOf={(s) => s.capital.infrastructure ?? 0} hideZero />
          <RankList title="Top 10 highest operational burden" data={fin.topByOpex} valueOf={(s) => s.opexTotal} />
        </div>

        {/* AI insights */}
        <AiInsights fin={fin} />

        {/* School-level table */}
        <SchoolTable schools={fin.schools} />
      </div>
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */

function Kpi({ icon, label, value, sub, accent, ring }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent: string; ring?: number;
}) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="text-2xl font-bold mt-2 tabular-nums" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      {ring !== undefined && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ring)}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, note, icon, children }: { title: string; note?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">{icon}{title}</h3>
        {note && <span className="text-[10px] text-muted-foreground">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function RankList({ title, data, valueOf, hideZero }: { title: string; data: SchoolFin[]; valueOf: (s: SchoolFin) => number; hideZero?: boolean }) {
  const rows = hideZero ? data.filter((s) => valueOf(s) > 0) : data;
  return (
    <Section title={title} icon={<Target className="h-4 w-4 text-[var(--cyan)]" />}>
      {rows.length === 0 ? <div className="text-xs text-muted-foreground p-2">No data</div> : (
        <ol className="space-y-1.5 text-xs">
          {rows.slice(0, 10).map((s, i) => (
            <li key={s.udise} className="glass-soft rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-bold tabular-nums w-5 text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground"> · {s.district}</span>
              </span>
              <span className="tabular-nums font-bold text-[var(--cyan)]">{inr(valueOf(s))}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function AiInsights({ fin }: { fin: NonNullable<ReturnType<typeof useRealFinance>> }) {
  const insights: string[] = [];
  const t = fin.totals;
  insights.push(`Statewide required budget across ${fin.schools.length} responding schools is ${inr(t.required)} (Capital ${inr(t.capitalTotal)} + Operational ${inr(t.opexTotal)}).`);
  if (t.gap > 0) insights.push(`Funding gap of ${inr(t.gap)} — ${Math.round((t.gap / Math.max(1, t.required)) * 100)}% short of the requirement.`);
  else if (t.mobilized > 0) insights.push(`Resources mobilized (${inr(t.mobilized)}) currently meet or exceed the captured requirement.`);
  if (fin.districts[0]) insights.push(`${fin.districts[0].district} carries the highest required budget at ${inr(fin.districts[0].required)}.`);
  const lowest = [...fin.districts].sort((a, b) => a.convergence - b.convergence)[0];
  if (lowest && lowest.required > 0) insights.push(`${lowest.district} has the lowest convergence at ${lowest.convergence}% — prioritise multi-source mobilisation.`);
  if (fin.missingEstimates.length > 0) insights.push(`${fin.missingEstimates.length} school(s) submitted zero numeric estimates — see AI Notes Center for follow-up actions.`);
  if (fin.notes.length > 0) insights.push(`${fin.notes.filter((n) => n.priority === "High").length} High priority and ${fin.notes.filter((n) => n.priority === "Medium").length} Medium priority data-quality notes have been auto-generated by AI.`);
  if (fin.audit.mismatchSchools > 0) insights.push(`${fin.audit.mismatchSchools} school(s) report a mismatch between sub-totals and the declared estimated budget — verify entries.`);

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-20" style={{ background: COLORS[3] }} />
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--aurora)]" /> AI Insights · auto-generated</h3>
        <Link to="/ai-notes" className="text-xs text-accent hover:underline">Open AI Notes Center →</Link>
      </div>
      <ul className="space-y-2">
        {insights.map((line, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------- School-level financial table --------------------------- */

type SortKey = keyof SchoolFin | "toiletsCost" | "waterCost" | "infraCost" | "maintCost" | "cleanCost" | "repairCost";

function SchoolTable({ schools }: { schools: SchoolFin[] }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [sort, setSort] = useState<SortKey>("required");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PAGE = 20;

  const districts = useMemo(() => Array.from(new Set(schools.map((s) => s.district))).sort(), [schools]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return schools.filter((s) =>
      (!ql || s.udise.toLowerCase().includes(ql) || s.name.toLowerCase().includes(ql)) &&
      (district === "all" || s.district === district),
    );
  }, [schools, q, district]);

  const getter = (s: SchoolFin): number | string => {
    switch (sort) {
      case "toiletsCost": return s.capital.toilets ?? 0;
      case "waterCost": return s.capital.water ?? 0;
      case "infraCost": return s.capital.infrastructure ?? 0;
      case "maintCost": return s.opex.maintenance ?? 0;
      case "cleanCost": return s.opex.cleaning ?? 0;
      case "repairCost": return s.opex.repairs ?? 0;
      default: return (s as any)[sort];
    }
  };
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = getter(a); const vb = getter(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort, dir]);

  const pageStart = page * PAGE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));

  function header(label: string, key: SortKey) {
    const active = sort === key;
    return (
      <th
        className={`py-2 px-2 text-right uppercase tracking-wider text-[10px] cursor-pointer select-none ${active ? "text-[var(--cyan)]" : "text-muted-foreground"}`}
        onClick={() => { if (active) setDir(dir === "asc" ? "desc" : "asc"); else { setSort(key); setDir("desc"); } setPage(0); }}
      >
        {label}{active ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </th>
    );
  }

  return (
    <Section title="School-level financial register" icon={<FileText className="h-4 w-4 text-[var(--aurora)]" />} note={`${sorted.length.toLocaleString()} school(s)`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search by School ID or name…"
            className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
        </div>
        <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(0); }}
          className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
          <option value="all">All districts</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => exportCsv("financial-register.csv", schoolsToCsvRows(sorted))}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button onClick={() => exportExcel("financial-register.xls", schoolsToCsvRows(sorted))}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-2 pr-3 text-left uppercase tracking-wider text-[10px] text-muted-foreground cursor-pointer" onClick={() => { setSort("udise"); setDir(dir === "asc" ? "desc" : "asc"); }}>School ID</th>
              <th className="py-2 pr-3 text-left uppercase tracking-wider text-[10px] text-muted-foreground cursor-pointer" onClick={() => { setSort("name"); setDir(dir === "asc" ? "desc" : "asc"); }}>School Name</th>
              <th className="py-2 pr-3 text-left uppercase tracking-wider text-[10px] text-muted-foreground">District</th>
              {header("Toilets", "toiletsCost")}
              {header("Water", "waterCost")}
              {header("Infra", "infraCost")}
              {header("Maint.", "maintCost")}
              {header("Clean.", "cleanCost")}
              {header("Repairs", "repairCost")}
              {header("Capital", "capitalTotal")}
              {header("Opex", "opexTotal")}
              {header("Total", "required")}
              <th className="py-2 px-2 text-left uppercase tracking-wider text-[10px] text-muted-foreground">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => (
              <tr key={s.udise} className="border-b border-border/30 hover:bg-white/[0.03]">
                <td className="py-2 pr-3 font-mono">{s.udise}</td>
                <td className="py-2 pr-3 font-medium truncate max-w-[220px]">{s.name}</td>
                <td className="py-2 pr-3 text-muted-foreground">{s.district}</td>
                <Cell0 v={s.capital.toilets} />
                <Cell0 v={s.capital.water} />
                <Cell0 v={s.capital.infrastructure} />
                <Cell0 v={s.opex.maintenance} />
                <Cell0 v={s.opex.cleaning} />
                <Cell0 v={s.opex.repairs} />
                <td className="py-2 px-2 text-right tabular-nums font-semibold">{inr(s.capitalTotal)}</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold">{inr(s.opexTotal)}</td>
                <td className="py-2 px-2 text-right tabular-nums font-bold text-[var(--cyan)]">{inr(s.required)}</td>
                <td className="py-2 px-2 text-[10px] text-muted-foreground whitespace-nowrap">{s.lastUpdated || "—"}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={13} className="text-center py-6 text-muted-foreground">No matching schools.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Page {page + 1} / {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 rounded-lg glass-soft disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="px-3 py-1.5 rounded-lg glass-soft disabled:opacity-40">Next</button>
        </div>
      </div>
    </Section>
  );
}

function Cell0({ v }: { v: number | null }) {
  return <td className={`py-2 px-2 text-right tabular-nums ${v === null ? "text-muted-foreground italic" : ""}`}>{v === null ? "—" : inr(v)}</td>;
}
