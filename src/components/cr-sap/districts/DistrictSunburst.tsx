import { useMemo, useState } from "react";
import { arc as d3arc } from "d3-shape";
import { motion } from "framer-motion";
import type { DistrictAgg } from "@/lib/data/cces";

/**
 * Apple "DaisyDisk"-inspired sunburst.
 *
 * Outer ring = 30 districts (each with a unique hue).
 * Inner rings = parameter layers (each rendered in a different lightness
 * of the district's own hue, so layers are visually grouped by district).
 * Parameter ring radius is proportional to the value, producing the
 * characteristic uneven "petal" silhouette.
 */

type Params = "schools" | "students" | "shvr" | "sust" | "wash" | "risk" | "crsap";

const PARAM_LAYERS: { key: Params; label: string; max: number; field: (d: DistrictAgg) => number }[] = [
  { key: "schools",  label: "Schools",        max: 600, field: (d) => d.schools },
  { key: "students", label: "Students",       max: 50000, field: (d) => d.students },
  { key: "shvr",     label: "SHVR ★",         max: 5,   field: (d) => d.avgShvr },
  { key: "sust",     label: "Sustainability", max: 100, field: (d) => d.avgSust },
  { key: "wash",     label: "WASH",           max: 100, field: (d) => d.avgWash },
  { key: "risk",     label: "Climate Risk",   max: 100, field: (d) => d.avgHazard },
  { key: "crsap",    label: "CR-SAP %",       max: 100, field: (d) => d.crsapAdoption },
];

// 30 distinct hues spread across the OKLCH wheel (avoid close neighbours).
const HUES = Array.from({ length: 30 }, (_, i) =>
  Math.round((i * 360) / 30 + (i % 2 === 0 ? 0 : 15)) % 360
);

function districtFill(hue: number, layerIdx: number): string {
  // Lightness ramps from light (outer) to deep (inner) for visual depth.
  const L = 0.78 - layerIdx * 0.045;
  const C = 0.18 - layerIdx * 0.012;
  return `oklch(${L.toFixed(2)} ${C.toFixed(2)} ${hue})`;
}

export function DistrictSunburst({
  rows,
  selected,
  onToggle,
  size = 720,
}: {
  rows: DistrictAgg[];
  selected: string[];
  onToggle: (district: string) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<{ d: string; p: string; v: number } | null>(null);
  const radius = size / 2;
  const innerCore = 60;

  /** Pre-compute per-layer rings. */
  const layers = useMemo(() => {
    const n = rows.length || 1;
    const ringSpan = (radius - innerCore) / PARAM_LAYERS.length;
    return PARAM_LAYERS.map((param, li) => {
      const r0 = innerCore + li * ringSpan;
      const r1Max = r0 + ringSpan - 2;
      const segments = rows.map((row, di) => {
        const v = param.field(row);
        const t = Math.max(0, Math.min(1, v / param.max));
        // proportional outer radius -> uneven daisy silhouette
        const r1 = r0 + (r1Max - r0) * (0.35 + 0.65 * t);
        const a0 = (di / n) * Math.PI * 2;
        const a1 = ((di + 1) / n) * Math.PI * 2;
        const arcGen = d3arc<unknown>()
          .innerRadius(r0 + 1)
          .outerRadius(r1)
          .startAngle(a0)
          .endAngle(a1)
          .padAngle(0.004)
          .cornerRadius(2);
        return {
          d: arcGen({}) ?? "",
          fill: districtFill(HUES[di % HUES.length], li),
          district: row.district,
          value: v,
          paramLabel: param.label,
          paramKey: param.key,
          selected: selected.includes(row.district),
        };
      });
      return { param, r0, r1Max, segments };
    });
  }, [rows, selected, radius]);

  return (
    <div className="relative w-full h-full grid place-items-center">
      <svg viewBox={`-${radius} -${radius} ${size} ${size}`} width="100%" height="100%" style={{ maxHeight: "80vh" }}>
        <defs>
          <radialGradient id="daisy-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.95 0.08 200)" />
            <stop offset="100%" stopColor="oklch(0.45 0.08 260)" />
          </radialGradient>
          <filter id="daisy-glow"><feGaussianBlur stdDeviation="2.4" /></filter>
        </defs>

        {/* layer rings */}
        {layers.map((layer, li) => (
          <g key={layer.param.key}>
            {layer.segments.map((s) => (
              <motion.path
                key={`${li}-${s.district}`}
                d={s.d}
                fill={s.fill}
                fillOpacity={s.selected ? 1 : 0.85}
                stroke={s.selected ? "oklch(0.95 0.13 200)" : "oklch(0.12 0.03 260 / 0.4)"}
                strokeWidth={s.selected ? 1.8 : 0.4}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: li * 0.03 }}
                style={{ cursor: "pointer", filter: s.selected ? "drop-shadow(0 0 8px oklch(0.95 0.13 200 / 0.6))" : undefined }}
                onMouseEnter={() => setHover({ d: s.district, p: s.paramLabel, v: s.value })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onToggle(s.district)}
              >
                <title>{s.district} · {s.paramLabel} = {s.value.toLocaleString()}</title>
              </motion.path>
            ))}
          </g>
        ))}

        {/* core */}
        <circle r={innerCore - 4} fill="url(#daisy-core)" opacity={0.5} />
        <circle r={innerCore - 4} fill="none" stroke="oklch(0.95 0.13 200 / 0.6)" strokeWidth="0.8" />
        <text textAnchor="middle" y="-8" fontSize="11" fontWeight={700} fill="oklch(0.97 0.04 210)" style={{ letterSpacing: 2 }}>ODISHA</text>
        <text textAnchor="middle" y="8"  fontSize="9"  fill="oklch(0.85 0.05 220)">{rows.length} districts</text>
        <text textAnchor="middle" y="22" fontSize="9"  fill="oklch(0.75 0.05 220)">{PARAM_LAYERS.length} layers</text>

        {/* legend ring (parameter labels) on left side */}
        {layers.map((l, li) => {
          const y = innerCore + li * ((radius - innerCore) / PARAM_LAYERS.length) + ((radius - innerCore) / PARAM_LAYERS.length) / 2;
          return (
            <g key={`legend-${l.param.key}`}>
              <line x1={-radius + 8} y1={-y} x2={-y * 0.9} y2={-y * 0.9} stroke="oklch(0.85 0.05 220 / 0.2)" strokeDasharray="2 3" />
              <text x={-radius + 12} y={-y + 3} fontSize="9" fill="oklch(0.85 0.05 220 / 0.9)">{l.param.label}</text>
            </g>
          );
        })}
      </svg>

      {/* hover tooltip */}
      {hover && (
        <div className="absolute top-3 right-3 glass-strong rounded-xl px-3 py-2 text-xs pointer-events-none">
          <div className="font-semibold text-[var(--cyan)]">{hover.d}</div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider mt-0.5">{hover.p}</div>
          <div className="text-base font-bold tabular-nums">{hover.v.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

export const SUNBURST_PARAMS = PARAM_LAYERS;