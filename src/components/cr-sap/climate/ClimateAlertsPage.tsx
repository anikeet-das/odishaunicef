import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/layout/Topbar";
import { useViewMode } from "@/components/layout/view-mode";
import { LoadingShell } from "@/components/data/LoadingShell";
import {
  useOdishaWeather,
  useDistrictHourly,
  deriveAlerts,
  severityColor,
  describeCode,
  type DistrictWeather,
  type WeatherAlert,
} from "@/lib/weather/openmeteo";
import { OdishaWeatherMap, type WeatherLayer } from "./OdishaWeatherMap";
import {
  Thermometer, Droplets, Wind, Sun, CloudRain, CloudLightning, Activity,
  Gauge, Cloud, Eye, AlertTriangle, MapPin, Search,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";

const LAYERS: { id: WeatherLayer; label: string; icon: typeof Sun }[] = [
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "rain", label: "Rainfall", icon: CloudRain },
  { id: "wind", label: "Wind Speed", icon: Wind },
  { id: "humidity", label: "Humidity", icon: Droplets },
  { id: "uv", label: "UV Index", icon: Sun },
  { id: "pressure", label: "Pressure", icon: Gauge },
  { id: "cloud", label: "Cloud Cover", icon: Cloud },
  { id: "visibility", label: "Visibility", icon: Eye },
  { id: "storm", label: "Thunderstorms", icon: CloudLightning },
];

export function ClimateAlertsPage() {
  const { mode } = useViewMode();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useOdishaWeather();
  const [layer, setLayer] = useState<WeatherLayer>("temperature");
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <LoadingShell title="Climate Alerts" subtitle="Streaming Live Atmospheric Data" />;
  if (isError || !data) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Climate Alerts" subtitle="Live Weather Intelligence" />
        <div className="p-3">
          <div className="glass-strong rounded-2xl p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-[var(--warn)] mx-auto mb-2" />
            <div className="text-sm">Live weather feed temporarily unavailable.</div>
            <button onClick={() => refetch()}
              className="mt-3 text-xs px-3 py-1.5 rounded-full glass-soft hover:neon-ring">
              Retry stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  return mode === "macro"
    ? <MacroView rows={data} layer={layer} setLayer={setLayer} selected={selected} setSelected={setSelected} updatedAt={dataUpdatedAt} />
    : <MicroView rows={data} selected={selected} setSelected={setSelected} />;
}

// =========================================================
// MACRO VIEW — state level intelligence
// =========================================================
function MacroView({
  rows, layer, setLayer, selected, setSelected, updatedAt,
}: {
  rows: DistrictWeather[];
  layer: WeatherLayer;
  setLayer: (l: WeatherLayer) => void;
  selected: string | null;
  setSelected: (d: string | null) => void;
  updatedAt: number;
}) {
  const alerts = useMemo(() => deriveAlerts(rows), [rows]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const trendData = useMemo(() => trendFromRows(rows), [rows]);
  // Rotate which alert is "freshly surfacing" every 4s for the live feed feel.
  const [pulseIdx, setPulseIdx] = useState(0);
  useEffect(() => {
    if (alerts.length === 0) return;
    const t = setInterval(() => setPulseIdx((i) => (i + 1) % alerts.length), 4000);
    return () => clearInterval(t);
  }, [alerts.length]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Climate Alerts" subtitle="Live Odisha Climate Intelligence" />
      <div className="p-3 space-y-3">
        {/* Top: live map (left) + control panel (right) */}
        <div className="grid lg:grid-cols-12 gap-3">
          <div className="lg:col-span-9 glass rounded-2xl p-3 relative h-[72vh]">
            <OdishaWeatherMap
              rows={rows}
              layer={layer}
              selected={selected}
              onSelect={setSelected}
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
              <div className="glass-strong rounded-xl px-3 py-2 text-[10px] tracking-[0.18em] uppercase text-muted-foreground pointer-events-auto">
                Source · Open-Meteo · {new Date(updatedAt).toLocaleTimeString()} · auto-refresh 60s
              </div>
              <Legend layer={layer} />
            </div>
          </div>
          <div className="lg:col-span-3 glass-strong rounded-2xl p-3 h-[72vh] flex flex-col">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-[var(--aurora)]" /> Climate Control Panel
            </div>
            <div className="space-y-1.5 overflow-y-auto scroll-invisible pr-1 flex-1">
              {LAYERS.map((l) => {
                const Icon = l.icon;
                const active = layer === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLayer(l.id)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition border ${
                      active
                        ? "bg-[oklch(0.85_0.2_195/0.10)] border-[oklch(0.85_0.2_195/0.4)] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-[var(--cyan)]" : ""}`}
                      style={active ? { filter: "drop-shadow(0 0 6px var(--cyan))" } : undefined} />
                    <span className="flex-1 text-left">{l.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--aurora)] animate-pulse" />}
                  </button>
                );
              })}
              <div className="pt-3 border-t border-border/40 mt-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Atmospheric Risk</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <RiskTile label="Cyclone" value={summary.maxWind >= 60 ? "Critical" : summary.maxWind >= 40 ? "High" : "Calm"} color={summary.maxWind >= 60 ? "var(--danger)" : summary.maxWind >= 40 ? "var(--warn)" : "var(--cyan)"} />
                  <RiskTile label="Flood" value={summary.maxRain >= 8 ? "Critical" : summary.maxRain >= 3 ? "High" : "Low"} color={summary.maxRain >= 8 ? "var(--danger)" : summary.maxRain >= 3 ? "var(--warn)" : "var(--cyan)"} />
                  <RiskTile label="Heatwave" value={summary.maxTemp >= 42 ? "Critical" : summary.maxTemp >= 38 ? "High" : "Normal"} color={summary.maxTemp >= 42 ? "var(--danger)" : summary.maxTemp >= 38 ? "var(--warn)" : "var(--aurora)"} />
                  <RiskTile label="UV" value={summary.maxUv >= 10 ? "Extreme" : summary.maxUv >= 8 ? "Very High" : summary.maxUv >= 6 ? "High" : "Moderate"} color={summary.maxUv >= 10 ? "var(--danger)" : summary.maxUv >= 8 ? "var(--warn)" : "var(--cyan)"} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          <SummaryCard icon={Thermometer} label="Avg Temp" value={`${summary.avgTemp.toFixed(1)}°C`} sub={`max ${summary.maxTempDist}`} accent="var(--warn)" />
          <SummaryCard icon={Thermometer} label="Hottest" value={`${summary.maxTemp.toFixed(1)}°C`} sub={summary.maxTempDist} accent="var(--danger)" />
          <SummaryCard icon={CloudRain} label="Rain Intensity" value={`${summary.maxRain.toFixed(1)} mm/h`} sub={summary.maxRainDist} accent="var(--cyan)" />
          <SummaryCard icon={Wind} label="Strongest Wind" value={`${summary.maxWind.toFixed(0)} km/h`} sub={summary.maxWindDist} accent="var(--aurora)" />
          <SummaryCard icon={Droplets} label="Highest Humidity" value={`${summary.maxHum.toFixed(0)}%`} sub={summary.maxHumDist} accent="var(--cyan)" />
          <SummaryCard icon={Sun} label="UV Danger" value={`${summary.maxUv.toFixed(1)}`} sub={summary.maxUvDist} accent="var(--warn)" />
          <SummaryCard icon={Gauge} label="Pressure" value={`${summary.avgPressure.toFixed(0)} hPa`} sub="state avg" accent="var(--indigo-glow)" />
          <SummaryCard icon={Cloud} label="Cloud Cover" value={`${summary.avgCloud.toFixed(0)}%`} sub="state avg" accent="var(--cyan)" />
        </div>

        {/* Warnings + trends */}
        <div className="grid lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 glass rounded-2xl p-4 h-[52vh] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warn)]" />
              <div className="text-sm font-semibold">AI Warning Engine</div>
              <span className="ml-auto text-[10px] text-muted-foreground">{alerts.length} active · auto-refresh</span>
            </div>
            <div className="flex-1 overflow-y-auto scroll-invisible space-y-1.5 pr-1">
              <AnimatePresence initial={false}>
                {alerts.map((a, i) => (
                  <AlertRow key={a.id} a={a} pulsing={i === pulseIdx} />
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div className="h-full grid place-items-center text-xs text-muted-foreground">
                  Atmospheric conditions nominal across Odisha. AI is monitoring.
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-7 glass rounded-2xl p-4 h-[52vh] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[var(--cyan)]" />
              <div className="text-sm font-semibold">Live State Trend · {layerLabel(layer)}</div>
              <span className="ml-auto text-[10px] text-muted-foreground">Top 8 districts by current reading</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer>
                <AreaChart data={trendData[layer]}>
                  <defs>
                    <linearGradient id="trendG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.86 0.16 200)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="oklch(0.86 0.16 200)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" />
                  <XAxis dataKey="district" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={56} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="oklch(0.86 0.16 200)" strokeWidth={2} fill="url(#trendG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// MICRO VIEW — district hyper-local
// =========================================================
function MicroView({
  rows, selected, setSelected,
}: {
  rows: DistrictWeather[];
  selected: string | null;
  setSelected: (d: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => rows.filter((r) => r.district.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const current = rows.find((r) => r.district === (selected ?? rows[0]?.district)) ?? rows[0];
  const hourly = useDistrictHourly(current?.lat, current?.lng, current?.district);
  const districtAlerts = useMemo(
    () => deriveAlerts(current ? [current] : []),
    [current],
  );

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Climate Alerts" subtitle={`Hyper-Local · ${current?.district ?? "—"}`} />
      <div className="p-3 grid lg:grid-cols-12 gap-3">
        {/* District list */}
        <aside className="lg:col-span-3 glass rounded-2xl p-3 flex flex-col h-[82vh]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Districts · {rows.length}</div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search district…"
              className="w-full glass-soft rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:neon-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto scroll-invisible fade-mask-y space-y-1 pr-1">
            {list.map((r) => {
              const active = r.district === current?.district;
              const tempColor = r.temp >= 40 ? "var(--danger)" : r.temp >= 35 ? "var(--warn)" : r.temp >= 28 ? "var(--aurora)" : "var(--cyan)";
              return (
                <button key={r.districtId} onClick={() => setSelected(r.district)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition border ${
                    active ? "bg-[oklch(0.85_0.2_195/0.10)] border-[oklch(0.85_0.2_195/0.35)]" : "border-transparent hover:bg-white/[0.04]"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{r.district}</span>
                    <span className="text-[11px] font-semibold" style={{ color: tempColor }}>{r.temp.toFixed(1)}°</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] text-muted-foreground">
                    <span>Hum <b className="text-foreground">{r.humidity.toFixed(0)}%</b></span>
                    <span>Wind <b className="text-foreground">{r.windSpeed.toFixed(0)}</b></span>
                    <span>UV <b className="text-foreground">{r.uv.toFixed(1)}</b></span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main district panel */}
        <main className="lg:col-span-9 space-y-3">
          {current && (
            <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 animate-pulse-glow"
                   style={{ background: "radial-gradient(circle, oklch(0.85 0.2 195 / 0.4), transparent 70%)" }} />
              <div className="flex items-start gap-4 relative">
                <div className="h-16 w-16 rounded-2xl grid place-items-center"
                     style={{ background: "linear-gradient(135deg, var(--cyan), var(--indigo-glow))",
                              boxShadow: "0 0 30px oklch(0.86 0.16 200 / 0.5)" }}>
                  <MapPin className="h-7 w-7 text-background" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Live · Open-Meteo</div>
                  <h2 className="text-2xl font-bold">{current.district}</h2>
                  <div className="text-xs text-muted-foreground">{describeCode(current.weatherCode)} · {current.isDay ? "Day" : "Night"} · {current.lat.toFixed(2)}°N, {current.lng.toFixed(2)}°E</div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-gradient-cyan">{current.temp.toFixed(1)}°</div>
                  <div className="text-[10px] text-muted-foreground">feels live</div>
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-5 relative">
                <MicroStat icon={Droplets} label="Humidity" value={`${current.humidity.toFixed(0)}%`} />
                <MicroStat icon={Wind} label="Wind" value={`${current.windSpeed.toFixed(0)} km/h`} sub={`${current.windDir.toFixed(0)}°`} />
                <MicroStat icon={CloudRain} label="Rain" value={`${current.precipitation.toFixed(1)} mm`} />
                <MicroStat icon={Sun} label="UV" value={current.uv.toFixed(1)} />
                <MicroStat icon={Gauge} label="Pressure" value={`${current.pressure.toFixed(0)}`} />
                <MicroStat icon={Cloud} label="Cloud" value={`${current.cloud.toFixed(0)}%`} />
                <MicroStat icon={Eye} label="Visibility" value={`${(current.visibility / 1000).toFixed(1)} km`} />
                <MicroStat icon={Activity} label="AQI" value="—" sub="not on feed" />
              </div>
            </div>
          )}

          {/* District warnings */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warn)]" />
              <div className="text-sm font-semibold">Live District Warnings</div>
              <span className="ml-auto text-[10px] text-muted-foreground">{districtAlerts.length} active</span>
            </div>
            {districtAlerts.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">No active warnings — conditions nominal.</div>
            ) : (
              <div className="space-y-1.5">
                {districtAlerts.map((a) => <AlertRow key={a.id} a={a} />)}
              </div>
            )}
          </div>

          {/* Hourly trends */}
          <div className="grid md:grid-cols-2 gap-3">
            <HourlyChart title="Temperature (24h)" color="oklch(0.85 0.18 75)" hourly={hourly.data?.time} values={hourly.data?.temperature_2m} unit="°C" />
            <HourlyChart title="Rainfall (24h)" color="oklch(0.78 0.18 220)" hourly={hourly.data?.time} values={hourly.data?.precipitation} unit="mm" />
            <HourlyChart title="Humidity (24h)" color="oklch(0.82 0.19 175)" hourly={hourly.data?.time} values={hourly.data?.relative_humidity_2m} unit="%" />
            <HourlyChart title="Wind speed (24h)" color="oklch(0.84 0.2 155)" hourly={hourly.data?.time} values={hourly.data?.wind_speed_10m} unit="km/h" />
          </div>

          {/* AI insight */}
          {current && (
            <div className="glass rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">Hyper-local AI insight</div>
              <p className="text-sm leading-relaxed">{aiInsightFor(current)}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// =========================================================
// helpers
// =========================================================
function layerLabel(l: WeatherLayer): string {
  return LAYERS.find((x) => x.id === l)?.label ?? l;
}

function summarize(rows: DistrictWeather[]) {
  const arg = (sel: (r: DistrictWeather) => number) =>
    rows.reduce((a, b) => (sel(b) > sel(a) ? b : a), rows[0]);
  const avg = (sel: (r: DistrictWeather) => number) =>
    rows.reduce((acc, r) => acc + sel(r), 0) / rows.length;
  const mxT = arg((r) => r.temp);
  const mxR = arg((r) => r.precipitation);
  const mxW = arg((r) => r.windSpeed);
  const mxH = arg((r) => r.humidity);
  const mxU = arg((r) => r.uv);
  return {
    avgTemp: avg((r) => r.temp),
    maxTemp: mxT.temp, maxTempDist: mxT.district,
    maxRain: mxR.precipitation, maxRainDist: mxR.district,
    maxWind: mxW.windSpeed, maxWindDist: mxW.district,
    maxHum: mxH.humidity, maxHumDist: mxH.district,
    maxUv: mxU.uv, maxUvDist: mxU.district,
    avgPressure: avg((r) => r.pressure),
    avgCloud: avg((r) => r.cloud),
  };
}

function trendFromRows(rows: DistrictWeather[]) {
  const pick = (sel: (r: DistrictWeather) => number) =>
    [...rows].sort((a, b) => sel(b) - sel(a)).slice(0, 8)
      .map((r) => ({ district: r.district, value: +sel(r).toFixed(1) }));
  return {
    temperature: pick((r) => r.temp),
    rain: pick((r) => r.precipitation),
    wind: pick((r) => r.windSpeed),
    humidity: pick((r) => r.humidity),
    uv: pick((r) => r.uv),
    pressure: pick((r) => r.pressure),
    cloud: pick((r) => r.cloud),
    visibility: pick((r) => r.visibility / 1000),
    storm: pick((r) => r.weatherCode),
  } as Record<WeatherLayer, { district: string; value: number }[]>;
}

function aiInsightFor(r: DistrictWeather): string {
  const bits: string[] = [];
  if (r.temp >= 38) bits.push(`Surface temperature is elevated at ${r.temp.toFixed(1)}°C — heatstroke risk for prolonged outdoor activity in ${r.district}.`);
  else if (r.temp >= 32) bits.push(`Warm conditions (${r.temp.toFixed(1)}°C) prevailing in ${r.district}.`);
  else bits.push(`Temperature in ${r.district} is comfortable at ${r.temp.toFixed(1)}°C.`);
  if (r.windSpeed >= 40) bits.push(`Wind is gusting at ${r.windSpeed.toFixed(0)} km/h from ${r.windDir.toFixed(0)}° — secure outdoor assemblies.`);
  if (r.precipitation >= 3) bits.push(`Active precipitation of ${r.precipitation.toFixed(1)} mm/h indicates ongoing rain — monitor drainage near schools.`);
  if (r.uv >= 8) bits.push(`UV index ${r.uv.toFixed(1)} is in the very-high range; avoid outdoor exposure between 11:00 and 15:00.`);
  if (r.humidity >= 85) bits.push(`High humidity (${r.humidity.toFixed(0)}%) may suppress sweat evaporation; ensure ventilation and water access.`);
  return bits.join(" ");
}

function SummaryCard({ icon: Icon, label, value, sub, accent }: { icon: typeof Sun; label: string; value: string; sub: string; accent: string; }) {
  return (
    <div className="glass rounded-2xl p-3 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-30"
           style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3 w-3" style={{ color: accent }} /> {label}
      </div>
      <div className="text-lg font-bold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
    </div>
  );
}

function RiskTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-soft rounded-lg px-2 py-1.5 flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function AlertRow({ a, pulsing }: { a: WeatherAlert; pulsing?: boolean }) {
  const c = severityColor(a.severity);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="glass-soft rounded-xl px-3 py-2 flex items-center gap-3 relative overflow-hidden"
      style={pulsing ? { boxShadow: `0 0 0 1px ${c}, 0 0 18px ${c}40` } : undefined}
    >
      <span className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold flex items-center gap-2">
          <span className="truncate">{a.title}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${c}22`, color: c }}>{a.severity}</span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{a.detail}</div>
      </div>
      <div className="text-[11px] font-bold tabular-nums" style={{ color: c }}>
        {a.value.toFixed(1)}{a.unit}
      </div>
    </motion.div>
  );
}

function MicroStat({ icon: Icon, label, value, sub }: { icon: typeof Sun; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-soft rounded-xl px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function HourlyChart({ title, color, hourly, values, unit }: {
  title: string; color: string; hourly?: string[]; values?: number[]; unit: string;
}) {
  const data = useMemo(() => {
    if (!hourly || !values) return [];
    return hourly.map((t, i) => ({
      t: t.slice(11, 16),
      v: values[i],
    }));
  }, [hourly, values]);
  return (
    <div className="glass rounded-2xl p-4 h-[28vh] min-h-[200px] flex flex-col">
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="flex-1">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 6" />
            <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={Math.max(1, Math.floor((data.length || 1) / 8))} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip formatter={(v: number) => [`${(+v).toFixed(1)} ${unit}`, "value"]} />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ layer }: { layer: WeatherLayer }) {
  const stops = Array.from({ length: 7 }, (_, i) => i / 6);
  const stopColor = (v: number) => layerColor(layer, v);
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-[10px] pointer-events-auto">
      <div className="flex items-center gap-1">
        {stops.map((s, i) => (
          <span key={i} className="h-3 w-6 rounded" style={{ background: stopColor(s) }} />
        ))}
        <span className="ml-2 text-muted-foreground uppercase tracking-wider">{layerLabel(layer)}: low → high</span>
      </div>
    </div>
  );
}

export function layerColor(layer: WeatherLayer, t: number): string {
  // t ∈ [0..1]
  const clamp = Math.max(0, Math.min(1, t));
  switch (layer) {
    case "temperature": return `oklch(0.78 0.22 ${Math.round(220 - clamp * 200)})`; // cool blue → hot red
    case "rain":        return `oklch(${0.78 - clamp * 0.05} 0.18 ${220 + Math.round(clamp * 40)})`;
    case "wind":        return `oklch(0.86 0.18 ${Math.round(155 + clamp * 50)})`;
    case "humidity":    return `oklch(0.86 0.16 ${Math.round(200 - clamp * 30)})`;
    case "uv":          return `oklch(0.85 0.2 ${Math.round(90 - clamp * 90)})`;
    case "pressure":    return `oklch(0.78 0.16 ${Math.round(285 - clamp * 90)})`;
    case "cloud":       return `oklch(${0.95 - clamp * 0.5} 0.04 240)`;
    case "visibility":  return `oklch(${0.5 + clamp * 0.4} 0.12 200)`;
    case "storm":       return `oklch(0.78 0.22 ${Math.round(285 - clamp * 260)})`;
  }
}