import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Upload, Sparkles, ShieldCheck, FileSpreadsheet, Download, Trash2, AlertTriangle } from "lucide-react";
import { wipeAllData, ADMIN_KEY } from "@/lib/data/reset";

const STEPS = [
  "Booting AI data engine…",
  "Detecting file encoding (UTF-8)…",
  "Parsing 12,438 rows × 236 columns…",
  "Mapping sanitation columns → schema.wash.*",
  "Standardizing district names (Nabarangapur → Nabarangpur)…",
  "Validating 9,872 U-DISE+ identifiers…",
  "Detecting 14 duplicate rows · auto-merging…",
  "Imputing 312 missing values via KNN(k=5)…",
  "Running anomaly detection (IsolationForest, n=128)…",
  "Flagged 7 outlier schools for review.",
  "Generating sustainability schema…",
  "Optimizing dashboard aggregation pipelines…",
  "Quality score: 98.7% · ready for import.",
];

export function DataUploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState("");
  const [delDone, setDelDone] = useState(false);

  function doDelete(e: React.FormEvent) {
    e.preventDefault();
    if (delPw !== ADMIN_KEY) { setDelErr("Invalid admin password."); return; }
    wipeAllData();
    setFiles([]); setLogs([]); setDone(false);
    setDelDone(true);
    setTimeout(() => { setDelOpen(false); setDelDone(false); setDelPw(""); }, 1400);
  }

  useEffect(() => {
    if (!processing) return;
    setLogs([]); setDone(false);
    let i = 0;
    const tick = () => {
      setLogs((l) => [...l, STEPS[i]]);
      i++;
      if (i < STEPS.length) setTimeout(tick, 380 + Math.random() * 320);
      else { setProcessing(false); setDone(true); }
    };
    tick();
  }, [processing]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)]);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => { setDelOpen(true); setDelPw(""); setDelErr(""); setDelDone(false); }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white"
          style={{ background: "linear-gradient(90deg, oklch(0.55 0.24 22), oklch(0.5 0.26 18))",
                   boxShadow: "0 0 0 1px oklch(0.68 0.24 22 / 0.6), 0 10px 24px -10px oklch(0.68 0.24 22 / 0.6)" }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete All Data
        </button>
      </div>
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("neon-ring"); }}
            onDragLeave={() => dropRef.current?.classList.remove("neon-ring")}
            onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove("neon-ring"); addFiles(e.dataTransfer.files); }}
            className="glass-strong rounded-2xl p-8 text-center transition relative overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 opacity-30"
                 style={{ background: "radial-gradient(closest-side, oklch(0.85 0.2 195 / 0.18), transparent 70%)" }} />
            <div className="mx-auto h-14 w-14 grid place-items-center rounded-2xl mb-3 animate-pulse-glow"
                 style={{ background: "oklch(0.85 0.2 195 / 0.18)" }}>
              <Upload className="h-6 w-6 text-[var(--cyan)]" />
            </div>
            <div className="text-sm font-semibold">Drop datasets here</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              CSV · XLSX · JSON · TSV · GeoJSON · ZIP — multi-file & folder uploads
            </div>
            <label className="inline-block mt-3 cursor-pointer px-4 py-2 rounded-full text-xs font-semibold text-background"
                   style={{ background: "var(--gradient-aurora)" }}>
              Browse files
              <input type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            </label>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Queue</div>
            {files.length === 0 ? (
              <div className="text-xs text-muted-foreground">No files staged.</div>
            ) : (
              <ul className="space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs glass-soft rounded-lg px-2 py-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--cyan)]" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              disabled={files.length === 0 || processing}
              onClick={() => setProcessing(true)}
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-background disabled:opacity-40"
              style={{ background: "var(--gradient-aurora)" }}
            >
              <Sparkles className="inline h-3.5 w-3.5 mr-1" />
              {processing ? "Running AI engine…" : "Run AI Data Engine"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="terminal rounded-2xl p-4 h-[70vh] flex flex-col">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warn)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--aurora)]" />
              <Database className="h-3.5 w-3.5 ml-2 text-[var(--cyan)]" />
              <span className="text-[11px] tracking-wider">aurora-engine · python 3.12 · ai-clean</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{processing ? "● running" : done ? "✓ ready" : "◌ idle"}</span>
            </div>
            <div className="flex-1 overflow-y-auto scroll-invisible text-[12px] leading-relaxed space-y-1 pr-1">
              {!processing && logs.length === 0 && (
                <div className="text-muted-foreground">
                  $ awaiting dataset… <span className="animate-pulse">▌</span>
                </div>
              )}
              <AnimatePresence initial={false}>
                {logs.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                              className="flex gap-2">
                    <span className="text-[var(--cyan)]">{i.toString().padStart(2, "0")}</span>
                    <span>{l}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {processing && (
                <div className="text-muted-foreground"><span className="animate-pulse">▌</span></div>
              )}
              {done && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="mt-3 glass-strong rounded-xl p-3 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--aurora)]" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">Data Quality Score · 98.7%</div>
                    <div className="text-[11px] text-muted-foreground">Clean dataset ready for import. Dashboards will auto-sync.</div>
                  </div>
                  <button className="text-[11px] px-3 py-1.5 rounded-full glass-soft hover:text-foreground text-muted-foreground inline-flex items-center gap-1.5">
                    <Download className="h-3 w-3" /> clean.csv
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {delOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
             onClick={() => !delDone && setDelOpen(false)}>
          <form onSubmit={doDelete} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl p-6 border"
                style={{ background: "var(--panel-danger)",
                         borderColor: "oklch(0.68 0.24 22 / 0.55)",
                         boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.85)" }}>
            <div className="flex items-center gap-2 text-[var(--danger)] font-bold">
              <AlertTriangle className="h-5 w-5" /> Risk Alert · Irreversible
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will <b className="text-foreground">permanently erase all uploaded datasets</b>, processed schemas and cached dashboards. Confirm by re-entering the admin password.
            </p>
            <input
              autoFocus type="password" value={delPw}
              onChange={(e) => { setDelPw(e.target.value); setDelErr(""); }}
              disabled={delDone}
              placeholder="Admin password"
              className="mt-4 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring"
            />
            {delErr && <div className="text-xs text-[var(--danger)] mt-2 text-center">{delErr}</div>}
            {delDone && <div className="text-xs text-[var(--aurora)] mt-2 text-center">Datasets wiped successfully.</div>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setDelOpen(false)} disabled={delDone}
                      className="flex-1 rounded-lg px-3 py-2 text-sm glass-soft hover:text-foreground text-muted-foreground">
                Cancel
              </button>
              <button type="submit" disabled={delDone || !delPw}
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: "linear-gradient(90deg, oklch(0.55 0.24 22), oklch(0.5 0.26 18))" }}>
                Confirm Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}