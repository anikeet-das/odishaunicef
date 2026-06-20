import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { useRealFinance, exportCsv, type AiPriority, type AiNote } from "@/lib/data/real-finance";
import { Sparkles, Search, Download, AlertOctagon, AlertTriangle, Info } from "lucide-react";

export const Route = createFileRoute("/ai-notes")({
  head: () => ({
    meta: [
      { title: "AI Notes Center · CR-SAP Odisha" },
      { name: "description", content: "Auto-classified follow-up notes for non-numeric or missing financial entries in form responses." },
    ],
  }),
  component: Page,
});

const PRIORITY_COLOR: Record<AiPriority, string> = {
  High: "var(--danger)", Medium: "var(--warn)", Low: "var(--cyan)",
};
const PRIORITY_ICON: Record<AiPriority, React.ReactNode> = {
  High: <AlertOctagon className="h-3.5 w-3.5" />,
  Medium: <AlertTriangle className="h-3.5 w-3.5" />,
  Low: <Info className="h-3.5 w-3.5" />,
};

function Page() {
  const fin = useRealFinance();
  if (!fin) return <LoadingShell title="AI Notes Center" subtitle="Form data quality" />;
  if (fin.schools.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="AI Notes Center" subtitle="No responses yet" />
        <AwaitingData />
      </div>
    );
  }
  return <NotesView notes={fin.notes} />;
}

function NotesView({ notes }: { notes: AiNote[] }) {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<"all" | AiPriority>("all");
  const [district, setDistrict] = useState("all");

  const districts = useMemo(() => Array.from(new Set(notes.map((n) => n.district))).sort(), [notes]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return notes
      .filter((n) =>
        (!ql || n.udise.toLowerCase().includes(ql) || n.schoolName.toLowerCase().includes(ql) || n.rawValue.toLowerCase().includes(ql)) &&
        (priority === "all" || n.priority === priority) &&
        (district === "all" || n.district === district),
      )
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [notes, q, priority, district]);

  const counts = {
    total: notes.length,
    high: notes.filter((n) => n.priority === "High").length,
    medium: notes.filter((n) => n.priority === "Medium").length,
    low: notes.filter((n) => n.priority === "Low").length,
  };

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="AI Notes Center" subtitle="Auto-classified data-quality follow-ups" />
      <div className="p-3 space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total notes" value={counts.total} accent="var(--cyan)" icon={<Sparkles className="h-4 w-4" />} />
          <SummaryCard label="High priority" value={counts.high} accent={PRIORITY_COLOR.High} icon={PRIORITY_ICON.High} />
          <SummaryCard label="Medium priority" value={counts.medium} accent={PRIORITY_COLOR.Medium} icon={PRIORITY_ICON.Medium} />
          <SummaryCard label="Low priority" value={counts.low} accent={PRIORITY_COLOR.Low} icon={PRIORITY_ICON.Low} />
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by School ID / name / comment…"
              className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">All districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => exportCsv("ai-notes.csv", filtered.map((n) => ({
            "School ID": n.udise, "School Name": n.schoolName, "District": n.district,
            "Field": n.fieldLabel, "Original Comment": n.rawValue, "AI Summary": n.summary,
            "Suggested Action": n.action, "Priority": n.priority, "Priority Score": n.priorityScore,
            "Timestamp": new Date(n.timestamp).toISOString(),
          })))}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass-soft hover:neon-ring transition">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <div className="text-[11px] text-muted-foreground ml-auto">{filtered.length} / {notes.length}</div>
        </div>

        {/* Notes list */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
            No notes match the current filters. All financial entries appear to be clean here.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((n) => (
              <article key={n.id} className="glass rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl opacity-25" style={{ background: PRIORITY_COLOR[n.priority] }} />
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `color-mix(in oklab, ${PRIORITY_COLOR[n.priority]} 20%, transparent)`, color: PRIORITY_COLOR[n.priority] }}>
                    {PRIORITY_ICON[n.priority]} {n.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Score {n.priorityScore}/10</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{n.fieldLabel}</span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">UDISE {n.udise} · {n.district}</div>
                  <h3 className="font-semibold leading-tight">{n.schoolName}</h3>
                </div>
                <div className="glass-soft rounded-lg px-3 py-2 text-xs">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">User comment</div>
                  <div className="font-mono">{n.rawValue || <span className="italic text-muted-foreground">(empty)</span>}</div>
                </div>
                <div className="text-xs">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">AI summary</div>
                  {n.summary}
                </div>
                <div className="text-xs">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Suggested action</div>
                  <span className="text-[var(--aurora)]">{n.action}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="text-3xl font-bold mt-1 tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}
