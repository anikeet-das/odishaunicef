import { motion } from "framer-motion";
import { Layers, Box, RotateCcw, Plus, Minus, Square } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import odishaGeo from "@/assets/odisha-districts.json";

type Feature = {
  type: "Feature";
  properties: { name: string };
  geometry: GeoJSON.Geometry;
};

export type DistrictStat = {
  schools: number;
  students: number;
  sust: number; // 0..100, derived from real responses
};

const W = 800;
const H = 560;

function scoreColor(score: number, hasData: boolean) {
  if (!hasData) return "var(--muted-foreground)";
  if (score >= 71) return "var(--aurora)";
  if (score >= 51) return "var(--cyan)";
  if (score >= 31) return "var(--warn)";
  return "var(--danger)";
}

export function OdishaMap({
  selected,
  onSelect,
  stats = {},
}: {
  selected?: string | null;
  onSelect?: (name: string | null) => void;
  stats?: Record<string, DistrictStat>;
}) {
  const features = (odishaGeo as unknown as { features: Feature[] }).features;

  const [hover, setHover] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const { path } = useMemo(() => {
    const fc = { type: "FeatureCollection" as const, features };
    const proj = geoMercator().fitSize([W, H], fc as GeoJSON.FeatureCollection);
    return { path: geoPath(proj) };
  }, [features]);

  const enriched = useMemo(() => {
    return features.map((f) => {
      const c = path.centroid(f as unknown as GeoJSON.Feature);
      const st = stats[f.properties.name];
      const d = path(f as unknown as GeoJSON.Feature) || "";
      const hasData = !!st && st.schools > 0;
      const fill = hasData ? scoreColor(st.sust, true) : "var(--muted-foreground)";
      return { feature: f, centroid: c, stat: st, d, hasData, fill };
    });
  }, [features, path, stats]);

  function onMove(e: React.PointerEvent) {
    if (!is3D) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: 18 + -py * 14, y: px * 18 });
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden glass-strong">
      {/* Legend — sustainability index from live responses */}
      <div className="absolute left-3 top-3 z-20 glass rounded-xl p-2.5 w-44">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
          Sustainability index
        </div>
        <ul className="space-y-1">
          {[
            { label: "Excellent (71-100)", color: "var(--aurora)" },
            { label: "Good (51-70)", color: "var(--cyan)" },
            { label: "Needs work (31-50)", color: "var(--warn)" },
            { label: "Critical (0-30)", color: "var(--danger)" },
            { label: "No responses yet", color: "var(--muted-foreground)" },
          ].map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-muted-foreground">
          Tap a district to open its intelligence page.
        </div>
      </div>

      {/* 3D stage */}
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => setTilt(is3D ? { x: 18, y: -8 } : { x: 0, y: 0 })}
        className="relative h-full w-full flex items-center justify-center"
        style={{ perspective: "1400px" }}
      >
        <motion.div
          className="relative"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoom})`,
            transition: "transform 0.35s cubic-bezier(.2,.8,.2,1)",
            width: W,
            height: H,
            maxWidth: "100%",
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: "visible" }}>
            {/* extrusion shadow */}
            <g transform="translate(0,10)" opacity="0.5">
              {enriched.map((e) => (
                <path key={`s-${e.feature.properties.name}`} d={e.d} fill="oklch(0.05 0 0 / 0.9)" />
              ))}
            </g>

            {/* main districts, coloured by real sustainability index */}
            {enriched.map((e) => {
              const name = e.feature.properties.name;
              const isHover = hover === name;
              const isActive = selected === name;
              return (
                <motion.path
                  key={name}
                  d={e.d}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  fill={e.fill}
                  fillOpacity={isActive ? 0.9 : isHover ? 0.7 : e.hasData ? 0.45 : 0.15}
                  stroke="oklch(0.85 0.2 195 / 0.55)"
                  strokeWidth={isActive ? 1.6 : 0.7}
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 0 12px oklch(0.85 0.2 195 / 0.85))"
                      : "drop-shadow(0 2px 4px oklch(0.05 0 0 / 0.7))",
                    cursor: "pointer",
                  }}
                  onPointerEnter={() => setHover(name)}
                  onPointerLeave={() => setHover((h) => (h === name ? null : h))}
                  onClick={() => onSelect?.(name)}
                />
              );
            })}

            {/* labels */}
            {showLabels && enriched.map((e) => (
              <text key={`l-${e.feature.properties.name}`}
                    x={e.centroid[0]} y={e.centroid[1]} textAnchor="middle" pointerEvents="none"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      fill: "oklch(0.92 0.04 230 / 0.85)",
                      paintOrder: "stroke",
                      stroke: "oklch(0.08 0.04 270)",
                      strokeWidth: 2,
                    }}>
                {e.feature.properties.name}
              </text>
            ))}
          </svg>

          {/* Floating hover card — REAL response data only */}
          {hover && (() => {
            const e = enriched.find((x) => x.feature.properties.name === hover);
            if (!e) return null;
            const [cx, cy] = e.centroid;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute glass-strong rounded-xl p-3 pointer-events-none"
                style={{
                  left: `${(cx / W) * 100}%`,
                  top: `${(cy / H) * 100}%`,
                  minWidth: 170,
                }}
              >
                <div className="text-[11px] font-bold text-gradient-cyan">{hover}</div>
                {e.hasData ? (
                  <>
                    <div className="text-[10px] text-muted-foreground">Schools <b className="text-foreground">{e.stat!.schools}</b></div>
                    <div className="text-[10px] text-muted-foreground">Students <b className="text-foreground">{e.stat!.students.toLocaleString()}</b></div>
                    <div className="text-[10px] text-muted-foreground">Sustainability <b style={{ color: e.fill }}>{e.stat!.sust}/100</b></div>
                  </>
                ) : (
                  <div className="text-[10px] text-muted-foreground">No responses yet</div>
                )}
              </motion.div>
            );
          })()}
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-2 py-1.5 flex items-center gap-1">
        <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} title="Zoom out"
                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="text-[10px] font-mono text-muted-foreground w-10 text-center">{zoom.toFixed(1)}×</div>
        <button onClick={() => setZoom((z) => Math.min(2.0, +(z + 0.1).toFixed(2)))} title="Zoom in"
                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="h-5 w-px bg-white/10 mx-1" />
        <button onClick={() => setShowLabels((s) => !s)} title="Toggle labels"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${showLabels ? "text-[var(--cyan)] bg-white/5" : "text-muted-foreground hover:text-foreground hover:bg-white/10"}`}>
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setZoom(1); setTilt(is3D ? { x: 18, y: -8 } : { x: 0, y: 0 }); onSelect?.(null); }}
          title="Reset view"
          className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { const next = !is3D; setIs3D(next); setTilt(next ? { x: 35, y: 0 } : { x: 0, y: 0 }); }}
          title={is3D ? "Switch to 2D" : "Switch to 3D"}
          className="h-8 px-3 rounded-full bg-[var(--cyan)]/20 text-[var(--cyan)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--cyan)]/30">
          {is3D ? <Box className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />} {is3D ? "3D" : "2D"}
        </button>
      </div>

      {/* Compass */}
      <div className="absolute top-3 right-3 z-20 h-12 w-12 rounded-full glass grid place-items-center text-[10px] font-bold text-[var(--cyan)]">
        N
      </div>
    </div>
  );
}
