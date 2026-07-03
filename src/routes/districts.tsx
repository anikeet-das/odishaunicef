import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, aggregateByDistrict, type DistrictAgg } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { useViewMode } from "@/components/layout/view-mode";
import { DistrictSunburst } from "@/components/cr-sap/districts/DistrictSunburst";
import { DistrictTicket } from "@/components/cr-sap/districts/DistrictTicket";
import { Sparkles, Search, Download, X, Check, RotateCcw } from "lucide-react";
import { KeyDistrictsPanel } from "@/components/cr-sap/KeyDistrictsPanel";

export const Route = createFileRoute("/districts")({
  validateSearch: (search: Record<string, unknown>) => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({
    meta: [
      { title: "District Intelligence · CR-SAP Odisha" },
      { name: "description", content: "Live leaderboard for all 30 districts — sustainability, SHVR, climate risk, plan adoption." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: schools } = useSchools();
  const { mode } = useViewMode();
  const { focus } = Route.useSearch();
  if (!schools) return <LoadingShell title="District Intelligence" subtitle="AI Leaderboard" />;
  return mode === "macro"
    ? <MacroView rows={aggregateByDistrict(schools)} />
    : <MicroView rows={aggregateByDistrict(schools)} focus={focus} />;
}

/* ========================= MACRO — DaisyDisk sunburst ========================= */
function MacroView({ rows }: { rows: DistrictAgg[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const MAX = 7;
  function toggle(name: string) {
    if (confirmed) return; // locked after confirm
    setSelected((sel) => {
      if (sel.includes(name)) return sel.filter((s) => s !== name);
      if (sel.length >= MAX) return [...sel.slice(1), name];
      return [...sel, name];
    });
  }
  const sunburstRows = confirmed && selected.length
    ? rows.filter((r) => selected.includes(r.district))
    : rows;
  const visible = selected.length
    ? rows.filter((r) => selected.includes(r.district))
    : rows.slice(0, 8);

  function exportCsv() {
    const headers = ["District", "Schools", "Students", "SHVR", "Sustainability", "WASH", "ClimateRisk", "CRSAP%"];
    const lines = visible.map((d) => [d.district, d.schools, d.students, d.avgShvr.toFixed(2), d.avgSust, d.avgWash, d.avgHazard, d.crsapAdoption].join(","));
    const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "district-compare.csv"; a.click();
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="District Intelligence" subtitle="DaisyDisk · 30-district sunburst comparator" />
      <div className="p-3 space-y-3">
        <div className="grid lg:grid-cols-[1fr_320px] gap-3">
          {/* Sunburst */}
          <div className="relative glass rounded-2xl p-4 min-h-[78vh]">
            {/* Confirm/Cancel pinned to top-right corner of the visualization box */}
            {selected.length > 0 && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {!confirmed ? (
                  <button
                    onClick={() => setConfirmed(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold bg-[var(--aurora)] text-background hover:brightness-110 shadow-lg"
                  >
                    <Check className="h-3.5 w-3.5" /> Confirm ({selected.length})
                  </button>
                ) : (
                  <button
                    onClick={() => { setConfirmed(false); setSelected([]); }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold glass-strong hover:bg-destructive/20 shadow-lg"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restore 30
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mb-2 pr-32">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Sunburst</div>
                <div className="text-sm font-semibold">Tap districts to compare · up to {MAX}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">Outer ring = districts · inner rings = 7 parameter layers · radius ∝ value</div>
            </div>
              <DistrictSunburst rows={sunburstRows} selected={selected} onToggle={toggle} />
          </div>

          {/* Side: selection + AI synthesis */}
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Selection</div>
                <button onClick={() => setSelected([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              {selected.length === 0
                ? <div className="text-xs text-muted-foreground">No districts selected — showing top 8 by default.</div>
                : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 glass-soft rounded-full px-2.5 py-1 text-[11px]">
                        {s}
                        <button onClick={() => toggle(s)}><X className="h-3 w-3 text-muted-foreground" /></button>
                      </span>
                    ))}
                  </div>
                )}
              <div className="mt-2 text-[10px] text-muted-foreground">{selected.length} / {MAX} selected</div>
            </div>

            <div className="glass-strong rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-[var(--aurora)]" />
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Aurora · Comparison</div>
              </div>
              <p className="text-xs leading-relaxed">
                {comparisonNarrative(visible)}
              </p>
            </div>

            <button onClick={exportCsv}
              className="w-full inline-flex items-center justify-center gap-2 glass-soft rounded-xl px-3 py-2 text-xs hover:bg-primary/10">
              <Download className="h-3.5 w-3.5" /> Export visible CSV
            </button>
          </div>
        </div>

        {/* Raw data table */}
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Raw data · {visible.length} rows</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["District","Schools","Students","SHVR ★","Sustainability","WASH","Climate Risk","CR-SAP %","Top hazard"].map((h) =>
                    <th key={h} className="text-left px-3 py-1.5">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr key={d.districtId} className="border-t border-border/30">
                    <td className="px-3 py-2 font-medium">{d.district}</td>
                    <td className="px-3 py-2 tabular-nums">{d.schools}</td>
                    <td className="px-3 py-2 tabular-nums">{d.students.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{d.avgShvr.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums">{d.avgSust}%</td>
                    <td className="px-3 py-2 tabular-nums">{d.avgWash}%</td>
                    <td className="px-3 py-2 tabular-nums">{d.avgHazard}%</td>
                    <td className="px-3 py-2 tabular-nums">{d.crsapAdoption}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.topHazard ?? "—"}</td>
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

function comparisonNarrative(rows: DistrictAgg[]): string {
  if (rows.length === 0) return "Select districts on the sunburst to compare.";
  const best = [...rows].sort((a, b) => b.avgSust - a.avgSust)[0];
  const worst = [...rows].sort((a, b) => b.avgHazard - a.avgHazard)[0];
  const washLeader = [...rows].sort((a, b) => b.avgWash - a.avgWash)[0];
  return `Across the ${rows.length} highlighted districts, ${best.district} leads sustainability at ${best.avgSust}%, while ${worst.district} carries the heaviest climate-risk load (${worst.avgHazard}%, top hazard: ${worst.topHazard ?? "n/a"}). ${washLeader.district} sets the WASH benchmark at ${washLeader.avgWash}% — replicate its operational playbook. Recommended action: priority CR-SAP rollout in the bottom-half by sustainability with paired drills in the high-risk cohort.`;
}

/* ========================= MICRO — 30x1 flight-ticket matrix ========================= */
function MicroView({ rows, focus }: { rows: DistrictAgg[]; focus?: string }) {
  const [q, setQ] = useState(focus ?? "");
  const list = useMemo(
    () => rows.filter((r) => r.district.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  // When arriving from the map with a focused district, scroll it into view.
  useEffect(() => {
    if (!focus) return;
    setQ(focus);
    const id = window.setTimeout(() => {
      const el = document.getElementById(`district-${focus.toLowerCase().replace(/\s+/g, "-")}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(id);
  }, [focus]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="District Intelligence" subtitle="30×1 Ticket Matrix · per-district intelligence" />
      <div className="p-3 space-y-3">
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search district…"
                   className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <div className="text-[11px] text-muted-foreground ml-auto">{list.length} of {rows.length} districts</div>
        </div>

        <div className="space-y-3">
          {list.map((d, i) => (
            <div key={d.districtId} id={`district-${d.district.toLowerCase().replace(/\s+/g, "-")}`}>
              <DistrictTicket d={d} index={i} />
            </div>
          ))}
          {list.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No districts match.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* keep legacy helpers — unused but harmless if imported */
function _legacyMarker() { return null; }
_legacyMarker();
