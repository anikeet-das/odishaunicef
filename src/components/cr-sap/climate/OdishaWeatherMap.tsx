import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { motion } from "framer-motion";
import odishaGeo from "@/assets/odisha-districts.json";
import type { DistrictWeather } from "@/lib/weather/openmeteo";
import { describeCode } from "@/lib/weather/openmeteo";
import { layerColor } from "./ClimateAlertsPage";

export type WeatherLayer =
  | "temperature" | "rain" | "wind" | "humidity" | "uv"
  | "pressure" | "cloud" | "visibility" | "storm";

type Feature = {
  type: "Feature";
  properties: { name: string };
  geometry: GeoJSON.Geometry;
};

const W = 1100;
const H = 720;

function layerValue(layer: WeatherLayer, r: DistrictWeather): number {
  switch (layer) {
    case "temperature": return r.temp;
    case "rain":        return r.precipitation;
    case "wind":        return r.windSpeed;
    case "humidity":    return r.humidity;
    case "uv":          return r.uv;
    case "pressure":    return r.pressure;
    case "cloud":       return r.cloud;
    case "visibility":  return r.visibility / 1000;
    case "storm":       return r.weatherCode;
  }
}

function layerRange(layer: WeatherLayer): [number, number] {
  switch (layer) {
    case "temperature": return [18, 44];
    case "rain":        return [0, 12];
    case "wind":        return [0, 70];
    case "humidity":    return [25, 100];
    case "uv":          return [0, 12];
    case "pressure":    return [990, 1020];
    case "cloud":       return [0, 100];
    case "visibility":  return [1, 24];
    case "storm":       return [0, 99];
  }
}

export function OdishaWeatherMap({
  rows, layer, selected, onSelect,
}: {
  rows: DistrictWeather[];
  layer: WeatherLayer;
  selected: string | null;
  onSelect: (d: string | null) => void;
}) {
  const features = (odishaGeo as unknown as { features: Feature[] }).features;
  const byName = useMemo(() => {
    const m = new Map<string, DistrictWeather>();
    for (const r of rows) m.set(r.district, r);
    return m;
  }, [rows]);

  const { paths, centroids, projection } = useMemo(() => {
    const proj = geoMercator().fitSize([W - 60, H - 60], { type: "FeatureCollection", features } as any);
    const path = geoPath(proj);
    const paths = features.map((f) => ({ name: f.properties.name, d: path(f) ?? "" }));
    const centroids = features.map((f) => {
      const c = path.centroid(f);
      return { name: f.properties.name, x: c[0], y: c[1] };
    });
    return { paths, centroids, projection: proj };
  }, [features]);

  const [vmin, vmax] = layerRange(layer);
  const norm = (v: number) => Math.max(0, Math.min(1, (v - vmin) / (vmax - vmin)));

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl"
         style={{ background: "radial-gradient(ellipse at 30% 20%, oklch(0.22 0.04 250 / 0.85), oklch(0.10 0.02 260))" }}>
      {/* Scanline */}
      <div className="pointer-events-none absolute inset-x-0 h-12 opacity-30"
           style={{ background: "linear-gradient(180deg, transparent, oklch(0.86 0.16 200 / 0.25), transparent)",
                    animation: "scan 7s linear infinite" }} />
      {/* Aurora glow */}
      <div className="pointer-events-none absolute inset-0"
           style={{ background: "radial-gradient(60% 40% at 70% 80%, oklch(0.62 0.22 285 / 0.18), transparent)" }} />

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ transform: "translateZ(0)" }}>
        <defs>
          <filter id="districtGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.85 0.2 195 / 0.06)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#grid)" />

        {/* District polygons */}
        <g>
          {paths.map((p) => {
            const w = byName.get(p.name);
            const v = w ? layerValue(layer, w) : 0;
            const fillT = w ? norm(v) : 0;
            const fill = w ? layerColor(layer, fillT) : "oklch(0.25 0.03 260)";
            const isSelected = selected === p.name;
            return (
              <path
                key={p.name}
                d={p.d}
                fill={fill}
                fillOpacity={isSelected ? 0.85 : 0.62}
                stroke={isSelected ? "var(--cyan)" : "oklch(0.85 0.2 195 / 0.35)"}
                strokeWidth={isSelected ? 1.6 : 0.6}
                style={{ cursor: "pointer", transition: "fill 600ms ease, fill-opacity 300ms" }}
                onClick={() => onSelect(isSelected ? null : p.name)}
              >
                <title>{p.name}{w ? ` · ${describeCode(w.weatherCode)} · ${w.temp.toFixed(1)}°C` : ""}</title>
              </path>
            );
          })}
        </g>

        {/* Wind direction arrows when layer === wind */}
        {layer === "wind" && (
          <g filter="url(#districtGlow)">
            {centroids.map((c) => {
              const w = byName.get(c.name);
              if (!w) return null;
              const len = 6 + Math.min(28, w.windSpeed * 0.5);
              const rad = (w.windDir * Math.PI) / 180;
              const x2 = c.x + Math.sin(rad) * len;
              const y2 = c.y - Math.cos(rad) * len;
              return (
                <g key={c.name}>
                  <line x1={c.x} y1={c.y} x2={x2} y2={y2}
                        stroke="oklch(0.95 0.13 200)" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx={c.x} cy={c.y} r="1.6" fill="var(--cyan)" />
                </g>
              );
            })}
          </g>
        )}

        {/* Live data bubbles for each district */}
        <g filter="url(#districtGlow)">
          {centroids.map((c) => {
            const w = byName.get(c.name);
            if (!w) return null;
            const v = layerValue(layer, w);
            const t = norm(v);
            const r = 5 + t * 12;
            const fill = layerColor(layer, t);
            return (
              <motion.g key={c.name}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.circle
                  cx={c.x} cy={c.y}
                  r={r}
                  fill={fill}
                  fillOpacity={0.35}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.9, 1.15, 0.9], opacity: 0.45 }}
                  transition={{ duration: 3.4, repeat: Infinity }}
                  style={{ originX: c.x, originY: c.y } as any}
                />
                <circle cx={c.x} cy={c.y} r={Math.max(3, r * 0.4)} fill={fill} />
                {(selected === c.name) && (
                  <text x={c.x} y={c.y - r - 6} textAnchor="middle" fontSize="11" fontWeight={700}
                        fill="oklch(0.95 0.08 220)" style={{ paintOrder: "stroke", stroke: "oklch(0.12 0.03 260)", strokeWidth: 3 }}>
                    {c.name} · {v.toFixed(1)}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* Floating top-left layer chip */}
      <div className="absolute top-3 left-3 glass-strong rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-[var(--cyan)] font-semibold">LIVE</span> · {layer}
      </div>
    </div>
  );
}