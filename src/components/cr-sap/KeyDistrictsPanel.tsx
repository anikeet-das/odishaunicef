import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
} from "recharts";
import { Star, Sparkles } from "lucide-react";
import { KEY_DISTRICTS } from "@/lib/data/odisha";
import { aggregateByDistrict, type DistrictAgg, type School } from "@/lib/data/cces";

/**
 * Priority-district strip. Rendered near the top of every page that shows
 * district-level analytics. Compares Koraput · Khordha · Rayagada · Ganjam ·
 * Kendrapara · Sambalpur · Sundargarh on the metrics most relevant to the page.
 * Districts without any submitted data render as "No data" chips so the panel
 * never fabricates numbers.
 */
export type KeyDistrictsFocus = "sustainability" | "wash" | "risk" | "adoption" | "overview" | "finance";

const HUES = [12, 55, 115, 175, 220, 275, 320]; // one distinct hue per key district

function metricConfig(f: KeyDistrictsFocus) {
  switch (f) {
    case "wash":
      return {
        title: "Key Districts · WASH readiness",
        bars: [{ key: "avgWash", label: "WASH %" }, { key: "avgSust", label: "Sustainability %" }],
        radar: ["avgWash", "avgSust", "crsapAdoption", "greenAdoption"] as (keyof DistrictAgg)[],
        radarLabels: ["WASH", "Sustainability", "CR-SAP", "Green plan"],
      };
    case "risk":
      return {
        title: "Key Districts · Climate risk profile",
        bars: [{ key: "avgHazard", label: "Climate risk %" }, { key: "avgWash", label: "WASH %" }],
        radar: ["avgHazard", "avgWash", "avgSust", "crsapAdoption"] as (keyof DistrictAgg)[],
        radarLabels: ["Climate risk", "WASH", "Sustainability", "CR-SAP"],
      };
    case "sustainability":
      return {
        title: "Key Districts · Sustainability index",
        bars: [{ key: "avgSust", label: "Sustainability %" }, { key: "greenAdoption", label: "Green plan %" }],
        radar: ["avgSust", "avgWash", "greenAdoption", "crsapAdoption"] as (keyof DistrictAgg)[],
        radarLabels: ["Sustainability", "WASH", "Green plan", "CR-SAP"],
      };
    case "adoption":
      return {
        title: "Key Districts · Plan adoption",
        bars: [{ key: "crsapAdoption", label: "CR-SAP %" }, { key: "greenAdoption", label: "Green plan %" }],
        radar: ["crsapAdoption", "greenAdoption", "avgSust", "avgWash"] as (keyof DistrictAgg)[],
        radarLabels: ["CR-SAP", "Green plan", "Sustainability", "WASH"],
      };
    case "finance":
      return {
        title: "Key Districts · programme footprint",
        bars: [{ key: "schools", label: "Schools reporting" }, { key: "students", label: "Students (÷100)" }],
        radar: ["avgSust", "avgWash", "avgHazard", "crsapAdoption"] as (keyof DistrictAgg)[],
        radarLabels: ["Sustainability", "WASH", "Climate risk", "CR-SAP"],
      };
    default:
      return {
        title: "Key Districts · programme snapshot",
        bars: [{ key: "avgSust", label: "Sustainability %" }, { key: "avgWash", label: "WASH %" }],
        radar: ["avgSust", "avgWash", "avgHazard", "crsapAdoption"] as (keyof DistrictAgg)[],
        radarLabels: ["Sustainability", "WASH", "Climate risk", "CR-SAP"],
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
  const cfg = metricConfig(focus);
  const rows = useMemo(() => {
    if (!schools) return [];
    const all = aggregateByDistrict(schools);
    return KEY_DISTRICTS.map((name) => all.find((d) => d.district === name) ?? null);
  }, [schools]);

  const barData = rows.map((r, i) => {
    if (!r || r.schools === 0) return { name: KEY_DISTRICTS[i], _empty: true };
    const row: Record<string, string | number> = { name: r.district };
    for (const b of cfg.bars) {
      const raw = (r as unknown as Record<string, number>)[b.key] ?? 0;
      row[b.label] = b.label.includes("÷100") ? Math.round(raw / 100) : raw;
    }
    return row;
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

  const withData = rows.filter((r) => r && r.schools > 0) as DistrictAgg[];
  const totalSchools = withData.reduce((a, r) => a + r.schools, 0);
  const totalStudents = withData.reduce((a, r) => a + r.students, 0);
  const bestSust = [...withData].sort((a, b) => b.avgSust - a.avgSust)[0];
  const worstRisk = [...withData].sort((a, b) => b.avgHazard - a.avgHazard)[0];

  return (
    <section className="glass rounded-2xl p-5 border border-primary/10">
      <header className="flex flex-wrap items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-[var(--cyan)] to-[var(--aurora)] shrink-0">
          <Star className="h-4 w-4 text-background" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">UNICEF · Priority districts</div>
          <h3 className="text-sm font-semibold truncate">{cfg.title}</h3>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {KEY_DISTRICTS.map((k, i) => {
            const r = rows[i];
            const has = r && r.schools > 0;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] bg-secondary/60 border border-border"
                title={has ? `${r!.schools} school${r!.schools === 1 ? "" : "s"} reporting` : "No data yet"}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: has ? `oklch(0.72 0.2 ${HUES[i]})` : "var(--muted-foreground)",
                    opacity: has ? 1 : 0.4,
                  }}
                />
                <span className="font-medium">{k}</span>
                {!has && <span className="text-muted-foreground text-[10px]">· no data</span>}
              </span>
            );
          })}
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-secondary/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Comparison</div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 6, right: 8, left: -18, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--foreground)" }} iconType="circle" />
                {cfg.bars.map((b, bi) => (
                  <Bar key={b.label} dataKey={b.label} radius={[6, 6, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`oklch(${bi === 0 ? "0.72" : "0.62"} ${bi === 0 ? "0.2" : "0.15"} ${HUES[i]})`}
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
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "var(--foreground)" }} iconType="circle" />
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

      <footer className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-[var(--aurora)] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          {withData.length === 0 ? (
            <span className="text-muted-foreground">
              None of the 7 priority districts have submitted data yet. Live sync from the Google Form will populate this
              panel as soon as responses arrive.
            </span>
          ) : (
            <>
              <b>{withData.length}</b> of 7 priority districts reporting · <b>{totalSchools.toLocaleString()}</b> schools
              covering <b>{totalStudents.toLocaleString()}</b> students.
              {bestSust && <> Highest sustainability: <b>{bestSust.district}</b> ({bestSust.avgSust}%).</>}
              {worstRisk && worstRisk.avgHazard > 0 && (
                <> Highest climate risk: <b>{worstRisk.district}</b> ({worstRisk.avgHazard}%).</>
              )}
            </>
          )}
        </div>
      </footer>
    </section>
  );
}
