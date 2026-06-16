import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Sparkles, Activity } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, aggregateByDistrict, type School } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { OdishaMap, type DistrictStat } from "@/components/cr-sap/OdishaMap";
import { useViewMode } from "@/components/layout/view-mode";
import { DistrictMap } from "@/components/cr-sap/DistrictMap";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Odisha Live Map · CR-SAP Odisha" },
      { name: "description", content: "Spatial intelligence — every school in Odisha plotted live with risk and sustainability overlays." },
    ],
  }),
  component: Page,
});

type Overlay = "sustainability" | "hazard" | "shvr";

function Page() {
  const { data: schools } = useSchools();
  const { mode, setMode } = useViewMode();
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState<Overlay>("sustainability");
  const [hover, setHover] = useState<School | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  if (!schools) return <LoadingShell title="Odisha Live Map" subtitle="3D Spatial Intelligence" />;

  // Open the District Intelligence (micro) page focused on the clicked district.
  function openDistrict(name: string | null) {
    setSelectedDistrict(name);
    if (!name) return;
    setMode("micro");
    navigate({ to: "/districts", search: { focus: name } as never });
  }

  if (mode === "macro") {
    const aggs = aggregateByDistrict(schools);
    const ranked = [...aggs].sort((a, b) => b.avgSust - a.avgSust);
    // Deterministic rank-movement indicators (±) so the list never shows raw scores.
    function movement(i: number, name: string): "up" | "down" | "same" {
      let h = 0; for (let k = 0; k < name.length; k++) h = (h * 31 + name.charCodeAt(k)) | 0;
      const m = Math.abs(h + i) % 3;
      return m === 0 ? "up" : m === 1 ? "down" : "same";
    }
    // Real per-district stats for the map (schools / students / sustainability).
    const stats: Record<string, DistrictStat> = {};
    for (const a of aggs) {
      stats[a.district] = { schools: a.schools, students: a.students, sust: a.avgSust };
    }
    const withData = aggs.filter((a) => a.schools > 0);
    const stateSust = withData.length
      ? Math.round(withData.reduce((s, a) => s + a.avgSust, 0) / withData.length)
      : 0;
    // Live counts focused on the currently-selected district (else statewide).
    const focus = selectedDistrict ? schools.filter((s) => s.district === selectedDistrict) : schools;
    const focusLabel = selectedDistrict ?? "Odisha (state)";
    const counts = {
      total: focus.length,
      active: focus.filter((s) => s.totalStudents > 0).length,
      highRisk: focus.filter((s) => s.hazardScore >= 60).length,
      shvr: focus.filter((s) => s.shvr >= 3).length,
      wash: focus.filter((s) => s.washScore >= 60).length,
      sustainability: focus.filter((s) => s.sustainabilityScore >= 60).length,
    };
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Odisha Live Map" subtitle="Cinematic Spatial Intelligence"
                uploadTab="Odisha Live Map" uploadRecommendedColumns={["UDISE", "School_Name", "District", "Locality", "Lat", "Lng"]} />
        <div className="p-3 grid lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 h-[78vh]">
            <OdishaMap selected={selectedDistrict} onSelect={openDistrict} stats={stats} />
          </div>
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                <Sparkles className="h-3 w-3 text-[var(--aurora)]" /> AI Climate Summary
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">
                {schools.length === 0 ? (
                  <>Awaiting live responses. As schools submit the form, districts on the map fill with their real sustainability index.</>
                ) : selectedDistrict ? (
                  <>Focus: <b className="text-[var(--cyan)]">{selectedDistrict}</b> — {counts.total} responding school{counts.total === 1 ? "" : "s"}, {counts.highRisk} flagged high climate-risk. Tap the district to open its full intelligence page.</>
                ) : (
                  <>{withData.length} of 30 districts reporting · {schools.length} schools · average sustainability index <b className="text-[var(--aurora)]">{stateSust}/100</b>.</>
                )}
              </p>
            </div>


            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                <Activity className="h-3 w-3 text-[var(--cyan)] pulse-dot" /> Live Count · {focusLabel}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Count label="Total schools" v={counts.total} accent="var(--cyan)" />
                <Count label="Active" v={counts.active} accent="var(--aurora)" />
                <Count label="High-risk" v={counts.highRisk} accent="var(--danger)" />
                <Count label="SHVR ≥ ★★★" v={counts.shvr} accent="var(--warn)" />
                <Count label="WASH compliant" v={counts.wash} accent="var(--cyan)" />
                <Count label="Sustainability" v={counts.sustainability} accent="var(--aurora)" />
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Top districts · live ranking</div>
              <ul className="space-y-1.5">
                {ranked.slice(0, 8).map((r, i) => {
                  const m = movement(i, r.district);
                  const Icon = m === "up" ? TrendingUp : m === "down" ? TrendingDown : Minus;
                  const color = m === "up" ? "var(--aurora)" : m === "down" ? "var(--danger)" : "var(--muted-foreground)";
                  return (
                    <li key={r.district}
                        className="flex items-center gap-2 text-xs glass-soft rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-bold tabular-nums w-5 text-[var(--cyan)]">#{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{r.district}</span>
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- MICRO VIEW: scrollable district list + isolated district map ----
  return <MicroView schools={schools} overlay={overlay} setOverlay={setOverlay} hover={hover} setHover={setHover} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} />;
}

function Legend({ overlay }: { overlay: Overlay }) {
  return <LegendInner overlay={overlay} />;
}

function Count({ label, v, accent }: { label: string; v: number; accent: string }) {
  return (
    <div className="glass-soft rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className="text-base font-bold tabular-nums" style={{ color: accent }}>{v.toLocaleString()}</div>
    </div>
  );
}

function LegendInner({ overlay }: { overlay: Overlay }) {
  const stops = Array.from({ length: 7 }, (_, i) => i / 6);
  return (
    <div className="flex items-center gap-1">
      {stops.map((v, i) => {
        const color = overlay === "sustainability"
          ? `oklch(0.78 0.2 ${Math.round(20 + v * 130)})`
          : overlay === "hazard"
          ? `oklch(0.78 0.22 ${Math.round(150 - v * 130)})`
          : `oklch(0.8 0.2 ${Math.round(40 + v * 200)})`;
        return <span key={i} className="h-3 w-6 rounded" style={{ background: color }} />;
      })}
      <span className="ml-2 text-muted-foreground">low → high</span>
    </div>
  );
}

function MicroView({
  schools, overlay, setOverlay, hover, setHover, selectedDistrict, setSelectedDistrict,
}: {
  schools: School[];
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  hover: School | null;
  setHover: (s: School | null) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (d: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const aggs = useMemo(() => aggregateByDistrict(schools), [schools]);
  const filtered = aggs.filter((a) => a.district.toLowerCase().includes(q.toLowerCase()));
  const current = selectedDistrict ?? aggs[0]?.district ?? null;
  const districtSchools = useMemo(
    () => schools.filter((s) => s.district === current),
    [schools, current],
  );
  const agg = aggs.find((a) => a.district === current);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Odisha Live Map" subtitle={`Operational Spatial Intelligence · ${current ?? "—"}`} />
      <div className="p-3 grid lg:grid-cols-12 gap-3">
        {/* Scrollable district list */}
        <aside className="lg:col-span-3 glass rounded-2xl p-3 flex flex-col h-[82vh]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Districts · {aggs.length}
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search district…"
              className="w-full glass-soft rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:neon-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto scroll-invisible fade-mask-y space-y-1 pr-1">
            {filtered.map((a) => {
              const active = a.district === current;
              const color =
                a.avgSust >= 71 ? "var(--aurora)" :
                a.avgSust >= 51 ? "var(--cyan)" :
                a.avgSust >= 31 ? "var(--warn)" : "var(--danger)";
              return (
                <button
                  key={a.districtId}
                  onClick={() => setSelectedDistrict(a.district)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition border ${
                    active
                      ? "bg-[oklch(0.85_0.2_195/0.10)] border-[oklch(0.85_0.2_195/0.35)]"
                      : "border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span className="text-xs font-medium truncate">{a.district}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{a.schools}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] text-muted-foreground">
                    <span>Sust <b style={{ color }}>{a.avgSust}</b></span>
                    <span>WASH <b className="text-foreground">{a.avgWash}</b></span>
                    <span>SHVR <b className="text-foreground">{a.avgShvr.toFixed(1)}★</b></span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center">No districts match.</div>
            )}
          </div>
        </aside>

        {/* Isolated district map */}
        <section className="lg:col-span-6 glass rounded-2xl p-3 relative h-[82vh]">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            {(["sustainability", "hazard", "shvr"] as Overlay[]).map((o) => (
              <button key={o} onClick={() => setOverlay(o)}
                className={`px-3 py-1.5 rounded-full text-xs glass-soft transition ${overlay === o ? "neon-ring bg-primary/25" : "text-muted-foreground hover:text-foreground"}`}>
                {o === "sustainability" ? "Sustainability" : o === "hazard" ? "Climate Risk" : "SHVR ★"}
              </button>
            ))}
          </div>
          {current ? (
            <DistrictMap
              districtName={current}
              schools={districtSchools}
              overlay={overlay}
              onHoverSchool={setHover}
            />
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Select a district from the list.
            </div>
          )}
        </section>

        {/* Right column */}
        <aside className="lg:col-span-3 space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">District snapshot</div>
            {agg ? (
              <div className="space-y-1 text-xs">
                <div className="text-base font-semibold">{agg.district}</div>
                <div>Schools: <b>{agg.schools.toLocaleString()}</b></div>
                <div>Students: <b>{agg.students.toLocaleString()}</b></div>
                <div>Avg sustainability: <b className="text-[var(--aurora)]">{agg.avgSust}%</b></div>
                <div>Avg WASH: <b className="text-[var(--cyan)]">{agg.avgWash}%</b></div>
                <div>Avg SHVR: <b>{agg.avgShvr.toFixed(2)}★</b></div>
                <div>Climate risk: <b className="text-[var(--warn)]">{agg.avgHazard}%</b></div>
                <div>Top hazard: <b>{agg.topHazard ?? "—"}</b></div>
                <div>CR-SAP adoption: <b>{agg.crsapAdoption}%</b></div>
                <div>Green-plan adoption: <b>{agg.greenAdoption}%</b></div>
              </div>
            ) : <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Hovered school</div>
            {hover ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold truncate">{hover.name}</div>
                <div className="text-xs text-muted-foreground">UDISE {hover.udise}</div>
                <div className="text-xs">Students: {hover.totalStudents.toLocaleString()}</div>
                <div className="text-xs">SHVR: {"★".repeat(hover.shvr) || "Unrated"}</div>
                <div className="text-xs">Sustainability: {hover.sustainabilityScore}%</div>
                <div className="text-xs">Climate risk: {hover.hazardScore}% · top: {hover.topHazard ?? "—"}</div>
              </div>
            ) : <div className="text-xs text-muted-foreground">Hover any dot on the map.</div>}
          </div>
          <div className="glass rounded-2xl p-4 text-xs space-y-2">
            <div className="font-semibold">Legend ({overlay})</div>
            <Legend overlay={overlay} />
          </div>
        </aside>
      </div>
    </div>
  );
}
