import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useSchools, type School } from "@/lib/data/cces";
import { AwaitingData } from "@/components/data/AwaitingData";
import { LoadingShell } from "@/components/data/LoadingShell";
import { LifeBuoy, ImageIcon, LinkIcon, MapPin, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resource Records · CR-SAP Odisha" },
      { name: "description", content: "Live record of school-reported problems, proof and nearby resources to solve them." },
    ],
  }),
  component: Page,
});

/** Pull a raw form value matching ANY of the keyword sets. */
function rawValue(raw: Record<string, string>, ...sets: string[][]): string {
  const keys = Object.keys(raw);
  for (const frags of sets) {
    const key = keys.find((k) => {
      const lc = k.toLowerCase();
      return frags.every((f) => lc.includes(f));
    });
    if (key && (raw[key] || "").trim()) return raw[key].trim();
  }
  return "";
}

function extractUrls(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function isImageUrl(u: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u) ||
    /googleusercontent|drive\.google\.com\/.*=w\d+/i.test(u);
}

type Record_ = {
  udise: string;
  name: string;
  district: string;
  problem: string;
  proof: string;
  resources: string;
};

function toRecord(s: School): Record_ {
  return {
    udise: s.udise,
    name: s.name,
    district: s.district,
    problem: rawValue(
      s.raw,
      ["problem", "faced"], ["problem"], ["issue"], ["challenge"], ["difficult"],
    ),
    proof: rawValue(
      s.raw,
      ["photo", "proof"], ["video", "proof"], ["proof"], ["evidence"],
      ["upload"], ["photo"], ["image"], ["link"],
    ),
    resources: rawValue(
      s.raw,
      ["nearby", "resource"], ["possible", "resource"], ["resource", "solve"],
      ["resource"], ["solution"], ["nearby"],
    ),
  };
}

function ProofCell({ value }: { value: string }) {
  const urls = extractUrls(value);
  if (!value) return <span className="text-xs text-muted-foreground/60">—</span>;
  if (urls.length === 0) {
    // plain text proof description
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {urls.map((u, i) =>
        isImageUrl(u) ? (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer"
             className="group relative h-12 w-12 rounded-lg overflow-hidden glass-soft grid place-items-center hover:neon-ring transition">
            <img src={u} alt="proof" className="h-full w-full object-cover"
                 onError={(e) => { (e.currentTarget.style.display = "none"); }} />
            <ImageIcon className="h-4 w-4 text-muted-foreground absolute" />
          </a>
        ) : (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer"
             title={u}
             className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-soft text-[11px] text-[var(--cyan)] hover:neon-ring transition">
            <LinkIcon className="h-3.5 w-3.5" /> Open link
          </a>
        ),
      )}
    </div>
  );
}

function Page() {
  const { data: schools, isLoading, refetch } = useSchools();

  const records = useMemo(
    () => (schools ?? []).map(toRecord).filter((r) => r.problem || r.proof || r.resources),
    [schools],
  );

  if (isLoading) {
    return <LoadingShell title="Resource Records" subtitle="Problem → Proof → Nearby Resources · Live" />;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Resource Records" subtitle="Problem → Proof → Nearby Resources · Live" />
      {records.length === 0 ? (
        <AwaitingData onRefresh={() => refetch()} />
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: "var(--gradient-aurora)" }}>
                <LifeBuoy className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Reported problems</div>
                <div className="text-xl font-bold tabular-nums">{records.length}</div>
              </div>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-[oklch(0.7_0.18_30/0.2)]">
                <AlertTriangle className="h-4 w-4 text-[oklch(0.7_0.18_30)]" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">With proof attached</div>
                <div className="text-xl font-bold tabular-nums">
                  {records.filter((r) => extractUrls(r.proof).length > 0).length}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scroll-invisible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/50">
                    <th className="px-4 py-3 font-medium">School ID</th>
                    <th className="px-4 py-3 font-medium">School Name</th>
                    <th className="px-4 py-3 font-medium">Faced Problem</th>
                    <th className="px-4 py-3 font-medium">Proof</th>
                    <th className="px-4 py-3 font-medium">Nearby Resources</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.udise + i} className="border-b border-border/30 hover:bg-white/5 align-top">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.udise}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {r.district}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-muted-foreground">
                        {r.problem || <span className="text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-4 py-3"><ProofCell value={r.proof} /></td>
                      <td className="px-4 py-3 max-w-xs text-muted-foreground">
                        {r.resources || <span className="text-muted-foreground/60">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
