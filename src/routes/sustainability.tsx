import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, platformKpis, aggregateByDistrict, type School } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { useViewMode } from "@/components/layout/view-mode";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis, Legend,
} from "recharts";
import { Search, Sparkles, ExternalLink, Filter } from "lucide-react";
import { KeyDistrictsPanel } from "@/components/cr-sap/KeyDistrictsPanel";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability Index · CR-SAP Odisha" }, { name: "description", content: "Live distribution of sustainability scores across 10,000 schools." }] }),
  component: Page,
});

function Page() {
  const { data } = useSchools();
  const { mode } = useViewMode();
  const buckets = useMemo(() => {
    if (!data) return [];
    const b = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0 }));
    for (const s of data) b[Math.min(9, Math.floor(s.sustainabilityScore / 10))].count++;
    return b;
  }, [data]);
  if (!data) return <LoadingShell title="Sustainability Index" subtitle="Distribution" />;
  return mode === "macro"
    ? <MacroView data={data} buckets={buckets} />
    : <MicroView data={data} />;
}

/* ============================ MACRO ============================ */
function MacroView({ data, buckets }: { data: School[]; buckets: { range: string; count: number }[] }) {
  const [filter, setFilter] = useState<"all" | "rural" | "urban" | "crsap" | "green">("all");
  const filtered = useMemo(() => {
    switch (filter) {
      case "rural":  return data.filter((s) => s.location.toLowerCase().includes("rural"));
      case "urban":  return data.filter((s) => s.location.toLowerCase().includes("urban"));
      case "crsap":  return data.filter((s) => s.hasCRSAP);
      case "green":  return data.filter((s) => s.hasGreenPlan);
      default:       return data;
    }
  }, [data, filter]);
  const k = platformKpis(filtered);
  const districtRanked = useMemo(
    () => aggregateByDistrict(filtered).sort((a, b) => b.avgSust - a.avgSust),
    [filtered],
  );
  const overall = [
    { name: "Sustainability", value: k.avgSust, fill: "oklch(0.78 0.2 165)" },
    { name: "WASH",           value: k.avgWash, fill: "oklch(0.78 0.18 210)" },
    { name: "CR-SAP",         value: k.crsapPct, fill: "oklch(0.78 0.18 280)" },
    { name: "Green Plan",     value: k.greenPct, fill: "oklch(0.82 0.2 145)" },
  ];
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Sustainability Index" subtitle="Macro · Live Aggregates" />
      <div className="p-3 space-y-3">
        <KeyDistrictsPanel schools={data} focus="sustainability" />
        {/* Filters */}
        <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[var(--cyan)]" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mr-2">Filter</span>
          {([
            ["all", "All schools"], ["rural", "Rural"], ["urban", "Urban"],
            ["crsap", "CR-SAP adopters"], ["green", "Green plan"],
          ] as const).map(([k2, lbl]) => (
            <button key={k2} onClick={() => setFilter(k2)}
              className={`px-3 py-1.5 rounded-full text-[11px] transition ${
                filter === k2 ? "bg-[oklch(0.85_0.2_195/0.18)] text-foreground neon-ring" : "glass-soft text-muted-foreground hover:text-foreground"
              }`}>
              {lbl}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground">{filtered.length.toLocaleString()} schools</div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
        {/* DV (a) Overall — radial */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Overall sustainability pulse</h3>
            <span className="text-[10px] text-muted-foreground">Live · live filter applied</span>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="22%" outerRadius="100%" data={overall} startAngle={210} endAngle={-30}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center">
            <Mini label="Sust." v={`${k.avgSust}%`} />
            <Mini label="WASH" v={`${k.avgWash}%`} />
            <Mini label="CR-SAP" v={`${k.crsapPct}%`} />
            <Mini label="Green" v={`${k.greenPct}%`} />
          </div>
        </div>

        {/* DV (b) Statewise (district ranked) */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Statewise sustainability · 30 districts ranked</h3>
            <span className="text-[10px] text-muted-foreground">Top to bottom</span>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer>
              <BarChart data={districtRanked} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={80} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="avgSust" radius={[0, 6, 6, 0]}>
                  {districtRanked.map((d, i) => <Cell key={d.districtId} fill={`oklch(0.75 0.2 ${Math.round(150 - (i / Math.max(1, districtRanked.length - 1)) * 130)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Score distribution (0–100)</h3>
          <div className="h-[360px]">
            <ResponsiveContainer>
              <BarChart data={buckets}>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {buckets.map((_, i) => <Cell key={i} fill={`oklch(0.78 0.2 ${20 + (i / 9) * 130})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="glass-soft rounded-xl px-2 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{v}</div>
    </div>
  );
}

/* ============================ MICRO ============================ */
function MicroView({ data }: { data: School[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => data
      .filter((s) => q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.udise.includes(q) || s.district.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 60),
    [data, q],
  );
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Sustainability Index" subtitle="Micro · School-level paragraphs & sources" />
      <div className="p-3 space-y-3">
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school, UDISE, district…"
                   className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <div className="text-[11px] text-muted-foreground ml-auto">{Math.min(list.length, 60)} shown · {data.length.toLocaleString()} total</div>
        </div>

        <div className="space-y-3">
          {list.map((s) => <SchoolNarrative key={s.udise} s={s} />)}
        </div>
      </div>
    </div>
  );
}

function SchoolNarrative({ s }: { s: School }) {
  const drivers = [
    s.hasGreenPlan && "active green-school plan",
    s.hasCRSAP && "CR-SAP integration",
    s.hasSDMP && "school disaster management plan",
    s.mockDrills && "regular mock drills",
  ].filter(Boolean);
  const risk = s.topHazard ? `top hazard exposure is ${s.topHazard}` : "no significant hazard signal in CCES data";
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">UDISE {s.udise} · {s.district}</div>
          <h3 className="text-base font-semibold truncate">{s.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label="Sust." v={`${s.sustainabilityScore}%`} />
          <Badge label="WASH" v={`${s.washScore}%`} />
          <Badge label="Risk" v={s.hazardScore === null ? "NA" : `${s.hazardScore}%`} />
          <Badge label="SHVR" v={`${s.shvr}★`} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <Sparkles className="h-3 w-3 text-[var(--aurora)]" /> Aurora narrative
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {s.name} ({s.district}) currently records a sustainability index of <b className="text-foreground">{s.sustainabilityScore}%</b> against
            a WASH composite of <b className="text-foreground">{s.washScore}%</b> and a climate-risk load of <b className="text-foreground">{s.hazardScore === null ? "NA" : `${s.hazardScore}%`}</b>.
        The school is rated <b className="text-foreground">{s.shvr}★</b> on the SHVR 2025-26 scale, and {risk}.
        Sustainability drivers in evidence: {drivers.length ? drivers.join(", ") : "limited — no formal plans on record"}.
        With {s.totalStudents.toLocaleString()} students and {s.totalStaff} staff, the operational footprint
        suggests {s.sustainabilityScore >= 70 ? "a strong baseline — prioritize replication & peer-mentoring" : s.sustainabilityScore >= 40 ? "an actionable mid-band — targeted CR-SAP rollout will move the needle" : "a critical-intervention case — direct UNICEF/State support recommended"}.
      </p>

      <div className="mt-3 grid sm:grid-cols-2 gap-2">
        <Source title="CCES Google Form response" href="#" note="Self-reported · school authority" />
        <Source title="UNICEF WASH for Schools" href="https://www.unicef.org/wash/schools" note="Web · UNICEF official" />
        <Source title="Odisha SOSEPA · School directory" href="https://sosepa.odisha.gov.in/" note="Web · State authority" />
        <Source title="MoEFCC Mission LiFE" href="https://missionlife-moefcc.nic.in/" note="Web · GoI mission portal" />
      </div>
    </div>
  );
}

function Badge({ label, v }: { label: string; v: string }) {
  return (
    <div className="glass-soft rounded-lg px-2.5 py-1 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-bold tabular-nums">{v}</div>
    </div>
  );
}
function Source({ title, href, note }: { title: string; href: string; note: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="glass-soft rounded-xl px-3 py-2 flex items-center justify-between text-[11px] hover:bg-primary/10 transition">
      <span>
        <span className="font-semibold block">{title}</span>
        <span className="text-muted-foreground">{note}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
    </a>
  );
}
