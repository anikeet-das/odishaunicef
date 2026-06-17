import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingShell } from "@/components/data/LoadingShell";
import { useViewMode } from "@/components/layout/view-mode";
import { useI18n } from "@/lib/i18n";
import {
  useFinance, aggregateState, aggregateFinanceByDistrict,
  schoolAiSummary, inr, inrFull, STATUS_COLOR,
  CAPITAL_KEYS, OPEX_KEYS, SOURCE_KEYS, CAPITAL_LABELS, OPEX_LABELS, SOURCE_LABELS,
  type SchoolFinance, type CapitalKey, type OpexKey, type SourceKey,
} from "@/lib/data/finance";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie,
} from "recharts";
import { motion } from "framer-motion";
import {
  Sigma, Search, Download, Filter, Plane, Wallet, Coins, TrendingUp, AlertTriangle,
  Sparkles, Gauge, Building2, NotebookPen,
} from "lucide-react";
import { FundLedgerPanel } from "@/components/cr-sap/FundLedgerPanel";

export const Route = createFileRoute("/finance-sum")({
  head: () => ({
    meta: [
      { title: "Finance Sum · CR-SAP Odisha" },
      { name: "description", content: "Consolidated state, district and school-wise money summary." },
    ],
  }),
  component: Page,
});

const COLORS = [
  "oklch(0.72 0.21 255)", "oklch(0.82 0.19 175)", "oklch(0.84 0.2 155)",
  "oklch(0.62 0.22 285)", "oklch(0.85 0.18 75)", "oklch(0.68 0.24 22)", "oklch(0.86 0.16 200)",
];

function Page() {
  const fins = useFinance();
  const { mode } = useViewMode();
  if (!fins) return <LoadingShell title="Finance Sum" subtitle="Consolidated money summary" />;
  return mode === "macro" ? <Macro fins={fins} /> : <Micro fins={fins} />;
}

function dlCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const b = new Blob([csv], { type: "text/csv" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}

function SumCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"><span style={{ color: accent }}>{icon}</span>{label}</div>
      <div className="text-2xl font-bold mt-2 tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

/* ============================== MACRO ============================== */
function Macro({ fins }: { fins: SchoolFinance[] }) {
  const { t } = useI18n();
  const state = useMemo(() => aggregateState(fins), [fins]);
  const dist = useMemo(() => aggregateFinanceByDistrict(fins).sort((a, b) => b.required - a.required), [fins]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={t("fsum.title")} subtitle={t("fsum.macroSub")} />
      <div className="p-3 space-y-3">
        <LedgerNotebook />

        {/* Odisha as a whole */}
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Sigma className="h-4 w-4 text-[var(--cyan)]" /> {t("fsum.odishaWhole")}</h3>
          <div className="grid sm:grid-cols-3 xl:grid-cols-6 gap-2">
            <SumCard icon={<Wallet className="h-4 w-4" />} label={t("fin.capital")} value={inr(state.capitalTotal)} accent={COLORS[0]} />
            <SumCard icon={<Coins className="h-4 w-4" />} label={t("fin.opex")} value={inr(state.opexTotal)} accent={COLORS[1]} />
            <SumCard icon={<Sigma className="h-4 w-4" />} label={t("fin.required")} value={inr(state.required)} accent={COLORS[6]} />
            <SumCard icon={<TrendingUp className="h-4 w-4" />} label={t("fin.mobilized")} value={inr(state.mobilized)} accent={COLORS[2]} />
            <SumCard icon={<AlertTriangle className="h-4 w-4" />} label={t("fin.gap")} value={inr(state.gap)} accent={COLORS[5]} />
            <SumCard icon={<Gauge className="h-4 w-4" />} label={t("fin.convergence")} value={`${state.convergence}%`} accent={COLORS[3]} />
          </div>
        </div>

        {/* District-wise money visuals */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--aurora)]" /> {t("fsum.distRequired")}</h3>
              <button onClick={() => dlCsv("district-funding-report.csv", dist as any)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass-soft hover:neon-ring transition"><Download className="h-3.5 w-3.5" /> {t("fin.export")}</button>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer>
                <BarChart data={dist} layout="vertical" margin={{ left: 70 }}>
                  <XAxis type="number" tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 9 }} width={70} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Bar dataKey="required" radius={[0, 5, 5, 0]}>
                    {dist.map((d, i) => <Cell key={d.districtId} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> {t("fsum.distGap")}</h3>
            <div className="h-[360px]">
              <ResponsiveContainer>
                <BarChart data={[...dist].sort((a, b) => b.gap - a.gap)} layout="vertical" margin={{ left: 70 }}>
                  <XAxis type="number" tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 9 }} width={70} />
                  <Tooltip formatter={(v: number) => inrFull(v)} />
                  <Bar dataKey="gap" radius={[0, 5, 5, 0]} fill={COLORS[5]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* District money table */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">{t("fsum.distTable")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-3">{t("fin.district")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.capital")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.opex")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.required")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.mobilized")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.utilized")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.gap")}</th>
                  <th className="py-2 px-2 text-right">{t("fin.convergence")}</th>
                </tr>
              </thead>
              <tbody>
                {dist.map((d) => (
                  <tr key={d.districtId} className="border-b border-border/30 hover:bg-white/[0.03]">
                    <td className="py-2 pr-3 font-medium">{d.district}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.capitalTotal)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.opexTotal)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.required)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.mobilized)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(d.utilized)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--danger)]">{inr(d.gap)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{d.convergence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== MICRO ============================== */
function Micro({ fins }: { fins: SchoolFinance[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"required" | "gap" | "convergence">("required");
  const [selected, setSelected] = useState<SchoolFinance | null>(null);

  const districts = useMemo(() => Array.from(new Set(fins.map((f) => f.district))).sort(), [fins]);
  const list = useMemo(() => fins.filter((f) =>
    (q === "" || f.name.toLowerCase().includes(q.toLowerCase()) || f.udise.includes(q) || f.block.toLowerCase().includes(q.toLowerCase())) &&
    (district === "all" || f.district === district) &&
    (status === "all" || f.status === status),
  ).sort((a, b) => sort === "convergence" ? a.convergence - b.convergence : b[sort] - a[sort]).slice(0, 120),
    [fins, q, district, status, sort]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={t("fsum.title")} subtitle={t("fsum.microSub")} />
      <div className="p-3 space-y-3">
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
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="required">{t("fsum.sortRequired")}</option>
            <option value="gap">{t("fsum.sortGap")}</option>
            <option value="convergence">{t("fsum.sortConv")}</option>
          </select>
          <button onClick={() => dlCsv("school-funding-summary.csv", list.map(({ capital, opex, sources, ...r }) => r) as any)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
            <Download className="h-3.5 w-3.5" /> {t("fin.export")}
          </button>
          <div className="text-[11px] text-muted-foreground ml-auto">{list.length} / {fins.length.toLocaleString()}</div>
        </div>

        <p className="text-xs text-muted-foreground px-1">{t("fsum.hint")}</p>

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((f, i) => (
            <motion.button key={f.udise} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.012, 0.3) }}
              onClick={() => setSelected(f)}
              className="text-left relative glass rounded-2xl overflow-hidden hover:neon-ring transition p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--cyan)]"><Plane className="h-3 w-3" /> {f.block}</div>
              <h3 className="text-sm font-bold mt-1 truncate">{f.name}</h3>
              <div className="text-[10px] text-muted-foreground">UDISE {f.udise} · {f.district}</div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("fin.required")}</div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: COLORS[6] }}>{inr(f.required)}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `color-mix(in oklab, ${STATUS_COLOR[f.status]} 20%, transparent)`, color: STATUS_COLOR[f.status] }}>{f.status}</span>
                  <div className="text-[10px] text-muted-foreground mt-1">{t("fin.gap")} {inr(f.gap)}</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, f.convergence)}%`, background: STATUS_COLOR[f.status] }} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {selected && <Detail f={selected} onClose={() => setSelected(null)} t={t} />}
    </div>
  );
}

function Detail({ f, onClose, t }: { f: SchoolFinance; onClose: () => void; t: (k: string) => string }) {
  const ai = schoolAiSummary(f);
  const cap = CAPITAL_KEYS.map((k) => ({ name: CAPITAL_LABELS[k as CapitalKey], value: f.capital[k] }));
  const op = OPEX_KEYS.map((k) => ({ name: OPEX_LABELS[k as OpexKey], value: f.opex[k] }));
  const src = SOURCE_KEYS.map((k) => ({ name: SOURCE_LABELS[k as SourceKey], value: f.sources[k] }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto scroll-invisible p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--cyan)]">{f.block} · UDISE {f.udise}</div>
            <h2 className="text-xl font-bold">{f.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-3 py-1 rounded-lg glass-soft">✕</button>
        </div>
        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <SumCard icon={<Wallet className="h-4 w-4" />} label={t("fin.required")} value={inr(f.required)} accent={COLORS[6]} />
          <SumCard icon={<TrendingUp className="h-4 w-4" />} label={t("fin.mobilized")} value={inr(f.mobilized)} accent={COLORS[2]} />
          <SumCard icon={<Coins className="h-4 w-4" />} label={t("fin.utilized")} value={inr(f.utilized)} accent={COLORS[1]} />
          <SumCard icon={<AlertTriangle className="h-4 w-4" />} label={t("fin.gap")} value={inr(f.gap)} accent={COLORS[5]} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[[t("fin.capitalBreakdown"), cap], [t("fin.opexBreakdown"), op], [t("fin.sourceBreakdown"), src]].map(([title, data]) => (
            <div key={title as string} className="glass rounded-2xl p-4">
              <div className="text-xs font-semibold mb-2">{title as string}</div>
              <div className="h-[150px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data as any} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2}>
                      {(data as any[]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => inrFull(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-0.5 mt-1">
                {(data as any[]).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 truncate"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
                    <span className="tabular-nums font-medium">{inr(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-[var(--aurora)]" /> {t("fin.aiSchool")}</h3>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            {[[t("fin.strengths"), ai.strengths, COLORS[2]], [t("fin.weaknesses"), ai.weaknesses, COLORS[5]], [t("fin.recommend"), ai.recommendations, COLORS[0]]].map(([title, items, color]) => (
              <div key={title as string}>
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: color as string }}>{title as string}</div>
                <ul className="space-y-1.5">
                  {(items as string[]).map((it, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color as string }} />{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
