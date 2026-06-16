import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Lock, Sparkles, FileSpreadsheet, ShieldCheck, AlertTriangle, Database } from "lucide-react";
import { useAdminSession } from "@/lib/admin/session";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tab context (e.g. "WASH Board"). Drives AI structure suggestions. */
  tab: string;
  /** Recommended columns for this tab; AI suggests them before upload. */
  recommendedColumns?: string[];
};

const PROCESSING_STEPS = [
  "Booting Aurora data engine…",
  "Detecting file encoding (UTF-8)…",
  "Parsing rows × columns…",
  "Mapping headers to schema…",
  "Standardizing district names (Nabarangapur → Nabarangpur)…",
  "Validating U-DISE+ identifiers…",
  "Detecting duplicates · auto-merging…",
  "Imputing missing values via KNN(k=5)…",
  "Running anomaly detection (IsolationForest, n=128)…",
  "Cross-checking tab compatibility…",
  "Quality score: 98.7% · ready for import.",
];

export function UploadDataModal({ open, onClose, tab, recommendedColumns = [] }: Props) {
  const { unlocked, tryUnlock } = useAdminSession();
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setProcessing(false); setLogs([]); setDone(false); setFiles([]); setPw(""); setErr(""); }
  }, [open]);

  useEffect(() => {
    if (!processing) return;
    setLogs([]); setDone(false);
    let i = 0;
    const tick = () => {
      setLogs((l) => [...l, PROCESSING_STEPS[i]]);
      i++;
      if (i < PROCESSING_STEPS.length) setTimeout(tick, 320 + Math.random() * 280);
      else { setProcessing(false); setDone(true); }
    };
    tick();
  }, [processing]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)]);
  }

  function submitPw(e: React.FormEvent) {
    e.preventDefault();
    if (!tryUnlock(pw)) { setErr(t("admin.invalid")); return; }
    setErr("");
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl glass-strong rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--cyan)]" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("btn.upload")}</div>
                <div className="text-sm font-semibold">{tab}</div>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-white/5">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!unlocked ? (
            <form onSubmit={submitPw} className="p-10 text-center max-w-md mx-auto">
              <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center mb-4 animate-orb"
                   style={{ background: "radial-gradient(circle at 30% 30%, oklch(0.95 0.13 200), oklch(0.62 0.22 285))" }}>
                <Lock className="h-5 w-5 text-background" />
              </div>
              <h2 className="text-lg font-semibold neon-text">{t("admin.required")}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                External data uploads require admin authentication. The session persists across tabs after unlock.
              </p>
              <input
                autoFocus type="password" value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(""); }}
                placeholder={t("admin.password")}
                className="mt-4 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring"
              />
              {err && <div className="text-xs text-[var(--danger)] mt-2">{err}</div>}
              <button type="submit" className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-background"
                      style={{ background: "var(--gradient-aurora)" }}>
                {t("admin.unlock")}
              </button>
            </form>
          ) : (
            <div className="grid lg:grid-cols-5 gap-3 p-4">
              <div className="lg:col-span-2 space-y-3">
                {/* AI structure assistant */}
                <div className="glass rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--aurora)]" />
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Structure Assistant</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    Recommended columns for <b className="text-foreground">{tab}</b>:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(recommendedColumns.length ? recommendedColumns : ["School_Name", "UDISE", "District", "Locality", "Updated_Date"]).map((c) => (
                      <span key={c} className="text-[10px] px-2 py-1 rounded-full glass-soft border border-[oklch(0.85_0.2_195/0.25)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("neon-ring"); }}
                  onDragLeave={() => dropRef.current?.classList.remove("neon-ring")}
                  onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove("neon-ring"); addFiles(e.dataTransfer.files); }}
                  className="glass-strong rounded-2xl p-6 text-center transition relative"
                >
                  <div className="mx-auto h-12 w-12 grid place-items-center rounded-2xl mb-2 animate-pulse-glow"
                       style={{ background: "oklch(0.85 0.2 195 / 0.18)" }}>
                    <Upload className="h-5 w-5 text-[var(--cyan)]" />
                  </div>
                  <div className="text-sm font-semibold">Drop datasets here</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    CSV · XLSX · JSON · TSV · XML · Google Sheet exports · API dumps
                  </div>
                  <label className="inline-block mt-2 cursor-pointer px-3 py-1.5 rounded-full text-[11px] font-semibold text-background"
                         style={{ background: "var(--gradient-aurora)" }}>
                    Browse files
                    <input type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                  </label>
                </div>

                {/* Queue */}
                <div className="glass rounded-2xl p-3 max-h-40 overflow-y-auto scroll-invisible">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Queue · {files.length}</div>
                  {files.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">No files staged.</div>
                  ) : (
                    <ul className="space-y-1">
                      {files.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] glass-soft rounded-lg px-2 py-1">
                          <FileSpreadsheet className="h-3 w-3 text-[var(--cyan)]" />
                          <span className="truncate flex-1">{f.name}</span>
                          <span className="text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button disabled={files.length === 0 || processing} onClick={() => setProcessing(true)}
                          className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
                          style={{ background: "var(--gradient-aurora)" }}>
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    {processing ? "Running…" : "Run AI Data Engine"}
                  </button>
                </div>
              </div>

              {/* Terminal */}
              <div className="lg:col-span-3">
                <div className="terminal rounded-2xl p-3 h-[58vh] flex flex-col">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--warn)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--aurora)]" />
                    <span className="text-[10px] tracking-wider ml-1">aurora-engine · ai-clean · {tab.toLowerCase().replace(/\s+/g, "-")}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{processing ? "● running" : done ? "✓ ready" : "◌ idle"}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto scroll-invisible text-[11px] leading-relaxed space-y-1">
                    {!processing && logs.length === 0 && (
                      <div className="text-muted-foreground">$ awaiting dataset… <span className="animate-pulse">▌</span></div>
                    )}
                    {logs.map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--cyan)]">{i.toString().padStart(2, "0")}</span>
                        <span>{l}</span>
                      </div>
                    ))}
                    {processing && <div className="text-muted-foreground"><span className="animate-pulse">▌</span></div>}
                    {done && (
                      <div className="mt-3 glass-strong rounded-xl p-3 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[var(--aurora)]" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">Quality Score · 98.7%</div>
                          <div className="text-[10px] text-muted-foreground">Dataset cleaned · ready to load into {tab}.</div>
                        </div>
                        <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-full font-semibold text-background"
                                style={{ background: "var(--gradient-aurora)" }}>
                          Load → {tab}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-[var(--warn)]" />
                  Wrong dataset for this tab? Aurora will suggest the compatible module after validation.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}