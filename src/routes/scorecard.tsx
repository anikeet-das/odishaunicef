import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { useSchools } from "@/lib/data/cces";
import { computeScorecard, loadComments, saveComment } from "@/lib/scoring/scorecard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Legend,
} from "recharts";
import { Award, Search, Download, Sparkles, ChevronLeft, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/scorecard")({
  head: () => ({ meta: [{ title: "Scorecard · CR-SAP Odisha" }] }),
  component: Page,
});

const C = { cyan: "oklch(0.86 0.16 200)", blue: "oklch(0.72 0.21 255)" };

function Page() {
  return <ModuleShell title="School Scorecard" subtitle="Holistic Evaluation · /100" macro={<Macro />} micro={<Micro />} />;
}

/* ------------------ MACRO: leaderboard ------------------ */
function Macro() {
  const { data: schools, isLoading } = useSchools();
  const scored = useMemo(() => (schools ?? []).map((s) => ({ s, ...computeScorecard(s) })), [schools]);
  const top = useMemo(() => [...scored].sort((a, b) => b.total - a.total).slice(0, 20), [scored]);
  const bottom = useMemo(() => [...scored].sort((a, b) => a.total - b.total).slice(0, 10), [scored]);
  const districtAvg = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    scored.forEach(({ s, total }) => {
      const e = m.get(s.district) ?? { sum: 0, n: 0 }; e.sum += total; e.n++; m.set(s.district, e);
    });
    return Array.from(m, ([district, v]) => ({ district: district.slice(0, 9), avg: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.avg - a.avg).slice(0, 15);
  }, [scored]);
  // Real score distribution across responding schools (no synthetic trend).
  const distribution = useMemo(() => {
    const bands = [
      { band: "0–20", min: 0, max: 20 },
      { band: "21–40", min: 21, max: 40 },
      { band: "41–60", min: 41, max: 60 },
      { band: "61–80", min: 61, max: 80 },
      { band: "81–100", min: 81, max: 100 },
    ];
    return bands.map((b) => ({
      band: b.band,
      schools: scored.filter(({ total }) => total >= b.min && total <= b.max).length,
    }));
  }, [scored]);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full grid place-items-center bg-gradient-to-br from-[var(--neon-cyan)] to-primary/60 shrink-0">
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Aurora · Ranking Synthesis</div>
            <p className="text-sm mt-1 leading-relaxed">
              State-wide average school score: <b className="text-[var(--cyan)]">{Math.round(scored.reduce((a, x) => a + x.total, 0) / Math.max(1, scored.length))}/100</b>. Top performer:
              <b className="ml-1">{top[0]?.s.name}</b> ({top[0]?.total}/100). Bottom decile clustered in tribal blocks — priority for AI-driven remediation.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Top 20 Schools · Leaderboard">
          <div className="max-h-[420px] overflow-auto scroll-invisible">
            <table className="w-full text-sm">
              <tbody>
                {top.map((r, i) => (
                  <tr key={r.s.udise} className="border-t border-border/20">
                    <td className="py-2 pl-2 w-8 text-[var(--cyan)] font-mono">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-2 truncate max-w-[24ch]">{r.s.name}</td>
                    <td className="py-2 text-muted-foreground text-xs">{r.s.district}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{r.total}<span className="text-muted-foreground text-[10px]">/100</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="District Average Score">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={districtAvg} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="district" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="avg" fill={C.cyan} radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Score Distribution · responding schools">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution}>
              <defs>
                <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis dataKey="band" tick={{ fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="schools" fill="url(#sgrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lowest 10 — Action Priority">
          <ul className="space-y-1.5">
            {bottom.map((r) => (
              <li key={r.s.udise} className="flex items-center justify-between rounded-lg glass-soft px-3 py-2 text-sm">
                <span className="truncate">{r.s.name} <span className="text-[10px] text-muted-foreground ml-1">{r.s.district}</span></span>
                <span className="font-semibold text-rose-300">{r.total}/100</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------ MICRO: per-school ------------------ */
function Micro() {
  const { data: schools, isLoading } = useSchools();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  useEffect(() => setCommentMap(loadComments()), []);

  const list = useMemo(() => {
    if (!schools) return [];
    const ql = q.toLowerCase();
    return schools.filter((s) => !ql || `${s.name} ${s.udise} ${s.district}`.toLowerCase().includes(ql)).slice(0, 200);
  }, [schools, q]);

  const sel = selected ? schools?.find((s) => s.udise === selected) ?? null : null;

  if (isLoading) return <LoadingBlock />;

  if (sel) {
    return <SchoolDetail school={sel} comment={commentMap[sel.udise] ?? ""}
                         onComment={(v) => { saveComment(sel.udise, v); setCommentMap(loadComments()); }}
                         onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-3">
      <Panel>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school, UDISE+, district…"
                 className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
        </div>
      </Panel>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((s) => {
          const sc = computeScorecard(s);
          return (
            <button key={s.udise} onClick={() => setSelected(s.udise)}
                    className="glass rounded-2xl p-4 text-left hover:bg-primary/5 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{s.district} · {s.location}</div>
                  <div className="font-semibold truncate">{s.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-[var(--cyan)]" style={{ textShadow: "0 0 18px var(--cyan)" }}>{sc.total}</div>
                  <div className="text-[10px] text-muted-foreground">/100</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted-foreground/15 overflow-hidden">
                <div className="h-full" style={{ width: `${sc.total}%`, background: "linear-gradient(90deg, var(--neon-cyan), var(--primary))" }} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground"><Award className="inline h-3 w-3 mr-1" />{"★".repeat(sc.rating)}{"☆".repeat(5 - sc.rating)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------ DETAIL ------------------ */
function SchoolDetail({ school, comment, onComment, onBack }: {
  school: any; comment: string; onComment: (v: string) => void; onBack: () => void;
}) {
  const sc = useMemo(() => computeScorecard(school), [school]);
  const ref = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState(comment);
  useEffect(() => setLocal(comment), [comment, school.udise]);

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    let y = 50;
    doc.setFontSize(18); doc.text("UNICEF · CR-SAP Odisha — School Scorecard", 40, y); y += 24;
    doc.setFontSize(11); doc.setTextColor(80);
    doc.text(`${school.name}`, 40, y); y += 14;
    doc.text(`UDISE+ ${school.udise}  ·  ${school.district}  ·  ${school.location}`, 40, y); y += 20;
    doc.setDrawColor(20, 120, 200); doc.setLineWidth(1.2); doc.line(40, y, W - 40, y); y += 18;
    doc.setTextColor(0); doc.setFontSize(28); doc.text(`Score: ${sc.total} / 100`, 40, y); y += 26;
    doc.setFontSize(11);
    doc.text(`Star Rating: ${"★".repeat(sc.rating)}${"☆".repeat(5 - sc.rating)}`, 40, y); y += 22;
    doc.setFontSize(12); doc.text("Parameter Breakdown", 40, y); y += 14;
    doc.setFontSize(10);
    sc.params.forEach((p) => {
      if (y > 770) { doc.addPage(); y = 50; }
      doc.setTextColor(40);
      doc.text(`${p.label}`, 40, y);
      doc.text(`${p.obtained}/${p.full}`, 320, y);
      doc.text(`${p.pct}%`, 380, y);
      doc.setTextColor(110); doc.text(p.evaluation, 430, y, { maxWidth: W - 470 });
      y += 16;
    });
    y += 8;
    if (y > 720) { doc.addPage(); y = 50; }
    doc.setFontSize(12); doc.setTextColor(0); doc.text("UNICEF Professional Comment", 40, y); y += 14;
    doc.setFontSize(10); doc.setTextColor(60);
    doc.text(local || "—", 40, y, { maxWidth: W - 80 }); y += 40;
    doc.setFontSize(12); doc.setTextColor(0); doc.text("AI Final Evaluation", 40, y); y += 14;
    doc.setFontSize(10); doc.setTextColor(60);
    const finalEval = sc.total >= 75 ? "Exemplary CR-SAP performance. Maintain trajectory."
                    : sc.total >= 55 ? "Solid baseline. Address mid-tier categories for jump to top tier."
                    : "Operational intervention recommended. Prioritise WASH + climate management.";
    doc.text(finalEval, 40, y, { maxWidth: W - 80 });
    doc.save(`scorecard-${school.udise}.pdf`);
  }

  return (
    <div className="space-y-4" ref={ref}>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="glass-soft rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-primary/10">
          <ChevronLeft className="h-4 w-4" /> All schools
        </button>
        <button onClick={exportPdf} className="ml-auto glass-soft rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-primary/10">
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{school.district} · {school.location}</div>
          <h2 className="text-xl font-semibold">{school.name}</h2>
          <div className="text-xs text-muted-foreground">UDISE+ {school.udise}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-[var(--cyan)]" style={{ textShadow: "0 0 24px var(--cyan)" }}>{sc.total}</div>
          <div className="text-[10px] text-muted-foreground">FINAL SCORE / 100</div>
          <div className="mt-1 text-amber-300">{"★".repeat(sc.rating)}<span className="text-muted-foreground">{"☆".repeat(5 - sc.rating)}</span></div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sc.params.map((p) => <ParamRing key={p.key} p={p} />)}
      </div>

      <Panel>
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">UNICEF Professional Comment</div>
        <textarea value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onComment(local)}
                  placeholder="Add official UNICEF remarks for this school…"
                  className="w-full min-h-[120px] glass-soft rounded-lg p-3 text-sm outline-none focus:neon-ring" />
      </Panel>

      <Panel>
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--cyan)]" /> Aurora AI Recommendations
        </div>
        <ul className="space-y-2 text-sm">
          {sc.params.filter(p => p.pct < 60).slice(0, 5).map(p => (
            <li key={p.key} className="rounded-lg glass-soft p-3">
              <b>{p.label}</b> <span className="text-muted-foreground text-xs">({p.pct}%)</span>
              <div className="text-xs text-muted-foreground mt-1">{p.evaluation}</div>
            </li>
          ))}
          {sc.params.every(p => p.pct >= 60) && (
            <li className="text-sm text-muted-foreground">All parameters above 60%. Maintain trajectory; pilot innovation initiatives.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

function ParamRing({ p }: { p: any }) {
  const r = 36, c = 2 * Math.PI * r;
  const dash = (p.pct / 100) * c;
  const color = p.pct >= 75 ? C.cyan : p.pct >= 50 ? C.blue : "oklch(0.75 0.18 20)";
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} fill="none" stroke="oklch(0.5 0.05 220 / 0.25)" strokeWidth={8} />
        <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`} transform="rotate(-90 44 44)" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{p.pct}%</text>
      </svg>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{p.label}</div>
        <div className="text-[11px] text-muted-foreground">{p.obtained}/{p.full} marks · weight {p.weightInTotal}</div>
        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.evaluation}</div>
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-4 ${className}`}>{children}</div>;
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">{title}</div>
      {children}
    </Panel>
  );
}
function LoadingBlock() {
  return <div className="h-[60vh] grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading scorecards…</div>;
}