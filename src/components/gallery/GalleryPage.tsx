import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingShell } from "@/components/data/LoadingShell";
import { AwaitingData } from "@/components/data/AwaitingData";
import { useMedia, type MediaKind, type MediaRecord } from "@/lib/data/gallery";
import { Image as ImageIcon, Video as VideoIcon, Search, MapPin, ExternalLink, FileWarning, AlertTriangle, AlertOctagon } from "lucide-react";

const KIND_META: Record<MediaKind, { title: string; subtitle: string; icon: any; accent: string }> = {
  photo: { title: "Photo Gallery", subtitle: "Real photo evidence submitted by schools", icon: ImageIcon, accent: "var(--cyan)" },
  video: { title: "Video Gallery", subtitle: "Real video evidence submitted by schools", icon: VideoIcon, accent: "var(--aurora)" },
};

function priorityTone(p: string): { color: string; icon: any } {
  const t = p.toLowerCase();
  if (t.includes("critical")) return { color: "var(--danger)", icon: AlertOctagon };
  if (t.includes("high")) return { color: "var(--danger)", icon: AlertOctagon };
  if (t.includes("medium")) return { color: "var(--warn)", icon: AlertTriangle };
  if (t.includes("low")) return { color: "var(--cyan)", icon: FileWarning };
  return { color: "var(--cyan)", icon: FileWarning };
}

export function GalleryPage({ kind }: { kind: MediaKind }) {
  const meta = KIND_META[kind];
  const { records, isLoading, data } = useMedia(kind);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [priority, setPriority] = useState("all");

  const districts = useMemo(() => Array.from(new Set(records.map((r) => r.district))).filter(Boolean).sort(), [records]);
  const priorities = useMemo(() => Array.from(new Set(records.map((r) => r.priority).filter(Boolean))).sort(), [records]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return records.filter((r) =>
      (!ql || r.udise.toLowerCase().includes(ql) || r.schoolName.toLowerCase().includes(ql) || r.problem.toLowerCase().includes(ql) || r.category.toLowerCase().includes(ql)) &&
      (district === "all" || r.district === district) &&
      (priority === "all" || r.priority === priority),
    );
  }, [records, q, district, priority]);

  if (isLoading && !data) return <LoadingShell title={meta.title} subtitle={meta.subtitle} />;
  if ((data?.length ?? 0) === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title={meta.title} subtitle="No responses yet" />
        <AwaitingData />
      </div>
    );
  }

  const totalPhotoCount = records.reduce((a, r) => a + (r.count ?? 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={meta.title} subtitle={meta.subtitle} />
      <div className="p-3 space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label={`Schools with ${kind}s`} value={records.length} accent={meta.accent} icon={<meta.icon className="h-4 w-4" />} />
          <SummaryCard label="Districts covered" value={districts.length} accent="var(--blue)" icon={<MapPin className="h-4 w-4" />} />
          {kind === "photo" ? (
            <SummaryCard label="Reported photos" value={totalPhotoCount || "—"} accent="var(--aurora)" icon={<ImageIcon className="h-4 w-4" />} />
          ) : (
            <SummaryCard label="Video proofs" value={records.length} accent="var(--aurora)" icon={<VideoIcon className="h-4 w-4" />} />
          )}
          <SummaryCard label="High / Critical" value={records.filter((r) => /high|critical/i.test(r.priority)).length} accent="var(--danger)" icon={<AlertOctagon className="h-4 w-4" />} />
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by UDISE / school / problem…"
              className="w-full glass-soft rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:neon-ring" />
          </div>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">All districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="glass-soft rounded-lg px-3 py-2 text-sm outline-none">
            <option value="all">All priorities</option>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="text-[11px] text-muted-foreground ml-auto">{filtered.length} / {records.length}</div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
            No matching submissions. Adjust filters or wait for new {kind} evidence.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((r) => <MediaCard key={r.id} r={r} kind={kind} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCard({ r, kind }: { r: MediaRecord; kind: MediaKind }) {
  const tone = priorityTone(r.priority);
  const Icon = kind === "photo" ? ImageIcon : VideoIcon;
  const Pri = tone.icon;
  return (
    <article className="glass rounded-2xl overflow-hidden flex flex-col">
      {/* Visual frame — keeps consistent thumbnail without faking imagery */}
      <div className="relative h-40 grid place-items-center"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${tone.color} 22%, transparent), color-mix(in oklab, var(--blue) 18%, transparent))`,
        }}>
        <Icon className="h-14 w-14 text-white/85" strokeWidth={1.4} />
        {r.count != null && kind === "photo" && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white">
            {r.count} {r.count === 1 ? "photo" : "photos"}
          </span>
        )}
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: `color-mix(in oklab, ${tone.color} 25%, transparent)`, color: "#fff" }}>
          <Pri className="h-3 w-3" /> {r.priority || "Unrated"}
        </span>
        {r.driveLink && (
          <a href={r.driveLink} target="_blank" rel="noreferrer"
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/65">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <header>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            UDISE {r.udise} · {r.district}
          </div>
          <h3 className="font-semibold leading-tight truncate" title={r.schoolName}>{r.schoolName}</h3>
        </header>

        {r.category && (
          <div className="flex flex-wrap gap-1">
            {r.category.split(",").slice(0, 4).map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md glass-soft text-muted-foreground">{c.trim()}</span>
            ))}
          </div>
        )}

        <div className="text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Problem</div>
          <p className="leading-snug">{r.problem || <span className="italic text-muted-foreground">No description provided</span>}</p>
        </div>

        {r.evidence && (
          <div className="text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Evidence notes</div>
            <p className="leading-snug text-muted-foreground">{r.evidence}</p>
          </div>
        )}

        {!r.driveLink && (
          <div className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/20">
            Drive link not provided in the form response.
          </div>
        )}
      </div>
    </article>
  );
}

function SummaryCard({ label, value, accent, icon }: { label: string; value: number | string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
        <span style={{ color: accent }}>{icon}</span> {label}
      </div>
      <div className="text-2xl font-semibold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}
