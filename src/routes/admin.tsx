import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Database, Table2, ShieldCheck, Activity, Sparkles, Wand2, FlaskConical,
  Building2, Users, GraduationCap, RefreshCw, CloudLightning, Sigma,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ADMIN_KEY } from "@/lib/data/reset";
import { useAdminSession } from "@/lib/admin/session";
import { DataUploadPanel } from "@/components/admin/DataUploadPanel";
import { RespondsPanel } from "@/components/admin/RespondsPanel";
import { useSchools, platformKpis, aggregateByDistrict } from "@/lib/data/cces";
import { AiRecommendationsBody } from "@/routes/ai-recommendations";
import { PersonalizeBody } from "@/routes/personalize";
import { TruthCheckBody } from "@/routes/truth-check";
import { SimulationBody } from "@/routes/simulation";
import { ClimateAlertsPage } from "@/components/cr-sap/climate/ClimateAlertsPage";
import { FinanceSumBody } from "@/routes/finance-sum";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel · CR-SAP Odisha" },
      { name: "description", content: "Passcode-gated admin control with live data, uploads, responses and AI Systems." },
    ],
  }),
  component: Page,
});

type Tab = "overview" | "data-upload" | "responds" | "climate" | "finance-sum" | "ai-recommendations" | "personalize" | "truth-check" | "simulation";

const AI_TABS = [
  { id: "ai-recommendations" as const, label: "Recommendations", icon: Sparkles },
  { id: "personalize" as const, label: "Personalize", icon: Wand2 },
  { id: "truth-check" as const, label: "Truth Check", icon: ShieldCheck },
  { id: "simulation" as const, label: "Simulation", icon: FlaskConical },
];


function Page() {
  const { unlocked, tryUnlock } = useAdminSession();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  // Keep local error state in sync if the user re-unlocks elsewhere.
  useEffect(() => { if (unlocked) setErr(false); }, [unlocked]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (tryUnlock(pw)) { setErr(false); }
    else setErr(true);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Admin Panel" subtitle="Secure Control · Live Data · Responds · AI Systems" />
      <div className="p-3 flex-1">
        {!unlocked ? (
          <div className="glass-strong rounded-2xl min-h-[70vh] grid place-items-center p-6">
            <motion.form
              onSubmit={unlock}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md glass rounded-2xl p-8 text-center"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center mb-4 animate-orb"
                   style={{ background: "radial-gradient(circle at 30% 30%, oklch(0.95 0.13 200), oklch(0.62 0.22 285))" }}>
                <Lock className="h-6 w-6 text-background" />
              </div>
              <h2 className="text-xl font-semibold neon-text">Admin Access Required</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the admin password to access live data, Data Upload, Responds and the AI Systems suite.
              </p>
              <input
                autoFocus type="password" value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(false); }}
                placeholder="Admin password"
                className="mt-5 w-full glass rounded-lg px-3 py-2 text-sm text-center outline-none focus:neon-ring"
              />
              {err && <div className="text-xs text-[var(--danger)] mt-2">Invalid password.</div>}
              <button type="submit"
                      className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-background"
                      style={{ background: "var(--gradient-aurora)" }}>
                Authenticate
              </button>
              <div className="text-[10px] text-muted-foreground/70 mt-4">
                Authorised personnel only · CR-SAP Odisha
              </div>
            </motion.form>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-2 flex flex-wrap items-center gap-2">
              {/* Core admin tabs */}
              <div className="inline-flex items-center gap-1">
                {([
                  { id: "overview", label: "Overview", icon: ShieldCheck },
                  { id: "data-upload", label: "Data Upload", icon: Database },
                  { id: "responds", label: "Responds", icon: Table2 },
                  { id: "climate", label: "Climate", icon: CloudLightning },
                  { id: "finance-sum", label: "Finance Sum", icon: Sigma },
                ] as { id: Tab; label: string; icon: typeof Lock }[]).map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {active && (
                        <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-xl"
                          style={{ background: "oklch(0.85 0.2 195 / 0.12)", boxShadow: "inset 0 0 0 1px oklch(0.85 0.2 195 / 0.35), 0 0 18px oklch(0.85 0.2 195 / 0.2)" }} />
                      )}
                      <Icon className="h-3.5 w-3.5 relative" />
                      <span className="relative">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Visual divider between categories */}
              <div className="h-7 w-px bg-border mx-1 hidden md:block" />

              {/* AI SYSTEMS — separate category cluster, in-panel tabs */}
              <div className="inline-flex items-center gap-1.5 rounded-2xl px-2 py-1"
                   style={{ background: "oklch(0.7 0.18 285 / 0.10)", boxShadow: "inset 0 0 0 1px oklch(0.7 0.18 285 / 0.30)" }}>
                <span className="inline-flex items-center gap-1 pl-1.5 pr-1 text-[9px] uppercase tracking-[0.2em] text-[var(--indigo-glow)] font-semibold">
                  <Sparkles className="h-3 w-3" /> AI Systems
                </span>
                {AI_TABS.map((l) => {
                  const Icon = l.icon;
                  const active = tab === l.id;
                  return (
                    <button key={l.id} onClick={() => setTab(l.id)}
                      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ background: active ? "oklch(0.7 0.18 285 / 0.22)" : "oklch(1 0 0 / 0.04)" }}>
                      <Icon className="h-3.5 w-3.5 text-[var(--indigo-glow)]" />
                      <span>{l.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto inline-flex items-center gap-2 text-[10px] text-muted-foreground pr-2">
                <Activity className="h-3 w-3 text-[var(--aurora)]" /> Session unlocked
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                {tab === "overview" && <Overview />}
                {tab === "data-upload" && <DataUploadPanel />}
                {tab === "responds" && <RespondsPanel />}
                {tab === "climate" && <ClimateAlertsPage />}
                {tab === "finance-sum" && <FinanceSumBody embedded />}
                {tab === "ai-recommendations" && <AiRecommendationsBody />}
                {tab === "personalize" && <PersonalizeBody embedded />}
                {tab === "truth-check" && <TruthCheckBody />}
                {tab === "simulation" && <SimulationBody />}
              </motion.div>
            </AnimatePresence>

          </div>
        )}
      </div>
    </div>
  );
}

function Overview() {
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useSchools();
  const ready = !!data && data.length > 0;
  const kpi = ready ? platformKpis(data!) : null;
  const districts = ready ? aggregateByDistrict(data!).length : 0;
  const lastSync = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const cards = [
    {
      k: "Form Responses",
      v: ready ? kpi!.total.toLocaleString() : (isLoading ? "…" : "0"),
      note: "Live Google Sheet",
      icon: Database,
      grad: "linear-gradient(135deg, var(--cyan), var(--aurora))",
    },
    {
      k: "Districts Covered",
      v: ready ? districts.toLocaleString() : (isLoading ? "…" : "0"),
      note: "Distinct districts in data",
      icon: Building2,
      grad: "linear-gradient(135deg, var(--aurora), var(--cyan))",
    },
    {
      k: "Students Reached",
      v: ready ? kpi!.students.toLocaleString() : (isLoading ? "…" : "0"),
      note: "Aggregated from responses",
      icon: GraduationCap,
      grad: "linear-gradient(135deg, var(--cyan), var(--indigo-glow))",
    },
    {
      k: "Last Sync",
      v: isFetching ? "syncing…" : lastSync,
      note: "Auto · 30-second loop",
      icon: Users,
      grad: "linear-gradient(135deg, var(--indigo-glow), var(--aurora))",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.k} className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-30"
                 style={{ background: c.grad, filter: "blur(20px)" }} />
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-[var(--cyan)]" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.k}</div>
            </div>
            <div className="text-2xl font-bold neon-text mt-1">{c.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.note}</div>
          </div>
        );
      })}

      <div className="md:col-span-2 lg:col-span-4 glass rounded-2xl p-5 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Quick start</div>
          <p className="text-sm">
            All numbers above are <b>live</b> — pulled directly from the attached Google Form spreadsheet, refreshed every 30 seconds.
            Use <b>Data Upload</b> to ingest CCES / SHVR exports through the cleaning engine, <b>Responds</b> to view raw responses, or the
            <b> AI Systems</b> cluster for recommendations, personalization, truth-check and simulation. {ready ? "" : "Awaiting the first response — the dashboard builds itself the moment a school submits."}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full glass-soft hover:neon-ring transition shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Sync now
        </button>
      </div>
    </div>
  );
}
