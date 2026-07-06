import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { useSettings } from "@/components/layout/settings-provider";
import { useI18n, type Lang } from "@/lib/i18n";
import { RotateCcw, Sparkles, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { wipeAllData, ADMIN_KEY } from "@/lib/data/reset";


export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · CR-SAP Odisha" },
      { name: "description", content: "Real live personalisation: theme hue, neon, glass, density, motion, language." },
    ],
  }),
  component: Page,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0 w-[260px] flex items-center justify-end gap-3">{children}</div>
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, suffix }: {
  value: number; min: number; max: number; step?: number;
  onChange: (n: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">{value}{suffix ?? ""}</span>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-primary/60" : "bg-secondary"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Segment<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full glass-soft p-1 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full transition ${value === o.value ? "bg-primary/25 text-foreground neon-ring" : "text-muted-foreground hover:text-foreground"}`}
        >{o.label}</button>
      ))}
    </div>
  );
}

function Page() {
  const { settings, set, reset } = useSettings();
  const s = settings;
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipePw, setWipePw] = useState("");
  const [wipeErr, setWipeErr] = useState("");
  const [wipeDone, setWipeDone] = useState(false);

  function doWipe(e: React.FormEvent) {
    e.preventDefault();
    if (wipePw !== ADMIN_KEY) { setWipeErr("Invalid admin password."); return; }
    wipeAllData();
    setWipeDone(true);
    setTimeout(() => { window.location.reload(); }, 1400);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Settings" subtitle="Live Personalisation" />
      <div className="p-3 grid lg:grid-cols-3 gap-3">
        {/* Preview card */}
        <div className="glass rounded-2xl p-6 lg:col-span-1 flex flex-col gap-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Live Preview</div>
          <div className="rounded-xl p-5 neon-ring" style={{ background: "var(--gradient-aurora)" }}>
            <div className="text-xs text-primary-foreground/80">Accent hue {s.accentHue}°</div>
            <div className="text-2xl font-bold text-primary-foreground">CR-SAP · Odisha</div>
          </div>
          <div className="glass-soft rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 neon-text font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Theme tokens are live.</div>
            <p className="text-xs text-muted-foreground">Every change you make on the right is saved to <code>localStorage</code> and applied across the whole platform in real time — no reload needed.</p>
          </div>
          <button
            onClick={reset}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full glass-soft px-4 py-2 text-sm hover:neon-ring transition"
          ><RotateCcw className="h-4 w-4" /> Reset to defaults</button>
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-6 lg:col-span-2 space-y-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Appearance</div>

          <Row label="Accent hue" hint="Drives primary, accent, ring, gradient and glow colors.">
            <div className="w-full flex items-center gap-3">
              <input type="range" min={0} max={359} value={s.accentHue} onChange={(e) => set("accentHue", Number(e.target.value))} className="w-full" />
              <span className="text-xs tabular-nums w-10 text-right">{s.accentHue}°</span>
            </div>
          </Row>

          <Row label="Neon intensity" hint="Strength of glow shadows on cards and buttons.">
            <Slider value={s.neonIntensity} min={0} max={100} onChange={(n) => set("neonIntensity", n)} suffix="%" />
          </Row>

          <Row label="Glass blur" hint="Backdrop blur for glass panels.">
            <Slider value={s.glassBlur} min={0} max={40} onChange={(n) => set("glassBlur", n)} suffix="px" />
          </Row>

          <Row label="Font scale" hint="Globally scales typography (rem base).">
            <Slider value={Math.round(s.fontScale * 100)} min={85} max={120} onChange={(n) => set("fontScale", n / 100)} suffix="%" />
          </Row>

          <Row label="Density">
            <Segment value={s.density} onChange={(v) => set("density", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfort" },
                { value: "spacious", label: "Spacious" },
              ]} />
          </Row>

          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-6 mb-3">Behaviour</div>

          <Row label="Reduce motion" hint="Disables pulse glows and transitions for accessibility.">
            <Toggle on={s.reduceMotion} onChange={(b) => set("reduceMotion", b)} />
          </Row>

          <Row label="Show floating AI assistant" hint="Hide the corner AI bot when presenting.">
            <Toggle on={s.showAiFab} onChange={(b) => set("showAiFab", b)} />
          </Row>

          <Row label="Map jitter" hint="Spread school dots around district centroids on the live map.">
            <Toggle on={s.mapJitter} onChange={(b) => set("mapJitter", b)} />
          </Row>

          <Row label="Live refresh interval" hint="How often live counters tick on the Overview.">
            <Slider value={s.liveRefreshSec} min={1} max={30} onChange={(n) => set("liveRefreshSec", n)} suffix="s" />
          </Row>

          <Row label="Language">
            <Segment value={s.language} onChange={(v) => set("language", v as AppSettings["language"])}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "हिंदी" },
                { value: "or", label: "ଓଡ଼ିଆ" },
              ]} />
          </Row>

          {/* Danger zone */}
          <div className="mt-8 rounded-xl border p-4"
               style={{ borderColor: "oklch(0.68 0.24 22 / 0.5)", background: "oklch(0.22 0.12 22 / 0.18)" }}>
            <div className="flex items-center gap-2 text-[var(--danger)] font-semibold">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently erases every uploaded dataset, Google Form response and cached spreadsheet across the platform. This action cannot be undone.
            </p>
            <button
              onClick={() => { setWipeOpen(true); setWipePw(""); setWipeErr(""); setWipeDone(false); }}
              className="mt-3 w-full rounded-lg px-3 py-2.5 text-sm font-bold text-white inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(90deg, oklch(0.55 0.24 22), oklch(0.5 0.26 18))",
                       boxShadow: "0 0 0 1px oklch(0.68 0.24 22 / 0.6), 0 10px 30px -10px oklch(0.68 0.24 22 / 0.6)" }}
            >
              <Trash2 className="h-4 w-4" /> REMOVE ALL DATA
            </button>
          </div>
        </div>
      </div>

      {wipeOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
             onClick={() => !wipeDone && setWipeOpen(false)}>
          <form onSubmit={doWipe} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl p-6 border"
                style={{ background: "var(--panel-danger)",
                         borderColor: "oklch(0.68 0.24 22 / 0.55)",
                         boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.85)" }}>
            <div className="flex items-center gap-2 text-[var(--danger)] font-bold">
              <AlertTriangle className="h-5 w-5" /> Critical · Irreversible Action
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You are about to <b className="text-foreground">permanently delete all CR-SAP data</b> — uploads, Google Form responses, spreadsheets and cached dashboards. Enter the admin password to confirm.
            </p>
            <input
              autoFocus type="password" value={wipePw}
              onChange={(e) => { setWipePw(e.target.value); setWipeErr(""); }}
              disabled={wipeDone}
              placeholder="Admin password"
              className="mt-4 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring"
            />
            {wipeErr && <div className="text-xs text-[var(--danger)] mt-2 text-center">{wipeErr}</div>}
            {wipeDone && <div className="text-xs text-[var(--aurora)] mt-2 text-center">All data wiped. Reloading…</div>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setWipeOpen(false)} disabled={wipeDone}
                      className="flex-1 rounded-lg px-3 py-2 text-sm glass-soft hover:text-foreground text-muted-foreground">
                Cancel
              </button>
              <button type="submit" disabled={wipeDone || !wipePw}
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: "linear-gradient(90deg, oklch(0.55 0.24 22), oklch(0.5 0.26 18))" }}>
                Confirm & Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
