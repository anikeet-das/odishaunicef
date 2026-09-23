import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { motion } from "framer-motion";
import odishaGeo from "@/assets/odisha-districts.json";
import type { School } from "@/lib/data/cces";

type Feature = {
  type: "Feature";
  properties: { name: string };
  geometry: GeoJSON.Geometry;
};

const W = 640;
const H = 480;

function scoreColor(score: number) {
  if (score >= 71) return "var(--aurora)";
  if (score >= 51) return "var(--cyan)";
  if (score >= 31) return "var(--warn)";
  return "var(--danger)";
}

export function DistrictMap({
  districtName,
  schools,
  overlay,
  onHoverSchool,
}: {
  districtName: string;
  schools: School[];
  overlay: "sustainability" | "hazard" | "shvr";
  onHoverSchool?: (s: School | null) => void;
}) {
  const features = (odishaGeo as unknown as { features: Feature[] }).features;
  const target = features.find((f) => f.properties.name === districtName);

  const [hover, setHover] = useState<string | null>(null);

  const { path, projected } = useMemo(() => {
    if (!target) return { path: null, projected: [] as { s: School; x: number; y: number }[] };
    const proj = geoMercator().fitExtent([[20, 20], [W - 20, H - 20]], target as unknown as GeoJSON.Feature);
    const p = geoPath(proj);
    const ps = schools.map((s) => {
      const xy = proj([s.lng, s.lat]);
      return { s, x: xy?.[0] ?? -100, y: xy?.[1] ?? -100 };
    });
    return { path: p, projected: ps };
  }, [target, schools]);

  if (!target || !path) {
    return (
      <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
        District geometry unavailable.
      </div>
    );
  }

  const d = path(target as unknown as GeoJSON.Feature) || "";

  function colorFor(s: School) {
    if (overlay === "sustainability") return scoreColor(s.sustainabilityScore);
    if (overlay === "hazard") return s.hazardScore === null ? "var(--muted-foreground)" : scoreColor(100 - s.hazardScore);
    return scoreColor((s.shvr / 5) * 100);
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden glass-strong">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: "radial-gradient(closest-side, oklch(0.21 0.05 260 / 0.5), transparent 70%)" }}>
        <defs>
          <linearGradient id="dist-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.34 0.1 220 / 0.95)" />
            <stop offset="100%" stopColor="oklch(0.16 0.06 270 / 0.95)" />
          </linearGradient>
          <pattern id="grid-d" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="oklch(0.78 0.18 220 / 0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid-d)" />

        {/* extrusion shadow */}
        <path d={d} fill="oklch(0.05 0 0 / 0.85)" transform="translate(0,8)" />

        {/* district shape */}
        <motion.path
          d={d}
          fill="url(#dist-fill)"
          stroke="oklch(0.85 0.2 195 / 0.65)"
          strokeWidth={1.4}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ filter: "drop-shadow(0 0 14px oklch(0.85 0.2 195 / 0.45))" }}
        />

        {/* schools */}
        {projected.map(({ s, x, y }) => {
          const isHover = hover === s.udise;
          const c = colorFor(s);
          return (
            <circle
              key={s.udise}
              cx={x}
              cy={y}
              r={isHover ? 5 : 2.6}
              fill={c}
              opacity={0.95}
              style={{ filter: `drop-shadow(0 0 ${isHover ? 6 : 3}px ${c})`, cursor: "pointer" }}
              onMouseEnter={() => { setHover(s.udise); onHoverSchool?.(s); }}
              onMouseLeave={() => { setHover((h) => (h === s.udise ? null : h)); onHoverSchool?.(null); }}
            />
          );
        })}

        {/* district label */}
        <text x={W / 2} y={28} textAnchor="middle" fontSize={14} fontWeight={700}
              fill="oklch(0.95 0.05 220)" style={{ letterSpacing: 1.5 }}>
          {districtName.toUpperCase()}
        </text>
        <text x={W / 2} y={44} textAnchor="middle" fontSize={9}
              fill="oklch(0.78 0.05 220 / 0.7)">
          {schools.length.toLocaleString()} schools plotted · overlay: {overlay}
        </text>
      </svg>

      {/* scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 right-0 h-[2px] opacity-25"
             style={{
               background: "linear-gradient(90deg, transparent, oklch(0.85 0.2 195), transparent)",
               animation: "scan 6s linear infinite",
             }} />
      </div>
    </div>
  );
}
