import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { School } from "@/lib/data/cces";

export function HierarchyPanel({
  schools,
  selectedDistrict,
  onSelectDistrict,
}: {
  schools: School[];
  selectedDistrict: string | null;
  onSelectDistrict: (d: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const districts = useMemo(() => {
    const m = new Map<string, School[]>();
    for (const s of schools) {
      if (!m.has(s.district)) m.set(s.district, []);
      m.get(s.district)!.push(s);
    }
    return Array.from(m.entries())
      .map(([d, list]) => ({ d, n: list.length, sample: list.slice(0, 6) }))
      .sort((a, b) => a.d.localeCompare(b.d));
  }, [schools]);

  const filtered = districts.filter((x) =>
    !q ||
    x.d.toLowerCase().includes(q.toLowerCase()) ||
    x.sample.some((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.udise.includes(q)),
  );

  return (
    <div className="glass rounded-2xl p-3 h-[78vh] flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Hierarchy</div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search district / UDISE / school"
          className="w-full glass-soft rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:neon-ring"
        />
      </div>
      <div className="overflow-y-auto scroll-invisible flex-1 fade-mask-y space-y-0.5 pr-1">
        <button
          onClick={() => onSelectDistrict(null)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition ${!selectedDistrict ? "bg-[oklch(0.85_0.2_195/0.10)] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}
        >
          ◉ Odisha · {schools.length.toLocaleString()} schools
        </button>
        {filtered.map((x) => {
          const active = selectedDistrict === x.d;
          return (
            <div key={x.d}>
              <button
                onClick={() => onSelectDistrict(active ? null : x.d)}
                className={`w-full flex items-center gap-1 text-xs px-2 py-1.5 rounded-md transition ${active ? "bg-[oklch(0.85_0.2_195/0.10)] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${active ? "rotate-90 text-[var(--cyan)]" : ""}`} />
                <span className="flex-1 text-left truncate">{x.d}</span>
                <span className="text-[10px] text-muted-foreground">{x.n}</span>
              </button>
              {active && (
                <ul className="pl-6 py-1 space-y-0.5">
                  {x.sample.map((s) => (
                    <li key={s.udise} className="text-[11px] text-muted-foreground truncate">
                      · {s.name}
                    </li>
                  ))}
                  {x.n > x.sample.length && (
                    <li className="text-[10px] text-muted-foreground/70">… +{x.n - x.sample.length} more</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}