import { useMemo, useRef, useState, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSchools } from "@/lib/data/cces";
import { buildAIContext } from "@/lib/ai/context";
import { MiniDashboard, type DashboardSpec } from "@/components/cr-sap/MiniDashboard";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  dashboard?: DashboardSpec | null;
};

export function AIChatFab() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm **Aurora**, your CR-SAP intelligence assistant. I can analyse the live data from 10,000 schools across all 30 districts of Odisha.\n\nTry: *“Generate a dashboard comparing top 5 districts by sustainability and WASH score”* or *“Which districts have the highest cyclone exposure?”*",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: schools } = useSchools();
  const context = useMemo(() => buildAIContext(schools), [schools]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = msg.trim();
    if (!q || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${data.error ?? "AI request failed."}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.content || "_(no content)_", dashboard: data.dashboard ?? null }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Network error: ${err instanceof Error ? err.message : "unknown"}` }]);
    } finally {
      setLoading(false);
    }
  }

  function openDashboardWindow(spec: DashboardSpec) {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${spec.title}</title>
      <style>body{margin:0;background:#0a0e1f;color:#e5edff;font-family:ui-sans-serif,system-ui;padding:24px}
      pre{background:#11162a;padding:16px;border-radius:12px;overflow:auto;font-size:12px}</style></head>
      <body><h2>${spec.title}</h2><p style="color:#8aa">${spec.subtitle ?? ""}</p>
      <p style="color:#7af">This dashboard spec was generated from your live CR-SAP data.</p>
      <pre>${JSON.stringify(spec, null, 2)}</pre></body></html>`);
    w.document.close();
  }

  const panelW = expanded ? "min(720px,calc(100vw-2rem))" : "min(420px,calc(100vw-2rem))";
  const panelH = expanded ? "min(80vh,720px)" : "560px";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full grid place-items-center text-background animate-orb transition-transform hover:scale-105"
        style={{
          background: "radial-gradient(circle at 30% 30%, oklch(0.95 0.13 200), oklch(0.72 0.21 255) 55%, oklch(0.62 0.22 285))",
          boxShadow: "0 0 0 1px oklch(0.85 0.2 195 / 0.55), 0 12px 40px -10px oklch(0.62 0.22 285 / 0.7), 0 0 28px oklch(0.86 0.16 200 / 0.55)",
        }}
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 rounded-2xl flex flex-col overflow-hidden border"
          style={{
            width: panelW,
            height: panelH,
            background: "var(--panel-solid)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            borderColor: "oklch(0.85 0.2 195 / 0.35)",
            boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.85), 0 0 0 1px oklch(0.85 0.2 195 / 0.18)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold neon-text">Aurora · CR-SAP AI</span>
              <span className="text-[10px] text-muted-foreground">· {context?.ready ? "live data linked" : "loading data…"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded((e) => !e)} title={expanded ? "Shrink" : "Expand"}
                      className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5">
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setOpen(false)} className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scroll-invisible">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-3 py-2 max-w-[92%] ${
                    m.role === "user" ? "rounded-tr-sm text-background" : "rounded-tl-sm text-foreground"
                  }`}
                  style={
                    m.role === "user"
                      ? { background: "var(--gradient-aurora)" }
                      : { background: "var(--panel-chip)", border: "1px solid oklch(0.85 0.2 195 / 0.18)" }
                  }
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{m.content}</span>
                  )}
                </div>
                {m.dashboard && (
                  <div className="w-full max-w-[95%] space-y-1">
                    <MiniDashboard spec={m.dashboard} />
                    <button onClick={() => openDashboardWindow(m.dashboard!)}
                            className="text-[10px] text-[var(--cyan)] hover:underline">
                      ⤴ Open dashboard in new window (local)
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cyan)]" />
                Aurora is analysing live data…
              </div>
            )}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-border/50">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Ask anything · type ‘dashboard’ for live charts"
              className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !msg.trim()}
                    className="h-9 w-9 grid place-items-center rounded-full bg-primary/20 hover:bg-primary/30 transition disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Send className="h-4 w-4 text-accent" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}