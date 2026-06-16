import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Wand2, Upload, Sparkles, Download, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAdminSession } from "@/lib/admin/session";
import { motion } from "framer-motion";

export const Route = createFileRoute("/personalize")({
  head: () => ({ meta: [{ title: "Data Personalization · CR-SAP Odisha" }] }),
  component: Page,
});

const PROMPTS = [
  "Create a cleaned sustainability dataset using district, school and WASH parameters.",
  "Build a climate-risk-ready dataset using humidity, AQI and flood indicators.",
  "Generate a SHVR-ready dataset with star ratings and reasoning columns.",
];

const STEPS = [
  "Reading dataset · detecting headers …",
  "Inferring column types (string · int · date · enum) …",
  "Standardising district/locality spellings …",
  "De-duplicating on (UDISE+, school_name) …",
  "Imputing nulls via KNN(k=5) · 312 imputations …",
  "Calculating sustainability composites …",
  "Optimising column order for target tab …",
  "Writing artifact · format = CSV/XLSX/JSON …",
  "Quality score: 98.4% · dataset ready.",
];

function Page() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Data Personalization" subtitle="AI dataset generation & transformation lab" hasViewToggle={false} />
      <div className="p-3">
        <PersonalizeBody />
      </div>
    </div>
  );
}

export function PersonalizeBody({ embedded = false }: { embedded?: boolean }) {
  const { unlocked, tryUnlock } = useAdminSession();
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [target, setTarget] = useState("WASH Board");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    setLogs([]); setDone(false);
    let i = 0;
    const tick = () => {
      setLogs((l) => [...l, STEPS[i]]); i++;
      if (i < STEPS.length) setTimeout(tick, 380 + Math.random() * 280);
      else { setRunning(false); setDone(true); }
    };
    tick();
  }, [running]);

  return (
    <>

        {!unlocked && !embedded ? (
          <div className="glass-strong rounded-2xl p-10 max-w-md mx-auto text-center">
            <Wand2 className="h-7 w-7 mx-auto mb-2 text-[var(--cyan)]" />
            <div className="text-base font-semibold">Admin password required</div>
            <p className="text-xs text-muted-foreground mt-1">Data Personalization rebuilds entire datasets — protected behind admin auth.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (!tryUnlock(pw)) setErr("Invalid password."); }}>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }}
                     placeholder="Admin password"
                     className="mt-4 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring" />
              {err && <div className="text-xs text-[var(--danger)] mt-2">{err}</div>}
              <button className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-background"
                      style={{ background: "var(--gradient-aurora)" }}>Unlock</button>
            </form>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 space-y-3">
              <Section title="Step 1 · Upload">
                <label className="block glass-strong rounded-xl p-5 text-center cursor-pointer">
                  <Upload className="h-5 w-5 mx-auto mb-1 text-[var(--cyan)]" />
                  <div className="text-xs">CSV · XLSX · JSON · raw tables · API dumps</div>
                  <input type="file" multiple hidden onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {files.map((f, i) => <li key={i} className="glass-soft rounded px-2 py-1 truncate">📄 {f.name}</li>)}
                  </ul>
                )}
              </Section>

              <Section title="Step 2 · Prompt">
                <select value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        className="w-full glass-soft rounded-lg px-3 py-2 text-xs mb-2">
                  {PROMPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                          className="w-full glass-soft rounded-lg px-3 py-2 text-xs outline-none focus:neon-ring resize-y" />
              </Section>

              <Section title="Step 3 · Target tab">
                <select value={target} onChange={(e) => setTarget(e.target.value)}
                        className="w-full glass-soft rounded-lg px-3 py-2 text-xs">
                  {["WASH Board", "Sustainability", "School Explorer", "SHVR Ratings", "Risk Analytics", "Tech Analysis", "Climate Alerts"]
                    .map((t) => <option key={t}>{t}</option>)}
                </select>
              </Section>

              <button onClick={() => setRunning(true)} disabled={running || files.length === 0}
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-bold text-background disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: "var(--gradient-aurora)" }}>
                <Sparkles className="h-4 w-4" /> {running ? "AI rebuilding…" : "Run AI Rebuild"}
              </button>
            </div>

            <div className="lg:col-span-3">
              <div className="terminal rounded-2xl p-4 h-[72vh] flex flex-col">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--warn)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--aurora)]" />
                  <span className="text-[11px] tracking-wider ml-2">aurora · pandas-ai · target=<b>{target.toLowerCase().replace(/\s+/g, "-")}</b></span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{running ? "● running" : done ? "✓ ready" : "◌ idle"}</span>
                </div>
                <div className="flex-1 overflow-y-auto scroll-invisible text-[12px] leading-relaxed space-y-1">
                  {!running && logs.length === 0 && (
                    <div className="text-muted-foreground">$ awaiting prompt … <span className="animate-pulse">▌</span></div>
                  )}
                  {logs.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                className="flex gap-2">
                      <span className="text-[var(--cyan)]">{i.toString().padStart(2, "0")}</span>
                      <span>{l}</span>
                    </motion.div>
                  ))}
                  {running && <div className="text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin mr-1" /> processing…</div>}
                  {done && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="mt-4 glass-strong rounded-xl p-3 flex flex-wrap items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-[var(--aurora)]" />
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-sm font-semibold">Personalised dataset · ready</div>
                        <div className="text-[11px] text-muted-foreground">12,438 rows × 18 columns · quality 98.4%</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["CSV", "XLSX", "JSON"].map((f) => (
                          <button key={f} className="text-[11px] px-2.5 py-1.5 rounded-full glass-soft hover:text-foreground text-muted-foreground inline-flex items-center gap-1">
                            <Download className="h-3 w-3" /> {f}
                          </button>
                        ))}
                        <button className="text-[11px] px-3 py-1.5 rounded-full font-semibold text-background inline-flex items-center gap-1"
                                style={{ background: "var(--gradient-aurora)" }}>
                          Load → {target} <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}