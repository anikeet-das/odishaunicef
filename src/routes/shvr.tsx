import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Search, X, TrendingUp, TrendingDown, Minus, Sparkles, Star, Filter } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, shvrDistribution, aggregateByDistrict, type School } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { useViewMode } from "@/components/layout/view-mode";

export const Route = createFileRoute("/shvr")({
  head: () => ({
    meta: [
      { title: "SHVR Ratings · CR-SAP Odisha" },
      { name: "description", content: "Real-time school-wise SHVR intelligence with district and locality filters." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useSchools();
  const { mode } = useViewMode();
  if (!data) return <LoadingShell title="SHVR Ratings" subtitle="2025-26" />;
  return mode === "macro" ? <MacroView schools={data} /> : <MicroView schools={data} />;
}

// ============== MACRO ==============
function MacroView({ schools }: { schools: School[] }) {
  const dist = shvrDistribution(schools);
  const total = schools.length;
  const avg = (schools.reduce((a, s) => a + s.shvr, 0) / total).toFixed(2);
  const aggs = aggregateByDistrict(schools);
  const top = [...aggs].sort((a, b) => b.avgShvr - a.avgShvr).slice(0, 8)
    .map((a) => ({ district: a.district, score: +a.avgShvr.toFixed(2) }));
  const radar = [
    { metric: "Sustainability", v: Math.round(schools.reduce((a, s) => a + s.sustainabilityScore, 0) / total) },
    { metric: "WASH", v: Math.round(schools.reduce((a, s) => a + s.washScore, 0) / total) },
    { metric: "SHVR", v: Math.round(+avg * 20) },
    { metric: "Safety", v: Math.round((schools.filter((s) => s.hasSDMP).length / total) * 100) },
    { metric: "Drills", v: Math.round((schools.filter((s) => s.mockDrills).length / total) * 100) },
    { metric: "CR-SAP", v: Math.round((schools.filter((s) => s.hasCRSAP).length / total) * 100) },
  ];
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="SHVR Ratings" subtitle="State-wide Star Distribution" />
      <div className="p-3 grid lg:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Star rating distribution · 2025-26</h3>
          <div className="h-[340px]">
            <ResponsiveContainer>
              <BarChart data={dist}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {dist.map((d, i) => <Cell key={i} fill={starColor(d.star)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Platform average</div>
            <div className="text-5xl font-bold text-gradient-cyan">{avg} ★</div>
          </div>
          {dist.map((d) => (
            <div key={d.star} className="flex items-center justify-between glass-soft rounded-xl px-4 py-2">
              <span className="text-sm">{d.label || "Unrated"}</span>
              <span className="font-bold tabular-nums">{d.count.toLocaleString()} <span className="text-xs text-muted-foreground">({Math.round((d.count / total) * 100)}%)</span></span>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Top 8 districts · average SHVR</h3>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={top} layout="vertical">
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="district" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" radius={[0, 8, 8, 0]} fill="oklch(0.82 0.19 175)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Composite radar</h3>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid stroke="oklch(0.85 0.2 195 / 0.18)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar dataKey="v" stroke="oklch(0.86 0.16 200)" fill="oklch(0.86 0.16 200)" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== MICRO ==============
function MicroView({ schools }: { schools: School[] }) {
  const [q, setQ] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"shvr" | "sust" | "wash" | "district">("shvr");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [opened, setOpened] = useState<School | null>(null);

  const allDistricts = useMemo(
    () => Array.from(new Set(schools.map((s) => s.district))).sort(),
    [schools],
  );
  const allLocalities = useMemo(() => {
    const pool = districts.length === 0 ? schools : schools.filter((s) => districts.includes(s.district));
    return Array.from(new Set(pool.map((s) => s.location).filter(Boolean))).sort();
  }, [schools, districts]);

  const filtered = useMemo(() => {
    const q2 = q.trim().toLowerCase();
    let list = schools.filter((s) => {
      if (districts.length && !districts.includes(s.district)) return false;
      if (localities.length && !localities.includes(s.location)) return false;
      if (!q2) return true;
      return s.name.toLowerCase().includes(q2) || s.udise.toLowerCase().includes(q2) || s.location.toLowerCase().includes(q2);
    });
    const dir = sortDir === "desc" ? -1 : 1;
    list = list.sort((a, b) => {
      if (sortKey === "shvr") return (a.shvr - b.shvr) * dir;
      if (sortKey === "sust") return (a.sustainabilityScore - b.sustainabilityScore) * dir;
      if (sortKey === "wash") return (a.washScore - b.washScore) * dir;
      return a.district.localeCompare(b.district) * dir;
    });
    return list.slice(0, 500);
  }, [schools, q, districts, localities, sortKey, sortDir]);

  const insights = useMemo(() => buildInsights(filtered.length ? filtered : schools), [filtered, schools]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="SHVR Ratings" subtitle={`MicroView · ${filtered.length.toLocaleString()} schools`} />
      <div className="p-3 grid lg:grid-cols-12 gap-3">
        {/* LEFT: filters */}
        <aside className="lg:col-span-3 glass rounded-2xl p-4 space-y-4 h-[84vh] overflow-y-auto scroll-invisible">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <Filter className="h-3 w-3" /> Filters
          </div>
          <MultiSelect label="District" options={allDistricts} value={districts} onChange={setDistricts} placeholder="Select district…" />
          <MultiSelect label="Locality" options={allLocalities} value={localities} onChange={setLocalities} placeholder="Select locality…" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Sort</div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}
                    className="w-full glass-soft rounded-lg px-2 py-1.5 text-xs outline-none">
              <option value="shvr">SHVR score</option>
              <option value="sust">Sustainability</option>
              <option value="wash">WASH</option>
              <option value="district">District (A-Z)</option>
            </select>
            <div className="mt-2 inline-flex glass-soft rounded-full p-0.5 text-[11px]">
              <button onClick={() => setSortDir("desc")} className={`px-3 py-1 rounded-full ${sortDir === "desc" ? "bg-primary/25 text-foreground" : "text-muted-foreground"}`}>High → Low</button>
              <button onClick={() => setSortDir("asc")} className={`px-3 py-1 rounded-full ${sortDir === "asc" ? "bg-primary/25 text-foreground" : "text-muted-foreground"}`}>Low → High</button>
            </div>
          </div>
          <button onClick={() => { setQ(""); setDistricts([]); setLocalities([]); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground glass-soft rounded-lg py-1.5">
            Reset filters
          </button>
        </aside>

        {/* CENTER: table */}
        <section className="lg:col-span-6 glass rounded-2xl p-3 h-[84vh] flex flex-col">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search school name, UDISE+, locality…"
              className="w-full glass-strong rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:neon-ring"
            />
          </div>
          <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1 border-b border-border/40">
            <div className="col-span-5">School</div>
            <div className="col-span-2">District</div>
            <div className="col-span-1 text-center">SHVR</div>
            <div className="col-span-1 text-center">Sust</div>
            <div className="col-span-1 text-center">WASH</div>
            <div className="col-span-2 text-right pr-2">Trend</div>
          </div>
          <div className="flex-1 overflow-y-auto scroll-invisible fade-mask-y mt-1 space-y-1 pr-1">
            {filtered.map((s) => <Row key={s.udise} s={s} onClick={() => setOpened(s)} highlight={q} />)}
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground p-6 text-center">No schools match the filters.</div>
            )}
          </div>
        </section>

        {/* RIGHT: AI insights */}
        <aside className="lg:col-span-3 space-y-3 h-[84vh] overflow-y-auto scroll-invisible">
          <div className="glass-strong rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[var(--aurora)]" /> AI Insight Panel
            </div>
            <ul className="space-y-2 text-xs leading-relaxed">
              {insights.map((t, i) => <li key={i} className="glass-soft rounded-lg px-3 py-2">{t}</li>)}
            </ul>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Filter summary</div>
            <div className="text-xs space-y-1">
              <div>Districts: <b>{districts.length || "All"}</b></div>
              <div>Localities: <b>{localities.length || "All"}</b></div>
              <div>Visible: <b>{filtered.length.toLocaleString()}</b></div>
              <div>Avg SHVR: <b className="text-[var(--cyan)]">{filtered.length ? (filtered.reduce((a, s) => a + s.shvr, 0) / filtered.length).toFixed(2) : "—"} ★</b></div>
            </div>
          </div>
        </aside>
      </div>

      {opened && <SchoolDetail school={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}

function starColor(star: number): string {
  if (star === 5) return "oklch(0.86 0.16 200)";
  if (star === 4) return "oklch(0.84 0.2 155)";
  if (star === 3) return "oklch(0.86 0.18 95)";
  if (star === 2) return "oklch(0.78 0.2 50)";
  if (star === 1) return "oklch(0.68 0.24 22)";
  return "oklch(0.6 0.04 260)";
}

function Row({ s, onClick, highlight }: { s: School; onClick: () => void; highlight: string }) {
  // pseudo-trend from sustainability score parity
  const trend = s.sustainabilityScore > 60 ? "up" : s.sustainabilityScore < 40 ? "down" : "flat";
  const color = starColor(s.shvr);
  return (
    <button onClick={onClick}
      className="w-full grid grid-cols-12 items-center text-xs glass-soft rounded-xl px-2 py-2 hover:bg-white/[0.05] transition group">
      <div className="col-span-5 flex items-center gap-2 min-w-0">
        <ProgressRing pct={s.shvr * 20} color={color} />
        <div className="min-w-0 text-left">
          <div className="font-medium truncate group-hover:text-[var(--cyan)] transition">{highlightMatch(s.name, highlight)}</div>
          <div className="text-[10px] text-muted-foreground truncate">{s.udise} · {s.location}</div>
        </div>
      </div>
      <div className="col-span-2 truncate text-muted-foreground">{s.district}</div>
      <div className="col-span-1 text-center font-bold" style={{ color }}>
        {s.shvr ? "★".repeat(s.shvr) : "—"}
      </div>
      <div className="col-span-1 text-center tabular-nums">{s.sustainabilityScore}</div>
      <div className="col-span-1 text-center tabular-nums">{s.washScore}</div>
      <div className="col-span-2 flex items-center justify-end gap-1 pr-2">
        <Sparkline values={syntheticSpark(s)} color={color} />
        {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-[var(--aurora)]" />}
        {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-[var(--danger)]" />}
        {trend === "flat" && <Minus className="h-3.5 w-3.5 text-[var(--cyan)]" />}
      </div>
    </button>
  );
}

function highlightMatch(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-[var(--cyan)] font-semibold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 11, c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      <circle cx="14" cy="14" r={r} fill="none" stroke="oklch(0.85 0.2 195 / 0.15)" strokeWidth="3" />
      <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
              transform="rotate(-90 14 14)"
              style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x="14" y="17" textAnchor="middle" fontSize="9" fontWeight={700} fill={color}>
        {Math.round(pct / 20)}
      </text>
    </svg>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 48, h = 14;
  const mn = Math.min(...values), mx = Math.max(...values);
  const span = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 2) + 1;
    const y = h - 1 - ((v - mn) / span) * (h - 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function syntheticSpark(s: School): number[] {
  // deterministic 8-point series from hash
  const base = s.sustainabilityScore;
  const seed = s.udise.charCodeAt(0) + s.udise.charCodeAt(s.udise.length - 1);
  return Array.from({ length: 8 }, (_, i) => base + Math.sin((i + seed) * 0.7) * 6 + (i * (s.shvr - 2)));
}

function MultiSelect({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</div>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full text-left glass-soft rounded-lg px-3 py-2 text-xs flex items-center gap-2">
        <span className="flex-1 truncate">
          {value.length === 0 ? <span className="text-muted-foreground">{placeholder}</span> :
            <span>{value.length} selected</span>}
        </span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {value.map((v) => (
            <span key={v} className="text-[10px] glass-soft rounded-full px-2 py-0.5 inline-flex items-center gap-1">
              {v}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => toggle(v)} />
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-1.5 glass-strong rounded-lg p-2 max-h-56 overflow-y-auto scroll-invisible">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="w-full bg-transparent text-xs px-2 py-1 border-b border-border/40 outline-none mb-1" />
          {filtered.map((o) => {
            const checked = value.includes(o);
            return (
              <button key={o} onClick={() => toggle(o)}
                className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-white/[0.05] ${checked ? "text-[var(--cyan)]" : ""}`}>
                <span className={`h-3 w-3 rounded border ${checked ? "bg-[var(--cyan)] border-[var(--cyan)]" : "border-border"}`} />
                <span className="truncate">{o}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-[10px] text-muted-foreground text-center p-2">No matches.</div>}
        </div>
      )}
    </div>
  );
}

function buildInsights(list: School[]): string[] {
  if (!list.length) return ["No schools in current filter."];
  const byDistrict = new Map<string, School[]>();
  for (const s of list) {
    if (!byDistrict.has(s.district)) byDistrict.set(s.district, []);
    byDistrict.get(s.district)!.push(s);
  }
  const ranked = [...byDistrict.entries()].map(([d, arr]) => ({
    d, avg: arr.reduce((a, s) => a + s.shvr, 0) / arr.length, n: arr.length,
  }));
  const best = ranked.sort((a, b) => b.avg - a.avg)[0];
  const worst = ranked.sort((a, b) => a.avg - b.avg)[0];
  const fivestar = list.filter((s) => s.shvr === 5).length;
  const onestar = list.filter((s) => s.shvr === 1).length;
  const insights = [
    `${best.d} leads the current selection with an average SHVR of ${best.avg.toFixed(2)}★ across ${best.n} schools.`,
    `${worst.d} schools show the lowest SHVR (${worst.avg.toFixed(2)}★) — prioritise sustainability interventions.`,
    `${fivestar.toLocaleString()} schools hold the 5★ rating; ${onestar.toLocaleString()} schools remain at 1★ and need urgent uplift.`,
    `${list.filter((s) => s.washScore >= 70).length.toLocaleString()} schools meet the WASH 70%+ benchmark.`,
  ];
  return insights;
}

function SchoolDetail({ school, onClose }: { school: School; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl glass-strong rounded-2xl p-6 max-h-[88vh] overflow-y-auto scroll-invisible"
      >
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl grid place-items-center"
               style={{ background: `linear-gradient(135deg, ${starColor(school.shvr)}, var(--cyan))` }}>
            <Star className="h-6 w-6 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">SHVR Micro Dashboard</div>
            <h2 className="text-xl font-bold truncate">{school.name}</h2>
            <div className="text-xs text-muted-foreground">UDISE+ {school.udise} · {school.district} · {school.location}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
          <Tile label="SHVR" value={`${school.shvr}★`} color={starColor(school.shvr)} />
          <Tile label="Sustainability" value={`${school.sustainabilityScore}%`} color="var(--aurora)" />
          <Tile label="WASH" value={`${school.washScore}%`} color="var(--cyan)" />
          <Tile label="Climate Risk" value={school.hazardScore === null ? "NA" : `${school.hazardScore}%`} color="var(--warn)" />
          <Tile label="Students" value={school.totalStudents.toLocaleString()} color="var(--cyan)" />
          <Tile label="Staff" value={String(school.totalStaff)} color="var(--aurora)" />
          <Tile label="SDMP" value={school.hasSDMP ? "Yes" : "No"} color={school.hasSDMP ? "var(--aurora)" : "var(--danger)"} />
          <Tile label="Drills" value={school.mockDrills ? "Yes" : "No"} color={school.mockDrills ? "var(--aurora)" : "var(--danger)"} />
        </div>
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">AI recommendations</div>
          <ul className="space-y-2 text-xs">
            {recommendationsFor(school).map((r, i) => (
              <li key={i} className="glass-soft rounded-lg px-3 py-2 flex gap-2">
                <Sparkles className="h-3 w-3 mt-0.5 text-[var(--aurora)]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function recommendationsFor(s: School): string[] {
  const out: string[] = [];
  if (s.shvr < 3) out.push("Enrol the school into the SHVR uplift programme: monthly hygiene audits + green-plan workshop.");
  if (!s.hasSDMP) out.push("Draft a School Disaster Management Plan (SDMP) — top driver of climate resilience score.");
  if (!s.mockDrills) out.push("Schedule quarterly mock drills (fire, flood, earthquake) with the local DDMA.");
  if (s.washScore < 60) out.push("Audit water taps, soap availability and toilet hygiene — WASH score is below benchmark.");
  if (s.hazardScore !== null && s.hazardScore >= 60) out.push("High climate exposure — link this school to district early-warning SMS feed.");
  if (!out.length) out.push("Performance is strong. Continue current sustainability practices and document them for peer schools.");
  return out;
}
