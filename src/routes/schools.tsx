import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, type School, platformKpis, hazardBreakdown, aggregateByDistrict } from "@/lib/data/cces";
import { ODISHA_DISTRICTS } from "@/lib/data/odisha";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { X, GraduationCap, Building2, ShieldAlert, Droplets, Leaf, Star, Activity } from "lucide-react";
import { useViewMode } from "@/components/layout/view-mode";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  ScatterChart, Scatter, ZAxis, LineChart, Line, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: "School Explorer · CR-SAP Odisha" },
      { name: "description", content: "Search, filter and inspect every one of the 10,000 schools across Odisha." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useSchools();
  const { mode } = useViewMode();
  if (!data) return <LoadingShell title="School Explorer" subtitle="Schools" />;
  if (data.length === 0)
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="School Explorer" subtitle="Schools" />
        <AwaitingData />
      </div>
    );
  return mode === "macro" ? <Macro data={data} /> : <Micro data={data} />;
}

/* ============================ MACRO ============================ */
function Macro({ data }: { data: School[] }) {
  const k = platformKpis(data);
  const hz = hazardBreakdown(data).slice(0, 8);
  const districts = aggregateByDistrict(data);
  const scatter = districts.map((d) => ({ x: d.avgSust, y: d.avgHazard, z: d.schools, name: d.district }));
  const shvrBins = [0,1,2,3,4,5].map((star) => ({ star: star === 0 ? "Unrated" : `${star}★`, count: data.filter((s) => s.shvr === star).length }));
  const cards = [
    { icon: GraduationCap, label: "Schools",       v: k.total.toLocaleString(),    sub: "across 30 districts" },
    { icon: Activity,      label: "Students",      v: k.students.toLocaleString(), sub: "live enrolment" },
    { icon: Star,          label: "Avg SHVR",      v: `${k.avgShvr}★`,             sub: "2025-26 cycle" },
    { icon: Leaf,          label: "Sustainability",v: `${k.avgSust}%`,             sub: "CCES composite" },
    { icon: Droplets,      label: "Avg WASH",      v: `${k.avgWash}%`,             sub: "water · sanitation · hygiene" },
    { icon: ShieldAlert,   label: "Climate risk",  v: `${k.avgHazard}%`,           sub: "hazard exposure load" },
    { icon: Building2,     label: "CR-SAP %",      v: `${k.crsapPct}%`,            sub: "plan adoption" },
    { icon: Leaf,          label: "Green plan %",  v: `${k.greenPct}%`,            sub: "green-school adopters" },
  ];
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="School Explorer" subtitle="Macro · Statewide summary" />
      <div className="p-3 space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="glass rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10"><Icon className="h-20 w-20" /></div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold neon-text mt-1 tabular-nums">{c.v}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{c.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">SHVR star distribution</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={shvrBins}>
                  <XAxis dataKey="star" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {shvrBins.map((_, i) => <Cell key={i} fill={`oklch(0.78 0.2 ${20 + i * 30})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Top hazard exposure (% schools)</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={hz} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis type="category" dataKey="hazard" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={80} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="exposedPct" radius={[0, 6, 6, 0]} fill="oklch(0.78 0.2 25)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">District scatter · Sustainability vs Climate-risk · size = school count</h3>
          <div className="h-[360px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Sustainability" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} label={{ value: "Sustainability %", position: "insideBottom", offset: -2, fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis type="number" dataKey="y" name="Climate risk"   domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} label={{ value: "Climate risk %", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--muted-foreground)" }} />
                <ZAxis type="number" dataKey="z" range={[40, 320]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number, n: string) => [`${v}`, n]} labelFormatter={() => ""} />
                <Scatter data={scatter} fill="oklch(0.85 0.2 195)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ MICRO ============================ */
function Micro({ data }: { data: School[] }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [minShvr, setMinShvr] = useState(0);
  const [open, setOpen] = useState<School | null>(null);

  const filtered = useMemo(() => {
    return data.filter((s) =>
      (district === "all" || s.district === district) &&
      s.shvr >= minShvr &&
      (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.udise.includes(q))
    );
  }, [data, q, district, minShvr]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="School Explorer" subtitle="Micro · School-by-school" />
      <div className="p-3">
        <div className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or UDISE…"
              className="bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-72" />
            <select value={district} onChange={(e) => setDistrict(e.target.value)}
              className="bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none">
              <option value="all">All districts</option>
              {ODISHA_DISTRICTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              Min SHVR ★
              <input type="range" min={0} max={5} value={minShvr} onChange={(e) => setMinShvr(Number(e.target.value))} className="w-32" />
              <span className="tabular-nums">{minShvr}</span>
            </label>
            <div className="text-xs text-muted-foreground ml-auto">{filtered.length.toLocaleString()} of {data.length.toLocaleString()} schools</div>
          </div>

          <div className="overflow-x-auto max-h-[68vh]">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 bg-background/80 backdrop-blur">
                <tr>
                  <th className="text-left py-2 px-2">UDISE</th>
                  <th className="text-left py-2 px-2">School</th>
                  <th className="text-left py-2 px-2">District</th>
                  <th className="text-left py-2 px-2">Students</th>
                  <th className="text-left py-2 px-2">SHVR</th>
                  <th className="text-left py-2 px-2">Sust.</th>
                  <th className="text-left py-2 px-2">WASH</th>
                  <th className="text-left py-2 px-2">CR-SAP</th>
                  <th className="text-left py-2 px-2">Risk</th>
                  <th className="text-left py-2 px-2">Top hazard</th>
                  <th className="text-left py-2 px-2">Pulse</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((s) => (
                  <tr key={s.udise} className="border-t border-border/30 hover:bg-secondary/30 cursor-pointer" onClick={() => setOpen(s)}>
                    <td className="py-2 px-2 font-mono text-xs">{s.udise}</td>
                    <td className="py-2 px-2">{s.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{s.district}</td>
                    <td className="py-2 px-2 tabular-nums">{s.totalStudents}</td>
                    <td className="py-2 px-2">{"★".repeat(s.shvr) || "—"}</td>
                    <td className="py-2 px-2 tabular-nums">{s.sustainabilityScore}%</td>
                    <td className="py-2 px-2 tabular-nums">{s.washScore}%</td>
                    <td className="py-2 px-2 text-xs">{s.hasCRSAP ? "✓" : "—"}</td>
                    <td className="py-2 px-2 tabular-nums">{s.hazardScore === null ? "NA" : `${s.hazardScore}%`}</td>
                    <td className="py-2 px-2 text-xs">{s.topHazard ?? "—"}</td>
                    <td className="py-2 px-2 w-[120px]"><HazardPulse seed={s.udise} top={s.topHazard} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && <div className="text-xs text-muted-foreground mt-2 text-center">Showing first 500 — refine filters to narrow.</div>}
          </div>
        </div>
      </div>

      {open && <Drawer school={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Tiny inline live hazard pulse — deterministic synthetic series per UDISE. */
function HazardPulse({ seed, top }: { seed: string; top: string | null }) {
  const data = useMemo(() => {
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const rng = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
    return Array.from({ length: 20 }, (_, i) => ({ i, v: Math.round(30 + rng() * 70) }));
  }, [seed]);
  return (
    <div className="h-6">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={top ? "oklch(0.85 0.22 25)" : "oklch(0.78 0.18 200)"} strokeWidth={1.4} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Drawer({ school, onClose }: { school: School; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50" />
      <aside className="w-[min(520px,90vw)] h-full bg-background border-l border-border shadow-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">UDISE {school.udise}</div>
            <h3 className="text-xl font-semibold neon-text">{school.name}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info k="District" v={school.district} />
          <Info k="Management" v={school.management} />
          <Info k="Category" v={school.category} />
          <Info k="Location" v={school.location} />
          <Info k="Established" v={String(school.established || "—")} />
          <Info k="Board" v={school.board} />
          <Info k="Boys" v={String(school.boys)} />
          <Info k="Girls" v={String(school.girls)} />
          <Info k="CWSN" v={String(school.cwsn)} />
          <Info k="Staff" v={`${school.totalStaff} (${school.maleStaff}M/${school.femaleStaff}F)`} />
          <Info k="SHVR 25-26" v={"★".repeat(school.shvr) || "Unrated"} />
          <Info k="Sustainability" v={`${school.sustainabilityScore}%`} />
          <Info k="WASH" v={`${school.washScore}%`} />
          <Info k="Risk" v={school.hazardScore === null ? "NA" : `${school.hazardScore}%`} />
        </div>
        <div className="mt-5 glass-soft rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Plans</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill on={school.hasCRSAP === true}>CR-SAP</Pill>
            <Pill on={school.hasGreenPlan === true}>Green Plan</Pill>
            <Pill on={school.hasSAP === true}>SAP</Pill>
            <Pill on={school.hasSDMP === true}>SDMP</Pill>
            <Pill on={school.hasSafetyCommittee === true}>Safety Cmt.</Pill>
            <Pill on={school.mockDrills === true}>Mock Drills</Pill>
          </div>
        </div>
        <div className="mt-5 glass-soft rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Hazard exposure</div>
          <div className="space-y-1.5">
             {Object.entries(school.hazards).filter((entry): entry is [string, number] => entry[1] !== null && entry[1] > 0).sort((a, b) => b[1] - a[1]).map(([h, v]) => (
              <div key={h} className="flex items-center gap-2 text-xs">
                <span className="w-28">{h}</span>
                <div className="flex-1 h-1.5 rounded bg-secondary/50 overflow-hidden">
                  <div className="h-full" style={{ width: `${(v / 3) * 100}%`, background: `oklch(0.78 0.22 ${Math.round(150 - (v / 3) * 130)})` }} />
                </div>
                <span className="tabular-nums w-10 text-right">{v.toFixed(1)}</span>
              </div>
            ))}
             {Object.values(school.hazards).every((v) => v === null) && <div className="text-xs text-muted-foreground">No hazard response is available.</div>}
             {Object.values(school.hazards).some((v) => v !== null) && Object.values(school.hazards).every((v) => v === null || v === 0) && <div className="text-xs text-muted-foreground">No exposure reported.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return <div className="glass-soft rounded-lg px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div><div className="truncate">{v || "—"}</div></div>;
}
function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={`px-3 py-1 rounded-full border ${on ? "border-accent/60 bg-accent/15 text-foreground" : "border-border text-muted-foreground"}`}>{on ? "✓ " : "✗ "}{children}</span>;
}
