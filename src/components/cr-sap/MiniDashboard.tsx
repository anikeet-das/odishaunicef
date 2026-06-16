import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export type DashboardSpec = {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string; hint?: string }[];
  charts: {
    type: "bar" | "line" | "area" | "pie" | "radar";
    title: string;
    xKey: string;
    yKeys: string[];
    data: Record<string, string | number>[];
  }[];
};

const PALETTE = [
  "oklch(0.86 0.16 200)",
  "oklch(0.82 0.22 150)",
  "oklch(0.82 0.19 320)",
  "oklch(0.85 0.16 60)",
  "oklch(0.78 0.22 25)",
];

function ChartBlock({ c }: { c: DashboardSpec["charts"][number] }) {
  if (c.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={c.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={c.xKey} fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {c.yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (c.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={c.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={c.xKey} fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {c.yKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (c.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={c.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={c.xKey} fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {c.yKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.25} />)}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (c.type === "pie") {
    const k = c.yKeys[0] ?? "value";
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={c.data} dataKey={k} nameKey={c.xKey} outerRadius={80} label>
            {c.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (c.type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={c.data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={c.xKey} fontSize={10} />
          <PolarRadiusAxis fontSize={9} />
          {c.yKeys.map((k, i) => <Radar key={k} dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.35} />)}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  }
  return null;
}

export function MiniDashboard({ spec }: { spec: DashboardSpec }) {
  return (
    <div className="rounded-xl border border-[oklch(0.85_0.2_195/0.3)] bg-[oklch(0.14_0.04_260/0.92)] p-3 space-y-3">
      <div>
        <div className="text-xs font-bold text-[var(--cyan)]">{spec.title}</div>
        {spec.subtitle && <div className="text-[10px] text-muted-foreground">{spec.subtitle}</div>}
      </div>
      {!!spec.kpis?.length && (
        <div className="grid grid-cols-2 gap-2">
          {spec.kpis.map((k) => (
            <div key={k.label} className="rounded-lg bg-white/5 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="text-sm font-bold text-foreground">{k.value}</div>
              {k.hint && <div className="text-[9px] text-muted-foreground">{k.hint}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {spec.charts.map((c, i) => (
          <div key={i} className="rounded-lg bg-white/[0.03] p-2">
            <div className="text-[10px] font-semibold text-muted-foreground mb-1">{c.title}</div>
            <ChartBlock c={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
