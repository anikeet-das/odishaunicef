import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Mail, Send, MessageCircle, ExternalLink, Copy, Check } from "lucide-react";

const RECIPIENT = "bsdsai25aniketd@iimsambalpur.ac.in";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Feedback · CR-SAP Odisha" }] }),
  component: Page,
});

function Page() {
  const [subject, setSubject] = useState("CR-SAP Odisha — Platform Feedback");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(RECIPIENT)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const mailto = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function copy() {
    navigator.clipboard.writeText(RECIPIENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Feedback" subtitle="Talk directly to the platform team" hasViewToggle={false} />
      <div className="p-3 grid lg:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5 text-[var(--cyan)]" /> Compose
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
                 className="w-full glass-soft rounded-lg px-3 py-2 text-sm outline-none focus:neon-ring"
                 placeholder="Subject" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
                    placeholder="What worked? What didn't? Feature requests, bugs, ideas — we read every message."
                    className="w-full glass-soft rounded-lg px-3 py-2 text-sm outline-none focus:neon-ring resize-y" />
          <div className="flex flex-wrap gap-2">
            <a href={gmail} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-background"
               style={{ background: "var(--gradient-aurora)" }}>
              <Mail className="h-4 w-4" /> Open in Gmail <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a href={mailto}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm glass-soft text-muted-foreground hover:text-foreground">
              <Send className="h-4 w-4" /> Default mail app
            </a>
          </div>
        </div>
        <aside className="glass rounded-2xl p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recipient</div>
          <div className="flex items-center gap-2 glass-soft rounded-lg px-3 py-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-[var(--cyan)]" />
            <span className="flex-1 truncate font-medium">{RECIPIENT}</span>
            <button onClick={copy} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/5">
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--aurora)]" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your message lands directly with the CR-SAP platform team. Gmail opens in a new tab — sign in if needed; the
            subject and body are pre-filled.
          </p>
        </aside>
      </div>
    </div>
  );
}