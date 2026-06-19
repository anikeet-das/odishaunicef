import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, Plus, Trash2, Lock, X, Calendar } from "lucide-react";
import { ADMIN_KEY } from "@/lib/data/reset";

type Note = { id: string; title: string; body: string; createdAt: number };
const KEY = "crsap.notes.v1";

function loadNotes(): Note[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch { return []; }
}
function saveNotes(n: Note[]) {
  try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {}
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState<Note | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => { setNotes(loadNotes()); }, []);
  useEffect(() => {
    function onStorage(e: StorageEvent) { if (e.key === KEY) setNotes(loadNotes()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function add() {
    if (!title.trim() && !body.trim()) return;
    const n: Note = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      title: title.trim() || "Untitled",
      body: body.trim(),
      createdAt: Date.now(),
    };
    const next = [n, ...notes];
    setNotes(next); saveNotes(next);
    setTitle(""); setBody("");
  }

  function tryDelete() {
    if (!confirm) return;
    if (pw !== ADMIN_KEY) { setErr(true); return; }
    const next = notes.filter((x) => x.id !== confirm.id);
    setNotes(next); saveNotes(next);
    setConfirm(null); setPw(""); setErr(false);
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl grid place-items-center bg-[oklch(0.85_0.2_75/0.15)] border border-[oklch(0.85_0.2_75/0.35)] shrink-0">
            <StickyNote className="h-4 w-4 text-[var(--warn)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Field Notes</div>
            <div className="text-sm font-semibold truncate">
              Custom notes — saved locally, delete protected by admin key
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full glass-soft text-muted-foreground shrink-0 hidden sm:inline-block">
          {notes.length} note{notes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Heading (e.g. Block review · Khurda · 18 Jun)"
              className="w-full glass-soft rounded-lg px-3 py-2 text-sm outline-none focus:neon-ring"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your note… funds released, school visit takeaways, decisions, follow-ups."
              rows={3}
              className="w-full glass-soft rounded-lg px-3 py-2 text-sm outline-none focus:neon-ring resize-y"
            />
          </div>
          <button
            onClick={add}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-background self-stretch sm:self-start"
            style={{ background: "var(--gradient-aurora)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Save note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            No notes yet — your first entry will be timestamped automatically.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            <AnimatePresence initial={false}>
              {notes.map((n) => {
                const d = new Date(n.createdAt);
                return (
                  <motion.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="glass-soft rounded-xl p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{n.title}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {d.toLocaleDateString()} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button
                        onClick={() => { setConfirm(n); setPw(""); setErr(false); }}
                        className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-[var(--danger)] hover:bg-[oklch(0.68_0.24_22/0.12)] transition shrink-0"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {n.body}
                      </p>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <div
            className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setConfirm(null); setPw(""); setErr(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center mb-3"
                   style={{ background: "oklch(0.68 0.24 22 / 0.18)" }}>
                <Lock className="h-5 w-5 text-[var(--danger)]" />
              </div>
              <h3 className="text-base font-semibold">Confirm deletion</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the admin key to permanently delete <b className="text-foreground">{confirm.title}</b>.
              </p>
              <input
                autoFocus
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") tryDelete(); }}
                placeholder="Admin key"
                className="mt-4 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring"
              />
              {err && <div className="text-xs text-[var(--danger)] mt-2">Invalid key — note kept.</div>}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => { setConfirm(null); setPw(""); setErr(false); }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg glass-soft text-xs"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  onClick={tryDelete}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-background"
                  style={{ background: "linear-gradient(135deg, oklch(0.68 0.24 22), oklch(0.78 0.2 40))" }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
