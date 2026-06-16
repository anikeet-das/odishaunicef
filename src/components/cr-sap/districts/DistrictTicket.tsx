import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Sparkles, Plane, Users, Droplets, Star, Leaf, ShieldAlert, Award, Flame } from "lucide-react";
import type { DistrictAgg } from "@/lib/data/cces";

/**
 * Apple Wallet-style "flight ticket" card for a single district.
 * Long horizontal card with KPI clusters separated by a perforation.
 */

function riskWord(v: number) {
  return v >= 65 ? "Critical" : v >= 45 ? "High" : v >= 25 ? "Moderate" : "Low";
}
function riskColor(v: number) {
  return v >= 65 ? "var(--danger)" : v >= 45 ? "var(--warn)" : v >= 25 ? "var(--cyan)" : "var(--aurora)";
}
function hazardStatement(d: DistrictAgg): { lead: string; key: string; tail: string } {
  if (!d.topHazard) return { lead: "AI scan: no dominant hazard detected — ", key: "stable risk profile", tail: " across schools." };
  if (d.avgHazard >= 65) return { lead: "Critical exposure to ", key: d.topHazard, tail: " — deploy SDMP + drills immediately." };
  if (d.avgHazard >= 45) return { lead: "High vulnerability signal from ", key: d.topHazard, tail: " — schedule preparedness audits." };
  if (d.avgHazard >= 25) return { lead: "Moderate seasonal pattern in ", key: d.topHazard, tail: " — monitor and pre-stage relief stocks." };
  return { lead: "Low background exposure with mild ", key: d.topHazard, tail: " signal — maintain baseline readiness." };
}

export function DistrictTicket({ d, index }: { d: DistrictAgg; index: number }) {
  const totalSchoolsOdisha = 5000;
  const pct = Math.min(100, Math.round((d.schools / totalSchoolsOdisha) * 100));
  const pie = [
    { name: "This district", value: d.schools, fill: "oklch(0.86 0.16 200)" },
    { name: "Rest of state", value: Math.max(0, totalSchoolsOdisha - d.schools), fill: "oklch(0.3 0.04 260)" },
  ];
  const stars = Math.round(d.avgShvr);
  const wash3 = Math.min(3, Math.max(0, Math.round((d.avgWash / 100) * 3)));
  const hz = hazardStatement(d);

  return (
    <motion.article
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.4) }}
      className="relative grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-0 glass rounded-2xl overflow-hidden border border-[oklch(0.85_0.2_195/0.18)] hover:border-[oklch(0.85_0.2_195/0.45)] transition"
    >
      {/* LEFT STUB — identity */}
      <div className="relative p-4 bg-gradient-to-br from-[oklch(0.22_0.05_220/0.6)] to-transparent">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--cyan)]">
          <Plane className="h-3 w-3" /> CR-SAP · {String(index + 1).padStart(2, "0")} / 30
        </div>
        <h3 className="text-xl font-bold mt-1 leading-tight">{d.district}</h3>
        <div className="text-[11px] text-muted-foreground mt-1">District code · {d.districtId.toString().padStart(3, "0")}</div>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={26} outerRadius={36} startAngle={90} endAngle={-270}>
                  {pie.map((p, i) => <Cell key={i} fill={p.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-[11px] font-bold text-[var(--cyan)]">{pct}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Schools</div>
            <div className="text-2xl font-bold leading-none">{d.schools.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">of 5,000 state total</div>
          </div>
        </div>
      </div>

      {/* PERFORATION */}
      <div className="hidden lg:block absolute left-[280px] top-0 bottom-0 w-px border-l border-dashed border-[oklch(0.85_0.2_195/0.2)]" />
      <div className="hidden lg:flex absolute left-[280px] -translate-x-1/2 top-2 h-4 w-4 rounded-full bg-[var(--background)] border border-[oklch(0.85_0.2_195/0.2)]" />
      <div className="hidden lg:flex absolute left-[280px] -translate-x-1/2 bottom-2 h-4 w-4 rounded-full bg-[var(--background)] border border-[oklch(0.85_0.2_195/0.2)]" />

      {/* CENTER — KPI grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Students" value={d.students.toLocaleString()} accent="var(--cyan)" />
        <Kpi icon={<Star className="h-3.5 w-3.5" />} label="SHVR rating"
             value={<span className="text-amber-300">{"★".repeat(stars)}<span className="text-muted-foreground">{"☆".repeat(5 - stars)}</span></span>}
             accent="var(--warn)" />
        <Kpi icon={<Leaf className="h-3.5 w-3.5" />} label="Sustainability" value={`${d.avgSust}%`}
             bar={d.avgSust} accent="var(--aurora)" />
        <Kpi icon={<Droplets className="h-3.5 w-3.5" />} label="WASH"
             value={<span className="text-[var(--cyan)]">{"●".repeat(wash3)}<span className="text-muted-foreground">{"○".repeat(3 - wash3)}</span></span>}
             accent="var(--cyan)" />
        <Kpi icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Climate risk"
             value={<span style={{ color: riskColor(d.avgHazard) }}>{riskWord(d.avgHazard)} · {d.avgHazard}%</span>}
             bar={d.avgHazard} accent={riskColor(d.avgHazard)} />
        <Kpi icon={<Award className="h-3.5 w-3.5" />} label="CR-SAP adoption" value={`${d.crsapAdoption}%`}
             bar={d.crsapAdoption} accent="var(--indigo-glow)" />
        <Kpi icon={<Flame className="h-3.5 w-3.5" />} label="Green plan" value={`${d.greenAdoption}%`}
             bar={d.greenAdoption} accent="var(--aurora)" />
        <Kpi icon={<Sparkles className="h-3.5 w-3.5" />} label="Top hazard"
             value={<span className="text-[var(--warn)] font-semibold">{d.topHazard ?? "—"}</span>}
             accent="var(--warn)" />
      </div>

      {/* RIGHT STUB — AI hazard statement */}
      <div className="relative p-4 bg-gradient-to-bl from-[oklch(0.22_0.05_280/0.5)] to-transparent border-l border-dashed border-[oklch(0.85_0.2_195/0.15)] lg:border-l-0">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--aurora)]">
          <Sparkles className="h-3 w-3" /> AI hazard scan
        </div>
        <p className="text-xs leading-relaxed mt-2">
          {hz.lead}
          <b className="text-[var(--warn)] px-1 rounded" style={{ background: "oklch(0.85 0.18 75 / 0.18)" }}>
            {hz.key}
          </b>
          {hz.tail}
        </p>
        <div className="mt-3 text-[10px] text-muted-foreground">
          Live · streamed from CCES + IMD seasonality model · refreshed every 5 min
        </div>
      </div>
    </motion.article>
  );
}

function Kpi({ icon, label, value, bar, accent }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  bar?: number;
  accent: string;
}) {
  return (
    <div className="glass-soft rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="text-sm font-bold mt-1 truncate">{value}</div>
      {bar !== undefined && (
        <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-white/[0.06]">
          <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: accent, boxShadow: `0 0 6px ${accent}` }} />
        </div>
      )}
    </div>
  );
}