import { useViewMode } from "@/components/layout/view-mode";
import { Activity, Maximize2, Minimize2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeProvider";
import { UploadDataButton } from "@/components/admin/UploadDataButton";
import { useI18n } from "@/lib/i18n";
import { useRouterState } from "@tanstack/react-router";
import { tabFor } from "@/lib/tabs/config";

type Props = {
  title: string;
  subtitle?: string;
  hasViewToggle?: boolean;
  uploadTab?: string;
  uploadRecommendedColumns?: string[];
};

export function Topbar({ title, subtitle, hasViewToggle, uploadTab, uploadRecommendedColumns }: Props) {
  const { mode, setMode } = useViewMode();
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const cfg = tabFor(path);
  const viewEnabled = hasViewToggle ?? cfg.view;
  const upload = uploadTab
    ? { tab: uploadTab, cols: uploadRecommendedColumns }
    : cfg.upload
    ? { tab: cfg.upload.tab, cols: cfg.upload.cols }
    : null;
  return (
    <header className="glass-soft rounded-2xl mx-3 mt-3 px-4 sm:px-6 py-3 sm:py-4">
      {/* Top row: title (always) + desktop chips */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1 pr-10 sm:pr-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
            {subtitle ?? t("common.commandCenter")}
          </div>
          <h1 className="text-lg sm:text-xl font-semibold truncate">{title}</h1>
        </div>

        {/* Desktop: full chip strip */}
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
          <LiveChip t={t} />
          <ViewToggle viewEnabled={viewEnabled} mode={mode} setMode={setMode} t={t} />
          {upload && <UploadDataButton tab={upload.tab} recommendedColumns={upload.cols} />}
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Mobile row: compact, single line, scrollable */}
      <div className="md:hidden mt-2 flex items-center gap-1.5 overflow-x-auto scroll-invisible -mx-1 px-1 pb-0.5">
        <LiveChip t={t} compact />
        <ViewToggle viewEnabled={viewEnabled} mode={mode} setMode={setMode} t={t} compact />
        {upload && <UploadDataButton tab={upload.tab} recommendedColumns={upload.cols} />}
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function LiveChip({ t, compact }: { t: (k: string) => string; compact?: boolean }) {
  return (
    <div className={`shrink-0 flex items-center gap-1.5 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-full glass-soft text-[11px]`}>
      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.84_0.2_155)] pulse-dot" />
      <Activity className="h-3 w-3 text-accent" />
      <span className="text-muted-foreground whitespace-nowrap">{t("live.schools")}</span>
    </div>
  );
}

function ViewToggle({
  viewEnabled, mode, setMode, t, compact,
}: { viewEnabled: boolean; mode: string; setMode: (m: any) => void; t: (k: string) => string; compact?: boolean }) {
  if (!viewEnabled) {
    return (
      <span className={`shrink-0 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-full glass-soft text-[10px] text-muted-foreground whitespace-nowrap`}>
        {t("view.macro")} / {t("view.micro")}
      </span>
    );
  }
  return (
    <div className="shrink-0 inline-flex rounded-full glass-soft p-1 text-[11px]">
      <button
        onClick={() => setMode("macro")}
        className={`flex items-center gap-1 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-full transition-all ${
          mode === "macro" ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground"
        }`}
      >
        <Maximize2 className="h-3 w-3" /> {t("view.macro")}
      </button>
      <button
        onClick={() => setMode("micro")}
        className={`flex items-center gap-1 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-full transition-all ${
          mode === "micro" ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground"
        }`}
      >
        <Minimize2 className="h-3 w-3" /> {t("view.micro")}
      </button>
    </div>
  );
}
