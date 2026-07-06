import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
} from "recharts";
import { Star, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KEY_DISTRICTS } from "@/lib/data/odisha";
import { aggregateByDistrict, type DistrictAgg, type School } from "@/lib/data/cces";

/**
 * Priority-district strip. Rendered near the top of every page that shows
 * district-level analytics. Compares Koraput · Khordha · Rayagada · Ganjam ·
 * Kendrapara · Sambalpur · Sundargarh on the metrics most relevant to the page.
 * Each `focus` gets its own copy, primary metric and headline insights so the
 * panel never looks identical across pages.
 */
export type KeyDistrictsFocus = "sustainability" | "wash" | "risk" | "adoption" | "overview" | "finance";

// One saturated hue per priority district — consistent across the platform.
const HUES = [12, 55, 115, 175, 220, 275, 320];

type FocusCfg = {
  eyebrow: string;
  title: string;
  hint: string;
  primaryKey: keyof DistrictAgg;
  primaryLabel: string;
  secondaryKey: keyof DistrictAgg;
  secondaryLabel: string;
  radar: (keyof DistrictAgg)[];
  radarLabels: string[];
  higherIsBetter: boolean;
  unit: string;
};

function focusConfig(f: KeyDistrictsFocus): FocusCfg {
  switch (f) {
    case "wash":
      return {
        eyebrow: "WASH · water · sanitation · hygiene",
        title: "Priority Districts · WASH readiness",
        hint: "Ranked by composite WASH score. Radar cross-references sustainability, CR-SAP adoption and green planning.",
        primaryKey: "avgWash", primaryLabel: "WASH %",
        secondaryKey: "avgSust", secondaryLabel: "Sustainability %",
        radar: ["avgWash", "avgSust", "crsapAdoption", "greenAdoption"],
        radarLabels: ["WASH", "Sustainability", "CR-SAP", "Green plan"],
        higherIsBetter: true, unit: "%",
      };
    case "risk":
      return {
        eyebrow: "Climate exposure · hazard intensity",
        title: "Priority Districts · Climate risk profile",
        hint: "Higher score = higher composite hazard exposure. WASH shown as counter-signal to preparedness.",
        primaryKey: "avgHazard", primaryLabel: "Climate risk %",
        secondaryKey: "avgWash", secondaryLabel: "WASH %",
        radar: ["avgHazard", "avgWash", "avgSust", "crsapAdoption"],
        radarLabels: ["Hazard", "WASH", "Sustainability", "CR-SAP"],
        higherIsBetter: false, unit: "%",
      };
    case "sustainability":
      return {
        eyebrow: "Green campus · circular practice",
        title: "Priority Districts · Sustainability index",
        hint: "Composite of green plans, waste, energy and water reuse practices reported by schools.",
        primaryKey: "avgSust", primaryLabel: "Sustainability %",
        secondaryKey: "greenAdoption", secondaryLabel: "Green plan %",
        radar: ["avgSust", "avgWash", "greenAdoption", "crsapAdoption"],
        radarLabels: ["Sustainability", "WASH", "Green plan", "CR-SAP"],
        higherIsBetter: true, unit: "%",
      };
    case "adoption":
      return {
        eyebrow: "Plan coverage · rollout status",
        title: "Priority Districts · Plan adoption",
        hint: "Share of reporting schools with CR-SAP and Green Plans in place.",
        primaryKey: "crsapAdoption", primaryLabel: "CR-SAP %",
        secondaryKey: "greenAdoption", secondaryLabel: "Green plan %",
        radar: ["crsapAdoption", "greenAdoption", "avgSust", "avgWash"],
        radarLabels: ["CR-SAP", "Green plan", "Sustainability", "WASH"],
        higherIsBetter: true, unit: "%",
      };
    case "finance":
      return {
        eyebrow: "Programme reach · investment footprint",
        title: "Priority Districts · programme footprint",
        hint: "Schools reporting and student reach across the seven priority districts.",
        primaryKey: "schools", primaryLabel: "Schools reporting",
        secondaryKey: "students", secondaryLabel: "Students reached",
        radar: ["avgSust", "avgWash", "avgHazard", "crsapAdoption"],
        radarLabels: ["Sustainability", "WASH", "Hazard", "CR-SAP"],
        higherIsBetter: true, unit: "",
      };
    default:
      return {
        eyebrow: "UNICEF priority · programme snapshot",
        title: "Priority Districts · programme snapshot",
        hint: "State-wide priority districts benchmarked across the four programme dimensions.",
        primaryKey: "avgSust", primaryLabel: "Sustainability %",
        secondaryKey: "avgWash", secondaryLabel: "WASH %",
        radar: ["avgSust", "avgWash", "avgHazard", "crsapAdoption"],
        radarLabels: ["Sustainability", "WASH", "Hazard", "CR-SAP"],
        higherIsBetter: true, unit: "%",
      };
  }
}

export function KeyDistrictsPanel({
  schools,
  focus = "overview",
}: {
  schools: School[] | undefined;
  focus?: KeyDistrictsFocus;
}) {
  const cfg = focusConfig(focus);
  const rows = useMemo(() => {
    if (!schools) return [];
    const all = aggregateByDistrict(schools);
    return KEY_DISTRICTS.map((name) => all.find((d) => d.district === name) ?? null);
  }, [schools]);

  const withData = rows
    .map((r, i) => ({ r, i }))
    .filter((x): x is { r: DistrictAgg; i: number } => !!x.r && x.r.schools > 0);

  // Ranking data — primary metric across districts.
  const ranked = [...withData].sort((a, b) => {
    const av = Number(a.r[cfg.primaryKey] ?? 0);
    const bv = Number(b.r[cfg.primaryKey] ?? 0);
    return cfg.higherIsBetter ? bv - av : av - bv;
  });

  const barData = rows.map((r, i) => {
    const name = KEY_DISTRICTS[i];
    if (!r || r.schools === 0) return { name, _empty: true };
    return {
      name,
      [cfg.primaryLabel]: Number(r[cfg.primaryKey] ?? 0),
      [cfg.secondaryLabel]: Number(r[cfg.secondaryKey] ?? 0),
    };
  });

  const radarData = cfg.radar.map((metric, mi) => {
    const row: Record<string, string | number> = { metric: cfg.radarLabels[mi] };
    rows.forEach((r, i) => {
      row[KEY_DISTRICTS[i]] = r && r.schools > 0
        ? Number((r as unknown as Record<string, number>)[metric as string] ?? 0)
        : 0;
    });
    return row;
  });

  const totalSchools = withData.reduce((a, x) => a + x.r.schools, 0);
  const totalStudents = withData.reduce((a, x) => a + x.r.students, 0);
  const leader = ranked[0];
  const trailing = ranked[ranked.length - 1];
  const avgPrimary = withData.length
    ? Math.round(withData.reduce((a, x) => a + Number(x.r[cfg.primaryKey] ?? 0), 0) / withData.length)
    : 0;

  return (
    <section className="glass rounded-2xl p-5 border border-primary/10 relative overflow-hidden">
      {/* Ambient gradient wash unique to the focus */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-25 blur-2xl pointer-events-none"
        style={{ background: focusHalo(focus) }}
      />

      <header className="flex flex-wrap items-center gap-3 mb-3 relative">
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-[var(--cyan)] to-[var(--aurora)] shrink-0">
          <Star className="h-4 w-4 text-background" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">{cfg.eyebrow}</div>
          <h3 className="text-sm font-semibold truncate">{cfg.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg · 7 districts</div>
          <div className="text-lg font-black tabular-nums text-gradient-cyan leading-none">
            {avgPrimary}{cfg.unit}
          </div>
        </div>
      </header>

      {/* District chip row with per-district primary metric */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {KEY_DISTRICTS.map((k, i) => {
          const r = rows[i];
          const has = r && r.schools > 0;
          const v = has ? Number(r[cfg.primaryKey] ?? 0) : null;
          const rank = has ? ranked.findIndex((x) => x.i === i) + 1 : null;
          return (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-[11px] bg-secondary/60 border border-border"
              title={has ? `${r!.schools} schools reporting · rank #${rank}` : "No data yet"}
            >
              <span
                className="h-4 w-4 grid place-items-center rounded-full text-[9px] font-bold"
                style={{
                  background: has ? `oklch(0.72 0.2 ${HUES[i]} / 0.28)` : "var(--muted)",
                  color: has ? `oklch(0.72 0.2 ${HUES[i]})` : "var(--muted-foreground)",
                }}
              >
                {has ? rank : "—"}
              </span>
              <span className="font-medium">{k}</span>
              {has ? (
                <span className="tabular-nums font-semibold text-foreground/80">
                  {v}{cfg.unit}
                </span>
              ) : (
                <span className="text-muted-foreground text-[10px]">no data</span>
              )}
            </span>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-secondary/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Head-to-head · {cfg.primaryLabel} vs {cfg.secondaryLabel}</div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 6, right: 8, left: -18, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {[cfg.primaryLabel, cfg.secondaryLabel].map((label, bi) => (
                  <Bar key={label} dataKey={label} radius={[6, 6, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`oklch(${bi === 0 ? "0.72" : "0.6"} ${bi === 0 ? "0.2" : "0.14"} ${HUES[i]})`}
                        fillOpacity={(barData[i] as { _empty?: boolean })._empty ? 0.15 : 1}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Multi-metric radar</div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                {KEY_DISTRICTS.map((k, i) => (
                  <Radar
                    key={k}
                    name={k}
                    dataKey={k}
                    stroke={`oklch(0.72 0.2 ${HUES[i]})`}
                    fill={`oklch(0.72 0.2 ${HUES[i]})`}
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insight row */}
      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-xs">
        <InsightCard
          tone="up"
          label={cfg.higherIsBetter ? "Top performer" : "Highest exposure"}
          value={leader ? `${leader.r.district} · ${Number(leader.r[cfg.primaryKey] ?? 0)}${cfg.unit}` : "—"}
        />
        <InsightCard
          tone="down"
          label={cfg.higherIsBetter ? "Needs attention" : "Best positioned"}
          value={trailing && trailing !== leader ? `${trailing.r.district} · ${Number(trailing.r[cfg.primaryKey] ?? 0)}${cfg.unit}` : "—"}
        />
        <InsightCard
          tone="flat"
          label="Coverage"
          value={`${withData.length}/7 districts · ${totalSchools.toLocaleString()} schools · ${totalStudents.toLocaleString()} students`}
        />
      </div>

      <footer className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-[var(--aurora)] shrink-0 mt-0.5" />
        <div className="leading-relaxed text-muted-foreground">
          {cfg.hint}
        </div>
      </footer>
    </section>
  );
}

function focusHalo(f: KeyDistrictsFocus): string {
  const stop = ({
    wash: "oklch(0.86 0.16 220 / 0.5)",
    risk: "oklch(0.68 0.24 22 / 0.5)",
    sustainability: "oklch(0.84 0.2 155 / 0.5)",
    adoption: "oklch(0.7 0.22 285 / 0.5)",
    finance: "oklch(0.85 0.18 75 / 0.5)",
    overview: "oklch(0.82 0.19 175 / 0.5)",
  } as const)[f];
  return `radial-gradient(circle, ${stop}, transparent 70%)`;
}

function InsightCard({ tone, label, value }: { tone: "up" | "down" | "flat"; label: string; value: string }) {
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  const color =
    tone === "up" ? "var(--aurora)" : tone === "down" ? "var(--warn)" : "var(--cyan)";
  return (
    <div className="rounded-xl bg-secondary/40 border border-border/40 p-2.5 flex items-start gap-2">
      <span
        className="h-6 w-6 grid place-items-center rounded-lg shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[12px] font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
