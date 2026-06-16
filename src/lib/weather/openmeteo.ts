import { useQuery } from "@tanstack/react-query";
import { ODISHA_DISTRICTS } from "@/lib/data/odisha";

export type DistrictWeather = {
  districtId: number;
  district: string;
  lat: number;
  lng: number;
  temp: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDir: number;
  uv: number;
  pressure: number;
  cloud: number;
  visibility: number;
  weatherCode: number;
  isDay: number;
};

export type HourlySeries = {
  district: string;
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  uv_index: number[];
  surface_pressure: number[];
};

const CURRENT = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "uv_index",
  "surface_pressure",
  "cloud_cover",
  "visibility",
  "weather_code",
  "is_day",
].join(",");

const HOURLY = [
  "temperature_2m",
  "precipitation",
  "relative_humidity_2m",
  "wind_speed_10m",
  "uv_index",
  "surface_pressure",
].join(",");

/** Pull current conditions for ALL Odisha districts in a single Open-Meteo call. */
export async function fetchOdishaCurrent(): Promise<DistrictWeather[]> {
  const lats = ODISHA_DISTRICTS.map((d) => d.lat).join(",");
  const lngs = ODISHA_DISTRICTS.map((d) => d.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lngs}` +
    `&current=${CURRENT}` +
    `&timezone=Asia%2FKolkata` +
    `&wind_speed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  // Open-Meteo returns an array when multiple coords are supplied.
  const arr: any[] = Array.isArray(data) ? data : [data];
  return ODISHA_DISTRICTS.map((d, i) => {
    const cur = arr[i]?.current ?? {};
    return {
      districtId: d.id,
      district: d.name,
      lat: d.lat,
      lng: d.lng,
      temp: Number(cur.temperature_2m ?? 0),
      humidity: Number(cur.relative_humidity_2m ?? 0),
      precipitation: Number(cur.precipitation ?? 0),
      windSpeed: Number(cur.wind_speed_10m ?? 0),
      windDir: Number(cur.wind_direction_10m ?? 0),
      uv: Number(cur.uv_index ?? 0),
      pressure: Number(cur.surface_pressure ?? 0),
      cloud: Number(cur.cloud_cover ?? 0),
      visibility: Number(cur.visibility ?? 0),
      weatherCode: Number(cur.weather_code ?? 0),
      isDay: Number(cur.is_day ?? 1),
    };
  });
}

/** Hourly trend (24h) for a single district. */
export async function fetchDistrictHourly(lat: number, lng: number): Promise<HourlySeries> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=${HOURLY}` +
    `&forecast_days=2&past_days=1` +
    `&timezone=Asia%2FKolkata` +
    `&wind_speed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const h = data.hourly ?? {};
  return {
    district: "",
    time: h.time ?? [],
    temperature_2m: h.temperature_2m ?? [],
    precipitation: h.precipitation ?? [],
    relative_humidity_2m: h.relative_humidity_2m ?? [],
    wind_speed_10m: h.wind_speed_10m ?? [],
    uv_index: h.uv_index ?? [],
    surface_pressure: h.surface_pressure ?? [],
  };
}

/** Live polling hook — refetches every 60s. */
export function useOdishaWeather() {
  return useQuery({
    queryKey: ["weather", "odisha", "current"],
    queryFn: fetchOdishaCurrent,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useDistrictHourly(lat?: number, lng?: number, district?: string) {
  return useQuery({
    queryKey: ["weather", "hourly", district ?? "", lat, lng],
    queryFn: async () => {
      const s = await fetchDistrictHourly(lat!, lng!);
      return { ...s, district: district ?? "" };
    },
    enabled: lat != null && lng != null,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}

// ---------------- Risk derivation from live weather ----------------

export type WeatherAlert = {
  id: string;
  district: string;
  severity: "info" | "moderate" | "high" | "critical";
  title: string;
  detail: string;
  metric: string;
  value: number;
  unit: string;
  ts: number;
};

export function deriveAlerts(rows: DistrictWeather[]): WeatherAlert[] {
  const out: WeatherAlert[] = [];
  for (const r of rows) {
    if (r.temp >= 42) out.push(mk(r, "critical", "Extreme heatwave", `Air temperature ${r.temp.toFixed(1)}°C in ${r.district}. Heatstroke risk for outdoor activity.`, "Temperature", r.temp, "°C"));
    else if (r.temp >= 38) out.push(mk(r, "high", "Heatwave conditions", `Air temperature ${r.temp.toFixed(1)}°C in ${r.district}.`, "Temperature", r.temp, "°C"));
    if (r.windSpeed >= 60) out.push(mk(r, "critical", "Cyclonic wind", `Wind ${r.windSpeed.toFixed(0)} km/h near ${r.district}.`, "Wind", r.windSpeed, "km/h"));
    else if (r.windSpeed >= 40) out.push(mk(r, "high", "High wind velocity", `Wind ${r.windSpeed.toFixed(0)} km/h around ${r.district} coastline.`, "Wind", r.windSpeed, "km/h"));
    if (r.precipitation >= 8) out.push(mk(r, "critical", "Flood-risk rainfall", `Heavy precipitation ${r.precipitation.toFixed(1)} mm/h in ${r.district}.`, "Rain", r.precipitation, "mm/h"));
    else if (r.precipitation >= 3) out.push(mk(r, "high", "Heavy rain detected", `Rainfall ${r.precipitation.toFixed(1)} mm/h in ${r.district}.`, "Rain", r.precipitation, "mm/h"));
    if (r.uv >= 10) out.push(mk(r, "critical", "Extreme UV", `UV index ${r.uv.toFixed(1)} in ${r.district}. Avoid outdoor exposure.`, "UV", r.uv, ""));
    else if (r.uv >= 8) out.push(mk(r, "high", "Very high UV", `UV index ${r.uv.toFixed(1)} in ${r.district}.`, "UV", r.uv, ""));
    if (r.humidity >= 90) out.push(mk(r, "moderate", "Humidity spike", `Relative humidity ${r.humidity.toFixed(0)}% in ${r.district}.`, "Humidity", r.humidity, "%"));
    if (r.weatherCode >= 95) out.push(mk(r, "high", "Thunderstorm activity", `Thunderstorm reported near ${r.district}.`, "Storm", r.weatherCode, ""));
    if (r.cloud >= 90 && r.precipitation < 1) out.push(mk(r, "info", "Heavy cloud cover", `Cloud coverage ${r.cloud.toFixed(0)}% in ${r.district}.`, "Cloud", r.cloud, "%"));
  }
  // Sort by severity then value desc, cap at 40.
  const order = { critical: 3, high: 2, moderate: 1, info: 0 } as const;
  return out.sort((a, b) => (order[b.severity] - order[a.severity]) || (b.value - a.value)).slice(0, 40);
}

function mk(r: DistrictWeather, severity: WeatherAlert["severity"], title: string, detail: string, metric: string, value: number, unit: string): WeatherAlert {
  return {
    id: `${r.districtId}-${metric}-${Math.round(value * 10)}`,
    district: r.district,
    severity, title, detail, metric, value, unit,
    ts: Date.now(),
  };
}

export function severityColor(s: WeatherAlert["severity"]) {
  return s === "critical" ? "var(--danger)"
    : s === "high" ? "var(--warn)"
    : s === "moderate" ? "oklch(0.86 0.18 95)"
    : "var(--cyan)";
}

// Weather code → human label (subset of WMO codes used by Open-Meteo)
export function describeCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96) return "Thunderstorm w/ hail";
  return "—";
}