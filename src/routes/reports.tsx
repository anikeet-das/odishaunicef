import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, aggregateByDistrict } from "@/lib/data/cces";
import { LoadingShell } from "@/components/data/LoadingShell";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · CR-SAP Odisha" }, { name: "description", content: "Generate and export live reports as CSV." }] }),
  component: Page,
});

function dl(name: string, csv: string) {
  const b = new Blob([csv], { type: "text/csv" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}
function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
}

function Page() {
  const { data } = useSchools();
  if (!data) return <LoadingShell title="Reports & Exports" />;
  const districts = aggregateByDistrict(data);

  const reports = [
    { name: "District leaderboard", file: "districts.csv", build: () => toCsv(districts) },
    { name: "All schools (flat)", file: "schools.csv", build: () => toCsv(data.map(({ raw: _r, hazards, ...s }) => ({ ...s, topHazardProb: hazards[s.topHazard ?? "Cyclone"] ?? 0 }))) },
    { name: "High-risk alerts (score ≥ 4)", file: "alerts.csv", build: () => toCsv(data.filter((s) => s.hazardScore >= 50 && !s.hasSDMP).map((s) => ({ udise: s.udise, name: s.name, district: s.district, hazardScore: s.hazardScore, topHazard: s.topHazard }))) },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Reports & Exports" subtitle="Live CSV" />
      <div className="p-3 grid md:grid-cols-3 gap-3">
        {reports.map((r) => (
          <button key={r.file} onClick={() => dl(r.file, r.build())} className="glass rounded-2xl p-6 text-left hover:neon-ring transition group">
            <Download className="h-6 w-6 text-accent mb-3" />
            <div className="font-semibold">{r.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Generated from {data.length.toLocaleString()} live records · {r.file}</div>
          </button>
        ))}
        <a
          href="/cr-sap-odisha-code.zip"
          download
          className="glass rounded-2xl p-6 text-left hover:neon-ring transition group border border-primary/30"
        >
          <Download className="h-6 w-6 text-[var(--aurora)] mb-3" />
          <div className="font-semibold">Full project source code</div>
          <div className="text-xs text-muted-foreground mt-1">
            Complete CR-SAP Odisha codebase (React + TanStack Start) · cr-sap-odisha-code.zip
          </div>
        </a>
      </div>
    </div>
  );
}
