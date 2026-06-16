import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { FundLedgerPanel } from "@/components/cr-sap/FundLedgerPanel";
import { useViewMode } from "@/components/layout/view-mode";
import { useI18n } from "@/lib/i18n";
import {
  useFinance, aggregateState, aggregateFinanceByDistrict, monthlyTrendFromLedger, termStatus,
  stateAiSummary, schoolAiSummary, inr, inrFull, STATUS_COLOR,
  CAPITAL_KEYS, OPEX_KEYS, SOURCE_KEYS, CAPITAL_LABELS, OPEX_LABELS, SOURCE_LABELS,
  type SchoolFinance, type CapitalKey, type OpexKey, type SourceKey,
} from "@/lib/data/finance";
import { useFundLedger } from "@/lib/data/fund-ledger";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend,
  AreaChart, Area, LineChart, Line, PieChart, Pie, RadialBarChart, RadialBar,
  PolarAngleAxis, Treemap, ScatterChart, Scatter, ZAxis, CartesianGrid, LabelList,
} from "recharts";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, Coins, AlertTriangle, Sparkles, Search, Download, Filter,
  Building2, Trophy, Target, ArrowDownRight, Gauge, Layers, Plane,
} from "lucide-react";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Financial Intelligence · CR-SAP Odisha" },
      { name: "description", content: "Capital, operational cost & resource convergence monitoring across Odisha schools." },
    ],
  }),
  component: Page,
});

function Page() {
  const fins = useFinance();
  const { mode } = useViewMode();
  if (!fins) return <LoadingShell title="Financial Intelligence" subtitle="Resource Convergence" />;
  if (fins.length === 0)
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Financial Intelligence" subtitle="Resource Convergence · Fund & gap tracker" />
        <div className="p-3 space-y-3">
          <FundLedgerPanel />
          <div className="glass rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
            School-level cost data flows in automatically from the live survey as soon as cost fields are submitted.
            Until then, track collected funds and resource gaps above — who gave, when and for what purpose.
          </div>
        </div>
      </div>
    );
  return mode === "macro" ? <Macro fins={fins} /> : <Micro fins={fins} />;
}

/* ============================== shared bits ============================== */
const COLORS = [
  "oklch(0.72 0.21 255)", "oklch(0.82 0.19 175)", "oklch(0.84 0.2 155)",
  "oklch(0.62 0.22 285)", "oklch(0.85 0.18 75)", "oklch(0.68 0.24 22)", "oklch(0.86 0.16 200)",
];

function Counter({ value, format = inr }: { value: number; format?: (v: number) => string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="tabular-nums"
    >
      {format(value)}
    </motion.span>
  );
}

function KpiCard({ icon, label, value, sub, accent, ring }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent: string; ring?: number;
}) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="text-2xl font-bold mt-2" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      {ring !== undefined && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ring)}%`, background: accent, boxShadow: `0 0 8px ${accent}` }} />
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

function dlCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const b = new Blob([csv], { type: "text/csv" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}

/* ================================ MACRO ================================ */
function Macro({ fins }: { fins: SchoolFinance[] }) {
  const { t } = useI18n();
  const state = useMemo(() => aggregateState(fins), [fins]);
  const { entries: ledger } = useFundLedger();
  const dist = useMemo(() => aggregateFinanceByDistrict(fins), [fins]);
  const months = useMemo(() => monthlyTrendFromLedger(ledger), [ledger]);
  const term = useMemo(() => termStatus(state), [state]);
  const ai = useMemo(() => stateAiSummary(state, dist), [state, dist]);

  const leaders = {
    invest: [...dist].sort((a, b) => b.required - a.required)[0],
    converge: [...dist].sort((a, b) => b.convergence - a.convergence)[0],
    efficient: [...dist].sort((a, b) => b.efficiency - a.efficiency)[0],
    gap: [...dist].sort((a, b) => b.gap - a.gap)[0],
  };

  const treemap = dist.map((d) => ({ name: d.district, size: Math.max(1, d.required), conv: d.convergence }));

  // Dynamic, padded axis domains so the scatter never collapses into one spot.
  const padDomain = (vals: number[], pad: number, hardMax: number): [number, number] => {
    if (!vals.length) return [0, hardMax];
    const lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) return [Math.max(0, lo - pad), Math.min(hardMax + pad, hi + pad)];
    const span = hi - lo;
    return [Math.max(0, Math.floor(lo - span * 0.15 - 2)), Math.ceil(hi + span * 0.15 + 2)];
  };
  const convDomain = padDomain(dist.map((d) => d.convergence), 10, 120);
  const effDomain = padDomain(dist.map((d) => d.efficiency), 10, 100);
  const overall = [
    { name: "Convergence", value: state.convergence, fill: COLORS[0] },
    { name: "Utilisation", value: Math.round((state.utilized / Math.max(1, state.mobilized)) * 100), fill: COLORS[1] },
    { name: "Health", value: state.health, fill: COLORS[2] },
    { name: "Efficiency", value: state.efficiency, fill: COLORS[3] },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={t("fin.title")} subtitle={t("fin.macroSub")} />
      <div className="p-3 space-y-3">
        {/* Manual fund & resource-gap ledger */}
        <FundLedgerPanel />
        {/* SECTION 1 — state overview KPIs */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard icon={<Wallet className="h-4 w-4" />} label={t("fin.capital")} value={<Counter value={state.capitalTotal} />} sub={t("fin.capitalSub")} accent={COLORS[0]} />
          <KpiCard icon={<Coins className="h-4 w-4" />} label={t("fin.opex")} value={<Counter value={state.opexTotal} />} sub={t("fin.opexSub")} accent={COLORS[1]} />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={t("fin.mobilized")} value={<Counter value={state.mobilized} />} sub={`${state.convergence}% ${t("fin.ofRequired")}`} accent={COLORS[2]} ring={state.convergence} />
          <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label={t("fin.gap")} value={<Counter value={state.gap} />} sub={`${t("fin.required")}: ${inr(state.required)}`} accent={COLORS[5]} ring={Math.round((state.gap / Math.max(1, state.required)) * 100)} />
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          {/* Waterfall-style required vs mobilized vs gap */}
          <Section title={t("fin.deficit")} icon={<ArrowDownRight className="h-4 w-4 text-[var(--danger)]" />} note={t("live.now")}>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={[
                  { name: t("fin.required"), v: state.required, fill: COLORS[6] },
                  { name: t("fin.mobilized"), v: state.mobilized, fill: COLORS[2] },
                  { name: t("fin.utilized"), v: state.utilized, fill: COLORS[1] },
                  { name: t("fin.gap"), v: state.gap, fill: COLORS[5] },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                    {[COLORS[6], COLORS[2], COLORS[1], COLORS[5]].map((c, i) => <Cell key={i} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Convergence pulse radial */}
          <Section title={t("fin.pulse")} icon={<Gauge className="h-4 w-4 text-[var(--cyan)]" />}>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="25%" outerRadius="100%" data={overall} startAngle={210} endAngle={-30}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={10} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* SECTION 2 — resource convergence: source flow + sunburst-ish */}
        <div className="grid lg:grid-cols-2 gap-3">
          <Section title={t("fin.sources")} icon={<Layers className="h-4 w-4 text-[var(--aurora)]" />} note={t("fin.flow")}>
            <div className="space-y-2">
              {state.bySource.sort((a, b) => b.value - a.value).map((s, i) => {
                const pct = Math.round((s.value / state.mobilized) * 100);
                return (
                  <div key={s.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{SOURCE_LABELS[s.key as SourceKey]}</span>
                      <span className="font-semibold tabular-nums">{inr(s.value)} · {pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden bg-white/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05 }}
                        className="h-full rounded-full" style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t("fin.capitalSplit")} icon={<Wallet className="h-4 w-4 text-[var(--cyan)]" />}>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={state.byCapital} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {state.byCapital.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* SECTION 3 — district leaderboard + treemap + bubble */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Leader icon={<Building2 className="h-4 w-4" />} label={t("fin.topInvest")} name={leaders.invest?.district} value={inr(leaders.invest?.required ?? 0)} accent={COLORS[0]} />
          <Leader icon={<Trophy className="h-4 w-4" />} label={t("fin.topConverge")} name={leaders.converge?.district} value={`${leaders.converge?.convergence ?? 0}%`} accent={COLORS[2]} />
          <Leader icon={<Target className="h-4 w-4" />} label={t("fin.mostEff")} name={leaders.efficient?.district} value={`${leaders.efficient?.efficiency ?? 0}%`} accent={COLORS[1]} />
          <Leader icon={<AlertTriangle className="h-4 w-4" />} label={t("fin.largestGap")} name={leaders.gap?.district} value={inr(leaders.gap?.gap ?? 0)} accent={COLORS[5]} />
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <Section title={t("fin.treemap")} icon={<Layers className="h-4 w-4 text-[var(--indigo-glow)]" />} note={t("fin.byRequirement")}>
            <div className="h-[320px]">
              <ResponsiveContainer>
                <Treemap data={treemap} dataKey="size" nameKey="name" aspectRatio={4 / 3}
                  isAnimationActive={false} stroke="oklch(0.98 0.01 240)" content={<TreemapCell />} />
              </ResponsiveContainer>
            </div>
          </Section>
          <Section title={t("fin.bubble")} icon={<Target className="h-4 w-4 text-[var(--cyan)]" />} note={t("fin.bubbleNote")}>
            <div className="h-[320px]">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.05 260 / 0.18)" />
                  <XAxis type="number" dataKey="convergence" name="Convergence" unit="%" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} domain={convDomain} allowDecimals={false}
                    label={{ value: "Convergence %", position: "insideBottom", offset: -10, fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis type="number" dataKey="efficiency" name="Efficiency" unit="%" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} domain={effDomain} allowDecimals={false}
                    label={{ value: "Efficiency %", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <ZAxis type="number" dataKey="required" range={[80, 600]} name="Required" />
                  <Tooltip formatter={(v: number, n: string) => n === "Required" ? inrFull(v) : `${v}%`}
                    labelFormatter={() => ""}
                    cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={dist} isAnimationActive={false}>
                    {dist.map((d, i) => <Cell key={d.districtId} fill={COLORS[i % COLORS.length]} fillOpacity={0.78} />)}
                    <LabelList dataKey="district" position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* full leaderboard table */}
        <Section title={t("fin.districtLeaderboard")} icon={<Trophy className="h-4 w-4 text-[var(--warn)]" />}
          note={`${dist.length} ${t("fin.districts")}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-3">{t("fin.district")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.capital")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.opex")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.mobilized")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.gap")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.convergence")}</th>
                  <th className="py-2 pl-2">{t("fin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {[...dist].sort((a, b) => b.required - a.required).map((d) => (
                  <tr key={d.districtId} className="border-b border-border/30 hover:bg-white/[0.03]">
                    <td className="py-2 pr-3 font-medium">{d.district}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.capitalTotal)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.opexTotal)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.mobilized)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--danger)]">{inr(d.gap)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{d.convergence}%</td>
                    <td className="py-2 pl-2"><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* SECTION 4 — monthly trends */}
        <Section title={t("fin.monthly")} icon={<TrendingUp className="h-4 w-4 text-[var(--aurora)]" />} note={t("fin.fiscalYear")}>
          <div className="h-[320px]">
            <ResponsiveContainer>
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="gMob" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS[2]} stopOpacity={0.5} /><stop offset="100%" stopColor={COLORS[2]} stopOpacity={0} /></linearGradient>
                  <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.5} /><stop offset="100%" stopColor={COLORS[1]} stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={66} />
                <Tooltip formatter={(v: number) => inrFull(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="mobilized" name={t("fin.mobilized")} stroke={COLORS[2]} fill="url(#gMob)" />
                <Area type="monotone" dataKey="utilized" name={t("fin.utilized")} stroke={COLORS[1]} fill="url(#gUtil)" />
                <Line type="monotone" dataKey="capital" name={t("fin.capital")} stroke={COLORS[0]} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="opex" name={t("fin.opex")} stroke={COLORS[3]} dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* SECTION 5 — mid/final term tracker */}
        <div className="grid lg:grid-cols-2 gap-3">
          {([["mid", t("fin.midTerm")], ["final", t("fin.finalTerm")]] as const).map(([k, label]) => {
            const ts = term[k];
            const rows: [string, number][] = [
              [t("fin.planned"), ts.planned], [t("fin.allocated"), ts.allocated],
              [t("fin.mobilized"), ts.mobilized], [t("fin.utilized"), ts.utilized],
            ];
            return (
              <Section key={k} title={label} icon={<Target className="h-4 w-4 text-[var(--cyan)]" />}>
                <div className="space-y-3">
                  {rows.map(([rl, v], i) => (
                    <div key={rl}>
                      <div className="flex justify-between text-xs mb-1"><span>{rl}</span><span className="font-semibold tabular-nums">{inr(v)}</span></div>
                      <div className="h-2 rounded-full overflow-hidden bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.round((v / ts.planned) * 100)}%`, background: COLORS[i] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })}
        </div>

        {/* SECTION 6 — AI summary + export */}
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-20" style={{ background: COLORS[3] }} />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--aurora)]" /> {t("fin.aiSummary")}</h3>
            <button onClick={() => dlCsv("odisha-financial-intelligence.csv", dist as any)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass-soft hover:neon-ring transition">
              <Download className="h-3.5 w-3.5" /> {t("fin.export")}
            </button>
          </div>
          <ul className="space-y-2">
            {ai.map((line, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, conv } = props;
  if (!(width > 0) || !(height > 0)) return null;
  // Blue palette — darker blue = stronger convergence. White text for contrast.
  const cv = typeof conv === "number" ? conv : 0;
  const c = cv >= 80 ? "oklch(0.42 0.17 255)"
    : cv >= 60 ? "oklch(0.52 0.18 250)"
    : cv >= 40 ? "oklch(0.62 0.17 245)"
    : "oklch(0.72 0.13 240)";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={c} fillOpacity={0.95} stroke="oklch(0.98 0.01 240)" strokeWidth={1} />
      {width > 54 && height > 26 && (
        <text x={x + 6} y={y + 17} fontSize={11} fill="#ffffff" fontWeight={700}>{name}</text>
      )}
      {width > 54 && height > 42 && (
        <text x={x + 6} y={y + 32} fontSize={10} fill="#ffffff" fillOpacity={0.92}>{cv}%</text>
      )}
    </g>
  );
}

function Leader({ icon, label, name, value, accent }: { icon: React.ReactNode; label: string; name?: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><span style={{ color: accent }}>{icon}</span>{label}</div>
      <div className="text-lg font-bold mt-1.5 truncate">{name ?? "—"}</div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: SchoolFinance["status"] }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `color-mix(in oklab, ${STATUS_COLOR[status]} 20%, transparent)`, color: STATUS_COLOR[status] }}>
      {status}
    </span>
  );
}

/* ================================ MICRO ================================ */
function Micro({ fins }: { fins: SchoolFinance[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<SchoolFinance | null>(null);

  const districts = useMemo(() => Array.from(new Set(fins.map((f) => f.district))).sort(), [fins]);
  const list = useMemo(() => fins.filter((f) =>
    (q === "" || f.name.toLowerCase().includes(q.toLowerCase()) || f.udise.includes(q) || f.block.toLowerCase().includes(q.toLowerCase())) &&
    (district === "all" || f.district === district) &&
    (status === "all" || f.status === status),
  ).slice(0, 120), [fins, q, district, status]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={t("fin.title")} subtitle={t("fin.microSub")} />
      <div className="p-3 space-y-3">
        {/* filters */}
        <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[var(--cyan)]" />
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("fin.search")}
              className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">{t("fin.allDistricts")}</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">{t("fin.allStatus")}</option>
            {["Excellent", "Good", "Moderate", "Weak", "Critical"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => dlCsv("school-funding-report.csv", list.map(({ capital, opex, sources, ...r }) => r) as any)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
            <Download className="h-3.5 w-3.5" /> {t("fin.export")}
          </button>
          <div className="text-[11px] text-muted-foreground ml-auto">{list.length} / {fins.length.toLocaleString()}</div>
        </div>

        {/* air-ticket style cards */}
        <div className="grid lg:grid-cols-2 gap-3">
          {list.map((f, i) => <FinanceTicket key={f.udise} f={f} index={i} onClick={() => setSelected(f)} t={t} />)}
        </div>
      </div>

      {selected && <SchoolDetail f={selected} onClose={() => setSelected(null)} t={t} />}
    </div>
  );
}

function FinanceTicket({ f, index, onClick, t }: { f: SchoolFinance; index: number; onClick: () => void; t: (k: string) => string }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.015, 0.3) }}
      onClick={onClick}
      className="text-left relative grid grid-cols-[1fr_auto] gap-0 glass rounded-2xl overflow-hidden hover:neon-ring transition"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--cyan)]">
          <Plane className="h-3 w-3" /> {f.block} · UDISE {f.udise}
        </div>
        <h3 className="text-base font-bold mt-1 leading-tight truncate">{f.name}</h3>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Mini label={t("fin.capital")} v={inr(f.capitalTotal)} accent={COLORS[0]} />
          <Mini label={t("fin.opex")} v={inr(f.opexTotal)} accent={COLORS[1]} />
          <Mini label={t("fin.mobilized")} v={inr(f.mobilized)} accent={COLORS[2]} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Mini label={t("fin.gap")} v={inr(f.gap)} accent={COLORS[5]} />
          <Mini label={t("fin.convergence")} v={`${f.convergence}%`} accent={COLORS[3]} />
        </div>
      </div>
      {/* perforated right stub */}
      <div className="relative w-[120px] p-4 grid place-items-center border-l border-dashed border-[oklch(0.85_0.2_195/0.25)] bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="absolute -left-2 top-2 h-4 w-4 rounded-full bg-[var(--background)]" />
        <div className="absolute -left-2 bottom-2 h-4 w-4 rounded-full bg-[var(--background)]" />
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("fin.health")}</div>
          <div className="text-3xl font-bold" style={{ color: STATUS_COLOR[f.status] }}>{f.healthScore}</div>
          <StatusPill status={f.status} />
        </div>
      </div>
    </motion.button>
  );
}

function Mini({ label, v, accent }: { label: string; v: string; accent: string }) {
  return (
    <div className="glass-soft rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums" style={{ color: accent }}>{v}</div>
    </div>
  );
}

function SchoolDetail({ f, onClose, t }: { f: SchoolFinance; onClose: () => void; t: (k: string) => string }) {
  const ai = schoolAiSummary(f);
  const capitalData = CAPITAL_KEYS.map((k) => ({ name: CAPITAL_LABELS[k as CapitalKey], value: f.capital[k] }));
  const opexData = OPEX_KEYS.map((k) => ({ name: OPEX_LABELS[k as OpexKey], value: f.opex[k] }));
  const sourceData = SOURCE_KEYS.map((k) => ({ name: SOURCE_LABELS[k as SourceKey], value: f.sources[k] }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto scroll-invisible p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cyan)]">{f.block} · UDISE {f.udise}</div>
            <h2 className="text-xl font-bold">{f.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-3 py-1 rounded-lg glass-soft">✕</button>
        </div>

        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <KpiCard icon={<Wallet className="h-4 w-4" />} label={t("fin.required")} value={inr(f.required)} accent={COLORS[6]} />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={t("fin.mobilized")} value={inr(f.mobilized)} accent={COLORS[2]} ring={f.convergence} />
          <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label={t("fin.gap")} value={inr(f.gap)} accent={COLORS[5]} />
          <KpiCard icon={<Gauge className="h-4 w-4" />} label={t("fin.efficiency")} value={`${f.efficiencyScore}`} accent={COLORS[1]} ring={f.efficiencyScore} />
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <DetailChart title={t("fin.capitalBreakdown")} data={capitalData} />
          <DetailChart title={t("fin.opexBreakdown")} data={opexData} />
          <DetailChart title={t("fin.sourceBreakdown")} data={sourceData} />
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-[var(--aurora)]" /> {t("fin.aiSchool")}</h3>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <AiCol title={t("fin.strengths")} items={ai.strengths} color={COLORS[2]} />
            <AiCol title={t("fin.weaknesses")} items={ai.weaknesses} color={COLORS[5]} />
            <AiCol title={t("fin.recommend")} items={ai.recommendations} color={COLORS[0]} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => dlCsv(`school-${f.udise}-finance.csv`, [{ ...f, capital: undefined, opex: undefined, sources: undefined }] as any)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
            <Download className="h-3.5 w-3.5" /> {t("fin.export")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailChart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs font-semibold mb-2">{title}</div>
      <div className="h-[170px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => inrFull(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 space-y-0.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 truncate"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
            <span className="tabular-nums font-medium">{inr(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiCol({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color }}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />{it}
          </li>
        ))}
      </ul>
    </div>
  );
}
