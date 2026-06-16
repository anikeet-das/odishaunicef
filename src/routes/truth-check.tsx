import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { ShieldCheck, AlertTriangle, Check, Upload, Sparkles, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/truth-check")({
  head: () => ({ meta: [{ title: "Truth Check · CR-SAP Odisha" }] }),
  component: Page,
});

type Verdict = { id: number; claim: string; status: "green" | "red" | "amber"; confidence: number; explanation: string; evidence: { title: string; url: string }[] };

const SAMPLE: Verdict[] = [
  {
    id: 1, status: "green", confidence: 96,
    claim: "85% of Odisha schools have access to functional handwash stations.",
    explanation: "Aligns with UNICEF WASH-in-Schools 2024 baseline (82–87% functional handwash) and CCES survey aggregate.",
    evidence: [
      { title: "UNICEF WASH-in-Schools — India Snapshot 2024", url: "https://www.unicef.org/india/reports/wash-in-schools" },
      { title: "UDISE+ State Brief — Odisha 2023-24", url: "https://udiseplus.gov.in" },
    ],
  },
  {
    id: 2, status: "red", confidence: 91,
    claim: "Every coastal district school has a fully functional cyclone shelter inside its premises.",
    explanation: "Contradicts ODRAF inventory; only ~38% of coastal-block schools are co-located with multi-hazard shelters.",
    evidence: [
      { title: "OSDMA Cyclone Shelter Inventory 2023", url: "https://www.osdma.org" },
    ],
  },
  {
    id: 3, status: "amber", confidence: 64,
    claim: "Plastic-free campus drive has reached 100% of secondary schools.",
    explanation: "Partial: state circulars cover all schools, but third-party audits show 71% compliance. Claim needs scope clarification.",
    evidence: [
      { title: "Odisha SBM-G Audit 2024", url: "https://swachhbharatmission.gov.in" },
    ],
  },
];

function Page() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Truth Check" subtitle="AI data-truth verification engine" hasViewToggle={false} />
      <TruthCheckBody />
    </div>
  );
}

export function TruthCheckBody() {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [verdicts, setVerdicts] = useState<Verdict[] | null>(null);

  function run() {
    setRunning(true); setVerdicts(null);
    setTimeout(() => { setVerdicts(SAMPLE); setRunning(false); }, 1400);
  }

  return (
    <div className="p-3 grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="glass rounded-2xl p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Step 1 · Provide claims or dataset</div>
            <label className="block glass-strong rounded-xl p-4 text-center cursor-pointer">
              <Upload className="h-5 w-5 mx-auto mb-1 text-[var(--cyan)]" />
              <div className="text-xs">Upload CSV/JSON report — or paste claims below</div>
              <input type="file" hidden />
            </label>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
                      placeholder={"Paste your claims, one per line. Example:\n• 100% schools have rainwater harvesting.\n• All staff trained in disaster drills in 2024."}
                      className="w-full glass-soft rounded-lg px-3 py-2 text-xs outline-none focus:neon-ring resize-y" />
            <button onClick={run} disabled={running}
                    className="w-full rounded-lg px-3 py-2 text-sm font-bold text-background disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "var(--gradient-aurora)" }}>
              <Sparkles className="h-4 w-4" /> {running ? "Cross-checking…" : "Run Truth Check"}
            </button>
          </div>
          <div className="glass rounded-2xl p-4 text-xs space-y-2 text-muted-foreground">
            <div className="font-semibold text-foreground">How it works</div>
            <div>1. Aurora extracts atomic claims from your dataset.</div>
            <div>2. Cross-references against authoritative sources (UNICEF, UDISE+, OSDMA, MoEFCC).</div>
            <div>3. Returns a verdict (🟢 supported · 🟡 partial · 🔴 contradicted) with confidence and evidence links.</div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {!verdicts ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-[var(--cyan)]" />
              Results will appear here · 🟢 Green flag = supported · 🔴 Red flag = contradicted
            </div>
          ) : (
            verdicts.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                          className="glass rounded-2xl p-4 relative overflow-hidden">
                <Flag status={v.status} />
                <div className="text-sm font-semibold pr-16">{v.claim}</div>
                <div className="text-[11px] mt-2 text-muted-foreground leading-relaxed">{v.explanation}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.evidence.map((e) => (
                    <a key={e.url} href={e.url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full glass-soft hover:text-foreground text-muted-foreground">
                      {e.title} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>AI confidence</span>
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full" style={{ width: `${v.confidence}%`,
                         background: v.status === "green" ? "var(--aurora)" : v.status === "red" ? "var(--danger)" : "var(--warn)" }} />
                  </div>
                  <span className="font-bold tabular-nums">{v.confidence}%</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
  );
}

function Flag({ status }: { status: "green" | "red" | "amber" }) {
  const map = {
    green: { Icon: Check, color: "var(--aurora)", label: "GREEN" },
    red:   { Icon: AlertTriangle, color: "var(--danger)", label: "RED" },
    amber: { Icon: AlertTriangle, color: "var(--warn)", label: "AMBER" },
  }[status];
  const Icon = map.Icon;
  return (
    <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-background"
         style={{ background: map.color }}>
      <Icon className="h-3 w-3" /> {map.label}
    </div>
  );
}