import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, type School } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { useViewMode } from "@/components/layout/view-mode";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Sparkles, Search } from "lucide-react";

export const Route = createFileRoute("/tech")({
  head: () => ({ meta: [{ title: "Tech Analysis · CR-SAP Odisha" }] }),
  component: Page,
});

/** Deterministic synthetic tech metrics derived from school hash so the page is reproducible. */
function techFor(s: School) {
  const h = (str: string) => { let x = 0; for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0; return Math.abs(x); };
  const a = h(s.udise);
  return {
    internet: 40 + (a % 60),
    smartClass: 25 + ((a >> 3) % 70),
    devices: 30 + ((a >> 5) % 60),
    aiReadiness: 15 + ((a >> 7) % 70),
    literacy: 30 + ((a >> 9) % 60),
    infra: 30 + ((a >> 11) % 65),
  };
}

function Page() {
  const { data: schools } = useSchools();
  const { mode } = useViewMode();
  if (!schools) return <LoadingShell title="Tech Analysis" subtitle="Technology readiness" />;
  return mode === "macro" ? <Macro schools={schools} /> : <Micro schools={schools} />;
}

function Macro({ schools }: { schools: School[] }) {
  const [scope, setScope] = useState<"state" | "district">("state");
  const enriched = useMemo(() => schools.map((s) => ({ s, t: techFor(s) })), [schools]);
  const avg = (k: keyof ReturnType<typeof techFor>) => Math.round(enriched.reduce((a, e) => a + e.t[k], 0) / enriched.length);

  const radial = [
    { name: "Internet", value: avg("internet"), fill: "oklch(0.86 0.16 200)" },
    { name: "Smart class", value: avg("smartClass"), fill: "oklch(0.72 0.21 255)" },
    { name: "Devices", value: avg("devices"), fill: "oklch(0.78 0.14 190)" },
    { name: "AI readiness", value: avg("aiReadiness"), fill: "oklch(0.62 0.22 285)" },
    { name: "Digital literacy", value: avg("literacy"), fill: "oklch(0.84 0.2 155)" },
    { name: "Infra quality", value: avg("infra"), fill: "oklch(0.85 0.18 75)" },
  ];

  const byDistrict = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const { s, t } of enriched) {
      const k = s.district;
      if (!map.has(k)) map.set(k, { sum: 0, n: 0 });
      const e = map.get(k)!;
      e.sum += (t.internet + t.smartClass + t.devices + t.aiReadiness + t.literacy + t.infra) / 6;
      e.n++;
    }
    return Array.from(map.entries()).map(([d, v]) => ({ d, readiness: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.readiness - a.readiness).slice(0, 12);
  }, [enriched]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Tech Analysis" subtitle="Technology readiness · MacroView"
              uploadTab="Tech Analysis" uploadRecommendedColumns={["School_Name", "UDISE", "Internet_Mbps", "Smart_Class", "Device_Count", "AI_Readiness"]} />
      <div className="p-3 space-y-3">
        <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full glass-soft p-1 text-xs">
            {(["state", "district"] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className={`px-3 py-1.5 rounded-full transition ${scope === s ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground"}`}>
                {s === "state" ? "Odisha-wide" : "District-wise"}
              </button>
            ))}
          </div>
        </div>
        {scope === "state" ? (
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4 h-[50vh]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">State readiness</div>
              <ResponsiveContainer>
                <RadialBarChart innerRadius="20%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={8} />
                  <Tooltip />
                  <Legend iconType="circle" />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-[var(--aurora)]" /><div className="text-sm font-semibold">AI synthesis</div></div>
              <p className="text-xs leading-relaxed">
                Odisha's average technology readiness sits at <b className="text-[var(--cyan)]">{Math.round(radial.reduce((s, r) => s + r.value, 0) / radial.length)}%</b>.
                AI readiness is the smallest gear (<b>{avg("aiReadiness")}%</b>) — accelerate via teacher AI-fluency cohorts in tribal blocks.
                Smart classrooms and broadband expand fastest with district-led MoUs.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 h-[60vh]">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Top 12 districts · composite readiness</div>
            <ResponsiveContainer>
              <BarChart data={byDistrict}>
                <CartesianGrid strokeDasharray="3 6" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="readiness" radius={[6, 6, 0, 0]} fill="oklch(0.72 0.21 255)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Micro({ schools }: { schools: School[] }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const districts = useMemo(() => Array.from(new Set(schools.map((s) => s.district))).sort(), [schools]);
  const rows = useMemo(() => schools
    .filter((s) => (district === "all" || s.district === district) && (!q || `${s.name} ${s.udise} ${s.district}`.toLowerCase().includes(q.toLowerCase())))
    .slice(0, 500)
    .map((s) => ({ s, t: techFor(s) })),
    [schools, q, district]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Tech Analysis" subtitle="Per-school readiness · MicroView"
              uploadTab="Tech Analysis" uploadRecommendedColumns={["School_Name", "UDISE", "Internet_Mbps", "Smart_Class", "Device_Count", "AI_Readiness"]} />
      <div className="p-3 space-y-3">
        <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school name, UDISE+, district…"
                   className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm">
            <option value="all">All districts</option>
            {districts.map((d) => <option key={d}>{d}</option>)}
          </select>
          <span className="text-[11px] text-muted-foreground ml-auto">{rows.length.toLocaleString()} schools</span>
        </div>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="max-h-[68vh] overflow-auto scroll-invisible">
            <table className="w-full text-sm">
              <thead className="sticky top-0 backdrop-blur bg-[oklch(0.18_0.04_220/0.65)] text-[11px] uppercase tracking-wider text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2.5">School</th>
                  <th className="px-3 py-2.5">District</th>
                  <th className="px-3 py-2.5 text-center">Internet</th>
                  <th className="px-3 py-2.5 text-center">Smart class</th>
                  <th className="px-3 py-2.5 text-center">Devices</th>
                  <th className="px-3 py-2.5 text-center">AI ready</th>
                  <th className="px-3 py-2.5 text-center">Literacy</th>
                  <th className="px-3 py-2.5 text-center">Infra</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, t }) => (
                  <tr key={s.udise} className="border-t border-border/30 hover:bg-primary/5">
                    <td className="px-4 py-2"><div className="font-medium truncate max-w-[26ch]">{s.name}</div><div className="text-[10px] text-muted-foreground">{s.udise}</div></td>
                    <td className="px-3 py-2 text-muted-foreground">{s.district}</td>
                    {(["internet", "smartClass", "devices", "aiReadiness", "literacy", "infra"] as const).map((k) => (
                      <td key={k} className="px-3 py-2 text-center"><BarCell v={t[k]} /></td>
                    ))}
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

function BarCell({ v }: { v: number }) {
  const color = v >= 70 ? "var(--aurora)" : v >= 50 ? "var(--cyan)" : v >= 30 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="inline-flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full" style={{ width: `${v}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{v}</span>
    </div>
  );
}